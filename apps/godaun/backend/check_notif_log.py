import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("SELECT TOP 1 * FROM vw_MASTER_NOTIFICATION_LOG")
cols = [c[0] for c in cur.description]
print("Columns in vw_MASTER_NOTIFICATION_LOG:")
for i, c in enumerate(cols):
    print(f"[{i}] {c}")

cur.execute("""
    SELECT TOP 10 NOTIFICATION_LOG_ID, NOTIFICATION_TYPE, MOBILE_NO, MESSAGE_STATUS, SENDER_INSTANCE, RESPONSE, CREATED_DATE
    FROM vw_MASTER_NOTIFICATION_LOG
    ORDER BY NOTIFICATION_LOG_ID DESC
""")
for r in cur.fetchall():
    print(r)

conn.close()
