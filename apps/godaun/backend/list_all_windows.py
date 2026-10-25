import ctypes
from ctypes import wintypes
import psutil

user32 = ctypes.windll.user32
WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

results = []
def enum_windows_proc(hwnd, lParam):
    length = user32.GetWindowTextLengthW(hwnd)
    if length > 0:
        buff = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buff, length + 1)
        title = buff.value
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            proc = psutil.Process(pid.value)
            pname = proc.name()
            results.append((pid.value, pname, title, hwnd))
        except:
            pass
    return True

user32.EnumWindows(WNDENUMPROC(enum_windows_proc), 0)
for pid, pname, title, hwnd in results:
    if any(x in pname.lower() for x in ['whatsapp', 'digi', 'chrome', 'edge', 'python', 'code', 'cmd', 'powershell']):
        print(f"PID: {pid} | Proc: {pname} | Title: {title} | HWND: {hwnd}")
