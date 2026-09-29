@echo off
title Configure OSLC Master Portal Auto-Start
cd /d "%~dp0"

echo ================================================================
echo    CONFIGURING OSLC MASTER PORTAL AUTO-START WITH WINDOWS
echo ================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$Startup = [Environment]::GetFolderPath('Startup'); " ^
  "$Shortcut = $WshShell.CreateShortcut((Join-Path $Startup 'OSLC_Cloud_Master_Portal.lnk')); " ^
  "$Shortcut.TargetPath = 'wscript.exe'; " ^
  "$Shortcut.Arguments = '\"%~dp0SILENT_BACKGROUND_RUNNER.vbs\"'; " ^
  "$Shortcut.WorkingDirectory = '%~dp0'; " ^
  "$Shortcut.WindowStyle = 7; " ^
  "$Shortcut.Description = 'OSLC Cloud Master Portal Background Service'; " ^
  "$Shortcut.Save();"

if errorlevel 1 (
  echo [ERROR] Failed to configure auto startup.
  pause
  exit /b 1
)

echo [SUCCESS] Auto-start configured successfully!
echo Whenever your PC starts, OSLC Master Portal will run silently in background.
echo You will never need to keep VS Code or terminal open!
echo.
pause
