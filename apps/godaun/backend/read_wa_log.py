import ctypes
from ctypes import wintypes

GENERIC_READ = 0x80000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
FILE_SHARE_DELETE = 0x00000004
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80

CreateFileW = ctypes.windll.kernel32.CreateFileW
CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
CreateFileW.restype = wintypes.HANDLE

ReadFile = ctypes.windll.kernel32.ReadFile
ReadFile.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
ReadFile.restype = wintypes.BOOL

CloseHandle = ctypes.windll.kernel32.CloseHandle
CloseHandle.argtypes = [wintypes.HANDLE]
CloseHandle.restype = wintypes.BOOL

GetFileSize = ctypes.windll.kernel32.GetFileSize
GetFileSize.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
GetFileSize.restype = wintypes.DWORD

SetFilePointer = ctypes.windll.kernel32.SetFilePointer

path = r'C:\Users\PC-106\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\applog.txt'
handle = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, None, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, None)
if handle == -1:
    print("Failed to open file. Error:", ctypes.GetLastError())
else:
    size = GetFileSize(handle, None)
    offset = max(0, size - 10000)
    SetFilePointer(handle, offset, None, 0)
    buff = ctypes.create_string_buffer(10000)
    read = wintypes.DWORD()
    ReadFile(handle, buff, 10000, ctypes.byref(read), None)
    CloseHandle(handle)
    data = buff.raw[:read.value].decode('utf-8', errors='ignore')
    for line in data.splitlines()[-25:]:
        print(line)
