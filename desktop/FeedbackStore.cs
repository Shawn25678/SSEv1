using System.Net.Http;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ExileLedger;

sealed class FeedbackItem
{
    public string Id { get; set; } = "";
    public long At { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string Version { get; set; } = "";
    public string League { get; set; } = "";
    public string Page { get; set; } = "";
    public bool Read { get; set; }
}

sealed class SupabaseConfig
{
    public string Url { get; set; } = "";
    public string AnonKey { get; set; } = "";
    public string ServiceKey { get; set; } = "";
}

static class FeedbackStore
{
    public const int Port = 17832;
    public static readonly Uri LocalUri = new("http://127.0.0.1:17832/feedback");

    static readonly HttpClient CloudHttp = new() { Timeout = TimeSpan.FromSeconds(12) };
    static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = true,
    };
    static readonly JsonSerializerOptions CloudJson = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static string Dir()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ExileLedger",
            "inbox");
        Directory.CreateDirectory(dir);
        return dir;
    }

    public static FeedbackItem Save(string title, string body, string version, string league, string page)
    {
        var item = new FeedbackItem
        {
            Id = Guid.NewGuid().ToString("N")[..12],
            At = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Title = title.Trim(),
            Body = body.Trim(),
            Version = version.Trim(),
            League = league.Trim(),
            Page = page.Trim(),
            Read = false,
        };
        Write(item);
        return item;
    }

    public static FeedbackItem? SaveJson(string json)
    {
        FeedbackItem? item;
        try
        {
            item = JsonSerializer.Deserialize<FeedbackItem>(json, Json);
        }
        catch (JsonException)
        {
            return null;
        }
        if (item is null || string.IsNullOrWhiteSpace(item.Title)) return null;
        if (string.IsNullOrWhiteSpace(item.Id)) item.Id = Guid.NewGuid().ToString("N")[..12];
        if (item.At <= 0) item.At = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        Write(item);
        return item;
    }

    public static IReadOnlyList<FeedbackItem> List()
    {
        var items = new List<FeedbackItem>();
        foreach (var path in Directory.GetFiles(Dir(), "*.json"))
        {
            try
            {
                var item = JsonSerializer.Deserialize<FeedbackItem>(File.ReadAllText(path), Json);
                if (item is null || string.IsNullOrWhiteSpace(item.Title)) continue;
                if (string.IsNullOrWhiteSpace(item.Id)) item.Id = Path.GetFileNameWithoutExtension(path);
                items.Add(item);
            }
            catch
            {
                /* skip a bad note */
            }
        }
        return items.OrderByDescending(item => item.At).ToArray();
    }

    public static async Task<IReadOnlyList<FeedbackItem>> ListAllAsync()
    {
        var remote = await FetchCloudAsync();
        foreach (var item in remote) Write(item);
        return List();
    }

    public static bool MarkRead(string id, bool read = true)
    {
        var item = Find(id);
        if (item is null) return false;
        item.Read = read;
        Write(item);
        _ = PatchCloudAsync(item);
        return true;
    }

    public static bool Delete(string id)
    {
        var path = PathFor(id);
        if (File.Exists(path)) File.Delete(path);
        _ = DeleteCloudAsync(id);
        return true;
    }

    public static string InboxListJson(IReadOnlyList<FeedbackItem> items)
    {
        var cfg = LoadConfig();
        return JsonSerializer.Serialize(new
        {
            type = "inbox-list",
            items,
            cloud = cfg.ServiceKey.Length > 0,
            needSetup = cfg.Url.Length == 0 || cfg.ServiceKey.Length == 0,
            url = cfg.Url,
            anonKey = cfg.AnonKey,
            serviceKey = cfg.ServiceKey,
        }, Json);
    }

    public static string ToJson(IEnumerable<FeedbackItem> items) =>
        JsonSerializer.Serialize(items, Json);

    public static string ToJson(FeedbackItem item) => JsonSerializer.Serialize(item, Json);

    public static string ConfigJson(bool includeService)
    {
        var cfg = LoadConfig();
        var bag = new Dictionary<string, string>
        {
            ["url"] = cfg.Url,
            ["anonKey"] = cfg.AnonKey,
        };
        if (includeService) bag["serviceKey"] = cfg.ServiceKey;
        return JsonSerializer.Serialize(bag);
    }

    public static bool HasAnon()
    {
        var cfg = LoadConfig();
        return cfg.AnonKey.Length > 0 && cfg.Url.Length > 0;
    }

    public static bool HasService()
    {
        var cfg = LoadConfig();
        return cfg.ServiceKey.Length > 0 && cfg.Url.Length > 0;
    }

    public static string SaveConfig(string url, string anonKey, string serviceKey)
    {
        url = (url ?? "").Trim().TrimEnd('/');
        anonKey = (anonKey ?? "").Trim();
        serviceKey = (serviceKey ?? "").Trim();
        if (url.Length > 0 && !ValidSupabaseUrl(url)) return "Use a https://….supabase.co URL.";
        var cfg = new SupabaseConfig { Url = url, AnonKey = anonKey, ServiceKey = serviceKey };
        var app = Path.Combine(AppData(), "supabase.json");
        File.WriteAllText(app, JsonSerializer.Serialize(cfg, Json));
        var pub = JsonSerializer.Serialize(new SupabaseConfig { Url = url, AnonKey = anonKey }, Json);
        File.WriteAllText(Path.Combine(AppData(), "supabase.public.json"), pub);
        var exeDir = Path.GetDirectoryName(Environment.ProcessPath);
        if (!string.IsNullOrWhiteSpace(exeDir))
            File.WriteAllText(Path.Combine(exeDir, "supabase.public.json"), pub);
        return "";
    }

    public static async Task NotifyLocalAsync(FeedbackItem item)
    {
        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(1) };
            using var content = new StringContent(ToJson(item), Encoding.UTF8, "application/json");
            await http.PostAsync(LocalUri, content);
        }
        catch
        {
            /* inbox app is not running */
        }
    }

    public static async Task NotifyHookAsync(FeedbackItem item)
    {
        var url = HookUrl();
        if (string.IsNullOrWhiteSpace(url)) return;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return;
        if (!uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return;
        var host = uri.Host;
        var discord = host.Equals("discord.com", StringComparison.OrdinalIgnoreCase)
            || host.Equals("discordapp.com", StringComparison.OrdinalIgnoreCase);
        if (!discord || !uri.AbsolutePath.StartsWith("/api/webhooks/", StringComparison.OrdinalIgnoreCase)) return;
        var text = "**" + item.Title + "**\n" + item.Body;
        if (text.Length > 1800) text = text[..1800] + "…";
        try
        {
            using var content = new StringContent(
                JsonSerializer.Serialize(new { content = text }),
                Encoding.UTF8,
                "application/json");
            await CloudHttp.PostAsync(uri, content);
        }
        catch
        {
            /* hook is optional */
        }
    }

    public static async Task NotifyCloudAsync(FeedbackItem item)
    {
        var cfg = LoadConfig();
        if (!CanTalk(cfg, cfg.AnonKey)) return;
        try
        {
            using var req = CloudRequest(HttpMethod.Post, cfg, cfg.AnonKey, "/rest/v1/feedback");
            req.Content = new StringContent(CloudBody(item), Encoding.UTF8, "application/json");
            req.Headers.TryAddWithoutValidation("Prefer", "return=minimal");
            using var res = await CloudHttp.SendAsync(req);
            _ = res.StatusCode;
        }
        catch
        {
            /* cloud is optional */
        }
    }

    static async Task<IReadOnlyList<FeedbackItem>> FetchCloudAsync()
    {
        var cfg = LoadConfig();
        var key = cfg.ServiceKey.Length > 0 ? cfg.ServiceKey : "";
        if (!CanTalk(cfg, key)) return Array.Empty<FeedbackItem>();
        try
        {
            using var req = CloudRequest(HttpMethod.Get, cfg, key, "/rest/v1/feedback?select=*&order=at.desc");
            using var res = await CloudHttp.SendAsync(req);
            if (!res.IsSuccessStatusCode) return Array.Empty<FeedbackItem>();
            var json = await res.Content.ReadAsStringAsync();
            var rows = JsonSerializer.Deserialize<List<FeedbackCloudRow>>(json, CloudJson);
            if (rows is null) return Array.Empty<FeedbackItem>();
            return rows.Select(FromCloud).Where(item => item.Title.Length > 0).ToArray();
        }
        catch
        {
            return Array.Empty<FeedbackItem>();
        }
    }

    static async Task PatchCloudAsync(FeedbackItem item)
    {
        var cfg = LoadConfig();
        if (!CanTalk(cfg, cfg.ServiceKey)) return;
        try
        {
            using var req = CloudRequest(HttpMethod.Patch, cfg, cfg.ServiceKey, "/rest/v1/feedback?id=eq." + Uri.EscapeDataString(item.Id));
            req.Content = new StringContent("{\"is_read\":" + (item.Read ? "true" : "false") + "}", Encoding.UTF8, "application/json");
            req.Headers.TryAddWithoutValidation("Prefer", "return=minimal");
            using var res = await CloudHttp.SendAsync(req);
            _ = res.StatusCode;
        }
        catch
        {
            /* ignore */
        }
    }

    static async Task DeleteCloudAsync(string id)
    {
        var cfg = LoadConfig();
        if (!CanTalk(cfg, cfg.ServiceKey) || string.IsNullOrWhiteSpace(id)) return;
        try
        {
            using var req = CloudRequest(HttpMethod.Delete, cfg, cfg.ServiceKey, "/rest/v1/feedback?id=eq." + Uri.EscapeDataString(id));
            using var res = await CloudHttp.SendAsync(req);
            _ = res.StatusCode;
        }
        catch
        {
            /* ignore */
        }
    }

    static HttpRequestMessage CloudRequest(HttpMethod method, SupabaseConfig cfg, string key, string path)
    {
        var req = new HttpRequestMessage(method, cfg.Url.TrimEnd('/') + path);
        req.Headers.TryAddWithoutValidation("apikey", key);
        req.Headers.TryAddWithoutValidation("Authorization", "Bearer " + key);
        return req;
    }

    static string CloudBody(FeedbackItem item) =>
        JsonSerializer.Serialize(new FeedbackCloudRow
        {
            id = item.Id,
            at = item.At,
            title = item.Title,
            body = item.Body,
            version = item.Version,
            league = item.League,
            page = item.Page,
            is_read = item.Read,
        }, CloudJson);

    static FeedbackItem FromCloud(FeedbackCloudRow row) => new()
    {
        Id = row.id,
        At = row.at,
        Title = row.title ?? "",
        Body = row.body ?? "",
        Version = row.version ?? "",
        League = row.league ?? "",
        Page = row.page ?? "",
        Read = row.is_read,
    };

    static bool CanTalk(SupabaseConfig cfg, string key) =>
        cfg.Url.Length > 0 && key.Length > 20 && ValidSupabaseUrl(cfg.Url);

    static bool ValidSupabaseUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (!uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) return false;
        var host = uri.Host;
        return host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".supabase.net", StringComparison.OrdinalIgnoreCase);
    }

    static SupabaseConfig LoadConfig()
    {
        var merged = new SupabaseConfig();
        Apply(merged, ReadEmbedded());
        Apply(merged, ReadFile(Beside("supabase.public.json")));
        Apply(merged, ReadFile(Path.Combine(AppData(), "supabase.public.json")));
        Apply(merged, ReadFile(Beside("supabase.json")));
        Apply(merged, ReadFile(Path.Combine(AppData(), "supabase.json")));
        return merged;
    }

    static void Apply(SupabaseConfig into, SupabaseConfig? extra)
    {
        if (extra is null) return;
        if (!string.IsNullOrWhiteSpace(extra.Url)) into.Url = extra.Url.Trim().TrimEnd('/');
        if (!string.IsNullOrWhiteSpace(extra.AnonKey)) into.AnonKey = extra.AnonKey.Trim();
        if (!string.IsNullOrWhiteSpace(extra.ServiceKey)) into.ServiceKey = extra.ServiceKey.Trim();
    }

    static SupabaseConfig? ReadFile(string path)
    {
        try
        {
            if (!File.Exists(path)) return null;
            return JsonSerializer.Deserialize<SupabaseConfig>(File.ReadAllText(path), Json);
        }
        catch
        {
            return null;
        }
    }

    static SupabaseConfig? ReadEmbedded()
    {
        try
        {
            using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("www.supabase.public.json");
            if (stream is null) return null;
            using var reader = new StreamReader(stream);
            return JsonSerializer.Deserialize<SupabaseConfig>(reader.ReadToEnd(), Json);
        }
        catch
        {
            return null;
        }
    }

    static FeedbackItem? Find(string id) => List().FirstOrDefault(item => item.Id == id);

    static void Write(FeedbackItem item)
    {
        var json = ToJson(item);
        var path = PathFor(item.Id);
        if (File.Exists(path) && File.ReadAllText(path) == json) return;
        File.WriteAllText(path, json);
    }

    static string PathFor(string id)
    {
        var safe = new string((id ?? "").Where(char.IsLetterOrDigit).ToArray());
        if (safe.Length is < 4 or > 40) safe = Guid.NewGuid().ToString("N")[..12];
        return Path.Combine(Dir(), safe + ".json");
    }

    static string HookUrl()
    {
        var app = Path.Combine(AppData(), "feedback-hook.txt");
        if (File.Exists(app))
        {
            var line = File.ReadAllText(app).Trim();
            if (line.Length > 0) return line;
        }
        var beside = Beside("feedback-hook.txt");
        return File.Exists(beside) ? File.ReadAllText(beside).Trim() : "";
    }

    static string AppData()
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ExileLedger");
        Directory.CreateDirectory(dir);
        return dir;
    }

    static string Beside(string name)
    {
        var exe = Environment.ProcessPath;
        if (string.IsNullOrWhiteSpace(exe)) return "";
        return Path.Combine(Path.GetDirectoryName(exe) ?? "", name);
    }

    sealed class FeedbackCloudRow
    {
        public string id { get; set; } = "";
        public long at { get; set; }
        public string title { get; set; } = "";
        public string body { get; set; } = "";
        public string version { get; set; } = "";
        public string league { get; set; } = "";
        public string page { get; set; } = "";
        public bool is_read { get; set; }
    }
}
