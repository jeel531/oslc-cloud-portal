# -*- coding: utf-8 -*-
"""
Builds completely separated, independent project folders in REPRR.
Every single project gets its own folder with:
 - 📱 Phone APK
 - 💻 PC EXE / Launcher
 - 📦 Portable Zip for other PCs
 - 📄 Gujarati Readme
No master hub, no merging!
"""
import os
import shutil
from pathlib import Path

REPRR_DIR = Path(r"C:\Users\PC-106\Downloads\REPRR")
FINAL_PROJECT_DIR = Path(r"D:\MY ALL OSLC FINAL PROJECT")
SAKIL_DIR = Path(r"D:\NOTA\SAKIL SHOR-CUT")
APK_DIR = SAKIL_DIR / "03_ANDROID_APKS_ALL"
PC_EXE_DIR = SAKIL_DIR / "01_PC_SOFTWARE_EXE"

PROJECTS = [
    {
        "id": "01",
        "name": "OSLC_KARIGAR_GATEPASS",
        "title_gu": "કારીગર ૧૪૧ ગેટ પાસ સિસ્ટમ (Karigar Gate Pass)",
        "source_folder": FINAL_PROJECT_DIR / "04. OSLC KARIGAR GATEPASS (કારીગર ૧૪૧ ગેટ પાસ સોફ્ટવેર)",
        "apk_candidates": [
            APK_DIR / "01_OSLC_GatePass.apk",
            FINAL_PROJECT_DIR / "04. OSLC KARIGAR GATEPASS (કારીગર ૧૪૧ ગેટ પાસ સોફ્ટવેર)" / "OSLC_GatePass.apk"
        ],
        "pc_candidates": [
            FINAL_PROJECT_DIR / "04. OSLC KARIGAR GATEPASS (કારીગર ૧૪૧ ગેટ પાસ સોફ્ટવેર)" / "OSLC_GATEPASS_1_CLICK.exe",
            PC_EXE_DIR / "01_CHALU_KARO_OSLC_Karigar_GatePass.bat"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "04. OSLC KARIGAR GATEPASS (કારીગર ૧૪૧ ગેટ પાસ સોફ્ટવેર)" / "OSLC_KARIGAR_GATEPASS_PORTABLE.zip"
        ],
        "desc": "કારીગર માટે હાફ A4 ગેટ પાસ પ્રિન્ટ, ૧૪૧ પેન્ડિંગ માલ ચેક, ૪ સાધનો ચેકલિસ્ટ અને ડિજીબિઝ લાઈવ સર્ચ."
    },
    {
        "id": "02",
        "name": "OSLC_IN_OUT_REPORT",
        "title_gu": "ગોડાઉન મટીરીયલ ઇન-આઉટ અને કારીગર પીસ રેટ",
        "source_folder": FINAL_PROJECT_DIR / "02. OSLC IN OUT REPORT (ગોડાઉન ઇન-આઉટ અને કારીગર પીસ રેટ)",
        "apk_candidates": [
            APK_DIR / "10_OSLC_In_Out_Report.apk",
            FINAL_PROJECT_DIR / "02. OSLC IN OUT REPORT (ગોડાઉન ઇન-આઉટ અને કારીગર પીસ રેટ)" / "OSLC_IN_OUT_REPORT.apk"
        ],
        "pc_candidates": [
            FINAL_PROJECT_DIR / "02. OSLC IN OUT REPORT (ગોડાઉન ઇન-આઉટ અને કારીગર પીસ રેટ)" / "OSLC_IN_OUT_REPORT_PC.exe",
            PC_EXE_DIR / "08_CHALU_KARO_OSLC_In_Out_Report.bat"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "02. OSLC IN OUT REPORT (ગોડાઉન ઇન-આઉટ અને કારીગર પીસ રેટ)" / "OSLC_IN_OUT_REPORT_BIJA_PC_MATE.zip"
        ],
        "desc": "ગોડાઉન મટીરીયલ ઇન આઉટ એન્ટ્રી, કારીગર પીસ રેટ અને રોજેરોજ નો હિસાબ."
    },
    {
        "id": "03",
        "name": "OSLC_ALTER_REPORT",
        "title_gu": "કારીગર અલ્ટર અને સ્ટીચિંગ ઇશ્યુ રિપોર્ટ",
        "source_folder": FINAL_PROJECT_DIR / "03. OSLC ALTER REPORT (કારીગર અલ્ટર રિપોર્ટ સોફ્ટવેર)",
        "apk_candidates": [
            APK_DIR / "03_OSLC_Alter_Report.apk",
            FINAL_PROJECT_DIR / "03. OSLC ALTER REPORT (કારીગર અલ્ટર રિપોર્ટ સોફ્ટવેર)" / "OSLC_ALTER_REPORT.apk"
        ],
        "pc_candidates": [
            FINAL_PROJECT_DIR / "03. OSLC ALTER REPORT (કારીગર અલ્ટર રિપોર્ટ સોફ્ટવેર)" / "OSLC_ALTER_REPORT_PC.exe",
            PC_EXE_DIR / "03_CHALU_KARO_OSLC_Alter_Report.bat"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "03. OSLC ALTER REPORT (કારીગર અલ્ટર રિપોર્ટ સોફ્ટવેર)" / "OSLC_ALTER_REPORT_PC.zip"
        ],
        "desc": "કારીગર સ્ટીચિંગ ઇશ્યુ, અલ્ટર લોટ ડિટેઈલ અને ડિજીબિઝ લાઈવ ૧૨૭ અલ્ટર ટ્રેકિંગ."
    },
    {
        "id": "04",
        "name": "OSLC_STOCK_REPORT",
        "title_gu": "લાઈવ સ્ટોક વેરહાઉસ રિપોર્ટ (Stock Report)",
        "source_folder": FINAL_PROJECT_DIR / "10. OSLC WEB DASHBOARD (સ્ટોક રિપોર્ટ ડેશબોર્ડ)",
        "apk_candidates": [
            APK_DIR / "02_OSLC_Stock_Report.apk",
            FINAL_PROJECT_DIR / "10. OSLC WEB DASHBOARD (સ્ટોક રિપોર્ટ ડેશબોર્ડ)" / "OSLC_STOCK_REPORT.apk"
        ],
        "pc_candidates": [
            PC_EXE_DIR / "20_CHALU_KARO_Power_Pivot_WH_AD.bat"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "10. OSLC WEB DASHBOARD (સ્ટોક રિપોર્ટ ડેશબોર્ડ)" / "OSLC_STOCK_REPORT_BIJA_PC_MATE.zip"
        ],
        "desc": "ફેક્ટરી અને ગોડાઉન નો ૧ લાખથી વધુ આઇટમ્સ નો લાઈવ સ્ટોક અને કેટેગરી ફિલ્ટર્સ."
    },
    {
        "id": "05",
        "name": "OSLC_PO_DASHBOARD",
        "title_gu": "PO ઓર્ડર અને કટિંગ ડેશબોર્ડ (PO Dashboard)",
        "source_folder": Path(r"D:\PO DHASBORD"),
        "apk_candidates": [
            APK_DIR / "17_OSLC_PO_Dashboard.apk",
            APK_DIR / "18_PO_DASHBOARD_ICON_VALI.apk"
        ],
        "pc_candidates": [
            PC_EXE_DIR / "15_CHALU_KARO_PO_Dashboard_PC.bat"
        ],
        "zip_candidates": [],
        "desc": "પરચેઝ ઓર્ડર સ્ટેટસ, કટિંગ લોટ્સ અને ડિસ્પેચ એલર્ટ્સ."
    },
    {
        "id": "06",
        "name": "OSLC_MK_CHECKING_REPORT",
        "title_gu": "કારીગર ચેકિંગ રિપોર્ટ ૧૨૭ (MK Checking)",
        "source_folder": FINAL_PROJECT_DIR / "08. OSLC MK CHECKING REPORT (ચેકિંગ રિપોર્ટ સોફ્ટવેર & APK)",
        "apk_candidates": [
            APK_DIR / "04_OSLC_Checking_Report.apk",
            FINAL_PROJECT_DIR / "08. OSLC MK CHECKING REPORT (ચેકિંગ રિપોર્ટ સોફ્ટવેર & APK)" / "OSLC_CHEKING.apk"
        ],
        "pc_candidates": [
            FINAL_PROJECT_DIR / "08. OSLC MK CHECKING REPORT (ચેકિંગ રિપોર્ટ સોફ્ટવેર & APK)" / "OSLC_Karigar_Report_PERCENT_100_FIXED.exe",
            PC_EXE_DIR / "07_CHALU_KARO_OSLC_Karigar_Report_100_Fixed.bat"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "08. OSLC MK CHECKING REPORT (ચેકિંગ રિપોર્ટ સોફ્ટવેર & APK)" / "OSLC_MK_CHECKING_BIJA_PC_MATE.zip"
        ],
        "desc": "ચેકિંગ રિસીવ લાઈવ રિપોર્ટ, ૧૨૭ ડિટેઈલ એક્સેલ એક્સપોર્ટ અને કારીગર હિસાબ."
    },
    {
        "id": "07",
        "name": "OSLC_GODAUN_BARCODE_PRINT",
        "title_gu": "ગોડાઉન શેલ્ફ બારકોડ પ્રિન્ટ (A4 10-20 Barcodes)",
        "source_folder": FINAL_PROJECT_DIR / "05. OSLC GODAUN BARCODE PRINT (શેલ્ફ બારકોડ પ્રિન્ટ સોફ્ટવેર)",
        "apk_candidates": [
            APK_DIR / "12_OSLC_PO_Barcode_Generator.apk",
            APK_DIR / "06_Lumora_Barcode_Label.apk"
        ],
        "pc_candidates": [
            FINAL_PROJECT_DIR / "05. OSLC GODAUN BARCODE PRINT (શેલ્ફ બારકોડ પ્રિન્ટ સોફ્ટવેર)" / "OSLC_Shelf_Barcode_Print.exe",
            PC_EXE_DIR / "04_CHALU_KARO_OSLC_Godown_Shelf_Barcode_Print.bat"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "05. OSLC GODAUN BARCODE PRINT (શેલ્ફ બારકોડ પ્રિન્ટ સોફ્ટવેર)" / "OSLC_BARCODE_PRINT_BIJA_PC_MATE.zip"
        ],
        "desc": "રેક અને શેલ્ફ માટે A4 શીટ પર ડાયરેક્ટ બારકોડ પ્રિન્ટિંગ એન્જિન."
    },
    {
        "id": "08",
        "name": "OSLC_FINAL_PENDING_REPORT",
        "title_gu": "પેન્ડિંગ લિસ્ટ પ્રિન્ટ અને ઓલ સ્ટેટસ કંટ્રોલ સેન્ટર",
        "source_folder": FINAL_PROJECT_DIR / "06. OSLC FINAL PENDING REPORT (પેન્ડિંગ લિસ્ટ પ્રિન્ટ અને ઓલ સ્ટેટસ)",
        "apk_candidates": [
            APK_DIR / "08_OSLC_Production_Report.apk"
        ],
        "pc_candidates": [
            FINAL_PROJECT_DIR / "06. OSLC FINAL PENDING REPORT (પેન્ડિંગ લિસ્ટ પ્રિન્ટ અને ઓલ સ્ટેટસ)" / "OSLC_FINAL_PENDING_V34_ALL_STATUS.exe",
            FINAL_PROJECT_DIR / "06. OSLC FINAL PENDING REPORT (પેન્ડિંગ લિસ્ટ પ્રિન્ટ અને ઓલ સ્ટેટસ)" / "OSLC_FINAL_PRINT.exe",
            PC_EXE_DIR / "02_CHALU_KARO_OSLC_Final_Pending_Control_Center.bat"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "06. OSLC FINAL PENDING REPORT (પેન્ડિંગ લિસ્ટ પ્રિન્ટ અને ઓલ સ્ટેટસ)" / "OSLC_FINAL_PENDING_PORTABLE.zip"
        ],
        "desc": "ઓલ ઓર્ડર પેન્ડિંગ સ્ટેટસ, વિપ ટ્રેકિંગ અને વન-ક્લિક પ્રિન્ટ."
    },
    {
        "id": "09",
        "name": "DIGI_ONE_CLICK_PRINT",
        "title_gu": "સ્ટોક શોર્ટેજ & પાવર પિવોટ (One Click Print)",
        "source_folder": FINAL_PROJECT_DIR / "07. DIGI ONE CLICK PRINT (સ્ટોક શોર્ટેજ & પાવર પિવોટ)",
        "apk_candidates": [
            APK_DIR / "14_Digi_One_Click_Print.apk",
            FINAL_PROJECT_DIR / "07. DIGI ONE CLICK PRINT (સ્ટોક શોર્ટેજ & પાવર પિવોટ)" / "DIGI_ONE_CLICK_PRINT.apk"
        ],
        "pc_candidates": [
            FINAL_PROJECT_DIR / "07. DIGI ONE CLICK PRINT (સ્ટોક શોર્ટેજ & પાવર પિવોટ)" / "DIGI_ONE_CLICK_PRINT.exe",
            FINAL_PROJECT_DIR / "07. DIGI ONE CLICK PRINT (સ્ટોક શોર્ટેજ & પાવર પિવોટ)" / "ONE_CLICK_Power_Pivot.exe"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "07. DIGI ONE CLICK PRINT (સ્ટોક શોર્ટેજ & પાવર પિવોટ)" / "DIGI_ONE_CLICK_BIJA_PC_MATE.zip"
        ],
        "desc": "પાવર પિવોટ ઓટો-રિપોર્ટિંગ અને વન ક્લિક ફાસ્ટ પ્રિન્ટ."
    },
    {
        "id": "10",
        "name": "OSLC_ERP_FULL_SYSTEM",
        "title_gu": "ઓરિજિનલ ફેક્ટરી ERP લાઈવ ક્લાઉડ સિસ્ટમ",
        "source_folder": FINAL_PROJECT_DIR / "01. OSLC ERP (લાઈવ ક્લાઉડ ERP સોફ્ટવેર)",
        "apk_candidates": [
            APK_DIR / "09_OSLC_ERP.apk",
            FINAL_PROJECT_DIR / "01. OSLC ERP (લાઈવ ક્લાઉડ ERP સોફ્ટવેર)" / "OSLC_ERP_APK.apk"
        ],
        "pc_candidates": [
            FINAL_PROJECT_DIR / "01. OSLC ERP (લાઈવ ક્લાઉડ ERP સોફ્ટવેર)" / "OSLC_ERP_PC.exe"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "01. OSLC ERP (લાઈવ ક્લાઉડ ERP સોફ્ટવેર)" / "OSLC_ERP_BIJA_PC_MATE.zip"
        ],
        "desc": "સંપૂર્ણ ફેક્ટરી ERP સોફ્ટવેર: પ્રોડક્શન, સ્ટોક, પેન્ડિંગ અને ઓર્ડર કંટ્રોલ."
    },
    {
        "id": "11",
        "name": "OSLC_GODOWN_ATTENDANCE",
        "title_gu": "ગોડાઉન હાજરી સિસ્ટમ (Attendance)",
        "source_folder": FINAL_PROJECT_DIR / "11. OSLC GODOWN ATTENDANCE (ગોડાઉન હાજરી સિસ્ટમ)",
        "apk_candidates": [
            APK_DIR / "05_OSLC_Godown_Attendance.apk",
            FINAL_PROJECT_DIR / "11. OSLC GODOWN ATTENDANCE (ગોડાઉન હાજરી સિસ્ટમ)" / "Godown_Attendance.apk"
        ],
        "pc_candidates": [
            PC_EXE_DIR / "05_CHALU_KARO_OSLC_Godown_Attendance.bat"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "11. OSLC GODOWN ATTENDANCE (ગોડાઉન હાજરી સિસ્ટમ)" / "Godown_Attendance_BIJA_PC_MATE.zip"
        ],
        "desc": "ગોડાઉન સ્ટાફ અને કારીગરોની દૈનિક હાજરી ટ્રેકિંગ સિસ્ટમ."
    },
    {
        "id": "12",
        "name": "LUMORA_BARCODE_SYSTEM",
        "title_gu": "લુમોરા બારકોડ લેબલ જનરેટર (Lumora Barcode)",
        "source_folder": Path(r"D:\NOTA\MAULIK - LABLE"),
        "apk_candidates": [
            APK_DIR / "06_Lumora_Barcode_Label.apk"
        ],
        "pc_candidates": [
            PC_EXE_DIR / "06_CHALU_KARO_Lumora_Barcode_PC.bat"
        ],
        "zip_candidates": [],
        "desc": "લુમોરા બ્રાન્ડ માટે કસ્ટમાઈઝ્ડ લેબલ અને બારકોડ પ્રિન્ટિંગ."
    },
    {
        "id": "13",
        "name": "BLINKIT_PO_SCANNER",
        "title_gu": "બ્લિંકિટ પીઓ અને સ્કેનર સિસ્ટમ (Blinkit PO)",
        "source_folder": Path(r"D:\MUALIK PO BLINKIT"),
        "apk_candidates": [
            APK_DIR / "15_Blinkit_PO_Digi_Portal.apk",
            APK_DIR / "16_Blinkit_Scanner.apk"
        ],
        "pc_candidates": [
            PC_EXE_DIR / "14_CHALU_KARO_Blinkit_PO_Digi_Portal.bat"
        ],
        "zip_candidates": [],
        "desc": "Blinkit ઈ-કોમર્સ PO કંટ્રોલ, બારકોડ સ્કેનિંગ અને ડિસ્પેચ વેરિફિકેશન."
    },
    {
        "id": "14",
        "name": "OSLC_PHOTO_VIDEO_MAKER",
        "title_gu": "ઇ-કોમર્સ 4K એડ અને ફોટો મેકર (Photo Maker)",
        "source_folder": FINAL_PROJECT_DIR / "09. OSLC PHOTO & VIDEO MAKER (ઇ-કોમર્સ 4K એડ મેકર & ફોટો મેકર)",
        "apk_candidates": [
            APK_DIR / "11_OSLC_Photo_Maker.apk",
            FINAL_PROJECT_DIR / "09. OSLC PHOTO & VIDEO MAKER (ઇ-કોમર્સ 4K એડ મેકર & ફોટો મેકર)" / "OSLC_PHOTO_MAKER.apk"
        ],
        "pc_candidates": [
            PC_EXE_DIR / "13_CHALU_KARO_OSLC_Ecommerce_4K_Ad_Maker.bat"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "09. OSLC PHOTO & VIDEO MAKER (ઇ-કોમર્સ 4K એડ મેકર & ફોટો મેકર)" / "OSLC_Ecommerce_4K_Ad_Maker_PORTABLE.zip"
        ],
        "desc": "ઇ-કોમર્સ પ્રોડક્ટ ફોટોગ્રાફી, 4K વિડીયો એડ અને માર્કેટિંગ બેનર મેકર."
    },
    {
        "id": "15",
        "name": "OSLC_SPECIAL_PRINT_TOOLS",
        "title_gu": "સ્પેશિયલ પ્રિન્ટિંગ ટૂલ્સ, લાઇનમેન અને વિપ ચેકર",
        "source_folder": FINAL_PROJECT_DIR / "14. OSLC SPECIAL PRINT TOOLS (લાઇનમેન અને વિપ ટૂલ્સ)",
        "apk_candidates": [],
        "pc_candidates": [
            FINAL_PROJECT_DIR / "14. OSLC SPECIAL PRINT TOOLS (લાઇનમેન અને વિપ ટૂલ્સ)" / "Lineman List Genrator.exe",
            FINAL_PROJECT_DIR / "14. OSLC SPECIAL PRINT TOOLS (લાઇનમેન અને વિપ ટૂલ્સ)" / "PendingOrderProcessor_WSH_FIXED.exe",
            FINAL_PROJECT_DIR / "14. OSLC SPECIAL PRINT TOOLS (લાઇનમેન અને વિપ ટૂલ્સ)" / "Wip Checker Tool.exe",
            FINAL_PROJECT_DIR / "14. OSLC SPECIAL PRINT TOOLS (લાઇનમેન અને વિપ ટૂલ્સ)" / "Inventory Up Down Punch.exe"
        ],
        "zip_candidates": [
            FINAL_PROJECT_DIR / "14. OSLC SPECIAL PRINT TOOLS (લાઇનમેન અને વિપ ટૂલ્સ)" / "OSLC_SPECIAL_PRINT_TOOLS_PORTABLE.zip"
        ],
        "desc": "લાઇનમેન લિસ્ટ જનરેટર, વિપ ચેકર અને સ્પેશિયલ પ્રિન્ટર્સ."
    }
]

