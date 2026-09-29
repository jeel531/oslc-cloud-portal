@echo off
title "PC-106 MASTER ONE-CLICK ALL SOFTWARE AND DELL SOUND"
color 0A
chcp 65001 >nul
cd /d "%~dp0"

python "%~dp0master_pc106_setup.py"

echo.
pause
