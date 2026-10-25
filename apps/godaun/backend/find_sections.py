import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('frontend/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if '<section' in l or 'data-view=' in l:
        print(f"{i+1}: {l.strip()}")
