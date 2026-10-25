import urllib.request, json

url = "http://127.0.0.1:8095/api/godaun/chori-whatsapp?from_date=2026-10-17&to_date=2026-10-17&phone=919033157999&limit=15"
try:
    res = urllib.request.urlopen(url)
    data = json.loads(res.read().decode())
    print("API SUCCESS!")
    print("Phone:", data.get("phone"))
    print("Total Dupe Pcs:", data.get("total_dupe_pcs"))
    print("\n--- SAMPLE MESSAGE TEXT ---")
    print(data.get("message_text").encode('utf-8', errors='replace').decode('utf-8', errors='replace'))
    print("\n--- WHATSAPP URL ---")
    print(data.get("whatsapp_url")[:150] + "...")
except Exception as e:
    print("Error:", e)
