@echo off
title "1. Audio Tool - PC-106"
color 0B
chcp 65001 >nul
cd /d "%~dp0"

echo [*] Running Audio Tool (Windows Master Volume 100%% & Unmute)...
python "%~dp0audio_tool.py"

echo.
pause
