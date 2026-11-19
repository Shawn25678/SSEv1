using System.Text.Json;

namespace ExileLedger;

internal static class BuildFiles
{
    static string Config(string root) => Path.Combine(root, "build-folder.txt");
    internal static string Folder(string root)
    {
        var saved = File.Exists(Config(root)) ? File.ReadAllText(Config(root)).Trim() : "";
        return Path.IsPathFullyQualified(saved) ? saved : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "My Games", "Path of Exile 2", "BuildPlanner");
    }
    internal static void Validate(string source)
    {
        if (!Path.GetExtension(source).Equals(".build", StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Choose a PoE 2 .build file.");
        if (new FileInfo(source).Length > 10 * 1024 * 1024) throw new InvalidDataException("Build file is larger than 10 MB.");
        using var doc = JsonDocument.Parse(File.ReadAllText(source));
        if (doc.RootElement.ValueKind != JsonValueKind.Object || !doc.RootElement.TryGetProperty("name", out var name) || name.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(name.GetString()))
            throw new InvalidDataException("This is not a valid PoE 2 build: a build name is required.");
        foreach (var key in new[] { "passives", "skills", "inventory_slots" })
            if (doc.RootElement.TryGetProperty(key, out var value) && value.ValueKind != JsonValueKind.Array)
                throw new InvalidDataException("Invalid build field: " + key);
    }
    internal static string CopyBuild(string source, string destination)
    {
        Validate(source);
        Directory.CreateDirectory(destination);
        var stem = Path.GetFileNameWithoutExtension(source);
        var target = Path.Combine(destination, stem + ".build");
        if (Path.GetFullPath(source).Equals(Path.GetFullPath(target), StringComparison.OrdinalIgnoreCase)) return target;
        for (var n = 2; File.Exists(target); n++) target = Path.Combine(destination, stem + " (" + n + ").build");
        File.Copy(source, target, overwrite: false);
        return target;
    }
    internal static string Handle(string action, string root, IWin32Window owner)
    {
        var folder = Folder(root);
        if (action == "build-folder")
        {
            using var dialog = new FolderBrowserDialog { Description = "Choose the PoE 2 BuildPlanner folder", UseDescriptionForTitle = true, SelectedPath = folder };
            if (dialog.ShowDialog(owner) != DialogResult.OK) return JsonSerializer.Serialize(new { folder, cancelled = true });
            folder = dialog.SelectedPath;
            Directory.CreateDirectory(root);
            File.WriteAllText(Config(root), folder);
        }
        return JsonSerializer.Serialize(new { folder });
    }
}
