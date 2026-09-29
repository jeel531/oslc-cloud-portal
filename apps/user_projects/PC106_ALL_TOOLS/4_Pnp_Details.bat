@echo off
title "4. Pnp Details - Intel and Realtek Audio - PC-106"
color 0B
chcp 65001 >nul
cd /d "%~dp0"

echo [*] Inspecting Intel and Realtek Audio Hardware Details...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-PnpDevice | Where-Object { $_.InstanceId -like '*0C0C*' -or $_.InstanceId -like '*8C20*' -or $_.FriendlyName -like '*Audio*' -or $_.FriendlyName -like '*Realtek*' } | Select-Object FriendlyName, Status, Problem, ConfigManagerErrorCode, InstanceId | Format-List"

echo.
pause
