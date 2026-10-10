@echo off
title OSLC Pack Station Launcher
cd /d "%~dp0"

rem Kill any old deadlocks on port 8790
if /i not "%COMPUTERNAME%"=="PC-106" (
    taskkill /F /IM python.exe /IM pythonw.exe >nul 2>&1
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":8790 .*LISTENING"') do taskkill /PID %%P /F >nul 2>&1

if exist "OSLC Packing Control (Bija PC Mate).exe" (
    start "" "OSLC Packing Control (Bija PC Mate).exe"
    exit /b 0
)

if exist "OSLC Pack Station.exe" (
    start "" "OSLC Pack Station.exe"
    exit /b 0
)

set "SERVER_URL=http://192.168.100.106:8787"
if exist "server_url.txt" (
    set /p SERVER_URL=<server_url.txt
)
start "" "%SERVER_URL%"
exit /b 0
