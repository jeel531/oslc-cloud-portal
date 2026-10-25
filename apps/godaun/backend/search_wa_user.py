import ctypes
import time
import os

user32 = ctypes.windll.user32
hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

# Press Escape to clear any Alt-Tab overlay
VK_ESCAPE = 0x1B
user32.keybd_event(VK_ESCAPE, 0, 0, 0)
user32.keybd_event(VK_ESCAPE, 0, 2, 0)
time.sleep(0.3)

# Click the search box at (150, 92)
user32.SetCursorPos(150, 92)
time.sleep(0.2)
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
time.sleep(0.3)

# Select all and delete in search box
user32.keybd_event(0x11, 0, 0, 0) # Ctrl down
user32.keybd_event(ord('A'), 0, 0, 0)
user32.keybd_event(ord('A'), 0, 2, 0)
user32.keybd_event(0x11, 0, 2, 0) # Ctrl up
time.sleep(0.1)
user32.keybd_event(0x08, 0, 0, 0) # Backspace
user32.keybd_event(0x08, 0, 2, 0)
time.sleep(0.2)

# Type 9033157999
for ch in '9033157999':
    vk = ord(ch)
    user32.keybd_event(vk, 0, 0, 0)
    user32.keybd_event(vk, 0, 2, 0)
    time.sleep(0.05)

time.sleep(1.5)

# Capture screen
os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_search_user.png')
print("Search executed and saved.")
