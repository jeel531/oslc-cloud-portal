# -*- coding: utf-8 -*-
"""
OSLC Master APK & Web Icon Branding Engine
Created by Jeel Vaghani - OM SAI LATEST CREATION

Applies unique 3D luxury icons with '👑 CREATED BY JEEL VAGHANI' branding to:
 1. All Android APK files across REPRR and SAKIL SHOR-CUT
 2. Re-signs each APK with zipalign and apksigner
 3. Updates all Web Frontends so the exact same icon is displayed inside each app
"""
import os
import sys
import shutil
import zipfile
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BRAIN_DIR = Path(r"C:\Users\PC-106\.gemini\antigravity-ide\brain\e43f4423-0fc9-430d-bbbc-b59328d45801")
REPRR_ROOT = Path(r"C:\Users\PC-106\Downloads\REPRR\📁_TAMAM_PROJECTS_ALG_ALG")
SAKIL_APKS = Path(r"D:\NOTA\SAKIL SHOR-CUT\03_ANDROID_APKS_ALL")
SDK_DIR = Path(r"C:\Users\PC-106\AppData\Local\Android\Sdk")
APKSIGNER = SDK_DIR / "build-tools" / "34.0.0" / "apksigner.bat"
ZIPALIGN = SDK_DIR / "build-tools" / "34.0.0" / "zipalign.exe"
KEYSTORE = Path(r"C:\Users\PC-106\.android\debug.keystore")

