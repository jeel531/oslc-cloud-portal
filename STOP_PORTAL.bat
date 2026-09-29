@echo off
title Stop OSLC Master Portal
echo Stopping any running OSLC Master Portal instances...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do (
    taskkill /F /PID %%a 2>nul
)
echo Portal stopped.
pause
