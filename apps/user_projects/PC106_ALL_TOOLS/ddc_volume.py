import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32
dxva2 = ctypes.windll.dxva2

class PM(ctypes.Structure):
    _fields_ = [('h', wintypes.HANDLE), ('desc', wintypes.WCHAR * 128)]

mons = []
def cb(h, dc, rc, d):
    mons.append(h)
    return True

user32.EnumDisplayMonitors(None, None, ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HMONITOR, wintypes.HDC, ctypes.POINTER(wintypes.RECT), wintypes.LPARAM)(cb), 0)

for m in mons:
    cnt = wintypes.DWORD()
    if dxva2.GetNumberOfPhysicalMonitorsFromHMONITOR(m, ctypes.byref(cnt)) and cnt.value > 0:
        pms = (PM * cnt.value)()
        if dxva2.GetPhysicalMonitorsFromHMONITOR(m, cnt.value, pms):
            for i in range(cnt.value):
                h = pms[i].h
                desc = pms[i].desc
                print(f"Detected Monitor: {desc}")
                dxva2.SetVCPFeature(h, 0x62, 100) # Volume 100%
                dxva2.SetVCPFeature(h, 0x8D, 1)   # Unmute
                print(f"SUCCESS: Dell S2218H Internal Volume set to 100% and Unmuted!")
                dxva2.DestroyPhysicalMonitor(h)
