using ExileLedger;
var root = Path.Combine(Directory.GetCurrentDirectory(), "dist", "build-import-test-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(root);
var source = Path.Combine(root, "sample.build");
File.WriteAllText(source, "{\"name\":\"Test build\",\"skills\":[],\"passives\":[]}");
var destination = Path.Combine(root, "BuildPlanner");
var first = BuildFiles.CopyBuild(source, destination);
var second = BuildFiles.CopyBuild(source, destination);
if(first == second || File.ReadAllText(first) != File.ReadAllText(source)) throw new Exception("Collision handling failed");
var bad = Path.Combine(root, "bad.build"); File.WriteAllText(bad, "{\"skills\":{}}");
try {BuildFiles.CopyBuild(bad,destination); throw new Exception("Invalid build accepted");} catch(InvalidDataException) {}
var wrong = Path.Combine(root, "bad.exe"); File.WriteAllText(wrong,"{}");
try {BuildFiles.CopyBuild(wrong,destination); throw new Exception("Wrong extension accepted");} catch(InvalidDataException) {}
if(Directory.GetFiles(destination).Length != 2) throw new Exception("Rejected file was copied");
Console.WriteLine("Build import tests passed: valid copy, non-overwriting duplicates, malformed build and wrong extension rejection.");
var guide = "https://mobalytics.gg/poe-2/builds/test-build";
if (!GuideCatalog.IsBookmark(guide) || GuideCatalog.IsBookmark("https://mobalytics.gg/poe-2/builds") || GuideCatalog.IsBookmark("https://mobalytics.gg.evil.com/poe-2/builds/test")) throw new Exception("Bookmark allowlist failed");
var page = System.Text.Json.JsonSerializer.Serialize(new {title="Test build",links=new[]{
    new{url="https://mobalytics.gg/test.build"},new{url="https://www.youtube.com/watch?v=test"},
    new{url="https://maxroll.gg/poe2/build-guides/related-build"},new{url="https://evil.com/file.build"}}});
GuideCatalog.Bookmark(root,guide+"?tracking=1",page);
GuideCatalog.Bookmark(root,guide+"#skills",page);
using var catalog=System.Text.Json.JsonDocument.Parse(await GuideCatalog.HandleAsync(root,"list",""));
var entries=catalog.RootElement.GetProperty("entries");
if(entries.GetArrayLength()!=1 || entries[0].GetProperty("download").GetString()!="https://mobalytics.gg/test.build" || entries[0].GetProperty("videos").GetArrayLength()!=1 || entries[0].GetProperty("guides").GetArrayLength()!=1) throw new Exception("Bookmark deduplication or related links failed");
await GuideCatalog.HandleAsync(root,"remove",guide);
using var empty=System.Text.Json.JsonDocument.Parse(await GuideCatalog.HandleAsync(root,"list",""));
if(empty.RootElement.GetProperty("entries").GetArrayLength()!=0) throw new Exception("Bookmark removal failed");
Console.WriteLine("Bookmark tests passed: one selected page only, source validation, canonical deduplication, related links and removal.");
var maxroll="https://maxroll.gg/poe2/build-guides/lightning-arrow-deadeye";
if(GuideCatalog.BuildTitle(maxroll,"PATH OF EXILE 2")!="Lightning Arrow Deadeye") throw new Exception("Generic Maxroll title was not repaired");
if(GuideCatalog.BuildTitle(maxroll,"Lightning Arrow Deadeye - Maxroll.gg")!="Lightning Arrow Deadeye") throw new Exception("Site suffix was not removed");
Console.WriteLine("Build title tests passed: generic heading repair and site suffix cleanup.");
