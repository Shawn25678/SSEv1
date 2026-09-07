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
        SingleInstance = new Mutex(true, @"Local\StillSaneExile.SingleInstance", out _);
        ApplicationConfiguration.Initialize();
        Application.Run(new TrackerWindow());
        SingleInstance.Dispose();
    }
}

sealed class TrackerWindow : Form
{
    static readonly HttpClient Http = CreateHttp();
    static readonly SemaphoreSlim Gate = new(3, 3);
    static readonly ConcurrentDictionary<string, (DateTime at, int status, string body)> Cache = new();
    static readonly JsonSerializerOptions JsonOut = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(10);

    readonly WebView2 _web = new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.FromArgb(12, 10, 8),
    };

    const int HotLogId = 1;
    const int HotNextId = 2;
    const uint ModNoRepeat = 0x4000;
    const int WmHotkey = 0x0312;
    string _hotLog = "F8";
    string _hotNext = "F9";
    bool _capturingItem;

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
        Width = 1320;
        Height = 860;
        MinimumSize = new Size(900, 640);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(12, 10, 8);
        Controls.Add(_web);
        Load += OnLoad;
        FormClosed += (_, _) => ClearHotkeys();
    }

    protected override void WndProc(ref Message m)
    {
        if (m.Msg == WmHotkey)
        {
            var id = m.WParam.ToInt32();
            if (id == HotLogId) BeginInvoke(CaptureClipboardItem);
            else if (id == HotNextId) BeginInvoke(() => PushHotkey("next-kill"));
        }
        base.WndProc(ref m);
    }

    [DllImport("user32.dll")]
    static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll")]
    static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, nuint dwExtraInfo);

    void ClearHotkeys()
    {
        try { UnregisterHotKey(Handle, HotLogId); } catch { /* ignore */ }
        try { UnregisterHotKey(Handle, HotNextId); } catch { /* ignore */ }
    }

    void ApplyHotkeys(string logSpec, string nextSpec)
    {
        ClearHotkeys();
        _hotLog = string.IsNullOrWhiteSpace(logSpec) ? "F8" : logSpec.Trim();
        _hotNext = string.IsNullOrWhiteSpace(nextSpec) ? "F9" : nextSpec.Trim();
        var logOk = TryParseHotkey(_hotLog, out var logMod, out var logVk) && RegisterHotKey(Handle, HotLogId, logMod, logVk);
        var nextOk = TryParseHotkey(_hotNext, out var nextMod, out var nextVk) && RegisterHotKey(Handle, HotNextId, nextMod, nextVk);
        if (!logOk || !nextOk)
        {
            PushJson(new
            {
                type = "hotkey-status",
                ok = false,
                error = !logOk ? _hotLog + " is already in use" : _hotNext + " is already in use",
            });
        }
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

    async void CaptureClipboardItem()
    {
        if (_capturingItem) return;
        _capturingItem = true;
        try
        {
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
            PushJson(new { type = "hotkey", action = "log-item", text });
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

    void PushHotkey(string action) => PushJson(new { type = "hotkey", action });

    void PushJson(object payload)
    {
        if (_web.CoreWebView2 is null) return;
        _web.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(payload, JsonOut));
    }

    static readonly HttpClient TradeHttp = CreateTradeHttp();
    static readonly TradeLimiter SearchLimit = TradeLimiter.Default();
    static readonly TradeLimiter FetchLimit = TradeLimiter.Default();
    static readonly SemaphoreSlim SlotLock = new(1, 1);
    const double RateDesyncSec = 0.8;

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

        public static TradeLimiter Default()
        {
            var limiter = new TradeLimiter();
            limiter.Limits.Add(new SlidingLimit(1, 5));
            return limiter;
        }

        public int WaitMs()
        {
            var penalty = PenaltyUntil > DateTime.UtcNow ? (int)(PenaltyUntil - DateTime.UtcNow).TotalMilliseconds : 0;
            var slot = 0;
            foreach (var limit in Limits) slot = Math.Max(slot, limit.WaitMs());
            return Math.Max(penalty, slot);
        }

        public void Borrow()
        {
            foreach (var limit in Limits) limit.Borrow();
        }

        public (int hits, int max, int window) Snapshot()
        {
            SlidingLimit? tight = null;
            foreach (var limit in Limits)
            {
                limit.Prune();
                if (tight is null || limit.WindowSec < tight.WindowSec) tight = limit;
            }
            if (tight is null) return (0, 1, 5);
            return (tight.Used, tight.Max, Math.Max(1, (int)Math.Round(tight.WindowSec)));
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

    sealed record RollFilter(string Id, double? Min);
    static Dictionary<string, List<(string id, string type)>>? FoldedStats;
    static readonly SemaphoreSlim StatBuild = new(1, 1);

    async Task FetchTradeStats(string id)
    {
        var body = await GetTradeStatsBody();
        Reply(id, body is not null, body is null ? 0 : 200, body ?? "{\"error\":\"trade stats failed\"}");
    }

    async Task<string?> GetTradeStatsBody()
    {
        const string cacheKey = "trade-stats-v1";
        if (Cache.TryGetValue(cacheKey, out var hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12) && hit.status is >= 200 and < 300)
            return hit.body;
        var disk = Path.Combine(AppDataDir(), "trade-stats.json");
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
        if (CombinedWaitMs() >= 1500 && SearchLimit.Limited) return null;
        await Gate.WaitAsync();
        try
        {
            if (Cache.TryGetValue(cacheKey, out hit) && DateTime.UtcNow - hit.at < TimeSpan.FromHours(12) && hit.status is >= 200 and < 300)
                return hit.body;
            if (!await WaitForSlot(SearchLimit)) return null;
            using var res = await TradeHttp.GetAsync("https://www.pathofexile.com/api/trade2/data/stats");
            NoteRate(res, search: true);
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

    async Task FetchTradePrice(string id, string league, string name, bool bust = false, bool thorough = false, string typeLine = "", IReadOnlyList<string>? rolls = null, IReadOnlyList<RollFilter>? preMapped = null)
    {
        name = (name ?? "").Trim();
        league = (league ?? "").Trim();
        if (!ValidLeague(league) || name.Length is < 2 or > 80)
        {
            Reply(id, false, 400, "{\"error\":\"bad trade query\"}");
            return;
        }
        var rollList = (rolls ?? Array.Empty<string>()).Where(r => !string.IsNullOrWhiteSpace(r)).Take(8).ToArray();
        if (SearchLimit.Limited && CombinedWaitMs() >= 1500)
        {
            Reply(id, false, 429, "{\"error\":\"rate limited\"}");
            return;
        }
        IReadOnlyList<RollFilter> mapped = preMapped is { Count: > 0 } ? preMapped : Array.Empty<RollFilter>();
        if (mapped.Count == 0 && rollList.Length > 0)
            mapped = await MapRollsToFilters(rollList);
        var extra = mapped.Count > 0
            ? ":roll:" + string.Join("|", mapped.Select(f => f.Id + (f.Min is double m ? ">" + m.ToString("G", System.Globalization.CultureInfo.InvariantCulture) : "")))
            : rollList.Length > 0 ? ":roll:none" : "";
        var cacheKey = "trade:" + league + ":" + name.ToLowerInvariant() + extra;
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
            var payload = (rollList.Length > 0 || mapped.Count > 0)
                ? await LookupRolledListing(league, name, typeLine, mapped)
                : await LookupTradeListing(league, name, thorough);
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
                if (fid.Length is < 8 or > 80) continue;
                double? min = null;
                if (row.TryGetProperty("min", out var minEl) && minEl.TryGetDouble(out var n) && double.IsFinite(n))
                    min = n;
                list.Add(new RollFilter(fid, min));
                if (list.Count >= 6) break;
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

    async Task<IReadOnlyList<RollFilter>> MapRollsToFilters(IReadOnlyList<string> rolls)
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
            var hit = MatchFoldedStat(FoldStat(roll), index);
            if (hit is null || !seen.Add(hit.Value.id)) continue;
            filters.Add(new RollFilter(hit.Value.id, FirstRollNumber(roll, reduced: Regex.IsMatch(roll, @"\breduced\b", RegexOptions.IgnoreCase))));
            if (filters.Count >= 6) break;
        }
        return filters;
    }

    static bool IsJunkTradeRoll(string roll)
    {
        return Regex.IsMatch(roll, @"^has\b.*\b(charm slot|socketable)", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"flask recovery applied instantly", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^\{", RegexOptions.IgnoreCase) ||
               Regex.IsMatch(roll, @"^grants skill", RegexOptions.IgnoreCase);
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

    static (string id, string type)? MatchFoldedStat(string fold, Dictionary<string, List<(string id, string type)>> index)
    {
        if (string.IsNullOrWhiteSpace(fold)) return null;
        if (index.TryGetValue(fold, out var exact))
            return PickStat(exact);
        (string id, string type)? best = null;
        var bestLen = 0;
        foreach (var (key, list) in index)
        {
            if (key.Length < 10 || key.Length <= bestLen) continue;
            if (fold == key || fold.StartsWith(key + " ", StringComparison.Ordinal) || key.StartsWith(fold + " ", StringComparison.Ordinal))
            {
                var pick = PickStat(list);
                if (pick is null) continue;
                best = pick;
                bestLen = key.Length;
            }
        }
        if (best is not null) return best;
        var needle = DistinctiveStatPhrase(fold);
        if (needle.Length < 12) return null;
        foreach (var (key, list) in index)
        {
            if (key.Length <= bestLen || !key.Contains(needle, StringComparison.Ordinal)) continue;
            var pick = PickStat(list);
            if (pick is null) continue;
            best = pick;
            bestLen = key.Length;
        }
        return best;
    }

    static (string id, string type)? PickStat(List<(string id, string type)> list)
    {
        foreach (var row in list)
        {
            if (row.type.Equals("explicit", StringComparison.OrdinalIgnoreCase) || row.id.StartsWith("explicit.", StringComparison.OrdinalIgnoreCase))
                return row;
        }
        return list.Count > 0 ? list[0] : null;
    }

    static string DistinctiveStatPhrase(string fold)
    {
        var ring = Regex.Match(fold ?? "", @"bonuses gained from (?:equipped )?(left|right) (?:equipped )?ring");
        if (ring.Success) return "bonuses gained from equipped " + ring.Groups[1].Value + " ring";
        return "";
    }

    static string FoldStat(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";
        var t = StripAdvancedRanges(UnwrapTags(text)).ToLowerInvariant();
        t = Regex.Replace(t, @"\([^)]*\)", " ");
        t = Regex.Replace(t, @"\{[^}]+\}", " ");
        t = Regex.Replace(t, @"\breduced\b", "increased");
        t = Regex.Replace(t, @"\bleft equipped ring\b", "equipped left ring");
        t = Regex.Replace(t, @"\bright equipped ring\b", "equipped right ring");
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

    static IEnumerable<string> RolledQueries(string name, string typeLine, IReadOnlyList<RollFilter> filters, bool relax = false)
    {
        JsonArray FilterArray()
        {
            var arr = new JsonArray();
            foreach (var filter in filters)
            {
                var obj = new JsonObject { ["id"] = filter.Id, ["disabled"] = false };
                if (filter.Min is double min)
                {
                    if (relax && min > 0) min = Math.Floor(min * 0.9);
                    obj["value"] = new JsonObject { ["min"] = min };
                }
                arr.Add(obj);
            }
            return arr;
        }

        JsonObject Body(bool includeType)
        {
            // Match Exiled Exchange 2: unique name + type, stats in one AND group.
            // Do not send rarity "unique" — the trade API rejects it.
            var query = new JsonObject
            {
                ["status"] = new JsonObject { ["option"] = "any" },
                ["name"] = name,
                ["stats"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["type"] = "and",
                        ["filters"] = FilterArray(),
                    },
                },
                ["filters"] = new JsonObject(),
            };
            if (includeType && !string.IsNullOrWhiteSpace(typeLine))
                query["type"] = typeLine;
            return new JsonObject
            {
                ["query"] = query,
                ["sort"] = new JsonObject { ["price"] = "asc" },
            };
        }

        if (!string.IsNullOrWhiteSpace(typeLine))
            yield return Body(true).ToJsonString();
        yield return Body(false).ToJsonString();
    }

    async Task<TradeLookup> LookupRolledListing(string league, string name, string typeLine, IReadOnlyList<RollFilter> filters)
    {
        var searchUri = "https://www.pathofexile.com/api/trade2/search/poe2/" + Uri.EscapeDataString(league);
        string? lastId = null;
        var lastTotal = 0;

        async Task<TradeLookup?> Run(string body)
        {
            if (SearchLimit.Limited && CombinedWaitMs() >= 1500) return new TradeLookup(RateLimited: true);
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
                lastId = root.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                lastTotal = root.TryGetProperty("total", out var totalEl) && totalEl.TryGetInt32(out var listed) ? listed : 0;
                if (!root.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array)
                    return null;
                var hashes = result.EnumerateArray().Select(el => el.GetString()).Where(h => !string.IsNullOrWhiteSpace(h)).Take(10).ToArray();
                if (hashes.Length == 0) return null;
                var fetchUrl = "https://www.pathofexile.com/api/trade2/fetch/" + string.Join(",", hashes) + "?query=" + Uri.EscapeDataString(lastId);
                if (!await WaitForSlot(FetchLimit)) return new TradeLookup(RateLimited: true);
                using var fetchRes = await TradeHttp.GetAsync(fetchUrl);
                NoteRate(fetchRes, search: false);
                string? fetchJson = null;
                if ((int)fetchRes.StatusCode == 429) return new TradeLookup(RateLimited: true);
                if ((int)fetchRes.StatusCode is 401 or 403) return new TradeLookup(Forbidden: true);
                if (fetchRes.IsSuccessStatusCode) fetchJson = await fetchRes.Content.ReadAsStringAsync();
                if (fetchJson is null) return null;
                var payload = ReadCheapestListing(fetchJson, name, root, league, lastId, filters.Count);
                return payload is not null ? new TradeLookup(payload) : null;
            }
        }

        foreach (var body in RolledQueries(name, typeLine, filters))
        {
            var got = await Run(body);
            if (got is { RateLimited: true } or { Forbidden: true }) return got;
            if (got?.Json is not null) return got;
            if (lastTotal > 0) break;
        }
        if (filters.Count > 0 && lastTotal == 0)
        {
            foreach (var body in RolledQueries(name, typeLine, filters, true).Take(1))
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
            var queryId = root.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
            var hashes = result.EnumerateArray().Select(el => el.GetString()).Where(h => !string.IsNullOrWhiteSpace(h)).Take(10).ToArray();
            if (hashes.Length == 0) continue;
            var fetchUrl = "https://www.pathofexile.com/api/trade2/fetch/" + string.Join(",", hashes) + "?query=" + Uri.EscapeDataString(queryId);
            if (!await WaitForSlot(FetchLimit)) return new TradeLookup(RateLimited: true);
            using var fetchRes = await TradeHttp.GetAsync(fetchUrl);
            NoteRate(fetchRes, search: false);
            string? fetchJson = null;
            if ((int)fetchRes.StatusCode == 429)
            {
                var wait = RetryAfterMs(fetchRes) ?? 4000;
                await Task.Delay(wait);
                using var retryFetch = await TradeHttp.GetAsync(fetchUrl);
                NoteRate(retryFetch, search: false);
                if ((int)retryFetch.StatusCode == 429) return new TradeLookup(RateLimited: true);
                if (!retryFetch.IsSuccessStatusCode) continue;
                fetchJson = await retryFetch.Content.ReadAsStringAsync();
            }
            else if ((int)fetchRes.StatusCode is 401 or 403)
            {
                return new TradeLookup(Forbidden: true);
            }
            else if (fetchRes.IsSuccessStatusCode)
            {
                fetchJson = await fetchRes.Content.ReadAsStringAsync();
            }
            if (fetchJson is null) continue;
            var payload = ReadCheapestListing(fetchJson, name, root, league, queryId, 0);
            if (payload is not null) return new TradeLookup(payload);
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

    async Task<(string? json, int status)> PostTradeSearch(string uri, string body)
    {
        if (!await WaitForSlot(SearchLimit)) return (null, 429);
        using var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
        using var searchRes = await TradeHttp.PostAsync(uri, content);
        NoteRate(searchRes, search: true);
        var status = (int)searchRes.StatusCode;
        var searchJson = await searchRes.Content.ReadAsStringAsync();
        if (status == 429) return (null, 429);
        if (status is 401 or 403) return (null, status);
        return (searchRes.IsSuccessStatusCode ? searchJson : null, status);
    }

    string? ReadCheapestListing(string fetchJson, string fallbackName, JsonElement searchRoot, string league = "", string queryId = "", int mapped = 0)
    {
        using var fetched = JsonDocument.Parse(fetchJson);
        if (!fetched.RootElement.TryGetProperty("result", out var listings) || listings.ValueKind != JsonValueKind.Array)
            return null;
        string? bestName = null;
        string? bestCurrency = null;
        double bestAmount = double.MaxValue;
        var count = 0;
        foreach (var row in listings.EnumerateArray())
        {
            if (!row.TryGetProperty("listing", out var listing) ||
                !listing.TryGetProperty("price", out var price) ||
                price.ValueKind != JsonValueKind.Object)
                continue;
            var amount = price.TryGetProperty("amount", out var amountEl) && amountEl.TryGetDouble(out var n) ? n : double.NaN;
            var currency = price.TryGetProperty("currency", out var curEl) ? curEl.GetString() ?? "" : "";
            if (!NumberIsPositive(amount) || string.IsNullOrWhiteSpace(currency)) continue;
            count++;
            if (amount < bestAmount)
            {
                bestAmount = amount;
                bestCurrency = currency;
                bestName = ItemDisplayName(row, fallbackName);
            }
        }
        if (count == 0 || bestCurrency is null) return null;
        var total = searchRoot.TryGetProperty("total", out var totalEl) && totalEl.TryGetInt32(out var listed) ? listed : count;
        return JsonSerializer.Serialize(new
        {
            name = string.IsNullOrWhiteSpace(bestName) ? fallbackName : bestName,
            amount = bestAmount,
            currency = bestCurrency,
            listings = total,
            mapped,
            league,
            url = string.IsNullOrWhiteSpace(queryId) ? "" : TradeSearchUrl(league, queryId),
        }, JsonOut);
    }

    static string ItemDisplayName(JsonElement row, string fallback)
    {
        if (!row.TryGetProperty("item", out var item) || item.ValueKind != JsonValueKind.Object)
            return fallback;
        var uniqueName = item.TryGetProperty("name", out var nameEl) ? nameEl.GetString() : null;
        if (!string.IsNullOrWhiteSpace(uniqueName)) return uniqueName;
        var typeLine = item.TryGetProperty("typeLine", out var typeEl) ? typeEl.GetString() : null;
        return string.IsNullOrWhiteSpace(typeLine) ? fallback : typeLine;
    }

    static bool NumberIsPositive(double n) => n is > 0 and < 1_000_000_000 && !double.IsNaN(n) && !double.IsInfinity(n);

    static IEnumerable<string> TradeQueries(string name, bool thorough = false)
    {
        yield return JsonSerializer.Serialize(new
        {
            query = new { status = new { option = "any" }, name },
            sort = new Dictionary<string, string> { ["price"] = "asc" },
        });
        yield return JsonSerializer.Serialize(new
        {
            query = new { status = new { option = "any" }, type = name },
            sort = new Dictionary<string, string> { ["price"] = "asc" },
        });
        if (!name.EndsWith(" Support", StringComparison.OrdinalIgnoreCase) &&
            (thorough || name.Contains("Support", StringComparison.OrdinalIgnoreCase) || name.Contains("Lineage", StringComparison.OrdinalIgnoreCase)))
        {
            yield return JsonSerializer.Serialize(new
            {
                query = new { status = new { option = "any" }, type = name + " Support" },
                sort = new Dictionary<string, string> { ["price"] = "asc" },
            });
        }
        if (!thorough) yield break;
        yield return JsonSerializer.Serialize(new
        {
            query = new
            {
                status = new { option = "any" },
                type = name,
                filters = new { type_filters = new { filters = new { rarity = new { option = "unique" } } } },
            },
            sort = new Dictionary<string, string> { ["price"] = "asc" },
        });
    }

    static bool AllowedNinjaPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || path.Contains("..", StringComparison.Ordinal)) return false;
        return path.StartsWith("/poe2/api/economy/", StringComparison.Ordinal);
    }

    async void OnLoad(object? sender, EventArgs e)
    {
        var index = ExtractWebFiles();
        var userData = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ExileLedger");
        Directory.CreateDirectory(userData);

        try
        {
            var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            await _web.EnsureCoreWebView2Async(env);
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

        _web.CoreWebView2.Settings.AreDevToolsEnabled = false;
        _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
        _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
        _web.CoreWebView2.Settings.IsWebMessageEnabled = true;
        _web.CoreWebView2.WebMessageReceived += OnWebMessage;
        _web.CoreWebView2.NewWindowRequested += (_, ev) =>
        {
            ev.Handled = true;
            OpenTradeUrl(ev.Uri);
        };
        _web.CoreWebView2.Navigate(new Uri(index).AbsoluteUri);
        ApplyHotkeys(_hotLog, _hotNext);
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
            if (type == "hotkeys")
            {
                var log = root.TryGetProperty("log", out var logEl) ? logEl.GetString() ?? "F8" : "F8";
                var next = root.TryGetProperty("next", out var nextEl) ? nextEl.GetString() ?? "F9" : "F9";
                BeginInvoke(() => ApplyHotkeys(log, next));
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
            if (type == "trade-stats")
            {
                await FetchTradeStats(id ?? "");
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
                await FetchTradePrice(id ?? "", league, itemName, skipCache, thorough, typeLine, rolls, mapped);
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
            rate = RatePayload(wait, ready, SearchLimit.Limited || FetchLimit.Limited, snap),
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
            rate = RatePayload(wait, ready, SearchLimit.Limited || FetchLimit.Limited, snap),
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

    static int CombinedWaitMs() => Math.Max(SearchLimit.WaitMs(), FetchLimit.WaitMs());

    async Task<bool> WaitForSlot(TradeLimiter limiter)
    {
        await SlotLock.WaitAsync();
        try
        {
            while (true)
            {
                var wait = limiter.WaitMs();
                if (limiter.Limited && wait >= 1500) return false;
                if (wait <= 0)
                {
                    limiter.Borrow();
                    PushRate();
                    return true;
                }
                if (wait >= 20000) return false;
                PushRate();
                SlotLock.Release();
                try { await Task.Delay(Math.Min(wait, 250)); }
                finally { await SlotLock.WaitAsync(); }
            }
        }
        finally
        {
            SlotLock.Release();
        }
    }

    void NoteRate(HttpResponseMessage res, bool search)
    {
        var limiter = search ? SearchLimit : FetchLimit;
        AdjustLimiter(limiter, res);
        if ((int)res.StatusCode == 429 && limiter.WaitMs() == 0)
            limiter.PenaltyUntil = DateTime.UtcNow.AddSeconds(5);
        PushRate();
    }

    static void AdjustLimiter(TradeLimiter limiter, HttpResponseMessage res)
    {
        string Header(string name) =>
            res.Headers.TryGetValues(name, out var values) ? string.Join(",", values) : "";

        var retry = RetryAfterMs(res) ?? 0;
        var rules = Header("x-rate-limit-rules").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
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

        limiter.Limits.RemoveAll(limit => !incoming.Any(row => limit.Same(row.max, row.window)));
        if (limiter.Limits.Count == 0)
            limiter.Limits.Add(new SlidingLimit(incoming[0].max, incoming[0].window));

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
        if (retry > 0)
            limiter.PenaltyUntil = DateTime.UtcNow.AddMilliseconds(Math.Max(retry, limiter.Limited ? (limiter.PenaltyUntil - DateTime.UtcNow).TotalMilliseconds : 0));
    }

    static void OpenTradeUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return;
        if (!uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return;
        if (!uri.Host.Equals("www.pathofexile.com", StringComparison.OrdinalIgnoreCase)) return;
        if (!uri.AbsolutePath.StartsWith("/trade2/", StringComparison.OrdinalIgnoreCase)) return;
        Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
    }

    static string AppDataDir()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ExileLedger");
        Directory.CreateDirectory(dir);
        return dir;
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

    static string ExtractWebFiles()
    {
        var dir = Path.Combine(AppDataDir(), "www");
        Directory.CreateDirectory(dir);
        var asm = Assembly.GetExecutingAssembly();
        WriteResource(asm, "www.index.html", Path.Combine(dir, "index.html"));
        WriteResource(asm, "www.styles.css", Path.Combine(dir, "styles.css"));
        WriteResource(asm, "www.app.js", Path.Combine(dir, "app.js"));
        WriteResource(asm, "www.decks.js", Path.Combine(dir, "decks.js"));
        WriteResource(asm, "www.deck-game.js", Path.Combine(dir, "deck-game.js"));
        WriteResource(asm, "www.bosses.js", Path.Combine(dir, "bosses.js"));
        WriteResource(asm, "www.icons.js", Path.Combine(dir, "icons.js"));
        var leftoverSigil = Path.Combine(dir, "poe2-sigil.png");
        if (File.Exists(leftoverSigil)) File.Delete(leftoverSigil);
        WriteResource(asm, "www.still-sane-sigil.png", Path.Combine(dir, "still-sane-sigil.png"));
        var artDir = Path.Combine(dir, "art");
        if (Directory.Exists(artDir)) Directory.Delete(artDir, true);
        Directory.CreateDirectory(artDir);
        foreach (var name in asm.GetManifestResourceNames())
        {
            const string prefix = "www.art.";
            if (!name.StartsWith(prefix, StringComparison.Ordinal)) continue;
            WriteResource(asm, name, Path.Combine(dir, "art", name[prefix.Length..]));
        }
        return Path.Combine(dir, "index.html");
    }

    static readonly Regex IconWithName = new(
        "\"icon\"\\s*:\\s*\"(https://web\\.poecdn\\.com/gen/image/[^\"]+)\"[\\s\\S]{0,600}?\"name\"\\s*:\\s*\"([^\"]+)\"",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);
    static readonly Regex AnyCdnIcon = new(
        @"https://web\.poecdn\.com/gen/image/[A-Za-z0-9_\-/=]+",
        RegexOptions.Compiled);
    static readonly Regex HtmlProperty = new(
        @"<div class=""property"">(.*?)</div>",
        RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);
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
        return urls.FirstOrDefault(u =>
            !u.Contains("CurrencyModValues", StringComparison.OrdinalIgnoreCase) &&
            !u.Contains("CurrencyAddModToRare", StringComparison.OrdinalIgnoreCase)) ?? "";
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
        var cacheKey = "poe2db-item-v4:" + ItemSlug(name).ToLowerInvariant();
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
        string variantNote);

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
            var fixedMods = ReadStringArray(card, "explicitMods")
                .Where(mod => !Regex.IsMatch(mod, @"per Socket", RegexOptions.IgnoreCase))
                .Where(mod => !Regex.IsMatch(mod, @"\[\d+\s+Random", RegexOptions.IgnoreCase))
                .ToArray();
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
                variantNote);
        }

        var htmlIcon = PickCdnIcon(html);
        var properties = HtmlProperty.Matches(html).Select(m => StripTags(m.Groups[1].Value)).Where(v => v.Length > 0).Distinct().Take(6).ToArray();
        var explicits = HtmlExplicit.Matches(html).Select(m => StripTags(m.Groups[1].Value)).Where(v => v.Length > 0).Distinct().Take(8).ToArray();
        var help = HtmlHelp.IsMatch(html) ? StripTags(HtmlHelp.Match(html).Groups[1].Value) : "";
        var flavourText = ReadHtmlFlavour(html);
        return new Poe2DbItem(htmlIcon, name, properties.FirstOrDefault() ?? "Vault Key", "Currency", [], explicits, flavourText, help, properties, [], "");
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
            if (list.Count >= 4) break;
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

    static void WriteResource(Assembly asm, string name, string path)
    {
        using var stream = asm.GetManifestResourceStream(name)
            ?? throw new InvalidOperationException("Missing embedded file: " + name);
        using var file = File.Create(path);
        stream.CopyTo(file);
    }
}
