using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace ExileLedger;

// An independent desktop window. Uses only foreground-window identity and bounds.
sealed class GameLauncherForm : Form
{
    const int IconSize = 52;
    const int TesterShineDuration = 650;
    const int TesterShinePause = 4500;
    readonly Func<bool> _gameFocused;
    readonly Func<bool> _menuHidden;
    readonly Action<bool> _focusChanged;
    readonly string _settingsPath;
    readonly System.Windows.Forms.Timer _watch = new() { Interval = 200 };
    readonly System.Windows.Forms.Timer _testerShine = new();
    readonly ContextMenuStrip _menu = new() { ShowImageMargin = false, ShowCheckMargin = true };
    readonly ToolStripMenuItem _redeemTesterCode = new("Redeem tester code…");
    readonly MenuMouseProc _menuMouseProc;
    IntPtr _menuMouseHook;
    readonly Image? _image;
    ImageAttributes? _testerIconTint;
    Preferences _preferences = new();
    Rectangle _gameBounds;
    IntPtr _gameWindow;
    Point _pressCursor, _pressLocation;
    bool _pressed, _dragged;
    int _side = IconSize;
    int _wealthWidth;
    bool _useGoldIcon;
    long? _testerShineStartedAt;
    float _testerShineProgress = -1;
    string _wealth = "";
    readonly Action _openWealth;

    sealed record Preferences(double X = 0.98, double Y = 0.3, bool Locked = true);

    public GameLauncherForm(Func<bool> gameFocused, Func<bool> menuHidden, Action<bool> focusChanged,
        string settingsPath, string imagePath, Action dashboard, Action settings, Action wealth, Action redeemTesterCode)
    {
        _gameFocused = gameFocused;
        _menuHidden = menuHidden;
        _focusChanged = focusChanged;
        _settingsPath = settingsPath;
        _openWealth = wealth;
        _menuMouseProc = HandleMenuMouse;
        Font = new Font("Segoe UI", 10, FontStyle.Bold);
        try
        {
            var stored = JsonSerializer.Deserialize<Preferences>(File.ReadAllText(settingsPath));
            if (stored is not null && double.IsFinite(stored.X) && double.IsFinite(stored.Y))
                _preferences = stored with { X = Math.Clamp(stored.X, 0, 1), Y = Math.Clamp(stored.Y, 0, 1) };
        }
        catch { /* First launch or invalid local preferences: use defaults. */ }
        try { using var source = Image.FromFile(imagePath); _image = new Bitmap(source); }
        catch { /* SSE initials remain available if the icon is missing. */ }
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        DoubleBuffered = true;
        ClientSize = new Size(IconSize, IconSize);
        TransparencyKey = Color.Magenta;
        BackColor = Color.Magenta;
        Cursor = Cursors.Hand;
        AccessibleName = "Still Sane, Exile? menu";
        _menu.BackColor = Color.FromArgb(25, 24, 19);
        _menu.ForeColor = Color.FromArgb(238, 223, 190);
        _menu.Font = new Font("Segoe UI", 10);
        _menu.Renderer = new DarkMenuRenderer();
        _menu.Items.Add("Open SSE", null, (_, _) => RunMenuAction(dashboard));
        _menu.Items.Add("Settings", null, (_, _) => RunMenuAction(settings));
        _menu.Items.Add(new ToolStripSeparator());
        var locked = new ToolStripMenuItem("Lock position") { Checked = _preferences.Locked, CheckOnClick = true };
        void UpdateLockAppearance()
        {
            locked.Text = _preferences.Locked ? "Unlock position" : "Lock position";
            Cursor = _preferences.Locked ? Cursors.Hand : Cursors.SizeAll;
        }
        locked.CheckedChanged += (_, _) =>
        {
            _preferences = _preferences with { Locked = locked.Checked };
            UpdateLockAppearance();
            SavePosition();
        };
        UpdateLockAppearance();
        _menu.Items.Add(locked);
        _menu.Items.Add("Reset position", null, (_, _) => { _preferences = new(); locked.Checked = true; SavePosition(); });
        _redeemTesterCode.Click += (_, _) => RunMenuAction(redeemTesterCode);
        _menu.Items.Add(_redeemTesterCode);
        _menu.Opened += (_, _) =>
        {
            if (_menuMouseHook == IntPtr.Zero)
                _menuMouseHook = SetWindowsHookEx(14, _menuMouseProc, GetModuleHandle(null), 0); // WH_MOUSE_LL
        };
        _menu.Closed += (_, _) => StopMenuMouseHook();
        MouseDown += (_, e) =>
        {
            if (e.Button == MouseButtons.Right) { OpenMenu(); return; }
            if (e.Button != MouseButtons.Left) return;
            _pressed = true;
            _dragged = false;
            _pressCursor = Cursor.Position;
            _pressLocation = Location;
            Capture = true;
        };
        MouseMove += (_, _) =>
        {
            if (!_pressed || _preferences.Locked) return;
            var delta = new Size(Cursor.Position.X - _pressCursor.X, Cursor.Position.Y - _pressCursor.Y);
            if (!_dragged && Math.Abs(delta.Width) + Math.Abs(delta.Height) < 6) return;
            _dragged = true;
            Location = ClampLocation(_pressLocation + delta);
        };
        MouseUp += (_, e) =>
        {
            if (!_pressed || e.Button != MouseButtons.Left) return;
            _pressed = false;
            Capture = false;
            if (!_dragged)
            {
                if (HitWealth(e.Location)) _openWealth();
                else OpenMenu();
                return;
            }
            var iconLeft = Left + _wealthWidth;
            _preferences = _preferences with
            {
                X = (double)(iconLeft - _gameBounds.Left) / Math.Max(1, _gameBounds.Width - _side),
                Y = (double)(Top - _gameBounds.Top) / Math.Max(1, _gameBounds.Height - Height),
            };
            SavePosition();
        };
        MouseCaptureChanged += (_, _) => { if (!Capture) _pressed = false; };
        VisibleChanged += (_, _) => ResetTesterShine();
        _testerShine.Tick += (_, _) => AdvanceTesterShine();
        _watch.Tick += (_, _) => RefreshVisibility();
        _watch.Start();
    }

