Add-Type -AssemblyName System.Windows.Forms
$filePath = "d:\NOTA\OSLC IN OUT\backend\whatsapp_msg.txt"
$text = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# 1. Set clipboard with full report text
Set-Clipboard -Value $text

# 2. Launch WhatsApp chat for 919033157999
Start-Process "whatsapp://send?phone=919033157999"
Start-Sleep -Seconds 3

# 3. Bring WhatsApp window to front
$wshell = New-Object -ComObject WScript.Shell
$activated = $wshell.AppActivate("WhatsApp")
Start-Sleep -Milliseconds 1500

# 4. Paste using Ctrl+V
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 1200

# 5. Send message using Enter
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Milliseconds 600

Write-Output "WHATSAPP_MESSAGE_SENT_SUCCESSFULLY"
