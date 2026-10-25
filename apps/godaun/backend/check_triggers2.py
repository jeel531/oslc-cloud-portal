import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE=DigiBizz_PROD_Om_Sai_Trans_2026_27;UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("""
    SELECT name
    FROM sys.procedures
    WHERE OBJECT_DEFINITION(object_id) LIKE '%NOTIFICATION%'
       OR OBJECT_DEFINITION(object_id) LIKE '%WHATSAPP%'
""")
procs = [r[0] for r in cur.fetchall()]
print("Procedures in Trans DB:", procs)

conn.close()
