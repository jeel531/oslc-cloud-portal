# -*- coding: utf-8 -*-
"""
OSLC 24/7 Tunnel Watchdog & Auto-Healing Engine
Om Sai Latest Creation

Responsibilities:
 1. Runs Cloudflare Tunnel 24/7 in the background
 2. Continuously monitors health of the tunnel and master portal (Port 8080)
 3. Automatically auto-restarts the tunnel if connection drops or internet reconnects
 4. Auto-updates all desktop share links, shortcuts, and sync status
 5. Zero manual maintenance needed from user!
"""
import os
import sys
import time
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CLOUDFLARED = ROOT / "cloudflared.exe"
DESKTOP = Path(r"C:\Users\PC-106\Desktop")
STATUS_FILE = ROOT / "portal_ui" / "live_url.json"
LOG_FILE = ROOT / "tunnel_watchdog.log"

if sys.stdout is None or not hasattr(sys.stdout, "write"):
    try:
        sys.stdout = open(LOG_FILE, "a", encoding="utf-8", buffering=1)
    except Exception:
        sys.stdout = open(os.devnull, "w")

if sys.stderr is None or not hasattr(sys.stderr, "write"):
    try:
        sys.stderr = open(LOG_FILE, "a", encoding="utf-8", buffering=1)
    except Exception:
        sys.stderr = open(os.devnull, "w")

def write_share_links(url: str):
    """Updates Desktop link files with the active live URL."""
    try:
        cloud_url = "https://oslc-cloud-portal.onrender.com"
        surge_url = "https://oslcerp-live.surge.sh/"

        # 1. Update BIJA_PC_NE_PHONE_MA_MOKLVA_MATE.txt
        txt1 = DESKTOP / "BIJA_PC_NE_PHONE_MA_MOKLVA_MATE.txt"
        content1 = f"""========================================================================================
       📦 OM SAI LATEST CREATION - OSLC CLOUD MASTER HUB (બધા માટે લાઈવ લિંક) 📦
       👑 CREATED BY JEEL VAGHANI • 24x7 ACTIVE 👑
========================================================================================

✅ ૧. બીજાના મોબાઈલ ફોનમાં મોકલવા માટે (WhatsApp પર આ લિંક મોકલો):
----------------------------------------------------------------------------------------
👉 ૨૪ કલાક લાઈવ ક્લાઉડ લિંક (PC બંધ હોય તોય ચાલશે):
   {cloud_url}

👉 ફિક્સ સર્જ લિંક (તમામ ફોન માટે):
   {surge_url}

📱 મોબાઈલમાં વાપરવાની રીત:
૧. આ લિંક કોઈપણ મોબાઈલમાં (Android કે iPhone) ગમે તે બ્રાઉઝર (Chrome/Safari) માં ખોલી શકાય છે.
૨. તે પર્સનલ નેટ (4G/5G, Jio, Airtel, Wi-Fi) પર ગમે ત્યાંથી ૨૪ કલાક ચાલશે.
૩. 【ખાસ મહત્વનું】કોઈ નવી APK ઇન્સ્ટોલ કરવાની પણ જરૂર નથી! 
   બ્રાઉઝરમાં 'Add to Home screen' (એપ ઇન્સ્ટોલ કરો) કરી લેશો એટલે પ્લે સ્ટોર જેવો આઈકન બની જશે!
૪. ભવિષ્યમાં જ્યારે પણ નવું અપડેટ આવશે ત્યારે માત્ર પેજ રિફ્રેશ કરતા જ તરત નવો ડેટા આવી જશે!

----------------------------------------------------------------------------------------
✅ ૨. બીજાના કમ્પ્યુટર (PC / લેપટોપ) માં ખોલવા માટે:
----------------------------------------------------------------------------------------
👉 ઓફિસના Wi-Fi પર હોય તો:
   http://192.168.100.106:8080/

👉 ઘરના નેટ કે બહારના પર્સનલ નેટ પર હોય તો:
   {cloud_url}

👉 લોકલ ટનલ લિંક:
   {url}

========================================================================================
"""
        txt1.write_text(content1, encoding="utf-8")

        # 2. Update SHARE_LINK_FOR_OTHER_PC.txt
        txt2 = DESKTOP / "SHARE_LINK_FOR_OTHER_PC.txt"
        content2 = f"""================================================================================
   OM SAI LATEST CREATION - SHARE LINK FOR OTHER PC & MOBILE
   👑 CREATED BY JEEL VAGHANI • OSLC HOUSE 👑
================================================================================

તમારા કોઈપણ બીજા PC, લેપટોપ અથવા મોબાઈલમાં (પર્સનલ ઇન્ટરનેટ પરથી):
👉 LIVE CLOUD LINK (PC બંધ હોય તોય ૨૪ કલાક ચાલુ): {cloud_url}
👉 SURGE FIXED LINK: {surge_url}
👉 TEMPORARY TUNNEL: {url}

સ્થાનિક ઓફિસ Wi-Fi પરથી:
👉 LOCAL IP LINK: http://192.168.100.106:8080/
================================================================================
"""
        txt2.write_text(content2, encoding="utf-8")

        # 3. Update Desktop URL shortcut to permanent 24/7 Cloud
        url_file = DESKTOP / "OSLC Online App.url"
        url_file.write_text(f"[InternetShortcut]\nURL={cloud_url}\n", encoding="utf-8")

        # 4. Save live_url.json for frontend
        import json
        try:
            STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
            STATUS_FILE.write_text(json.dumps({"url": url, "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")}, indent=2), encoding="utf-8")
        except Exception as je:
            print(f"[WATCHDOG] Failed to save live_url.json: {je}")
        # 5. Run sync_all_devices to update Surge and all 15 REPRR project launchers
        try:
            sync_script = ROOT / "sync_all_devices.py"
            if sync_script.exists():
                subprocess.Popen([sys.executable, str(sync_script)])
        except Exception as se:
            print(f"[WATCHDOG] sync_all_devices trigger error: {se}")

        print(f"[WATCHDOG] Updated all Desktop links to: {url}")
    except Exception as e:
        print(f"[WATCHDOG ERROR] Failed to write links: {e}")


