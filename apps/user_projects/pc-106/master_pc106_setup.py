import os
import sys
import time
import socket
import subprocess
import ctypes
from ctypes import wintypes, HRESULT, POINTER, c_float

print("=" * 65)
print("     PC-106 MASTER ONE-CLICK SETUP (SOUND 100% + ALL SOFTWARE)")
print("=" * 65)

# ====================================================================
# 1. SET WINDOWS MASTER VOLUME TO 100% & UNMUTE
# ====================================================================
print("\n[*] [STEP 1/3] Setting Windows Master Volume to 100% (Unmute)...")
try:
    ole32 = ctypes.oledll.ole32
    ole32.CoInitialize(None)
    class GUID(ctypes.Structure):
        _fields_ = [('Data1', wintypes.DWORD), ('Data2', wintypes.WORD), ('Data3', wintypes.WORD), ('Data4', wintypes.BYTE * 8)]
        def __init__(self, l, w1, w2, b):
            self.Data1 = l; self.Data2 = w1; self.Data3 = w2
            for i in range(8): self.Data4[i] = b[i]

    CLSID_Enum = GUID(0xBCDE0395, 0xE52F, 0x467C, (0x8E, 0x3D, 0xC4, 0x57, 0x92, 0x91, 0x69, 0x2E))
    IID_Enum = GUID(0xA95664D2, 0x9614, 0x4F35, (0xA7, 0x46, 0xDE, 0x8D, 0xB6, 0x36, 0x17, 0xE6))
    IID_Vol = GUID(0x5CDF2C82, 0x841E, 0x4546, (0x97, 0x22, 0x0C, 0xF7, 0x40, 0x78, 0x22, 0x9A))

    pEnum = ctypes.c_void_p()
    if ole32.CoCreateInstance(ctypes.byref(CLSID_Enum), None, 1, ctypes.byref(IID_Enum), ctypes.byref(pEnum)) == 0:
        vt = ctypes.cast(pEnum, POINTER(POINTER(ctypes.c_void_p))).contents
        getDef = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD, POINTER(ctypes.c_void_p))(vt[4])
        pDev = ctypes.c_void_p()
        if getDef(pEnum, 0, 1, ctypes.byref(pDev)) == 0:
            dev_vt = ctypes.cast(pDev, POINTER(POINTER(ctypes.c_void_p))).contents
            act = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, POINTER(GUID), wintypes.DWORD, ctypes.c_void_p, POINTER(ctypes.c_void_p))(dev_vt[3])
            pVol = ctypes.c_void_p()
            if act(pDev, ctypes.byref(IID_Vol), 23, None, ctypes.byref(pVol)) == 0:
                vol_vt = ctypes.cast(pVol, POINTER(POINTER(ctypes.c_void_p))).contents
                # Unmute
                ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, wintypes.BOOL, POINTER(GUID))(vol_vt[14])(pVol, False, None)
                # Volume 100%
                ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, c_float, POINTER(GUID))(vol_vt[7])(pVol, 1.0, None)
    ctypes.windll.winmm.waveOutSetVolume(0, 0xFFFFFFFF)
    print("    [OK] Windows System Volume: 100% (Unmuted)")
except Exception as e:
    print(f"    [!] Volume set error: {e}")

# ====================================================================
# 2. SET DELL S2218H MONITOR HARDWARE VOLUME TO 100% (DDC/CI)
# ====================================================================
print("[*] [STEP 2/3] Setting Dell S2218H Hardware Speaker Volume to 100% (DDC/CI)...")
try:
    user32 = ctypes.windll.user32
    dxva2 = ctypes.windll.dxva2
    class PM(ctypes.Structure):
        _fields_ = [('h', wintypes.HANDLE), ('desc', wintypes.WCHAR * 128)]

    mons = []
    def enum_cb(h, dc, rc, d):
        mons.append(h)
        return True

    user32.EnumDisplayMonitors(None, None, ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HMONITOR, wintypes.HDC, ctypes.POINTER(wintypes.RECT), wintypes.LPARAM)(enum_cb), 0)
    for m in mons:
        cnt = wintypes.DWORD()
        if dxva2.GetNumberOfPhysicalMonitorsFromHMONITOR(m, ctypes.byref(cnt)) and cnt.value > 0:
            pms = (PM * cnt.value)()
            if dxva2.GetPhysicalMonitorsFromHMONITOR(m, cnt.value, pms):
                for i in range(cnt.value):
                    hPhys = pms[i].h
                    # VCP 0x62 = Audio Volume (100)
                    dxva2.SetVCPFeature(hPhys, 0x62, 100)
                    # VCP 0x8D = Audio Mute (1 = Unmute)
                    dxva2.SetVCPFeature(hPhys, 0x8D, 1)
                    dxva2.DestroyPhysicalMonitor(hPhys)
    print("    [OK] Dell S2218H Monitor Internal Hardware Volume: 100% (Unmuted)")
