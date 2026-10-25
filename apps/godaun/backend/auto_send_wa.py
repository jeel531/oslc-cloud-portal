import urllib.request, json, subprocess, time

# 1. Fetch exact WhatsApp report text from our live API on port 8095
url = "http://127.0.0.1:8095/api/godaun/chori-whatsapp?from_date=2026-10-17&to_date=2026-10-17&phone=919033157999&limit=30"
res = urllib.request.urlopen(url)
data = json.loads(res.read().decode())
msg = data.get("message_text")
phone = "919033157999"

print(f"Generated report for {phone}: {len(msg)} characters")
print(f"Total Duplicates: {data.get('total_dupe_pcs')} pcs")

# Save message to a temporary text file with utf-8 encoding
with open("backend/whatsapp_msg.txt", "w", encoding="utf-8") as f:
    f.write(msg)

# 2. PowerShell script to copy to clipboard, activate WhatsApp, paste and send
ps_script = f"""
Add-Type -AssemblyName System.Windows.Forms
$text = [System.IO.File]::ReadAllText("backend/whatsapp_msg.txt", [System.Text.Encoding]::UTF8)

# Set clipboard
[System.Windows.Forms.Clipboard]::SetText($text)

# Launch WhatsApp chat for 919033157999
Start-Process "whatsapp://send?phone=919033157999"
Start-Sleep -Milliseconds 3000

$wshell = New-Object -ComObject WScript.Shell
$activated = $wshell.AppActivate("WhatsApp")
Start-Sleep -Milliseconds 1000

# Send Ctrl+V to paste
[System.Windows.Forms.SendKeys]::SendWait("^v")
Start-Sleep -Milliseconds 800

# Send Enter to send
[System.Windows.Forms.SendKeys]::SendWait("{{ENTER}}")
Start-Sleep -Milliseconds 500

Write-Output "WHATSAPP_MESSAGE_SENT_SUCCESSFULLY"
"""

with open("backend/send_wa.ps1", "w", encoding="utf-8") as f:
    f.write(ps_script)

print("Created send_wa.ps1 script.")
