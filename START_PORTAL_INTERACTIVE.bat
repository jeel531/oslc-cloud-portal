@echo off
title OSLC Master Cloud Portal (Om Sai Latest Creation)
cd /d "%~dp0"
echo ================================================================
echo    OM SAI LATEST CREATION - MASTER CLOUD PORTAL
echo ================================================================
echo.
echo Starting all 4 systems on: http://localhost:8080
echo Other PCs/Mobiles on Wi-Fi: http://192.168.100.106:8080
echo.
python master_server.py
pause
