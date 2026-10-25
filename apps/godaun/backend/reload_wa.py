import ctypes
import time
import os

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

wa_hwnd = 132084

# Topmost and foreground
HWND_TOPMOST = -1
user32.ShowWindow(wa_hwnd, 3) # SW_MAXIMIZE
user32.SetWindowPos(wa_hwnd, HWND_TOPMOST, 0, 0, 1920, 1080, 0x0040)
time.sleep(0.5)

user32.AllowSetForegroundWindow(-1)
user32.keybd_event(0x12, 0, 0, 0)
user32.keybd_event(0x12, 0, 2, 0)
user32.SetForegroundWindow(wa_hwnd)
time.sleep(0.5)

# Send Ctrl + R (reload)
user32.keybd_event(0x11, 0, 0, 0) # Ctrl down
user32.keybd_event(ord('R'), 0, 0, 0)
user32.keybd_event(ord('R'), 0, 2, 0)
user32.keybd_event(0x11, 0, 2, 0) # Ctrl up

print("Reload sent. Waiting 5s...")
time.sleep(5.0)

# Capture screen
os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_wa_reloaded.png')
print("Saved screen_wa_reloaded.png")
