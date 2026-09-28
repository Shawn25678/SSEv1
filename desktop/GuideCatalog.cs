using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ExileLedger;

internal static class GuideCatalog
{
    internal record Entry(string title, string url, string source, string? download, string[] videos, DateTime seen, string[]? guides = null);

    static readonly HttpClient Client = new(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(18), MaxResponseContentBufferSize = 8 * 1024 * 1024 };
    static string FilePath(string root) => Path.Combine(root, "build-bookmarks.json");
    internal static bool IsSource(string url) => Uri.TryCreate(url, UriKind.Absolute, out var u) && u.Scheme == "https" &&
        ((u.Host is "mobalytics.gg" or "www.mobalytics.gg") && u.AbsolutePath.StartsWith("/poe-2/") || (u.Host is "maxroll.gg" or "www.maxroll.gg") && u.AbsolutePath.StartsWith("/poe2/"));
    static readonly HashSet<string> Categories = new(StringComparer.OrdinalIgnoreCase) { "starter", "community", "creators", "verified", "warrior", "titan", "warbringer", "smith-of-kitava", "ranger", "deadeye", "pathfinder", "sorceress", "chronomancer", "stormweaver", "disciple-of-varashta", "mercenary", "gemling-legionnaire", "witch-hunter", "tactician", "monk", "invoker", "acolyte", "witch", "blood-mage", "infernalist", "lich", "huntress", "amazon", "ritualist", "druid", "shaman", "oracle", "martial-artist", "spirit-walker", "abyssal-lich" };
    internal static bool IsBuild(string url) => IsSource(url) && Uri.TryCreate(url, UriKind.Absolute, out var u) && Regex.IsMatch(u.AbsolutePath, @"/(?:builds|build-guides)/[^/]+/?$", RegexOptions.IgnoreCase) && !Categories.Contains(u.AbsolutePath.TrimEnd('/').Split('/').Last());
    internal static bool IsVideo(string url) => Uri.TryCreate(url, UriKind.Absolute, out var u) && u.Scheme == "https" &&
        ((u.Host is "www.youtube.com" or "youtube.com") && (u.AbsolutePath == "/watch" || u.AbsolutePath.StartsWith("/embed/")) || u.Host == "youtu.be");
    internal static bool IsBookmark(string url) => IsBuild(url) || IsVideo(url);
    static string Canonical(string url) {
        var u = new Uri(url);
        if (u.Host is "youtu.be") return "https://www.youtube.com/watch?v=" + u.AbsolutePath.Trim('/');
        if (IsVideo(url)) {
            if (u.AbsolutePath.StartsWith("/embed/")) return "https://www.youtube.com/watch?v=" + u.Segments.Last();
            var id = Regex.Match(u.Query, @"(?:\?|&)v=([^&]+)").Groups[1].Value;
            if (id.Length > 0) return "https://www.youtube.com/watch?v=" + id;
        }
        return u.GetLeftPart(UriPartial.Path).TrimEnd('/');
    }
    internal static string BuildTitle(string source, string? title) {
        title = WebUtility.HtmlDecode(title ?? "").Trim();
        title = Regex.Replace(title, @"\s+[-|–—]\s*(?:Maxroll(?:\.gg)?|Mobalytics|YouTube).*$", "", RegexOptions.IgnoreCase).Trim();
        if (title.Length > 0 && !Regex.IsMatch(title, @"^(?:path of exile\s*2|poe\s*2|poe2|build guides?|maxroll(?:\.gg)?|mobalytics|youtube|just a moment[.!…]*)$", RegexOptions.IgnoreCase)) return title[..Math.Min(180,title.Length)];
        if (IsVideo(source)) return "YouTube build video";
        var slug = Uri.UnescapeDataString(new Uri(source).AbsolutePath.TrimEnd('/').Split('/').Last()).Replace('-', ' ');
        return System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(slug);
    }
    static List<Entry> Read(string root) {
        var rows = File.Exists(FilePath(root)) ? JsonSerializer.Deserialize<List<Entry>>(File.ReadAllText(FilePath(root))) ?? new() : new List<Entry>();
        return rows.Select(row=>row with {title=BuildTitle(row.url,row.title)}).ToList();
    }
    static void Write(string root, List<Entry> entries) {
        Directory.CreateDirectory(root);
        var path = FilePath(root);
        File.WriteAllText(path + ".tmp", JsonSerializer.Serialize(entries)); File.Move(path + ".tmp", path, true);
    }
    internal static int Bookmark(string root, string source, string json) {
        if (!IsBookmark(source)) throw new InvalidDataException("Use an individual Maxroll or Mobalytics build guide, or a YouTube video link.");
        source = Canonical(source);
        using var doc = JsonDocument.Parse(json);
        var links = doc.RootElement.GetProperty("links").EnumerateArray().Take(3000)
            .Select(x=>x.GetProperty("url").GetString() ?? "").ToArray();
        var entries = Read(root);
        var old = entries.FirstOrDefault(x=>x.url==source);
        var title = doc.RootElement.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
        if (string.IsNullOrWhiteSpace(title) && old != null) title = old.title;
        title = BuildTitle(source,title);
        var download = links.FirstOrDefault(x=>Uri.TryCreate(x,UriKind.Absolute,out var u) && u.Scheme=="https" && TrackerWindow.AllowedGuideHost(u.Host) && u.AbsolutePath.EndsWith(".build",StringComparison.OrdinalIgnoreCase));
        var videos = links.Where(IsVideo).Select(Canonical).Where(x=>x!=source).Distinct().Take(8).ToArray();
        var guides = links.Where(IsBuild).Select(Canonical).Where(x=>x!=source).Distinct().Take(8).ToArray();
        var entry = new Entry(title[..Math.Min(180,title.Length)],source,new Uri(source).Host,download ?? old?.download,
            videos.Length>0?videos:old?.videos ?? Array.Empty<string>(), DateTime.UtcNow,
            guides.Length>0?guides:old?.guides ?? Array.Empty<string>());
        entries.RemoveAll(x=>x.url==source); entries.Insert(0,entry); Write(root,entries);
        return 1;
    }
    internal static async Task<string> HandleAsync(string root, string action, string url) {
        var messages = new List<string>();
        if (action == "remove") {
            var entries = Read(root); entries.RemoveAll(x=>x.url==url); Write(root,entries);
        } else if (action == "add") {
            if (!IsBookmark(url)) throw new InvalidDataException("Paste an individual Maxroll or Mobalytics build guide, or a YouTube video link.");
            url = Canonical(url);
            // Save the requested page only. Related links stay inside its card.
            Bookmark(root,url,"{\"title\":\"\",\"links\":[]}");
            try {
                using var response = await Client.GetAsync(url); response.EnsureSuccessStatusCode();
                var html = await response.Content.ReadAsStringAsync();
                var match = Regex.Match(html,@"<title\b[^>]*>(.*?)</title>",RegexOptions.IgnoreCase|RegexOptions.Singleline,TimeSpan.FromSeconds(2));
                var title = WebUtility.HtmlDecode(Regex.Replace(match.Groups[1].Value,"<[^>]+>"," ")).Trim();
                if (title.Contains("Just a moment",StringComparison.OrdinalIgnoreCase) || title.Length==0) throw new InvalidDataException();
                var links = Regex.Matches(html,"(?:href|src)=[\"']([^\"']+)[\"']",RegexOptions.IgnoreCase,TimeSpan.FromSeconds(2)).Cast<Match>().Take(3000)
                    .Select(m=>new { url=Uri.TryCreate(new Uri(url),WebUtility.HtmlDecode(m.Groups[1].Value),out var u)?u.AbsoluteUri:"" }).ToArray();
                Bookmark(root,url,JsonSerializer.Serialize(new {title,links}));
                messages.Add("Bookmarked. Available page details and related links were added.");
            } catch { messages.Add("Bookmarked. Open the page and press Bookmark build to update its details when it finishes loading."); }
        } else if (action != "list") throw new InvalidDataException("Unknown bookmark action.");
        return JsonSerializer.Serialize(new { entries=Read(root), messages });
    }
}
