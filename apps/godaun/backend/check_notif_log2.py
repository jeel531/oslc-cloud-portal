import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("""
    SELECT TOP 10 UID, NOTIFICATION_TYPE, STATUS, CONTACT_DETAILS, NOTIFICATION_TITLE, NOTIFICATION_BODY, SENDER_INSTANCE, TIME_STAMP, ERROR_DESCRIPTION
    FROM vw_MASTER_NOTIFICATION_LOG
    WHERE NOTIFICATION_TYPE = 'WhatsApp'
    ORDER BY UID DESC
""")
for r in cur.fetchall():
    print(r)

# Check GENERAL_SETTING
cur.execute("SELECT TOP 5 * FROM vw_MASTER_GENERAL_SETTING")
cols2 = [c[0] for c in cur.description]
print("\nColumns in vw_MASTER_GENERAL_SETTING:", cols2)

conn.close()
