@echo off
title Setup OSLC Pack Station PC
cd /d "%~dp0"

echo ========================================================
echo        SETTING UP OSLC PACK STATION ON THIS PC
echo ========================================================
echo.

rem 0. Kill any old agents running on port 8790
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":8790 .*LISTENING"') do taskkill /PID %%P /F >nul 2>&1
if /i not "%COMPUTERNAME%"=="PC-106" (
    taskkill /F /IM python.exe /IM pythonw.exe >nul 2>&1
)
taskkill /F /IM "OSLC Packing Control*.exe" /IM "OSLC Pack Station*.exe" >nul 2>&1

rem 1. Create Desktop & Windows Startup Shortcuts
echo Creating Desktop and Startup Shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$Desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$Startup = [Environment]::GetFolderPath('Startup'); " ^
  "$TargetExe = Join-Path '%~dp0' 'OSLC Packing Control (Bija PC Mate).exe'; " ^
  "if (-not (Test-Path $TargetExe)) { $TargetExe = Join-Path '%~dp0' 'OSLC Pack Station.exe'; } " ^
  "$Shortcut = $WshShell.CreateShortcut((Join-Path $Desktop 'OSLC Packing Control.lnk')); " ^
  "$Shortcut.TargetPath = $TargetExe; " ^
  "$Shortcut.WorkingDirectory = '%~dp0'; " ^
  "$Shortcut.IconLocation = '%~dp0oslc_icon.ico,0'; " ^
  "$Shortcut.Description = 'OSLC Pack Station - 1-Click Launch'; " ^
  "$Shortcut.Save(); " ^
  "$StartupShortcut = $WshShell.CreateShortcut((Join-Path $Startup 'OSLC Packing Control.lnk')); " ^
  "$StartupShortcut.TargetPath = $TargetExe; " ^
  "$StartupShortcut.WorkingDirectory = '%~dp0'; " ^
  "$StartupShortcut.IconLocation = '%~dp0oslc_icon.ico,0'; " ^
  "$StartupShortcut.Description = 'OSLC Pack Station 24x7 Auto-Start'; " ^
  "$StartupShortcut.Save();"

rem 2. Optional: Allow port 8790 locally if admin
netsh advfirewall firewall add rule name="OSLC Print Agent 8790" dir=in action=allow protocol=TCP localport=8790 >nul 2>&1

echo.
echo ========================================================
echo   STATION SETUP COMPLETE!
echo.
echo   1. Desktop par 'OSLC Packing Control' no icon bani gayo chhe.
echo   2. Windows chalu thase etle jate j background ma chalu thai jashe!
echo   3. Net / Wi-Fi disconnect thashe to automatic pachu jodi leshe!
echo ========================================================
echo.
echo Launching application now...
timeout /t 2 >nul
start "" "OSLC Packing Control (Bija PC Mate).exe"
exit /b 0
