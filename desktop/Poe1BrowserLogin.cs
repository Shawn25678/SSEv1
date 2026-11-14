using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;

namespace ExileLedger;

static class Poe1BrowserLogin
{
    public static string Account { get; private set; } = "";

    public static string ProfileDir()
    {
        var root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "StillSane");
        var dir = Path.Combine(root, "poe1-browser");
        var old = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ExileLedger", "poe1-browser");
        try
        {
            if (!Directory.Exists(dir) && Directory.Exists(old))
            {
                Directory.CreateDirectory(root);
                Directory.Move(old, dir);
            }
        }
        catch
        {
            if (Directory.Exists(old)) return old;
        }
        return dir;
    }

    public static async Task<string> Capture()
    {
        Account = "";
        var exe = BrowserExe();
        if (exe is null) throw new InvalidOperationException("Sign-in could not open the browser.");
        var dir = ProfileDir();
        PrepareProfile(dir);
        StopReaders(dir);
        await Task.Delay(400);
        if (ProfileBusy(dir))
            throw new InvalidOperationException("Close the Chrome sign-in window, then try again.");
        var port = FreePort();
        var browser = Launch(exe, dir, "https://www.pathofexile.com/my-account", port);
        if (browser is null)
            throw new InvalidOperationException("Sign-in could not open the browser.");
        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
            var until = DateTime.UtcNow.AddMinutes(10);
            var sawWindow = false;
            var idleSince = DateTime.MaxValue;
            while (DateTime.UtcNow < until)
            {
                var session = await ReadDebugSession(http, port);
                if (session.Length >= 8) return session;
                if (ProfileBusy(dir))
                {
                    sawWindow = true;
                    idleSince = DateTime.MaxValue;
                }
                else if (sawWindow)
                {
                    if (idleSince == DateTime.MaxValue) idleSince = DateTime.UtcNow;
                    if (DateTime.UtcNow - idleSince > TimeSpan.FromSeconds(3)) break;
                }
                await Task.Delay(500);
            }
            return "";
        }
        finally
        {
            await Task.Delay(700);
            try { if (!browser.HasExited) browser.Kill(entireProcessTree: true); } catch { /* the window may already be closed */ }
            StopReaders(dir);
        }
    }

    static void PrepareProfile(string dir)
    {
        var marker = Path.Combine(dir, "sse-profile");
        if (File.Exists(marker)) return;
        try { if (Directory.Exists(dir)) Directory.Delete(dir, true); } catch { /* a previous window may still be closing */ }
        Directory.CreateDirectory(dir);
        File.WriteAllText(marker, "1");
    }

    static Process? Launch(string exe, string dir, string url, int port)
    {
        var start = new ProcessStartInfo(exe) { UseShellExecute = false };
        start.ArgumentList.Add("--user-data-dir=" + dir);
        start.ArgumentList.Add("--profile-directory=Default");
        start.ArgumentList.Add("--no-first-run");
        start.ArgumentList.Add("--no-default-browser-check");
        start.ArgumentList.Add("--new-window");
        if (port > 0)
        {
            start.ArgumentList.Add("--remote-debugging-port=" + port);
            start.ArgumentList.Add("--remote-allow-origins=*");
        }
        start.ArgumentList.Add("--start-maximized");
        start.ArgumentList.Add(url);
        return Process.Start(start);
    }

    static bool ProfileBusy(string dir)
    {
        var lockFile = Path.Combine(dir, "lockfile");
        if (!File.Exists(lockFile)) return false;
        try
        {
            using var fs = new FileStream(lockFile, FileMode.Open, FileAccess.ReadWrite, FileShare.None);
            return false;
        }
        catch (IOException) { return true; }
        catch { return false; }
    }

    static void StopReaders(string dir)
    {
        var needle = "--user-data-dir=" + dir;
        foreach (var proc in Process.GetProcessesByName("chrome"))
        {
            try
            {
                var cmd = CommandLine(proc.Id);
                if (cmd.IndexOf(needle, StringComparison.OrdinalIgnoreCase) < 0) continue;
                if (cmd.IndexOf("--remote-debugging-port", StringComparison.OrdinalIgnoreCase) < 0 &&
                    cmd.IndexOf("--headless", StringComparison.OrdinalIgnoreCase) < 0) continue;
                proc.Kill(entireProcessTree: true);
            }
            catch { /* already closed */ }
            finally { proc.Dispose(); }
        }
    }

    static async Task<string> ReadDebugSession(HttpClient http, int port)
    {
        try
        {
            var listJson = await http.GetStringAsync("http://127.0.0.1:" + port + "/json/list");
            using var list = JsonDocument.Parse(listJson);
            if (list.RootElement.ValueKind != JsonValueKind.Array) return "";
            foreach (var item in list.RootElement.EnumerateArray())
            {
                var type = item.TryGetProperty("type", out var typeEl) ? typeEl.GetString() ?? "" : "";
                if (!type.Equals("page", StringComparison.OrdinalIgnoreCase)) continue;
                var url = item.TryGetProperty("url", out var urlEl) ? urlEl.GetString() ?? "" : "";
                if (!url.Contains("pathofexile.com", StringComparison.OrdinalIgnoreCase)) continue;
                if (url.Contains("/login", StringComparison.OrdinalIgnoreCase)) continue;
                var wsUrl = item.TryGetProperty("webSocketDebuggerUrl", out var wsEl) ? wsEl.GetString() ?? "" : "";
                if (!wsUrl.StartsWith("ws://127.0.0.1:", StringComparison.Ordinal)) continue;
                if (!await LoggedIn(wsUrl)) continue;
                var session = await ReadSession(wsUrl);
                if (session.Length >= 8) return session;
            }
        }
        catch { /* the window is still starting */ }
        return "";
    }

    static bool LeftLogin(string listJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(listJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return false;
            var sawSite = false;
            var sawLogin = false;
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                var url = item.TryGetProperty("url", out var urlEl) ? urlEl.GetString() ?? "" : "";
                if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) continue;
                if (!uri.Host.Equals("www.pathofexile.com", StringComparison.OrdinalIgnoreCase) &&
                    !uri.Host.Equals("pathofexile.com", StringComparison.OrdinalIgnoreCase)) continue;
                sawSite = true;
                var path = uri.AbsolutePath;
                if (path.Contains("/login", StringComparison.OrdinalIgnoreCase) &&
                    !path.Contains("success", StringComparison.OrdinalIgnoreCase)) sawLogin = true;
            }
            return sawSite && !sawLogin;
        }
        catch { /* the browser is still starting */ }
        return false;
    }

    static async Task<bool> LoggedIn(string wsUrl)
    {
        const string script = """
            fetch('https://www.pathofexile.com/my-account',{credentials:'include'}).then(async r => {
              const html = await r.text();
              const title = ((html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '').trim();
              let account = title.split(' - ').pop().trim();
              const link = html.match(/\/account\/view-profile\/([^"'?#<]+)/i);
              if (link) {
                const raw = decodeURIComponent(link[1]);
                const hash = raw.lastIndexOf('-');
                if (hash > 0 && /^\d{4}$/.test(raw.slice(hash + 1))) account = raw.slice(0, hash) + '#' + raw.slice(hash + 1);
              }
              return r.status + '\n' + account;
            })
            """;
        var text = await Evaluate(wsUrl, script);
        var split = text.Split('\n', 2);
        if (split.Length < 2 || split[0].Trim() != "200") return false;
        var account = split[1].Trim();
        if (account.Length is < 2 or > 60 || account.Any(char.IsControl)) return false;
        if (account.Contains('<') || account.Contains('>')) return false;
        if (!account.Any(char.IsLetter) || !account.All(ch => char.IsLetterOrDigit(ch) || ch is '#' or '_' or '-' )) return false;
        Account = account;
        return true;
    }

    static async Task<string> Evaluate(string wsUrl, string expression)
    {
        using var ws = new ClientWebSocket();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
        try
        {
            await ws.ConnectAsync(new Uri(wsUrl), cts.Token);
            var payload = JsonSerializer.Serialize(new { id = 1, method = "Runtime.evaluate", @params = new { expression, awaitPromise = true, returnByValue = true } });
            await ws.SendAsync(Encoding.UTF8.GetBytes(payload), WebSocketMessageType.Text, true, cts.Token);
            var message = await ReadFrame(ws, cts);
            if (!message.Contains("\"id\":1", StringComparison.Ordinal)) return "";
            using var doc = JsonDocument.Parse(message);
            if (!doc.RootElement.TryGetProperty("result", out var result) ||
                !result.TryGetProperty("result", out var inner) ||
                !inner.TryGetProperty("value", out var value)) return "";
            return value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : value.ToString();
        }
        catch { return ""; }
    }

    static async Task<string> ReadFrame(ClientWebSocket ws, CancellationTokenSource cts)
    {
        var buf = new byte[65536];
        var frame = new StringBuilder();
        while (ws.State == WebSocketState.Open && !cts.IsCancellationRequested)
        {
            var got = await ws.ReceiveAsync(buf, cts.Token);
            frame.Append(Encoding.UTF8.GetString(buf, 0, got.Count));
            if (!got.EndOfMessage) continue;
            var message = frame.ToString();
            frame.Clear();
            if (message.Contains("\"id\":1", StringComparison.Ordinal)) return message;
        }
        return "";
    }

    static async Task<string> ReadSession(string wsUrl)
    {
        using var ws = new ClientWebSocket();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
        try
        {
            await ws.ConnectAsync(new Uri(wsUrl), cts.Token);
            var payload = Encoding.UTF8.GetBytes("{\"id\":1,\"method\":\"Network.getCookies\",\"params\":{\"urls\":[\"https://www.pathofexile.com/\",\"https://pathofexile.com/\"]}}");
            await ws.SendAsync(payload, WebSocketMessageType.Text, true, cts.Token);
            var buf = new byte[65536];
            var frame = new StringBuilder();
            while (ws.State == WebSocketState.Open && !cts.IsCancellationRequested)
            {
                var got = await ws.ReceiveAsync(buf, cts.Token);
                frame.Append(Encoding.UTF8.GetString(buf, 0, got.Count));
                if (!got.EndOfMessage) continue;
                var message = frame.ToString();
                frame.Clear();
                if (!message.Contains("\"id\":1", StringComparison.Ordinal)) continue;
                using var doc = JsonDocument.Parse(message);
                if (!doc.RootElement.TryGetProperty("result", out var result) ||
                    !result.TryGetProperty("cookies", out var cookies) ||
                    cookies.ValueKind != JsonValueKind.Array) return "";
                foreach (var cookie in cookies.EnumerateArray())
                {
                    var name = cookie.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
                    if (!name.Equals("POESESSID", StringComparison.Ordinal)) continue;
                    var value = cookie.TryGetProperty("value", out var valueEl) ? valueEl.GetString() ?? "" : "";
                    if (value.Length is >= 8 and <= 128 && value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_')) return value;
                }
                return "";
            }
        }
        catch { /* try again on the next poll */ }
        return "";
    }

    static string CommandLine(int pid)
    {
        var handle = OpenProcess(0x0410, false, pid);
        if (handle == IntPtr.Zero) return "";
        try
        {
            var info = new ProcessBasicInformation();
            var read = 0;
            if (NtQueryInformationProcess(handle, 0, ref info, Marshal.SizeOf<ProcessBasicInformation>(), ref read) != 0 || info.PebBaseAddress == IntPtr.Zero)
                return "";
            var parms = ReadPointer(handle, info.PebBaseAddress + 0x20);
            if (parms == IntPtr.Zero) return "";
            var raw = new byte[16];
            if (!ReadProcessMemory(handle, parms + 0x70, raw, raw.Length, out _)) return "";
            var length = BitConverter.ToUInt16(raw, 0);
            var buffer = (IntPtr)BitConverter.ToInt64(raw, 8);
            if (length < 2 || length > 32768 || buffer == IntPtr.Zero) return "";
            var bytes = new byte[length];
            if (!ReadProcessMemory(handle, buffer, bytes, bytes.Length, out _)) return "";
            return Encoding.Unicode.GetString(bytes);
        }
        catch { return ""; }
        finally { CloseHandle(handle); }
    }

    static IntPtr ReadPointer(IntPtr process, IntPtr address)
    {
        var bytes = new byte[8];
        return ReadProcessMemory(process, address, bytes, bytes.Length, out _) ? (IntPtr)BitConverter.ToInt64(bytes, 0) : IntPtr.Zero;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct ProcessBasicInformation
    {
        public IntPtr Reserved1;
        public IntPtr PebBaseAddress;
        public IntPtr Reserved2;
        public IntPtr Reserved3;
        public IntPtr UniqueProcessId;
        public IntPtr InheritedFromUniqueProcessId;
    }

    [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] static extern bool ReadProcessMemory(IntPtr process, IntPtr address, byte[] buffer, int size, out IntPtr read);
    [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr process, int infoClass, ref ProcessBasicInformation info, int size, ref int read);

    public static string? DefaultBrowserExe()
    {
        try
        {
            foreach (var prog in DefaultProgIds())
            {
                var exe = ExeForProg(prog);
                if (exe is not null && File.Exists(exe)) return exe;
            }
        }
        catch { /* the caller uses its own fallback */ }
        return null;
    }

    static string? BrowserExe()
    {
        var chosen = DefaultBrowserExe();
        if (chosen is not null && IsChromium(chosen)) return chosen;
        foreach (var candidate in new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
        })
            if (File.Exists(candidate)) return candidate;
        return null;
    }

    static IEnumerable<string> DefaultProgIds()
    {
        foreach (var key in new[]
        {
            @"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoiceLatest\ProgId",
            @"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoiceLatest\ProgId",
            @"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice",
            @"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice",
        })
        {
            using var reg = Registry.CurrentUser.OpenSubKey(key);
            var prog = reg?.GetValue("ProgId") as string;
            if (!string.IsNullOrWhiteSpace(prog)) yield return prog;
        }
    }

    static string? ExeForProg(string prog)
    {
        using var hkcu = Registry.CurrentUser.OpenSubKey(@"Software\Classes");
        using var hklm = Registry.LocalMachine.OpenSubKey(@"Software\Classes");
        foreach (var root in new[] { hkcu, Registry.ClassesRoot, hklm })
        {
            var command = root?.OpenSubKey(prog + @"\shell\open\command")?.GetValue(null) as string;
            var exe = ExeFromCommand(command);
            if (!string.IsNullOrWhiteSpace(exe)) return exe;
        }
        return null;
    }

    static string? ExeFromCommand(string? command)
    {
        if (string.IsNullOrWhiteSpace(command)) return null;
        command = command.Trim();
        if (command.StartsWith('"'))
        {
            var end = command.IndexOf('"', 1);
            return end > 1 ? command[1..end] : null;
        }
        var space = command.IndexOf(' ');
        return space > 0 ? command[..space] : command;
    }

    static bool IsChromium(string exe)
    {
        var name = Path.GetFileName(exe);
        return name.Contains("msedge", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("chrome", StringComparison.OrdinalIgnoreCase) ||
            name.Contains("brave", StringComparison.OrdinalIgnoreCase);
    }

    static int FreePort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }
}
