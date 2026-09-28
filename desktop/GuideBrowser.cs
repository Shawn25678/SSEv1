using System.Drawing;
using System.Reflection;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ExileLedger;

/// <summary>In-app Guides browser with host allowlist + ad host blocking.</summary>
sealed class GuideBrowserHost : Panel
{
    const string AdCleanupScript = """
        (() => {
          const id = 'still-sane-ad-cleanup';
          const css = `
            ins.adsbygoogle, .adsbygoogle, .ad-container, .ad-wrapper, .ad-slot,
            .ad-placement, .ad-banner, .advertisement, .advertisement-container,
            .ad-placeholder, .ad-leaderboard, .ad-sidebar, .ad-sticky, .ad-unit,
            [data-ad-slot], [data-ad-unit], [data-ad-placeholder], [data-nitro-enclave-id],
            [id^="google_ads_iframe"], [id^="div-gpt-ad"], [id^="nitropay"],
            [id^="ad-slot"], [id^="ad-placement"], [class~="nitro-ad"],
            iframe[src*="doubleclick.net"], iframe[src*="googlesyndication.com"] {
              display:none!important; min-height:0!important; height:0!important;
              margin:0!important; padding:0!important;
            }`;
          const install = () => {
            if (!document.documentElement || document.getElementById(id)) return;
            const style = document.createElement('style'); style.id = id; style.textContent = css;
            (document.head || document.documentElement).appendChild(style);
          };
          new MutationObserver(install).observe(document, {childList:true, subtree:true});
          install();
        })();
        """;
    static readonly HashSet<string> AdHosts = LoadAdHosts();
    static readonly string[] AdPathHints =
    {
        "/pagead/", "/pagead2/", "/adsense/", "/adservice/", "/adserver/",
        "/advert/", "/advertising/", "/adsystem/", "/ad-iframe/",
        "doubleclick", "googlesyndication", "amazon-adsystem",
    };

    sealed class TitleBarPanel : Panel
    {
        public TitleBarPanel() { DoubleBuffered = true; ResizeRedraw = true; }
        protected override void OnPaintBackground(PaintEventArgs e)
        {
            if (ClientSize.Width == 0 || ClientSize.Height == 0) return;
            using var gradient = new System.Drawing.Drawing2D.LinearGradientBrush(ClientRectangle,
                Color.FromArgb(91, 80, 60), Color.FromArgb(58, 52, 41), 90f);
            e.Graphics.FillRectangle(gradient, ClientRectangle);
        }
    }

    readonly Panel _bar = new TitleBarPanel()
    {
        Dock = DockStyle.Top,
        Height = 48,
        BackColor = Color.FromArgb(58, 52, 41),
        Padding = new Padding(10, 8, 4, 10),
    };
    readonly FlowLayoutPanel _left = new()
    {
        Dock = DockStyle.Left,
        AutoSize = true,
        AutoSizeMode = AutoSizeMode.GrowAndShrink,
        WrapContents = false,
        BackColor = Color.Transparent,
    };
    readonly FlowLayoutPanel _right = new()
    {
        Dock = DockStyle.Right,
        AutoSize = true,
        AutoSizeMode = AutoSizeMode.GrowAndShrink,
        WrapContents = false,
        FlowDirection = FlowDirection.LeftToRight,
        BackColor = Color.Transparent,
    };
    readonly Label _url = new()
    {
        Dock = DockStyle.Fill,
        AutoEllipsis = true,
        TextAlign = ContentAlignment.MiddleLeft,
        ForeColor = Color.White,
        BackColor = Color.Transparent,
        Font = AppFont.Create(10f, FontStyle.Bold),
        Padding = new Padding(16, 0, 12, 0),
    };
    WebView2 _web = CreateWebView();