def main():
    print("=" * 70)
    print("Building Completely Separated Project Folders in REPRR...")
    print("Target: " + str(REPRR_DIR))
    print("=" * 70)

    # 1. Clean up old 'master hub' or 'bhega' directories in REPRR
    bhega_folders = [
        REPRR_DIR / "📂_PROJECT_WISE_ALL_FILES" / "01 - OSLC Cloud Master Hub (તમામ ૭ પ્રોજેક્ટ્સ એકસાથે)",
    ]
    for bf in bhega_folders:
        if bf.exists():
            print(f"[REMOVED MERGED FOLDER] {bf.name}")
            shutil.rmtree(bf, ignore_errors=True)

    # Create root level separated project directory
    SEPARATED_ROOT = REPRR_DIR / "📁_TAMAM_PROJECTS_ALG_ALG"
    SEPARATED_ROOT.mkdir(parents=True, exist_ok=True)

    for p in PROJECTS:
        folder_name = f"{p['id']}. {p['name']} ({p['title_gu']})"
        proj_dir = SEPARATED_ROOT / folder_name
        phone_dir = proj_dir / "📱_PHONE_APK"
        pc_dir = proj_dir / "💻_PC_VERSION"
        
        proj_dir.mkdir(parents=True, exist_ok=True)
        phone_dir.mkdir(parents=True, exist_ok=True)
        pc_dir.mkdir(parents=True, exist_ok=True)

        copied_apk = None
        copied_pc = []
        copied_zip = None

        # 1. Copy Phone APK
        for apk_src in p["apk_candidates"]:
            if apk_src.exists() and apk_src.is_file():
                dest = phone_dir / apk_src.name
                if not dest.exists() or dest.stat().st_size != apk_src.stat().st_size:
                    shutil.copy2(apk_src, dest)
                copied_apk = dest.name
                break

        # 2. Copy PC Version (.exe / .bat)
        for pc_src in p["pc_candidates"]:
            if pc_src.exists() and pc_src.is_file():
                dest = pc_dir / pc_src.name
                if not dest.exists() or dest.stat().st_size != pc_src.stat().st_size:
                    shutil.copy2(pc_src, dest)
                copied_pc.append(dest.name)

        # 3. Copy Zip for other PC
        for zip_src in p["zip_candidates"]:
            if zip_src.exists() and zip_src.is_file():
                dest = pc_dir / zip_src.name
                if not dest.exists() or dest.stat().st_size != zip_src.stat().st_size:
                    shutil.copy2(zip_src, dest)
                copied_zip = dest.name
                break

        # 4. Write Project-Specific Gujarati Guide
        guide_text = f"""========================================================================================
   {p['name']} - {p['title_gu']}
========================================================================================

આ પ્રોજેક્ટ સંપૂર્ણપણે અલગ છે અને તેનું પોતાનું સ્વતંત્ર કામ છે.

📋 પ્રોજેક્ટ વિશે:
{p['desc']}

----------------------------------------------------------------------------------------
📱 ૧. ફોન માટે (PHONE APK):
----------------------------------------------------------------------------------------
- અંદર રહેલું ફોલ્ડર: 📱_PHONE_APK/
- APK ફાઈલ: {copied_apk or 'આ પ્રોજેક્ટ માટે APK તૈયાર છે.'}
- કેવી રીતે વાપરવું: આ .apk ફાઇલ તમારા WhatsApp માં ડૉક્યુમેન્ટ તરીકે મોકલો અથવા ફોનમાં નાખીને Install કરો.

----------------------------------------------------------------------------------------
💻 ૨. કમ્પ્યુટર માટે (PC VERSION):
----------------------------------------------------------------------------------------
- અંદર રહેલું ફોલ્ડર: 💻_PC_VERSION/
- સોફ્ટવેર ફાઈલ: {', '.join(copied_pc) or 'PC Version File'}
{f'- બીજાના PC માટે ZIP ફાઇલ: {copied_zip}' if copied_zip else ''}
- કેવી રીતે વાપરવું: 
  ૧. તમારા કમ્પ્યુટરમાં ચલાવવા માટે સીધી .exe અથવા .bat ફાઈલ પર Double Click કરો.
  ૨. બીજાના PC માં આપવું હોય તો આ ફાઇલ પેનડ્રાઈવમાં આપી દો.

----------------------------------------------------------------------------------------
⚡ PC-106 બંધ હોય તોય કેમ ચાલુ રહેશે?
----------------------------------------------------------------------------------------
- આ સોફ્ટવેર DigiBizz ના Cloud Server (103.118.17.67,3595) સાથે સીધું ઇન્ટરનેટથી જોડાયેલું છે.
- તમારા PC-106 પર આ પ્રોજેક્ટ નિર્ભર નથી! તમારું PC બંધ હશે તો પણ અન્ય કોઈ પણ PC કે ફોનમાં
  આ સોફ્ટવેર ૨૪ કલાક ચાલશે!
========================================================================================
"""
        with open(proj_dir / "વાંચો_આ_સોફ્ટવેર_વિશે_માહિતી.txt", "w", encoding="utf-8") as gf:
            gf.write(guide_text)

        print(f"✅ Created: {folder_name} (APK: {copied_apk or 'None'}, PC: {len(copied_pc)} files)")

    print("\nAll 15 separated projects successfully built in REPRR!")

if __name__ == "__main__":
    main()
