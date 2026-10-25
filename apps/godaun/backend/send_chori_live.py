import requests
import json
import pyodbc
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# 1. Check Bot Status
status_res = requests.get('http://127.0.0.1:8008/status', timeout=5).json()
print("WhatsApp Bot Status:", status_res.get('status'), "| Both Connected:", status_res.get('both_connected'))

# 2. Check if "WMS Godaun Chori Report" group already exists
groups_res = requests.get('http://127.0.0.1:8008/groups', timeout=5).json()
existing_group = None
for g in groups_res.get('groups', []):
    if 'WMS' in g.get('subject', '') and 'Chori' in g.get('subject', ''):
        existing_group = g
        break

group_id = None
if existing_group:
    group_id = existing_group['id']
    print(f"Found existing group: {group_id} ({existing_group['subject']})")
else:
    print("Creating new group '🚨 WMS Godaun Chori Report'...")
    create_payload = {
        "group_name": "🚨 WMS Godaun Chori Report",
        "participants": ["919033157999"]
    }
    create_res = requests.post('http://127.0.0.1:8008/create-group', json=create_payload, timeout=20).json()
    print("Create group result:", create_res)
    group_id = create_res.get('group_id')

print("Target Group JID:", group_id)

# 3. Fetch Real Same-Day Duplicate Theft Data from SQL Server
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};TrustServerCertificate=yes;")
cur = conn.cursor()

today_str = datetime.now().strftime('%Y-%m-%d')
query = f"""
WITH RankedScans AS (
    SELECT 
        w.TRANS_DATE,
        w.PROCESS_NAME,
        w.BARCODE,
        w.ITEM_NAME,
        w.DESIGN_NO,
        w.WORKER_NAME,
        w.CREATED_DATE,
        d.SHELF_CODE,
        d.RACK_CODE,
        ROW_NUMBER() OVER(
            PARTITION BY w.TRANS_DATE, w.PROCESS_NAME, w.BARCODE 
            ORDER BY w.CREATED_DATE ASC
        ) as scan_rank,
        COUNT(*) OVER(
            PARTITION BY w.TRANS_DATE, w.PROCESS_NAME, w.BARCODE
        ) as total_scans
    FROM View_Dboard_Trans_All_Detail_Full w
    LEFT JOIN View_Dboard_Trans_All_Detail d 
        ON w.BARCODE = d.BARCODE AND w.TRANS_DATE = d.TRANS_DATE
    WHERE w.TRANS_DATE >= DATEADD(day, -2, GETDATE())
)
SELECT 
    TRANS_DATE, PROCESS_NAME, BARCODE, ITEM_NAME, DESIGN_NO, 
    WORKER_NAME, CREATED_DATE, SHELF_CODE, RACK_CODE, scan_rank, total_scans
FROM RankedScans
WHERE total_scans > 1
ORDER BY CREATED_DATE DESC
"""

cur.execute(query)
rows = cur.fetchall()
print(f"Found {len(rows)} duplicate scan rows.")

# Format Theft Report Message
report_lines = [
    "🚨 *WMS GODAUN CHORI REPORT (ચોરી રિપોર્ટ)* 🚨",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    f"📅 *તારીખ*: {datetime.now().strftime('%d-%m-%Y')} | ⏰ *સમય*: {datetime.now().strftime('%I:%M %p')}",
    "⚡ *Mode*: Same-Day Same-Barcode Duplicate Scans",
    f"📊 *કુલ શંકાસ્પદ ચોરી કેસ*: {len(rows)} સ્કેન",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ""
]

if not rows:
    report_lines.append("✅ આજે કોઈ શંકાસ્પદ ચોરી કે ડુપ્લિકેટ સ્કેન નોંધાયેલ નથી.")
else:
    for idx, r in enumerate(rows[:15], 1):
        dt_str = r[6].strftime('%d-%m-%Y %I:%M %p') if r[6] else "N/A"
        hour = r[6].hour if r[6] else 12
        shift = "Day (સવાર)" if (8 <= hour < 20) else "Night (રાત)"
        shelf = r[7] or "N/A"
        rack = r[8] or "N/A"
        worker = r[5] or "અજ્ઞાત"
        barcode = r[2]
        proc = r[1]
        repeat_no = r[9]
        tot = r[10]
        
        report_lines.append(f"*{idx}. બારકોડ: {barcode}* [પુનરાવર્તન: {repeat_no}/{tot}]")
        report_lines.append(f"   📍 *શેલ્ફ (Shelf)*: {shelf} | *રેક (Rack)*: {rack}")
        report_lines.append(f"   👤 *વર્કર (Worker)*: {worker} (ID)")
        report_lines.append(f"   🔄 *પ્રોસેસ*: {proc} | 🌓 *શિફ્ટ*: {shift}")
        report_lines.append(f"   ⏰ *સ્કેન સમય*: {dt_str}")
        report_lines.append("─────────────────────────────────")

report_lines.append("")
report_lines.append("🏢 *OSLC WMS GODAUN AUTOMATION SYSTEM*")
report_lines.append("🚀 *Official Notification Group Active*")

full_message = "\n".join(report_lines)

# 4. Dispatch to Group
if group_id:
    print("\nSending report to WhatsApp Group...")
    g_res = requests.post('http://127.0.0.1:8008/send', json={
        "group_id": group_id,
        "message": full_message,
        "send_from": "both"
    }, timeout=15).json()
    print("Group send result:", g_res)

# 5. Also Dispatch directly to user's number 919033157999
print("\nSending direct copy to 919033157999...")
d_res = requests.post('http://127.0.0.1:8008/send', json={
    "phone": "919033157999",
    "message": full_message,
    "send_from": "both"
}, timeout=15).json()
print("Direct send result:", d_res)

conn.close()