    protected override bool ShowWithoutActivation => true;
    public bool GameRunning => _gameWindow != IntPtr.Zero && IsWindow(_gameWindow);
    public IntPtr GameWindow => _gameWindow;
    public bool GameAvailable => GameRunning && !IsIconic(_gameWindow);
    public static Rectangle GetVisibleClientBounds(IntPtr window)
    {
        var origin = new NativePoint();
        if (window == IntPtr.Zero || IsIconic(window) || !GetClientRect(window, out var bounds) ||
            !ClientToScreen(window, ref origin)) return Rectangle.Empty;
        return new Rectangle(origin.X, origin.Y, bounds.Right, bounds.Bottom);
    }

    public Rectangle GameClientBounds
    {
        get
        {
            // Use the current game monitor even if it moved since the last timer
            // tick. Retain the last visible bounds if focus minimized the game.
            var origin = new NativePoint();
            if (GameAvailable && GetClientRect(_gameWindow, out var bounds) &&
                ClientToScreen(_gameWindow, ref origin) && bounds.Right > 0 && bounds.Bottom > 0)
                _gameBounds = new Rectangle(origin.X, origin.Y, bounds.Right, bounds.Bottom);
            return _gameBounds;
        }
    }
    protected override void WndProc(ref Message m)
    {
        if (m.Msg == 0x21) // WM_MOUSEACTIVATE: accept the click without taking game focus.
        {
            m.Result = new IntPtr(3); // MA_NOACTIVATE, do not discard the mouse event.
            return;
        }
        base.WndProc(ref m);
    }
    protected override CreateParams CreateParams
    {
        get { var cp = base.CreateParams; cp.ExStyle |= 0x08000080; return cp; } // No activation, tool window.
    }

