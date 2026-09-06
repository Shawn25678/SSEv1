@echo off
set "EXE=%~dp0dist\StillSaneExile.exe"
if exist "%EXE%" (
  start "" "%EXE%"
) else (
  start "" "%~dp0index.html"
)
