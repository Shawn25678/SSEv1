using System.Diagnostics;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;

namespace ExileLedger;

static class AppUpdate
{
    const string Repo = "Shawn25678/SSEv1";
    const string AssetName = "StillSaneExile-Setup.exe";
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
        var hit = await LatestAsync();
        if (hit is null) return "{\"error\":\"no update\"}";
        if (Norm(hit.Value.ver) <= Norm(Parse(CurrentLabel()))) return "{\"error\":\"up to date\"}";
        var path = Path.Combine(Path.GetTempPath(), AssetName);
        using var res = await Http.GetAsync(hit.Value.url, HttpCompletionOption.ResponseHeadersRead);
        if (!res.IsSuccessStatusCode) return "{\"error\":\"download failed\"}";
        if (res.RequestMessage?.RequestUri is { } final && !AllowedHost(final)) return "{\"error\":\"bad host\"}";
            var len = res.Content.Headers.ContentLength ?? 0;
            if (len > 0 && (len < 1_000_000 || len > 250_000_000)) return "{\"error\":\"bad size\"}";
        await using (var input = await res.Content.ReadAsStreamAsync())
        await using (var output = File.Create(path))
        {
            var header = new byte[2];
            var n = await input.ReadAsync(header);
            if (n < 2 || header[0] != (byte)'M' || header[1] != (byte)'Z') return "{\"error\":\"bad file\"}";
            await output.WriteAsync(header);
            await input.CopyToAsync(output);
        }
        if (new FileInfo(path).Length < 1_000_000) return "{\"error\":\"bad file\"}";
        var dir = Path.GetDirectoryName(Environment.ProcessPath) ?? "";
        var fallback = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Still Sane Exile");
        var args = "/VERYSILENT /NORESTART /SUPPRESSMSGBOXES /CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS";
        if (string.IsNullOrWhiteSpace(dir) || !Directory.Exists(dir) || BadDir(dir))
            dir = fallback;
        if (!BadDir(dir))
            args += " /DIR=\"" + dir.TrimEnd('\\') + "\"";
        Process.Start(new ProcessStartInfo
        {
            FileName = path,
            Arguments = args,
            UseShellExecute = true,
        });
        return "{\"ok\":true}";
    }

    static async Task<(Version ver, Uri url)?> LatestAsync()
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/repos/" + Repo + "/releases/latest");
        req.Headers.TryAddWithoutValidation("Accept", "application/vnd.github+json");
        using var res = await Http.SendAsync(req);
        if (!res.IsSuccessStatusCode) return null;
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
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
