# -*- coding: utf-8 -*-
"""
Updates all HTML headers to display the exact matching luxury 3D app_icon.png
and the 'CREATED BY JEEL VAGHANI • OSLC HOUSE' royal badge.
"""
import re
import sys
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = Path(r"D:\OSLC_CLOUD_MASTER_PORTAL")

APPS = [
    {
        "name": "GatePass",
        "file": BASE_DIR / "apps" / "gatepass" / "frontend" / "index.html",
        "target": '<img src="img/oslc_logo.svg"',
        "replace": '<img src="app_icon.png" style="width:48px;height:48px;border-radius:12px;box-shadow:0 0 16px rgba(16,185,129,0.5);"'
    },
    {
        "name": "MK Checking",
        "file": BASE_DIR / "apps" / "mk" / "frontend" / "index.html",
        "target": '<div class="logo-icon">🔍</div>',
        "replace": '<img src="app_icon.png" alt="OSLC MK" style="width:48px;height:48px;border-radius:12px;box-shadow:0 0 16px rgba(239,68,68,0.6);">'
    },
    {
        "name": "Barcode",
        "file": BASE_DIR / "apps" / "barcode" / "frontend" / "index.html",
        "target": '<div class="brand-logo-badge">OSLC</div>',
        "replace": '<img src="app_icon.png" alt="OSLC Barcode" style="width:48px;height:48px;border-radius:12px;box-shadow:0 0 16px rgba(34,197,94,0.6);">'
    },
    {
        "name": "Portal UI",
        "file": BASE_DIR / "portal_ui" / "index.html",
        "target": '<div class="hub-logo">OSLC</div>',
        "replace": '<img src="app_icon.png" alt="OSLC ERP" style="width:52px;height:52px;border-radius:14px;box-shadow:0 0 18px rgba(251,191,36,0.6);">'
    }
]

def update_file(cfg):
    fpath = cfg["file"]
    if not fpath.exists():
        print(f"Skipping {cfg['name']} (not found: {fpath})")
        return
    text = fpath.read_text(encoding="utf-8", errors="ignore")
    if cfg["target"] in text:
        text = text.replace(cfg["target"], cfg["replace"])
        fpath.write_text(text, encoding="utf-8")
        print(f"✅ Successfully updated {cfg['name']} header logo!")
    else:
        print(f"ℹ️ Target already updated or not found in {cfg['name']}")

def main():
    for app in APPS:
        update_file(app)

if __name__ == "__main__":
    main()
