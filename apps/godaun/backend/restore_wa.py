import ctypes
from ctypes import wintypes
import time
import os

user32 = ctypes.windll.user32
hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

wa_hwnd = 132084

# Unminimize and position at (100, 100, 1200, 800)
user32.ShowWindow(wa_hwnd, 9) # SW_RESTORE
time.sleep(0.3)
user32.SetWindowPos(wa_hwnd, 0, 100, 100, 1200, 800, 0x0040) # SWP_SHOWWINDOW
time.sleep(0.3)

user32.AllowSetForegroundWindow(-1)
user32.keybd_event(0x12, 0, 0, 0)
user32.keybd_event(0x12, 0, 2, 0)
user32.SetForegroundWindow(wa_hwnd)
time.sleep(0.5)

class RECT(ctypes.Structure):
    _fields_ = [('left', wintypes.LONG), ('top', wintypes.LONG), ('right', wintypes.LONG), ('bottom', wintypes.LONG)]
rect = RECT()
user32.GetWindowRect(wa_hwnd, ctypes.byref(rect))
print(f'WhatsApp Rect: left={rect.left}, top={rect.top}, right={rect.right}, bottom={rect.bottom}, width={rect.right-rect.left}, height={rect.bottom-rect.top}')

os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_restored.png')
print("Saved screen_restored.png")
