# -*- coding: utf-8 -*-
"""
OSLC Master File Organizer for PC-106
Creates 3 Master Folders on Desktop:
 1. 📱_BIJA_NA_PHONE_MATE  (Folder for other phones - organized by Project Name)
 2. 💻_BIJA_NA_PC_MATE     (Folder for other PCs - organized by Project Name)
 3. 🖥️_MARU_PC_106_MATE    (Folder for PC-106 - organized by Project Name)
"""
import os
import shutil
from pathlib import Path

DESKTOP = Path(r"C:\Users\PC-106\Desktop")
CLOUD_URL = "https://survivor-society-withdrawal-americas.trycloudflare.com"
LOCAL_IP = "http://192.168.100.106:8080"
PC106_LOCAL = "http://localhost:8080"

DIR_PHONE = DESKTOP / "📱_BIJA_NA_PHONE_MATE"
DIR_OTHER_PC = DESKTOP / "💻_BIJA_NA_PC_MATE"
DIR_MY_PC = DESKTOP / "🖥️_MARU_PC_106_MATE"

PROJECTS = [
    {
        "id": "master_hub",
        "name": "01 - OSLC Cloud Master Hub (તમામ ૭ પ્રોજેક્ટ્સ એકસાથે)",
        "subpath": "/",
        "desc": "તમામ ૭ મુખ્ય વેબ એપ્લિકેશન્સ, લાઇવ રિપોર્ટ્સ અને નવો પ્રોજેક્ટ પોર્ટલ એક સાથે.",
        "phone_apks": ["OSLC ALL PROJECTS MASTER HUB.exe"],
        "pc_files": ["OSLC ALL PROJECTS MASTER HUB.exe"],
        "my_files": ["!_CHALU_BATHU_PC_106.bat", "ALL_SOFTWARE_LIVE_CHECK.bat"],
    },
    {
        "id": "godaun",
        "name": "02 - OSLC In Out Report (ગોડાઉન મટીરીયલ અને કારીગર હિસાબ)",
        "subpath": "/godaun",
        "desc": "ગોડાઉન મટીરીયલ ઇનવર્ડ/આઉટવર્ડ, કારીગર મુજબ વર્ક હિસાબ અને સેલરી રિપોર્ટ.",
        "phone_apks": ["OSLC IN OUT REPORT.apk", "OSLC_IN_OUT_REPORT.apk"],
        "pc_files": ["OSLC IN OUT REPORT (PC).exe"],
        "my_files": ["START_OSLC_IN_OUT_REPORT.bat"],
    },
    {
        "id": "stock",
        "name": "03 - OSLC Stock Warehouse (લાઈવ સ્ટોક રિપોર્ટ)",
        "subpath": "/stock",
        "desc": "કુલ ફાઇનલ ગોડાઉન સ્ટોક, આઇટમ/શેલ્ફ મુજબ સર્ચિંગ, કટિંગ WIP અને એક્સેલ એક્સપોર્ટ.",
        "phone_apks": [],
        "pc_files": [],
        "my_files": [],
    },
    {
        "id": "alter",
        "name": "04 - OSLC Karigar Alter Report (અલ્ટર અને સ્ટીચિંગ રિપોર્ટ)",
        "subpath": "/alter",
        "desc": "કારીગર વાઇઝ અલ્ટર પર્સન્ટેજ, ફ્લોર મુજબ સરખામણી, સ્ટીચિંગ રીસીવ ઓડિટ.",
        "phone_apks": ["OSLC_ALTER_REPORT.apk"],
        "pc_files": ["OSLC_ALTER_REPORT_PC.exe"],
        "my_files": [],
    },
    {
        "id": "po",
        "name": "05 - PO & Cutting Dashboard (ઓર્ડર અને કટિંગ ડેશબોર્ડ)",
        "subpath": "/po",
        "desc": "પર્ચેઝ ઓર્ડર સ્ટેટસ, ડિસ્પેચ શિડ્યુલ, કટિંગ રિકન્સિલેશન અને WMS ઓર્ડર પ્રોસેસિંગ.",
        "phone_apks": ["PO_DASHBOARD_PHONE.apk", "OSLC_PO_Dashboard.apk"],
        "pc_files": ["PO_DASHBOARD_PC.exe"],
        "my_files": ["START_PO_DASHBOARD.bat"],
    },
    {
        "id": "gatepass",
        "name": "06 - Karigar Gate Pass System (કારીગર ગેટ પાસ)",
        "subpath": "/gatepass",
        "desc": "કારીગર ગેટ પાસ જનરેશન, ફોટો સાથે પ્રોફાઇલ સર્ચ, Sequential Int No પ્રિન્ટ.",
        "phone_apks": ["OSLC_GatePass.apk"],
        "pc_files": [],
        "my_files": [],
    },
    {
        "id": "mk",
        "name": "07 - MK Checking Report (કારીગર ચેકિંગ રિપોર્ટ)",
        "subpath": "/mk",
        "desc": "કારીગર ચેકિંગ એનાલિટિક્સ, સુપરવાઈઝર ઓડિટ, ફોટો વેરિફિકેશન અને ચેકર રિપોર્ટ.",
        "phone_apks": ["OSLC_CHEKING.apk"],
        "pc_files": [],
        "my_files": [],
    },
    {
        "id": "barcode",
        "name": "08 - Godaun Shelf Barcode (શેલ્ફ બારકોડ પ્રિન્ટ)",
        "subpath": "/barcode",
        "desc": "શેલ્ફ બારકોડ રેન્જ જનરેશન (AAA1, AAA2...), A4 પર ૨૦ બારકોડ લેઆઉટ અને પ્રિન્ટ.",
        "phone_apks": ["PO_BARCODE.apk", "OSLC_PO_BARCODE_GENERATOR.apk"],
        "pc_files": ["OSLC_Shelf_Barcode_Print.exe"],
        "my_files": [],
    },
    {
        "id": "erp",
        "name": "09 - OSLC ERP Full System (સંપૂર્ણ ફેક્ટરી ERP)",
        "subpath": "",
        "desc": "કટિંગ, સ્ટીચિંગ, થ્રેડ કટિંગ, માર્કિંગ, ગાજ, બટન અને ડન પ્રોસેસનું લાઈવ WIP.",
        "phone_apks": ["OSLC_ERP.apk", "OSLC_ERP_ICON_VALI_SHARE_APK.apk"],
        "pc_files": ["OSLC ERP.exe", "OSLC_ERP_PC.exe"],
        "my_files": [],
    },
    {
        "id": "house",
        "name": "10 - OSLC House Attendance (હાજરી અને ગોડાઉન)",
        "subpath": "",
        "desc": "કારીગર હાજરી, સેલરી સ્લિપ, ગોડાઉન અટેન્ડન્સ સિસ્ટમ.",
        "phone_apks": ["OSLC_HOUSE.apk", "Godown_Attendance.apk"],
        "pc_files": ["OSLC_HOUSE_PC.exe"],
        "my_files": [],
    },
    {
        "id": "lumora",
        "name": "11 - Lumora Barcode System (લુમોરા બારકોડ)",
        "subpath": "",
        "desc": "લુમોરા ઓટો બારકોડ ડ્રોપ & મેક, લેબલ જનરેટર.",
        "phone_apks": ["LUMORA_BARCODE.apk", "LUMORA_Barcode_Label_Generator.apk"],
        "pc_files": ["LUMORA_BARCODE_PC.exe"],
        "my_files": [],
    },
    {
        "id": "packing",
        "name": "12 - OSLC Packing Control & One Click Print",
        "subpath": "",
        "desc": "પેકિંગ કંટ્રોલ, પેક સ્ટેશન અને વન ક્લિક પાવર પિવોટ પ્રિન્ટ.",
        "phone_apks": ["OSLC_PACKING_CONTROL.apk", "ONE_CLICK.apk"],
        "pc_files": ["OSLC Packing Control.exe", "DIGI ONE CLICK PRINT.exe", "ONE CLICK.exe"],
        "my_files": [],
    },
    {
        "id": "photo_maker",
        "name": "13 - OSLC AI Photo & Video Maker",
        "subpath": "",
        "desc": "ઈ-કોમર્સ 4K એડ મેકર, વિડિઓ અને ફોટો ક્રિએશન ટૂલ.",
        "phone_apks": ["OSLC_PHOTO_MAKER.apk"],
        "pc_files": [],
        "my_files": [],
    },
    {
        "id": "blinkit",
        "name": "14 - Blinkit PO & Scanner System",
        "subpath": "",
        "desc": "બ્લિંકિટ પર્ચેઝ ઓર્ડર અને ડિજી પોર્ટલ સ્કેનર એપ્સ.",
        "phone_apks": ["Blinkit_PO_Digi_Portal.apk", "Blinkit_Scanner.apk"],
        "pc_files": [],
        "my_files": [],
    }
]