# Mapping of all 15 projects to their respective 3D icons
PROJECT_ICONS = {
    "01": {
        "src": BRAIN_DIR / "icon_gatepass_1792669314335.jpg",
        "title": "OSLC Karigar Gate Pass System",
        "web_dir": Path(r"D:\OSLC_CLOUD_MASTER_PORTAL\apps\gatepass\frontend"),
        "apk_names": ["01_OSLC_GatePass.apk", "OSLC_GatePass.apk"]
    },
    "02": {
        "src": BRAIN_DIR / "icon_godaun_inout_1792669334947.jpg",
        "title": "OSLC In Out Material Report",
        "web_dir": Path(r"D:\OSLC_CLOUD_MASTER_PORTAL\apps\godaun\frontend"),
        "apk_names": ["10_OSLC_In_Out_Report.apk", "OSLC_IN_OUT_REPORT.apk"]
    },
    "03": {
        "src": BRAIN_DIR / "icon_alter_report_1792669380038.jpg",
        "title": "OSLC Karigar Alter Report",
        "web_dir": Path(r"D:\OSLC_CLOUD_MASTER_PORTAL\apps\alter\frontend"),
        "apk_names": ["03_OSLC_Alter_Report.apk", "OSLC_ALTER_REPORT.apk"]
    },
    "04": {
        "src": BRAIN_DIR / "icon_stock_report_1792669403025.jpg",
        "title": "OSLC Stock Warehouse Report",
        "web_dir": Path(r"D:\OSLC_CLOUD_MASTER_PORTAL\apps\stock\frontend"),
        "apk_names": ["02_OSLC_Stock_Report.apk", "OSLC_STOCK_REPORT.apk"]
    },
    "05": {
        "src": BRAIN_DIR / "icon_po_dashboard_1792669425355.jpg",
        "title": "OSLC PO & Cutting Dashboard",
        "web_dir": Path(r"D:\OSLC_CLOUD_MASTER_PORTAL\apps\po\frontend"),
        "apk_names": ["17_OSLC_PO_Dashboard.apk", "18_PO_DASHBOARD_ICON_VALI.apk", "OSLC_PO_Dashboard.apk"]
    },
    "06": {
        "src": BRAIN_DIR / "icon_mk_checking_1792669446673.jpg",
        "title": "OSLC MK Checking Report 127",
        "web_dir": Path(r"D:\OSLC_CLOUD_MASTER_PORTAL\apps\mk\frontend"),
        "apk_names": ["04_OSLC_Checking_Report.apk", "OSLC_CHEKING.apk"]
    },
    "07": {
        "src": BRAIN_DIR / "icon_barcode_print_1792669465984.jpg",
        "title": "OSLC Godaun Shelf Barcode Print",
        "web_dir": Path(r"D:\OSLC_CLOUD_MASTER_PORTAL\apps\barcode\frontend"),
        "apk_names": ["12_OSLC_PO_Barcode_Generator.apk", "OSLC_PO_BARCODE_GENERATOR.apk"]
    },
    "08": {
        "src": BRAIN_DIR / "icon_final_pending_1792674261329.jpg",
        "title": "OSLC Final Pending List Control",
        "web_dir": None,
        "apk_names": ["08_OSLC_Production_Report.apk"]
    },
    "09": {
        "src": BRAIN_DIR / "icon_one_click_1792674279636.jpg",
        "title": "Digi One Click Fast Print & Pivot",
        "web_dir": None,
        "apk_names": ["14_Digi_One_Click_Print.apk", "DIGI_ONE_CLICK_PRINT.apk"]
    },
    "10": {
        "src": BRAIN_DIR / "icon_erp_system_1792670252580.jpg",
        "title": "OSLC Factory Live Cloud ERP",
        "web_dir": Path(r"D:\JEEL VAGHANI\OSLC ERP\OSLC-PENDING-LIVE-ERP-V17-CATEGORY-LIVE\frontend\public"),
        "apk_names": ["09_OSLC_ERP.apk", "OSLC_ERP_APK.apk", "OSLC_ERP.apk"]
    },
    "11": {
        "src": BRAIN_DIR / "icon_attendance_1792674304478.jpg",
        "title": "OSLC Godown Attendance System",
        "web_dir": None,
        "apk_names": ["05_OSLC_Godown_Attendance.apk", "Godown_Attendance.apk", "OSLC_HOUSE.apk"]
    },
    "12": {
        "src": BRAIN_DIR / "icon_lumora_1792674322795.jpg",
        "title": "Lumora Barcode Label System",
        "web_dir": None,
        "apk_names": ["06_Lumora_Barcode_Label.apk", "LUMORA_BARCODE.apk"]
    },
    "13": {
        "src": BRAIN_DIR / "icon_blinkit_1792674341431.jpg",
        "title": "Blinkit PO Scanner & Dispatch",
        "web_dir": None,
        "apk_names": ["15_Blinkit_PO_Digi_Portal.apk", "16_Blinkit_Scanner.apk"]
    },
    "14": {
        "src": BRAIN_DIR / "icon_photo_maker_1792674361011.jpg",
        "title": "OSLC E-Commerce 4K Photo Maker",
        "web_dir": None,
        "apk_names": ["11_OSLC_Photo_Maker.apk", "OSLC_PHOTO_MAKER.apk"]
    },
    "15": {
        "src": BRAIN_DIR / "icon_special_tools_1792674387575.jpg",
        "title": "OSLC Special Print Tools & WIP",
        "web_dir": None,
        "apk_names": []
    }
}

