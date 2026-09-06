@echo off
setlocal
set "ROOT=%~dp0"
set "ISCC=%LocalAppData%\Programs\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" (
  echo Inno Setup is missing. Install JRSoftware.InnoSetup then run this again.
  exit /b 1
)
echo Building StillSaneExile.exe...
"%ProgramFiles%\dotnet\dotnet.exe" publish "%ROOT%desktop\ExileLedger.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -p:DebugType=None -p:DebugSymbols=false -o "%ROOT%dist"
if errorlevel 1 exit /b 1
echo Building installer...
"%ISCC%" /Q "%ROOT%installer.iss"
if errorlevel 1 exit /b 1
echo.
echo Setup: %ROOT%dist\StillSaneExile-Setup.exe
endlocal