def make_url_file(path: Path, url: str):
    path.write_text(f"[InternetShortcut]\nURL={url}\nIconIndex=0\n", encoding="utf-8")

def make_html_card(path: Path, title: str, cloud_url: str, local_url: str, desc: str, target: str):
    html = f"""<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
    body {{ background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }}
    .card {{ background: #1e293b; border: 1px solid #334155; border-radius: 20px; max-width: 480px; width: 100%; padding: 28px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
    h1 {{ font-size: 20px; margin-bottom: 8px; color: #38bdf8; }}
    p {{ color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }}
    .btn {{ display: block; text-decoration: none; padding: 14px 20px; border-radius: 12px; font-weight: 700; font-size: 15px; margin-bottom: 12px; transition: transform 0.2s; }}
    .btn:active {{ transform: scale(0.98); }}
    .btn-cloud {{ background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff; }}
    .btn-wifi {{ background: linear-gradient(135deg, #10b981, #059669); color: #fff; }}
    .info {{ font-size: 12px; color: #64748b; margin-top: 16px; border-top: 1px solid #334155; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 40px; margin-bottom: 12px;">🏭</div>
    <h1>{title}</h1>
    <p>{desc}</p>
    <a href="{cloud_url}" class="btn btn-cloud">🌐 ગમે ત્યાંથી ખોલો (4G/5G પર્સનલ નેટ)</a>
    <a href="{local_url}" class="btn btn-wifi">📶 ઓફિસ Wi-Fi પરથી ખોલો</a>
    <div class="info">
      📱 <strong>મોબાઈલમાં:</strong> Chrome માં ખોલીને 'Add to Home screen' કરશો એટલે પ્લે સ્ટોર જેવો આઈકન બની જશે!<br>
      ⚡ <strong>નવા અપડેટ્સ:</strong> કોઈપણ ફાઈલ ફરી ઇન્સ્ટોલ કર્યા વગર પેજ રિફ્રેશ કરતા જ નવો ડેટા આવી જશે.
    </div>
  </div>
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")

def main():
    print("=" * 65)
    print("  CREATING 3 PLATFORM-SPECIFIC FOLDERS ON PC-106 DESKTOP")
    print("=" * 65)

    DIR_PHONE.mkdir(parents=True, exist_ok=True)
    DIR_OTHER_PC.mkdir(parents=True, exist_ok=True)
    DIR_MY_PC.mkdir(parents=True, exist_ok=True)

    for p in PROJECTS:
        p_name = p["name"]
        sub = p["subpath"]
        desc = p["desc"]

        c_url = f"{CLOUD_URL}{sub}" if sub else CLOUD_URL
        l_url = f"{LOCAL_IP}{sub}" if sub else LOCAL_IP
        m_url = f"{PC106_LOCAL}{sub}" if sub else PC106_LOCAL

        # ---------------- 1. PHONE FOLDER ----------------
        folder_phone = DIR_PHONE / p_name
        folder_phone.mkdir(parents=True, exist_ok=True)

        # Place APKs
        found_apk = False
        for apk_name in p["phone_apks"]:
            src = DESKTOP / apk_name
            if src.exists():
                dst = folder_phone / apk_name
                if not dst.exists():
                    shutil.copy2(src, dst)
                found_apk = True

        # Place Open on Phone Link & HTML
        make_url_file(folder_phone / "📱_PHONE_MA_KHOLO_ONLINE.url", c_url)
        make_html_card(folder_phone / "📱_OPEN_ON_PHONE.html", p_name, c_url, l_url, desc, "phone")

        guide_phone = f"""========================================================================================
   {p_name} - મોબાઈલ ફોનમાં વાપરવાની સરળ રીત
