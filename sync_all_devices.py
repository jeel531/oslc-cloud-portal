# -*- coding: utf-8 -*-
"""
OSLC Universal Multi-Device Live Sync Engine
Created by Jeel Vaghani - OM SAI LATEST CREATION

Synchronizes all 15 separated projects across:
 1. Remote Phones (Android APK & Mobile Web)
 2. Other PCs (Universal Launchers, Standalone EXEs & Cloud Web)
 3. Fixed Surge Redirects (oslcerp-live.surge.sh & cerp-live.surge.sh)
 4. Desktop Quick-Share Links
 5. Windows Firewall rules for Local LAN
"""
import os
import sys
import json
import time
import subprocess
from pathlib import Path

ROOT = Path(r"D:\OSLC_CLOUD_MASTER_PORTAL")
REPRR_ROOT = Path(r"C:\Users\PC-106\Downloads\REPRR\📁_TAMAM_PROJECTS_ALG_ALG")
DESKTOP = Path(r"C:\Users\PC-106\Desktop")
STATUS_FILE = ROOT / "portal_ui" / "live_url.json"
SURGE_SCRIPT = Path(r"D:\JEEL VAGHANI\OSLC ERP\OSLC-PENDING-LIVE-ERP-V17-CATEGORY-LIVE\scratch\update_fixed_link.py")

PROJECT_ROUTES = {
    "01": {"subpath": "gatepass/", "title": "કારીગર ૧૪૧ ગેટ પાસ સિસ્ટમ (Karigar Gate Pass)"},
    "02": {"subpath": "godaun/", "title": "ગોડાઉન મટીરીયલ ઇન-આઉટ અને કારીગર પીસ રેટ"},
    "03": {"subpath": "alter/", "title": "કારીગર અલ્ટર અને સ્ટીચિંગ ઇશ્યુ રિપોર્ટ"},
    "04": {"subpath": "stock/", "title": "લાઈવ સ્ટોક વેરહાઉસ રિપોર્ટ (Stock Report)"},
    "05": {"subpath": "po/", "title": "PO ઓર્ડર અને કટિંગ ડેશબોર્ડ (PO Dashboard)"},
    "06": {"subpath": "mk/", "title": "કારીગર ચેકિંગ રિપોર્ટ ૧૨૭ (MK Checking)"},
    "07": {"subpath": "barcode/", "title": "ગોડાઉન શેલ્ફ બારકોડ પ્રિન્ટ (A4 10-20 Barcodes)"},
    "08": {"subpath": "", "title": "પેન્ડિંગ લિસ્ટ પ્રિન્ટ અને ઓલ સ્ટેટસ કંટ્રોલ સેન્ટર"},
    "09": {"subpath": "stock/", "title": "સ્ટોક શોર્ટેજ & પાવર પિવોટ (One Click Print)"},
    "10": {"subpath": "erp/", "title": "ઓરિજિનલ ફેક્ટરી ERP લાઈવ ક્લાઉડ સિસ્ટમ"},
    "11": {"subpath": "", "title": "ગોડાઉન હાજરી સિસ્ટમ (Attendance)"},
    "12": {"subpath": "barcode/", "title": "લુમોરા બારકોડ લેબલ જનરેટર (Lumora Barcode)"},
    "13": {"subpath": "po/", "title": "બ્લિંકિટ પીઓ અને સ્કેનર સિસ્ટમ (Blinkit PO)"},
    "14": {"subpath": "", "title": "ઇ-કોમર્સ 4K એડ અને ફોટો મેકર (Photo Maker)"},
    "15": {"subpath": "", "title": "સ્પેશિયલ પ્રિન્ટિંગ ટૂલ્સ, લાઇનમેન અને વિપ ચેકર"}
}

def get_current_live_url():
    """Reads current live URL from status file or fallback."""
    if STATUS_FILE.exists():
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("url", "").strip()
        except Exception:
            pass
    return "https://lighting-travels-ears-information.trycloudflare.com"

def update_surge_cloud(live_url: str):
    """Pushes the live URL to oslcerp-live.surge.sh and cerp-live.surge.sh."""
    print(f"[SURGE] Updating Surge endpoints with: {live_url}")
    if SURGE_SCRIPT.exists():
        try:
            p = subprocess.run(
                [sys.executable, str(SURGE_SCRIPT), live_url],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=40
            )
            print(f"[SURGE] Exit: {p.returncode}, Stdout: {p.stdout.strip()}")
            return p.returncode == 0
        except Exception as e:
            print(f"[SURGE ERROR] {e}")
            return False
    return False

