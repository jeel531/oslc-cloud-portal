import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE=DigiBizz_PROD_Om_Sai_Master;UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

# Check Triggers on MASTER_NOTIFICATION_LOG
cur.execute("""
    SELECT name, OBJECT_DEFINITION(object_id)
    FROM sys.triggers
    WHERE parent_id = OBJECT_ID('MASTER_NOTIFICATION_LOG')
""")
triggers = cur.fetchall()
print("Triggers on MASTER_NOTIFICATION_LOG:", len(triggers))
for t in triggers:
    print("Trigger:", t[0])
    print(t[1][:500] if t[1] else "")

# Check Stored Procedures mentioning MASTER_NOTIFICATION_LOG
cur.execute("""
    SELECT name
    FROM sys.procedures
    WHERE OBJECT_DEFINITION(object_id) LIKE '%MASTER_NOTIFICATION_LOG%'
""")
procs = [r[0] for r in cur.fetchall()]
print("\nStored Procedures mentioning MASTER_NOTIFICATION_LOG:", procs)

conn.close()
