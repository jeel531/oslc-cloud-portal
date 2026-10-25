import urllib.parse, os

# Read the generated message
with open("backend/whatsapp_msg.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Encode text
encoded = urllib.parse.quote(text[:1800])
uri = f"whatsapp://send?phone=919033157999&text={encoded}"
print("Executing os.startfile with whatsapp URI...")
os.startfile(uri)
print("SUCCESS: WhatsApp Desktop opened directly with the pre-filled report!")
