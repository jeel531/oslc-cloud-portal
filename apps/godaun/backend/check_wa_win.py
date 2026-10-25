import ctypes
from ctypes import wintypes
user32 = ctypes.windll.user32
hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
def cb(hwnd, lParam):
    l = user32.GetWindowTextLengthW(hwnd)
    if l > 0:
        buf = ctypes.create_unicode_buffer(l + 1)
        user32.GetWindowTextW(hwnd, buf, l + 1)
        title = buf.value
        if 'whatsapp' in title.lower():
            cbuf = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, cbuf, 256)
            is_vis = user32.IsWindowVisible(hwnd)
            print(f'HWND: {hwnd}, Title: "{title}", Class: "{cbuf.value}", Visible: {is_vis}')
    return True
user32.EnumDesktopWindows(hDesk, WNDENUMPROC(cb), 0)
