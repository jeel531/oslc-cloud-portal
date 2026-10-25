import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE=DigiBizz_PROD_Om_Sai_Master;UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()
cur.execute("SELECT * FROM MASTER_NOTIFICATION_LOG WHERE UID IN (8778, 8779)")
cols = [c[0] for c in cur.description]
for r in cur.fetchall():
    print("--- ROW ---")
    for c, v in zip(cols, r):
        if v is not None and c != 'FILE_DATA':
            print(f"  {c}: {v}")
conn.close()
