@echo off
set SCRIPT="%TEMP%\%RANDOM%-%RANDOM%_oslc_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\OSLC ERP (PC).lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%~dp0OSLC_PC.exe" >> %SCRIPT%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT%
echo oLink.Description = "OSLC ERP - Om Sai Latest Creation" >> %SCRIPT%
echo If oWS.CreateObject("Scripting.FileSystemObject").FileExists("%~dp0OSLC.ico") Then >> %SCRIPT%
echo oLink.IconLocation = "%~dp0OSLC.ico,0" >> %SCRIPT%
echo End If >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%
echo [OK] OSLC Desktop Shortcut Successfully Created on this PC!
pause
