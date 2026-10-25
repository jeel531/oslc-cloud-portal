import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE=DigiBizz_PROD_Om_Sai_Master;UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("""
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME LIKE '%WHATS%' 
       OR TABLE_NAME LIKE '%SMS%' 
       OR TABLE_NAME LIKE '%NOTIFICATION%'
       OR TABLE_NAME LIKE '%SETTING%'
       OR TABLE_NAME LIKE '%CONFIG%'
       OR TABLE_NAME LIKE '%INSTANCE%'
""")
print("Tables in DigiBizz_PROD_Om_Sai_Master:")
for r in cur.fetchall():
    print(r[0])

# Check MASTER_NOTIFICATION_LOG structure and recent rows
cur.execute("SELECT TOP 5 * FROM MASTER_NOTIFICATION_LOG ORDER BY UID DESC")
for r in cur.fetchall():
    print("Log row:", r)

conn.close()
