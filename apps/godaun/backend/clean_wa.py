import ctypes
import time
import os

user32 = ctypes.windll.user32
hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

# Release all keys
for vk in [0x12, 0x11, 0x10, 0x5B]: # Alt, Ctrl, Shift, Win
    user32.keybd_event(vk, 0, 2, 0)
time.sleep(0.1)

# Press Escape
user32.keybd_event(0x1B, 0, 0, 0)
user32.keybd_event(0x1B, 0, 2, 0)
time.sleep(0.3)

wa_hwnd = 132084
user32.ShowWindow(wa_hwnd, 9)
user32.SetForegroundWindow(wa_hwnd)
time.sleep(0.5)

# Capture screen
os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_clean_wa.png')
print("Clean WhatsApp captured.")
