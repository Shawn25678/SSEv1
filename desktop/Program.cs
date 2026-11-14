using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ExileLedger;

static class Program
{
    static Mutex? SingleInstance;

    [STAThread]
    static void Main()
    {
        SingleInstance = new Mutex(true, @"Local\StillSaneExile.SingleInstance", out var created);
        if (!created) { SingleInstance.Dispose(); return; }
        try
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new TrackerWindow());
        }
        finally
        {
            SingleInstance.ReleaseMutex();
            SingleInstance.Dispose();
        }
    }
}

sealed class TrackerWindow : Form
{
    static readonly HttpClient Http = CreateHttp();
    static readonly SemaphoreSlim Gate = new(3, 3);
    static readonly ConcurrentDictionary<string, (DateTime at, int status, string body)> Cache = new();
    static readonly JsonSerializerOptions JsonOut = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    const string TradeLive = "available";
    const string TradeExchangeLive = "online";
    const int TradeFetchBatch = 10;
    const int TradeFetchCap = 100;
    static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(10);
    static readonly string[] ExchangeHave = ["exalted", "chaos", "divine"];

    readonly WebView2 _web = new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.FromArgb(12, 10, 8),
    };

    const int HotLogId = 1;
    const int HotNextId = 2;
    const int HotPriceId = 3;
    const int HotHideoutId = 4;
    const int HotSettingsId = 5;
    const int HotWealthId = 6;
    static readonly Size CompanionMinimum = new(900, 640);
    double _companionWindowScale = 1;
    Rectangle _lastCompanionArea;
    Size ScaledCompanionMinimum => new((int)Math.Round(CompanionMinimum.Width * _companionWindowScale), (int)Math.Round(CompanionMinimum.Height * _companionWindowScale));
    bool _launcherHotkeyRegistered;
    bool _hotkeysPaused;
    bool _companionAboveGame;
    bool _pagePainted;
    bool _webWarm;
    bool _openingCompanion;
    int _companionOpenGeneration;
    bool _appReady;
    string _indexPage = "";
    Task? _webReady;
    string _companionViewAction = "open-dashboard";
    long _companionOpeningUntil;
    GameLauncherForm? _launcher;
    string _hotHideout = "F6";
    bool _sendingHideout;
    const uint ModNoRepeat = 0x4000;
    const int WmHotkey = 0x0312;
    string _hotLog = "F8";
    string _hotNext = "F9";
    string _hotPrice = "F7";
    bool _capturingItem;
    bool _wealthSnapshot;
    WealthTabDetector? _wealthTabDetector;
    long _nextWealthTabCheck;
    readonly MovementShortcutState _movementShortcuts = new();
    readonly GameMenuVisibility _gameMenus = new();
    readonly System.Windows.Forms.Timer _wealthRefresh = new() { Interval = 60_000 };
    readonly HashSet<(uint Modifiers, uint Key)> _registeredGameHotkeys = new();
    string? _gameMenuConfigPath;
    DateTime _gameMenuConfigStamp;
    long _nextGameMenuConfigCheck;
    readonly List<(int id, uint modifiers, uint key)> _movementBindings = new();
    IntPtr _keyboardHook;
    KeyboardHookProc? _keyboardHookProc;
    IntPtr _hookForeground;
    string _hookGame = "";
    string _focusedGame = "poe2";
    CoreWebView2Environment? _env;
    PriceOverlayForm? _overlay;
    PriceOverlayForm? _previewOverlay;
    Task? _previewInitialization;
    int _previewGeneration;
    bool _previewEnabled;
    GuideBrowserHost? _guideBrowser;
    NotifyIcon? _tray;

    public TrackerWindow()
    {
        Text = "Still Sane, Exile?";
        try
        {
            var path = Environment.ProcessPath;
            if (!string.IsNullOrWhiteSpace(path)) Icon = Icon.ExtractAssociatedIcon(path);
        }
        catch
        {
            /* keep the default window icon */
        }
        FormBorderStyle = FormBorderStyle.None;
        Width = 1008;
        Height = 677;
        MinimumSize = CompanionMinimum;
        MinimizeBox = false;
        MaximizeBox = false;
        ShowInTaskbar = false;
        Opacity = 0;
        WindowState = FormWindowState.Minimized;
        StartPosition = FormStartPosition.Manual;
        BackColor = Color.FromArgb(12, 10, 8);
        Controls.Add(_web);
        var trayMenu = new ContextMenuStrip();
        trayMenu.Items.Add(new ToolStripMenuItem("Open PoE 2 to use the SSE menu") { Enabled = false });
        trayMenu.Items.Add("Exit", null, (_, _) => Close());
        _tray = new NotifyIcon
        {
            Icon = Icon ?? SystemIcons.Application,
            Text = "Still Sane, Exile? · Open from the PoE 2 menu",
            ContextMenuStrip = trayMenu,
            Visible = true,
        };
        Resize += (_, _) =>
        {
            if (WindowState == FormWindowState.Minimized && !_openingCompanion && !_wealthSnapshot)
            {
                HideCompanionWindow();
            }
        };
        Load += OnLoad;
        Shown += (_, _) => { if (!_companionAboveGame && !_openingCompanion && !_webWarm) HideCompanionWindow(); };
        FormClosed += (_, _) =>
        {
            ClearHotkeys();
            _wealthRefresh.Stop();
            _wealthRefresh.Dispose();
            _launcher?.Dispose();
            _overlay?.Dispose();
            _previewOverlay?.Dispose();
            _guideBrowser?.Dispose();
            _tray?.Dispose();
            trayMenu.Dispose();
        };
    }

    // Opacity 0 still hit-tests. While the page is parked over the game, clicks must pass through.
    void SetCompanionPassthrough(bool on)
    {
        if (!IsHandleCreated) return;
        const long pass = 0x20 | 0x08000000; // WS_EX_TRANSPARENT | WS_EX_NOACTIVATE
        var style = GetWindowLongPtr(Handle, -20).ToInt64();
        var next = on ? style | pass : style & ~pass;
        if (next != style) SetWindowLongPtr(Handle, -20, new IntPtr(next));
        // Windows keeps the old click-through test until the frame is refreshed,
        // so the menus look ready while clicks still fall through.
        SetWindowPos(Handle, IntPtr.Zero, 0, 0, 0, 0, 0x0037);
    }

    void RestoreFromTray()
    {
        WindowState = FormWindowState.Normal;
        SetCompanionPassthrough(false);
        var recenter = !Visible;
        PlaceCompanionWindow(recenter);
        if (!Visible) Show();
        if (IsIconic(Handle)) ShowWindow(Handle, 9);
        PlaceCompanionWindow(recenter);
        TopMost = true;
        Opacity = 1;
        if (_tray != null) _tray.Visible = true;
        FocusCompanionWindow();
    }

    // Paint off to the side until the game size is known. Showing at 0,0 covers
    // the corner and opening then has to resize, which is the stall.
    void ParkCompanion()
    {
        if (IsDisposed || (_companionAboveGame && _pagePainted && Opacity > 0.5)) return;
        if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
        _webWarm = true;
        var opening = _companionAboveGame;
        // Stay above the game until the page has painted once. Under the game,
        // the browser treats the window as covered and never finishes the frame.
        TopMost = opening || !_pagePainted;
        if (!IsHandleCreated) return;
        if (!Visible) Show();
        ShowWindow(Handle, 4);
        if (!CompanionArea().IsEmpty) PlaceCompanionWindow(recenter: true);
        else if (!opening) Location = new Point(-32000, -32000);
        SetCompanionPassthrough(!opening);
        // Fully clear only after the first paint. Alpha 0 stops the browser from drawing.
        Opacity = !opening && !_pagePainted ? 0.01 : 0;
        if (Opacity < 0.5) ReturnFocusToGame();
    }

    void ReturnFocusToGame()
    {
        _launcher?.NoteGameWindow();
        var game = _launcher?.GameWindow ?? IntPtr.Zero;
        if (game == IntPtr.Zero) return;
        var foreground = GetForegroundWindow();
        GetWindowThreadProcessId(foreground, out var foregroundPid);
        if (foregroundPid != (uint)Environment.ProcessId) return;
        var gameThread = GetWindowThreadProcessId(game, out _);
        var ours = GetCurrentThreadId();
        var attached = gameThread != 0 && gameThread != ours && AttachThreadInput(ours, gameThread, true);
        try { SetForegroundWindow(game); }
        finally { if (attached) AttachThreadInput(ours, gameThread, false); }
    }

    void FocusCompanionWindow()
    {
        if (!_companionAboveGame || !Visible) return;
        var foreground = GetForegroundWindow();
        var foregroundThread = GetWindowThreadProcessId(foreground, out _);
        var ours = GetCurrentThreadId();
        var attached = foregroundThread != 0 && foregroundThread != ours && AttachThreadInput(ours, foregroundThread, true);
        ShowWindow(Handle, 5);
        SetWindowPos(Handle, new IntPtr(-1), 0, 0, 0, 0, 0x0043); // Show above PoE without changing bounds.
        try
        {
            Activate();
            SetForegroundWindow(Handle);
        }
        finally { if (attached) AttachThreadInput(ours, foregroundThread, false); }
        if (_web.CoreWebView2 is not null)
        {
            _web.Select();
            _web.Focus();
        }
    }

    void FinishCompanionNavigation(bool success)
    {
        _appReady = success;
        if (!_appReady) return;
        if (_companionAboveGame)
        {
            PushHotkey(_companionViewAction);
            RestoreFromTray();
        }
        else ParkCompanion();
    }

    void RevealCompanionIfOpen(string view)
    {
        _pagePainted = true;
        if (!_companionAboveGame)
        {
            ParkCompanion();
            return;
        }
        var want = _companionViewAction switch
        {
            "open-settings" => "settings",
            "open-wealth" => "wealth",
            _ => "dash",
        };
        if (view != want && !(want == "dash" && view == "econ")) return;
        RestoreFromTray();
    }

    bool SseHasForeground()
    {
        var foreground = GetForegroundWindow();
        if (IsHandleCreated && (foreground == Handle || IsChild(Handle, foreground))) return true;
        GetWindowThreadProcessId(foreground, out var pid);
        return pid == Environment.ProcessId;
    }

    bool SettingsShortcutContext(bool gameFocused) => gameFocused ||
        (_launcher?.GameRunning == true && SseHasForeground());

    bool SettingsShortcutAvailable() => !_hotkeysPaused &&
        !new[] { _hotLog, _hotNext, _hotPrice, _hotHideout }
            .Any(spec => TryParseHotkey(spec, out var mod, out var key) && (mod & 15) == 4 && key == 0x20);

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == (Keys.Shift | Keys.Space) && SettingsShortcutAvailable() &&
            SettingsShortcutContext(GameHasFocus()))
        {
            OpenCompanionView("settings");
            return true;
        }
        return base.ProcessCmdKey(ref msg, keyData);
    }

    void SetCompanionWindowScale(double scale)
    {
        _web.ZoomFactor = 1;
        if (Math.Abs(_companionWindowScale - scale) < 0.001) return;
        _companionWindowScale = scale;
        PlaceCompanionWindow(recenter: false);
    }

    void PlaceCompanionWindow(bool recenter)
    {
        var area = CompanionArea();
        if (area.IsEmpty) return;
        _lastCompanionArea = area;
        var minimum = new Size(Math.Min(ScaledCompanionMinimum.Width, area.Width), Math.Min(ScaledCompanionMinimum.Height, area.Height));
        if (MinimumSize != minimum) MinimumSize = minimum;
        var size = new Size(
            Math.Max(minimum.Width, Math.Min((int)(area.Width * 0.5328 * _companionWindowScale), area.Width - 24)),
            Math.Max(minimum.Height, Math.Min((int)(area.Height * 0.6048 * _companionWindowScale), area.Height - 24)));
        var point = recenter
            ? new Point(area.Left + Math.Max(0, (area.Width - size.Width) / 2), area.Top + Math.Max(0, (area.Height - size.Height) / 2))
            : Location;
        var bounds = FitCompanionBounds(new Rectangle(point, size), area);
        if (Bounds != bounds) Bounds = bounds;
    }

    Rectangle CompanionArea()
    {
        _launcher?.NoteGameWindow();
        if (_launcher?.GameRunning != true) return Rectangle.Empty;
        var game = _launcher.GameClientBounds;
        if (game.Width <= 0 || game.Height <= 0) return Rectangle.Empty;
        var visible = Rectangle.Intersect(game, Screen.FromRectangle(game).WorkingArea);
        return visible.IsEmpty ? game : visible;
    }

    Rectangle FitCompanionBounds(Rectangle bounds, Rectangle area)
    {
        var width = Math.Clamp(bounds.Width, Math.Min(ScaledCompanionMinimum.Width, area.Width), area.Width);
        var height = Math.Clamp(bounds.Height, Math.Min(ScaledCompanionMinimum.Height, area.Height), area.Height);
        return new Rectangle(Math.Clamp(bounds.X, area.Left, area.Right - width),
            Math.Clamp(bounds.Y, area.Top, area.Bottom - height), width, height);
    }

    [StructLayout(LayoutKind.Sequential)]
    struct CompanionWindowPosition
    {
        public IntPtr Window, InsertAfter;
        public int X, Y, Width, Height;
        public uint Flags;
    }

    protected override bool ShowWithoutActivation => !_companionAboveGame;

    void HideCompanionWindow()
    {
        _companionOpenGeneration++;
        _companionAboveGame = false;
        if (_webWarm && IsHandleCreated && !_wealthSnapshot)
        {
            ParkCompanion();
            return;
        }
        TopMost = false;
        Hide();
        Opacity = 0;
    }

    void OpenCompanionView(string view)
    {
        // A game may minimize during the popup-to-app focus handoff. That must
        // not cancel a menu action the user already invoked over the game.
        if (_launcher?.GameRunning != true) return;
        var generation = ++_companionOpenGeneration;
        _companionViewAction = view switch
        {
            "settings" => "open-settings",
            "wealth" => "open-wealth",
            _ => "open-dashboard",
        };
        _openingCompanion = true;
        _companionOpeningUntil = Environment.TickCount64 + 600;
        try
        {
            _overlay?.HideOverlay();
            _companionAboveGame = true;
            TopMost = true;
            if (!_appReady) _ = EnsureWebAsync();
            else PushHotkey(_companionViewAction);
            if (_appReady) RestoreFromTray();
            else ParkCompanion();
            UpdateLauncherShortcut(GameHasFocus());
            // The popup/WebView can finish their own focus cleanup after Show().
            // Finish this user-requested handoff once, without reviving a closed view.
            BeginInvoke(() =>
            {
                if (generation == _companionOpenGeneration && _appReady && _companionAboveGame &&
                    Opacity > 0.5 && SettingsShortcutContext(GameHasFocus())) FocusCompanionWindow();
            });
        }
        finally { _openingCompanion = false; }
    }

    void UpdateLauncherShortcut(bool gameFocused)
    {
        if (_wealthSnapshot) return;
        NoteFocusedGame();
        if (gameFocused && Environment.TickCount64 >= _nextGameMenuConfigCheck)
        {
            _nextGameMenuConfigCheck = Environment.TickCount64 + 5000;
            RefreshGameMenuBindings();
        }
        if (!gameFocused) _gameMenus.ClearHeldKeys();
        else if (!_companionAboveGame && !_webWarm) ParkCompanion();
        else if (!_companionAboveGame && _webWarm && !CompanionArea().IsEmpty && CompanionArea() != _lastCompanionArea)
            PlaceCompanionWindow(recenter: true);
        WatchWealthTab(gameFocused);
        _overlay?.ConstrainToGame();
        _previewOverlay?.ConstrainToGame();
        if (_companionAboveGame && !_openingCompanion && CompanionArea() != _lastCompanionArea)
            PlaceCompanionWindow(recenter: false);
        // Keep the launcher-opened app above PoE, but never above unrelated apps.
        var foreground = GetForegroundWindow();
        GetWindowThreadProcessId(foreground, out var foregroundPid);
        if (_companionAboveGame && !_openingCompanion &&
            (_launcher?.GameRunning != true ||
            (Environment.TickCount64 >= _companionOpeningUntil && !gameFocused &&
             foregroundPid != Environment.ProcessId && !ContainsFocus)))
        {
            HideCompanionWindow();
        }
        var enabled = SettingsShortcutContext(gameFocused) && SettingsShortcutAvailable();
        if (enabled && !_launcherHotkeyRegistered)
            _launcherHotkeyRegistered = RegisterHotKey(Handle, HotSettingsId, ModNoRepeat | 4, 0x20);
        else if (!enabled && _launcherHotkeyRegistered)
        {
            UnregisterHotKey(Handle, HotSettingsId);
            _launcherHotkeyRegistered = false;
        }
    }

    protected override CreateParams CreateParams
    {
        get
        {
            var cp = base.CreateParams;
            cp.Style &= ~0x00C00000; // WS_CAPTION (title bar)
            cp.Style &= ~0x000B0000; // WS_SYSMENU, WS_MINIMIZEBOX, WS_MAXIMIZEBOX
            cp.Style |= 0x00040000; // WS_THICKFRAME — keep resize when borderless
            cp.ExStyle |= 0x00000080; // WS_EX_TOOLWINDOW — companion has no standalone taskbar/Alt-Tab entry.
            return cp;
        }
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        ApplyDarkChrome();
    }

    [DllImport("dwmapi.dll")]
    static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    [DllImport("user32.dll")]
    static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    static extern IntPtr SendMessage(IntPtr hWnd, int msg, IntPtr wParam, IntPtr lParam);

    void ApplyDarkChrome()
    {
        if (!IsHandleCreated) return;
        try
        {
            var dark = 1;
            _ = DwmSetWindowAttribute(Handle, 20, ref dark, sizeof(int));
            _ = DwmSetWindowAttribute(Handle, 19, ref dark, sizeof(int));
            var caption = 0x00080A0C;
            var border = 0x00080A0C;
            var text = 0x00D8EAF3;
            _ = DwmSetWindowAttribute(Handle, 35, ref caption, sizeof(int));
            _ = DwmSetWindowAttribute(Handle, 34, ref border, sizeof(int));
            _ = DwmSetWindowAttribute(Handle, 36, ref text, sizeof(int));
        }
        catch
        {
            /* older Windows keeps the default caption */
        }
    }

    void DragWindow()
    {
        ReleaseCapture();
        SendMessage(Handle, 0xA1, (IntPtr)2, IntPtr.Zero); // WM_NCLBUTTONDOWN, HTCAPTION
    }

    protected override void WndProc(ref Message m)
    {
        if (_companionAboveGame && !_openingCompanion)
        {
            // Keep native drags, edge resizes and Windows placement shortcuts in PoE.
            if (m.Msg == 0xA3 || (m.Msg == 0x112 && ((m.WParam.ToInt64() & 0xFFF0) is 0xF020 or 0xF030)))
            {
                m.Result = IntPtr.Zero;
                return;
            }
            var area = m.Msg is 0x214 or 0x216 or 0x46 ? CompanionArea() : Rectangle.Empty;
            if (!area.IsEmpty && m.LParam != IntPtr.Zero)
            {
                if (m.Msg is 0x214 or 0x216) // WM_SIZING / WM_MOVING: proposed screen rectangle.
                {
                    var rect = Rectangle.FromLTRB(Marshal.ReadInt32(m.LParam), Marshal.ReadInt32(m.LParam, 4),
                        Marshal.ReadInt32(m.LParam, 8), Marshal.ReadInt32(m.LParam, 12));
                    var fit = FitCompanionBounds(rect, area);
                    Marshal.WriteInt32(m.LParam, fit.Left);
                    Marshal.WriteInt32(m.LParam, 4, fit.Top);
                    Marshal.WriteInt32(m.LParam, 8, fit.Right);
                    Marshal.WriteInt32(m.LParam, 12, fit.Bottom);
                    m.Result = new IntPtr(1);
                    return;
                }
                if (m.Msg == 0x46) // WM_WINDOWPOSCHANGING also catches keyboard/system moves.
                {
                    var pos = Marshal.PtrToStructure<CompanionWindowPosition>(m.LParam);
                    var rect = new Rectangle((pos.Flags & 2) == 0 ? pos.X : Left, (pos.Flags & 2) == 0 ? pos.Y : Top,
                        (pos.Flags & 1) == 0 ? pos.Width : Width, (pos.Flags & 1) == 0 ? pos.Height : Height);
                    var fit = FitCompanionBounds(rect, area);
                    if (rect.Location != fit.Location) { pos.X = fit.X; pos.Y = fit.Y; pos.Flags &= ~2u; }
                    if (rect.Size != fit.Size) { pos.Width = fit.Width; pos.Height = fit.Height; pos.Flags &= ~1u; }
                    Marshal.StructureToPtr(pos, m.LParam, false);
                }
            }
        }
        // Our client area includes the title bar; Windows must not paint an inactive caption over it.
        if (m.Msg == 0x86) // WM_NCACTIVATE
        {
            m.LParam = new IntPtr(-1); // Update activation without repainting the non-client area.
            base.WndProc(ref m);
            return;
        }
        if (m.Msg == 0x85) // WM_NCPAINT
        {
            m.Result = IntPtr.Zero;
            return;
        }
        // Keep native resize limits inside the game client area.
        if (m.Msg == 0x24) // WM_GETMINMAXINFO
        {
            base.WndProc(ref m);
            var screen = Screen.FromHandle(Handle);
            var gameArea = _companionAboveGame ? CompanionArea() : Rectangle.Empty;
            var area = gameArea.IsEmpty ? screen.WorkingArea : gameArea;
            Marshal.WriteInt32(m.LParam, 8, area.Width);
            Marshal.WriteInt32(m.LParam, 12, area.Height);
            Marshal.WriteInt32(m.LParam, 16, area.Left - screen.Bounds.Left);
            Marshal.WriteInt32(m.LParam, 20, area.Top - screen.Bounds.Top);
            if (!gameArea.IsEmpty)
            {
                Marshal.WriteInt32(m.LParam, 24, Math.Min(ScaledCompanionMinimum.Width, area.Width));
                Marshal.WriteInt32(m.LParam, 28, Math.Min(ScaledCompanionMinimum.Height, area.Height));
                Marshal.WriteInt32(m.LParam, 32, area.Width);
                Marshal.WriteInt32(m.LParam, 36, area.Height);
            }
            return;
        }
        // The borderless client area includes our custom title bar.
        if (m.Msg == 0x83 && m.WParam != IntPtr.Zero) // WM_NCCALCSIZE
        {
            m.Result = IntPtr.Zero;
            return;
        }
        const int wmNcHitTest = 0x84;
        const int htClient = 1;
        const int htLeft = 10;
        const int htRight = 11;
        const int htTop = 12;
        const int htTopLeft = 13;
        const int htTopRight = 14;
        const int htBottom = 15;
        const int htBottomLeft = 16;
        const int htBottomRight = 17;
        if (m.Msg == WmHotkey)
        {
            var id = m.WParam.ToInt32();
            if (id == HotSettingsId)
            {
                if (SettingsShortcutAvailable() && SettingsShortcutContext(GameHasFocus()))
                    BeginInvoke(() => OpenCompanionView("settings"));
                m.Result = IntPtr.Zero;
                return;
            }
            if (id == HotWealthId) { m.Result = IntPtr.Zero; return; }
            var playing = FocusedGame();
            if (playing.Length == 0) { base.WndProc(ref m); return; }
            if (playing == "poe1")
            {
                if (id == HotPriceId) BeginInvoke(() => CaptureClipboardItem("price-item"));
                else if (id == HotHideoutId) BeginInvoke(SendHideout);
            }
            else if (id == HotLogId) BeginInvoke(() => CaptureClipboardItem("log-item"));
            else if (id == HotPriceId) BeginInvoke(() => CaptureClipboardItem("price-item"));
            else if (id == HotNextId) BeginInvoke(() => PushHotkey("next-kill"));
            else if (id == HotHideoutId) BeginInvoke(SendHideout);
        }
        if (m.Msg == wmNcHitTest && WindowState != FormWindowState.Maximized)
        {
            base.WndProc(ref m);
            if (m.Result == (IntPtr)htClient)
            {
                var pt = PointToClient(Cursor.Position);
                const int grip = 8;
                var left = pt.X <= grip;
                var right = pt.X >= ClientSize.Width - grip;
                var top = pt.Y <= grip;
                var bottom = pt.Y >= ClientSize.Height - grip;
                if (top && left) m.Result = (IntPtr)htTopLeft;
                else if (top && right) m.Result = (IntPtr)htTopRight;
                else if (bottom && left) m.Result = (IntPtr)htBottomLeft;
                else if (bottom && right) m.Result = (IntPtr)htBottomRight;
                else if (left) m.Result = (IntPtr)htLeft;
                else if (right) m.Result = (IntPtr)htRight;
                else if (top) m.Result = (IntPtr)htTop;
                else if (bottom) m.Result = (IntPtr)htBottom;
            }
            return;
        }
        base.WndProc(ref m);
    }

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW", SetLastError = true)]
    static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW", SetLastError = true)]
    static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr newLong);

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll")]
    static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, nuint dwExtraInfo);

    delegate IntPtr KeyboardHookProc(int code, IntPtr message, IntPtr data);
    [StructLayout(LayoutKind.Sequential)]
    struct HookKeyboardData
    {
        public uint Key, Scan, Flags, Time;
        public nuint Extra;
    }
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr SetWindowsHookEx(int hook, KeyboardHookProc callback, IntPtr module, uint thread);
    [DllImport("user32.dll")]
    static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll")]
    static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr message, IntPtr data);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr GetModuleHandle(string? name);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool CreateHardLink(string fileName, string existingFileName, IntPtr security);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetWindowText(IntPtr window, System.Text.StringBuilder text, int count);

    string FocusedGame()
    {
        var window = GetForegroundWindow();
        if (window == _hookForeground) return _hookGame;
        _hookForeground = window;
        _hookGame = "";
        try
        {
            GetWindowThreadProcessId(window, out var pid);
            using var process = Process.GetProcessById((int)pid);
            var title = new System.Text.StringBuilder(256);
            GetWindowText(window, title, title.Capacity);
            var processName = process.ProcessName;
            var titleText = title.ToString();
            if (processName.StartsWith("PathOfExile2", StringComparison.OrdinalIgnoreCase) ||
                (processName.StartsWith("PathOfExile", StringComparison.OrdinalIgnoreCase) &&
                 titleText.StartsWith("Path of Exile 2", StringComparison.OrdinalIgnoreCase)))
                _hookGame = "poe2";
            else if (processName.StartsWith("PathOfExile", StringComparison.OrdinalIgnoreCase))
                _hookGame = "poe1";
        }
        catch { /* Foreground process may have closed. */ }
        return _hookGame;
    }

    bool Poe2HasFocus() => FocusedGame() == "poe2";

    bool GameHasFocus() => FocusedGame().Length > 0;

    void NoteFocusedGame()
    {
        var game = FocusedGame();
        if (game.Length == 0 || game == _focusedGame) return;
        _focusedGame = game;
        _gameMenuConfigStamp = DateTime.MinValue;
        var documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        _gameMenuConfigPath = game == "poe1"
            ? Path.Combine(documents, "My Games", "Path of Exile", "production_Config.ini")
            : Path.Combine(documents, "My Games", "Path of Exile 2", "poe2_production_Config.ini");
        _gameMenus.Reset();
        PushJson(new { type = "active-game", game });
    }

    void DispatchMovementShortcut(int id, uint key, uint scan, bool releaseMovement)
    {
        var playing = FocusedGame();
        if (releaseMovement && playing.Length > 0) keybd_event((byte)key, (byte)scan, 0x0002, 0);
        if (playing.Length == 0) return;
        if (id == HotPriceId) CaptureClipboardItem("price-item");
        else if (id == HotHideoutId) SendHideout();
        else if (playing == "poe2" && id == HotLogId) CaptureClipboardItem("log-item");
        else if (playing == "poe2" && id == HotNextId) PushHotkey("next-kill");
    }

    IntPtr InterceptMovementShortcut(int code, IntPtr message, IntPtr data)
    {
        if (code < 0) return CallNextHookEx(_keyboardHook, code, message, data);
        var key = Marshal.PtrToStructure<HookKeyboardData>(data);
        // Ignore synthetic Ctrl+C and key-up events sent by SSE or other software.
        if ((key.Flags & 0x10) != 0)
            return CallNextHookEx(_keyboardHook, code, message, data);
        var msg = message.ToInt32();
        if (msg is not (0x100 or 0x101 or 0x104 or 0x105))
            return CallNextHookEx(_keyboardHook, code, message, data);
        uint modifiers = 0;
        if ((GetAsyncKeyState(0x12) & 0x8000) != 0) modifiers |= 1;
        if ((GetAsyncKeyState(0x11) & 0x8000) != 0) modifiers |= 2;
        if ((GetAsyncKeyState(0x10) & 0x8000) != 0) modifiers |= 4;
        if (((GetAsyncKeyState(0x5B) | GetAsyncKeyState(0x5C)) & 0x8000) != 0) modifiers |= 8;
        var down = msg is 0x100 or 0x104;
        var gameFocused = GameHasFocus();
        var decision = key.Key is 0x57 or 0x41 or 0x53 or 0x44
            ? _movementShortcuts.Handle(key.Key, down, gameFocused, modifiers, _movementBindings)
            : default;
        _gameMenus.Observe(key.Key, down, modifiers, gameFocused);
        if (decision.Action != 0)
            BeginInvoke(() => DispatchMovementShortcut(decision.Action, key.Key, key.Scan, decision.ReleaseMovement));
        return decision.Block ? new IntPtr(1) : CallNextHookEx(_keyboardHook, code, message, data);
    }

    void ClearHotkeys()
    {
        _hotkeysPaused = true;
        if (_launcherHotkeyRegistered) UnregisterHotKey(Handle, HotSettingsId);
        _launcherHotkeyRegistered = false;
        if (_keyboardHook != IntPtr.Zero) UnhookWindowsHookEx(_keyboardHook);
        _keyboardHook = IntPtr.Zero;
        _movementBindings.Clear();
        _registeredGameHotkeys.Clear();
        _movementShortcuts.Clear();
        _gameMenus.ClearHeldKeys();
        _hookForeground = IntPtr.Zero;
        _hookGame = "";
        UnregisterHotKey(Handle, HotWealthId);
        try { UnregisterHotKey(Handle, HotLogId); } catch { /* ignore */ }
        try { UnregisterHotKey(Handle, HotNextId); } catch { /* ignore */ }
        try { UnregisterHotKey(Handle, HotPriceId); } catch { /* ignore */ }
        try { UnregisterHotKey(Handle, HotHideoutId); } catch { /* ignore */ }
    }

    void ApplyHotkeys(string logSpec, string nextSpec, string priceSpec, string hideoutSpec = "F6")
    {
        ClearHotkeys();
        _hotkeysPaused = false;
        _hotLog = string.IsNullOrWhiteSpace(logSpec) ? "F8" : logSpec.Trim();
        _hotNext = string.IsNullOrWhiteSpace(nextSpec) ? "F9" : nextSpec.Trim();
        _hotPrice = string.IsNullOrWhiteSpace(priceSpec) ? "F7" : priceSpec.Trim();
        _hotHideout = string.IsNullOrWhiteSpace(hideoutSpec) ? "F6" : hideoutSpec.Trim();
        var used = new HashSet<(uint mod, uint vk)>();
        bool Bind(int id, string spec, out string shown)
        {
            shown = spec;
            if (!TryParseHotkey(spec, out var mod, out var vk)) return false;
            if (!used.Add((mod, vk))) return false;
            var registered = RegisterHotKey(Handle, id, mod, vk);
            if (registered) _registeredGameHotkeys.Add((mod & 15, vk));
            if (registered && vk is 0x57 or 0x41 or 0x53 or 0x44)
                _movementBindings.Add((id, mod, vk));
            return registered;
        }
        var logOk = Bind(HotLogId, _hotLog, out _);
        var nextOk = Bind(HotNextId, _hotNext, out _);
        var priceOk = Bind(HotPriceId, _hotPrice, out _);
        var hideoutOk = Bind(HotHideoutId, _hotHideout, out _);
        var wealthOk = Bind(HotWealthId, "Ctrl+Shift+F9", out _);
        PushJson(new { type = "wealth-hotkey", available = wealthOk });
        EnsureGameKeyboardHook();
        if (!logOk || !nextOk || !priceOk || !hideoutOk)
        {
            var bad = !logOk ? _hotLog : !nextOk ? _hotNext : !priceOk ? _hotPrice : _hotHideout;
            PushJson(new
            {
                type = "hotkey-status",
                ok = false,
                error = bad + " is already in use",
            });
        }
    }

    void EnsureGameKeyboardHook()
    {
        if (_keyboardHook != IntPtr.Zero) return;
        _keyboardHookProc = InterceptMovementShortcut;
        _keyboardHook = SetWindowsHookEx(13, _keyboardHookProc, GetModuleHandle(null), 0);
        if (_keyboardHook == IntPtr.Zero)
            PushJson(new { type = "hotkey-status", ok = false,
                error = "Game-key monitoring could not start (Windows error " + Marshal.GetLastWin32Error() + ")." });
    }

    void RefreshGameMenuBindings()
    {
        if (_gameMenuConfigPath is null) return;
        try
        {
            var stamp = File.GetLastWriteTimeUtc(_gameMenuConfigPath);
            if (stamp == _gameMenuConfigStamp || !File.Exists(_gameMenuConfigPath)) return;
            _gameMenus.Configure(File.ReadLines(_gameMenuConfigPath));
            _gameMenuConfigStamp = stamp;
        }
        catch { /* Retain the last menu bindings while PoE rewrites its config. */ }
    }

    static bool TryParseHotkey(string spec, out uint modifiers, out uint vk)
    {
        modifiers = ModNoRepeat;
        vk = 0;
        if (string.IsNullOrWhiteSpace(spec)) return false;
        foreach (var raw in spec.Split('+', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var p = raw.Trim();
            if (p.Equals("Ctrl", StringComparison.OrdinalIgnoreCase) || p.Equals("Control", StringComparison.OrdinalIgnoreCase))
                modifiers |= 0x0002;
            else if (p.Equals("Alt", StringComparison.OrdinalIgnoreCase))
                modifiers |= 0x0001;
            else if (p.Equals("Shift", StringComparison.OrdinalIgnoreCase))
                modifiers |= 0x0004;
            else if (p.Equals("Win", StringComparison.OrdinalIgnoreCase) || p.Equals("Meta", StringComparison.OrdinalIgnoreCase))
                modifiers |= 0x0008;
            else if (Regex.IsMatch(p, @"^F([1-9]|1[0-2])$", RegexOptions.IgnoreCase))
                vk = 0x6Fu + uint.Parse(p[1..]);
            else if (p.Equals("Space", StringComparison.OrdinalIgnoreCase))
                vk = 0x20;
            else if (p.Length == 1)
            {
                var c = char.ToUpperInvariant(p[0]);
                if (c is >= 'A' and <= 'Z' or >= '0' and <= '9') vk = c;
                else return false;
            }
            else return false;
        }
        return vk != 0;
    }

    static bool LooksLikePoeItem(string text) =>
        !string.IsNullOrWhiteSpace(text) &&
        (text.Contains("Item Class:", StringComparison.OrdinalIgnoreCase) ||
         text.Contains("Rarity:", StringComparison.OrdinalIgnoreCase));

    static string ReadClipboardText()
    {
        try
        {
            return Clipboard.ContainsText() ? Clipboard.GetText() ?? "" : "";
        }
        catch
        {
            return "";
        }
    }

    static void SendCtrlC()
    {
        const byte vkControl = 0x11;
        const byte vkC = 0x43;
        const uint keyUp = 0x0002;
        keybd_event(vkControl, 0, 0, 0);
        keybd_event(vkC, 0, 0, 0);
        keybd_event(vkC, 0, keyUp, 0);
        keybd_event(vkControl, 0, keyUp, 0);
    }

    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll")]
    static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")]
    static extern bool IsChild(IntPtr parent, IntPtr window);
    [DllImport("user32.dll")]
    static extern bool SetWindowPos(IntPtr window, IntPtr insertAfter, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")]
    static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool attach);
    [DllImport("kernel32.dll")]
    static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")]
    static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll")]
    static extern short VkKeyScan(char ch);

    void SendHideout()
    {
        if (_sendingHideout || !GameHasFocus()) return;
        try
        {
            _sendingHideout = true;
            TryParseHotkey(_hotHideout, out var modifiers, out var trigger);
            const uint keyUp = 0x0002;
            if ((modifiers & 4) != 0) keybd_event(0x10, 0, keyUp, 0);
            if ((modifiers & 2) != 0) keybd_event(0x11, 0, keyUp, 0);
            if ((modifiers & 1) != 0) keybd_event(0x12, 0, keyUp, 0);
            if (trigger != 0) keybd_event((byte)trigger, 0, keyUp, 0);
            TapKey(0x0D);
            foreach (var ch in "/hideout")
            {
                var packed = VkKeyScan(ch);
                if (packed == -1) continue;
                var shift = (packed & 0x100) != 0;
                if (shift) keybd_event(0x10, 0, 0, 0);
                TapKey((byte)(packed & 0xFF));
                if (shift) keybd_event(0x10, 0, keyUp, 0);
            }
            TapKey(0x0D);
        }
        catch { /* Game closed or input is unavailable. */ }
        finally { _sendingHideout = false; }
    }

    static void TapKey(byte vk)
    {
        keybd_event(vk, 0, 0, 0);
        keybd_event(vk, 0, 0x0002, 0);
    }

    async void CaptureClipboardItem(string action)
    {
        if (_capturingItem) return;
        _capturingItem = true;
        try
        {
            var web = EnsureWebAsync();
            var before = ReadClipboardText();
            SendCtrlC();
            var text = before;
            for (var i = 0; i < 12; i++)
            {
                await Task.Delay(45);
                var now = ReadClipboardText();
                if (string.IsNullOrWhiteSpace(now)) continue;
                if (LooksLikePoeItem(now))
                {
                    text = now;
                    if (now != before || i >= 3) break;
                }
            }
            await web;
            PushJson(new { type = "hotkey", action, text });
            if (LooksLikePoeItem(text))
            {
                try { Clipboard.Clear(); }
                catch { /* next copy still works */ }
            }
        }
        finally
        {
            _capturingItem = false;
        }
    }

    void WatchWealthTab(bool gameFocused)
    {
        if (_wealthTabDetector is not { } detector) return;
        if (!gameFocused || !_appReady || Visible || _overlay?.Visible == true || _previewOverlay?.Visible == true)
        {
            detector.Pause();
            return;
        }
        if (Environment.TickCount64 < _nextWealthTabCheck) return;
        _nextWealthTabCheck = Environment.TickCount64 + 900;
        try
        {
            var window = GetForegroundWindow();
            if (!Poe2HasFocus() || GetForegroundWindow() != window) return;
            var bounds = GameLauncherForm.GetVisibleClientBounds(window);
            if (!detector.Check(bounds) || GetForegroundWindow() != window) return;
            var image = WealthCapture.Take(bounds);
            if (GetForegroundWindow() == window)
                PushJson(new { type = "wealth-capture", image, automatic = true });
        }
        catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or
            InvalidOperationException or ArgumentException or System.Runtime.InteropServices.ExternalException)
        {
            detector.Pause();
        }
    }

    async void CaptureWealthSnapshot()
    {
        if (!_appReady || _wealthSnapshot) return;
        if (_launcher?.GameRunning != true)
        {
            PushJson(new { type = "wealth-capture", error = "Open Path of Exile 2 with the Currency tab visible, then capture again." });
            return;
        }
        var game = _launcher.GameClientBounds;
        if (game.Width < 200 || game.Height < 200)
        {
            PushJson(new { type = "wealth-capture", error = "The PoE 2 window is minimized or too small to capture." });
            return;
        }
        var saved = Bounds;
        var restore = Visible;
        _wealthSnapshot = true;
        try
        {
            if (restore)
            {
                Opacity = 0;
                Hide();
                await Task.Delay(120);
            }
            var image = WealthCapture.Take(game);
            PushJson(new { type = "wealth-capture", image });
        }
        catch (Exception ex)
        {
            PushJson(new { type = "wealth-capture", error = ex.Message });
        }
        finally
        {
            if (restore && IsHandleCreated)
            {
                _companionAboveGame = true;
                TopMost = true;
                Bounds = saved;
                Opacity = 1;
                Show();
                Bounds = saved;
                FocusCompanionWindow();
                var now = Bounds;
                if (now.X != saved.X || now.Y != saved.Y || now.Width != saved.Width || now.Height != saved.Height)
                    Bounds = saved;
            }
            _wealthSnapshot = false;
        }
    }

    void PushHotkey(string action) => PushJson(new { type = "hotkey", action });

    void PushJson(object payload)
    {
        if (_web.CoreWebView2 is null) return;
        _web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(payload, JsonOut));
    }

    void ForwardOverlayJson(string json)
    {
        if (_web.CoreWebView2 is null || string.IsNullOrWhiteSpace(json)) return;
        _web.CoreWebView2.PostWebMessageAsJson(json);
    }

    async Task ShowPriceOverlayAsync(string html, string vars, string? notice, bool fresh = false, bool clickAway = false, double overlayScale = 1)
    {
        try
        {
            await EnsureWebAsync();
            _overlay ??= new PriceOverlayForm(ForwardOverlayJson,
                () => _launcher?.GameRunning == true ? _launcher.GameClientBounds : Rectangle.Empty);
            var page = Path.Combine(AppDataDir(), "www", "overlay.html");
            await _overlay.EnsureAsync(_env, page);
            if (!string.IsNullOrWhiteSpace(notice)) _overlay.ShowNotice(notice, vars, clickAway);
            else _overlay.ShowHtml(html, vars, fresh, clickAway, overlayScale);
        }
        catch
        {
            PushJson(new { type = "overlay-fallback" });
        }
    }

    async Task ShowTradePreviewAsync(bool enabled, string html, string vars, double scale, int generation)
    {
        if (generation != _previewGeneration) return;
        if (!enabled) { _previewOverlay?.HideOverlay(); return; }
        try
        {
            await EnsureWebAsync();
            _previewOverlay ??= new PriceOverlayForm(_ => { },
                () => _launcher?.GameRunning == true ? _launcher.GameClientBounds : Rectangle.Empty, pinnedPreview: true);
            _previewInitialization ??= _previewOverlay.EnsureAsync(_env, Path.Combine(AppDataDir(), "www", "overlay.html"));
            await _previewInitialization;
            if (generation != _previewGeneration || !_previewEnabled) return;
            _previewOverlay.ShowHtml(html, vars, clickAway: false, overlayScale: scale);
        }
        catch
        {
            _previewInitialization = null;
            if (generation == _previewGeneration)
            {
                _previewEnabled = false;
                _previewOverlay?.HideOverlay();
                PushJson(new { type = "trade-preview-error" });
            }
        }
    }

    static readonly HttpClient TradeHttp = CreateTradeHttp();
    static readonly TradeLimiter SearchLimit = TradeLimiter.Default();
    static readonly TradeLimiter FetchLimit = TradeLimiter.Default();
    static readonly TradeLimiter ExchangeLimit = TradeLimiter.Default();
    Dictionary<string, string>? ExchangeTags;
    DateTime ExchangeTagsAt;
    Dictionary<string, string>? Poe1ExchangeTags;
    DateTime Poe1ExchangeTagsAt;
    static readonly SemaphoreSlim SlotLock = new(1, 1);
    const double RateDesyncSec = 2;

    sealed class SlidingLimit
    {
        public int Max;
        public double WindowSec;
        readonly Queue<DateTime> _hits = new();

        public SlidingLimit(int max, double windowSec)
        {
            Max = Math.Max(1, max);
            WindowSec = Math.Max(0.5, windowSec);
        }

        public void Prune()
        {
            var cutoff = DateTime.UtcNow.AddSeconds(-WindowSec);
            while (_hits.Count > 0 && _hits.Peek() <= cutoff) _hits.Dequeue();
        }

        public int Used { get { Prune(); return _hits.Count; } }
        public int WaitMs()
        {
            Prune();
            if (_hits.Count < Max) return 0;
            return Math.Max(0, (int)(_hits.Peek().AddSeconds(WindowSec) - DateTime.UtcNow).TotalMilliseconds);
        }

        public void Borrow()
        {
            Prune();
            _hits.Enqueue(DateTime.UtcNow);
        }

        public void SyncUsed(int serverUsed)
        {
            Prune();
            while (_hits.Count < serverUsed) _hits.Enqueue(DateTime.UtcNow);
        }

        public bool Same(int max, double windowSec) => Max == max && Math.Abs(WindowSec - windowSec) < 0.05;
    }

    sealed class TradeLimiter
    {
        public readonly List<SlidingLimit> Limits = new();
        public DateTime PenaltyUntil = DateTime.MinValue;
        public bool Limited => PenaltyUntil > DateTime.UtcNow;

        public static TradeLimiter Default() => new();

        public int WaitMs()
        {
            var penalty = PenaltyUntil > DateTime.UtcNow ? (int)(PenaltyUntil - DateTime.UtcNow).TotalMilliseconds : 0;
            var slot = 0;
            foreach (var limit in Limits) slot = Math.Max(slot, limit.WaitMs());
            return Math.Max(penalty, slot);
        }

        public void Borrow()
        {
            // No local buckets until PoE response headers teach us the real rules.
            if (Limits.Count == 0) return;
            foreach (var limit in Limits) limit.Borrow();
        }

        public (int hits, int max, int window) Snapshot()
        {
            SlidingLimit? tight = null;
            SlidingLimit? minute = null;
            foreach (var limit in Limits)
            {
                limit.Prune();
                if (tight is null || limit.WindowSec < tight.WindowSec) tight = limit;
                // Prefer the ~60s bucket for the chip (GGG search often exposes 15:60).
                if (limit.WindowSec >= 50 && limit.WindowSec <= 70)
                {
                    if (minute is null || limit.Max < minute.Max) minute = limit;
                }
            }
            var pick = minute ?? tight;
            if (pick is null) return (0, 1, 5);
            return (pick.Used, pick.Max, Math.Max(1, (int)Math.Round(pick.WindowSec)));
        }
    }

    static HttpClient CreateHttp()
    {
        var handler = new SocketsHttpHandler
        {
            AutomaticDecompression = DecompressionMethods.All,
            PooledConnectionLifetime = TimeSpan.FromMinutes(10),
        };
        var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(30) };
        client.DefaultRequestHeaders.TryAddWithoutValidation(
            "User-Agent",
            "StillSaneExile/1.2 (local desktop)");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json, text/html;q=0.9, */*;q=0.8");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Referer", "https://poe.ninja/poe2/economy/");
        return client;
    }

    static HttpClient CreateTradeHttp()
    {
        var handler = new SocketsHttpHandler
        {
            AutomaticDecompression = DecompressionMethods.All,
            PooledConnectionLifetime = TimeSpan.FromMinutes(10),
            UseCookies = true,
            CookieContainer = new CookieContainer(),
        };
        var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(25) };
        client.DefaultRequestHeaders.TryAddWithoutValidation(
            "User-Agent",
            "OAuth StillSaneExile/1.2 (contact: local-desktop-tracker)");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Origin", "https://www.pathofexile.com");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Referer", "https://www.pathofexile.com/trade2");
        return client;
    }

    static readonly HttpClient Poe1Http = CreatePoe1Http();

    static HttpClient CreatePoe1Http()
    {
        var handler = new SocketsHttpHandler
        {
            AutomaticDecompression = DecompressionMethods.All,
            PooledConnectionLifetime = TimeSpan.FromMinutes(10),
            UseCookies = false,
        };
        var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(25) };
        client.DefaultRequestHeaders.TryAddWithoutValidation(
            "User-Agent",
            "StillSaneExile/1.2 (contact: local-desktop-tracker)");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json");
        return client;
    }

    static bool ValidLeague(string league) =>
        !string.IsNullOrWhiteSpace(league) &&
        league.Length is >= 2 and <= 64 &&
        Regex.IsMatch(league, @"^[A-Za-z0-9][A-Za-z0-9 .'-]*$");

    async Task FetchScoutItems(string id, string league)
    {
        if (!ValidLeague(league))
        {
            Reply(id, false, 400, "{\"error\":\"bad league\"}");
            return;
        }
        var path = "/poe2/Leagues/" + Uri.EscapeDataString(league) + "/Items";
        var cacheKey = "scout:" + path;
        if (Cache.TryGetValue(cacheKey, out var hit) && DateTime.UtcNow - hit.at < CacheFor)
        {
            Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
            return;
        }
        await Gate.WaitAsync();
        try
        {
            if (Cache.TryGetValue(cacheKey, out hit) && DateTime.UtcNow - hit.at < CacheFor)
            {
                Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
                return;
            }
            if (!Uri.TryCreate("https://api.poe2scout.com" + path, UriKind.Absolute, out var uri))
            {
                Reply(id, false, 400, "{\"error\":\"bad path\"}");
                return;
            }
            using var res = await TradeHttp.GetAsync(uri);
            var body = await res.Content.ReadAsStringAsync();
            var status = (int)res.StatusCode;
            var looksJson = body.TrimStart().StartsWith('[');
            if (res.IsSuccessStatusCode && looksJson)
                Cache[cacheKey] = (DateTime.UtcNow, status, body);
            Reply(id, res.IsSuccessStatusCode && looksJson, status, looksJson ? body : "{\"error\":\"scout returned a non-JSON page\"}");
        }
        finally
        {
            Gate.Release();
        }
    }

    sealed record RollFilter(string Id, double? Min, double? Max = null);

    static readonly Dictionary<string, string> EquipTradeIds = new(StringComparer.OrdinalIgnoreCase)
    {
        ["item.armour"] = "ar",
        ["item.evasion_rating"] = "ev",
        ["item.energy_shield"] = "es",
        ["item.runic_ward"] = "ward",
        ["item.block"] = "block",
        ["item.total_dps"] = "dps",
        ["item.physical_dps"] = "pdps",
        ["item.elemental_dps"] = "edps",
        ["item.crit"] = "crit",
        ["item.aps"] = "aps",
        ["item.spirit"] = "spirit",
    };

    static bool JsonInt(JsonElement el, out int n)
    {
        n = 0;
        return el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out n);
    }

    static bool JsonDouble(JsonElement el, out double n)
    {
        n = 0;
        if (el.ValueKind != JsonValueKind.Number) return false;
        if (el.TryGetDouble(out n)) return true;
        if (el.TryGetInt64(out var i))
        {
            n = i;
            return true;
        }
        return false;
    }

    static string JsonString(JsonElement el, string fallback = "") =>
        el.ValueKind == JsonValueKind.String ? el.GetString() ?? fallback : fallback;
    static Dictionary<string, List<(string id, string type)>>? FoldedStats;
    static readonly SemaphoreSlim StatBuild = new(1, 1);

    async Task FetchTradeStats(string id, string game = "")
    {
        var body = await GetTradeStatsBody(string.Equals(game, "poe1", StringComparison.Ordinal));
        Reply(id, body is not null, body is null ? 0 : 200, body ?? "{\"error\":\"trade stats failed\"}");
    }

    async Task<string?> GetTradeStatsBody(bool poe1 = false)
    {
        var cacheKey = poe1 ? "trade-stats-poe1-v1" : "trade-stats-v1";
        if (Cache.TryGetValue(cacheKey, out var hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12) && hit.status is >= 200 and < 300)
            return hit.body;
        var disk = Path.Combine(AppDataDir(), poe1 ? "trade-stats-poe1.json" : "trade-stats.json");
        try
        {
            if (File.Exists(disk) && DateTime.UtcNow - File.GetLastWriteTimeUtc(disk) < TimeSpan.FromHours(12))
            {
                var stored = await File.ReadAllTextAsync(disk);
                if (stored.TrimStart().StartsWith('{'))
                {
                    Cache[cacheKey] = (DateTime.UtcNow, 200, stored);
                    return stored;
                }
            }
        }
        catch
        {
            /* fetch below */
        }
        await Gate.WaitAsync();
        try
        {
            if (Cache.TryGetValue(cacheKey, out hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12) && hit.status is >= 200 and < 300)
                return hit.body;
            if (!await WaitForSlot(SearchLimit)) return null;
            using var res = await TradeHttp.GetAsync(poe1 ? "https://www.pathofexile.com/api/trade/data/stats" : "https://www.pathofexile.com/api/trade2/data/stats");
            NoteRate(res, SearchLimit);
            var body = await res.Content.ReadAsStringAsync();
            var status = (int)res.StatusCode;
            var looksJson = body.TrimStart().StartsWith('{');
            if (res.IsSuccessStatusCode && looksJson)
            {
                Cache[cacheKey] = (DateTime.UtcNow, status, body);
                try { await File.WriteAllTextAsync(disk, body); } catch { /* keep memory cache */ }
                return body;
            }
            return null;
        }
        finally
        {
            Gate.Release();
        }
    }

    async Task FetchTradePrice(string id, string league, string name, bool bust = false, bool thorough = false, string typeLine = "", IReadOnlyList<string>? rolls = null, IReadOnlyList<RollFilter>? preMapped = null, bool? corrupted = null, string rarity = "", int? runeSockets = null, string category = "", bool ravenTouched = false, bool exchange = false, string havePref = "", bool? unidentified = null, int? unidentifiedTier = null, bool exactBase = true, int? ilvlMin = null, int? qualityMin = null, string rarityFilter = "", string game = "", int? links = null)
    {
        name = (name ?? "").Trim();
        league = (league ?? "").Trim();
        typeLine = (typeLine ?? "").Trim();
        rarity = (rarity ?? "").Trim();
        category = (category ?? "").Trim();
        havePref = FoldExchangeHave(havePref);
        if (!ValidLeague(league) || (name.Length is < 2 or > 80 && typeLine.Length is < 2 or > 80 && category.Length is < 2 or > 40))
        {
            Reply(id, false, 400, "{\"error\":\"bad trade query\"}");
            return;
        }
        if (name.Length is < 2 or > 80) name = typeLine.Length > 0 ? typeLine : name;
        var poe1 = string.Equals(game, "poe1", StringComparison.Ordinal);
        var rollList = (rolls ?? Array.Empty<string>()).Where(r => !string.IsNullOrWhiteSpace(r)).Take(12).ToArray();
        IReadOnlyList<RollFilter> mapped = preMapped is { Count: > 0 } ? preMapped : Array.Empty<RollFilter>();
        if (!poe1 && mapped.Count == 0 && rollList.Length > 0)
            mapped = await MapRollsToFilters(rollList, category);
        var useExchange = (exchange || WantsExchange(rarity, category)) && mapped.Count == 0 && rollList.Length == 0;
                var extra = mapped.Count > 0
            ? ":roll:" + string.Join("|", mapped.Select(f =>
            {
                var id = f.Id;
                if (f.Min is double lo) id += ">" + lo.ToString("G", System.Globalization.CultureInfo.InvariantCulture);
                if (f.Max is double hi) id += "<" + hi.ToString("G", System.Globalization.CultureInfo.InvariantCulture);
                return id;
            }))
            : rollList.Length > 0 ? ":roll:none" : "";
        extra += corrupted is true ? ":c1" : corrupted is false ? ":c0" : "";
        extra += unidentified is true ? ":u1" : unidentified is false ? ":u0" : "";
        extra += unidentifiedTier is int ut && ut > 0 ? ":ut" + ut : "";
        extra += ravenTouched ? ":rt" : "";
        extra += runeSockets is int rs ? ":r" + rs : "";
        extra += links is int ln ? ":l" + ln : "";
        extra += ":st:" + (useExchange ? TradeExchangeLive : TradeLive);
        extra += ":" + rarity.ToLowerInvariant();
        extra += ":rf:" + rarityFilter.ToLowerInvariant();
        extra += typeLine.Length > 0 ? ":t:" + typeLine.ToLowerInvariant() : "";
        extra += exactBase ? "" : ":xb0";
        extra += ilvlMin is int il && il > 0 ? ":il" + il : "";
        extra += qualityMin is int ql && ql > 0 ? ":ql" + ql : "";
        extra += category.Length > 0 ? ":k:" + category.ToLowerInvariant() : "";
        extra += useExchange ? ":xchg:" + havePref : "";
        var cacheKey = (poe1 ? "trade1:" : "trade:") + league + ":" + name.ToLowerInvariant() + extra;
        if (!bust && Cache.TryGetValue(cacheKey, out var hit) && DateTime.UtcNow - hit.at < CacheFor)
        {
            Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
            return;
        }
        await Gate.WaitAsync();
        try
        {
            if (!bust && Cache.TryGetValue(cacheKey, out hit) && DateTime.UtcNow - hit.at < CacheFor)
            {
                Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
                return;
            }
            TradeLookup? payload = null;
            if (poe1)
                payload = await LookupPoe1Price(league, name, typeLine, rarity, corrupted, ilvlMin, qualityMin, rarityFilter, useExchange, havePref, runeSockets, links, unidentified, exactBase, category, mapped);
            else
            {
                if (useExchange)
                    payload = await LookupExchangeListing(league, name, typeLine, havePref);
                if (payload is null || (payload.Json is null && !payload.RateLimited && !payload.Forbidden))
                    payload = await LookupRolledListing(league, name, typeLine, mapped, corrupted, rarity, runeSockets, category, ravenTouched, unidentified, unidentifiedTier, exactBase, ilvlMin, qualityMin, rarityFilter);
            }
            if (payload is { RateLimited: true })
            {
                Reply(id, false, 429, "{\"error\":\"rate limited\"}");
                return;
            }
            if (payload is { Forbidden: true })
            {
                Reply(id, false, 403, "{\"error\":\"trade blocked\"}");
                return;
            }
            var body = payload?.Json;
            var status = body is null ? 404 : 200;
            if (body is not null)
                Cache[cacheKey] = (DateTime.UtcNow, status, body);
            else
                Cache.TryRemove(cacheKey, out _);
            Reply(id, body is not null, status, body ?? "{\"error\":\"no listings\"}");
        }
        finally
        {
            Gate.Release();
        }
    }

    sealed record TradeLookup(string? Json = null, bool RateLimited = false, bool Forbidden = false);

    static List<RollFilter> ReadPreMappedFilters(JsonElement root)
    {
        var list = new List<RollFilter>();
        void AddArray(JsonElement arr)
        {
            if (arr.ValueKind != JsonValueKind.Array) return;
            foreach (var row in arr.EnumerateArray())
            {
                if (row.ValueKind != JsonValueKind.Object) continue;
                var fid = row.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                var equip = fid.StartsWith("item.", StringComparison.OrdinalIgnoreCase);
                if (equip)
                {
                    if (fid.Length is < 8 or > 40 || !EquipTradeIds.ContainsKey(fid)) continue;
                    if (list.Count(x => x.Id.StartsWith("item.", StringComparison.OrdinalIgnoreCase)) >= 8) continue;
                }
                else
                {
                    if (fid.Length is < 8 or > 80) continue;
                    if (list.Count(x => !x.Id.StartsWith("item.", StringComparison.OrdinalIgnoreCase)) >= 12) continue;
                }
                double? min = null;
                double? max = null;
                if (row.TryGetProperty("min", out var minEl) && JsonDouble(minEl, out var n) && double.IsFinite(n))
                    min = n;
                if (row.TryGetProperty("max", out var maxEl) && JsonDouble(maxEl, out var x) && double.IsFinite(x))
                    max = x;
                list.Add(new RollFilter(fid, min, max));
            }
        }
        if (root.TryGetProperty("filtersJson", out var jsonEl) && jsonEl.ValueKind == JsonValueKind.String)
        {
            try
            {
                using var parsed = JsonDocument.Parse(jsonEl.GetString() ?? "[]");
                AddArray(parsed.RootElement);
            }
            catch (JsonException)
            {
                /* fall back to filters array */
            }
        }
        if (list.Count == 0 && root.TryGetProperty("filters", out var filtersEl))
            AddArray(filtersEl);
        return list;
    }

    static string TradeSearchUrl(string league, string queryId) =>
        "https://www.pathofexile.com/trade2/search/poe2/" + Uri.EscapeDataString(league) + (string.IsNullOrWhiteSpace(queryId) ? "" : "/" + Uri.EscapeDataString(queryId));

    static string TradeExchangeUrl(string league, string want, IReadOnlyList<string> have)
    {
        var q = JsonSerializer.Serialize(new
        {
            exchange = new
            {
                status = new { option = TradeExchangeLive },
                have,
                want = new[] { want },
            },
        }, JsonOut);
        return "https://www.pathofexile.com/trade2/exchange/poe2/" + Uri.EscapeDataString(league) + "?q=" + Uri.EscapeDataString(q);
    }

    static bool WantsExchange(string rarity, string category) =>
        Regex.IsMatch(rarity ?? "", @"currency|omen", RegexOptions.IgnoreCase) ||
        Regex.IsMatch(category ?? "", @"currency|omen", RegexOptions.IgnoreCase);

    static string FoldExchangeHave(string have)
    {
        var tag = (have ?? "").Trim().ToLowerInvariant();
        if (tag.StartsWith("exalt")) return "exalted";
        if (tag.StartsWith("chaos")) return "chaos";
        if (tag.StartsWith("divine")) return "divine";
        return "";
    }

    static string FoldExchangeName(string name)
    {
        var s = (name ?? "").Trim().ToLowerInvariant().Replace('\u2019', '\'').Replace('`', '\'');
        s = Regex.Replace(s, @"[']", "");
        return Regex.Replace(s, @"\s+", " ").Trim();
    }

    static IEnumerable<string> ExchangeNameKeys(string name, string typeLine)
    {
        foreach (var raw in new[] { name, typeLine })
        {
            var folded = FoldExchangeName(raw);
            if (folded.Length > 0) yield return folded;
        }
    }

    async Task<IReadOnlyList<RollFilter>> MapRollsToFilters(IReadOnlyList<string> rolls, string category = "")
    {
        var index = await GetFoldedStats();
        var filters = new List<RollFilter>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var ordered = rolls
            .Select(UnwrapTags)
            .Select(StripAdvancedRanges)
            .Where(roll => !string.IsNullOrWhiteSpace(roll) && !IsJunkTradeRoll(roll))
            .OrderByDescending(TradeRollWeight)
            .ToArray();
        if (ordered.Any(roll => TradeRollWeight(roll) >= 5))
            ordered = ordered.Where(roll => TradeRollWeight(roll) >= 5).ToArray();
        foreach (var roll in ordered)
        {
            var invert = InvertedTradeRoll(roll);
            var fold = FoldStat(roll);
            var hit = MatchFoldedStat(fold, index, RollWantsLocal(fold, category));
            if (hit is null || !seen.Add(hit.Value.id)) continue;
            var amount = FirstRollNumber(roll, invert);
            filters.Add(new RollFilter(hit.Value.id, invert ? null : amount, invert ? amount : null));
            if (filters.Count >= 6) break;
        }
        return filters;
    }

    static bool RollWantsLocal(string fold, string category)
    {
        var f = fold ?? "";
        var cat = category ?? "";
        if (Regex.IsMatch(f, @"recharge|from equipped|recovery|break|global|spell")) return false;
        if (Regex.IsMatch(f, @"energy shield"))
            return Regex.IsMatch(cat, @"^armour\.(chest|helmet|gloves|boots|shield|focus|buckler)$");
        if (Regex.IsMatch(f, @"\barmour\b") || Regex.IsMatch(f, @"evasion"))
            return Regex.IsMatch(cat, @"^armour\.(chest|helmet|gloves|boots|shield|buckler)$");
        if (Regex.IsMatch(f, @"block chance"))
            return cat is "armour.shield" or "armour.buckler";
        if (Regex.IsMatch(f, @"attack speed|culling strike|physical damage|critical"))
            return cat.StartsWith("weapon.", StringComparison.OrdinalIgnoreCase);
        if (Regex.IsMatch(f, @"accuracy"))
            return cat.StartsWith("weapon.", StringComparison.OrdinalIgnoreCase) || cat == "armour.quiver";
        return false;
    }

    static bool InvertedTradeRoll(string roll) =>
        Regex.IsMatch(roll ?? "", @"\b(reduced|fewer|less)\b", RegexOptions.IgnoreCase) &&
        !Regex.IsMatch(roll ?? "", @"\blesser\b", RegexOptions.IgnoreCase);

    static bool IsJunkTradeRoll(string roll)
    {
        return Regex.IsMatch(roll, @"^\{", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^place into an item socket", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^used when you", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^right click", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^this item can be anointed", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^raven-touched$", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^\d+\s+uses? remaining", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^adds .+\s+to a map\s*$", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^empowers the map boss", RegexOptions.IgnoreCase);
    }

    static int TradeRollWeight(string roll)
    {
        if (Regex.IsMatch(roll, @"bonuses gained from (?:equipped )?(?:left|right) (?:equipped )?ring", RegexOptions.IgnoreCase)) return 5;
        if (Regex.IsMatch(roll, @"per socket filled|per socketed", RegexOptions.IgnoreCase)) return 4;
        if (Regex.IsMatch(roll, @"increased effect of socketed", RegexOptions.IgnoreCase)) return 4;
        if (Regex.IsMatch(roll, @"charm charges", RegexOptions.IgnoreCase)) return 1;
        return 3;
    }

    static string UnwrapTags(string text) =>
        Regex.Replace(text ?? "", @"\[([^\]|]+)\|?([^\]]*)\]", m =>
            string.IsNullOrEmpty(m.Groups[2].Value) ? m.Groups[1].Value : m.Groups[2].Value);

    static string StripAdvancedRanges(string text)
    {
        var t = Regex.Replace(text ?? "", @"(-?\d+(?:\.\d+)?)\((?:[^)]*)\)", "$1");
        t = Regex.Replace(t, @"\(([-+]?\d[\d.\s,|/~—–-]*[-+]?\d)\)", "");
        return Regex.Replace(t, @"\s+", " ").Trim();
    }

    async Task<Dictionary<string, List<(string id, string type)>>> GetFoldedStats()
    {
        if (FoldedStats is not null) return FoldedStats;
        await StatBuild.WaitAsync();
        try
        {
            if (FoldedStats is not null) return FoldedStats;
            var json = await GetTradeStatsBody();
            var map = new Dictionary<string, List<(string id, string type)>>(StringComparer.Ordinal);
            if (json is null) return map;
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("result", out var groups) || groups.ValueKind != JsonValueKind.Array)
                return map;
            foreach (var group in groups.EnumerateArray())
            {
                var kind = group.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                if (kind is "pseudo" or "skill") continue;
                if (!group.TryGetProperty("entries", out var entries) || entries.ValueKind != JsonValueKind.Array) continue;
                foreach (var entry in entries.EnumerateArray())
                {
                    var id = entry.TryGetProperty("id", out var statId) ? statId.GetString() ?? "" : "";
                    var text = entry.TryGetProperty("text", out var textEl) ? textEl.GetString() ?? "" : "";
                    var type = entry.TryGetProperty("type", out var typeEl) ? typeEl.GetString() ?? kind : kind;
                    var key = FoldStat(text);
                    if (id.Length == 0 || key.Length == 0) continue;
                    if (!map.TryGetValue(key, out var list))
                    {
                        list = new List<(string id, string type)>();
                        map[key] = list;
                    }
                    list.Add((id, type));
                }
            }
            return FoldedStats = map;
        }
        finally
        {
            StatBuild.Release();
        }
    }

    static (string id, string type)? MatchFoldedStat(string fold, Dictionary<string, List<(string id, string type)>> index, bool preferLocal = false)
    {
        if (string.IsNullOrWhiteSpace(fold)) return null;
        if (preferLocal)
        {
            var localFold = Regex.Replace(fold, @"\s*\(local\)\s*$", "").TrimEnd() + " (local)";
            if (index.TryGetValue(localFold, out var localList))
                return PickStat(localList);
        }
        if (index.TryGetValue(fold, out var exact))
            return PickStat(exact);
        (string id, string type)? best = null;
        var bestLen = 0;
        var bestLocal = false;
        foreach (var (key, list) in index)
        {
            if (key.Length < 10) continue;
            var local = key.EndsWith(" (local)", StringComparison.Ordinal);
            if (fold == key || fold.StartsWith(key + " ", StringComparison.Ordinal) || key.StartsWith(fold + " ", StringComparison.Ordinal))
            {
                var pick = PickStat(list);
                if (pick is null) continue;
                if (key.Length > bestLen || (key.Length == bestLen && preferLocal && local && !bestLocal))
                {
                    best = pick;
                    bestLen = key.Length;
                    bestLocal = local;
                }
            }
        }
        if (best is not null) return best;
        var needle = DistinctiveStatPhrase(fold);
        if (needle.Length < 12) return null;
        foreach (var (key, list) in index)
        {
            if (key.Length < 10 || !key.Contains(needle, StringComparison.Ordinal)) continue;
            var local = key.EndsWith(" (local)", StringComparison.Ordinal);
            var pick = PickStat(list);
            if (pick is null) continue;
            if (key.Length > bestLen || (key.Length == bestLen && preferLocal && local && !bestLocal))
            {
                best = pick;
                bestLen = key.Length;
                bestLocal = local;
            }
        }
        return best;
    }

    static (string id, string type)? PickStat(List<(string id, string type)> list, string? prefer = null)
    {
        if (list.Count == 0) return null;
        string[] order = prefer?.Equals("rune", StringComparison.OrdinalIgnoreCase) == true
            ? ["rune", "enchant", "implicit", "explicit"]
            : prefer?.Equals("implicit", StringComparison.OrdinalIgnoreCase) == true
            || prefer?.Equals("corrupt", StringComparison.OrdinalIgnoreCase) == true
            ? ["implicit", "enchant", "rune", "explicit"]
            : prefer?.Equals("enchant", StringComparison.OrdinalIgnoreCase) == true
                ? ["enchant", "implicit", "rune", "explicit"]
                : ["explicit", "implicit", "enchant", "rune"];
        foreach (var want in order)
        {
            foreach (var row in list)
            {
                if (row.type.Equals(want, StringComparison.OrdinalIgnoreCase) ||
                    row.id.StartsWith(want + ".", StringComparison.OrdinalIgnoreCase))
                    return row;
            }
        }
        return list[0];
    }

    static string DistinctiveStatPhrase(string fold)
    {
        var ring = Regex.Match(fold ?? "", @"bonuses gained from (?:equipped )?(left|right) (?:equipped )?ring");
        if (ring.Success) return "bonuses gained from equipped " + ring.Groups[1].Value + " ring";
        if (Regex.IsMatch(fold ?? "", @"additional enemies to be surrounded")) return "additional enemies to be surrounded";
        if (Regex.IsMatch(fold ?? "", @"magic utility flasks you use apply")) return "magic utility flasks you use apply";
        if (Regex.IsMatch(fold ?? "", @"utility flasks cannot be used")) return "magic utility flasks cannot be used";
        return "";
    }

    static string FoldStat(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";
        var t = StripAdvancedRanges(UnwrapTags(text)).ToLowerInvariant();
        t = Regex.Replace(t, @"[\r\n]+", " ");
        t = Regex.Replace(t, @"\((?:augmented|unmet|implicit|enchant|rune)\)", " ");
        t = Regex.Replace(t, @"\((?!local\b)[^)]*\)", " ");
        t = Regex.Replace(t, @"\{[^}]+\}", " ");
        t = Regex.Replace(t, @"\breduced\b", "increased");
        t = Regex.Replace(t, @"\bfewer\b", "additional");
        t = Regex.Replace(t, @"\bless\b", "more");
        t = Regex.Replace(t, @"\brequires\b", "require");
        t = Regex.Replace(t, @"\bin area\b", "in map");
        t = Regex.Replace(t, @"\bleft equipped ring\b", "equipped left ring");
        t = Regex.Replace(t, @"\bright equipped ring\b", "equipped right ring");
        t = Regex.Replace(t, @"\bslots\b", "slot");
        t = Regex.Replace(t, @"[+-]?\d+(?:\.\d+)?", "#");
        t = t.Replace("#to ", "# to ", StringComparison.Ordinal);
        t = Regex.Replace(t, @"#%", "# %");
        t = Regex.Replace(t, @"%\s*", "% ");
        t = Regex.Replace(t, @"\s+", " ").Trim();
        if (t.StartsWith('+')) t = t[1..].TrimStart();
        return t;
    }

    static double? FirstRollNumber(string text, bool reduced = false)
    {
        var raw = StripAdvancedRanges(UnwrapTags(text ?? ""));
        var fused = Regex.Match(raw, @"([+-]?\d+(?:\.\d+)?)\s*%");
        if (!fused.Success) fused = Regex.Match(raw, @"([+-]?\d+(?:\.\d+)?)");
        if (!fused.Success || !double.TryParse(fused.Groups[1].Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var n))
            return null;
        if (reduced && n > 0) n = -n;
        return n;
    }

    static IEnumerable<string> RolledQueries(string name, string typeLine, IReadOnlyList<RollFilter> filters, bool relax = false, bool? corrupted = null, string rarity = "", int? runeSockets = null, string category = "", bool ravenTouched = false, bool? unidentified = null, int? unidentifiedTier = null, bool exactBase = true, int? ilvlMin = null, int? qualityMin = null, string rarityFilter = "")
    {
        JsonArray FilterArray()
        {
            var arr = new JsonArray();
            foreach (var filter in filters)
            {
                if (EquipTradeIds.ContainsKey(filter.Id)) continue;
                var obj = new JsonObject { ["id"] = filter.Id, ["disabled"] = false };
                JsonObject? value = null;
                if (filter.Min is double min)
                {
                    if (relax && min > 0) min = Math.Floor(min * 0.9);
                    value = new JsonObject { ["min"] = min };
                }
                if (filter.Max is double max)
                {
                    if (relax && max < 0) max = Math.Ceiling(max * 0.9);
                    value ??= new JsonObject();
                    value["max"] = max;
                }
                if (value is not null) obj["value"] = value;
                arr.Add(obj);
            }
            return arr;
        }

        JsonObject MiscFilters()
        {
            var inner = new JsonObject();
            if (corrupted is bool flag)
                inner["corrupted"] = new JsonObject { ["option"] = flag ? "true" : "false" };
            if (unidentified is bool unidFlag)
                inner["identified"] = new JsonObject { ["option"] = unidFlag ? "false" : "true" };
            if (unidentifiedTier is int ut && ut > 0)
                inner["unidentified_tier"] = new JsonObject { ["min"] = ut };
            var bag = new JsonObject();
            if (inner.Count > 0)
            {
                bag["misc_filters"] = new JsonObject
                {
                    ["filters"] = inner,
                };
            }
            var equipInner = new JsonObject();
            if (runeSockets is int n && n is >= 0 and <= 6)
                equipInner["rune_sockets"] = new JsonObject { ["min"] = n, ["max"] = n };
            foreach (var filter in filters)
            {
                if (!EquipTradeIds.TryGetValue(filter.Id, out var key)) continue;
                var range = new JsonObject();
                if (filter.Min is double min)
                {
                    if (relax && min > 0)
                        min = key is "aps" or "crit" ? Math.Round(min * 0.9, 2) : Math.Floor(min * 0.9);
                    range["min"] = min;
                }
                if (filter.Max is double max)
                {
                    if (relax && max < 0) max = Math.Ceiling(max * 0.9);
                    range["max"] = max;
                }
                if (range.Count > 0) equipInner[key] = range;
            }
            if (equipInner.Count > 0)
                bag["equipment_filters"] = new JsonObject { ["filters"] = equipInner };
            return bag;
        }

        JsonObject TypeFilters(bool includeCategory)
        {
            var bag = new JsonObject();
            var unique = rarity.Equals("Unique", StringComparison.OrdinalIgnoreCase);
            if (includeCategory && !string.IsNullOrWhiteSpace(category))
                bag["category"] = new JsonObject { ["option"] = category };
            if (unique)
                bag["rarity"] = new JsonObject { ["option"] = "unique" };
            else if (rarity.Equals("Rare", StringComparison.OrdinalIgnoreCase) ||
                     rarity.Equals("Magic", StringComparison.OrdinalIgnoreCase) ||
                     rarity.Equals("Normal", StringComparison.OrdinalIgnoreCase))
                bag["rarity"] = new JsonObject { ["option"] = rarityFilter is "normal" or "magic" or "rare" ? rarityFilter : "nonunique" };
            if (ilvlMin is int il && il > 0)
                bag["ilvl"] = new JsonObject { ["min"] = il };
            if (qualityMin is int ql && ql > 0)
                bag["quality"] = new JsonObject { ["min"] = ql };
            return bag;
        }

        JsonObject Body(bool includeType, bool includeCategory)
        {
            var unique = rarity.Equals("Unique", StringComparison.OrdinalIgnoreCase);
            var filtersBag = MiscFilters();
            var typeBag = TypeFilters(includeCategory);
            if (typeBag.Count > 0)
                filtersBag["type_filters"] = new JsonObject { ["filters"] = typeBag };
            var stats = new JsonArray
            {
                new JsonObject
                {
                    ["type"] = "and",
                    ["filters"] = FilterArray(),
                },
            };
            if (ravenTouched)
            {
                stats.Add(new JsonObject
                {
                    ["type"] = "count",
                    ["value"] = new JsonObject { ["min"] = 1 },
                    ["filters"] = new JsonArray
                    {
                        new JsonObject { ["id"] = "explicit.stat_3198163869", ["disabled"] = false },
                        new JsonObject { ["id"] = "rune.stat_3198163869", ["disabled"] = false },
                    },
                });
            }
            var query = new JsonObject
            {
                ["status"] = new JsonObject { ["option"] = TradeLive },
                ["stats"] = stats,
                ["filters"] = filtersBag,
            };
            if (unique && !string.IsNullOrWhiteSpace(name) &&
                !Regex.IsMatch(name.Trim(), @"^Unidentified(?:\s*\(Tier\s*\d+\))?$", RegexOptions.IgnoreCase) &&
                !(unidentified is true && name.Equals(typeLine, StringComparison.OrdinalIgnoreCase)))
                query["name"] = name;
            if (includeType && !string.IsNullOrWhiteSpace(typeLine))
                query["type"] = typeLine;
            return new JsonObject
            {
                ["query"] = query,
                ["sort"] = new JsonObject { ["price"] = "asc" },
            };
        }

        var hasCat = !string.IsNullOrWhiteSpace(category);
        var hasType = !string.IsNullOrWhiteSpace(typeLine) && (exactBase || !hasCat);
        if (hasType)
            yield return Body(true, hasCat).ToJsonString();
        if (hasCat && !(hasType && exactBase))
            yield return Body(false, true).ToJsonString();
        if (!hasType && !hasCat)
            yield return Body(false, false).ToJsonString();
    }

    async Task<TradeLookup> LookupPoe1Price(string league, string name, string typeLine, string rarity, bool? corrupted, int? ilvlMin, int? qualityMin, string rarityFilter, bool exchange, string havePref, int? sockets = null, int? links = null, bool? unidentified = null, bool exactBase = true, string category = "", IReadOnlyList<RollFilter>? mods = null)
    {
        if (exchange)
        {
            var bulk = await LookupPoe1Exchange(league, name, typeLine, havePref);
            if (bulk.Json is not null || bulk.RateLimited || bulk.Forbidden) return bulk;
        }
        var statRows = new JsonArray();
        var mappedCount = 0;
        foreach (var filter in mods ?? Array.Empty<RollFilter>())
        {
            if (string.IsNullOrWhiteSpace(filter.Id) || filter.Id.StartsWith("item.", StringComparison.OrdinalIgnoreCase)) continue;
            var obj = new JsonObject { ["id"] = filter.Id, ["disabled"] = false };
            JsonObject? value = null;
            if (filter.Min is double min) value = new JsonObject { ["min"] = min };
            if (filter.Max is double max)
            {
                value ??= new JsonObject();
                value["max"] = max;
            }
            if (value is not null) obj["value"] = value;
            statRows.Add(obj);
            mappedCount++;
        }
        var query = new JsonObject
        {
            ["status"] = new JsonObject { ["option"] = TradeLive },
            ["stats"] = new JsonArray { new JsonObject { ["type"] = "and", ["filters"] = statRows } },
        };
        var unique = rarity.Equals("Unique", StringComparison.OrdinalIgnoreCase);
        if (unique && !string.IsNullOrWhiteSpace(name) && !name.Equals(typeLine, StringComparison.OrdinalIgnoreCase))
            query["name"] = name;
        if (exactBase && !string.IsNullOrWhiteSpace(typeLine)) query["type"] = typeLine;
        var filters = new JsonObject();
        var typeBag = new JsonObject();
        if (!string.IsNullOrWhiteSpace(category))
            typeBag["category"] = new JsonObject { ["option"] = category };
        if (unique) typeBag["rarity"] = new JsonObject { ["option"] = "unique" };
        else if (rarity.Equals("Rare", StringComparison.OrdinalIgnoreCase) ||
                 rarity.Equals("Magic", StringComparison.OrdinalIgnoreCase) ||
                 rarity.Equals("Normal", StringComparison.OrdinalIgnoreCase))
            typeBag["rarity"] = new JsonObject { ["option"] = rarityFilter is "normal" or "magic" or "rare" ? rarityFilter : "nonunique" };
        if (ilvlMin is int il && il > 0) typeBag["ilvl"] = new JsonObject { ["min"] = il };
        if (qualityMin is int ql && ql > 0) typeBag["quality"] = new JsonObject { ["min"] = ql };
        if (typeBag.Count > 0) filters["type_filters"] = new JsonObject { ["filters"] = typeBag };
        var misc = new JsonObject();
        if (corrupted is bool corrupt)
            misc["corrupted"] = new JsonObject { ["option"] = corrupt ? "true" : "false" };
        if (unidentified is bool unidFlag)
            misc["identified"] = new JsonObject { ["option"] = unidFlag ? "false" : "true" };
        if (misc.Count > 0)
            filters["misc_filters"] = new JsonObject { ["filters"] = misc };
        var socketBag = new JsonObject();
        if (sockets is int socketN && socketN is >= 0 and <= 6)
            socketBag["sockets"] = new JsonObject { ["min"] = socketN, ["max"] = socketN };
        if (links is int linkN && linkN is >= 2 and <= 6)
            socketBag["links"] = new JsonObject { ["min"] = linkN };
        if (socketBag.Count > 0)
            filters["socket_filters"] = new JsonObject { ["filters"] = socketBag };
        if (filters.Count > 0) query["filters"] = filters;
        var body = new JsonObject { ["query"] = query, ["sort"] = new JsonObject { ["price"] = "asc" } }.ToJsonString();
        var (json, status) = await PostTradeSearch("https://www.pathofexile.com/api/trade/search/" + Uri.EscapeDataString(league), body);
        if (status == 429) return new TradeLookup(RateLimited: true);
        if (status is 401 or 403) return new TradeLookup(Forbidden: true);
        if (json is null) return new TradeLookup();
        JsonDocument search;
        try { search = JsonDocument.Parse(json); }
        catch (JsonException) { return new TradeLookup(); }
        using (search)
        {
            var root = search.RootElement;
            var queryId = root.TryGetProperty("id", out var idEl) ? JsonString(idEl) : "";
            var total = root.TryGetProperty("total", out var totalEl) && JsonInt(totalEl, out var listed) ? listed : 0;
            if (!root.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
            {
                return new TradeLookup(JsonSerializer.Serialize(new
                {
                    name,
                    listings = total,
                    mapped = mappedCount,
                    league,
                    url = string.IsNullOrWhiteSpace(queryId) ? "" : "https://www.pathofexile.com/trade/search/" + Uri.EscapeDataString(league) + "/" + Uri.EscapeDataString(queryId),
                }, JsonOut));
            }
            var hashes = result.EnumerateArray().Select(el => JsonString(el)).Where(h => !string.IsNullOrWhiteSpace(h)).Take(TradeFetchCap).ToArray();
            var fetched = await FetchListingOffers(hashes, queryId, name, "https://www.pathofexile.com/api/trade/fetch/");
            if (fetched.Rate) return new TradeLookup(RateLimited: true);
            if (fetched.Forbidden) return new TradeLookup(Forbidden: true);
            if (fetched.Offers is null || fetched.Offers.Count == 0) return new TradeLookup();
            return new TradeLookup(ListingPayload(name, fetched.Offers, total, league, queryId, mappedCount).Replace(
                "https://www.pathofexile.com/trade2/search/poe2/",
                "https://www.pathofexile.com/trade/search/",
                StringComparison.Ordinal));
        }
    }

    async Task<TradeLookup> LookupPoe1Exchange(string league, string name, string typeLine, string havePref)
    {
        var tags = await GetPoe1ExchangeTags();
        if (tags is null) return new TradeLookup();
        string tag = "";
        foreach (var key in ExchangeNameKeys(name, typeLine))
        {
            if (tags.TryGetValue(key, out var found) && !string.IsNullOrWhiteSpace(found)) { tag = found; break; }
        }
        if (string.IsNullOrWhiteSpace(tag)) return new TradeLookup();
        var have = ExchangeHave.Where(h => !h.Equals(tag, StringComparison.OrdinalIgnoreCase)).ToArray();
        if (have.Length == 0) have = ["chaos", "divine"];
        have = !string.IsNullOrWhiteSpace(havePref) ? [havePref] : [have[0]];
        var body = JsonSerializer.Serialize(new
        {
            engine = "new",
            query = new { status = new { option = TradeExchangeLive }, have, want = new[] { tag } },
            sort = new Dictionary<string, string> { ["have"] = "asc" },
        }, JsonOut);
        var (json, status) = await PostTradeExchange("https://www.pathofexile.com/api/trade/exchange/" + Uri.EscapeDataString(league), body);
        if (status == 429) return new TradeLookup(RateLimited: true);
        if (status is 401 or 403) return new TradeLookup(Forbidden: true);
        if (json is null) return new TradeLookup();
        JsonDocument search;
        try { search = JsonDocument.Parse(json); }
        catch (JsonException) { return new TradeLookup(); }
        using (search)
        {
            var root = search.RootElement;
            var total = root.TryGetProperty("total", out var totalEl) && JsonInt(totalEl, out var listed) ? listed : 0;
            var offers = ReadExchangeOffers(root, name);
            SortExchangeOffers(offers, havePref);
            var url = "https://www.pathofexile.com/trade/exchange/" + Uri.EscapeDataString(league) + "?q=" + Uri.EscapeDataString(JsonSerializer.Serialize(new
            {
                exchange = new { status = new { option = TradeExchangeLive }, have, want = new[] { tag } },
            }, JsonOut));
            if (offers.Count == 0)
                return new TradeLookup(JsonSerializer.Serialize(new { name, listings = total, mapped = 0, league, url, tag, bulk = true }, JsonOut));
            return new TradeLookup(ExchangePayload(name, offers, total, league, tag, url));
        }
    }

    async Task<Dictionary<string, string>?> GetPoe1ExchangeTags()
    {
        if (Poe1ExchangeTags is not null && DateTime.UtcNow - Poe1ExchangeTagsAt < TimeSpan.FromHours(12))
            return Poe1ExchangeTags;
        var body = await GetPoe1StaticBody();
        if (string.IsNullOrWhiteSpace(body)) return Poe1ExchangeTags;
        try
        {
            using var doc = JsonDocument.Parse(body);
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (!doc.RootElement.TryGetProperty("result", out var groups) || groups.ValueKind != JsonValueKind.Array)
                return Poe1ExchangeTags;
            foreach (var group in groups.EnumerateArray())
            {
                if (!group.TryGetProperty("entries", out var entries) || entries.ValueKind != JsonValueKind.Array)
                    continue;
                foreach (var entry in entries.EnumerateArray())
                {
                    var tag = entry.TryGetProperty("id", out var idEl) ? JsonString(idEl) : "";
                    var text = entry.TryGetProperty("text", out var textEl) ? JsonString(textEl) : "";
                    if (string.IsNullOrWhiteSpace(tag) || tag == "sep" || string.IsNullOrWhiteSpace(text)) continue;
                    map[FoldExchangeName(text)] = tag;
                }
            }
            if (map.Count > 0)
            {
                Poe1ExchangeTags = map;
                Poe1ExchangeTagsAt = DateTime.UtcNow;
            }
            return Poe1ExchangeTags;
        }
        catch (JsonException)
        {
            return Poe1ExchangeTags;
        }
    }

    async Task<string?> GetPoe1StaticBody()
    {
        const string cacheKey = "trade-static-poe1-v1";
        if (Cache.TryGetValue(cacheKey, out var hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12) && hit.status is >= 200 and < 300)
            return hit.body;
        var disk = Path.Combine(AppDataDir(), "trade-static-poe1.json");
        try
        {
            if (File.Exists(disk) && DateTime.UtcNow - File.GetLastWriteTimeUtc(disk) < TimeSpan.FromHours(12))
            {
                var stored = await File.ReadAllTextAsync(disk);
                if (stored.TrimStart().StartsWith('{'))
                {
                    Cache[cacheKey] = (DateTime.UtcNow, 200, stored);
                    return stored;
                }
            }
        }
        catch { /* fetch below */ }
        if (!await WaitForSlot(SearchLimit)) return null;
        using var res = await TradeHttp.GetAsync("https://www.pathofexile.com/api/trade/data/static");
        NoteRate(res, SearchLimit);
        var text = await res.Content.ReadAsStringAsync();
        if (res.IsSuccessStatusCode && text.TrimStart().StartsWith('{'))
        {
            Cache[cacheKey] = (DateTime.UtcNow, (int)res.StatusCode, text);
            try { await File.WriteAllTextAsync(disk, text); } catch { /* keep memory cache */ }
            return text;
        }
        return null;
    }

    async Task<TradeLookup> LookupRolledListing(string league, string name, string typeLine, IReadOnlyList<RollFilter> filters, bool? corrupted = null, string rarity = "", int? runeSockets = null, string category = "", bool ravenTouched = false, bool? unidentified = null, int? unidentifiedTier = null, bool exactBase = true, int? ilvlMin = null, int? qualityMin = null, string rarityFilter = "")
    {
        var searchUri = "https://www.pathofexile.com/api/trade2/search/poe2/" + Uri.EscapeDataString(league);
        string? lastId = null;
        var lastTotal = 0;

        async Task<TradeLookup?> Run(string body)
        {
            var (searchJson, searchStatus) = await PostTradeSearch(searchUri, body);
            if (searchStatus == 429) return new TradeLookup(RateLimited: true);
            if (searchStatus is 401 or 403) return new TradeLookup(Forbidden: true);
            if (searchJson is null) return null;
            JsonDocument search;
            try
            {
                search = JsonDocument.Parse(searchJson);
            }
            catch (JsonException)
            {
                return null;
            }
            using (search)
            {
                var root = search.RootElement;
                lastId = root.TryGetProperty("id", out var idEl) ? JsonString(idEl) : "";
                lastTotal = root.TryGetProperty("total", out var totalEl) && JsonInt(totalEl, out var listed) ? listed : 0;
                if (!root.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array)
                    return null;
                var hashes = result.EnumerateArray()
                    .Select(el => JsonString(el))
                    .Where(h => !string.IsNullOrWhiteSpace(h))
                    .Take(TradeFetchCap)
                    .ToArray();
                if (hashes.Length == 0) return null;
                var fetched = await FetchListingOffers(hashes, lastId, name);
                if (fetched.Rate) return new TradeLookup(RateLimited: true);
                if (fetched.Forbidden) return new TradeLookup(Forbidden: true);
                if (fetched.Offers is null || fetched.Offers.Count == 0) return null;
                return new TradeLookup(ListingPayload(name, fetched.Offers, lastTotal, league, lastId, filters.Count));
            }
        }

        foreach (var body in RolledQueries(name, typeLine, filters, false, corrupted, rarity, runeSockets, category, ravenTouched, unidentified, unidentifiedTier, exactBase, ilvlMin, qualityMin, rarityFilter))
        {
            var got = await Run(body);
            if (got is { RateLimited: true } or { Forbidden: true }) return got;
            if (got?.Json is not null) return got;
            if (lastTotal > 0) break;
        }
        if (filters.Count > 0 && lastTotal == 0)
        {
            foreach (var body in RolledQueries(name, typeLine, filters, true, corrupted, rarity, runeSockets, category, ravenTouched, unidentified, unidentifiedTier, exactBase, ilvlMin, qualityMin, rarityFilter).Take(1))
            {
                var got = await Run(body);
                if (got is { RateLimited: true } or { Forbidden: true }) return got;
                if (got?.Json is not null) return got;
            }
        }
        return new TradeLookup(JsonSerializer.Serialize(new
        {
            name,
            listings = lastTotal,
            mapped = filters.Count,
            league,
            url = string.IsNullOrWhiteSpace(lastId) ? "" : TradeSearchUrl(league, lastId),
        }, JsonOut));
    }

    async Task<TradeLookup> LookupExchangeListing(string league, string name, string typeLine, string havePref)
    {
        var tag = await ResolveExchangeTag(name, typeLine);
        if (string.IsNullOrWhiteSpace(tag)) return new TradeLookup();
        var have = ExchangeHave.Where(h => !h.Equals(tag, StringComparison.OrdinalIgnoreCase)).ToArray();
        if (have.Length == 0) have = ["exalted", "chaos"];
        have = !string.IsNullOrWhiteSpace(havePref) ? [havePref] : [have[0]];
        var body = JsonSerializer.Serialize(new
        {
            engine = "new",
            query = new
            {
                status = new { option = TradeExchangeLive },
                have,
                want = new[] { tag },
            },
            sort = new Dictionary<string, string> { ["have"] = "asc" },
        }, JsonOut);
        var uris = new[]
        {
            "https://www.pathofexile.com/api/trade2/exchange/poe2/" + Uri.EscapeDataString(league),
            "https://www.pathofexile.com/api/trade2/exchange/" + Uri.EscapeDataString(league),
        };
        string? json = null;
        var status = 0;
        foreach (var uri in uris)
        {
            (json, status) = await PostTradeExchange(uri, body);
            if (status == 429) return new TradeLookup(RateLimited: true);
            if (status is 401 or 403) return new TradeLookup(Forbidden: true);
            if (json is not null) break;
            if (status is not 404) break;
        }
        if (json is null) return new TradeLookup();
        JsonDocument search;
        try
        {
            search = JsonDocument.Parse(json);
        }
        catch (JsonException)
        {
            return new TradeLookup();
        }
        using (search)
        {
            var root = search.RootElement;
            var total = root.TryGetProperty("total", out var totalEl) && JsonInt(totalEl, out var listed) ? listed : 0;
            var offers = ReadExchangeOffers(root, name);
            SortExchangeOffers(offers, havePref);
            var url = TradeExchangeUrl(league, tag, have);
            if (offers.Count == 0)
            {
                return new TradeLookup(JsonSerializer.Serialize(new
                {
                    name,
                    listings = total,
                    mapped = 0,
                    league,
                    url,
                    tag,
                    bulk = true,
                }, JsonOut));
            }
            return new TradeLookup(ExchangePayload(name, offers, total, league, tag, url));
        }
    }

    async Task<string?> ResolveExchangeTag(string name, string typeLine)
    {
        var tags = await GetExchangeTags();
        if (tags is null) return null;
        foreach (var key in ExchangeNameKeys(name, typeLine))
        {
            if (tags.TryGetValue(key, out var tag) && !string.IsNullOrWhiteSpace(tag))
                return tag;
        }
        return null;
    }

    async Task<Dictionary<string, string>?> GetExchangeTags()
    {
        if (ExchangeTags is not null && DateTime.UtcNow - ExchangeTagsAt < TimeSpan.FromHours(12))
            return ExchangeTags;
        var body = await GetTradeStaticBody();
        if (string.IsNullOrWhiteSpace(body)) return ExchangeTags;
        try
        {
            using var doc = JsonDocument.Parse(body);
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (!doc.RootElement.TryGetProperty("result", out var groups) || groups.ValueKind != JsonValueKind.Array)
                return ExchangeTags;
            foreach (var group in groups.EnumerateArray())
            {
                if (!group.TryGetProperty("entries", out var entries) || entries.ValueKind != JsonValueKind.Array)
                    continue;
                foreach (var entry in entries.EnumerateArray())
                {
                    var tag = entry.TryGetProperty("id", out var idEl) ? JsonString(idEl) : "";
                    var text = entry.TryGetProperty("text", out var textEl) ? JsonString(textEl) : "";
                    if (string.IsNullOrWhiteSpace(tag) || tag == "sep" || string.IsNullOrWhiteSpace(text)) continue;
                    map[FoldExchangeName(text)] = tag;
                }
            }
            if (map.Count > 0)
            {
                ExchangeTags = map;
                ExchangeTagsAt = DateTime.UtcNow;
            }
            return ExchangeTags;
        }
        catch (JsonException)
        {
            return ExchangeTags;
        }
    }

    async Task<string?> GetTradeStaticBody()
    {
        const string cacheKey = "trade-static-v1";
        if (Cache.TryGetValue(cacheKey, out var hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12) && hit.status is >= 200 and < 300)
            return hit.body;
        var disk = Path.Combine(AppDataDir(), "trade-static.json");
        try
        {
            if (File.Exists(disk) && DateTime.UtcNow - File.GetLastWriteTimeUtc(disk) < TimeSpan.FromHours(12))
            {
                var stored = await File.ReadAllTextAsync(disk);
                if (stored.TrimStart().StartsWith('{'))
                {
                    Cache[cacheKey] = (DateTime.UtcNow, 200, stored);
                    return stored;
                }
            }
        }
        catch
        {
            /* fetch below */
        }
        if (!await WaitForSlot(SearchLimit)) return null;
        using var res = await TradeHttp.GetAsync("https://www.pathofexile.com/api/trade2/data/static");
        NoteRate(res, SearchLimit);
        var body = await res.Content.ReadAsStringAsync();
        var status = (int)res.StatusCode;
        var looksJson = body.TrimStart().StartsWith('{');
        if (res.IsSuccessStatusCode && looksJson)
        {
            Cache[cacheKey] = (DateTime.UtcNow, status, body);
            try { await File.WriteAllTextAsync(disk, body); } catch { /* keep memory cache */ }
            return body;
        }
        return null;
    }

    async Task<TradeLookup> LookupTradeListing(string league, string name, bool thorough = false)
    {
        var searchUri = "https://www.pathofexile.com/api/trade2/search/poe2/" + Uri.EscapeDataString(league);
        foreach (var body in TradeQueries(name, thorough))
        {
            var (searchJson, searchStatus) = await PostTradeSearch(searchUri, body);
            if (searchStatus == 429) return new TradeLookup(RateLimited: true);
            if (searchStatus is 401 or 403) return new TradeLookup(Forbidden: true);
            if (searchJson is null) continue;
            JsonDocument search;
            try
            {
                search = JsonDocument.Parse(searchJson);
            }
            catch (JsonException)
            {
                continue;
            }
            using (search)
            {
            var root = search.RootElement;
            if (!root.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
                continue;
            var queryId = root.TryGetProperty("id", out var idEl) ? JsonString(idEl) : "";
            var hashes = result.EnumerateArray().Select(el => JsonString(el)).Where(h => !string.IsNullOrWhiteSpace(h)).Take(TradeFetchCap).ToArray();
            if (hashes.Length == 0) continue;
            var fetched = await FetchListingOffers(hashes, queryId, name);
            if (fetched.Rate) return new TradeLookup(RateLimited: true);
            if (fetched.Forbidden) return new TradeLookup(Forbidden: true);
            if (fetched.Offers is null || fetched.Offers.Count == 0) continue;
            var total = root.TryGetProperty("total", out var totalEl) && JsonInt(totalEl, out var listed) ? listed : fetched.Offers.Count;
            return new TradeLookup(ListingPayload(name, fetched.Offers, total, league, queryId, 0));
            }
        }
        return new TradeLookup();
    }

    static int? RetryAfterMs(HttpResponseMessage res)
    {
        if (res.Headers.RetryAfter?.Delta is TimeSpan delta)
            return (int)Math.Clamp(delta.TotalMilliseconds, 1000, 20000);
        if (res.Headers.TryGetValues("Retry-After", out var values) && int.TryParse(values.FirstOrDefault(), out var seconds))
            return (int)Math.Clamp(seconds * 1000, 1000, 20000);
        return null;
    }

    static List<(string Id, string Name, string Price, string Category)> WealthJobs(JsonElement root)
    {
        var jobs = new List<(string Id, string Name, string Price, string Category)>();
        if (root.TryGetProperty("stashes", out var stashes) && stashes.ValueKind == JsonValueKind.Array)
        {
            foreach (var row in stashes.EnumerateArray())
            {
                var id = row.TryGetProperty("id", out var idEl) ? JsonString(idEl) : "";
                var name = row.TryGetProperty("name", out var nameEl) ? JsonString(nameEl) : "";
                var price = row.TryGetProperty("price", out var priceEl) ? JsonString(priceEl) : "";
                var category = row.TryGetProperty("category", out var categoryEl) ? JsonString(categoryEl) : "";
                if (id.Length is < 1 or > 24 || name.Length is < 1 or > 40) continue;
                if (!Regex.IsMatch(price, "^waystone-(?:[1-9]|1[0-6])$")) continue;
                if (category is not ("" or "currency")) continue;
                jobs.Add((id, name, price, category));
                if (jobs.Count >= 12) break;
            }
        }
        if (jobs.Count == 0) jobs.Add(("currency", "Currency", "waystone-3", "currency"));
        return jobs;
    }

    async Task<string> LookupWealthTabs(string league, string account, IReadOnlyList<(string Id, string Name, string Price, string Category)> stashes)
    {
        var results = new JsonArray();
        var limited = false;
        foreach (var stash in stashes)
        {
            string one;
            try
            {
                one = await LookupWealthStash(league, account, stash.Price, stash.Category);
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("rate limited", StringComparison.OrdinalIgnoreCase))
            {
                limited = true;
                break;
            }
            var node = JsonNode.Parse(one) as JsonObject ?? new JsonObject();
            node["id"] = stash.Id;
            node["name"] = stash.Name;
            results.Add(node);
        }
        return new JsonObject { ["stashes"] = results, ["limited"] = limited }.ToJsonString();
    }

    async Task<bool> ShowPoe1Login()
    {
        var session = await Poe1BrowserLogin.Capture();
        var account = Poe1BrowserLogin.Account.Trim();
        if (session.Length < 8 || account.Length < 2)
            throw new InvalidOperationException("Sign in on the Path of Exile page and wait until the window closes.");
        File.WriteAllText(Poe1SessionPath(), JsonSerializer.Serialize(new { session, account }));
        return true;
    }

    static string Poe1SessionPath() => Path.Combine(AppDataDir(), "poe1-session.json");

    static string ReadPoe1Session() => ReadPoe1SessionField("session");

    static string ReadPoe1Account() => ReadPoe1SessionField("account");

    static string ReadPoe1SessionField(string name)
    {
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(Poe1SessionPath()));
            var value = doc.RootElement.TryGetProperty(name, out var node) ? node.GetString() ?? "" : "";
            if (name == "session")
                return value.Length >= 8 && value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_') ? value : "";
            return value.Length is >= 2 and <= 60 && value.Any(char.IsLetter) && value.All(ch => char.IsLetterOrDigit(ch) || ch is '#' or '_' or '-') ? value : "";
        }
        catch { return ""; }
    }

    static List<int>? Poe1TabPicks(JsonElement root)
    {
        if (root.TryGetProperty("list", out var listEl) && listEl.ValueKind == JsonValueKind.True) return null;
        var picks = new List<int>();
        if (root.TryGetProperty("tabs", out var tabs) && tabs.ValueKind == JsonValueKind.Array)
        {
            foreach (var tab in tabs.EnumerateArray())
            {
                if (JsonInt(tab, out var index) && index is >= 0 and <= 500 && !picks.Contains(index))
                    picks.Add(index);
                if (picks.Count >= 80) break;
            }
        }
        return picks;
    }

    async Task<string> LookupPoe1Wealth(string league, IReadOnlyList<int>? only)
    {
        var account = ReadPoe1Account();
        league = league.Trim();
        if (account.Length < 2)
            throw new InvalidOperationException("Sign in to Path of Exile first.");
        if (!ValidLeague(league))
            throw new InvalidOperationException("Enter the PoE 1 league name.");
        var session = ReadPoe1Session();
        if (session.Length < 8)
            throw new InvalidOperationException("Sign in to Path of Exile first.");
        var first = await GetPoe1Stash(session, account, league, 0, true);
        if (first.Status is 401 or 403)
            throw new InvalidOperationException(first.AuthRejected
                ? "Sign in again. Path of Exile rejected the stash read."
                : "Path of Exile did not return the stash. The saved sign-in was kept.");
        if (first.Status == 429)
            throw new InvalidOperationException("The stash site is rate limited. Wait a moment, then read again.");
        if (first.Status != 200 || first.Json is null)
            throw new InvalidOperationException("Path of Exile did not return the stash.");
        var tabs = new List<(int Index, string Name)>();
        if (first.Json.RootElement.TryGetProperty("tabs", out var tabRows) && tabRows.ValueKind == JsonValueKind.Array)
        {
            foreach (var tab in tabRows.EnumerateArray())
            {
                if (tab.TryGetProperty("hidden", out var hidden) && hidden.ValueKind == JsonValueKind.True) continue;
                var index = tab.TryGetProperty("i", out var indexEl) && JsonInt(indexEl, out var indexN) ? indexN : tabs.Count;
                var name = tab.TryGetProperty("n", out var nameEl) ? JsonString(nameEl) : "Stash";
                if (string.IsNullOrWhiteSpace(name)) name = "Stash";
                tabs.Add((index, name.Trim()));
            }
        }
        if (only is null)
        {
            var listed = new JsonArray();
            foreach (var tab in tabs)
                listed.Add(new JsonObject { ["index"] = tab.Index, ["name"] = tab.Name });
            first.Json.Dispose();
            return new JsonObject { ["tabs"] = listed }.ToJsonString();
        }
        tabs = tabs.Where(tab => only.Contains(tab.Index)).ToList();
        if (tabs.Count == 0)
        {
            first.Json.Dispose();
            throw new InvalidOperationException("Turn on at least one stash tab.");
        }
        var limited = tabs.Count > 24;
        var results = new JsonArray();
        var taken = 0;
        foreach (var tab in tabs)
        {
            if (taken >= 24) break;
            JsonDocument? doc = tab.Index == 0 ? first.Json : null;
            var owned = false;
            if (doc is null)
            {
                await Task.Delay(350);
                var next = await GetPoe1Stash(session, account, league, tab.Index, false);
                if (next.Status == 429) { next.Json?.Dispose(); limited = true; break; }
                if (next.Status is 401 or 403)
                {
                    next.Json?.Dispose();
                    first.Json.Dispose();
                    throw new InvalidOperationException(next.AuthRejected
                        ? "Sign in again. Path of Exile rejected the stash read."
                        : "Path of Exile did not return the stash. The saved sign-in was kept.");
                }
                doc = next.Json;
                owned = true;
            }
            taken++;
            if (doc is null) continue;
            try
            {
                var stacks = Poe1Stacks(doc);
                if (stacks.Count == 0) continue;
                results.Add(new JsonObject
                {
                    ["id"] = tab.Index.ToString(),
                    ["name"] = tab.Name,
                    ["stacks"] = stacks,
                });
            }
            finally
            {
                if (owned) doc.Dispose();
            }
        }
        var json = new JsonObject { ["stashes"] = results, ["limited"] = limited }.ToJsonString();
        first.Json.Dispose();
        return json;
    }

    async Task<(int Status, JsonDocument? Json, bool AuthRejected)> GetPoe1Stash(string session, string account, string league, int tabIndex, bool listTabs)
    {
        var url = "https://www.pathofexile.com/character-window/get-stash-items?accountName="
            + Uri.EscapeDataString(account) + "&realm=pc&league=" + Uri.EscapeDataString(league)
            + "&tabs=" + (listTabs ? "1" : "0") + "&tabIndex=" + tabIndex;
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("Cookie", "POESESSID=" + session);
        request.Headers.TryAddWithoutValidation("X-Requested-With", "XMLHttpRequest");
        request.Headers.Referrer = new Uri("https://www.pathofexile.com/");
        using var response = await Poe1Http.SendAsync(request);
        var status = (int)response.StatusCode;
        var body = await response.Content.ReadAsStringAsync();
        var rejected = status is 401 or 403 && Poe1AuthRejected(body);
        if (rejected)
        {
            try { File.Delete(Poe1SessionPath()); } catch { /* the next sign-in replaces it */ }
            return (status, null, true);
        }
        if (status != 200) return (status, null, false);
        try { return (status, JsonDocument.Parse(body), false); }
        catch { return (status, null, false); }
    }

    static bool Poe1AuthRejected(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("error", out var error)) return false;
            if (error.TryGetProperty("code", out var code) && code.TryGetInt32(out var number) && number == 6) return true;
            var message = error.TryGetProperty("message", out var messageEl) ? messageEl.GetString() ?? "" : "";
            return message.Equals("Forbidden", StringComparison.OrdinalIgnoreCase) || message.Equals("Unauthorized", StringComparison.OrdinalIgnoreCase);
        }
        catch { return false; }
    }

    static JsonArray Poe1Stacks(JsonDocument doc)
    {
        var totals = new Dictionary<string, (string Name, long Count)>(StringComparer.OrdinalIgnoreCase);
        if (!doc.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array)
            return new JsonArray();
        foreach (var item in items.EnumerateArray())
        {
            var name = item.TryGetProperty("name", out var nameEl) ? JsonString(nameEl).Trim() : "";
            if (string.IsNullOrWhiteSpace(name))
                name = item.TryGetProperty("typeLine", out var typeEl) ? JsonString(typeEl).Trim() : "";
            if (string.IsNullOrWhiteSpace(name) && item.TryGetProperty("baseType", out var baseEl))
                name = JsonString(baseEl).Trim();
            if (string.IsNullOrWhiteSpace(name)) continue;
            var count = 1L;
            if (item.TryGetProperty("stackSize", out var stackEl) && JsonInt(stackEl, out var stack) && stack > 0) count = stack;
            if (totals.TryGetValue(name, out var existing)) totals[name] = (existing.Name, Math.Min(9_999_999, existing.Count + count));
            else totals[name] = (name, count);
        }
        var stacks = new JsonArray();
        foreach (var row in totals.Values.Where(row => row.Count > 0).OrderByDescending(row => row.Count))
            stacks.Add(new JsonObject { ["name"] = row.Name, ["count"] = row.Count });
        return stacks;
    }

    async Task<string> LookupWealthStash(string league, string account, string priceId = "waystone-3", string category = "currency")
    {
        account = account.Trim();
        league = league.Trim();
        if (account.Length is < 2 or > 60 || account.Any(char.IsControl))
            throw new InvalidOperationException("Enter the account name from the Path of Exile website.");
        if (string.IsNullOrWhiteSpace(league))
            throw new InvalidOperationException("Choose a league first.");
        var filters = new JsonObject
        {
            ["trade_filters"] = new JsonObject
            {
                ["filters"] = new JsonObject
                {
                    ["account"] = new JsonObject { ["input"] = account },
                    ["price"] = new JsonObject { ["option"] = priceId, ["min"] = 99, ["max"] = 99 },
                },
            },
        };
        if (category == "currency")
        {
            filters["type_filters"] = new JsonObject
            {
                ["filters"] = new JsonObject
                {
                    ["category"] = new JsonObject { ["option"] = "currency" },
                },
            };
        }
        var body = new JsonObject
        {
            ["query"] = new JsonObject
            {
                ["status"] = new JsonObject { ["option"] = "any" },
                ["stats"] = new JsonArray
                {
                    new JsonObject { ["type"] = "and", ["filters"] = new JsonArray() },
                },
                ["filters"] = filters,
            },
            ["sort"] = new JsonObject { ["price"] = "asc" },
        }.ToJsonString();
        var (json, status) = await PostTradeSearch(
            "https://www.pathofexile.com/api/trade2/search/poe2/" + Uri.EscapeDataString(league), body);
        if (status == 429)
            throw new InvalidOperationException("The trade site is rate limited. Wait a moment, then read the tab again.");
        if (status is 401 or 403)
            throw new InvalidOperationException("The trade site refused the search.");
        if (json is null)
            throw new InvalidOperationException("The trade site did not return the Currency tab.");
        using var search = JsonDocument.Parse(json);
        var root = search.RootElement;
        if (root.TryGetProperty("error", out var errorEl))
        {
            var message = errorEl.ValueKind == JsonValueKind.Object && errorEl.TryGetProperty("message", out var messageEl)
                ? JsonString(messageEl) : "";
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(message) ? "The trade site rejected the search." : message);
        }
        var queryId = root.TryGetProperty("id", out var idEl) ? JsonString(idEl) : "";
        var total = root.TryGetProperty("total", out var totalEl) && JsonInt(totalEl, out var listed) ? listed : 0;
        if (!root.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
            return JsonSerializer.Serialize(new { stacks = Array.Empty<object>(), listed = total, partial = false }, JsonOut);
        var hashes = result.EnumerateArray().Select(item => JsonString(item)).Where(hash => !string.IsNullOrWhiteSpace(hash)).Take(TradeFetchCap).ToArray();
        var totals = new Dictionary<string, (string Name, long Count)>(StringComparer.OrdinalIgnoreCase);
        var accounts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < hashes.Length; index += TradeFetchBatch)
        {
            var batch = hashes.Skip(index).Take(TradeFetchBatch).ToArray();
            if (!await WaitForSlot(FetchLimit))
                throw new InvalidOperationException("The trade site is rate limited. Wait a moment, then read the tab again.");
            var fetchUrl = "https://www.pathofexile.com/api/trade2/fetch/" + string.Join(",", batch) + "?query=" + Uri.EscapeDataString(queryId);
            using var fetchRes = await TradeHttp.GetAsync(fetchUrl);
            NoteRate(fetchRes, FetchLimit);
            var fetchStatus = (int)fetchRes.StatusCode;
            if (fetchStatus == 429)
                throw new InvalidOperationException("The trade site is rate limited. Wait a moment, then read the tab again.");
            if (fetchStatus is 401 or 403)
                throw new InvalidOperationException("The trade site refused the search.");
            if (!fetchRes.IsSuccessStatusCode) break;
            ReadWealthFetch(await fetchRes.Content.ReadAsStringAsync(), account, priceId, totals, accounts);
        }
        if (accounts.Count > 1)
            throw new InvalidOperationException("More than one account matched. Enter the full name, including the #number.");
        var stacks = totals.Values.Where(row => row.Count > 0).OrderByDescending(row => row.Count)
            .Select(row => new { name = row.Name, count = row.Count }).ToArray();
        return JsonSerializer.Serialize(new { stacks, listed = total, partial = total > hashes.Length }, JsonOut);
    }

    static void ReadWealthFetch(string json, string account, string priceId, Dictionary<string, (string Name, long Count)> totals, HashSet<string> accounts)
    {
        using var fetched = JsonDocument.Parse(json);
        if (!fetched.RootElement.TryGetProperty("result", out var rows) || rows.ValueKind != JsonValueKind.Array) return;
        foreach (var row in rows.EnumerateArray())
        {
            if (!row.TryGetProperty("listing", out var listing)) continue;
            if (listing.TryGetProperty("account", out var accountEl) && accountEl.ValueKind == JsonValueKind.Object &&
                accountEl.TryGetProperty("name", out var nameEl))
            {
                var listed = JsonString(nameEl);
                if (!WealthAccountMatches(listed, account)) continue;
                if (!string.IsNullOrWhiteSpace(listed)) accounts.Add(listed);
            }
            if (!listing.TryGetProperty("price", out var price) || price.ValueKind != JsonValueKind.Object) continue;
            var amount = price.TryGetProperty("amount", out var amountEl) && JsonDouble(amountEl, out var priced) ? priced : 0;
            var currency = price.TryGetProperty("currency", out var currencyEl) ? JsonString(currencyEl) : "";
            if (Math.Abs(amount - 99) > 0.001 || !currency.Equals(priceId, StringComparison.OrdinalIgnoreCase)) continue;
            if (!row.TryGetProperty("item", out var item) || item.ValueKind != JsonValueKind.Object) continue;
            var name = item.TryGetProperty("typeLine", out var typeEl) ? JsonString(typeEl) : "";
            if (string.IsNullOrWhiteSpace(name) && item.TryGetProperty("baseType", out var baseEl)) name = JsonString(baseEl);
            name = name.Trim();
            if (string.IsNullOrWhiteSpace(name)) continue;
            var count = 1L;
            if (item.TryGetProperty("stackSize", out var stackEl) && JsonInt(stackEl, out var stack) && stack > 0) count = stack;
            if (totals.TryGetValue(name, out var existing)) totals[name] = (existing.Name, Math.Min(9_999_999, existing.Count + count));
            else totals[name] = (name, Math.Min(9_999_999, count));
        }
    }

    static bool WealthAccountMatches(string listed, string wanted)
    {
        listed = listed.Trim();
        wanted = wanted.Trim();
        if (listed.Length == 0 || wanted.Length == 0) return false;
        if (listed.Equals(wanted, StringComparison.OrdinalIgnoreCase)) return true;
        var tag = listed.IndexOf('#');
        return !wanted.Contains('#') && tag > 0 && listed[..tag].Equals(wanted, StringComparison.OrdinalIgnoreCase);
    }

    async Task<(string? json, int status)> PostTradeSearch(string uri, string body)
    {
        if (!await WaitForSlot(SearchLimit)) return (null, 429);
        using var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
        using var searchRes = await TradeHttp.PostAsync(uri, content);
        NoteRate(searchRes, SearchLimit);
        var status = (int)searchRes.StatusCode;
        var searchJson = await searchRes.Content.ReadAsStringAsync();
        if (status == 429) return (null, 429);
        if (status is 401 or 403) return (null, status);
        return (searchRes.IsSuccessStatusCode ? searchJson : null, status);
    }

    async Task<(string? json, int status)> PostTradeExchange(string uri, string body)
    {
        if (!await WaitForSlot(ExchangeLimit)) return (null, 429);
        using var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
        using var searchRes = await TradeHttp.PostAsync(uri, content);
        NoteRate(searchRes, ExchangeLimit);
        var status = (int)searchRes.StatusCode;
        var searchJson = await searchRes.Content.ReadAsStringAsync();
        if (status == 429) return (null, 429);
        if (status is 401 or 403) return (null, status);
        return (searchRes.IsSuccessStatusCode ? searchJson : null, status);
    }

    string? ReadCheapestListing(string fetchJson, string fallbackName, JsonElement searchRoot, string league = "", string queryId = "", int mapped = 0)
    {
        var offers = ReadOfferRows(fetchJson, fallbackName);
        if (offers.Count == 0) return null;
        var total = searchRoot.TryGetProperty("total", out var totalEl) && JsonInt(totalEl, out var listed) ? listed : offers.Count;
        return ListingPayload(fallbackName, offers, total, league, queryId, mapped);
    }

    async Task<(List<OfferRow>? Offers, bool Rate, bool Forbidden)> FetchListingOffers(string[] hashes, string queryId, string fallbackName, string? fetchRoot = null)
    {
        var offers = new List<OfferRow>();
        var rootUrl = string.IsNullOrWhiteSpace(fetchRoot) ? "https://www.pathofexile.com/api/trade2/fetch/" : fetchRoot;
        for (var i = 0; i < hashes.Length; i += TradeFetchBatch)
        {
            var batch = hashes.Skip(i).Take(TradeFetchBatch).ToArray();
            if (batch.Length == 0) break;
            if (!await WaitForSlot(FetchLimit))
                return offers.Count > 0 ? (offers, false, false) : (null, true, false);
            var fetchUrl = rootUrl + string.Join(",", batch) + "?query=" + Uri.EscapeDataString(queryId ?? "");
            using var fetchRes = await TradeHttp.GetAsync(fetchUrl);
            NoteRate(fetchRes, FetchLimit);
            var status = (int)fetchRes.StatusCode;
            if (status == 429)
                return offers.Count > 0 ? (offers, false, false) : (null, true, false);
            if (status is 401 or 403) return (null, false, true);
            if (!fetchRes.IsSuccessStatusCode) break;
            offers.AddRange(ReadOfferRows(await fetchRes.Content.ReadAsStringAsync(), fallbackName));
        }
        return offers.Count > 0 ? (offers, false, false) : (null, false, false);
    }

    static string ListingPayload(string fallbackName, IReadOnlyList<OfferRow> offers, int total, string league, string queryId, int mapped)
    {
        var first = offers[0];
        return JsonSerializer.Serialize(new
        {
            name = string.IsNullOrWhiteSpace(first.Name) ? fallbackName : first.Name,
            amount = first.Amount,
            currency = first.Currency,
            listings = total > 0 ? total : offers.Count,
            mapped,
            league,
            url = string.IsNullOrWhiteSpace(queryId) ? "" : TradeSearchUrl(league, queryId),
            offers = offers.Select(row => new { ign = row.Ign, amount = row.Amount, currency = row.Currency, instant = row.Instant }),
        }, JsonOut);
    }

    static string ExchangePayload(string fallbackName, IReadOnlyList<OfferRow> offers, int total, string league, string tag, string url)
    {
        var first = offers[0];
        return JsonSerializer.Serialize(new
        {
            name = string.IsNullOrWhiteSpace(first.Name) ? fallbackName : first.Name,
            amount = first.Amount,
            currency = first.Currency,
            listings = total > 0 ? total : offers.Count,
            mapped = 0,
            league,
            url,
            tag,
            bulk = true,
            offers = offers.Select(row => new { ign = row.Ign, amount = row.Amount, currency = row.Currency, instant = row.Instant }),
        }, JsonOut);
    }

    static void SortExchangeOffers(List<OfferRow> offers, string pref)
    {
        offers.Sort((a, b) =>
        {
            var rank = ExchangeCurrencyRank(a.Currency, pref).CompareTo(ExchangeCurrencyRank(b.Currency, pref));
            return rank != 0 ? rank : a.Amount.CompareTo(b.Amount);
        });
    }

    static int ExchangeCurrencyRank(string currency, string pref)
    {
        if (!string.IsNullOrEmpty(pref) && currency.Equals(pref, StringComparison.OrdinalIgnoreCase)) return 0;
        if (currency.Equals("exalted", StringComparison.OrdinalIgnoreCase)) return 1;
        if (currency.Equals("chaos", StringComparison.OrdinalIgnoreCase)) return 2;
        if (currency.Equals("divine", StringComparison.OrdinalIgnoreCase)) return 3;
        return 4;
    }

    static List<OfferRow> ReadExchangeOffers(JsonElement root, string fallbackName)
    {
        var rows = new List<OfferRow>();
        if (!root.TryGetProperty("result", out var result)) return rows;
        IEnumerable<JsonElement> listings = result.ValueKind == JsonValueKind.Object
            ? result.EnumerateObject().Select(p => p.Value)
            : result.ValueKind == JsonValueKind.Array
                ? result.EnumerateArray().ToArray()
                : Array.Empty<JsonElement>();
        foreach (var row in listings)
        {
            if (!row.TryGetProperty("listing", out var listing)) continue;
            if (!listing.TryGetProperty("offers", out var offers) || offers.ValueKind != JsonValueKind.Array)
                continue;
            foreach (var offer in offers.EnumerateArray().Take(1))
            {
                if (!offer.TryGetProperty("exchange", out var ex) || !offer.TryGetProperty("item", out var item))
                    continue;
                var pay = ex.TryGetProperty("amount", out var payEl) && JsonDouble(payEl, out var p) ? p : double.NaN;
                var qty = item.TryGetProperty("amount", out var qtyEl) && JsonDouble(qtyEl, out var q) ? q : 1;
                if (!NumberIsPositive(pay) || qty <= 0 || double.IsNaN(qty)) continue;
                var unit = pay / qty;
                if (!NumberIsPositive(unit)) continue;
                var currency = ex.TryGetProperty("currency", out var curEl) ? JsonString(curEl) : "";
                if (string.IsNullOrWhiteSpace(currency)) continue;
                var ign = ListingIgn(listing);
                var instant = listing.TryGetProperty("fee", out var feeEl) && feeEl.ValueKind is JsonValueKind.Number or JsonValueKind.String;
                rows.Add(new OfferRow(ign, unit, currency, instant, fallbackName));
            }
            if (rows.Count >= TradeFetchCap) break;
        }
        return rows;
    }

    sealed record OfferRow(string Ign, double Amount, string Currency, bool Instant, string Name);

    static List<OfferRow> ReadOfferRows(string fetchJson, string fallbackName)
    {
        var rows = new List<OfferRow>();
            using var fetched = JsonDocument.Parse(fetchJson);
            if (!fetched.RootElement.TryGetProperty("result", out var listings) || listings.ValueKind != JsonValueKind.Array)
            return rows;
            foreach (var row in listings.EnumerateArray())
            {
                if (!row.TryGetProperty("listing", out var listing) ||
                    !listing.TryGetProperty("price", out var price) ||
                    price.ValueKind != JsonValueKind.Object)
                    continue;
            var amount = price.TryGetProperty("amount", out var amountEl) && JsonDouble(amountEl, out var n) ? n : double.NaN;
            var currency = price.TryGetProperty("currency", out var curEl) ? JsonString(curEl) : "";
                if (!NumberIsPositive(amount) || string.IsNullOrWhiteSpace(currency)) continue;
            var ign = ListingIgn(listing);
            var instant = listing.TryGetProperty("fee", out var feeEl) && feeEl.ValueKind is JsonValueKind.Number or JsonValueKind.String;
            rows.Add(new OfferRow(ign, amount, currency, instant, ItemDisplayName(row, fallbackName)));
        }
        return rows;
    }

    static string ListingIgn(JsonElement listing)
    {
        if (!listing.TryGetProperty("account", out var account) || account.ValueKind != JsonValueKind.Object)
            return "";
        var ign = account.TryGetProperty("lastCharacterName", out var ignEl) ? JsonString(ignEl) : "";
        if (!string.IsNullOrWhiteSpace(ign)) return ign;
        var name = account.TryGetProperty("name", out var nameEl) ? JsonString(nameEl) : "";
        var hash = name.IndexOf('#');
        return hash > 0 ? name[..hash] : name;
    }

    static string ItemDisplayName(JsonElement row, string fallback)
    {
        if (!row.TryGetProperty("item", out var item) || item.ValueKind != JsonValueKind.Object)
            return fallback;
        var uniqueName = item.TryGetProperty("name", out var nameEl) ? JsonString(nameEl) : "";
        if (!string.IsNullOrWhiteSpace(uniqueName)) return uniqueName;
        var typeLine = item.TryGetProperty("typeLine", out var typeEl) ? JsonString(typeEl) : "";
        return string.IsNullOrWhiteSpace(typeLine) ? fallback : typeLine;
    }

    static bool NumberIsPositive(double n) => n is > 0 and < 1_000_000_000 && !double.IsNaN(n) && !double.IsInfinity(n);

    static IEnumerable<string> TradeQueries(string name, bool thorough = false)
    {
        yield return JsonSerializer.Serialize(new
        {
            query = new { status = new { option = TradeLive }, name },
            sort = new Dictionary<string, string> { ["price"] = "asc" },
        });
        yield return JsonSerializer.Serialize(new
        {
            query = new { status = new { option = TradeLive }, type = name },
            sort = new Dictionary<string, string> { ["price"] = "asc" },
        });
        if (!name.EndsWith(" Support", StringComparison.OrdinalIgnoreCase) &&
            (thorough || name.Contains("Support", StringComparison.OrdinalIgnoreCase) || name.Contains("Lineage", StringComparison.OrdinalIgnoreCase)))
        {
            yield return JsonSerializer.Serialize(new
            {
                query = new { status = new { option = TradeLive }, type = name + " Support" },
                sort = new Dictionary<string, string> { ["price"] = "asc" },
            });
        }
        if (!thorough) yield break;
        yield return JsonSerializer.Serialize(new
        {
            query = new
            {
                status = new { option = TradeLive },
                type = name,
                filters = new { type_filters = new { filters = new { rarity = new { option = "unique" } } } },
            },
            sort = new Dictionary<string, string> { ["price"] = "asc" },
        });
    }

    static bool AllowedNinjaPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || path.Contains("..", StringComparison.Ordinal)) return false;
        return path.StartsWith("/poe2/api/economy/", StringComparison.Ordinal) ||
            path.StartsWith("/poe1/api/economy/", StringComparison.Ordinal);
    }

    void OnLoad(object? sender, EventArgs e)
    {
        Poe1BrowserLogin.ProfileDir();
        DropUnusedJsonFolder();
        string index;
        try
        {
            index = ExtractWebFiles();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Still Sane could not unpack its files to:\n" + Path.Combine(AppDataDir(), "www") + "\n\n" + ex.Message,
                "Still Sane, Exile?",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
            return;
        }
        // The menu must be usable even when a hidden WebView is still starting.
        _launcher = new GameLauncherForm(GameHasFocus, () => _gameMenus.Hidden, UpdateLauncherShortcut,
            Path.Combine(AppDataDir(), "launcher-position.json"),
            Path.Combine(AppDataDir(), "www", "still-sane-sigil.png"),
            () => OpenCompanionView("dash"), () => OpenCompanionView("settings"), RefreshWealthFromButton);
        _gameMenuConfigPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            "My Games", "Path of Exile 2", "poe2_production_Config.ini");
        RefreshGameMenuBindings();
        EnsureGameKeyboardHook();
        _indexPage = index;
        ApplyHotkeys(_hotLog, _hotNext, _hotPrice);
        BeginInvoke(() => { if (!IsDisposed) _ = EnsureWebAsync(); });
    }

    async void RefreshWealthFromButton()
    {
        await EnsureWebAsync();
        PushHotkey("refresh-wealth");
    }

    Task EnsureWebAsync()
    {
        if (_web.CoreWebView2 is not null && _appReady) return Task.CompletedTask;
        if (InvokeRequired) return (Task)Invoke(EnsureWebAsync);
        return _webReady ??= StartWebAsync();
    }

    async Task StartWebAsync()
    {
        var userData = AppDataDir();
        var options = new CoreWebView2EnvironmentOptions("--disable-features=msSmartScreenProtection,CalculateNativeWinOcclusion --disable-background-networking --disable-sync --disable-backgrounding-occluded-windows");
        _web.DefaultBackgroundColor = Color.FromArgb(12, 10, 8);
        try
        {
            _env = await CoreWebView2Environment.CreateAsync(null, userData, options);
            await _web.EnsureCoreWebView2Async(_env);
        }
        catch (WebView2RuntimeNotFoundException)
        {
            MessageBox.Show(
                "This app needs the Microsoft Edge WebView2 Runtime, which is usually already on Windows 11.\n\nInstall it from:\nhttps://aka.ms/webview2runtime",
                "Still Sane, Exile?",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
            return;
        }

        ParkCompanion();
        var ready = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        _web.CoreWebView2.Settings.AreDevToolsEnabled = false;
        _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
        _web.CoreWebView2.Settings.IsWebMessageEnabled = true;
        _web.CoreWebView2.WebMessageReceived += OnWebMessage;
        _web.CoreWebView2.NavigationCompleted += (_, ev) =>
        {
            FinishCompanionNavigation(ev.IsSuccess);
            if (ev.IsSuccess && _focusedGame.Length > 0)
                PushJson(new { type = "active-game", game = _focusedGame });
            ready.TrySetResult();
        };
        _web.CoreWebView2.NewWindowRequested += (_, ev) =>
        {
            ev.Handled = true;
            OpenTradeUrl(ev.Uri);
        };
        _web.CoreWebView2.Navigate(new Uri(_indexPage).AbsoluteUri);
        _wealthRefresh.Tick += (_, _) => PushJson(new { type = "hotkey", action = "refresh-wealth", auto = true });
        _wealthRefresh.Start();
        await ready.Task;
    }

    async void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string? id = null;
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            var type = root.GetProperty("type").GetString();
            id = root.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
            if (type == "quit")
            {
                BeginInvoke(Close);
                return;
            }
            if (type == "app-scale")
            {
                var scale = root.TryGetProperty("scale", out var appScaleEl) && appScaleEl.ValueKind == JsonValueKind.Number && appScaleEl.TryGetDouble(out var appScale) && double.IsFinite(appScale) ? Math.Clamp(appScale, 0.75, 1.25) : 1;
                BeginInvoke(() => SetCompanionWindowScale(scale));
                return;
            }
            if (type == "window-drag")
            {
                BeginInvoke(DragWindow);
                return;
            }
            if (type == "window-hide")
            {
                BeginInvoke(HideCompanionWindow);
                return;
            }
            if (type == "ui-painted")
            {
                var view = root.TryGetProperty("view", out var viewEl) ? viewEl.GetString() ?? "" : "";
                BeginInvoke(() => RevealCompanionIfOpen(view));
                return;
            }
            if (type == "hotkeys-pause")
            {
                BeginInvoke(ClearHotkeys);
                return;
            }
            if (type == "hotkeys")
            {
                var log = root.TryGetProperty("log", out var logEl) ? logEl.GetString() ?? "F8" : "F8";
                var next = root.TryGetProperty("next", out var nextEl) ? nextEl.GetString() ?? "F9" : "F9";
                var price = root.TryGetProperty("price", out var priceEl) ? priceEl.GetString() ?? "F7" : "F7";
                var hideout = root.TryGetProperty("hideout", out var hideoutEl) ? hideoutEl.GetString() ?? "F6" : "F6";
                BeginInvoke(() => ApplyHotkeys(log, next, price, hideout));
                return;
            }
            if (type == "rate-status")
            {
                PushRate();
                return;
            }
            if (type == "price-cache-get")
            {
                var disk = Path.Combine(AppDataDir(), "prices.json");
                try
                {
                    var body = File.Exists(disk) ? File.ReadAllText(disk) : "{\"version\":3,\"leagues\":{}}";
                    if (!body.TrimStart().StartsWith('{')) body = "{\"version\":3,\"leagues\":{}}";
                    Reply(id ?? "", true, 200, body);
                }
                catch (Exception ex)
                {
                    Reply(id ?? "", false, 0, JsonSerializer.Serialize(new { error = ex.Message }));
                }
                return;
            }
            if (type == "price-cache-set")
            {
                var json = root.TryGetProperty("json", out var jsonEl) ? jsonEl.GetString() ?? "" : "";
                try
                {
                    if (json.Length is < 2 or > 2_000_000 || !json.TrimStart().StartsWith('{'))
                    {
                        Reply(id ?? "", false, 400, "{\"error\":\"bad price cache\"}");
                        return;
                    }
                    File.WriteAllText(Path.Combine(AppDataDir(), "prices.json"), json);
                    Reply(id ?? "", true, 200, "{\"ok\":true}");
                }
                catch (Exception ex)
                {
                    Reply(id ?? "", false, 0, JsonSerializer.Serialize(new { error = ex.Message }));
                }
                return;
            }
            if (type == "icon")
            {
                var itemName = root.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
                var iconGame = root.TryGetProperty("game", out var iconGameEl) ? iconGameEl.GetString() ?? "" : "";
                if (string.Equals(iconGame, "poe1", StringComparison.Ordinal))
                    await FetchPoedbIcon(id ?? "", itemName);
                else
                    await FetchPoe2DbIcon(id ?? "", itemName);
                return;
            }
            if (type == "scout")
            {
                var league = root.TryGetProperty("league", out var leagueEl) ? leagueEl.GetString() ?? "" : "";
                await FetchScoutItems(id ?? "", league);
                return;
            }
            if (type == "open-url")
            {
                var url = root.TryGetProperty("url", out var urlEl) ? urlEl.GetString() ?? "" : "";
                BeginInvoke(() => OpenTradeUrl(url));
                return;
            }
            if (type == "guides-browse")
            {
                var url = root.TryGetProperty("url", out var guideUrlEl) ? guideUrlEl.GetString() ?? "" : "";
                BeginInvoke(() => _ = OpenGuideBrowserAsync(url));
                return;
            }
            if (type == "guides-close")
            {
                BeginInvoke(() => _guideBrowser?.CloseBrowser());
                return;
            }
            if (type == "copy-text")
            {
                var text = root.TryGetProperty("text", out var copyEl) ? copyEl.GetString() ?? "" : "";
                if (text.Length is < 1 or > 8000) return;
                BeginInvoke(() =>
                {
                    try { Clipboard.SetText(text); }
                    catch { /* ignore clipboard lock */ }
                });
                return;
            }
            if (type == "update-check")
            {
                try
                {
                    Reply(id ?? "", true, 200, await AppUpdate.CheckJsonAsync());
                }
                catch
                {
                    Reply(id ?? "", false, 0, "{\"error\":\"update check failed\"}");
                }
                return;
            }
            if (type == "update-install")
            {
                try
                {
                    var json = await AppUpdate.InstallJsonAsync();
                    var ok = json.Contains("\"ok\":true", StringComparison.Ordinal);
                    Reply(id ?? "", ok, ok ? 200 : 400, json);
                    if (ok) BeginInvoke(Close);
                }
                catch
                {
                    Reply(id ?? "", false, 0, "{\"error\":\"update failed\"}");
                }
                return;
            }
            if (type == "overlay-show")
            {
                var html = root.TryGetProperty("html", out var htmlEl) ? htmlEl.GetString() ?? "" : "";
                var vars = root.TryGetProperty("vars", out var varsEl) ? varsEl.GetString() ?? "" : "";
                var fresh = root.TryGetProperty("fresh", out var freshEl) && freshEl.ValueKind == JsonValueKind.True;
                var clickAway = root.TryGetProperty("clickAway", out var clickEl) && clickEl.ValueKind == JsonValueKind.True;
                var overlayScale = root.TryGetProperty("overlayScale", out var scaleEl) && scaleEl.ValueKind == JsonValueKind.Number && scaleEl.TryGetDouble(out var scaleValue) && double.IsFinite(scaleValue) ? Math.Clamp(scaleValue, 0.75, 1.25) : 1;
                BeginInvoke(() => _ = ShowPriceOverlayAsync(html, vars, null, fresh, clickAway, overlayScale));
                return;
            }
            if (type == "trade-preview")
            {
                var enabled = root.TryGetProperty("enabled", out var enabledEl) && enabledEl.ValueKind == JsonValueKind.True;
                var html = root.TryGetProperty("html", out var previewHtml) ? previewHtml.GetString() ?? "" : "";
                var vars = root.TryGetProperty("vars", out var previewVars) ? previewVars.GetString() ?? "" : "";
                var scale = root.TryGetProperty("overlayScale", out var previewScale) && previewScale.ValueKind == JsonValueKind.Number && previewScale.TryGetDouble(out var scaleValue) && double.IsFinite(scaleValue) ? Math.Clamp(scaleValue, 0.75, 1.25) : 1;
                _previewEnabled = enabled;
                var generation = ++_previewGeneration;
                BeginInvoke(() => _ = ShowTradePreviewAsync(enabled, html, vars, scale, generation));
                return;
            }
            if (type == "overlay-hide")
            {
                BeginInvoke(() => _overlay?.HideOverlay());
                return;
            }
            if (type == "wealth-live")
            {
                var label = root.TryGetProperty("label", out var wealthLabel) ? wealthLabel.GetString() ?? "" : "";
                BeginInvoke(() => _launcher?.SetWealth(label));
                return;
            }
            if (type == "overlay-rate")
            {
                var chip = root.TryGetProperty("chip", out var chipEl) ? chipEl.GetString() ?? "" : "";
                var title = root.TryGetProperty("title", out var titleEl2) ? titleEl2.GetString() ?? "" : "";
                var wait = root.TryGetProperty("wait", out var waitEl) && waitEl.ValueKind == JsonValueKind.True;
                var limited = root.TryGetProperty("limited", out var limEl) && limEl.ValueKind == JsonValueKind.True;
                BeginInvoke(() => _overlay?.PostRate(chip, title, wait, limited));
                return;
            }
            if (type == "overlay-notice")
            {
                var text = root.TryGetProperty("text", out var textEl) ? textEl.GetString() ?? "" : "";
                var vars = root.TryGetProperty("vars", out var noticeVarsEl) ? noticeVarsEl.GetString() ?? "" : "";
                var clickAway = root.TryGetProperty("clickAway", out var noticeClickEl) && noticeClickEl.ValueKind == JsonValueKind.True;
                BeginInvoke(() => _ = ShowPriceOverlayAsync("", vars, text, false, clickAway));
                return;
            }
            if (type == "trade-stats")
            {
                var statsGame = root.TryGetProperty("game", out var statsGameEl) ? statsGameEl.GetString() ?? "" : "";
                await FetchTradeStats(id ?? "", statsGame);
                return;
            }
            if (type == "trade")
            {
                var league = root.TryGetProperty("league", out var leagueEl) ? leagueEl.GetString() ?? "" : "";
                var itemName = root.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
                var skipCache = root.TryGetProperty("bust", out var skipEl) && skipEl.ValueKind == JsonValueKind.True;
                var thorough = root.TryGetProperty("thorough", out var thoroughEl) && thoroughEl.ValueKind == JsonValueKind.True;
                var typeLine = root.TryGetProperty("typeLine", out var typeEl) ? typeEl.GetString() ?? "" : "";
                var rolls = new List<string>();
                if (root.TryGetProperty("rollsJson", out var rollsJsonEl) && rollsJsonEl.ValueKind == JsonValueKind.String)
                {
                    try
                    {
                        using var parsedRolls = JsonDocument.Parse(rollsJsonEl.GetString() ?? "[]");
                        if (parsedRolls.RootElement.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var roll in parsedRolls.RootElement.EnumerateArray())
                            {
                                var text = roll.ValueKind == JsonValueKind.String ? roll.GetString() : roll.ToString();
                                if (!string.IsNullOrWhiteSpace(text)) rolls.Add(text);
                            }
                        }
                    }
                    catch (JsonException)
                    {
                        /* fall back to rolls array */
                    }
                }
                if (rolls.Count == 0 && root.TryGetProperty("rolls", out var rollsEl) && rollsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var roll in rollsEl.EnumerateArray())
                    {
                        var text = roll.ValueKind == JsonValueKind.String ? roll.GetString() : roll.ToString();
                        if (!string.IsNullOrWhiteSpace(text)) rolls.Add(text);
                    }
                }
                var mapped = ReadPreMappedFilters(root);
                bool? corrupted = null;
                if (root.TryGetProperty("corrupted", out var corrEl))
                {
                    if (corrEl.ValueKind == JsonValueKind.True) corrupted = true;
                    else if (corrEl.ValueKind == JsonValueKind.False) corrupted = false;
                }
                var rarity = root.TryGetProperty("rarity", out var rarityEl) ? rarityEl.GetString() ?? "" : "";
                var rarityFilter = root.TryGetProperty("rarityFilter", out var rfEl) && rfEl.ValueKind == JsonValueKind.String ? rfEl.GetString() ?? "" : "";
                if (rarityFilter is not ("normal" or "magic" or "rare")) rarityFilter = "";
                var category = root.TryGetProperty("category", out var catEl) ? catEl.GetString() ?? "" : "";
                int? runeSockets = null;
                if (root.TryGetProperty("runeSockets", out var runeEl) && JsonInt(runeEl, out var runeN) && runeN is >= 0 and <= 6)
                    runeSockets = runeN;
                var ravenTouched = root.TryGetProperty("ravenTouched", out var ravenEl) && ravenEl.ValueKind == JsonValueKind.True;
                var exchange = root.TryGetProperty("exchange", out var xchgEl) && xchgEl.ValueKind == JsonValueKind.True;
                var havePref = root.TryGetProperty("have", out var haveEl) ? haveEl.GetString() ?? "" : "";
                bool? unidentified = null;
                if (root.TryGetProperty("unidentified", out var unidEl))
                {
                    if (unidEl.ValueKind == JsonValueKind.True) unidentified = true;
                    else if (unidEl.ValueKind == JsonValueKind.False) unidentified = false;
                }
                int? unidentifiedTier = null;
                if (root.TryGetProperty("unidentifiedTier", out var unidTierEl) && JsonInt(unidTierEl, out var unidTier) && unidTier > 0)
                    unidentifiedTier = unidTier;
                var exactBase = !(root.TryGetProperty("exactBase", out var exactEl) && exactEl.ValueKind == JsonValueKind.False);
                int? ilvlMin = null;
                if (root.TryGetProperty("ilvlMin", out var ilvlEl) && JsonInt(ilvlEl, out var ilvlN) && ilvlN is > 0 and <= 100)
                    ilvlMin = ilvlN;
                int? qualityMin = null;
                if (root.TryGetProperty("qualityMin", out var qualEl) && JsonInt(qualEl, out var qualN) && qualN is > 0 and <= 100)
                    qualityMin = qualN;
                var tradeGame = root.TryGetProperty("game", out var tradeGameEl) ? tradeGameEl.GetString() ?? "" : "";
                int? links = null;
                if (root.TryGetProperty("links", out var linksEl) && JsonInt(linksEl, out var linkN) && linkN is >= 0 and <= 6)
                    links = linkN;
                await FetchTradePrice(id ?? "", league, itemName, skipCache, thorough, typeLine, rolls, mapped, corrupted, rarity, runeSockets, category, ravenTouched, exchange, havePref, unidentified, unidentifiedTier, exactBase, ilvlMin, qualityMin, rarityFilter, tradeGame, links);
                return;
            }
            if (type == "poe1-session" && id is not null)
            {
                var signedIn = ReadPoe1Account().Length >= 2 && ReadPoe1Session().Length >= 8;
                Reply(id, true, 200, signedIn ? "{\"signedIn\":true}" : "{\"signedIn\":false}");
                return;
            }
            if (type == "poe1-login" && id is not null)
            {
                try
                {
                    var ok = await ShowPoe1Login();
                    Reply(id, ok, ok ? 200 : 400, ok ? "{\"ok\":true}" : "{\"error\":\"\"}");
                }
                catch (Exception ex)
                {
                    var message = ex.Message;
                    if (string.IsNullOrWhiteSpace(message) || message.Length > 180) message = "Sign-in could not open.";
                    Reply(id, false, 400, JsonSerializer.Serialize(new { error = message }));
                }
                return;
            }
            if (type == "wealth-stash" && id is not null)
            {
                var league = root.TryGetProperty("league", out var leagueEl) ? leagueEl.GetString() ?? "" : "";
                var account = root.TryGetProperty("account", out var accountEl) ? accountEl.GetString() ?? "" : "";
                var game = root.TryGetProperty("game", out var gameEl) ? gameEl.GetString() ?? "" : "";
                try
                {
                    var body = game == "poe1"
                        ? await LookupPoe1Wealth(league, Poe1TabPicks(root))
                        : await LookupWealthTabs(league, account, WealthJobs(root));
                    Reply(id, true, 200, body);
                }
                catch (Exception ex)
                {
                    Reply(id, false, 400, JsonSerializer.Serialize(new { error = ex.Message }));
                }
                return;
            }
            if (type == "wealth-snapshot")
            {
                BeginInvoke(CaptureWealthSnapshot);
                return;
            }
            if (type == "wealth-auto-config")
            {
                _wealthTabDetector = root.TryGetProperty("config", out var config)
                    ? WealthTabDetector.FromConfig(config) : null;
                _nextWealthTabCheck = 0;
                PushJson(new { type = "wealth-auto-status", active = _wealthTabDetector is not null });
                return;
            }
            if (type == "wealth-ocr" && id is not null)
            {
                try
                {
                    var result = await WealthCapture.ReadCountsAsync(root.GetProperty("crops"));
                    Reply(id, true, 200, result);
                }
                catch (Exception ex)
                {
                    Reply(id, false, 400, JsonSerializer.Serialize(new { error = ex.Message }));
                }
                return;
            }
            if (type == "backup-info")
            {
                Reply(id ?? "", true, 200, PlacesJson());
                return;
            }
            if (type == "backup-set")
            {
                var where = root.TryGetProperty("where", out var whereEl) ? whereEl.GetString() ?? "" : "";
                var replyId = id ?? "";
                BeginInvoke(() => SetBackupFolder(replyId, where));
                return;
            }
            if (type == "export")
            {
                var json = root.TryGetProperty("json", out var jsonEl) ? jsonEl.GetString() ?? "" : "";
                var replyId = id ?? "";
                BeginInvoke(() => SaveBackup(replyId, json));
                return;
            }
            if (type == "import")
            {
                var replyId = id ?? "";
                BeginInvoke(() => OpenBackup(replyId));
                return;
            }
            if (type != "ninja") return;
            var path = root.GetProperty("path").GetString() ?? "";
            var bust = root.TryGetProperty("bust", out var bustEl) && bustEl.ValueKind == JsonValueKind.True;
            if (id is null || !AllowedNinjaPath(path))
            {
                Reply(id ?? "", false, 400, "{\"error\":\"blocked\"}");
                return;
            }

            if (!bust && Cache.TryGetValue(path, out var hit) && DateTime.UtcNow - hit.at < CacheFor)
            {
                Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
                return;
            }

            await Gate.WaitAsync();
            try
            {
                if (!bust && Cache.TryGetValue(path, out hit) && DateTime.UtcNow - hit.at < CacheFor)
                {
                    Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
                    return;
                }

                if (!Uri.TryCreate("https://poe.ninja" + path, UriKind.Absolute, out var uri))
                {
                    Reply(id, false, 400, "{\"error\":\"bad path\"}");
                    return;
                }

                using var res = await Http.GetAsync(uri);
                var body = await res.Content.ReadAsStringAsync();
                var status = (int)res.StatusCode;
                var trimmed = body.TrimStart();
                var looksJson = trimmed.StartsWith('{') || trimmed.StartsWith('[');
                if (res.IsSuccessStatusCode && looksJson)
                    Cache[path] = (DateTime.UtcNow, status, body);
                Reply(id, res.IsSuccessStatusCode && looksJson, status, looksJson ? body : "{\"error\":\"poe.ninja returned a non-JSON page\"}");
            }
            finally
            {
                Gate.Release();
            }
        }
        catch (Exception ex)
        {
            Reply(id ?? "", false, 0, JsonSerializer.Serialize(new { error = ex.Message }));
        }
    }

    void Reply(string id, bool ok, int status, string body)
    {
        if (_web.CoreWebView2 is null) return;
        var wait = CombinedWaitMs();
        var ready = DateTime.UtcNow.AddMilliseconds(wait);
        var snap = SearchLimit.Snapshot();
        var payload = JsonSerializer.Serialize(new
        {
            id,
            ok,
            status,
            body,
            rate = RatePayload(wait, ready, SearchLimit.Limited || FetchLimit.Limited || ExchangeLimit.Limited, snap),
        });
        _web.CoreWebView2.PostWebMessageAsJson(payload);
    }

    void PushRate()
    {
        if (_web.CoreWebView2 is null) return;
        var wait = CombinedWaitMs();
        var ready = DateTime.UtcNow.AddMilliseconds(wait);
        var snap = SearchLimit.Snapshot();
        var payload = JsonSerializer.Serialize(new
        {
            type = "rate-limit",
            rate = RatePayload(wait, ready, SearchLimit.Limited || FetchLimit.Limited || ExchangeLimit.Limited, snap),
        });
        _web.CoreWebView2.PostWebMessageAsJson(payload);
    }

    object RatePayload(int waitMs, DateTime readyAt, bool limited, (int hits, int max, int window) snap)
    {
        var readyMs = new DateTimeOffset(DateTime.SpecifyKind(readyAt, DateTimeKind.Utc)).ToUnixTimeMilliseconds();
        return new
        {
            waitMs,
            readyAt = readyMs,
            hits = snap.hits,
            max = snap.max,
            window = snap.window,
            limited,
        };
    }

    static int CombinedWaitMs() => Math.Max(SearchLimit.WaitMs(), Math.Max(FetchLimit.WaitMs(), ExchangeLimit.WaitMs()));

    async Task<bool> WaitForSlot(TradeLimiter limiter)
    {
        await SlotLock.WaitAsync();
        try
        {
            while (true)
            {
                var wait = limiter.WaitMs();
                if (wait <= 0)
                {
                    limiter.Borrow();
                    PushRate();
                    return true;
                }
                // Wait out PoE windows/penalties instead of failing early.
                if (wait > 180_000) return false;
                PushRate();
                SlotLock.Release();
                try { await Task.Delay(Math.Min(Math.Max(wait, 50), 750)); }
                finally { await SlotLock.WaitAsync(); }
            }
        }
        finally
        {
            SlotLock.Release();
        }
    }

    void NoteRate(HttpResponseMessage res, TradeLimiter limiter)
    {
        AdjustLimiter(limiter, res);
        if ((int)res.StatusCode == 429 && limiter.WaitMs() == 0)
            limiter.PenaltyUntil = DateTime.UtcNow.AddSeconds(5);
        PushRate();
    }

    static void AdjustLimiter(TradeLimiter limiter, HttpResponseMessage res)
    {
        string Header(string name)
        {
            if (res.Headers.TryGetValues(name, out var values))
                return string.Join(",", values);
            foreach (var header in res.Headers)
            {
                if (string.Equals(header.Key, name, StringComparison.OrdinalIgnoreCase))
                    return string.Join(",", header.Value);
            }
            return "";
        }

        var retry = RetryAfterMs(res) ?? 0;
        var rulesRaw = Header("x-rate-limit-rules");
        var rules = rulesRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (rules.Length == 0)
        {
            if (retry > 0) limiter.PenaltyUntil = DateTime.UtcNow.AddMilliseconds(retry);
            return;
        }

        var incoming = new List<(int max, double window, int used, int penalty)>();
        foreach (var rule in rules)
        {
            var limits = Header("x-rate-limit-" + rule).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var states = Header("x-rate-limit-" + rule + "-state").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (limits.Length == 0)
            {
                // Rule names are usually Ip/Account; retry lowercase once like GGG docs.
                limits = Header("x-rate-limit-" + rule.ToLowerInvariant()).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                states = Header("x-rate-limit-" + rule.ToLowerInvariant() + "-state").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            }
            for (var i = 0; i < limits.Length; i++)
            {
                var capParts = limits[i].Split(':');
                var stateParts = i < states.Length ? states[i].Split(':') : Array.Empty<string>();
                if (capParts.Length < 2) continue;
                if (!int.TryParse(capParts[0], out var cap) || !int.TryParse(capParts[1], out var period)) continue;
                int.TryParse(stateParts.Length > 0 ? stateParts[0] : "0", out var used);
                int.TryParse(stateParts.Length > 2 ? stateParts[2] : "0", out var penalty);
                incoming.Add((cap, period + RateDesyncSec, used, penalty));
            }
        }

        if (incoming.Count == 0)
        {
            if (retry > 0) limiter.PenaltyUntil = DateTime.UtcNow.AddMilliseconds(retry);
            return;
        }

        // Drop bootstrap / stale buckets (EE2 destroy), then add/sync server rules.
        limiter.Limits.RemoveAll(limit => !incoming.Any(row => limit.Same(row.max, row.window)));
        foreach (var row in incoming)
        {
            var limit = limiter.Limits.Find(item => item.Same(row.max, row.window));
            if (limit is null)
            {
                limit = new SlidingLimit(row.max, row.window);
                limiter.Limits.Add(limit);
            }
            limit.SyncUsed(row.used);
            if (row.penalty > 0)
                limiter.PenaltyUntil = DateTime.UtcNow.AddSeconds(row.penalty);
        }
        if (limiter.Limits.Count == 0)
            limiter.Limits.Add(new SlidingLimit(incoming[0].max, incoming[0].window));
        if (retry > 0)
            limiter.PenaltyUntil = DateTime.UtcNow.AddMilliseconds(Math.Max(retry, limiter.Limited ? (limiter.PenaltyUntil - DateTime.UtcNow).TotalMilliseconds : 0));
    }

    async Task OpenGuideBrowserAsync(string url)
    {
        if (!GuideBrowserHost.AllowedGuideUrl(url)) return;
        _guideBrowser ??= CreateGuideBrowser();
        if (!Controls.Contains(_guideBrowser)) Controls.Add(_guideBrowser);
        await _guideBrowser.OpenAsync(url, AppDataDir());
    }

    GuideBrowserHost CreateGuideBrowser()
    {
        var host = new GuideBrowserHost();
        host.Closed += () =>
        {
            _web.Visible = true;
            _web.BringToFront();
            try
            {
                _web.Focus();
                SendMessage(Handle, 0x127, (IntPtr)0x10001, IntPtr.Zero); // Hide mouse-triggered focus cues.
                SendMessage(_web.Handle, 0x127, (IntPtr)0x10001, IntPtr.Zero);
                BeginInvoke(() => PushJson(new { type = "browser-returned" }));
            }
            catch { /* ignore */ }
        };
        host.MinimizeRequested += () => WindowState = FormWindowState.Minimized;
        host.MaximizeRequested += () =>
        {
            WindowState = WindowState == FormWindowState.Maximized
                ? FormWindowState.Normal
                : FormWindowState.Maximized;
        };
        host.QuitRequested += Close;
        host.DragRequested += DragWindow;
        return host;
    }

    static bool AllowedOpenHost(string host) => AllowedGuideHost(host);

    /// <summary>Hosts allowed for Guides in-app browser and open-url.</summary>
    internal static bool AllowedGuideHost(string host)
    {
        if (string.IsNullOrWhiteSpace(host)) return false;
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "pathofexile.com",
            "www.pathofexile.com",
            "poe.ninja",
            "www.poe.ninja",
            "poe2wiki.net",
            "www.poe2wiki.net",
            "poe2db.tw",
            "www.poe2db.tw",
            "pathofbuilding.community",
            "www.pathofbuilding.community",
            "maxroll.gg",
            "www.maxroll.gg",
            "mobalytics.gg",
            "www.mobalytics.gg",
            "github.com",
            "www.github.com",
            "craftofexile.com", "www.craftofexile.com", "beta.craftofexile.com", "poe2.re", "www.poe2.re",
            "poewiki.net", "www.poewiki.net", "poedb.tw", "www.poedb.tw", "poe.re", "www.poe.re",
            "youtube.com", "www.youtube.com", "youtu.be",
        };
        if (allowed.Contains(host)) return true;
        foreach (var root in new[]
                 {
                     "maxroll.gg", "mobalytics.gg", "poe.ninja", "poe2wiki.net", "poe2db.tw",
                     "pathofbuilding.community", "pathofexile.com", "github.com", "craftofexile.com", "poe2.re",
                     "poewiki.net", "poedb.tw", "poe.re",
                 })
        {
            if (host.EndsWith("." + root, StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    static void OpenTradeUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return;
        if (!uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return;
        var host = uri.Host;
        var path = uri.AbsolutePath;
        if (host.Equals("github.com", StringComparison.OrdinalIgnoreCase)
            || host.Equals("www.github.com", StringComparison.OrdinalIgnoreCase))
        {
            if (!path.StartsWith("/Shawn25678/SSEv1/", StringComparison.OrdinalIgnoreCase)) return;
        }
        else if (!AllowedGuideHost(host)) return;
        Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
    }

    static string AppDataDir()
    {
        // start.bat sets this so test runs do not write the folder an install uses.
        var over = Environment.GetEnvironmentVariable("SSE_APPDATA");
        var dir = string.IsNullOrWhiteSpace(over)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ExileLedger")
            : Environment.ExpandEnvironmentVariables(over.Trim().Trim('"'));
        EnsureDirectory(dir);
        return dir;
    }

    static void EnsureDirectory(string dir)
    {
        if (File.Exists(dir)) File.Delete(dir);
        Directory.CreateDirectory(dir);
    }

    static string LastBackupFolderFile() => Path.Combine(AppDataDir(), "json-folder.txt");

    static bool SamePath(string a, string b)
    {
        try
        {
            return string.Equals(
                Path.TrimEndingDirectorySeparator(Path.GetFullPath(a)),
                Path.TrimEndingDirectorySeparator(Path.GetFullPath(b)),
                StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    static string DownloadsFolder()
    {
        var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
        if (Directory.Exists(dir)) return dir;
        dir = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
        return Directory.Exists(dir) ? dir : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    }

    static string InstallDir()
    {
        var path = Environment.ProcessPath;
        var dir = !string.IsNullOrWhiteSpace(path) ? Path.GetDirectoryName(path) : AppContext.BaseDirectory;
        return string.IsNullOrWhiteSpace(dir) ? AppDataDir() : dir;
    }

    static bool IsOldDefaultFolder(string saved)
    {
        string Root(Environment.SpecialFolder folder)
        {
            var dir = Environment.GetFolderPath(folder);
            return Directory.Exists(dir) ? dir : "";
        }
        var docs = Root(Environment.SpecialFolder.MyDocuments);
        var desk = Root(Environment.SpecialFolder.DesktopDirectory);
        var downs = DownloadsFolder();
        foreach (var root in new[] { docs, desk, downs })
        {
            if (string.IsNullOrWhiteSpace(root)) continue;
            if (SamePath(saved, root)) return true;
            if (SamePath(saved, Path.Combine(root, "SSE"))) return true;
        }
        if (SamePath(saved, Path.Combine(InstallDir(), "json"))) return true;
        if (SamePath(saved, Path.Combine(AppDataDir(), "json"))) return true;
        return false;
    }

    static string? CustomBackupFolder()
    {
        foreach (var file in new[] { LastBackupFolderFile(), Path.Combine(AppDataDir(), "last-backup-folder.txt") })
    {
        try
        {
                if (!File.Exists(file)) continue;
                var saved = File.ReadAllText(file).Trim();
                if (string.IsNullOrWhiteSpace(saved) || !Directory.Exists(saved)) continue;
                if (IsOldDefaultFolder(saved)) continue;
                return saved;
        }
        catch
        {
                /* try the next settings file */
        }
        }
        return null;
    }

    static string LastBackupFolder() => CustomBackupFolder() ?? DownloadsFolder();

    static void RememberFolder(string folder)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(folder) && Directory.Exists(folder))
                File.WriteAllText(LastBackupFolderFile(), folder);
        }
        catch
        {
            /* keep the previous remembered folder */
        }
    }

    static string PlacesJson(bool cancelled = false, string? path = null, string? json = null)
    {
        return JsonSerializer.Serialize(new
        {
            cancelled,
            path = path ?? "",
            json = json ?? "",
            folder = LastBackupFolder(),
            downloads = DownloadsFolder(),
        });
    }

    string? PickBackupFolder()
    {
        using var dlg = new FolderBrowserDialog
        {
            Description = "Choose default save folder",
            UseDescriptionForTitle = true,
            SelectedPath = LastBackupFolder(),
            ShowNewFolderButton = true,
        };
        return ShowOwned(dlg) == DialogResult.OK ? dlg.SelectedPath : null;
    }

    DialogResult ShowOwned(CommonDialog dlg)
    {
        var wasTop = TopMost;
        Activate();
        BringToFront();
        TopMost = true;
        var webOn = _web.Enabled;
        _web.Enabled = false;
        try
        {
            return dlg.ShowDialog(this);
        }
        finally
        {
            _web.Enabled = webOn;
            TopMost = wasTop;
            Activate();
        }
    }

    static string UniqueBackupPath(string folder)
    {
        var date = DateTime.Now.ToString("yyyy-MM-dd");
        var path = Path.Combine(folder, $"still-sane-exile-{date}.json");
        if (!File.Exists(path)) return path;
        return Path.Combine(folder, $"still-sane-exile-{DateTime.Now:yyyy-MM-dd-HHmmss}.json");
    }

    void SetBackupFolder(string id, string where)
    {
        try
        {
            var folder = PickBackupFolder();
                if (folder is null)
                {
                    Reply(id, true, 200, PlacesJson(cancelled: true));
                    return;
                }
            Directory.CreateDirectory(folder);
            RememberFolder(folder);
            Reply(id, true, 200, PlacesJson());
        }
        catch (Exception ex)
        {
            Reply(id, false, 0, JsonSerializer.Serialize(new { error = ex.Message }));
        }
    }

    void SaveBackup(string id, string json)
    {
        try
        {
            var folder = LastBackupFolder();
            Directory.CreateDirectory(folder);
            var path = UniqueBackupPath(folder);
            File.WriteAllText(path, json);
            Reply(id, true, 200, PlacesJson(path: path));
        }
        catch (Exception ex)
        {
            Reply(id, false, 0, JsonSerializer.Serialize(new { error = ex.Message }));
        }
    }

    void OpenBackup(string id)
    {
        try
        {
            using var dlg = new OpenFileDialog
            {
                Title = "Import backup",
                Filter = "JSON backup (*.json)|*.json|All files (*.*)|*.*",
                InitialDirectory = LastBackupFolder(),
                RestoreDirectory = true,
                CheckFileExists = true,
            };
            if (ShowOwned(dlg) != DialogResult.OK)
            {
                Reply(id, true, 200, PlacesJson(cancelled: true));
                return;
            }
            var text = File.ReadAllText(dlg.FileName);
            Reply(id, true, 200, PlacesJson(path: dlg.FileName, json: text));
        }
        catch (Exception ex)
        {
            Reply(id, false, 0, JsonSerializer.Serialize(new { error = ex.Message }));
        }
    }

    static void DropUnusedJsonFolder()
    {
        foreach (var dir in new[] { Path.Combine(InstallDir(), "json"), Path.Combine(AppDataDir(), "json") })
        {
            try
            {
                if (!Directory.Exists(dir)) continue;
                if (Directory.EnumerateFileSystemEntries(dir).Any()) continue;
                Directory.Delete(dir);
            }
            catch
            {
                /* leftover json folder is unused */
            }
        }
    }

    static string ExtractStamp()
    {
        var exe = Environment.ProcessPath ?? "";
        var ticks = 0L;
        try
        {
            if (File.Exists(exe)) ticks = File.GetLastWriteTimeUtc(exe).Ticks;
        }
        catch
        {
            /* stamp without exe time */
        }
        return AppUpdate.CurrentLabel() + ":" + ticks;
    }

    static string ExtractWebFiles()
    {
        var dir = Path.Combine(AppDataDir(), "www");
        EnsureDirectory(dir);
        var index = Path.Combine(dir, "index.html");
        var leftoverSigil = Path.Combine(dir, "poe2-sigil.png");
        if (File.Exists(leftoverSigil)) File.Delete(leftoverSigil);
        var stampPath = Path.Combine(dir, ".stamp");
        var want = ExtractStamp();
        var needed = new[]
        {
            "index.html", "overlay.html", "overlay.css", "styles.css", "app.js", "affix-ladders.js",
            "bosses.js", "guides.js", "icons.js", "still-sane-sigil.png",
        };
        if (File.Exists(stampPath)
            && needed.All(name => File.Exists(Path.Combine(dir, name)))
            && Directory.Exists(Path.Combine(dir, "art"))
            && File.ReadAllText(stampPath) == want)
            return index;

        var asm = Assembly.GetExecutingAssembly();
        Directory.CreateDirectory(Path.Combine(dir, "fonts"));
        foreach (var fontFile in new[] { "Inter-Regular.ttf", "Inter-Bold.ttf", "LICENSE.txt" })
            WriteResource(asm, "www.fonts." + fontFile, Path.Combine(dir, "fonts", fontFile), skipUnchanged: true);
        WriteResource(asm, "www.index.html", index);
        WriteResource(asm, "www.overlay.html", Path.Combine(dir, "overlay.html"));
        WriteResource(asm, "www.overlay.css", Path.Combine(dir, "overlay.css"));
        WriteResource(asm, "www.styles.css", Path.Combine(dir, "styles.css"));
        WriteResource(asm, "www.app.js", Path.Combine(dir, "app.js"));
        WriteResource(asm, "www.affix-ladders.js", Path.Combine(dir, "affix-ladders.js"), skipUnchanged: true);
        WriteResource(asm, "www.bosses.js", Path.Combine(dir, "bosses.js"));
        WriteResource(asm, "www.guides.js", Path.Combine(dir, "guides.js"));
        WriteResource(asm, "www.icons.js", Path.Combine(dir, "icons.js"), skipUnchanged: true);
        WriteResource(asm, "www.still-sane-sigil.png", Path.Combine(dir, "still-sane-sigil.png"), skipUnchanged: true);
        // Drop retired Stacked Deck scripts if an older extract left them behind
        foreach (var stale in new[] { "decks.js", "deck-game.js" })
        {
            var path = Path.Combine(dir, stale);
            if (File.Exists(path)) File.Delete(path);
        }
        var artDir = Path.Combine(dir, "art");
        EnsureDirectory(artDir);
        var artStampPath = Path.Combine(dir, ".art-stamp");
        const string artStamp = "art-2026-11-13";
        var artReady = false;
        try
        {
            artReady = File.Exists(artStampPath)
                && File.ReadAllText(artStampPath) == artStamp
                && Directory.Exists(artDir)
                && Directory.GetFiles(artDir, "*", SearchOption.AllDirectories).Length >= 40;
        }
        catch { /* rewrite the art set */ }
        if (!artReady)
        {
            var installArt = Path.Combine(InstallDir(), "art");
            if (ArtFolderReady(installArt))
                LinkInstalledArt(artDir, installArt, artStampPath, artStamp);
            else
            {
                var keep = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var name in asm.GetManifestResourceNames())
                {
                    const string prefix = "www.art.";
                    if (!name.StartsWith(prefix, StringComparison.Ordinal)) continue;
                    var rel = name[prefix.Length..].Replace('/', Path.DirectorySeparatorChar);
                    keep.Add(rel.Replace('\\', '/'));
                    var dest = Path.Combine(artDir, rel);
                    var parent = Path.GetDirectoryName(dest);
                    if (!string.IsNullOrEmpty(parent)) EnsureDirectory(parent);
                    WriteResource(asm, name, dest, skipUnchanged: true);
                }
                if (keep.Count > 0)
                {
                    foreach (var file in Directory.GetFiles(artDir, "*", SearchOption.AllDirectories))
                    {
                        var rel = Path.GetRelativePath(artDir, file).Replace('\\', '/');
                        if (!keep.Contains(rel)) File.Delete(file);
                    }
                    File.WriteAllText(artStampPath, artStamp);
                }
            }
        }
        File.WriteAllText(stampPath, want);
        return index;
    }

    static bool ArtFolderReady(string dir)
    {
        try
        {
            return Directory.Exists(dir)
                && Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories).Take(40).Count() >= 40;
        }
        catch
        {
            return false;
        }
    }

    static void LinkInstalledArt(string artDir, string installArt, string stampPath, string stamp)
    {
        var ready = 0;
        foreach (var src in Directory.EnumerateFiles(installArt, "*", SearchOption.AllDirectories))
        {
            var dest = Path.Combine(artDir, Path.GetRelativePath(installArt, src));
            var parent = Path.GetDirectoryName(dest);
            if (!string.IsNullOrEmpty(parent)) EnsureDirectory(parent);
            if (File.Exists(dest))
            {
                ready++;
                continue;
            }
            if (CreateHardLink(dest, src, IntPtr.Zero))
            {
                ready++;
                continue;
            }
            try
            {
                File.Copy(src, dest, false);
                ready++;
            }
            catch
            {
                /* try the rest of the set */
            }
        }
        if (ready >= 40) File.WriteAllText(stampPath, stamp);
    }

    static readonly Regex IconWithName = new(
        "\"icon\"\\s*:\\s*\"(https://web\\.poecdn\\.com/gen/image/[^\"]+)\"[\\s\\S]{0,600}?\"name\"\\s*:\\s*\"([^\"]+)\"",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);
    static readonly Regex AnyCdnIcon = new(
        @"https://web\.poecdn\.com/gen/image/[A-Za-z0-9_\-/=]+",
        RegexOptions.Compiled);
    static readonly Regex HtmlExplicit = new(
        @"<div class=""explicitMod"">(.*?)</div>",
        RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);
    static readonly Regex HtmlHelp = new(
        @"class=""default fst-italic"">\s*([^<]+)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);
    static readonly Regex HtmlFlavour = new(
        @"class=""FlavourText"">(.*?)</div>",
        RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);

    static string ItemSlug(string name)
    {
        var slug = Regex.Replace(name ?? "", @"['’`]", "");
        slug = Regex.Replace(slug, @"[^A-Za-z0-9]+", "_").Trim('_');
        return slug;
    }

    static IEnumerable<string> ItemSlugs(string name)
    {
        var primary = ItemSlug(name);
        if (string.IsNullOrWhiteSpace(primary)) yield break;
        yield return primary;
        if (!primary.StartsWith("The_", StringComparison.OrdinalIgnoreCase))
            yield return "The_" + primary;
        var parts = primary.Split('_', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2 && parts[0].Equals("The", StringComparison.OrdinalIgnoreCase))
            yield return string.Join("_", parts.Skip(1));
        if (parts.Length >= 2)
        {
            var idx = parts[0].Equals("The", StringComparison.OrdinalIgnoreCase) ? 1 : 0;
            if (idx < parts.Length - 1 &&
                parts[idx + 1].Equals("Reliquary", StringComparison.OrdinalIgnoreCase) &&
                !parts[idx].EndsWith("s", StringComparison.OrdinalIgnoreCase))
            {
                parts[idx] += "s";
                var possessive = string.Join("_", parts);
                yield return possessive;
                if (!possessive.StartsWith("The_", StringComparison.OrdinalIgnoreCase))
                    yield return "The_" + possessive;
            }
        }
    }

    static string PickCdnIcon(string html)
    {
        var urls = AnyCdnIcon.Matches(html)
            .Select(m => m.Value.Replace("\\/", "/"))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var prefer = urls.FirstOrDefault(u =>
            u.Contains("Reliquary", StringComparison.OrdinalIgnoreCase) ||
            u.Contains("TwilightOrder", StringComparison.OrdinalIgnoreCase) ||
            u.Contains("/Uniques/", StringComparison.OrdinalIgnoreCase) ||
            u.Contains("/Maps/", StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(prefer)) return prefer;
        var fromList = urls.FirstOrDefault(u =>
            !u.Contains("CurrencyModValues", StringComparison.OrdinalIgnoreCase) &&
            !u.Contains("CurrencyAddModToRare", StringComparison.OrdinalIgnoreCase)) ?? "";
        if (!string.IsNullOrWhiteSpace(fromList)) return fromList;
        var art = Regex.Match(html, @"Art/2DItems/[A-Za-z0-9_./-]+", RegexOptions.IgnoreCase);
        if (!art.Success) return "";
        var path = art.Value.Replace("\\", "/");
        path = Regex.Replace(path, @"\.(webp|png|jpg|jpeg)$", "", RegexOptions.IgnoreCase);
        return "https://cdn.poe2db.tw/image/" + path + ".webp";
    }

    static string ReadHtmlFlavour(string html)
    {
        var m = HtmlFlavour.Match(html);
        if (!m.Success) return "";
        var text = m.Groups[1].Value.Replace("<br/>", "\n").Replace("<br />", "\n").Replace("<br>", "\n");
        return StripTags(text);
    }

    static bool FoldEquals(string a, string b)
    {
        static string Fold(string value) =>
            Regex.Replace(value.ToLowerInvariant(), @"['’`\d]", "");
        return Fold(a) == Fold(b);
    }

    static readonly Regex PoedbItemIcon = new(
        "class=\"itemboximage\"[\\s\\S]{0,600}?src=\"(https://cdn\\.poedb\\.tw/image/Art/2DItems/[^\"]+)\"",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    async Task FetchPoedbIcon(string id, string name)
    {
        var slugs = ItemSlugs(name)
            .Where(s => s.Length is >= 2 and <= 80)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (string.IsNullOrWhiteSpace(id) || slugs.Count == 0)
        {
            Reply(id ?? "", false, 400, "{\"icon\":\"\"}");
            return;
        }
        var cacheKey = "poedb-item-v1:" + ItemSlug(name).ToLowerInvariant();
        if (Cache.TryGetValue(cacheKey, out var hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12))
        {
            Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
            return;
        }
        await Gate.WaitAsync();
        try
        {
            if (Cache.TryGetValue(cacheKey, out hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12))
            {
                Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
                return;
            }
            foreach (var slug in slugs)
            {
                if (!Uri.TryCreate("https://poedb.tw/us/" + slug, UriKind.Absolute, out var uri)) continue;
                using var res = await Http.GetAsync(uri);
                if (!res.IsSuccessStatusCode) continue;
                var html = await res.Content.ReadAsStringAsync();
                var icon = PoedbItemIcon.Match(html);
                if (!icon.Success) continue;
                var body = JsonSerializer.Serialize(new { icon = icon.Groups[1].Value }, JsonOut);
                Cache[cacheKey] = (DateTime.UtcNow, 200, body);
                Reply(id, true, 200, body);
                return;
            }
            Reply(id, false, 404, "{\"icon\":\"\"}");
        }
        finally
        {
            Gate.Release();
        }
    }

    async Task FetchPoe2DbIcon(string id, string name)
    {
        var slugs = ItemSlugs(name)
            .Where(s => s.Length is >= 2 and <= 80)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        if (string.IsNullOrWhiteSpace(id) || slugs.Count == 0)
        {
            Reply(id ?? "", false, 400, "{\"icon\":\"\"}");
            return;
        }
        var cacheKey = "poe2db-item-v5:" + ItemSlug(name).ToLowerInvariant();
        if (Cache.TryGetValue(cacheKey, out var hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12))
        {
            Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
            return;
        }

        await Gate.WaitAsync();
        try
        {
            if (Cache.TryGetValue(cacheKey, out hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12))
            {
                Reply(id, hit.status is >= 200 and < 300, hit.status, hit.body);
                return;
            }
            foreach (var slug in slugs)
            {
                if (!Uri.TryCreate("https://poe2db.tw/us/" + slug, UriKind.Absolute, out var uri)) continue;
                using var res = await Http.GetAsync(uri);
                if (!res.IsSuccessStatusCode) continue;
                var html = await res.Content.ReadAsStringAsync();
                var payload = ParsePoe2DbItem(html, name);
                var ok = !string.IsNullOrWhiteSpace(payload.icon) || payload.explicits.Length > 0 || payload.variants.Length > 0 || !string.IsNullOrWhiteSpace(payload.descr) || !string.IsNullOrWhiteSpace(payload.flavour);
                if (!ok) continue;
                var body = JsonSerializer.Serialize(payload, JsonOut);
                Cache[cacheKey] = (DateTime.UtcNow, 200, body);
                Reply(id, true, 200, body);
                return;
            }
            Reply(id, false, 404, "{\"icon\":\"\"}");
        }
        finally
        {
            Gate.Release();
        }
    }

    sealed record Poe2DbItem(
        string icon,
        string name,
        string baseType,
        string rarity,
        string[] implicits,
        string[] explicits,
        string flavour,
        string descr,
        string[] properties,
        string[] variants,
        string variantNote,
        bool complete = false);

    static Poe2DbItem ParsePoe2DbItem(string html, string name)
    {
        var variants = ReadVariantMods(html);
        var variantNote = ReadVariantNote(html);
        if (TryReadItemCard(html, name, out var card))
        {
            var icon = card.TryGetProperty("icon", out var iconEl) ? iconEl.GetString() ?? "" : "";
            var baseType = card.TryGetProperty("baseType", out var baseEl) ? baseEl.GetString() ?? "" : "";
            if (string.IsNullOrWhiteSpace(baseType) && card.TryGetProperty("typeLine", out var typeEl))
                baseType = typeEl.GetString() ?? "";
            var rarity = card.TryGetProperty("rarity", out var rarityEl) ? rarityEl.GetString() ?? "" : "";
            var flavour = JoinFlavour(card);
            if (string.IsNullOrWhiteSpace(flavour)) flavour = ReadHtmlFlavour(html);
            var descr = card.TryGetProperty("descrText", out var descrEl) ? descrEl.GetString() ?? "" : "";
            if (string.IsNullOrWhiteSpace(descr) && HtmlHelp.IsMatch(html)) descr = StripTags(HtmlHelp.Match(html).Groups[1].Value);
            var resolvedIcon = icon.Replace("\\/", "/");
            if (string.IsNullOrWhiteSpace(resolvedIcon) || resolvedIcon.Contains("CurrencyModValues", StringComparison.OrdinalIgnoreCase))
                resolvedIcon = PickCdnIcon(html);
            var props = ReadProperties(card);
            var fixedMods = ReadStringArray(card, "explicitMods");
            return new Poe2DbItem(
                resolvedIcon,
                card.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? name : name,
                baseType,
                rarity,
                ReadStringArray(card, "implicitMods"),
                fixedMods,
                flavour,
                descr,
                props,
                variants,
                variantNote,
                true);
        }

        // Pages can include alternate forms and other item popups. Read only the
        // first matching item card, preserving all of its properties and modifiers.
        foreach (var popup in HtmlDivs(html, "newItemPopup"))
        {
            var names = HtmlDivs(popup.body, "itemName").Select(p => StripTags(p.body)).ToArray();
            if (names.Length == 0 || !FoldEquals(names[0], name)) continue;
            var rarity = new[] { "Unique", "Currency", "Rare", "Magic", "Normal", "Gem" }
                .FirstOrDefault(kind => popup.classes.Contains(kind + "Popup", StringComparer.OrdinalIgnoreCase)) ?? "Item";
            string[] Lines(string cls) => HtmlDivs(popup.body, cls).Select(p => StripTags(p.body))
                .Where(v => v.Length > 0).Distinct().ToArray();
            var help = HtmlDivs(popup.body, "default").Where(p => p.classes.Contains("fst-italic"))
                .Select(p => StripTags(p.body));
            return new Poe2DbItem(PickCdnIcon(popup.body) is { Length: > 0 } icon ? icon : PickCdnIcon(html),
                names[0], names.Last(), rarity, Lines("implicitMod"), Lines("explicitMod"),
                string.Join("\n", Lines("FlavourText")), string.Join("\n", help), Lines("property"),
                variants, ReadVariantNote(popup.body), true);
        }
        return new Poe2DbItem(PickCdnIcon(html), name, "", "", [], [], "", "", [], [], "");
    }

    static IEnumerable<(string body, string[] classes)> HtmlDivs(string html, string className)
    {
        var tags = Regex.Matches(html, @"</?div\b[^>]*>", RegexOptions.IgnoreCase);
        for (var i = 0; i < tags.Count; i++)
        {
            var tag = tags[i];
            if (tag.Value.StartsWith("</", StringComparison.Ordinal)) continue;
            var attr = Regex.Match(tag.Value, @"\bclass\s*=\s*['""]([^'""]*)['""]", RegexOptions.IgnoreCase);
            var classes = Regex.Split(attr.Groups[1].Value.Trim(), @"\s+");
            if (!classes.Contains(className, StringComparer.OrdinalIgnoreCase)) continue;
            var depth = 1;
            for (var j = i + 1; j < tags.Count; j++)
            {
                depth += tags[j].Value.StartsWith("</", StringComparison.Ordinal) ? -1 : 1;
                if (depth != 0) continue;
                yield return (html[(tag.Index + tag.Length)..tags[j].Index], classes);
                i = j;
                break;
            }
        }
    }

    static string[] ReadVariantMods(string html)
    {
        var list = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        void Add(string raw)
        {
            var text = Regex.Replace(StripTags(raw), @"\s+", " ").Trim();
            text = Regex.Replace(text, @"\s+Elemental Fire Cold Lightning Resistance$", "", RegexOptions.IgnoreCase);
            if (text.Length is < 12 or > 140) return;
            if (!Regex.IsMatch(text, @"per Socket", RegexOptions.IgnoreCase)) return;
            if (seen.Add(text)) list.Add(text);
        }

        var at = html.IndexOf("Modifiers /", StringComparison.OrdinalIgnoreCase);
        if (at >= 0)
        {
            var slice = html.Substring(at, Math.Min(12000, html.Length - at));
            foreach (Match td in Regex.Matches(slice, @"<td[^>]*>(.*?)</td>", RegexOptions.Singleline | RegexOptions.IgnoreCase))
                Add(td.Groups[1].Value);
        }
        if (list.Count == 0)
        {
            foreach (Match m in HtmlExplicit.Matches(html)) Add(m.Groups[1].Value);
        }
        return [.. list];
    }

    static string ReadVariantNote(string html)
    {
        var m = Regex.Match(html, @"\[(\d+)\s+Random ([^\]]+)\]", RegexOptions.IgnoreCase);
        return m.Success ? $"{m.Groups[1].Value} random {m.Groups[2].Value.Trim()}" : "";
    }

    static string[] ReadStringArray(JsonElement card, string prop)
    {
        if (!card.TryGetProperty(prop, out var el) || el.ValueKind != JsonValueKind.Array) return [];
        return el.EnumerateArray().Select(v => v.GetString() ?? "").Where(v => v.Length > 0).ToArray();
    }

    static string JoinFlavour(JsonElement card)
    {
        if (!card.TryGetProperty("flavourText", out var el)) return "";
        if (el.ValueKind == JsonValueKind.String) return (el.GetString() ?? "").Replace("\r", "").Trim();
        if (el.ValueKind != JsonValueKind.Array) return "";
        return string.Join("\n", el.EnumerateArray().Select(v => (v.GetString() ?? "").Replace("\r", "").Trim()).Where(v => v.Length > 0));
    }

    static string[] ReadProperties(JsonElement card)
    {
        if (!card.TryGetProperty("properties", out var el) || el.ValueKind != JsonValueKind.Array) return [];
        var list = new List<string>();
        foreach (var prop in el.EnumerateArray())
        {
            var label = prop.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
            label = Regex.Replace(label, @"\[([^\]|]+)\|([^\]]+)\]", "$2");
            label = Regex.Replace(label, @"\[([^\]]+)\]", "$1");
            if (string.IsNullOrWhiteSpace(label)) continue;
            if (prop.TryGetProperty("values", out var values) && values.ValueKind == JsonValueKind.Array && values.GetArrayLength() > 0)
            {
                var first = values[0];
                if (first.ValueKind == JsonValueKind.Array && first.GetArrayLength() > 0)
                {
                    var num = first[0].ValueKind == JsonValueKind.String ? first[0].GetString() : first[0].ToString();
                    if (!string.IsNullOrWhiteSpace(num)) label += ": " + num;
                }
            }
            list.Add(label);
        }
        return [.. list];
    }

    static bool TryReadItemCard(string html, string name, out JsonElement item)
    {
        item = default;
        var idx = 0;
        while (idx < html.Length)
        {
            var at = html.IndexOf("\"realm\": \"poe2\"", idx, StringComparison.Ordinal);
            if (at < 0) at = html.IndexOf("\"realm\":\"poe2\"", idx, StringComparison.Ordinal);
            if (at < 0) return false;
            var start = html.LastIndexOf('{', at);
            if (start < 0 || !TrySliceJsonObject(html, start, out var json))
            {
                idx = at + 8;
                continue;
            }
            try
            {
                using var doc = JsonDocument.Parse(json);
                var found = doc.RootElement.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
                if (FoldEquals(found, name))
                {
                    item = doc.RootElement.Clone();
                    return true;
                }
            }
            catch
            {
                /* keep scanning */
            }
            idx = at + 8;
        }
        return false;
    }

    static bool TrySliceJsonObject(string html, int start, out string json)
    {
        json = "";
        if (start < 0 || start >= html.Length || html[start] != '{') return false;
        var depth = 0;
        var inStr = false;
        var esc = false;
        var end = Math.Min(html.Length, start + 120000);
        for (var i = start; i < end; i++)
        {
            var c = html[i];
            if (inStr)
            {
                if (esc) esc = false;
                else if (c == '\\') esc = true;
                else if (c == '"') inStr = false;
                continue;
            }
            if (c == '"') inStr = true;
            else if (c == '{') depth++;
            else if (c == '}')
            {
                depth--;
                if (depth == 0)
                {
                    json = html[start..(i + 1)];
                    return true;
                }
            }
        }
        return false;
    }

    static string StripTags(string html)
    {
        var text = Regex.Replace(html ?? "", "<[^>]+>", " ");
        text = WebUtility.HtmlDecode(text);
        return Regex.Replace(text, @"\s+", " ").Trim();
    }

    static void WriteResource(Assembly asm, string name, string path, bool skipUnchanged = false)
    {
        using var stream = asm.GetManifestResourceStream(name)
            ?? throw new InvalidOperationException("Missing embedded file: " + name);
        if (skipUnchanged && File.Exists(path) && stream.CanSeek)
        {
            try
            {
                if (new FileInfo(path).Length == stream.Length) return;
            }
            catch
            {
                /* rewrite */
            }
        }
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        var bytes = ms.ToArray();
        var parent = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(parent)) EnsureDirectory(parent);
        File.WriteAllBytes(path, bytes);
    }
}

sealed class PriceOverlayForm : Form
{
    readonly WebView2 _web = new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.FromArgb(18, 14, 10),
        TabStop = true,
    };
    readonly Action<string> _forward;
    readonly bool _pinnedPreview;
    readonly Func<Rectangle> _gameBounds;
    Rectangle _placementArea;
    double _contentZoom = 1;
    double _requestedZoom = 1;
    bool _pointerDragging;
    Point _pointerDragOffset;
    bool _ready;
    bool _allowActivate;
    bool _clickAway;
    int _showGen;
    long _clickAwayReadyAt;
    bool _clickAwayBtnUp;
    System.Windows.Forms.Timer? _clickAwayWatch;
    int _cssW = 474;
    int _cssH = 220;
    int _appliedW;
    int _appliedH;
    string? _pendingKind;
    string? _pendingHtml;
    string? _pendingVars;
    string? _pendingNotice;

    const int OverlayNarrowCssW = 470;
    const int OverlayWideCssW = 770; // main 466 + side 300 + chrome

    public PriceOverlayForm(Action<string> forward, Func<Rectangle>? gameBounds = null, bool pinnedPreview = false)
    {
        _forward = forward;
        _pinnedPreview = pinnedPreview;
        _gameBounds = gameBounds ?? (() => Rectangle.Empty);
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        Width = 474;
        Height = 220;
        BackColor = Color.FromArgb(18, 14, 10);
        Controls.Add(_web);
        FormClosing += (_, e) => { if (_pinnedPreview && e.CloseReason == CloseReason.UserClosing) e.Cancel = true; };
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        // Kill DWM size/move fades so offers panel snaps instead of growing.
        try
        {
            var disable = 1;
            _ = DwmSetWindowAttribute(Handle, 3, ref disable, sizeof(int)); // DWMWA_TRANSITIONS_FORCEDISABLED
        }
        catch
        {
            /* older Windows */
        }
    }

    protected override bool ShowWithoutActivation => !_allowActivate;

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == Keys.Escape)
        {
            if (_pinnedPreview) return true;
            HideOverlay();
            _forward("""{"type":"overlay-click","closeInspect":""}""");
            return true;
        }
        return base.ProcessCmdKey(ref msg, keyData);
    }

    protected override CreateParams CreateParams
    {
        get
        {
            var cp = base.CreateParams;
            cp.ExStyle |= 0x00000080; // WS_EX_TOOLWINDOW
            return cp;
        }
    }

    protected override void WndProc(ref Message m)
    {
        const int wmMouseActivate = 0x0021;
        if (m.Msg == wmMouseActivate)
        {
            _allowActivate = true;
            base.WndProc(ref m);
            if (GetForegroundWindow() != Handle || !_web.ContainsFocus)
                BeginInvoke(ForceForeground);
            return;
        }
        base.WndProc(ref m);
    }

    [DllImport("dwmapi.dll")]
    static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    [DllImport("user32.dll")]
    static extern bool GetCursorPos(out NativePoint pt);

    [DllImport("user32.dll")]
    static extern short GetAsyncKeyState(int vKey);

    [DllImport("user32.dll")]
    static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int x, int y, int cx, int cy, uint flags);

    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr processId);

    [DllImport("user32.dll")]
    static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("kernel32.dll")]
    static extern uint GetCurrentThreadId();

    [StructLayout(LayoutKind.Sequential)]
    struct NativePoint
    {
        public int X;
        public int Y;
    }

    static readonly IntPtr HwndTopmost = new(-1);
    const uint SwpNoActivate = 0x0010;
    const uint SwpShowWindow = 0x0040;
    const uint SwpNoSize = 0x0001;
    const uint SwpNoMove = 0x0002;

    void ForceForeground()
    {
        if (!IsHandleCreated || !Visible) return;
        if (GetForegroundWindow() == Handle && _web.ContainsFocus) return;
        var fg = GetForegroundWindow();
        var ourThread = GetCurrentThreadId();
        var fgThread = fg != IntPtr.Zero ? GetWindowThreadProcessId(fg, IntPtr.Zero) : 0u;
        var attached = fgThread != 0 && fgThread != ourThread && AttachThreadInput(fgThread, ourThread, true);
        try
        {
            BringToFront();
            Activate();
            SetForegroundWindow(Handle);
            _web.Focus();
        }
        finally
        {
            if (attached) AttachThreadInput(fgThread, ourThread, false);
        }
    }

    public async Task EnsureAsync(CoreWebView2Environment? env, string page)
    {
        if (_ready) return;
        if (env is not null) await _web.EnsureCoreWebView2Async(env);
        else await _web.EnsureCoreWebView2Async();
        _web.CoreWebView2.Settings.AreDevToolsEnabled = false;
        _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
        _web.CoreWebView2.Settings.IsWebMessageEnabled = true;
        _web.CoreWebView2.WebMessageReceived += OnMessage;
        _web.CoreWebView2.NavigationCompleted += (_, _) =>
        {
            _ready = true;
            ApplySize();
            FlushPending();
        };
        if (File.Exists(page)) _web.CoreWebView2.Navigate(new Uri(page).AbsoluteUri);
        else _ready = true;
    }

    public void ShowHtml(string html, string vars, bool fresh = false, bool clickAway = false, double overlayScale = 1)
    {
        if (_pinnedPreview) clickAway = false;
        _requestedZoom = double.IsFinite(overlayScale) ? Math.Clamp(overlayScale, 0.75, 1.25) : 1;
        var opening = fresh || !Visible;
        var rearm = opening || clickAway != _clickAway;
        _clickAway = clickAway;
        if (rearm) ArmClickAway(clickAway);
        _pendingKind = "paint";
        _pendingHtml = html;
        _pendingVars = vars;
        _pendingNotice = null;
        SnapWidthForHtml(html);
        ApplySize();
        if (opening) PlaceNearCursor();
        // Keep game focus — click-away watches mouse downs outside this window.
        Peek(activate: false);
        FlushPending();
    }

    public void ShowNotice(string text, string vars, bool clickAway = false)
    {
        var opening = !Visible;
        var rearm = opening || clickAway != _clickAway;
        _clickAway = clickAway;
        if (rearm) ArmClickAway(clickAway);
        _pendingKind = "notice";
        _pendingNotice = text;
        _pendingVars = vars;
        _pendingHtml = null;
        _cssW = OverlayNarrowCssW;
        ApplySize();
        if (opening) PlaceNearCursor();
        Peek(activate: false);
        FlushPending();
    }

    void ArmClickAway(bool clickAway)
    {
        _showGen++;
        // Grace so the hotkey / open click itself does not dismiss immediately.
        _clickAwayReadyAt = clickAway ? Environment.TickCount64 + 220 : 0;
        _clickAwayBtnUp = false;
        if (clickAway) StartClickAwayWatch();
        else StopClickAwayWatch();
    }

    void StartClickAwayWatch()
    {
        if (_clickAwayWatch is null)
        {
            _clickAwayWatch = new System.Windows.Forms.Timer { Interval = 33 };
            _clickAwayWatch.Tick += (_, _) => PollClickAway();
        }
        _clickAwayWatch.Start();
    }

    void StopClickAwayWatch()
    {
        _clickAwayWatch?.Stop();
    }

    void PollClickAway()
    {
        if (!_clickAway || !Visible)
        {
            StopClickAwayWatch();
            return;
        }
        const int vkLButton = 0x01;
        const int vkRButton = 0x02;
        var down = (GetAsyncKeyState(vkLButton) & 0x8000) != 0
            || (GetAsyncKeyState(vkRButton) & 0x8000) != 0;
        if (Environment.TickCount64 < _clickAwayReadyAt)
        {
            // Require a full button-up after open before arming the edge detector.
            if (!down) _clickAwayBtnUp = true;
            return;
        }
        if (!down)
        {
            _clickAwayBtnUp = true;
            return;
        }
        if (!_clickAwayBtnUp) return;
        _clickAwayBtnUp = false;
        if (!GetCursorPos(out var pt)) return;
        var screen = new Rectangle(Location, Size);
        if (_appliedW > 0 && _appliedH > 0)
            screen = new Rectangle(Location.X, Location.Y, _appliedW, _appliedH);
        if (screen.Contains(pt.X, pt.Y)) return;
        HideOverlay();
        _forward("""{"type":"overlay-click","closeInspect":""}""");
    }

    public void HideOverlay()
    {
        _pointerDragging = false;
        _showGen++;
        _pendingKind = null;
        _allowActivate = false;
        _clickAway = false;
        _clickAwayReadyAt = 0;
        StopClickAwayWatch();
        Hide();
    }

    public void PostRate(string chip, string title, bool wait, bool limited)
    {
        if (!_ready || _web.CoreWebView2 is null || !Visible) return;
        var payload = JsonSerializer.Serialize(new
        {
            type = "rate",
            chip = chip ?? "",
            title = title ?? "",
            wait,
            limited,
        });
        _web.CoreWebView2.PostWebMessageAsJson(payload);
    }

    void SnapWidthForHtml(string? html)
    {
        if (string.IsNullOrEmpty(html)) return;
        _cssW = html.Contains("has-offers", StringComparison.Ordinal)
            ? OverlayWideCssW
            : OverlayNarrowCssW;
    }

    void FlushPending()
    {
        if (!_ready || _web.CoreWebView2 is null || _pendingKind is null) return;
        var maxHeight = (int)Math.Floor(PlacementArea().Height * 0.92 / (DeviceDpi / 96.0 * _contentZoom));
        var payload = _pendingKind == "notice"
            ? JsonSerializer.Serialize(new { type = "notice", text = _pendingNotice ?? "", vars = _pendingVars ?? "", clickAway = _clickAway })
            : JsonSerializer.Serialize(new { type = "paint", html = _pendingHtml ?? "", vars = _pendingVars ?? "", clickAway = _clickAway, maxHeight });
        _web.CoreWebView2.PostWebMessageAsJson(payload);
    }

    void Peek(bool activate = false)
    {
        var prevAllow = _allowActivate;
        _allowActivate = activate;
        Show();
        var flags = SwpShowWindow | SwpNoMove | SwpNoSize;
        if (!activate) flags |= SwpNoActivate;
        SetWindowPos(Handle, HwndTopmost, 0, 0, 0, 0, flags);
        ApplySize();
        TopMost = true;
        if (activate) ForceForeground();
        _allowActivate = prevAllow;
    }

    protected override void OnDpiChanged(DpiChangedEventArgs e)
    {
        base.OnDpiChanged(e);
        ApplySize(e.DeviceDpiNew);
    }

    void ApplySize(int dpi = 0)
    {
        if (!IsHandleCreated) return;
        var screen = PlacementArea();
        _placementArea = screen;
        var dpiScale = (dpi > 0 ? dpi : DeviceDpi) / 96.0;
        var inGame = !_gameBounds().IsEmpty;
        var maxW = Math.Max(1, inGame ? screen.Width : screen.Width / 2);
        var maxH = Math.Max(1, (int)(screen.Height * 0.92));
        _contentZoom = Math.Min(_requestedZoom, maxW / (Math.Max(280, _cssW) * dpiScale));
        if (_web.CoreWebView2 is not null && Math.Abs(_web.ZoomFactor - _contentZoom) > 0.001)
            _web.ZoomFactor = _contentZoom;
        var scale = dpiScale * _contentZoom;
        var minW = Math.Min(maxW, (int)Math.Ceiling(280 * scale));
        var minH = Math.Min(maxH, (int)Math.Ceiling(90 * scale));
        var w = Math.Clamp((int)Math.Ceiling(_cssW * scale), minW, maxW);
        var h = Math.Clamp((int)Math.Ceiling(_cssH * scale), minH, maxH);
        // Preserve the left edge until growth would leave the game window.
        var x = Math.Clamp(Left, screen.Left, Math.Max(screen.Left, screen.Right - w));
        var y = Math.Clamp(Top, screen.Top, Math.Max(screen.Top, screen.Bottom - h));
        if (w == _appliedW && h == _appliedH && x == Location.X && y == Location.Y) return;
        _appliedW = w;
        _appliedH = h;
        SetWindowPos(Handle, HwndTopmost, x, y, w, h, SwpNoActivate);
    }

    void PlaceNearCursor()
    {
        GetCursorPos(out var pt);
        var screen = PlacementArea();
        var w = _appliedW > 0 ? _appliedW : Width;
        var h = _appliedH > 0 ? _appliedH : Height;
        var x = pt.X + 28;
        var y = pt.Y - 36;
        if (x + w > screen.Right) x = pt.X - w - 20;
        if (y + h > screen.Bottom) y = screen.Bottom - h;
        x = Math.Clamp(x, screen.Left, Math.Max(screen.Left, screen.Right - w));
        y = Math.Clamp(y, screen.Top, Math.Max(screen.Top, screen.Bottom - h));
        if (x == Location.X && y == Location.Y) return;
        SetWindowPos(Handle, HwndTopmost, x, y, 0, 0, SwpNoActivate | SwpNoSize);
    }

    Rectangle PlacementArea()
    {
        var game = _gameBounds();
        if (game.Width > 0 && game.Height > 0)
        {
            var area = Rectangle.Intersect(game, Screen.FromRectangle(game).WorkingArea);
            if (area.Width > 0 && area.Height > 0) return area;
        }
        return Visible ? Screen.FromControl(this).WorkingArea : Screen.FromPoint(Cursor.Position).WorkingArea;
    }

    public void ConstrainToGame()
    {
        if (!Visible || _gameBounds().IsEmpty || PlacementArea() == _placementArea) return;
        ApplySize();
        FlushPending();
    }

    void MoveBy(int dx, int dy)
    {
        var screen = PlacementArea();
        var w = _appliedW > 0 ? _appliedW : Width;
        var h = _appliedH > 0 ? _appliedH : Height;
        var x = Math.Clamp(Left + dx, screen.Left, Math.Max(screen.Left, screen.Right - w));
        var y = Math.Clamp(Top + dy, screen.Top, Math.Max(screen.Top, screen.Bottom - h));
        SetWindowPos(Handle, HwndTopmost, x, y, 0, 0, SwpNoActivate | SwpNoSize);
    }

    void BeginPointerDrag(double clientX, double clientY, double viewportWidth)
    {
        _pointerDragging = false;
        if (!Visible || !double.IsFinite(clientX) || !double.IsFinite(clientY) ||
            !double.IsFinite(viewportWidth) || viewportWidth <= 0) return;
        // Relate browser CSS coordinates to this WebView's actual client pixels.
        // The OS cursor then drives absolute placement without summed/scaled deltas.
        var scale = _web.ClientSize.Width / viewportWidth;
        if (!double.IsFinite(scale) || scale <= 0) return;
        var origin = _web.PointToScreen(Point.Empty);
        _pointerDragOffset = new Point(
            origin.X - Left + (int)Math.Round(Math.Clamp(clientX * scale, 0, _web.ClientSize.Width)),
            origin.Y - Top + (int)Math.Round(Math.Clamp(clientY * scale, 0, _web.ClientSize.Height)));
        _pointerDragging = true;
    }

    void MovePointerDrag(Point cursor)
    {
        if (!_pointerDragging) return;
        MoveBy(cursor.X - _pointerDragOffset.X - Left, cursor.Y - _pointerDragOffset.Y - Top);
    }

    void OnMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var type = doc.RootElement.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : "";
            if (type == "overlay-size")
            {
                _cssW = doc.RootElement.TryGetProperty("w", out var wEl) && wEl.ValueKind == JsonValueKind.Number && wEl.TryGetInt32(out var ww) ? ww : _cssW;
                _cssH = doc.RootElement.TryGetProperty("h", out var hEl) && hEl.ValueKind == JsonValueKind.Number && hEl.TryGetInt32(out var hh) ? hh : _cssH;
                if (InvokeRequired) BeginInvoke(() => ApplySize());
                else ApplySize();
                return;
            }
            if (type == "overlay-drag")
            {
                var start = doc.RootElement.TryGetProperty("start", out var startEl) && startEl.ValueKind == JsonValueKind.True;
                double Number(string key) => doc.RootElement.TryGetProperty(key, out var el) && el.ValueKind == JsonValueKind.Number ? el.GetDouble() : double.NaN;
                var x = Number("clientX");
                var y = Number("clientY");
                var width = Number("viewportWidth");
                void Move()
                {
                    if (start) BeginPointerDrag(x, y, width);
                    if (GetCursorPos(out var cursor)) MovePointerDrag(new Point(cursor.X, cursor.Y));
                }
                if (InvokeRequired) BeginInvoke(Move);
                else Move();
                return;
            }
            if (type == "overlay-drag-end")
            {
                _pointerDragging = false;
                return;
            }
            if (type == "overlay-activate")
            {
                void FocusOverlay()
                {
                    if (!Visible) return;
                    _allowActivate = true;
                    ForceForeground();
                }
                if (InvokeRequired) BeginInvoke(FocusOverlay);
                else FocusOverlay();
                return;
            }
            if (type == "overlay-click")
            {
                if (_pinnedPreview) return;
                if (doc.RootElement.TryGetProperty("closeInspect", out _)) HideOverlay();
                _forward(e.WebMessageAsJson);
            }
        }
        catch
        {
            /* keep the overlay up */
        }
    }
}