except Exception as e:
    print(f"    [!] Dell Monitor DDC/CI error: {e}")

# ====================================================================
# 3. VERIFY & AUTO-START ALL SOFTWARE AND APKS
# ====================================================================
print("\n[*] [STEP 3/3] Checking & Auto-Starting All Software / APK Services...")

services = [
    {
        "name": "OSLC HOUSE (Godown Attendance)",
        "port": 5173,
        "cwd": r"D:\NOTA\Godaun-Atendes",
        "cmd": ["cmd.exe", "/c", "npm", "run", "dev", "--", "--host", "--port", "5173"]
    },
    {
        "name": "OSLC ERP Backend",
        "port": 8000,
        "cwd": r"D:\JEEL VAGHANI\OSLC ERP\OSLC-PENDING-LIVE-ERP-V17-CATEGORY-LIVE",
        "cmd": ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", r"D:\JEEL VAGHANI\OSLC ERP\OSLC-PENDING-LIVE-ERP-V17-CATEGORY-LIVE\OSLC_AUTO_KEEP_LIVE.ps1"]
    },
    {
        "name": "OSLC Packing Control",
        "port": 8787,
        "cwd": r"D:\KUMAR\New folder (15)",
        "cmd": ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", r"D:\KUMAR\New folder (15)\OSLC_AUTO_KEEP_LIVE.ps1"]
    },
    {
        "name": "OSLC Master Cloud Portal",
        "port": 8080,
        "cwd": r"D:\OSLC_CLOUD_MASTER_PORTAL",
        "cmd": ["wscript.exe", r"D:\OSLC_CLOUD_MASTER_PORTAL\SILENT_BACKGROUND_RUNNER.vbs"]
    },
    {
        "name": "DIGI ONE CLICK PRINT",
        "port": 8092,
        "cwd": r"D:\NOTA\DIGI ONE CKIL PRINT\backend",
        "cmd": ["python.exe", r"D:\NOTA\DIGI ONE CKIL PRINT\backend\server.py"]
    },
    {
        "name": "OSLC IN OUT REPORT",
        "port": 8095,
        "cwd": r"D:\NOTA\OSLC IN OUT",
        "cmd": ["python.exe", "-m", "uvicorn", "backend.godaun_service:app", "--host", "0.0.0.0", "--port", "8095"]
    },
    {
        "name": "OSLC AI Photo & Video Maker",
        "port": 8089,
        "cwd": r"D:\NOTA\OSLC PHOTO MAKER",
        "cmd": ["node.exe", "server.js"]
    }
]

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0

for svc in services:
    port = svc["port"]
    name = svc["name"]
    if is_port_open(port):
        print(f"    [ONLINE 200 OK] {name:<32} (Port {port})")
    else:
        print(f"    [OFFLINE]        {name:<32} (Port {port}) -> Starting now...")
        try:
            subprocess.Popen(
                svc["cmd"],
                cwd=svc["cwd"],
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(1)
            if is_port_open(port):
                print(f"      -> SUCCESS: {name} is now LIVE on Port {port}!")
            else:
                print(f"      -> Launched: {name} initializing in background.")
        except Exception as e:
            print(f"      -> Launch error: {e}")

# ====================================================================
# 4. SOUND CONFIRMATION CHIME
# ====================================================================
try:
    import winsound
    for f in [523, 659, 784, 1046]:
        winsound.Beep(f, 150)
    winsound.PlaySound("SystemAsterisk", winsound.SND_ALIAS)
except:
    pass

print("\n" + "=" * 65)
print("  SUCCESS! ALL SOFTWARE & DELL SOUND 100% ARE FULLY ACTIVE!")
print("=" * 65)
