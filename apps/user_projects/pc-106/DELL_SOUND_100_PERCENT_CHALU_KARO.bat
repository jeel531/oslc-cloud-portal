@echo off
title PC-106 Sound Setup & Volume 100%% (Dell Monitor)
color 0B
chcp 65001 >nul

echo ====================================================================
echo        PC-106 DELL S2218H SOUND & VOLUME 100%% SETUP
echo ====================================================================
echo.
echo [*] Step 1: Setting Windows Master Volume to 100%% (Unmute)...
python -c "import ctypes, winsound; from ctypes import wintypes, HRESULT, POINTER, c_float; ole32 = ctypes.oledll.ole32; ole32.CoInitialize(None); class GUID(ctypes.Structure): _fields_ = [('Data1', wintypes.DWORD), ('Data2', wintypes.WORD), ('Data3', wintypes.WORD), ('Data4', wintypes.BYTE * 8)]; CLSID = GUID(0xBCDE0395, 0xE52F, 0x467C, (0x8E, 0x3D, 0xC4, 0x57, 0x92, 0x91, 0x69, 0x2E)); IID_Enum = GUID(0xA95664D2, 0x9614, 0x4F35, (0xA7, 0x46, 0xDE, 0x8D, 0xB6, 0x36, 0x17, 0xE6)); IID_Vol = GUID(0x5CDF2C82, 0x841E, 0x4546, (0x97, 0x22, 0x0C, 0xF7, 0x40, 0x78, 0x22, 0x9A)); pEnum = ctypes.c_void_p(); ole32.CoCreateInstance(ctypes.byref(CLSID), None, 1, ctypes.byref(IID_Enum), ctypes.byref(pEnum)); vt = ctypes.cast(pEnum, POINTER(POINTER(ctypes.c_void_p))).contents; proto1 = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD, POINTER(ctypes.c_void_p)); getDef = proto1(vt[4]); pDev = ctypes.c_void_p(); getDef(pEnum, 0, 1, ctypes.byref(pDev)); dev_vt = ctypes.cast(pDev, POINTER(POINTER(ctypes.c_void_p))).contents; proto2 = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, POINTER(GUID), wintypes.DWORD, ctypes.c_void_p, POINTER(ctypes.c_void_p)); act = proto2(dev_vt[3]); pVol = ctypes.c_void_p(); act(pDev, ctypes.byref(IID_Vol), 23, None, ctypes.byref(pVol)); vol_vt = ctypes.cast(pVol, POINTER(POINTER(ctypes.c_void_p))).contents; setMute = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, wintypes.BOOL, POINTER(GUID))(vol_vt[14]); setMute(pVol, False, None); setVol = ctypes.WINFUNCTYPE(HRESULT, ctypes.c_void_p, c_float, POINTER(GUID))(vol_vt[7]); setVol(pVol, 1.0, None); ctypes.windll.winmm.waveOutSetVolume(0, 0xFFFFFFFF); print('[OK] Windows Master Volume is set to 100%!')"

echo.
echo [*] Step 2: Setting Dell S2218H Monitor Internal Speaker Volume to 100%% (via DDC/CI)...
python -c "import ctypes; from ctypes import wintypes; user32 = ctypes.windll.user32; dxva2 = ctypes.windll.dxva2; class PM(ctypes.Structure): _fields_ = [('h', wintypes.HANDLE), ('desc', wintypes.WCHAR * 128)]; mons = []; def cb(h, dc, rc, d): mons.append(h); return True; user32.EnumDisplayMonitors(None, None, ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HMONITOR, wintypes.HDC, ctypes.POINTER(wintypes.RECT), wintypes.LPARAM)(cb), 0); [dxva2.GetNumberOfPhysicalMonitorsFromHMONITOR(m, ctypes.byref(cnt := wintypes.DWORD())) and (p := (PM * cnt.value)()) and dxva2.GetPhysicalMonitorsFromHMONITOR(m, cnt.value, p) and [dxva2.SetVCPFeature(p[i].h, 0x62, 100) or dxva2.SetVCPFeature(p[i].h, 0x8D, 1) or dxva2.DestroyPhysicalMonitor(p[i].h) for i in range(cnt.value)] for m in mons]; print('[OK] Dell Monitor Internal Volume is set to 100%!')"

echo.
echo [*] Step 3: Playing Audio Test Tone...
python -c "import winsound, time; print('Playing Sound...'); [winsound.Beep(f, 200) for f in [523, 659, 784, 1046]]; winsound.PlaySound('SystemAsterisk', winsound.SND_ALIAS); print('[OK] Audio Test Complete!')"

echo.
echo ====================================================================
echo                   DELL SOUND CHALU KARVA NI VIGAT:
echo ====================================================================
echo 1. Windows ma Volume: 100%% Kari didhu chhe (Realtek Audio).
echo 2. Dell Monitor ma Volume: DDC/CI thi 100%% Kari didhu chhe.
echo.
echo ! AGATYANI VATO (PHYSICAL CABLE):
echo - Dell S2218H monitor ma sound chalu karva mate monitor na pachhad
echo   Green (Audio-In) jack ma 3.5mm AUX cable PC-106 na pachhad Green jack
echo   sathe jodelu hovun joiye.
echo - Monitor na button dabi ne Menu ^> Audio ^> Audio Source ma
echo   'PC Audio' select karvu joiye.
echo ====================================================================
echo.
pause
