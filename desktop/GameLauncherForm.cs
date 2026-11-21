using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace ExileLedger;

// An independent desktop window. Uses only foreground-window identity and bounds.
sealed class GameLauncherForm : Form
{
    const int IconAt1080 = 48;
    const int TesterWavePeriod = 3400;
    const uint GetClientAreaAnimation = 0x1042;
    readonly Func<bool> _gameFocused;
    readonly Func<bool> _menuHidden;
    readonly Action<bool> _focusChanged;
    readonly string _settingsPath;
    readonly System.Windows.Forms.Timer _watch = new() { Interval = 200 };
    readonly System.Windows.Forms.Timer _testerWave = new() { Interval = 33 };
    readonly ContextMenuStrip _menu = new() { ShowImageMargin = false, ShowCheckMargin = true };
    readonly ToolStripMenuItem _lockItem = new("Lock position");
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
    int _side = IconAt1080;
    int _wealthWidth;
    int _pad = 4;
    bool _useGoldIcon;
    string _wealth = "";
    readonly Action _openApp;

    sealed record Preferences(double X = 0.98, double Y = 0.3, bool Locked = true);

    public GameLauncherForm(Func<bool> gameFocused, Func<bool> menuHidden, Action<bool> focusChanged,
        string settingsPath, string imagePath, Action openApp, Action redeemTesterCode)
    {
        _gameFocused = gameFocused;
        _menuHidden = menuHidden;
        _focusChanged = focusChanged;
        _settingsPath = settingsPath;
        _openApp = openApp;
        _menuMouseProc = HandleMenuMouse;
        Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
        AutoScaleMode = AutoScaleMode.None;
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
        ClientSize = new Size(IconAt1080, IconAt1080);
        TransparencyKey = Color.Magenta;
        BackColor = Color.Magenta;
        Cursor = Cursors.Hand;
        AccessibleName = "Still Sane, Exile?";
        _menu.BackColor = Color.FromArgb(25, 24, 19);
        _menu.ForeColor = Color.FromArgb(238, 223, 190);
        _menu.Font = new Font("Segoe UI", 10);
        _menu.Renderer = new DarkMenuRenderer();
        _menu.Items.Add("Open SSE", null, (_, _) => RunMenuAction(_openApp));
        _menu.Items.Add(new ToolStripSeparator());
        _lockItem.Click += (_, _) => ToggleLock();
        _menu.Items.Add(_lockItem);
        _menu.Items.Add("Reset position", null, (_, _) =>
        {
            _preferences = new();
            ApplyLockCursor();
            SyncLockItem();
            SavePosition();
            if (_gameBounds.Width > 0) LayoutChrome();
            Invalidate();
        });
        _redeemTesterCode.Click += (_, _) => RunMenuAction(redeemTesterCode);
        _menu.Items.Add(_redeemTesterCode);
        SyncLockItem();
        ApplyLockCursor();
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
                OpenMenu();
                return;
            }
            var iconLeft = Left + _wealthWidth;
            _preferences = _preferences with
            {
                X = (double)(iconLeft - _gameBounds.Left) / Math.Max(1, _gameBounds.Width - _side),
                Y = (double)(Top - _gameBounds.Top) / Math.Max(1, _gameBounds.Height - _side),
            };
            SavePosition();
        };
        MouseCaptureChanged += (_, _) => { if (!Capture) _pressed = false; };
        VisibleChanged += (_, _) => UpdateTesterWave();
        _testerWave.Tick += (_, _) => Invalidate(IconBounds());
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
        if (m.Msg == 0x001A && _useGoldIcon && Visible) UpdateTesterWave(); // WM_SETTINGCHANGE
    }
    protected override CreateParams CreateParams
    {
        get { var cp = base.CreateParams; cp.ExStyle |= 0x08000080; return cp; } // No activation, tool window.
    }

    void OpenMenu()
    {
        if (!Visible || !GameAvailable) return;
        if (!_gameFocused() && GetForegroundWindow() != Handle && !_menu.Visible) return;
        SyncLockItem();
        _menu.Show(this, new Point(Width, Height), ToolStripDropDownDirection.BelowLeft);
    }

    IntPtr HandleMenuMouse(int code, IntPtr message, IntPtr data)
    {
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
        BeginInvoke(action);
    }

    void SyncLockItem() => _lockItem.Text = _preferences.Locked ? "Unlock position" : "Lock position";

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
        UpdateTesterWave();
    }

    void UpdateTesterWave()
    {
        if (Disposing || IsDisposed) return;
        var visible = Visible && _useGoldIcon;
        _testerWave.Enabled = visible && SystemParametersInfoW(GetClientAreaAnimation, 0, out var enabled, 0) && enabled != 0;
        if (visible) Invalidate(IconBounds());
    }

    int Hud(int px) => Math.Max(1, (int)Math.Round(px * _side / 52.0));
    float HudF(float px) => Math.Max(1f, px * _side / 52f);

    double HudFit(int width, int height)
    {
        var widthFit = width / 1920.0;
        var heightFit = height / 1080.0;
        // A custom client around 1920 wide keeps the 1080p pill, even when the height is short.
        if (widthFit is >= 0.85 and <= 1.2 && heightFit >= 0.65) return 1;
        return Math.Min(widthFit, heightFit);
    }

    void ApplyHudScale()
    {
        if (_gameBounds.Width < 1 || _gameBounds.Height < 1) return;
        var fit = HudFit(_gameBounds.Width, _gameBounds.Height);
        var side = Math.Clamp((int)Math.Round(IconAt1080 * fit), 22, 64);
        var points = (float)Math.Clamp(9.5 * side / 42.0, 7, 15);
        var fontChanged = Font.Style != FontStyle.Bold || Math.Abs(Font.SizeInPoints - points) >= 0.2f;
        if (side == _side && !fontChanged) return;
        _side = side;
        if (!fontChanged) return;
        var next = new Font("Segoe UI", points, FontStyle.Bold);
        var previous = Font;
        Font = next;
        previous.Dispose();
    }

    bool HasWealth() => !string.IsNullOrEmpty(_wealth);
    int WealthExtra()
    {
        if (!HasWealth()) return 0;
        var measured = TextRenderer.MeasureText(_wealth, Font);
        return measured.Width + Hud(16);
    }

    Rectangle IconBounds() => new(_wealthWidth, 0, _side, _side);
    Rectangle BoxBounds()
    {
        var boxH = Math.Clamp((int)Math.Round(_side * 0.80), Math.Min(Hud(26), _side), Math.Max(Hud(26), _side - 2));
        var top = Math.Max(0, (_side - boxH) / 2);
        return new Rectangle(0, top, Math.Max(boxH, _wealthWidth + _side / 2), boxH);
    }
    void ApplyLockCursor() => Cursor = _preferences.Locked ? Cursors.Hand : Cursors.SizeAll;

    void ToggleLock()
    {
        _preferences = _preferences with { Locked = !_preferences.Locked };
        ApplyLockCursor();
        SyncLockItem();
        SavePosition();
    }

    void LayoutChrome()
    {
        ApplyHudScale();
        _pad = Math.Max(3, Hud(4));
        _wealthWidth = WealthExtra();
        var iconX = _gameBounds.Left + (int)Math.Round((_gameBounds.Width - _side) * _preferences.X);
        var iconY = _gameBounds.Top + (int)Math.Round((_gameBounds.Height - _side) * _preferences.Y);
        var size = new Size(_wealthWidth + _side, _side);
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
        e.Graphics.SmoothingMode = SmoothingMode.None;
        using var transparent = new SolidBrush(Color.Magenta);
        e.Graphics.FillRectangle(transparent, e.ClipRectangle);
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        var icon = IconBounds();
        Rectangle? bar = null;
        if (HasWealth())
        {
            var frame = BoxBounds();
            bar = frame;
            var border = _useGoldIcon ? Color.FromArgb(242, 196, 78) : Color.FromArgb(90, 82, 68);
            using (var path = Rounded(frame, Math.Max(3, Hud(4))))
            using (var fill = new SolidBrush(Color.FromArgb(19, 18, 14)))
            using (var pen = new Pen(border, _useGoldIcon ? HudF(2f) : HudF(1.25f)))
            {
                e.Graphics.FillPath(fill, path);
                e.Graphics.DrawPath(pen, path);
            }
            var text = new Rectangle(Hud(10), frame.Y, Math.Max(1, _wealthWidth - Hud(8)), frame.Height);
            TextRenderer.DrawText(e.Graphics, _wealth, Font, text, Color.FromArgb(238, 223, 190),
                TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        }
        if (e.ClipRectangle.IntersectsWith(icon))
        {
            if (_useGoldIcon) PaintTesterIcon(e.Graphics, icon);
            else
            {
                using var ring = new Pen(Color.FromArgb(185, 157, 94), HudF(2));
                using var disc = new SolidBrush(Color.FromArgb(19, 18, 14));
                var inset = Hud(2);
                var ringCut = Hud(5);
                e.Graphics.FillEllipse(disc, icon.X + inset, icon.Y + inset, icon.Width - ringCut, icon.Height - ringCut);
                e.Graphics.DrawEllipse(ring, icon.X + inset, icon.Y + inset, icon.Width - ringCut, icon.Height - ringCut);
                var art = Hud(5);
                if (_image is not null) e.Graphics.DrawImage(_image, new Rectangle(icon.X + art, icon.Y + art, icon.Width - art * 2, icon.Height - art * 2));
                else TextRenderer.DrawText(e.Graphics, "SSE", Font, icon, Color.Wheat,
                    TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
            }
        }
        PunchToKey(e.Graphics, icon, bar);
    }

    void PunchToKey(Graphics graphics, Rectangle icon, Rectangle? bar)
    {
        var smoothing = graphics.SmoothingMode;
        graphics.SmoothingMode = SmoothingMode.None;
        using var outside = new Region(ClientRectangle);
        using (var circle = new GraphicsPath())
        {
            circle.AddEllipse(icon);
            outside.Exclude(circle);
        }
        if (bar is Rectangle frame && frame.Width > 0 && frame.Height > 0)
        {
            using var path = Rounded(frame, Math.Max(3, Hud(4)));
            outside.Exclude(path);
        }
        using var key = new SolidBrush(Color.Magenta);
        graphics.FillRegion(key, outside);
        graphics.SmoothingMode = smoothing;
    }

    void PaintTesterIcon(Graphics graphics, Rectangle icon)
    {
        var frame = Rectangle.Inflate(icon, -Hud(3), -Hud(3));
        var portrait = Rectangle.Inflate(icon, -Hud(6), -Hud(6));
        using var background = new SolidBrush(Color.FromArgb(36, 25, 12));
        // Give the antialiased gold rim a dark backing inside the color-keyed window.
        var smoothing = graphics.SmoothingMode;
        graphics.SmoothingMode = SmoothingMode.None;
        graphics.FillEllipse(background, icon);
        graphics.SmoothingMode = smoothing;

        if (_image is not null)
        {
            using var circle = new GraphicsPath();
            circle.AddEllipse(portrait);
            var portraitClip = graphics.Save();
            graphics.SetClip(circle, CombineMode.Intersect);
            graphics.DrawImage(_image, portrait, 0, 0, _image.Width, _image.Height, GraphicsUnit.Pixel,
                _testerIconTint ??= CreateTesterIconTint());
            graphics.Restore(portraitClip);
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
        using var rim = new Pen(gold, HudF(3f));
        graphics.DrawEllipse(rim, frame);
        using var innerRim = new Pen(Color.FromArgb(202, 135, 31));
        graphics.DrawEllipse(innerRim, portrait);

        if (_testerWave.Enabled)
        {
            var angle = (Environment.TickCount64 % TesterWavePeriod) * 360f / TesterWavePeriod;
            PaintTesterWave(graphics, frame, angle, HudF(2.5f));
        }
    }

    static void PaintTesterWave(Graphics graphics, Rectangle frame, float angle, float width)
    {
        using var wave = new Pen(Color.FromArgb(36, 255, 197, 78), width);
        graphics.DrawArc(wave, frame, angle - 150, 76);
        wave.Color = Color.FromArgb(65, 255, 224, 154);
        graphics.DrawArc(wave, frame, angle - 134, 44);

        for (var step = 0; step < 6; step++)
        {
            var spread = 72 - step * 11;
            wave.Color = Color.FromArgb(28 + step * 7, 255, 205 + step * 9, 105 + step * 27);
            graphics.DrawArc(wave, frame, angle - spread, spread * 2);
        }
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
            _testerWave.Dispose();
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
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr window, System.Text.StringBuilder text, int count);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr window, ref NativePoint point);
    [DllImport("user32.dll", ExactSpelling = true)] static extern bool SystemParametersInfoW(uint action, uint parameter, out int value, uint flags);
}
