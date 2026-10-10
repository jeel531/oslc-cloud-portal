' Runs the OSLC Master Portal completely hidden in the background (No black window, no code open)
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = strPath
' Run master server completely hidden (0 = hidden)
WshShell.Run "python master_server.py", 0, False
' Run OSLC Karigar Gate Pass server on port 8096 hidden
WshShell.Run "python ""D:\NOTA\MY PC\server.py""", 0, False
' Run auto-cloud sync daemon hidden (auto pushes every new project to server)
WshShell.Run "python auto_cloud_sync.py", 0, False
