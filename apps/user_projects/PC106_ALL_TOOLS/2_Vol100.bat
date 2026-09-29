@echo off
title "2. Vol100 - Volume Booster - PC-106"
color 0E
chcp 65001 >nul
cd /d "%~dp0"

echo [*] Boosting Master Volume to 100%% and playing test chime...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; 1..50 | ForEach-Object { $w.SendKeys([char]175) }; [System.Media.SystemSounds]::Exclamation.Play(); [System.Media.SystemSounds]::Asterisk.Play()"

echo.
echo [OK] Volume 100%% Test Done.
pause