========================================================================================

✅ રીત ૧: સીધી લિંકથી વાપરવા માટે (સૌથી શ્રેષ્ઠ અને ફાસ્ટ):
👉 4G / 5G પર્સનલ નેટ માટે: {c_url}
👉 ઓફિસ Wi-Fi પર હોય તો: {l_url}

💡 ટીપ: આ લિંક Chrome બ્રાઉઝરમાં ખોલીને જમણી બાજુ ૩ ટપકાં (Three Dots) પર ક્લિક કરીને
       'Add to Home screen' (હોમ સ્ક્રીન પર ઉમેરો) કરી લેશો એટલે Play Store જેવો આઈકન બની જશે!
       ભવિષ્યમાં જ્યારે પણ PC-106 માં અપડેટ આવશે ત્યારે માત્ર રિફ્રેશ કરતા જ તરત બધું નવું આવી જશે!

✅ રીત ૨: જો એન્ડ્રોઈડ APK ઇન્સ્ટોલ કરવી હોય:
👉 આ જ ફોલ્ડરમાં રહેલી .apk ફાઈલ WhatsApp થી ફોનમાં મોકલીને ઇન્સ્ટોલ કરી શકાય છે.
========================================================================================
"""
        (folder_phone / "PHONE_MA_CHALAVVA_NI_REED.txt").write_text(guide_phone, encoding="utf-8")

        # ---------------- 2. OTHER PC FOLDER ----------------
        folder_pc = DIR_OTHER_PC / p_name
        folder_pc.mkdir(parents=True, exist_ok=True)

        for pc_file in p["pc_files"]:
            src = DESKTOP / pc_file
            if src.exists():
                dst = folder_pc / pc_file
                if not dst.exists():
                    shutil.copy2(src, dst)

        make_url_file(folder_pc / "💻_BIJA_PC_MA_KHOLO_ONLINE.url", c_url)
        make_url_file(folder_pc / "💻_OFFICE_WIFI_PAR_KHOLO.url", l_url)
        make_html_card(folder_pc / "💻_OPEN_ON_PC.html", p_name, c_url, l_url, desc, "pc")

        guide_pc = f"""========================================================================================
   {p_name} - બીજા PC / લેપટોપમાં વાપરવાની ગાઈડ
