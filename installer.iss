#define MyAppName "Still Sane, Exile?"
#define MyAppNameSafe "Still Sane Exile"
#define MyAppVersion "1.0.16"
#define MyAppExeName "StillSaneExile.exe"
#define MyAppId "{{E8A4C2B1-7F3D-4A9E-8C15-2B6D91F04E77}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppName}
AppMutex=Local\StillSaneExile.SingleInstance
DefaultDirName={localappdata}\Programs\{#MyAppNameSafe}
DisableDirPage=no
AlwaysShowDirOnReadyPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=no
DisableWelcomePage=yes
UsePreviousAppDir=yes
UsePreviousTasks=yes
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
CloseApplications=force
RestartApplications=no
SetupLogging=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "starticon"; Description: "Start Menu shortcut"; GroupDescription: "Shortcuts:"
Name: "desktopicon"; Description: "Desktop shortcut"; GroupDescription: "Shortcuts:"; Flags: unchecked

[Files]
Source: "dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[InstallDelete]
Type: files; Name: "{app}\{#MyAppExeName}.old"
Type: filesandordirs; Name: "{app}\json"

[UninstallDelete]
Type: filesandordirs; Name: "{app}\json"
Type: files; Name: "{app}\{#MyAppExeName}.old"
Type: files; Name: "{userprograms}\{#MyAppNameSafe}.lnk"
Type: files; Name: "{userdesktop}\{#MyAppNameSafe}.lnk"
Type: filesandordirs; Name: "{localappdata}\ExileLedger\www"
Type: filesandordirs; Name: "{localappdata}\ExileLedger\EBWebView"
Type: filesandordirs; Name: "{localappdata}\ExileLedger\json"
Type: files; Name: "{localappdata}\ExileLedger\json-folder.txt"
Type: files; Name: "{localappdata}\ExileLedger\last-backup-folder.txt"
Type: files; Name: "{localappdata}\ExileLedger\prices.json"
Type: files; Name: "{localappdata}\ExileLedger\trade-stats.json"
Type: files; Name: "{localappdata}\ExileLedger\trade-static.json"

[Icons]
Name: "{userprograms}\{#MyAppNameSafe}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: starticon
Name: "{userdesktop}\{#MyAppNameSafe}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Open {#MyAppName}"; Flags: nowait postinstall

[Code]
const
  UninstallKey = 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{E8A4C2B1-7F3D-4A9E-8C15-2B6D91F04E77}_is1';

function SafeDir: String;
begin
  Result := ExpandConstant('{localappdata}\Programs\{#MyAppNameSafe}');
end;

function IsBadDir(const Dir: String): Boolean;
var
  U: String;
begin
  U := UpperCase(Dir);
  Result :=
    (Pos('\USERS\DEFAULT\', U) > 0) or
    (Pos('\WINDOWS\SYSTEM32\CONFIG\SYSTEMPROFILE\', U) > 0);
end;

function PreviousInstallDir: String;
begin
  Result := '';
  if not RegQueryStringValue(HKCU, UninstallKey, 'InstallLocation', Result) then
    if not RegQueryStringValue(HKLM, UninstallKey, 'InstallLocation', Result) then
      Result := '';
  Result := RemoveBackslash(Trim(Result));
end;

procedure ForceSafeDir;
begin
  WizardForm.DirEdit.Text := SafeDir;
end;

procedure InitializeWizard;
begin
  if IsBadDir(WizardForm.DirEdit.Text) then
    ForceSafeDir;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (CurPageID = wpSelectDir) and IsBadDir(WizardDirValue) then
    ForceSafeDir;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if IsBadDir(WizardForm.DirEdit.Text) then
    ForceSafeDir;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then Sleep(1500);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  Uninstall: String;
  Prev: String;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM StillSaneExile.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(400);
  Prev := PreviousInstallDir;
  if (Prev <> '') and (not IsBadDir(Prev)) and (CompareText(Prev, RemoveBackslash(WizardDirValue)) <> 0) then
  begin
    Uninstall := '';
    if not RegQueryStringValue(HKCU, UninstallKey, 'UninstallString', Uninstall) then
      RegQueryStringValue(HKLM, UninstallKey, 'UninstallString', Uninstall);
    if Uninstall <> '' then
      Exec(RemoveQuotes(Uninstall), '/VERYSILENT /NORESTART /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
  Result := '';
end;

function LedgerHasKeep: Boolean;
var
  Dir: String;
begin
  Dir := ExpandConstant('{localappdata}\ExileLedger');
  Result :=
    FileExists(Dir + '\supabase.json') or
    FileExists(Dir + '\supabase.public.json') or
    FileExists(Dir + '\supabase-db-pass.txt') or
    DirExists(Dir + '\inbox') or
    DirExists(Dir + '\inbox-www') or
    DirExists(Dir + '\inbox-webview');
end;

procedure DeleteOurOldExes;
var
  Dir: String;
  FindRec: TFindRec;
begin
  Dir := ExpandConstant('{app}');
  if not DirExists(Dir) then Exit;
  if FindFirst(Dir + '\StillSaneExile.exe.old*', FindRec) then
  try
    repeat
      if FindRec.Attributes and FILE_ATTRIBUTE_DIRECTORY = 0 then
        DeleteFile(Dir + '\' + FindRec.Name);
    until not FindNext(FindRec);
  finally
    FindClose(FindRec);
  end;
end;

function IsOurLeftoverPath(const S: String): Boolean;
var
  U: String;
begin
  U := UpperCase(S);
  Result :=
    (Pos('\STILLSANEEXILE.EXE', U) > 0) or
    (CompareText(ExtractFileName(S), '{#MyAppExeName}') = 0) or
    (Pos('\STILL SANE EXILE.LNK', U) > 0) or
    (CompareText(ExtractFileName(S), '{#MyAppNameSafe}.lnk') = 0);
end;

function RegistryValueIsOurs(RootKey: Integer; const Subkey, ValueName: String): Boolean;
var
  Blob, One: String;
begin
  Result := IsOurLeftoverPath(ValueName);
  if Result then Exit;
  if RegQueryMultiStringValue(RootKey, Subkey, ValueName, Blob) then
  begin
    Result := IsOurLeftoverPath(Blob);
    Exit;
  end;
  if RegQueryStringValue(RootKey, Subkey, ValueName, One) then
    Result := IsOurLeftoverPath(One);
end;

procedure DeleteOurValues(RootKey: Integer; const Subkey: String);
var
  Names: TArrayOfString;
  I: Integer;
begin
  if not RegGetValueNames(RootKey, Subkey, Names) then Exit;
  for I := 0 to GetArrayLength(Names) - 1 do
    if RegistryValueIsOurs(RootKey, Subkey, Names[I]) then
      RegDeleteValue(RootKey, Subkey, Names[I]);
end;

procedure CleanOurWindowsLeftovers;
begin
  DeleteFile(ExpandConstant('{userprograms}\{#MyAppNameSafe}.lnk'));
  DeleteFile(ExpandConstant('{userdesktop}\{#MyAppNameSafe}.lnk'));
  DeleteOurValues(HKCU, 'Software\Microsoft\Windows\CurrentVersion\UFH\SHC');
  DeleteOurValues(HKCU, 'Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Compatibility Assistant\Store');
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Dir: String;
begin
  if CurUninstallStep = usUninstall then
  begin
    DeleteOurOldExes;
    CleanOurWindowsLeftovers;
  end;
  if CurUninstallStep = usPostUninstall then
  begin
    CleanOurWindowsLeftovers;
    if RegKeyExists(HKCU, UninstallKey) then
      RegDeleteKeyIncludingSubkeys(HKCU, UninstallKey);
    Dir := ExpandConstant('{localappdata}\ExileLedger');
    if not DirExists(Dir) then Exit;
    if not LedgerHasKeep then
      DelTree(Dir, True, True, True);
  end;
end;
