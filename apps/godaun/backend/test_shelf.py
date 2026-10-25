import pyodbc, json
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("SELECT DISTINCT TRANS_TYPE_NAME FROM View_Dboard_Trans_All_Detail WHERE TRANS_DATE = '2026-10-17'")
types = [r[0] for r in cur.fetchall()]
print("TRANS_TYPE_NAME values:", types)

# Check if SHELF_CODE is populated for these
cur.execute("""
    SELECT TRANS_TYPE_NAME, COUNT(*), COUNT(SHELF_CODE), COUNT(RACK_CODE)
    FROM View_Dboard_Trans_All_Detail 
    WHERE TRANS_DATE = '2026-10-17'
    GROUP BY TRANS_TYPE_NAME
""")
for r in cur.fetchall():
    print(r)

conn.close()
