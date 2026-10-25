import ctypes
import time
import os

user32 = ctypes.windll.user32
hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

# Click WhatsApp icon on taskbar at (368, 1060)
user32.SetCursorPos(368, 1060)
time.sleep(0.2)
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
time.sleep(1.5)

# Capture screen
os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_taskbar_click.png')
print("Taskbar WhatsApp clicked.")
