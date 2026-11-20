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
}
