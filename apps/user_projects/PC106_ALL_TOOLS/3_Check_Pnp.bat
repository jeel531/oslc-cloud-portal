@echo off
title "3. Check Pnp - Hardware Audio Devices - PC-106"
color 0A
chcp 65001 >nul
cd /d "%~dp0"

echo [*] Scanning PnP Audio and Intel Hardware Devices...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-PnpDevice | Where-Object { $_.InstanceId -like '*8086*' -or $_.Class -eq 'MEDIA' -or $_.Class -eq 'AudioEndpoint' } | Select-Object FriendlyName, InstanceId, Status, Problem, ConfigManagerErrorCode | Format-Table -AutoSize"

echo.
pause
