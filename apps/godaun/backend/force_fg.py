import ctypes
from ctypes import wintypes
import time
import os

user32 = ctypes.windll.user32
hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

wa_hwnd = 132084

# Trick to force SetForegroundWindow
user32.AllowSetForegroundWindow(-1)
user32.keybd_event(0x12, 0, 0, 0) # Alt down
user32.keybd_event(0x12, 0, 2, 0) # Alt up
user32.ShowWindow(wa_hwnd, 9) # SW_RESTORE
user32.SetForegroundWindow(wa_hwnd)
user32.BringWindowToTop(wa_hwnd)
time.sleep(1.0)

# Check foreground window
fg = user32.GetForegroundWindow()
print(f"Foreground window: {fg} (expected {wa_hwnd})")

# Take screenshot to verify WhatsApp is in foreground
os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_fg.png')
print("FG screenshot saved.")
