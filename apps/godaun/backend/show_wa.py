import ctypes
from ctypes import wintypes
import time

user32 = ctypes.windll.user32
hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

# Find WhatsApp window
SW_RESTORE = 9
SW_SHOW = 5

WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
wa_hwnd = None
def cb(hwnd, lParam):
    global wa_hwnd
    l = user32.GetWindowTextLengthW(hwnd)
    if l > 0:
        buf = ctypes.create_unicode_buffer(l + 1)
        user32.GetWindowTextW(hwnd, buf, l + 1)
        if 'whatsapp' in buf.value.lower() and 'antigravity' not in buf.value.lower() and 'gdi' not in buf.value.lower():
            cbuf = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, cbuf, 256)
            if 'WinUIDesktop' in cbuf.value or 'Chrome_WidgetWin_1' in cbuf.value:
                print(f"Found WA HWND: {hwnd}, title: {buf.value}, class: {cbuf.value}")
                wa_hwnd = hwnd
                return False
    return True

user32.EnumDesktopWindows(hDesk, WNDENUMPROC(cb), 0)

if wa_hwnd:
    print(f"Activating HWND {wa_hwnd}...")
    user32.ShowWindow(wa_hwnd, SW_RESTORE)
    user32.SetForegroundWindow(wa_hwnd)
    time.sleep(1)
    
    # Run capture_screen.py to see it
    import os
    os.system('python backend/capture_screen.py')
    from PIL import Image
    im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
    im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_wa.png')
    print("Saved screen_wa.png")
else:
    print("WA window not found")
