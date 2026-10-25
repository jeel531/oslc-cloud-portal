import time
import requests
import sys
import subprocess

print("[Auto Bot Listener] Starting WhatsApp connection monitor...")

for attempt in range(120): # Monitor for up to 10 minutes
    try:
        r = requests.get("http://127.0.0.1:8008/status", timeout=4)
        data = r.json()
        status = data.get("status")
        connected = data.get("connected")
        user = data.get("user")
        
        if connected or status == "CONNECTED":
            print(f"[Auto Bot Listener] WhatsApp CONNECTED as: {user}!")
            print("[Auto Bot Listener] Triggering automatic group creation & live alert...")
            time.sleep(2)
            # Run send_chori_live.py to create group and dispatch
            subprocess.run([sys.executable, "backend/send_chori_live.py"], cwd="d:/NOTA/OSLC IN OUT")
            print("[Auto Bot Listener] Done! Group and live alert sent successfully.")
            break
    except Exception as e:
        print("[Auto Bot Listener] Status check notice:", e)
    time.sleep(5)
