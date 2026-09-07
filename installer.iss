#define MyAppName "Still Sane, Exile?"
#define MyAppNameSafe "Still Sane Exile"
#define MyAppVersion "1.0.8"
#define MyAppExeName "StillSaneExile.exe"

[Setup]
AppId={{E8A4C2B1-7F3D-4A9E-8C15-2B6D91F04E77}
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
UsePreviousAppDir=no
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

[Files]
Source: "dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userprograms}\{#MyAppNameSafe}"; Filename: "{app}\{#MyAppExeName}"
Name: "{userdesktop}\{#MyAppNameSafe}"; Filename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Open {#MyAppName}"; Flags: nowait postinstall

[Code]
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

procedure InitializeWizard;
begin
  if IsBadDir(WizardForm.DirEdit.Text) then
    WizardForm.DirEdit.Text := SafeDir;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (CurPageID = wpSelectDir) and IsBadDir(WizardDirValue) then
    WizardForm.DirEdit.Text := SafeDir;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if IsBadDir(WizardForm.DirEdit.Text) then
    WizardForm.DirEdit.Text := SafeDir;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then Sleep(1500);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM StillSaneExile.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := '';
end;
