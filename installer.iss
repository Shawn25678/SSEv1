#define MyAppName "Still Sane, Exile?"
#define MyAppNameSafe "Still Sane Exile"
#define MyAppVersion "1.0.0"
#define MyAppExeName "StillSaneExile.exe"

[Setup]
AppId={{E8A4C2B1-7F3D-4A9E-8C15-2B6D91F04E77}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppName}
DefaultDirName={localappdata}\Programs\{#MyAppNameSafe}
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
DisableWelcomePage=yes
OutputDir=dist
OutputBaseFilename=StillSaneExile-Setup
SetupIconFile=desktop\app.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
CloseApplications=yes
RestartApplications=no
SetupLogging=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\{#MyAppNameSafe}"; Filename: "{app}\{#MyAppExeName}"; Comment: "{#MyAppName}"
Name: "{userdesktop}\{#MyAppNameSafe}"; Filename: "{app}\{#MyAppExeName}"; Comment: "{#MyAppName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Open {#MyAppName}"; Flags: nowait postinstall skipifsilent
