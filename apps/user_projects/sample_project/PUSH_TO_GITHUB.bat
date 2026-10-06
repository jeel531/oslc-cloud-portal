@echo off
title Push OSLC Cloud Master Portal to GitHub
cd /d "D:\OSLC_CLOUD_MASTER_PORTAL"
echo ================================================================
echo    PUSHING OSLC CLOUD MASTER PORTAL TO GITHUB (jeel531)
echo ================================================================
echo.
"C:\Users\PC-106\PortableGit-oslc-20260922094043\bin\git.exe" remote remove origin 2>nul
"C:\Users\PC-106\PortableGit-oslc-20260922094043\bin\git.exe" remote add origin https://github.com/jeel531/oslc-cloud-portal.git
"C:\Users\PC-106\PortableGit-oslc-20260922094043\bin\git.exe" branch -M main
"C:\Users\PC-106\PortableGit-oslc-20260922094043\bin\git.exe" push -u origin main
echo.
echo ================================================================
echo Done! If success, now go to Render.com and select this repo!
echo ================================================================
pause
