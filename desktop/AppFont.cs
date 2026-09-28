using System.Drawing;
using System.Drawing.Text;
using System.Reflection;
using System.Runtime.InteropServices;

namespace ExileLedger;

static class AppFont
{
    static readonly PrivateFontCollection Fonts = new();
    // Windows and GDI+ both need the font registered; keep its memory for the process lifetime.
    static readonly List<IntPtr> FontMemory = new();

    [DllImport("gdi32.dll")]
    static extern IntPtr AddFontMemResourceEx(IntPtr data, uint size, IntPtr reserved, ref uint count);

    static AppFont()
    {
        foreach (var file in new[] { "Inter-Regular.ttf", "Inter-Bold.ttf" })
        {
            using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("www.fonts." + file)
                ?? throw new InvalidOperationException("Missing bundled font: " + file);
            using var buffer = new MemoryStream();
            stream.CopyTo(buffer);
            var bytes = buffer.ToArray();
            var memory = Marshal.AllocHGlobal(bytes.Length);
            Marshal.Copy(bytes, 0, memory, bytes.Length);
            FontMemory.Add(memory);
            Fonts.AddMemoryFont(memory, bytes.Length);
            uint count = 0;
            AddFontMemResourceEx(memory, (uint)bytes.Length, IntPtr.Zero, ref count);
        }
    }

    public static Font Create(float size, FontStyle style = FontStyle.Regular) => new(Fonts.Families[0], size, style);
}
