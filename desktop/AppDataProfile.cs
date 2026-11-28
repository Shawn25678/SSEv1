namespace ExileLedger;

static class AppDataProfile
{
    const string LegacyName = "ExileLedger";
    const string OwnershipFile = ".still-sane-exile-profile";
    static readonly Lazy<string> DefaultProfile = new(() => ResolveDefault(LocalRoot));

    static string LocalRoot => Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

    static string? OverridePath
    {
        get
        {
            var value = Environment.GetEnvironmentVariable("SSE_APPDATA");
            return string.IsNullOrWhiteSpace(value) ? null : Environment.ExpandEnvironmentVariables(value.Trim().Trim('"'));
        }
    }

    public static string DataPath() => OverridePath is { } path ? Directory.CreateDirectory(path).FullName : DefaultProfile.Value;

    internal static string ResolveDefault(string localRoot)
    {
        var current = Path.Combine(localRoot, "SSE");
        var marker = Path.Combine(current, OwnershipFile);
        var currentExists = Directory.Exists(current);
        var linked = currentExists && (File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0;
        if (currentExists && !linked && File.Exists(marker)) return current;

        // Keep the original path and its existing, path-bound tester identity.
        var legacy = Path.Combine(localRoot, LegacyName);
        var saved = legacy + ".sse-upgrade";
        if (!Directory.Exists(legacy) && Directory.Exists(saved)) Directory.Move(saved, legacy);
        if (Directory.Exists(legacy)) return legacy;

        // SSE is a short name. Avoid claiming an existing folder owned by another app.
        if (File.Exists(current) || linked || (currentExists && Directory.EnumerateFileSystemEntries(current).Any()))
            return Directory.CreateDirectory(legacy).FullName;

        Directory.CreateDirectory(current);
        File.WriteAllText(marker, "Still Sane, Exile?");
        return current;
    }

    public static string Poe1BrowserPath()
    {
        var data = DataPath();
        var integrated = Path.Combine(data, "poe1-browser");
        if (OverridePath is not null) return Directory.CreateDirectory(integrated).FullName;

        var separated = Path.Combine(LocalRoot, "StillSane", "poe1-browser");
        return Directory.Exists(separated) &&
            (Path.GetFileName(data).Equals(LegacyName, StringComparison.OrdinalIgnoreCase) || !Directory.Exists(integrated))
            ? separated : integrated;
    }

    public static void ClearLocalData()
    {
        var data = DataPath();
        // Reset the legacy browser too, so removing the integrated one cannot
        // cause the next sign-in to fall back to an old browser session.
        var browser = OverridePath is null
            ? Path.Combine(LocalRoot, "StillSane", "poe1-browser")
            : Path.Combine(data, "poe1-browser");
        ClearLocalData(data, browser);
    }

    internal static void ClearLocalData(string data, string browser)
    {
        data = Path.TrimEndingDirectorySeparator(Path.GetFullPath(data));
        if (Path.GetPathRoot(data) == data || (File.GetAttributes(data) & FileAttributes.ReparsePoint) != 0)
            throw new IOException("The SSE profile folder could not be verified.");

        // Use only SSE-owned paths. Keep the profile marker, the path-bound
        // tester code and installation ID, and any saved export files.
        string[] files =
        [
            "launcher-position.json", "poe1-session.json", "prices.json",
            "trade-static.json", "trade-static-poe1.json", "trade-stats.json",
            "trade-stats-poe1.json", "trade-items-poe1.json", "json-folder.txt",
            "last-backup-folder.txt", "build-folder.txt", "build-bookmarks.json",
            "build-bookmarks.json.tmp",
        ];
        var integratedBrowser = Path.Combine(data, "poe1-browser");
        var directories = new List<string> { Path.Combine(data, "EBWebView"), integratedBrowser, Path.Combine(data, "www") };
        if (!string.Equals(browser, integratedBrowser, StringComparison.OrdinalIgnoreCase)
            && File.Exists(Path.Combine(browser, "sse-profile")))
            directories.Add(browser);

        // WebView can still be releasing its profile files from the previous process.
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                foreach (var directory in directories)
                {
                    if (!Directory.Exists(directory)) continue;
                    if ((File.GetAttributes(directory) & FileAttributes.ReparsePoint) != 0)
                        throw new IOException("An SSE data folder points to another location.");
                    Directory.Delete(directory, recursive: true);
                }
                foreach (var file in files) File.Delete(Path.Combine(data, file));
                return;
            }
            catch (IOException) when (attempt < 12) { Thread.Sleep(500); }
            catch (UnauthorizedAccessException) when (attempt < 12) { Thread.Sleep(500); }
        }
    }
}
