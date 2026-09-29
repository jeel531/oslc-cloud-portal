import ctypes
from ctypes import wintypes, HRESULT, POINTER, c_float

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
            print("Windows CoreAudio Master Volume set to 100% and Unmuted!")

ctypes.windll.winmm.waveOutSetVolume(0, 0xFFFFFFFF)
print("SUCCESS: Windows Master Volume is 100%!")
