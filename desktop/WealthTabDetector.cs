using System.Text.Json;

namespace ExileLedger;

sealed class WealthTabDetector
{
    const int Columns = 24;
    const int Rows = 16;
    readonly Size _captureSize;
    readonly Rectangle _region;
    readonly byte[] _signature;
    int _matches;
    int _misses;
    bool _wasOpen;

    WealthTabDetector(Size captureSize, Rectangle region, byte[] signature)
    {
        _captureSize = captureSize;
        _region = region;
        _signature = signature;
    }

    public static WealthTabDetector? FromConfig(JsonElement config)
    {
        if (config.ValueKind != JsonValueKind.Object) return null;
        int Read(string name) => config.TryGetProperty(name, out var value) &&
            value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number) ? number : -1;
        var size = new Size(Read("width"), Read("height"));
        var region = new Rectangle(Read("x"), Read("y"), Read("w"), Read("h"));
        if (size.Width is < 100 or > 8192 || size.Height is < 100 or > 8192 ||
            region.X < 0 || region.Y < 0 || region.Width is < 40 or > 600 || region.Height is < 24 or > 300 ||
            region.X > size.Width - region.Width || region.Y > size.Height - region.Height ||
            !config.TryGetProperty("signature", out var data) || data.ValueKind != JsonValueKind.String)
            return null;

        var signature = new byte[Columns * Rows];
        if (!Convert.TryFromBase64String(data.GetString()!, signature, out var written) || written != signature.Length)
            return null;
        if (signature.Max() - signature.Min() < 55 ||
            signature.Count(pixel => pixel >= 95) < 20)
            return null;
        return new WealthTabDetector(size, region, signature);
    }

    public bool Check(Rectangle gameBounds)
    {
        if (new Size(gameBounds.Width / 2, gameBounds.Height) != _captureSize) return false;
        var screenRegion = new Rectangle(gameBounds.X + _region.X, gameBounds.Y + _region.Y,
            _region.Width, _region.Height);
        if (!SystemInformation.VirtualScreen.Contains(screenRegion)) return false;

        using var bitmap = new Bitmap(_region.Width, _region.Height);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.CopyFromScreen(screenRegion.Location, Point.Empty, screenRegion.Size);
        return Observe(bitmap);
    }

    internal bool Observe(Bitmap bitmap)
    {
        int distance = 0, outliers = 0;
        for (var row = 0; row < Rows; row++)
        {
            for (var column = 0; column < Columns; column++)
            {
                var pixel = bitmap.GetPixel((2 * column + 1) * bitmap.Width / (2 * Columns),
                    (2 * row + 1) * bitmap.Height / (2 * Rows));
                var luminance = (pixel.R * 77 + pixel.G * 150 + pixel.B * 29) >> 8;
                var delta = Math.Abs(luminance - _signature[row * Columns + column]);
                distance += delta;
                if (delta > 35) outliers++;
            }
        }
        if (distance <= _signature.Length * 10 && outliers <= _signature.Length / 12)
        {
            _misses = 0;
            if (_wasOpen || ++_matches < 2) return false;
            _wasOpen = true;
            return true;
        }
        _matches = 0;
        if (++_misses >= 2)
        {
            _misses = 2;
            _wasOpen = false;
        }
        return false;
    }

    public void Pause()
    {
        _matches = 0;
        _misses = 0;
    }
}
