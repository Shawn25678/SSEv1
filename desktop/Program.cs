using System.Collections.Concurrent;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ExileLedger;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new TrackerWindow());
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
    }

    static readonly HttpClient TradeHttp = CreateTradeHttp();

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
        };
        var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(25) };
        client.DefaultRequestHeaders.TryAddWithoutValidation(
            "User-Agent",
            "OAuth StillSaneExile/1.2 (contact: local-desktop-tracker)");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json");
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

    async Task FetchTradePrice(string id, string league, string name)
    {
        name = (name ?? "").Trim();
        if (!ValidLeague(league) || name.Length is < 2 or > 80)
        {
            Reply(id, false, 400, "{\"error\":\"bad trade query\"}");
            return;
        }
        var cacheKey = "trade:" + league + ":" + name.ToLowerInvariant();
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
            var payload = await LookupTradeListing(league, name);
            var status = payload is null ? 404 : 200;
            var body = payload ?? "{\"error\":\"no listings\"}";
            if (payload is not null)
                Cache[cacheKey] = (DateTime.UtcNow, status, body);
            Reply(id, payload is not null, status, body);
        }
        finally
        {
            Gate.Release();
        }
    }

    async Task<string?> LookupTradeListing(string league, string name)
    {
        var searchUri = "https://www.pathofexile.com/api/trade2/search/poe2/" + Uri.EscapeDataString(league);
        foreach (var body in TradeQueries(name))
        {
            using var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
            using var searchRes = await TradeHttp.PostAsync(searchUri, content);
            var searchJson = await searchRes.Content.ReadAsStringAsync();
            if (!searchRes.IsSuccessStatusCode) continue;
            using var search = JsonDocument.Parse(searchJson);
            var root = search.RootElement;
            if (!root.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
                continue;
            var queryId = root.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
            var hashes = result.EnumerateArray().Select(el => el.GetString()).Where(h => !string.IsNullOrWhiteSpace(h)).Take(10).ToArray();
            if (hashes.Length == 0) continue;
            var fetchUrl = "https://www.pathofexile.com/api/trade2/fetch/" + string.Join(",", hashes) + "?query=" + Uri.EscapeDataString(queryId);
            using var fetchRes = await TradeHttp.GetAsync(fetchUrl);
            if (!fetchRes.IsSuccessStatusCode) continue;
            var fetchJson = await fetchRes.Content.ReadAsStringAsync();
            using var fetched = JsonDocument.Parse(fetchJson);
            if (!fetched.RootElement.TryGetProperty("result", out var listings) || listings.ValueKind != JsonValueKind.Array)
                continue;
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
                    bestName = row.TryGetProperty("item", out var item) && item.TryGetProperty("name", out var nameEl)
                        ? nameEl.GetString()
                        : name;
                }
            }
            if (count == 0 || bestCurrency is null) continue;
            var total = root.TryGetProperty("total", out var totalEl) && totalEl.TryGetInt32(out var listed) ? listed : count;
            return JsonSerializer.Serialize(new
            {
                name = string.IsNullOrWhiteSpace(bestName) ? name : bestName,
                amount = bestAmount,
                currency = bestCurrency,
                listings = total,
            }, JsonOut);
        }
        return null;
    }

    static bool NumberIsPositive(double n) => n is > 0 and < 1_000_000_000 && !double.IsNaN(n) && !double.IsInfinity(n);

    static IEnumerable<string> TradeQueries(string name)
    {
        yield return JsonSerializer.Serialize(new
        {
            query = new { status = new { option = "securable" }, name },
            sort = new Dictionary<string, string> { ["price"] = "asc" },
        });
        yield return JsonSerializer.Serialize(new
        {
            query = new
            {
                status = new { option = "securable" },
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
        InstallJsonFolder();

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
        _web.CoreWebView2.Navigate(new Uri(index).AbsoluteUri);
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
            if (type == "trade")
            {
                var league = root.TryGetProperty("league", out var leagueEl) ? leagueEl.GetString() ?? "" : "";
                var itemName = root.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
                await FetchTradePrice(id ?? "", league, itemName);
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
        var payload = JsonSerializer.Serialize(new { id, ok, status, body });
        _web.CoreWebView2.PostWebMessageAsJson(payload);
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

    static string InstallDir()
    {
        var path = Environment.ProcessPath;
        var dir = !string.IsNullOrWhiteSpace(path) ? Path.GetDirectoryName(path) : AppContext.BaseDirectory;
        return string.IsNullOrWhiteSpace(dir) ? AppDataDir() : dir;
    }

    static bool CanWriteFolder(string dir)
    {
        try
        {
            Directory.CreateDirectory(dir);
            var probe = Path.Combine(dir, ".sse-write-test");
            File.WriteAllText(probe, "ok");
            File.Delete(probe);
            return true;
        }
        catch
        {
            return false;
        }
    }

    static string InstallJsonFolder()
    {
        var dir = Path.Combine(InstallDir(), "json");
        if (CanWriteFolder(dir)) return dir;
        dir = Path.Combine(AppDataDir(), "json");
        Directory.CreateDirectory(dir);
        return dir;
    }

    static bool IsLegacyPresetFolder(string saved)
    {
        string Root(Environment.SpecialFolder folder)
        {
            var dir = Environment.GetFolderPath(folder);
            return Directory.Exists(dir) ? dir : "";
        }
        var docs = Root(Environment.SpecialFolder.MyDocuments);
        var desk = Root(Environment.SpecialFolder.DesktopDirectory);
        var downs = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
        foreach (var root in new[] { docs, desk, downs })
        {
            if (string.IsNullOrWhiteSpace(root)) continue;
            if (SamePath(saved, root)) return true;
            if (SamePath(saved, Path.Combine(root, "SSE"))) return true;
        }
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
                if (IsLegacyPresetFolder(saved)) continue;
                return saved;
            }
            catch
            {
                /* try the next settings file */
            }
        }
        return null;
    }

    static string LastBackupFolder() => CustomBackupFolder() ?? InstallJsonFolder();

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

    static void ForgetCustomFolder()
    {
        try
        {
            var file = LastBackupFolderFile();
            if (File.Exists(file)) File.Delete(file);
        }
        catch
        {
            /* stay on the install json folder */
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
            install = InstallJsonFolder(),
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
            if (where == "default")
            {
                ForgetCustomFolder();
                Reply(id, true, 200, PlacesJson());
                return;
            }
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
