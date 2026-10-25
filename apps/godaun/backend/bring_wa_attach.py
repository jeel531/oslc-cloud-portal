import ctypes
from ctypes import wintypes
import time
import os

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

wa_hwnd = 132084
fg_hwnd = user32.GetForegroundWindow()
fg_tid = user32.GetWindowThreadProcessId(fg_hwnd, None)
cur_tid = kernel32.GetCurrentThreadId()

print(f"Current FG HWND: {fg_hwnd}, FG TID: {fg_tid}, Cur TID: {cur_tid}")

user32.AttachThreadInput(cur_tid, fg_tid, True)
user32.ShowWindow(wa_hwnd, 3) # SW_MAXIMIZE
user32.SetForegroundWindow(wa_hwnd)
user32.BringWindowToTop(wa_hwnd)
user32.AttachThreadInput(cur_tid, fg_tid, False)

time.sleep(1.0)
new_fg = user32.GetForegroundWindow()
print(f"New FG HWND: {new_fg} (WA: {wa_hwnd})")

# Capture screen
os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_wa_attach.png')
print("Saved screen_wa_attach.png")
