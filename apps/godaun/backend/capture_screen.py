import ctypes
from ctypes import wintypes
import os

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32

hDesk = user32.OpenDesktopW('Default', 0, False, 0x01FF)
user32.SetThreadDesktop(hDesk)

# Get virtual screen dimensions
SM_XVIRTUALSCREEN = 76
SM_YVIRTUALSCREEN = 77
SM_CXVIRTUALSCREEN = 78
SM_CYVIRTUALSCREEN = 79

left = user32.GetSystemMetrics(SM_XVIRTUALSCREEN)
top = user32.GetSystemMetrics(SM_YVIRTUALSCREEN)
width = user32.GetSystemMetrics(SM_CXVIRTUALSCREEN)
height = user32.GetSystemMetrics(SM_CYVIRTUALSCREEN)

print(f"Screen: {width}x{height} at ({left},{top})")

hScreenDC = user32.GetDC(0)
hMemoryDC = gdi32.CreateCompatibleDC(hScreenDC)
hBitmap = gdi32.CreateCompatibleBitmap(hScreenDC, width, height)
hOldBitmap = gdi32.SelectObject(hMemoryDC, hBitmap)

# BitBlt from screen to memory DC
SRCCOPY = 0x00CC0020
gdi32.BitBlt(hMemoryDC, 0, 0, width, height, hScreenDC, left, top, SRCCOPY)

# Save as BMP
class BITMAPFILEHEADER(ctypes.Structure):
    _pack_ = 2
    _fields_ = [
        ('bfType', wintypes.WORD),
        ('bfSize', wintypes.DWORD),
        ('bfReserved1', wintypes.WORD),
        ('bfReserved2', wintypes.WORD),
        ('bfOffBits', wintypes.DWORD)
    ]

class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ('biSize', wintypes.DWORD),
        ('biWidth', wintypes.LONG),
        ('biHeight', wintypes.LONG),
        ('biPlanes', wintypes.WORD),
        ('biBitCount', wintypes.WORD),
        ('biCompression', wintypes.DWORD),
        ('biSizeImage', wintypes.DWORD),
        ('biXPelsPerMeter', wintypes.LONG),
        ('biYPelsPerMeter', wintypes.LONG),
        ('biClrUsed', wintypes.DWORD),
        ('biClrImportant', wintypes.DWORD)
    ]

bmi = BITMAPINFOHEADER()
bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
bmi.biWidth = width
bmi.biHeight = -height  # top-down
bmi.biPlanes = 1
bmi.biBitCount = 24
bmi.biCompression = 0
bmi.biSizeImage = width * height * 3

bmp_bytes = (ctypes.c_char * bmi.biSizeImage)()
gdi32.GetDIBits(hMemoryDC, hBitmap, 0, height, bmp_bytes, ctypes.byref(bmi), 0)

bfh = BITMAPFILEHEADER()
bfh.bfType = 0x4D42  # 'BM'
bfh.bfOffBits = ctypes.sizeof(BITMAPFILEHEADER) + ctypes.sizeof(BITMAPINFOHEADER)
bfh.bfSize = bfh.bfOffBits + bmi.biSizeImage
bfh.bfReserved1 = 0
bfh.bfReserved2 = 0

out_dir = r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737'
out_path = os.path.join(out_dir, 'screen.bmp')
with open(out_path, 'wb') as f:
    f.write(bytes(bfh))
    f.write(bytes(bmi))
    f.write(bytes(bmp_bytes))

print("Screenshot saved to:", out_path)

# Cleanup
gdi32.SelectObject(hMemoryDC, hOldBitmap)
gdi32.DeleteObject(hBitmap)
gdi32.DeleteDC(hMemoryDC)
user32.ReleaseDC(0, hScreenDC)
