import ctypes
from ctypes import wintypes

winmm = ctypes.windll.winmm
num = winmm.waveOutGetNumDevs()
print(f"Total WaveOut Devices: {num}")

class CAPS(ctypes.Structure):
    _fields_ = [
        ('wMid', wintypes.WORD),
        ('wPid', wintypes.WORD),
        ('vVer', wintypes.UINT),
        ('szPname', wintypes.WCHAR * 32),
        ('dwFormats', wintypes.DWORD),
        ('wChan', wintypes.WORD),
        ('wRes', wintypes.WORD),
        ('dwSupp', wintypes.DWORD)
    ]

for i in range(num):
    c = CAPS()
    if winmm.waveOutGetDevCapsW(i, ctypes.byref(c), ctypes.sizeof(c)) == 0:
        print(f"  Device {i}: {c.szPname} (Channels: {c.wChan})")

winmm.waveOutSetVolume(0, 0xFFFFFFFF)
print("SUCCESS: WaveOut Volume set to 100%!")
ctypes.windll.user32.MessageBeep(0xFFFFFFFF)