    public void OpenMenu()
    {
        if (!Visible || !GameAvailable) return;
        if (!_gameFocused() && GetForegroundWindow() != Handle && !_menu.Visible) return;
        _menu.Show(this, new Point(0, Height));
    }

    IntPtr HandleMenuMouse(int code, IntPtr message, IntPtr data)
    {
        // Only observe button presses while the menu is open. The destination still receives each click.
        if (code >= 0 && _menu.Visible && IsHandleCreated &&
            message.ToInt64() is 0x201 or 0x204 or 0x207 or 0x20B)
        {
            var cursor = Marshal.PtrToStructure<NativePoint>(data);
            if (!_menu.Bounds.Contains(cursor.X, cursor.Y))
                BeginInvoke(() => _menu.Close(ToolStripDropDownCloseReason.AppClicked));
        }
        return CallNextHookEx(IntPtr.Zero, code, message, data);
    }

    void StopMenuMouseHook()
    {
        if (_menuMouseHook == IntPtr.Zero) return;
        UnhookWindowsHookEx(_menuMouseHook);
        _menuMouseHook = IntPtr.Zero;
    }

    void RunMenuAction(Action action)
    {
        _menu.Close();
        Hide();
        // Restore the app after the native popup has finished its own focus cleanup.
        BeginInvoke(action);
    }

    Point ClampLocation(Point point) => new(
        Math.Clamp(point.X, _gameBounds.Left, Math.Max(_gameBounds.Left, _gameBounds.Right - Width)),
        Math.Clamp(point.Y, _gameBounds.Top, Math.Max(_gameBounds.Top, _gameBounds.Bottom - Height)));

    public void NoteGameWindow() => RememberGameWindow();

    void RememberGameWindow()
    {
        if (!GameWindowAlive()) _gameWindow = FindPoeWindow();
        var origin = new NativePoint();
        if (_gameWindow == IntPtr.Zero || IsIconic(_gameWindow) ||
            !GetClientRect(_gameWindow, out var bounds) || !ClientToScreen(_gameWindow, ref origin) ||
            bounds.Right <= 0 || bounds.Bottom <= 0) return;
        _gameBounds = new Rectangle(origin.X, origin.Y, bounds.Right, bounds.Bottom);
    }

    bool GameWindowAlive()
    {
        if (_gameWindow == IntPtr.Zero || !IsWindow(_gameWindow)) return false;
        GetWindowThreadProcessId(_gameWindow, out var pid);
        if ((int)pid == Environment.ProcessId) return false;
        try
        {
            return System.Diagnostics.Process.GetProcessById((int)pid).ProcessName
                .StartsWith("PathOfExile", StringComparison.OrdinalIgnoreCase);
        }
        catch { return false; }
    }

    IntPtr FindPoeWindow()
    {
        IntPtr found = IntPtr.Zero;
        EnumWindows((window, _) =>
        {
            if (!IsWindowVisible(window) || IsIconic(window)) return true;
            GetWindowThreadProcessId(window, out var pid);
            if ((int)pid == Environment.ProcessId) return true;
            try
            {
                var name = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName;
                if (!name.StartsWith("PathOfExile", StringComparison.OrdinalIgnoreCase)) return true;
                var title = new System.Text.StringBuilder(32);
                if (GetWindowText(window, title, title.Capacity) <= 0) return true;
                found = window;
                return false;
            }
            catch { return true; }
        }, IntPtr.Zero);
        return found;
    }

    void RefreshVisibility()
    {
        RememberGameWindow();
        var active = _gameFocused();
        _focusChanged(active);
        if (_pressed && Capture) return;
        if (_menu.Visible && !IsIconic(_gameWindow))
        {
            GetWindowThreadProcessId(GetForegroundWindow(), out var pid);
            if (pid == Environment.ProcessId) return;
        }
        if (_gameWindow == IntPtr.Zero || _gameBounds.Width <= 0 || _gameBounds.Height <= 0)
        {
            _menu.Close();
            if (Visible) Hide();
            return;
        }
        if (!active)
        {
            _menu.Close();
            if (Visible) Hide();
            return;
        }
        if (_pressed) return;
        var dpi = GetDpiForWindow(_gameWindow);
        _side = Math.Max(32, (int)Math.Round(IconSize * (dpi == 0 ? 96 : dpi) / 96.0));
        LayoutChrome();
        if (_menuHidden())
        {
            _menu.Close();
            if (Visible) Hide();
            return;
        }
        if (!Visible) Show();
    }

