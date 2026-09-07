@echo off
setlocal
set "ROOT=%~dp0"
echo Building StillSaneInbox.exe...
"%ProgramFiles%\dotnet\dotnet.exe" publish "%ROOT%desktop-inbox\Inbox.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true -p:DebugType=None -p:DebugSymbols=false -o "%ROOT%dist"
if errorlevel 1 exit /b 1
echo Inbox: %ROOT%dist\StillSaneInbox.exe
endlocal