========================================================================================

👉 ઓફિસ Wi-Fi કે લેન નેટવર્ક પર:
   {l_url}

👉 ઘરના નેટ કે બહારના પર્સનલ નેટ પર:
   {c_url}

💡 જો આ પ્રોજેક્ટની .exe ફાઈલ આ ફોલ્ડરમાં હોય, તો તેને ડાયરેક્ટ ચલાવી શકો છો.
   અથવા બ્રાઉઝરમાં ઉપરની લિંક ખોલીને પણ પૂરેપૂરો રિપોર્ટ લાઈવ વાપરી શકાય છે.
========================================================================================
"""
        (folder_pc / "BIJA_PC_MA_CHALAVVA_NI_REED.txt").write_text(guide_pc, encoding="utf-8")

        # ---------------- 3. MARU PC-106 FOLDER ----------------
        folder_my = DIR_MY_PC / p_name
        folder_my.mkdir(parents=True, exist_ok=True)

        make_url_file(folder_my / "🖥️_LOCAL_PC106_0_SECOND.url", m_url)
        make_url_file(folder_my / "🌐_CLOUD_LIVE_CHECK.url", c_url)

        for mf in p["my_files"]:
            src = DESKTOP / mf
            if src.exists():
                dst = folder_my / mf
                if not dst.exists():
                    shutil.copy2(src, dst)

        guide_my = f"""========================================================================================
   {p_name} - તમારા પોતાના PC-106 માટે
========================================================================================

👉 તમારા PC-106 માં 0 સેકન્ડમાં ખોલવા માટે:
   '🖥️_LOCAL_PC106_0_SECOND.url' પર ડબલ ક્લિક કરો!

👉 બહાર લાઈવ છે કે નહીં તે ચેક કરવા માટે:
   '🌐_CLOUD_LIVE_CHECK.url' ખોલો!

⚡ તમે આ પ્રોજેક્ટમાં જે પણ બદલાવ કરશો, તે ઓટો-સિન્ક દ્વારા બીજા બધાના ફોન અને PC માં
   ડાયરેક્ટ દેખાશે!
========================================================================================
"""
        (folder_my / "PC_106_CONTROL_GUIDE.txt").write_text(guide_my, encoding="utf-8")

    # Master summaries in root of each folder
    (DIR_PHONE / "📱_TAMAM_PROJECTS_PHONE_LIST.txt").write_text(
        "આ ફોલ્ડરમાં તમારા તમામ ૧૪ પ્રોજેક્ટ્સ બીજાના ફોનમાં ચલાવવા માટે પ્રોજેક્ટ વાઇઝ ફોલ્ડર પાડીને મુકેલા છે.\nદરેક ફોલ્ડરમાં તેની APK, લાઈવ લિંક અને ગુજરાતી ગાઈડ છે.",
        encoding="utf-8"
    )
    (DIR_OTHER_PC / "💻_TAMAM_PROJECTS_BIJA_PC_LIST.txt").write_text(
        "આ ફોલ્ડરમાં તમારા તમામ ૧૪ પ્રોજેક્ટ્સ બીજા PC માં ચલાવવા માટે પ્રોજેક્ટ વાઇઝ ફોલ્ડર પાડીને મુકેલા છે.\nદરેક ફોલ્ડરમાં તેની EXE, Wi-Fi લિંક, ક્લાઉડ લિંક અને ગાઈડ છે.",
        encoding="utf-8"
    )
    (DIR_MY_PC / "🖥️_TAMAM_PROJECTS_PC106_LIST.txt").write_text(
        "આ ફોલ્ડરમાં તમારા પોતાના PC-106 ના ૧૪ એ ૧૪ પ્રોજેક્ટ્સના લોકલ 0 સેકન્ડ શોર્ટકટ્સ અને કંટ્રોલ છે.",
        encoding="utf-8"
    )

    print("\n[SUCCESS] All 3 Master Folders successfully populated on Desktop!")
    print(f" 1. {DIR_PHONE}")
    print(f" 2. {DIR_OTHER_PC}")
    print(f" 3. {DIR_MY_PC}")

if __name__ == "__main__":
    main()
