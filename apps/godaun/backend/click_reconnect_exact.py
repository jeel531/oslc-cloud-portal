import ctypes
import time
import os

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

wa_hwnd = 132084

# Ensure foreground
fg_hwnd = user32.GetForegroundWindow()
fg_tid = user32.GetWindowThreadProcessId(fg_hwnd, None)
cur_tid = kernel32.GetCurrentThreadId()

user32.AttachThreadInput(cur_tid, fg_tid, True)
user32.ShowWindow(wa_hwnd, 3) # SW_MAXIMIZE
user32.SetForegroundWindow(wa_hwnd)
user32.BringWindowToTop(wa_hwnd)
user32.AttachThreadInput(cur_tid, fg_tid, False)
time.sleep(0.3)

# Click Reconnect at (236, 186)
user32.SetCursorPos(236, 186)
time.sleep(0.2)
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
time.sleep(3.0)

# Capture screen
os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_reconnected.png')
print("Reconnect clicked at (236, 186) and saved.")
