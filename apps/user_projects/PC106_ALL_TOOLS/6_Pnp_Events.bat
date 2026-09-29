@echo off
title "6. Pnp Events - Hardware Event Logs - PC-106"
color 0D
chcp 65001 >nul
cd /d "%~dp0"

echo [*] Reading Kernel-PnP Event Logs for Audio Devices...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-PnP'} -MaxEvents 50 -ErrorAction SilentlyContinue | Where-Object { $_.Message -match '0C0C|Audio|DELD0B8' } | Select-Object TimeCreated, Id, Message | Format-List"

echo.
pause
