import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

# Check views and tables
cur.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%NOTIFICATION%'")
print("Notification Tables:", [r[0] for r in cur.fetchall()])

# Check definition of vw_MASTER_NOTIFICATION_LOG
cur.execute("SELECT OBJECT_DEFINITION(OBJECT_ID('vw_MASTER_NOTIFICATION_LOG'))")
defn = cur.fetchone()[0]
print("\nView definition (first 500 chars):")
print(defn[:500] if defn else "No definition")

conn.close()
