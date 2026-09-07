using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ExileLedger;

static class InboxProgram
{
    static Mutex? SingleInstance;

    [STAThread]
    static void Main()
    {
        SingleInstance = new Mutex(true, @"Local\StillSaneInbox.SingleInstance", out var created);
        if (!created)
        {
            SingleInstance.Dispose();
            return;
        }
        ApplicationConfiguration.Initialize();
        Application.Run(new InboxWindow());
        SingleInstance.Dispose();
    }
}

sealed class InboxWindow : Form
{
    const string Repo = "Shawn25678/SSEv1";
    static readonly HttpClient GitHttp = CreateGitHttp();
    static readonly JsonSerializerOptions JsonOut = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    readonly WebView2 _web = new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.FromArgb(12, 10, 8),
    };
    FileSystemWatcher? _watch;
    System.Windows.Forms.Timer? _refresh;
    List<GithubIssue> _issues = new();

    public InboxWindow()
    {
        Text = "Still Sane Inbox";
        try
        {
            var path = Environment.ProcessPath;
            if (!string.IsNullOrWhiteSpace(path)) Icon = Icon.ExtractAssociatedIcon(path);
        }
        catch
        {
            /* keep the default window icon */
        }
        Width = 980;
        Height = 700;
        MinimumSize = new Size(640, 480);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(12, 10, 8);
        Controls.Add(_web);
        Load += OnLoad;
        FormClosed += (_, _) =>
        {
            _watch?.Dispose();
            _refresh?.Stop();
            _refresh?.Dispose();
        };
    }

    async void OnLoad(object? sender, EventArgs e)
    {
        FeedbackStore.Dir();
        var page = ExtractInboxFiles();
        var userData = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ExileLedger",
            "inbox-webview");
        Directory.CreateDirectory(userData);
        try
        {
            var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            await _web.EnsureCoreWebView2Async(env);
        }
        catch (WebView2RuntimeNotFoundException)
        {
            MessageBox.Show(
                "This app needs the Microsoft Edge WebView2 Runtime, which is usually already on Windows 11.\n\nInstall it from:\nhttps://aka.ms/webview2runtime",
                "Still Sane Inbox",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
            return;
        }

        _web.CoreWebView2.Settings.AreDevToolsEnabled = false;
        _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
        _web.CoreWebView2.Settings.IsWebMessageEnabled = true;
        _web.CoreWebView2.WebMessageReceived += OnWebMessage;
        _web.CoreWebView2.NewWindowRequested += (_, ev) =>
        {
            ev.Handled = true;
            OpenInboxUrl(ev.Uri);
        };
        _web.CoreWebView2.Navigate(new Uri(page).AbsoluteUri);
        StartWatch();
        _refresh = new System.Windows.Forms.Timer { Interval = 20000 };
        _refresh.Tick += (_, _) => _ = PushListAsync(true);
        _refresh.Start();
    }

    void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        _ = HandleWebMessage(e);
    }

    async Task HandleWebMessage(CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : "";
            if (type == "open-url")
            {
                var url = root.TryGetProperty("url", out var urlEl) ? urlEl.GetString() ?? "" : "";
                BeginInvoke(() => OpenInboxUrl(url));
                return;
            }
            if (type == "inbox-save-config")
            {
                var url = root.TryGetProperty("url", out var urlEl) ? urlEl.GetString() ?? "" : "";
                var anon = root.TryGetProperty("anonKey", out var anonEl) ? anonEl.GetString() ?? "" : "";
                var service = root.TryGetProperty("serviceKey", out var keyEl) ? keyEl.GetString() ?? "" : "";
                var err = FeedbackStore.SaveConfig(url, anon, service);
                if (_web.CoreWebView2 is not null)
                {
                    var note = string.IsNullOrWhiteSpace(err) ? "Saved." : err;
                    _web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(new { type = "inbox-toast", text = note }));
                    _web.CoreWebView2.PostWebMessageAsJson(FeedbackStore.InboxConfigJson());
                }
                await PushListAsync(true);
                return;
            }
            if (type == "inbox-config")
            {
                if (_web.CoreWebView2 is not null)
                    _web.CoreWebView2.PostWebMessageAsJson(FeedbackStore.InboxConfigJson());
                return;
            }
            if (type == "inbox-ready" || type == "inbox-refresh")
            {
                await PushListAsync(true);
                return;
            }
            var id = root.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
            if (type == "inbox-read" && id.Length > 0)
            {
                FeedbackStore.MarkRead(id);
                await PushListAsync();
                return;
            }
            if (type == "inbox-unread" && id.Length > 0)
            {
                FeedbackStore.MarkRead(id, false);
                await PushListAsync();
                return;
            }
            if (type == "inbox-delete" && id.Length > 0)
            {
                FeedbackStore.Delete(id);
                await PushListAsync();
            }
        }
        catch
        {
            /* ignore a bad click */
        }
    }

    async Task PushListAsync(bool cloud = false)
    {
        if (_web.CoreWebView2 is null) return;
        var items = cloud ? await FeedbackStore.ListAllAsync() : FeedbackStore.List();
        if (cloud) _issues = await FetchGithubIssues();
        using var list = JsonDocument.Parse(FeedbackStore.InboxListJson(items));
        var bag = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(list.RootElement.GetRawText()) ?? new();
        bag["issues"] = JsonSerializer.SerializeToElement(_issues, JsonOut);
        _web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(bag));
        var unread = items.Count(item => !item.Read);
        BeginInvoke(() => Text = unread > 0 ? "Still Sane Inbox (" + unread + ")" : "Still Sane Inbox");
    }

    void PushList() => _ = PushListAsync();

    static async Task<List<GithubIssue>> FetchGithubIssues()
    {
        try
        {
            using var res = await GitHttp.GetAsync("https://api.github.com/repos/" + Repo + "/issues?state=open&per_page=40");
            if (!res.IsSuccessStatusCode) return new List<GithubIssue>();
            using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return new List<GithubIssue>();
            var rows = new List<GithubIssue>();
            foreach (var row in doc.RootElement.EnumerateArray())
            {
                if (row.TryGetProperty("pull_request", out _)) continue;
                var number = row.TryGetProperty("number", out var numEl) && numEl.ValueKind == JsonValueKind.Number ? numEl.GetInt32() : 0;
                var title = row.TryGetProperty("title", out var titleEl) ? titleEl.GetString() ?? "" : "";
                var body = row.TryGetProperty("body", out var bodyEl) ? bodyEl.GetString() ?? "" : "";
                var html = row.TryGetProperty("html_url", out var urlEl) ? urlEl.GetString() ?? "" : "";
                var created = row.TryGetProperty("created_at", out var atEl) ? atEl.GetString() ?? "" : "";
                if (number <= 0 || title.Length == 0) continue;
                if (!Uri.TryCreate(html, UriKind.Absolute, out var uri) || !AllowedInboxUrl(uri)) continue;
                var at = DateTimeOffset.TryParse(created, out var when) ? when.ToUnixTimeMilliseconds() : 0;
                if (body.Length > 8000) body = body[..8000];
                rows.Add(new GithubIssue
                {
                    Id = "gh-" + number,
                    Number = number,
                    Title = title,
                    Body = body,
                    Url = uri.AbsoluteUri,
                    At = at,
                });
            }
            return rows;
        }
        catch
        {
            return new List<GithubIssue>();
        }
    }

    void StartWatch()
    {
        _watch = new FileSystemWatcher(FeedbackStore.Dir(), "*.json")
        {
            NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite | NotifyFilters.Size,
            EnableRaisingEvents = true,
        };
        void Kick(object? _, FileSystemEventArgs __)
        {
            try
            {
                BeginInvoke(PushList);
            }
            catch
            {
                /* closing */
            }
        }
        _watch.Created += Kick;
        _watch.Changed += Kick;
        _watch.Deleted += Kick;
        _watch.Renamed += Kick;
    }

    static void OpenInboxUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return;
        OpenInboxUrl(uri);
    }

    static void OpenInboxUrl(Uri uri)
    {
        if (!AllowedInboxUrl(uri)) return;
        Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
    }

    static bool AllowedInboxUrl(Uri uri)
    {
        if (!uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return false;
        if (!uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase)
            && !uri.Host.Equals("www.github.com", StringComparison.OrdinalIgnoreCase)
            && !uri.Host.Equals("api.github.com", StringComparison.OrdinalIgnoreCase))
            return false;
        return uri.AbsolutePath.StartsWith("/Shawn25678/SSEv1", StringComparison.OrdinalIgnoreCase);
    }

    static HttpClient CreateGitHttp()
    {
        var http = new HttpClient(new SocketsHttpHandler { AutomaticDecompression = DecompressionMethods.All })
        {
            Timeout = TimeSpan.FromSeconds(12),
        };
        http.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "StillSaneInbox/1.0");
        http.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/vnd.github+json");
        return http;
    }

    static string ExtractInboxFiles()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ExileLedger",
            "inbox-www");
        Directory.CreateDirectory(dir);
        var asm = Assembly.GetExecutingAssembly();
        WriteResource(asm, "www.inbox.html", Path.Combine(dir, "inbox.html"));
        WriteResource(asm, "www.styles.css", Path.Combine(dir, "styles.css"));
        WriteResource(asm, "www.still-sane-sigil.png", Path.Combine(dir, "still-sane-sigil.png"));
        return Path.Combine(dir, "inbox.html");
    }

    static void WriteResource(Assembly asm, string name, string path)
    {
        using var stream = asm.GetManifestResourceStream(name);
        if (stream is null) return;
        using var file = File.Create(path);
        stream.CopyTo(file);
    }

    sealed class GithubIssue
    {
        public string Id { get; set; } = "";
        public int Number { get; set; }
        public string Title { get; set; } = "";
        public string Body { get; set; } = "";
        public string Url { get; set; } = "";
        public long At { get; set; }
    }
}
