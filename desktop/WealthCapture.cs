using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace ExileLedger;

static class WealthCapture
{
    public static string Take(Rectangle bounds)
    {
        // The Currency tab occupies the left side of the game client.
        bounds.Width /= 2;
        var visible = Rectangle.Intersect(bounds, SystemInformation.VirtualScreen);
        if (visible.Width < 100 || visible.Height < 100 ||
            (long)visible.Width * visible.Height > 12_000_000)
            throw new InvalidOperationException("Keep the PoE 2 stash visible on screen before capturing.");

        using var bitmap = new Bitmap(visible.Width, visible.Height);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.CopyFromScreen(visible.Location, Point.Empty, visible.Size);
        using var png = new MemoryStream();
        bitmap.Save(png, System.Drawing.Imaging.ImageFormat.Png);
        return "data:image/png;base64," + Convert.ToBase64String(png.ToArray());
    }

    public static async Task<string> ReadCountsAsync(JsonElement crops)
    {
        if (crops.ValueKind != JsonValueKind.Array || crops.GetArrayLength() is < 1 or > 48 ||
            crops.EnumerateArray().Any(crop => crop.ValueKind != JsonValueKind.String ||
                crop.GetString()!.Length > 140_000))
            throw new InvalidOperationException("Select up to 48 small count regions.");

        // Windows PowerShell supplies the WinRT projection for the installed OCR engine.
        // Image data goes through stdin and is processed in memory.
        var command = Convert.ToBase64String(Encoding.Unicode.GetBytes(OcrScript));
        using var process = Process.Start(new ProcessStartInfo
        {
            FileName = Path.Combine(Environment.SystemDirectory, "WindowsPowerShell", "v1.0", "powershell.exe"),
            Arguments = "-NoProfile -NonInteractive -EncodedCommand " + command,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        }) ?? throw new InvalidOperationException("Windows OCR could not start.");
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
            var output = process.StandardOutput.ReadToEndAsync(timeout.Token);
            var errors = process.StandardError.ReadToEndAsync(timeout.Token);
            await process.StandardInput.WriteLineAsync(crops.GetRawText().AsMemory(), timeout.Token);
            process.StandardInput.Close();
            await process.WaitForExitAsync(timeout.Token);
            var result = await output;
            await errors;
            if (process.ExitCode != 0)
                throw new InvalidOperationException("Windows OCR failed. Check that a Windows OCR language is installed.");
            return result;
        }
        catch (OperationCanceledException)
        {
            if (!process.HasExited) process.Kill();
            throw new InvalidOperationException("Windows OCR timed out. Try capturing the tab again.");
        }
    }

    const string OcrScript = """
        $ErrorActionPreference = 'Stop'
        $ProgressPreference = 'SilentlyContinue'
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
        $null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
        $null = [Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
        $null = [Windows.Storage.Streams.DataWriter,Windows.Storage.Streams,ContentType=WindowsRuntime]
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
        if (!$engine) { throw 'No Windows OCR language is installed.' }
        $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
            $_.Name -eq 'AsTask' -and $_.IsGenericMethodDefinition -and
            $_.GetParameters().Count -eq 1 -and
            $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
        } | Select-Object -First 1
        function Wait-Result($operation, [Type]$resultType) {
            $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
            $task.GetAwaiter().GetResult()
        }
        $results = @(foreach ($crop in (ConvertFrom-Json ([Console]::ReadLine()))) {
            $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
            $writer = New-Object Windows.Storage.Streams.DataWriter($stream)
            $bitmap = $null
            try {
                $writer.WriteBytes([Convert]::FromBase64String($crop))
                $null = Wait-Result ($writer.StoreAsync()) ([uint32])
                $null = $writer.DetachStream()
                $stream.Seek(0)
                $decoder = Wait-Result ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
                $bitmap = Wait-Result ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
                $result = Wait-Result ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
                [string]$result.Text
            } finally {
                if ($bitmap) { $bitmap.Dispose() }
                $writer.Dispose()
                $stream.Dispose()
            }
        })
        ConvertTo-Json -InputObject $results -Compress
        """;
}