    public void SetWealth(string text)
    {
        var next = (text ?? "").Trim();
        if (next.Length > 48) next = next[..48];
        if (next == _wealth) return;
        _wealth = next;
        if (_gameBounds.Width > 0) LayoutChrome();
        Invalidate();
    }

    public void EnableGoldTesterIcon()
    {
        if (_useGoldIcon) return;
        _useGoldIcon = true;
        _redeemTesterCode.Available = false;
        ResetTesterShine();
        Invalidate(new Rectangle(_wealthWidth, 0, _side, _side));
    }

    void ResetTesterShine()
    {
        if (Disposing || IsDisposed) return;
        _testerShine.Stop();
        _testerShineStartedAt = null;
        _testerShineProgress = -1;
        if (Visible && _useGoldIcon)
        {
            _testerShine.Interval = 1000;
            _testerShine.Start();
        }
    }

    void AdvanceTesterShine()
    {
        var now = Environment.TickCount64;
        if (_testerShineStartedAt is null)
        {
            _testerShineStartedAt = now;
            _testerShine.Interval = 33;
        }

        _testerShineProgress = (now - _testerShineStartedAt.Value) / (float)TesterShineDuration;
        if (_testerShineProgress >= 1f)
        {
            _testerShineStartedAt = null;
            _testerShineProgress = -1;
            _testerShine.Interval = TesterShinePause;
        }
        Invalidate(new Rectangle(_wealthWidth, 0, _side, _side));
    }

    int WealthExtra()
    {
        if (string.IsNullOrEmpty(_wealth)) return 0;
        var measured = TextRenderer.MeasureText(_wealth, Font);
        return measured.Width + 36;
    }

    bool HitWealth(Point point) => _wealthWidth > 0 && point.X < _wealthWidth;

    void LayoutChrome()
    {
        _wealthWidth = WealthExtra();
        var iconX = _gameBounds.Left + (int)Math.Round((_gameBounds.Width - _side) * _preferences.X);
        var iconY = _gameBounds.Top + (int)Math.Round((_gameBounds.Height - _side) * _preferences.Y);
        var size = new Size(_side + _wealthWidth, _side);
        if (Size != size)
        {
            Size = size;
            Invalidate();
        }
        var point = ClampLocation(new Point(iconX - _wealthWidth, iconY));
        if (Location != point) Location = point;
    }

