using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using Microsoft.Win32;

namespace ExileLedger;

sealed class FoundingTesterAccess
{
    const string SigningPurpose = "StillSaneExile.FoundingTester.v1";
    const string PublicKey = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7NHmppcyyZzT0w27p+uJ2LARXfFq+oKBTV7IUEJ7NQ3YBOVMAev2VSx8/YhYiam2w5gAcjDSUsMk0xESMQJw8Q==";
    const string CodePrefix = "SSE1-";
    const int CodeLength = 91;

    readonly string _identityPath;
    readonly string _codePath;
    readonly string _profile;
    byte[]? _identityScope;
    string? _installationId;

    public FoundingTesterAccess(string dataDirectory)
    {
        _identityPath = Path.Combine(dataDirectory, "founding-tester.installation");
        _codePath = Path.Combine(dataDirectory, "founding-tester.code");
        _profile = Path.TrimEndingDirectorySeparator(Path.GetFullPath(dataDirectory)).ToUpperInvariant();

        try
        {
            if (File.Exists(_codePath) && new FileInfo(_codePath).Length == CodeLength &&
                ReadInstallationId() is { } id)
                Unlocked = VerifyCode(id, File.ReadAllText(_codePath));
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or CryptographicException)
        {
            // An unreadable activation leaves the standard icon in place.
        }
    }

    public bool Unlocked { get; private set; }

    public string GetInstallationId()
    {
        if (ReadInstallationId() is { } id) return id;

        var identity = RandomNumberGenerator.GetBytes(16);
        var protectedIdentity = ProtectedData.Protect(identity, IdentityScope, DataProtectionScope.CurrentUser);
        WriteAtomically(_identityPath, protectedIdentity);
        return _installationId = DeriveInstallationId(identity);
    }

    public bool Redeem(string code)
    {
        code = code.Trim();
        if (ReadInstallationId() is not { } id || !VerifyCode(id, code)) return false;

        WriteAtomically(_codePath, Encoding.ASCII.GetBytes(code));
        Unlocked = true;
        return true;
    }

    string? ReadInstallationId()
    {
        if (_installationId is not null) return _installationId;
        try
        {
            if (!File.Exists(_identityPath) || new FileInfo(_identityPath).Length > 4096) return null;
            var protectedIdentity = File.ReadAllBytes(_identityPath);
            var identity = ProtectedData.Unprotect(protectedIdentity, IdentityScope, DataProtectionScope.CurrentUser);
            return identity.Length == 16 ? _installationId = DeriveInstallationId(identity) : null;
        }
        catch (CryptographicException)
        {
            // Copied or damaged identity files cannot be used in this profile.
            return null;
        }
    }

    byte[] IdentityScope
    {
        get
        {
            if (_identityScope is not null) return _identityScope;
            using var account = WindowsIdentity.GetCurrent();
            var machine = Registry.GetValue(@"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography", "MachineGuid", null) as string
                ?? Environment.MachineName;
            return _identityScope = SHA256.HashData(Encoding.UTF8.GetBytes($"{SigningPurpose}\0{_profile}\0{account.User}\0{machine}"));
        }
    }

    string DeriveInstallationId(byte[] identity) =>
        Convert.ToHexString(SHA256.HashData([..identity, ..IdentityScope]).AsSpan(0, 16));

    static bool VerifyCode(string installationId, string code)
    {
        if (code.Length != CodeLength || !code.StartsWith(CodePrefix, StringComparison.Ordinal)) return false;
        var base64 = code[CodePrefix.Length..].Replace('-', '+').Replace('_', '/') + "==";
        Span<byte> signature = stackalloc byte[64];
        if (!Convert.TryFromBase64String(base64, signature, out int bytes) || bytes != signature.Length) return false;

        using var verifier = ECDsa.Create();
        verifier.ImportSubjectPublicKeyInfo(Convert.FromBase64String(PublicKey), out _);
        var payload = Encoding.ASCII.GetBytes(SigningPurpose + ":" + installationId);
        return verifier.VerifyData(payload, signature, HashAlgorithmName.SHA256,
            DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
    }

    static void WriteAtomically(string path, byte[] data)
    {
        var temp = path + ".tmp";
        File.WriteAllBytes(temp, data);
        File.Move(temp, path, overwrite: true);
    }
}