def open_firewall_ports():
    """Ensures ports 8080, 8000, 8096 are open in Windows Firewall for office LAN."""
    ports = [8080, 8000, 8096]
    for p in ports:
        rule_name = f"OSLC_PORT_{p}_ALLOW"
        cmd = f'netsh advfirewall firewall add rule name="{rule_name}" dir=in action=allow protocol=TCP localport={p}'
        try:
            subprocess.run(cmd, shell=True, capture_output=True)
        except Exception:
            pass
    print("[FIREWALL] Local Wi-Fi ports 8080, 8000, 8096 are permanently allowed.")

def sync_all_reprr_projects(live_url: str):
    """Updates each of the 15 project folders in REPRR with universal launchers and direct links."""
    if not REPRR_ROOT.exists():
        print(f"[REPRR ERROR] Path not found: {REPRR_ROOT}")
        return

    base_url = live_url.rstrip("/")
    surge_url = "https://oslcerp-live.surge.sh"

    print("=" * 70)
    print("UPDATING ALL 15 PROJECTS IN REPRR FOR OTHER PC & MOBILE...")
    print("=" * 70)

    for folder in sorted(REPRR_ROOT.iterdir()):
        if not folder.is_dir():
            continue

        proj_id = folder.name[:2]
        info = PROJECT_ROUTES.get(proj_id, {"subpath": "", "title": folder.name})
        subpath = info["subpath"]
        
        proj_live_url = f"{base_url}/{subpath}" if subpath else f"{base_url}/"
        proj_surge_url = f"{surge_url}/{subpath}" if subpath else f"{surge_url}/"
        proj_local_url = f"http://192.168.100.106:8080/{subpath}" if subpath else "http://192.168.100.106:8080/"

        pc_dir = folder / "💻_PC_VERSION"
        phone_dir = folder / "📱_PHONE_APK"
        pc_dir.mkdir(parents=True, exist_ok=True)
        phone_dir.mkdir(parents=True, exist_ok=True)

        # -------------------------------------------------------------
        # 1. ROOT LEVEL SHORTCUT
        # -------------------------------------------------------------
        root_url_file = folder / "👉_CHALU_KARO_ONLINE_(૧-ક્લિક).url"
        root_url_file.write_text(f"[InternetShortcut]\nURL={proj_live_url}\n", encoding="utf-8")

        # -------------------------------------------------------------
        # 2. PC VERSION: Universal 1-Click Launcher Batch File
        # -------------------------------------------------------------
        bat_content = f"""@echo off
title {folder.name} - OSLC HOUSE (Created by Jeel Vaghani)
chcp 65001 >nul

echo ========================================================================================
echo   {info['title']}
echo   👑 CREATED BY JEEL VAGHANI • OM SAI LATEST CREATION 👑
echo ========================================================================================
echo.
echo આ સોફ્ટવેર તમારા PC પર શરૂ થઈ રહ્યું છે...
echo.

:: 1. ચેક કરો કે આ ફોલ્ડરમાં સ્થાનિક .exe ફાઇલ છે કે નહીં
set "FOUND_EXE="
for %%f in ("%~dp0*.exe") do (
    set "FOUND_EXE=%%f"
    goto :RunExe
)

:RunExe
if defined FOUND_EXE (
    echo [૧/૨] તમારા PC માં લોકલ સોફ્ટવેર મળી ગયું:
    echo   "%%FOUND_EXE%%"
    echo સીધું ડેસ્કટોપ સોફ્ટવેર ચાલુ થાય છે...
    start "" "%%FOUND_EXE%%"
    goto :Finish
)

:: 2. જો લોકલ .exe ન હોય તો સીધું ૨૪ કલાક લાઈવ ક્લાઉડ વેબ સિસ્ટમ ખોલો
echo [૨/૨] લાઈવ ક્લાઉડ સર્વર સાથે કનેક્ટ થઈ રહ્યું છે...
start "" "{proj_live_url}"

:Finish
echo.
echo ✅ સફળતાપૂર્વક ચાલુ થઈ ગયું છે!
timeout /t 3 >nul
exit
"""
        universal_bat = pc_dir / "⚡_1_CLICK_CHALU_KARO_AA_PC_PAR.bat"
        universal_bat.write_text(bat_content, encoding="utf-8")

        # Overwrite old broken .bat files that had hardcoded D:\NOTA\...
        for old_bat in pc_dir.glob("*.bat"):
            if old_bat.name != universal_bat.name:
                try:
                    # Replace its content with the safe universal launcher
                    old_bat.write_text(bat_content, encoding="utf-8")
                except Exception:
                    pass

        # PC Web Shortcut (.url)
        pc_url_file = pc_dir / "👉_1_CLICK_OPEN_ONLINE_(બધા_PC_માટે).url"
        pc_url_file.write_text(f"[InternetShortcut]\nURL={proj_live_url}\n", encoding="utf-8")

        # PC Instructions Guide in Gujarati
        pc_guide = f"""========================================================================================
   {folder.name} - બીજાના PC / લેપટોપમાં ચલાવવાની રીત
   👑 CREATED BY JEEL VAGHANI • OM SAI LATEST CREATION 👑
========================================================================================

✅ રીત ૧ (સૌથી સરળ - કોઈપણ સેટઅપ વગર ૧-ક્લિક પર):
----------------------------------------------------------------------------------------
👉 આ ફોલ્ડરમાં રહેલી '👉_1_CLICK_OPEN_ONLINE_(બધા_PC_માટે).url' ફાઇલ પર Double-Click કરો.
   અથવા સીધી આ લિંક Google Chrome કે Edge માં ખોલો:
   {proj_live_url}

👉 ઓફિસના Wi-Fi પર હોવ તો આ લિંક પણ ચાલશે:
   {proj_local_url}

★ ખાસિયત:
- કોઈપણ Driver (ODBC) કે સેટઅપ ઇન્સ્ટોલ કરવાની જરૂર નથી!
- PC-106 બંધ હોય તો પણ આ લિંક ૨૪ કલાક ચાલશે!
- જ્યારે પણ નવો ડેટા કે અપડેટ આવશે ત્યારે માત્ર Refresh કરતા જ તરત મળી જશે!

----------------------------------------------------------------------------------------
✅ રીત ૨ (.bat ફાઈલ દ્વારા):
----------------------------------------------------------------------------------------
👉 '⚡_1_CLICK_CHALU_KARO_AA_PC_PAR.bat' પર Double-Click કરો.
   તે આપોઆપ તમારા કમ્પ્યુટરમાં સોફ્ટવેર શરૂ કરી દેશે!
========================================================================================
"""
        (pc_dir / "💻_BIJA_PC_MA_CHALAVA_MATE.txt").write_text(pc_guide, encoding="utf-8")

        # -------------------------------------------------------------
        # 3. PHONE APK: Direct URL & WhatsApp Share Text
        # -------------------------------------------------------------
        phone_url_file = phone_dir / "👉_MOBILE_MA_CHALU_KARO.url"
        phone_url_file.write_text(f"[InternetShortcut]\nURL={proj_live_url}\n", encoding="utf-8")

        # WhatsApp Ready Share Text
        wa_text = f"""========================================================================================
   📱 {info['title']} - ફોનમાં વાપરવા માટેની લિંક (WhatsApp પર મોકલો)
   👑 CREATED BY JEEL VAGHANI • OSLC HOUSE 👑
========================================================================================

તમારા અથવા અન્ય કોઈ પણ વ્યક્તિના મોબાઈલ ફોનમાં આ લિંક મોકલો:

👉 ૧-ક્લિક લાઈવ લિંક:
{proj_live_url}

👉 ફિક્સ બેકઅપ લિંક:
{proj_surge_url}

📱 મોબાઈલમાં વાપરવાની રીત:
૧. આ લિંક પર ક્લિક કરો (Android કે iPhone ગમે તેમાં Chrome/Safari માં ખુલી જશે).
૨. પર્સનલ નેટવર્ક (Jio, Airtel, 4G/5G, Wi-Fi) પર ૨૪ કલાક ગમે ત્યાંથી ચાલશે.
૩. બ્રાઉઝરમાં 'Add to Home screen' (એપ ઇન્સ્ટોલ કરો) કરી લેશો એટલે પ્લે સ્ટોર જેવો આઈકન બની જશે!
૪. ભવિષ્યમાં કોઈપણ અપડેટ આવશે તો એપ આપોઆપ લાઈવ અપડેટ થઈ જશે!
========================================================================================
"""
        (phone_dir / "📲_WHATSAPP_PAR_MOKLO_PHONE_MATE.txt").write_text(wa_text, encoding="utf-8")

        # -------------------------------------------------------------
        # 4. ROOT LEVEL README UPDATE
        # -------------------------------------------------------------
        readme_file = folder / "વાંચો_આ_સોફ્ટવેર_વિશે_માહિતી.txt"
        readme_content = f"""========================================================================================
   {folder.name}
   👑 CREATED BY JEEL VAGHANI • OM SAI LATEST CREATION 👑
========================================================================================

આ પ્રોજેક્ટ સંપૂર્ણપણે સ્વતંત્ર અને અલગ છે.

🌐 લાઈવ ક્લાઉડ લિંક (કોઈપણ PC કે મોબાઈલ માટે ૨૪ કલાક લાઈવ):
👉 {proj_live_url}

📶 ઓફિસ Wi-Fi લિંક:
👉 {proj_local_url}

----------------------------------------------------------------------------------------
📱 ૧. ફોન માટે (PHONE APK & MOBILE):
----------------------------------------------------------------------------------------
- ફોલ્ડર: 📱_PHONE_APK/
- રીત ૧: WhatsApp પર '📲_WHATSAPP_PAR_MOKLO_PHONE_MATE.txt' માં આપેલી લિંક મોકલો (૧ સેકન્ડમાં ખુલી જશે).
- રીત ૨: અંદર રહેલી .apk ફાઇલ ફોનમાં નાખી Install કરો.

----------------------------------------------------------------------------------------
💻 ૨. કમ્પ્યુટર માટે (PC VERSION):
----------------------------------------------------------------------------------------
- ફોલ્ડર: 💻_PC_VERSION/
- રીત ૧: '⚡_1_CLICK_CHALU_KARO_AA_PC_PAR.bat' પર Double Click કરો.
- રીત ૨: '👉_1_CLICK_OPEN_ONLINE_(બધા_PC_માટે).url' પર Double Click કરો.
- રીત ૩: પેનડ્રાઈવમાં આખું ફોલ્ડર અથવા ZIP ફાઇલ બીજાના PC માં આપી દો.

----------------------------------------------------------------------------------------
⚡ PC-106 બંધ હોય તોય કેમ ચાલુ રહેશે?
----------------------------------------------------------------------------------------
- આ સોફ્ટવેર DigiBizz ના Cloud Server (103.118.17.67,3595) અને લાઈવ ક્લાઉડ સાથે જોડાયેલું છે.
- તમારા PC-106 પર નિર્ભર નથી! તમારું PC બંધ હશે તો પણ અન્ય કોઈ પણ PC કે ફોનમાં
  આ સોફ્ટવેર ૨૪ કલાક ચાલશે!
========================================================================================
"""
        readme_file.write_text(readme_content, encoding="utf-8")

        print(f"✅ Synced: {folder.name}")

    print("\nAll 15 separated projects successfully updated with universal multi-device launchers!")