    void SavePosition()
    {
        try { File.WriteAllText(_settingsPath, JsonSerializer.Serialize(_preferences)); }
        catch { /* Keep current position for the running session if disk is unavailable. */ }
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.Clear(Color.Magenta);
        var icon = new Rectangle(_wealthWidth, 0, _side, _side);
        if (_wealthWidth > 0)
        {
            var pill = new Rectangle(0, Math.Max(0, (_side - 34) / 2), _wealthWidth - 8, 34);
            using var path = Rounded(pill, 17);
            using var fill = new SolidBrush(Color.FromArgb(19, 18, 14));
            using var pen = new Pen(Color.FromArgb(185, 157, 94), 1.5f);
            e.Graphics.FillPath(fill, path);
            e.Graphics.DrawPath(pen, path);
            TextRenderer.DrawText(e.Graphics, _wealth, Font, pill, Color.FromArgb(238, 223, 190),
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        }
        if (_useGoldIcon)
        {
            PaintTesterIcon(e.Graphics, icon);
            return;
        }
        using var ring = new Pen(Color.FromArgb(185, 157, 94), 2);
        using var disc = new SolidBrush(Color.FromArgb(19, 18, 14));
        e.Graphics.FillEllipse(disc, icon.X + 2, icon.Y + 2, icon.Width - 5, icon.Height - 5);
        e.Graphics.DrawEllipse(ring, icon.X + 2, icon.Y + 2, icon.Width - 5, icon.Height - 5);
        if (_image is not null) e.Graphics.DrawImage(_image, new Rectangle(icon.X + 5, icon.Y + 5, icon.Width - 10, icon.Height - 10));
        else TextRenderer.DrawText(e.Graphics, "SSE", Font, icon, Color.Wheat,
            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
    }

    void PaintTesterIcon(Graphics graphics, Rectangle icon)
    {
        var frame = Rectangle.Inflate(icon, -3, -3);
        var portrait = Rectangle.Inflate(icon, -6, -6);
        using var background = new SolidBrush(Color.FromArgb(36, 25, 12));
        graphics.FillEllipse(background, frame);

        if (_image is not null)
        {
            using var circle = new GraphicsPath();
            circle.AddEllipse(portrait);
            var saved = graphics.Save();
            graphics.SetClip(circle, CombineMode.Intersect);
            graphics.DrawImage(_image, portrait, 0, 0, _image.Width, _image.Height, GraphicsUnit.Pixel,
                _testerIconTint ??= CreateTesterIconTint());
            graphics.Restore(saved);
        }
        else
        {
            TextRenderer.DrawText(graphics, "SSE", Font, portrait, Color.FromArgb(255, 225, 144),
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }

        using var gold = new LinearGradientBrush(frame,
            Color.White, Color.White, 55f);
        gold.InterpolationColors = new ColorBlend
        {
            Colors = new[]
            {
                Color.FromArgb(157, 86, 15), Color.FromArgb(255, 216, 94),
                Color.FromArgb(255, 252, 219), Color.FromArgb(224, 155, 38),
                Color.FromArgb(115, 56, 9), Color.FromArgb(255, 219, 103),
                Color.FromArgb(160, 88, 14),
            },
            Positions = new[] { 0f, .15f, .24f, .34f, .58f, .82f, 1f },
        };
        using var rim = new Pen(gold, 3f);
        graphics.DrawEllipse(rim, frame);
        using var innerRim = new Pen(Color.FromArgb(202, 135, 31));
        graphics.DrawEllipse(innerRim, portrait);

        if (_testerShineProgress >= 0) PaintTesterShine(graphics, frame, _testerShineProgress);
    }

    static void PaintTesterShine(Graphics graphics, Rectangle frame, float progress)
    {
        using var circle = new GraphicsPath();
        circle.AddEllipse(Rectangle.Inflate(frame, 1, 1));
        var saved = graphics.Save();
        graphics.SetClip(circle, CombineMode.Intersect);
        graphics.TranslateTransform(frame.Left + frame.Width / 2f, frame.Top + frame.Height / 2f);
        graphics.RotateTransform(25f);
        var bandWidth = frame.Width * .38f;
        var offset = frame.Width * (1.5f * progress - .75f);
        var band = new RectangleF(offset - bandWidth / 2, -frame.Height, bandWidth, frame.Height * 2);
        var tint = Color.FromArgb(0, 255, 213, 116);
        using var light = new LinearGradientBrush(band, tint, tint, 0f);
        light.InterpolationColors = new ColorBlend
        {
            Colors = new[] { tint, Color.FromArgb(62, 255, 208, 100), Color.FromArgb(160, 255, 251, 222), tint },
            Positions = new[] { 0f, .38f, .58f, 1f },
        };
        graphics.FillRectangle(light, band);
        graphics.Restore(saved);
    }

    static ImageAttributes CreateTesterIconTint()
    {
        // Map the portrait's luminance to warm shadows and gold highlights, preserving alpha.
        var tint = new ImageAttributes();
        tint.SetColorMatrix(new ColorMatrix(new[]
        {
            new[] { .267f, .205f, .096f, 0f, 0f },
            new[] { .897f, .689f, .322f, 0f, 0f },
            new[] { .091f, .070f, .032f, 0f, 0f },
            new[] { 0f, 0f, 0f, 1f, 0f },
            new[] { .07f, .03f, .008f, 0f, 1f },
        }));
        return tint;
    }

    static GraphicsPath Rounded(Rectangle bounds, int radius)
    {
        var path = new GraphicsPath();
        var d = Math.Min(radius * 2, Math.Min(bounds.Width, bounds.Height));
        path.AddArc(bounds.X, bounds.Y, d, d, 180, 90);
        path.AddArc(bounds.Right - d, bounds.Y, d, d, 270, 90);
        path.AddArc(bounds.Right - d, bounds.Bottom - d, d, d, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _watch.Dispose();
            _testerShine.Dispose();
            StopMenuMouseHook();
            _menu.Dispose();
            _testerIconTint?.Dispose();
            _image?.Dispose();
        }
        base.Dispose(disposing);
    }

    sealed class DarkMenuRenderer : ToolStripProfessionalRenderer
    {
        public DarkMenuRenderer() : base(new MenuColors()) { }
        protected override void OnRenderImageMargin(ToolStripRenderEventArgs e)
        {
            using var brush = new SolidBrush(Color.FromArgb(25, 24, 19));
            e.Graphics.FillRectangle(brush, e.AffectedBounds);
        }
        protected override void OnRenderItemCheck(ToolStripItemImageRenderEventArgs e)
        {
            var rect = e.ImageRectangle;
            using var background = new SolidBrush(Color.FromArgb(43, 39, 28));
            using var border = new Pen(Color.FromArgb(154, 129, 78));
            using var check = new Pen(Color.FromArgb(238, 223, 190), 2);
            e.Graphics.FillRectangle(background, rect);
            e.Graphics.DrawRectangle(border, rect.X, rect.Y, rect.Width - 1, rect.Height - 1);
            e.Graphics.DrawLines(check, new[]
            {
                new Point(rect.X + rect.Width / 4, rect.Y + rect.Height / 2),
                new Point(rect.X + rect.Width * 2 / 5, rect.Y + rect.Height * 3 / 4),
                new Point(rect.X + rect.Width * 4 / 5, rect.Y + rect.Height / 4),
            });
        }
    }

    sealed class MenuColors : ProfessionalColorTable
    {
        public MenuColors() { UseSystemColors = false; }
        public override Color ToolStripDropDownBackground => Color.FromArgb(25, 24, 19);
        public override Color MenuBorder => Color.FromArgb(154, 129, 78);
        public override Color MenuItemSelected => Color.FromArgb(62, 53, 33);
        public override Color MenuItemBorder => Color.FromArgb(185, 157, 94);
        public override Color CheckBackground => Color.FromArgb(43, 39, 28);
        public override Color CheckSelectedBackground => Color.FromArgb(62, 53, 33);
        public override Color CheckPressedBackground => Color.FromArgb(62, 53, 33);
        public override Color ImageMarginGradientBegin => ToolStripDropDownBackground;
        public override Color ImageMarginGradientMiddle => ToolStripDropDownBackground;
        public override Color ImageMarginGradientEnd => ToolStripDropDownBackground;
        public override Color SeparatorLight => Color.FromArgb(62, 53, 33);
        public override Color SeparatorDark => Color.FromArgb(90, 77, 49);
    }
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] struct NativePoint { public int X, Y; }
    delegate bool EnumProc(IntPtr window, IntPtr data);
    delegate IntPtr MenuMouseProc(int code, IntPtr message, IntPtr data);
    [DllImport("user32.dll")] static extern IntPtr SetWindowsHookEx(int hook, MenuMouseProc callback, IntPtr module, uint thread);
    [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr message, IntPtr data);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern IntPtr GetModuleHandle(string? name);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr data);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr window, System.Text.StringBuilder text, int count);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr window, ref NativePoint point);
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr window);
}
