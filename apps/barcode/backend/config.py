# -*- coding: utf-8 -*-
"""
OSLC Godaun Shelf Barcode Print Software
System Configuration
"""
import os
from pathlib import Path

APP_NAME = "OSLC Godaun Shelf Barcode Print Pro"
APP_SUBTITLE = "Om Sai Latest Creation - Shelf Barcode Print Engine (A4 10-Per-Page)"
COMPANY_NAME = "OM SAI LATEST CREATION"
APP_VERSION = "2.0.0"

# DigiBizz SQL Server Database Configuration
DB_CONFIG = {
    "server": "103.118.17.67,3595",
    "master_database": "DigiBizz_PROD_Om_Sai_Master",
    "trans_database": "DigiBizz_PROD_Om_Sai_Trans_2026_27",
    "username": "_oslc_report-user",
    "password": "_oslc_report-user@Abc@#123#",
    "driver": "SQL Server",
}

# Web Server
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8098

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "frontend"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
