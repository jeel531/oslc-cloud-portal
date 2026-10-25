import os
import time

print("Opening whatsapp://send?phone=919033157999 ...")
os.startfile('whatsapp://send?phone=919033157999')
time.sleep(2.5)

os.system('python backend/capture_screen.py')
from PIL import Image
im = Image.open(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen.bmp')
im.save(r'C:\Users\PC-106\.gemini\antigravity-ide\brain\e2cf87aa-28c3-4b69-b08d-45f59851e737\screen_proto.png')
print("Screenshot saved to screen_proto.png")
