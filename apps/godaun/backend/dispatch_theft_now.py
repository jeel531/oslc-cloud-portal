import sys
import requests
import json
import urllib.parse
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# Import get_chori_whatsapp_message from godaun_service
from godaun_service import get_chori_whatsapp_message

# Generate the report text
res = get_chori_whatsapp_message(
    from_date="",
    to_date="",
    shift="all",
    process="all",
    user="",
    phone="919033157999",
    limit=50
)

msg = res.get("message_text", "")
print("Report generated. Length:", len(msg))
print("--- PREVIEW ---")
print(msg[:400])
print("...")

# Target Group JID created earlier:
group_id = "120363430986633216@g.us"
user_phone = "919033157999"

# 1. Send into Group
print(f"\nSending into Group {group_id}...")
g_resp = requests.post("http://127.0.0.1:8008/send", json={
    "group_id": group_id,
    "message": msg,
    "send_from": "both"
}, timeout=20).json()
print("Group Dispatch Result:", g_resp)

# 2. Send direct message to User's phone
print(f"\nSending direct to {user_phone}...")
d_resp = requests.post("http://127.0.0.1:8008/send", json={
    "phone": user_phone,
    "message": msg,
    "send_from": "both"
}, timeout=20).json()
print("Direct Dispatch Result:", d_resp)

print("\nSUCCESS! Check phone now!")