def run_tunnel():
    print("=" * 60)
    print("  OSLC 24/7 TUNNEL AUTO-HEALING WATCHDOG STARTED")
    print("=" * 60)

    url_regex = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")

    while True:
        cmd = [
            str(CLOUDFLARED),
            "tunnel",
            "--url",
            "http://127.0.0.1:8080",
            "--protocol",
            "http2",
            "--edge-ip-version",
            "auto",
            "--no-autoupdate"
        ]

        print(f"[{time.strftime('%H:%M:%S')}] Launching Cloudflare Tunnel on port 8080 (Silent Background)...")
        creation_flags = 0x08000000 if sys.platform == "win32" else 0
        startupinfo = None
        if sys.platform == "win32":
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 0

        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="ignore",
            bufsize=1,
            creationflags=creation_flags,
            startupinfo=startupinfo
        )

        detected_url = None

        try:
            for line in proc.stdout:
                line_str = line.strip()
                if "trycloudflare.com" in line_str:
                    match = url_regex.search(line_str)
                    if match:
                        detected_url = match.group(0)
                        print(f"[{time.strftime('%H:%M:%S')}] >>> LIVE TUNNEL ACTIVE: {detected_url} <<<")
                        write_share_links(detected_url)
                
                # Check if process died
                if proc.poll() is not None:
                    break
        except Exception as e:
            print(f"[WATCHDOG LOOP ERROR] {e}")

        ret = proc.wait()
        print(f"[{time.strftime('%H:%M:%S')}] Tunnel process exited with code {ret}. Auto-restarting in 5s...")
        time.sleep(5)

if __name__ == "__main__":
    run_tunnel()
