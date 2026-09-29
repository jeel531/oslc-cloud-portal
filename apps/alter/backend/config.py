# -*- coding: utf-8 -*-
"""
Om Sai Latest Creation - OSLC Alter & Stitching Receive Karigar Report
System Configuration
"""
import os

APP_NAME = "OSLC Karigar Alter & Stitching Report"
APP_SUBTITLE = "DigiBizz ERP - Report 127 Production Engine"
COMPANY_NAME = "OM SAI LATEST CREATION"
APP_VERSION = "1.0.0"

# DigiBizz SQL Server Cloud Database Configuration
DB_CONFIG = {
    "server": "103.118.17.67,3595",
    "database": "DigiBizz_PROD_Om_Sai_Trans_2026_27",
    "username": "_oslc_report-user",
    "password": "_oslc_report-user@Abc@#123#",
    "driver": "SQL Server",
}

# Floor & Line Man Definitions
FLOOR_MAPPING = {
    "E2": "E2 - MUSHID BHAI",
    "E3": "E3 - SADDAM BHAI",
    "E5": "E5 - TOHIDUL BHAI",
    "O3": "O3 - RAFIK BHAI",
}
DEFAULT_FLOOR = "MIX"

# Sheet Names in Excel
SHEET_ORDER = [
    ("ALL", "OSLC KARIGAR REPORT - ALL"),
    ("LINEMAN RANKING", "OSLC LINEMAN WISE ALTER RANKING & COMPARISON"),
    ("E2-MUSHID BHAI", "OSLC KARIGAR REPORT - E2 - MUSHID BHAI"),
    ("E3-SADDAM BHAI", "OSLC KARIGAR REPORT - E3 - SADDAM BHAI"),
    ("O3-RAFIK BHAI", "OSLC KARIGAR REPORT - O3 - RAFIK BHAI"),
    ("E5-TOHIDUL BHAI", "OSLC KARIGAR REPORT - E5 - TOHIDUL BHAI"),
    ("MIX", "OSLC KARIGAR REPORT - MIX"),
]

# Web Server Configuration
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8094
