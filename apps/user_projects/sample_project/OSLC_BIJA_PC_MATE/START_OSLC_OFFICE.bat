@echo off
title OSLC ERP - Connecting to Office Server...
set HOST_URL=http://192.168.100.106:5173/

echo =======================================================
echo          OSLC ERP - Om Sai Latest Creation
echo       Connecting to Master PC (192.168.100.106)...
echo =======================================================
echo.

set EDGE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE% set EDGE="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if exist %EDGE% (
    start "" %EDGE% --app="%HOST_URL%" --app-id="OSLCEnterprisePortal" --window-size=1650,1000
    exit /b
)

if exist %CHROME% (
    start "" %CHROME% --app="%HOST_URL%" --app-id="OSLCEnterprisePortal" --window-size=1650,1000
    exit /b
)

start "" "%HOST_URL%"
exit /b
