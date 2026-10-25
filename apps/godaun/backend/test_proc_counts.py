import pyodbc, json
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("""
    SELECT PROCESS_NAME, COUNT(*), SUM(QTY_PIECES)
    FROM View_Dboard_Common_Dashboard
    WHERE TRANS_DATE = '2026-10-17'
    GROUP BY PROCESS_NAME
""")
for r in cur.fetchall():
    print(r)

conn.close()
