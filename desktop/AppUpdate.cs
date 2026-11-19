using System.ComponentModel;
using System.Diagnostics;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;

namespace ExileLedger;

static class AppUpdate
{
    const string Repo = "Shawn25678/SSEv1";
    const string AssetName = "StillSaneExile-Setup.exe";
    const long MinInstallerBytes = 1_000_000;
    const long MaxInstallerBytes = 250_000_000;
    static readonly HttpClient Http = Create();

    public static string CurrentLabel()
    {
        var v = Norm(Assembly.GetExecutingAssembly().GetName().Version ?? new Version(0, 0, 0));
        return v.Major + "." + v.Minor + "." + Math.Max(v.Build, 0);
    }

    public static async Task<string> CheckJsonAsync()
    {
        var current = CurrentLabel();
        var hit = await LatestAsync();
        if (hit is null)
            return JsonSerializer.Serialize(new { current, latest = "", newer = false });
        var newer = Norm(hit.Value.ver) > Norm(Parse(current));
        return JsonSerializer.Serialize(new { current, latest = Label(hit.Value.ver), newer });
    }

    public static async Task<string> InstallJsonAsync()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(20));
        var token = timeout.Token;
        string? path = null;
        var launched = false;
        try
        {
            var hit = await LatestAsync(token);
            if (hit is null) return UpdateError("GitHub didn’t return an installer.");
            if (Norm(hit.Value.ver) <= Norm(Parse(CurrentLabel()))) return UpdateError("SSE is already up to date.");
            using var res = await Http.GetAsync(hit.Value.url, HttpCompletionOption.ResponseHeadersRead, token);
            if (!res.IsSuccessStatusCode) return UpdateError($"GitHub declined the download (HTTP {(int)res.StatusCode}).");
            if (res.RequestMessage?.RequestUri is { } final && !AllowedHost(final))
                return UpdateError("The installer download was redirected outside GitHub.");

            path = Path.Combine(Path.GetTempPath(), $"StillSaneExile-Setup-{Guid.NewGuid():N}.exe");
            await SaveInstallerAsync(res.Content, path, token);
            token.ThrowIfCancellationRequested();
            var dir = Path.GetDirectoryName(Environment.ProcessPath) ?? "";
            var fallback = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Still Sane Exile");
            var args = "/VERYSILENT /NORESTART /SUPPRESSMSGBOXES /CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS";
            if (string.IsNullOrWhiteSpace(dir) || !Directory.Exists(dir) || BadDir(dir))
                dir = fallback;
            if (!BadDir(dir))
                args += " /DIR=\"" + dir.TrimEnd('\\') + "\"";
            using var installer = Process.Start(new ProcessStartInfo { FileName = path, Arguments = args, UseShellExecute = true });
            launched = installer is not null;
            return launched ? "{\"ok\":true}" : UpdateError("Windows didn’t start the installer.");
        }
        catch (InvalidDataException)
        {
            return UpdateError("The installer download was incomplete or invalid.");
        }
        catch (OperationCanceledException)
        {
            return UpdateError("The update download timed out.");
        }
        catch (HttpRequestException)
        {
            return UpdateError("SSE couldn’t download the update from GitHub.");
        }
        catch (Win32Exception)
        {
            return UpdateError("Windows didn’t start the installer.");
        }
        catch (UnauthorizedAccessException)
        {
            return UpdateError("SSE couldn’t write the installer to the temporary folder.");
        }
        catch (IOException)
        {
            return UpdateError("The installer download couldn’t be saved.");
        }
        finally
        {
            if (!launched && path is not null)
            {
                try { File.Delete(path); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }
    }

    static string UpdateError(string error) => JsonSerializer.Serialize(new { error });

    internal static async Task SaveInstallerAsync(HttpContent content, string path, CancellationToken token)
    {
        var length = content.Headers.ContentLength;
        if (length is < MinInstallerBytes or > MaxInstallerBytes) throw new InvalidDataException();
        await using var input = await content.ReadAsStreamAsync(token);
        var header = new byte[2];
        if (await input.ReadAtLeastAsync(header, header.Length, false, token) != header.Length ||
            header[0] != (byte)'M' || header[1] != (byte)'Z') throw new InvalidDataException();
        await using var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await output.WriteAsync(header, token);
        await input.CopyToAsync(output, token);
        if (output.Length is < MinInstallerBytes or > MaxInstallerBytes ||
            length.HasValue && output.Length != length.Value) throw new InvalidDataException();
    }

    static async Task<(Version ver, Uri url)?> LatestAsync(CancellationToken token = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/repos/" + Repo + "/releases/latest");
        req.Headers.TryAddWithoutValidation("Accept", "application/vnd.github+json");
        using var res = await Http.SendAsync(req, token);
        if (!res.IsSuccessStatusCode) return null;
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(token));
        var tag = doc.RootElement.TryGetProperty("tag_name", out var tagEl) ? tagEl.GetString() ?? "" : "";
        var ver = Parse(tag);
        if (ver.Major == 0 && ver.Minor == 0 && ver.Build <= 0) return null;
        if (!doc.RootElement.TryGetProperty("assets", out var assets) || assets.ValueKind != JsonValueKind.Array) return null;
        foreach (var asset in assets.EnumerateArray())
        {
            var name = asset.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
            if (!name.Equals(AssetName, StringComparison.OrdinalIgnoreCase)) continue;
            var href = asset.TryGetProperty("browser_download_url", out var urlEl) ? urlEl.GetString() ?? "" : "";
            if (!Uri.TryCreate(href, UriKind.Absolute, out var uri)) return null;
            if (!AllowedHost(uri)) return null;
            return (ver, uri);
        }
        return null;
    }

    static HttpClient Create()
    {
        var http = new HttpClient(new SocketsHttpHandler { AutomaticDecompression = System.Net.DecompressionMethods.All })
        {
            Timeout = TimeSpan.FromMinutes(5),
        };
        http.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "StillSaneExile/" + CurrentLabel());
        return http;
    }

    static bool AllowedHost(Uri uri)
    {
        if (!uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return false;
        var host = uri.Host;
        return host.Equals("github.com", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".github.com", StringComparison.OrdinalIgnoreCase)
            || host.Equals("objects.githubusercontent.com", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".githubusercontent.com", StringComparison.OrdinalIgnoreCase);
    }

    static bool BadDir(string dir)
    {
        var u = dir.ToUpperInvariant();
        return u.Contains(@"\USERS\DEFAULT\") || u.Contains(@"\WINDOWS\SYSTEM32\CONFIG\SYSTEMPROFILE\");
    }

    static Version Parse(string text)
    {
        text = (text ?? "").Trim().TrimStart('v', 'V');
        return Version.TryParse(text, out var v) ? v : new Version(0, 0, 0);
    }

    static Version Norm(Version v) => new(v.Major, v.Minor, Math.Max(v.Build, 0));

    static string Label(Version v)
    {
        var n = Norm(v);
        return n.Major + "." + n.Minor + "." + n.Build;
    }
}
