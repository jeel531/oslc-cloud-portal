@echo off
title "5. Check Audio - Python Audio Inspection - PC-106"
color 0F
chcp 65001 >nul
cd /d "%~dp0"

echo [*] Inspecting Active Audio Device and Setting Wave Volume to 100%%...
python "%~dp0check_audio.py"

echo.
pause
