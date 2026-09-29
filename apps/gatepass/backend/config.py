# -*- coding: utf-8 -*-
"""
OSLC KARIGAR GATE PASS SYSTEM - System Configuration
"""
import os
import sys
from pathlib import Path

# Support running directly or from PyInstaller bundle
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "frontend"
TEMPLATE_EXCEL = Path(__file__).resolve().parent / "OSLC KARIGAR GATEPASS-15-06-2026-NEW.xlsx"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
STATIC_DIR.mkdir(parents=True, exist_ok=True)

import socket

def get_local_ip() -> str:
    """Discovers the active local network IPv4 address for multi-PC access."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

LOCAL_IP = get_local_ip()

# Application metadata
APP_TITLE = "OSLC KARIGAR GATE PASS CONTROL CENTER"
APP_SUBTITLE = "Live DigiBizz Master Karigar Photo & Report 141 Mall Checker"
COMPANY_NAME = "OSLC HOUSE"
FULL_COMPANY_NAME = "OM SAI LATEST CREATION"
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8096

# DigiBizz Live SQL Server Cloud Database Configuration
DB_CONFIG = {
    "server": "103.118.17.67,3595",
    "database": "DigiBizz_PROD_Om_Sai_Trans_2026_27",
    "master_db": "DigiBizz_PROD_Om_Sai_Master",
    "username": "_oslc_report-user",
    "password": "_oslc_report-user@Abc@#123#",
    "driver": "SQL Server",
    "timeout": 15,
}

# Local Image Fallback Path
LOCAL_IMAGE_DIRS = [
    r"D:\JEEL VAGHANI\MY DOWNLOADS\ALL IMAGES",
]

# Default Floor Detection Rules
FLOOR_KEYWORDS = {
    "E2": "2ND FLOOR",
    "E3": "3RD FLOOR",
    "O3": "3RD FLOOR",
    "E4": "4TH FLOOR",
    "O4": "4TH FLOOR",
    "E5": "5TH FLOOR",
    "O5": "5TH FLOOR",
    "GF": "GROUND FLOOR",
    "G": "GROUND FLOOR",
}
DEFAULT_FLOOR = "3TH FLOOR"

# UI Theme - Sleek Modern Dark Glassmorphism
THEME = {
    "bg_gradient": "linear-gradient(135deg, #0b132b 0%, #1c2541 50%, #0b132b 100%)",
    "card_bg": "rgba(23, 34, 59, 0.85)",
    "card_border": "#2d3f66",
    "accent": "#3a86ff",
    "accent_gold": "#f59e0b",
    "success": "#10b981",
    "danger": "#ef4444",
    "warning": "#f59e0b",
    "text": "#f8fafc",
    "text_muted": "#94a3b8",
}
