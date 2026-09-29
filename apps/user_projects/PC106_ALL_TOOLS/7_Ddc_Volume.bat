@echo off
title "7. Ddc Volume - Dell Monitor Hardware Control - PC-106"
color 0A
chcp 65001 >nul
cd /d "%~dp0"

echo [*] Communicating with Dell S2218H Monitor via DDC/CI...
python "%~dp0ddc_volume.py"

echo.
pause