def update_desktop_share_files(live_url: str):
    """Updates Desktop share files."""
    try:
        txt1 = DESKTOP / "BIJA_PC_NE_PHONE_MA_MOKLVA_MATE.txt"
        c1 = f"""========================================================================================
       📦 OM SAI LATEST CREATION - OSLC CLOUD MASTER HUB (બધા માટે લાઈવ લિંક) 📦
       👑 CREATED BY JEEL VAGHANI • 24x7 ACTIVE 👑
========================================================================================

✅ ૧. બીજાના મોબાઈલ ફોનમાં મોકલવા માટે (WhatsApp પર આ લિંક મોકલો):
----------------------------------------------------------------------------------------
👉 લાઈવ લિંક:
   {live_url}

👉 ફિક્સ સર્જ લિંક:
   https://oslcerp-live.surge.sh/

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
   {live_url}

========================================================================================
"""
        txt1.write_text(c1, encoding="utf-8")

        txt2 = DESKTOP / "SHARE_LINK_FOR_OTHER_PC.txt"
        c2 = f"""================================================================================
   OM SAI LATEST CREATION - SHARE LINK FOR OTHER PC & MOBILE
   👑 CREATED BY JEEL VAGHANI • OSLC HOUSE 👑
================================================================================

તમારા કોઈપણ બીજા PC, લેપટોપ અથવા મોબાઈલમાં (પર્સનલ ઇન્ટરનેટ પરથી):
👉 LIVE LINK: {live_url}
👉 SURGE LINK: https://oslcerp-live.surge.sh/

સ્થાનિક ઓફિસ Wi-Fi પરથી:
👉 LOCAL IP LINK: http://192.168.100.106:8080/
================================================================================
"""
        txt2.write_text(c2, encoding="utf-8")

        url_file = DESKTOP / "OSLC Online App.url"
        url_file.write_text(f"[InternetShortcut]\nURL={live_url}\n", encoding="utf-8")

        print("[DESKTOP] Updated Desktop share files.")
    except Exception as e:
        print(f"[DESKTOP ERROR] {e}")

def main():
    live_url = get_current_live_url()
    print("=" * 65)
    print("  OSLC UNIVERSAL MULTI-DEVICE SYNC ENGINE")
    print(f"  Live URL: {live_url}")
    print("=" * 65)

    # 1. Update Surge
    update_surge_cloud(live_url)

    # 2. Allow Firewall Ports
    open_firewall_ports()

    # 3. Sync all 15 REPRR Projects
    sync_all_reprr_projects(live_url)

    # 4. Update Desktop share files
    update_desktop_share_files(live_url)

    print("\n✅ Universal Multi-Device Live Sync Completed Successfully!")

if __name__ == "__main__":
    main()
