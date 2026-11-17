' Runs the OSLC Master Portal completely hidden in the background (No black window, no code open)
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

py = "C:\Users\PC-106\AppData\Local\Python\bin\python.exe"
If Not fso.FileExists(py) Then
    py = "python.exe"
End If

WshShell.CurrentDirectory = strPath
' Run master server completely hidden (0 = hidden) on port 8080
WshShell.Run """" & py & """ master_server.py", 0, False
' Run OSLC Karigar Gate Pass server on port 8096 hidden
WshShell.Run """" & py & """ ""D:\MY PC-106\NOTA\MY PC\server.py""", 0, False
' Run auto-cloud sync daemon hidden (auto pushes every new project to server)
WshShell.Run """" & py & """ auto_cloud_sync.py", 0, False
' Run 24/7 Tunnel Watchdog hidden (keeps tunnel alive and auto-updates desktop links)
WshShell.Run """" & py & """ tunnel_watchdog.py", 0, False