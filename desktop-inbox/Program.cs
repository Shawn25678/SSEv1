using System.Net;
using System.Reflection;
using System.Text;
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
    readonly WebView2 _web = new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.FromArgb(12, 10, 8),
    };
    HttpListener? _listen;
    FileSystemWatcher? _watch;
    CancellationTokenSource? _listenStop;
    System.Windows.Forms.Timer? _refresh;

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
        Width = 860;
        Height = 640;
        MinimumSize = new Size(560, 420);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(12, 10, 8);
        Controls.Add(_web);
        Load += OnLoad;
        FormClosed += (_, _) =>
        {
            _listenStop?.Cancel();
            try { _listen?.Stop(); } catch { /* ignore */ }
            _listen?.Close();
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
        _web.CoreWebView2.Navigate(new Uri(page).AbsoluteUri);
        StartWatch();
        StartListen();
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
            using var doc = System.Text.Json.JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : "";
            if (type == "inbox-save-config")
            {
                var url = root.TryGetProperty("url", out var urlEl) ? urlEl.GetString() ?? "" : "";
                var anon = root.TryGetProperty("anonKey", out var anonEl) ? anonEl.GetString() ?? "" : "";
                var service = root.TryGetProperty("serviceKey", out var keyEl) ? keyEl.GetString() ?? "" : "";
                var err = FeedbackStore.SaveConfig(url, anon, service);
                if (_web.CoreWebView2 is not null)
                {
                    var note = string.IsNullOrWhiteSpace(err) ? "Saved. Player Send can use this project." : err;
                    _web.CoreWebView2.PostWebMessageAsJson(System.Text.Json.JsonSerializer.Serialize(new { type = "inbox-toast", text = note }));
                }
                await PushListAsync(true);
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
        _web.CoreWebView2.PostWebMessageAsJson(FeedbackStore.InboxListJson(items));
        var unread = items.Count(item => !item.Read);
        BeginInvoke(() => Text = unread > 0 ? "Still Sane Inbox (" + unread + ")" : "Still Sane Inbox");
    }

    void PushList() => _ = PushListAsync();

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

    void StartListen()
    {
        try
        {
            _listen = new HttpListener();
            _listen.Prefixes.Add("http://127.0.0.1:" + FeedbackStore.Port + "/");
            _listen.Start();
        }
        catch
        {
            _listen = null;
            return;
        }
        _listenStop = new CancellationTokenSource();
        var token = _listenStop.Token;
        _ = Task.Run(async () =>
        {
            while (!token.IsCancellationRequested && _listen is { IsListening: true })
            {
                HttpListenerContext ctx;
                try
                {
                    ctx = await _listen.GetContextAsync();
                }
                catch
                {
                    break;
                }
                _ = Task.Run(() => HandleRequest(ctx));
            }
        }, token);
    }

    void HandleRequest(HttpListenerContext ctx)
    {
        try
        {
            var req = ctx.Request;
            var res = ctx.Response;
            res.Headers["Access-Control-Allow-Origin"] = "*";
            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = 204;
                res.Close();
                return;
            }
            if (req.Url?.AbsolutePath == "/health")
            {
                Write(res, 200, "ok");
                return;
            }
            if (req.HttpMethod == "POST" && req.Url?.AbsolutePath == "/feedback")
            {
                using var reader = new StreamReader(req.InputStream, req.ContentEncoding ?? Encoding.UTF8);
                var json = reader.ReadToEnd();
                var item = FeedbackStore.SaveJson(json);
                Write(res, item is null ? 400 : 200, item is null ? "bad" : "ok");
                try { BeginInvoke(PushList); } catch { /* closing */ }
                return;
            }
            Write(res, 404, "no");
        }
        catch
        {
            try { ctx.Response.Abort(); } catch { /* ignore */ }
        }
    }

    static void Write(HttpListenerResponse res, int status, string body)
    {
        var bytes = Encoding.UTF8.GetBytes(body);
        res.StatusCode = status;
        res.ContentType = "text/plain; charset=utf-8";
        res.ContentLength64 = bytes.Length;
        res.OutputStream.Write(bytes);
        res.Close();
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
}
