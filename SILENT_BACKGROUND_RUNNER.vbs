' Runs the OSLC Master Portal completely hidden in the background (No black window, no code open)
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = strPath
' Run python master_server.py completely hidden (0 = hidden)
WshShell.Run "python master_server.py", 0, False
