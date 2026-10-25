import time, os, urllib.parse, ctypes

user32 = ctypes.windll.user32

# Function to send Enter key
def press_enter():
    VK_RETURN = 0x0D
    KEYEVENTF_KEYUP = 0x0002
    user32.keybd_event(VK_RETURN, 0, 0, 0) # Key down
    time.sleep(0.05)
    user32.keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, 0) # Key up

# Read report
with open("backend/whatsapp_msg.txt", "r", encoding="utf-8") as f:
    text = f.read()

encoded = urllib.parse.quote(text[:1800])
uri = f"whatsapp://send?phone=919033157999&text={encoded}"
print("Launching WhatsApp...")
os.startfile(uri)

# Wait for WhatsApp to render the chat and pre-fill the message
print("Waiting 3.5s for WhatsApp to focus chat box...")
time.sleep(3.5)

# Press Enter to automatically send the message
press_enter()
print("AUTOMATICALLY PRESSED ENTER TO SEND THE WHATSAPP MESSAGE!")
