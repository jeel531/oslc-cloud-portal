Set sh = CreateObject("WScript.Shell")
For i = 1 To 10
    If sh.AppActivate("Windows Script Host") Then
        sh.SendKeys "{ENTER}"
        WScript.Sleep 200
    End If
Next

