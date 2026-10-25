import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE=DigiBizz_PROD_Om_Sai_Master;UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("SELECT DISTINCT STATUS FROM MASTER_NOTIFICATION_LOG")
print("Statuses:", cur.fetchall())

# Look for non-null NOTIFICATION_BODY or SENDER_INSTANCE
cur.execute("""
    SELECT TOP 5 UID, STATUS, CONTACT_DETAILS, NOTIFICATION_TITLE, NOTIFICATION_BODY, SENDER_INSTANCE, NOTIFICATION_TYPE
    FROM MASTER_NOTIFICATION_LOG
    WHERE NOTIFICATION_BODY IS NOT NULL OR NOTIFICATION_TITLE IS NOT NULL
    ORDER BY UID DESC
""")
print("\nRows with body/title:")
for r in cur.fetchall():
    print([str(x).encode('utf-8', errors='replace').decode('utf-8') for x in r])

# Check distinct SENDER_INSTANCE
cur.execute("SELECT DISTINCT SENDER_INSTANCE FROM MASTER_NOTIFICATION_LOG")
print("\nSender instances:", cur.fetchall())

conn.close()
