@echo off
title Stop Old Agents
echo ========================================================
echo       STOPPING ANY OLD AGENTS ON THIS PC
echo ========================================================
echo.

rem 1. Kill any process listening on port 8790
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":8790 .*LISTENING"') do (
    echo Terminating PID %%P listening on port 8790...
    taskkill /PID %%P /F >nul 2>&1
)

rem 2. Terminate background Python or old launcher instances
taskkill /F /IM python.exe /IM pythonw.exe >nul 2>&1
taskkill /F /IM "OSLC Packing Control*.exe" /IM "OSLC Pack Station*.exe" >nul 2>&1

echo.
echo All old background agents have been closed!
echo You can now run 'OSLC Packing Control (Bija PC Mate).exe'.
timeout /t 2 >nul
exit /b 0