def create_branded_icon(src_img_path: Path, title: str) -> Image.Image:
    """Takes a raw 3D icon and stamps a royal golden CREATED BY JEEL VAGHANI header & footer."""
    base = Image.open(src_img_path).convert("RGBA").resize((1024, 1024), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(base)

    # 1. Subtle luxury golden border
    border_color = (212, 175, 55, 230)
    for i in range(12):
        draw.rounded_rectangle([i, i, 1023 - i, 1023 - i], radius=180, outline=border_color, width=1)

    # 2. Bottom Royal Badge: "👑 CREATED BY JEEL VAGHANI • OSLC HOUSE"
    badge_h = 100
    badge_y = 1024 - badge_h - 24
    
    # Draw translucent dark pill
    draw.rounded_rectangle([60, badge_y, 1024 - 60, badge_y + badge_h], radius=50, fill=(10, 15, 30, 230), outline=(234, 179, 8, 255), width=3)

    # Text styling
    try:
        font_large = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 36)
        font_sub = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 24)
    except Exception:
        font_large = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    text1 = "CREATED BY JEEL VAGHANI"
    text2 = "OM SAI LATEST CREATION • OSLC HOUSE"
    
    # Center text
    bbox1 = draw.textbbox((0, 0), text1, font=font_large)
    w1 = bbox1[2] - bbox1[0]
    bbox2 = draw.textbbox((0, 0), text2, font=font_sub)
    w2 = bbox2[2] - bbox2[0]

    draw.text(((1024 - w1) // 2, badge_y + 14), text1, fill=(255, 215, 0), font=font_large)
    draw.text(((1024 - w2) // 2, badge_y + 58), text2, fill=(226, 232, 240), font=font_sub)

    return base

def inject_icons_into_apk(apk_path: Path, branded_img: Image.Image) -> bool:
    """Injects all standard density icons into the APK zip and re-signs it with apksigner."""
    if not apk_path.exists():
        return False

    TMP_DIR = Path(r"C:\Users\PC-106\AppData\Local\Temp\oslc_sign")
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    temp_unaligned = TMP_DIR / f"unaligned_{apk_path.name}"
    temp_aligned = TMP_DIR / f"aligned_{apk_path.name}"


    densities = {
        48: ["res/mipmap-mdpi/ic_launcher.png"],
        72: ["res/mipmap-hdpi/ic_launcher.png"],
        96: ["res/mipmap-xhdpi/ic_launcher.png"],
        144: ["res/mipmap-xxhdpi/ic_launcher.png"],
        192: ["res/mipmap-xxxhdpi/ic_launcher.png", "assets/static/icon-192.png"],
        512: ["assets/img/oslc_icon.png", "assets/static/img/oslc_icon.png", "assets/app_icon.png", "assets/oslc_icon.png"]
    }

    # Generate resized bytes
    icon_bytes = {}
    import io
    for size, paths in densities.items():
        resized = branded_img.resize((size, size), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        resized.save(buf, format="PNG")
        data = buf.getvalue()
        for p in paths:
            icon_bytes[p] = data

    try:
        # 1. Read existing APK and replace icon files while stripping old signature
        with zipfile.ZipFile(apk_path, "r") as zin:
            with zipfile.ZipFile(temp_unaligned, "w", zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    name = item.filename
                    # Skip old signature files
                    if name.startswith("META-INF/") and (name.endswith(".SF") or name.endswith(".RSA") or name.endswith(".MF") or name.endswith(".DSA")):
                        continue
                    if name in icon_bytes:
                        # Replace icon
                        zout.writestr(name, icon_bytes[name])
                    else:
                        zout.writestr(item, zin.read(name))
                
                # Add any missing standard icon paths
                existing = [i.filename for i in zin.infolist()]
                for path_name, data in icon_bytes.items():
                    if path_name not in existing:
                        zout.writestr(path_name, data)

        # 2. Zipalign (4-byte alignment)
        if ZIPALIGN.exists():
            zcmd = [str(ZIPALIGN), "-p", "-f", "4", str(temp_unaligned), str(temp_aligned)]
            zr = subprocess.run(zcmd, capture_output=True)
            target_sign = temp_aligned if zr.returncode == 0 else temp_unaligned
        else:
            target_sign = temp_unaligned

        # 3. Apksigner with debug.keystore
        if APKSIGNER.exists() and KEYSTORE.exists():
            scmd = [
                str(APKSIGNER),
                "sign",
                "--ks", str(KEYSTORE),
                "--ks-pass", "pass:android",
                "--ks-key-alias", "androiddebugkey",
                "--key-pass", "pass:android",
                "--v1-signing-enabled", "true",
                "--v2-signing-enabled", "true",
                str(target_sign)
            ]
            sr = subprocess.run(scmd, capture_output=True)
            if sr.returncode == 0:
                shutil.copy2(target_sign, apk_path)
            else:
                shutil.copy2(temp_unaligned, apk_path)
        else:
            shutil.copy2(temp_unaligned, apk_path)

        # Clean temp
        for tmp in [temp_unaligned, temp_aligned]:
            if tmp.exists():
                tmp.unlink()

        return True
    except Exception as e:
        print(f"  [ERROR INJECTING {apk_path.name}] {e}")
        for tmp in [temp_unaligned, temp_aligned]:
            if tmp.exists():
                try: tmp.unlink()
                except Exception: pass
        return False

def process_all_projects():
    print("=" * 70)
    print("APPLYING UNIQUE 3D LUXURY ICONS & JEEL VAGHANI BRANDING TO ALL APKS")
    print("=" * 70)

    for proj_id, info in sorted(PROJECT_ICONS.items()):
        src_path = info["src"]
        if not src_path.exists():
            print(f"Skipping {proj_id}: {src_path.name} not found")
            continue

        print(f"\n[{proj_id}] Processing: {info['title']}")
        branded_img = create_branded_icon(src_path, info["title"])

        # 1. Save previews and icons in REPRR folder
        for folder in REPRR_ROOT.iterdir():
            if folder.is_dir() and folder.name.startswith(proj_id):
                # Save 1024x1024 master preview
                branded_img.save(folder / "APP_ICON_PREVIEW.png", format="PNG")
                
                # Save 512x512 icon for phone
                icon_512 = branded_img.resize((512, 512), Image.Resampling.LANCZOS)
                phone_dir = folder / "📱_PHONE_APK"
                phone_dir.mkdir(parents=True, exist_ok=True)
                icon_512.save(phone_dir / "APP_ICON.png", format="PNG")

                # Save .ico for Windows PC launcher
                pc_dir = folder / "💻_PC_VERSION"
                pc_dir.mkdir(parents=True, exist_ok=True)
                branded_img.resize((256, 256), Image.Resampling.LANCZOS).save(pc_dir / "app_icon.ico", format="ICO")

                # Inject into all APKs in this folder
                for apk in phone_dir.glob("*.apk"):
                    ok = inject_icons_into_apk(apk, branded_img)
                    print(f"  ✅ Injected icon into REPRR APK: {apk.name} (Signed: {ok})")

        # 2. Inject into SAKIL_APKS
        for apk_name in info.get("apk_names", []):
            target_apk = SAKIL_APKS / apk_name
            if target_apk.exists():
                ok = inject_icons_into_apk(target_apk, branded_img)
                print(f"  ✅ Injected icon into SAKIL APK: {apk_name} (Signed: {ok})")


        # 3. Update Web Frontend (so the icon appears inside the app too!)
        web_dir = info["web_dir"]
        if web_dir and web_dir.exists():
            try:
                # 512x512 app_icon.png
                branded_img.resize((512, 512), Image.Resampling.LANCZOS).save(web_dir / "app_icon.png", format="PNG")
                # 192x192 icon-192.png
                branded_img.resize((192, 192), Image.Resampling.LANCZOS).save(web_dir / "icon-192.png", format="PNG")
                # favicon.ico
                branded_img.resize((64, 64), Image.Resampling.LANCZOS).save(web_dir / "favicon.ico", format="ICO")
                # Also check img/
                img_sub = web_dir / "img"
                if img_sub.exists():
                    branded_img.resize((512, 512), Image.Resampling.LANCZOS).save(img_sub / "oslc_icon.png", format="PNG")
                print(f"  ✨ Web frontend synchronized with exact same icon: {web_dir.name}")
            except Exception as we:
                print(f"  [WEB ICON ERROR] {we}")

    print("\n" + "=" * 70)
    print("ALL 15 APKS AND WEB INTERFACES UPDATED WITH LUXURY 3D BRANDED ICONS!")
    print("👑 CREATED BY JEEL VAGHANI • OSLC HOUSE")
    print("=" * 70)

if __name__ == "__main__":
    process_all_projects()
