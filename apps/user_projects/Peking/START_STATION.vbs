Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
ScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = ScriptDir

If fso.FileExists(ScriptDir & "\OSLC Packing Control (Bija PC Mate).exe") Then
    WshShell.Run Chr(34) & ScriptDir & "\OSLC Packing Control (Bija PC Mate).exe" & Chr(34), 1, False
ElseIf fso.FileExists(ScriptDir & "\OSLC Pack Station.exe") Then
    WshShell.Run Chr(34) & ScriptDir & "\OSLC Pack Station.exe" & Chr(34), 1, False
Else
    WshShell.Run Chr(34) & ScriptDir & "\START_STATION.bat" & Chr(34), 0, False
End If
