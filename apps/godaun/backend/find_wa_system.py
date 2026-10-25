import os

search_terms = ['9537780826', 's.whatsapp.net', 'Account 1 (Primary WhatsApp)', 'OSLC ERP JEEL VAGHANI']

paths_to_check = [
    r'd:\NOTA',
    r'd:\JEEL VAGHANI',
    r'd:\OSLC',
    r'C:\DigiBizzApp'
]

print("Starting search...")
found_any = False
for base in paths_to_check:
    if not os.path.exists(base):
        continue
    print(f"Scanning base: {base}")
    for root, dirs, files in os.walk(base):
        # prune noisy dirs
        dirs[:] = [d for d in dirs if d.lower() not in ['node_modules', '.git', 'bin', 'obj', 'cache', '.system_generated', 'dist', 'build']]
        for file in files:
            if file.endswith(('.js', '.ts', '.py', '.html', '.json', '.cs', '.php', '.txt')):
                fpath = os.path.join(root, file)
                try:
                    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        for term in search_terms:
                            if term in content:
                                print(f'FOUND "{term}" in: {fpath}')
                                found_any = True
                                break
                except:
                    pass

print("Search complete. Found any:", found_any)
