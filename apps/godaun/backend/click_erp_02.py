import ctypes
import time
import os

user32 = ctypes.windll.user32
hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

wa_hwnd = 132084

# Ensure foreground
user32.AllowSetForegroundWindow(-1)
user32.keybd_event(0x12, 0, 0, 0)
user32.keybd_event(0x12, 0, 2, 0)
user32.ShowWindow(wa_hwnd, 3) # SW_MAXIMIZE
user32.SetForegroundWindow(wa_hwnd)
time.sleep(0.3)

# Click Oslc ERP 02 at (150, 340)
user32.SetCursorPos(150, 340)
time.sleep(0.2)
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
time.sleep(1.0)

# Capture screen
os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_oslc_erp_02.png')
print("Clicked Oslc ERP 02 and saved screen.")
