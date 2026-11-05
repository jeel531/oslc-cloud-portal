# -*- coding: utf-8 -*-
"""
OSLC 24/7 Cloud Morning Report Runner (Runs on Cloud Server / GitHub Actions / Render)
Om Sai Latest Creation | Jeel Vaghani

Runs completely in the cloud without requiring PC-106 to be powered on!
Connects to DigiBizz SQL Server: 103.118.17.67,3595
Updates Google Sheet: 1f34DjieNFmH1Wulj4M1iTiUcUsJBOYgFNkzoKNXC5bc
Dispatches WhatsApp Notification 24/7
"""
import os
import sys
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

# Try pyodbc or pymssql
DB_CONNECTED = False
conn = None

DB_SERVER = os.getenv("DIGI_DB_SERVER", "103.118.17.67,3595")
DB_NAME = os.getenv("DIGI_DB_NAME", "DigiBizz_PROD_Om_Sai_Trans_2026_27")
DB_USER = os.getenv("DIGI_DB_USER", "_DigiCorp_OmSai")
DB_PASS = os.getenv("DIGI_DB_PASS", "1h9vMK_U9!@DigiOmSaiCorp@#2021#")

SHEET_ID = "1f34DjieNFmH1Wulj4M1iTiUcUsJBOYgFNkzoKNXC5bc"
WHATSAPP_NUMBER = os.getenv("TARGET_WHATSAPP", "917041181117")

def fmt_inr(val):
    try:
        s = str(int(val))
        if len(s) <= 3:
            return s
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        return ",".join(groups) + "," + last3
    except Exception:
        return str(val)

def fetch_data():
    try:
        import pyodbc
        conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE={DB_NAME};UID={DB_USER};PWD={DB_PASS};Timeout=30;"
        conn = pyodbc.connect(conn_str)
    except Exception:
        import pymssql
        host_parts = DB_SERVER.split(",")
        server_host = host_parts[0]
        server_port = int(host_parts[1]) if len(host_parts) > 1 else 1433
        conn = pymssql.connect(server=server_host, port=server_port, user=DB_USER, password=DB_PASS, database=DB_NAME)

    cursor = conn.cursor()
    target_dt = datetime.now() - timedelta(days=1)
    target_date_str = target_dt.strftime("%d-%m-%Y")
    d_start = target_dt.strftime("%Y-%m-%d 00:00:00")
    d_next = (target_dt + timedelta(days=1)).strftime("%Y-%m-%d 00:00:00")

    # 1. TOTAL (Fresh Pcs.)
    cursor.execute("SELECT ISNULL(SUM(FRESH_PCS), 0) FROM VIEW_TRANS_WMS_WAREHOUSE_ALLOVER_STOCK WITH (NOLOCK)")
    total = int(cursor.fetchone()[0] or 0)

    # 2. BLOCK (Block Pcs.)
    cursor.execute("SELECT ISNULL(SUM(BLOCK_PCS), 0) FROM VIEW_TRANS_WMS_WAREHOUSE_ALLOVER_STOCK WITH (NOLOCK)")
    block = int(cursor.fetchone()[0] or 0)

    # 3. INWARD
    cursor.execute(f"SELECT ISNULL(SUM(QTY_PIECES), 0) FROM View_Dboard_Trans_All_Daily_Summary WITH (NOLOCK) WHERE TRANS_TYPE_NAME = 'WMS Stock Inward' AND TRANS_DATE >= '{d_start}' AND TRANS_DATE < '{d_next}'")
    inward = int(cursor.fetchone()[0] or 0)

    # 4. OUTWARD
    cursor.execute(f"SELECT ISNULL(SUM(QTY_PIECES), 0) FROM View_Dboard_Trans_All_Daily_Summary WITH (NOLOCK) WHERE TRANS_TYPE_NAME IN ('WMS Order Pickup', 'WMS Stock Outward') AND TRANS_DATE >= '{d_start}' AND TRANS_DATE < '{d_next}'")
    outward = int(cursor.fetchone()[0] or 0)

    # 5. AUDIT (Pending Shelf Code)
    cursor.execute("SELECT COUNT(DISTINCT SHELF_CODE) FROM View_Dboard_Shelf_To_Be_Audit WITH (NOLOCK) WHERE AUDIT_STATUS = 'Pending'")
    audit = int(cursor.fetchone()[0] or 0)

    conn.close()
    return {
        "date": target_date_str,
        "TOTAL": total,
        "INWARD": inward,
        "OUTWARD": outward,
        "AUDIT": audit,
        "BLOCK": block
    }

def build_message(data):
    return f"""Hare Krishna 🙏
Good Morning Boss

📊 *OSLC Warehouse Stock Report*

📅 *Date:* {data['date']}
📦 *Total Stock:* {fmt_inr(data['TOTAL'])}
📥 *INWARD:* {fmt_inr(data['INWARD'])}
📤 *OUTWARD:* {fmt_inr(data['OUTWARD'])}
🔍 *AUDIT:* {fmt_inr(data['AUDIT'])}
🚫 *BLOCK:* {fmt_inr(data['BLOCK'])}

━━━━━━━━━━━━━━━━━━━━
👤 *Created by: Jeel Vaghani*"""

if __name__ == "__main__":
    print("="*50)
    print("  OSLC 24/7 CLOUD MORNING REPORT EXECUTION")
    print("="*50)
    data = fetch_data()
    msg = build_message(data)
    print(msg)
    print("="*50)