    static WebView2 CreateWebView() => new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.FromArgb(12, 10, 8),
    };

    readonly Button _back;
    readonly Button _fwd;
    readonly Button _reload;
    readonly Button _home;

    bool _ready;
    CoreWebView2Environment? _env;

    public event Action? Closed;
    public event Action? MinimizeRequested;
    public event Action? MaximizeRequested;
    public event Action? QuitRequested;
    public event Action? DragRequested;

    public GuideBrowserHost()
    {
        Visible = false;
        Dock = DockStyle.Fill;
        BackColor = Color.FromArgb(12, 10, 8);

        _back = NavBtn("← Back", "Previous page");
        _back.Width = 76;
        _fwd = NavBtn("Forward →", "Next page");
        _fwd.Width = 94;
        _back.Visible = _fwd.Visible = false;
        _reload = NavBtn("↻", "Refresh page");
        _home = NavBtn("← Back to app", "Return to Tools & Wiki");
        _home.Width = 128;
        _home.Font = AppFont.Create(10f, FontStyle.Bold);
        _home.BackColor = Color.FromArgb(216, 188, 133);
        _home.ForeColor = Color.FromArgb(24, 24, 24);
        _home.FlatAppearance.MouseOverBackColor = Color.FromArgb(239, 215, 165);
        _home.FlatAppearance.MouseDownBackColor = Color.FromArgb(195, 163, 105);

        _back.Click += (_, _) =>
        {
            if (_web.CoreWebView2?.CanGoBack == true) _web.CoreWebView2.GoBack();
        };
        _fwd.Click += (_, _) =>
        {
            if (_web.CoreWebView2?.CanGoForward == true) _web.CoreWebView2.GoForward();
        };
        _reload.Click += (_, _) => _web.CoreWebView2?.Reload();
        _home.Click += (_, _) => CloseBrowser();

        _left.Controls.Add(_home);
        _left.Controls.Add(_back);
        _left.Controls.Add(_fwd);
        _left.Controls.Add(_reload);

        var min = NavBtn("─", "Minimize");
        var max = NavBtn("□", "Maximize");
        var quit = NavBtn("×", "Close app");
        quit.FlatAppearance.MouseOverBackColor = Color.FromArgb(166, 50, 50);
        min.Click += (_, _) => MinimizeRequested?.Invoke();
        max.Click += (_, _) => MaximizeRequested?.Invoke();
        quit.Click += (_, _) => QuitRequested?.Invoke();
        _right.Controls.Add(min);
        _right.Controls.Add(max);
        _right.Controls.Add(quit);
        quit.Margin = Padding.Empty;

        _bar.Controls.Add(_url);
        _bar.Controls.Add(_right);
        _bar.Controls.Add(_left);
        _bar.Paint += (_, e) =>
        {
            using var line = new SolidBrush(Color.FromArgb(197, 165, 107));
            e.Graphics.FillRectangle(line, 0, _bar.ClientSize.Height - 3, _bar.ClientSize.Width, 3);
        };
        _bar.MouseDown += (_, e) =>
        {
            if (e.Button == MouseButtons.Left) DragRequested?.Invoke();
        };
        _url.MouseDown += (_, e) =>
        {
            if (e.Button == MouseButtons.Left) DragRequested?.Invoke();
        };
        Controls.Add(_web);
        Controls.Add(_bar);
    }

    static Button NavBtn(string text, string tip)
    {
        var btn = new Button
        {
            Text = text,
            UseMnemonic = false,
            TextAlign = ContentAlignment.MiddleCenter,
            Padding = Padding.Empty,
            Width = 36,
            Height = 30,
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(40, 36, 30),
            ForeColor = Color.White,
            Font = AppFont.Create(10f, FontStyle.Bold),
            Margin = new Padding(0, 0, 6, 0),
            Cursor = Cursors.Hand,
            TabStop = true,
            AccessibleName = tip,
        };
        btn.FlatAppearance.BorderColor = Color.FromArgb(158, 135, 91);
        btn.FlatAppearance.BorderSize = 1;
        btn.FlatAppearance.MouseOverBackColor = Color.FromArgb(58, 55, 47);
        btn.FlatAppearance.MouseDownBackColor = Color.FromArgb(76, 67, 47);
        if (tip is "Minimize" or "Maximize" or "Close app")
        {
            btn.Text = "";
            var iconName = tip == "Minimize" ? "minimize" : tip == "Maximize" ? "maximize" : "close";
            using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream($"www.art.window-{iconName}.png")
                ?? throw new InvalidOperationException("Window icon is missing.");
            using var source = Image.FromStream(stream);
            var icon = new Bitmap(source);
            btn.Disposed += (_, _) => icon.Dispose();
            btn.Paint += (_, e) =>
            {
                var size = (int)Math.Round(12 * btn.DeviceDpi / 96f);
                var x = (btn.ClientSize.Width - size) / 2;
                var y = (btn.ClientSize.Height - size) / 2;
                var state = e.Graphics.Save();
                e.Graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                e.Graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
                e.Graphics.DrawImage(icon, new Rectangle(x, y, size, size), 0, 0, 12, 12, GraphicsUnit.Pixel);
                e.Graphics.Restore(state);
            };
        }
        var tipCtrl = new ToolTip();
        tipCtrl.SetToolTip(btn, tip);
        return btn;
    }

    public async Task EnsureAsync(string userDataRoot)
    {
        if (_ready) return;
        var folder = Path.Combine(userDataRoot, "guide-browser");
        Directory.CreateDirectory(folder);
        _env = await CoreWebView2Environment.CreateAsync(userDataFolder: folder);
        await _web.EnsureCoreWebView2Async(_env);
        var core = _web.CoreWebView2;
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.Settings.IsZoomControlEnabled = true;
        core.Settings.AreBrowserAcceleratorKeysEnabled = true;
        await core.AddScriptToExecuteOnDocumentCreatedAsync(AdCleanupScript);

        core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += OnResourceRequested;
        core.NavigationStarting += OnNavigationStarting;
        core.NavigationCompleted += (_, _) => SyncNav();
        core.HistoryChanged += (_, _) => SyncNav();
        core.SourceChanged += (_, _) =>
        {
            _url.Text = SiteLabel(core.Source);
            SyncNav();
        };
        core.NewWindowRequested += (_, ev) =>
        {
            ev.Handled = true;
            if (AllowedGuideUrl(ev.Uri)) core.Navigate(ev.Uri);
        };
        _ready = true;
    }

    public async Task OpenAsync(string url, string userDataRoot)
    {
        if (!AllowedGuideUrl(url)) return;
        await EnsureAsync(userDataRoot);
        Visible = true;
        BringToFront();
        _url.Text = SiteLabel(url);
        _web.CoreWebView2!.Navigate(url);
        SyncNav();
    }

    public void CloseBrowser()
    {
        Visible = false;
        // A new view keeps the next tool's history separate; the profile retains cookies.
        Controls.Remove(_web);
        _web.Dispose();
        _web = CreateWebView();
        Controls.Add(_web);
        Controls.SetChildIndex(_web, 0);
        _ready = false;
        _back.Visible = _fwd.Visible = false;
        _url.Text = "";
        Closed?.Invoke();
    }

    void SyncNav()
    {
        var core = _web.CoreWebView2;
        _back.Enabled = core?.CanGoBack == true;
        _fwd.Enabled = core?.CanGoForward == true;
        _back.Visible = _back.Enabled;
        _fwd.Visible = _fwd.Enabled;
    }

    static string SiteLabel(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == "https"
            ? uri.Host.StartsWith("www.", StringComparison.OrdinalIgnoreCase) ? uri.Host[4..] : uri.Host
            : "";

    void OnNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (string.Equals(e.Uri, "about:blank", StringComparison.OrdinalIgnoreCase)) return;
        if (e.Uri.StartsWith("blob:https://", StringComparison.OrdinalIgnoreCase) &&
            Uri.TryCreate(e.Uri[5..], UriKind.Absolute, out var blob) &&
            Uri.TryCreate(_web.CoreWebView2?.Source, UriKind.Absolute, out var page) &&
            blob.GetLeftPart(UriPartial.Authority) == page.GetLeftPart(UriPartial.Authority) && AllowedGuideUrl(page.AbsoluteUri)) return;
        if (!AllowedGuideUrl(e.Uri)) e.Cancel = true;
    }

    void OnResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
    {
        var uri = e.Request?.Uri;
        if (string.IsNullOrWhiteSpace(uri)) return;
        if (!IsAdRequest(uri)) return;
        try
        {
            e.Response = _web.CoreWebView2!.Environment.CreateWebResourceResponse(
                null, 403, "Blocked", "Content-Type: text/plain");
        }
        catch
        {
            /* ignore filter miss */
        }
    }

    internal static bool AllowedGuideUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (!uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            return false;
        return TrackerWindow.AllowedGuideHost(uri.Host);
    }

    static bool IsAdRequest(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        var host = uri.Host.Trim().TrimEnd('.').ToLowerInvariant();
        if (host.StartsWith("www.")) host = host[4..];
        if (AdHosts.Contains(host)) return true;
        foreach (var h in AdHosts)
        {
            if (host.EndsWith("." + h, StringComparison.Ordinal)) return true;
        }
        var full = uri.AbsoluteUri.ToLowerInvariant();
        foreach (var hint in AdPathHints)
        {
            if (full.Contains(hint, StringComparison.Ordinal)) return true;
        }
        return false;
    }

    static HashSet<string> LoadAdHosts()
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("adblock-hosts.txt");
            if (stream is null) return set;
            using var reader = new StreamReader(stream);
            string? line;
            while ((line = reader.ReadLine()) is not null)
            {
                line = line.Trim();
                if (line.Length == 0 || line.StartsWith('#')) continue;
                set.Add(line.ToLowerInvariant());
            }
        }
        catch
        {
            /* empty blocklist still runs */
        }
        return set;
    }
}
