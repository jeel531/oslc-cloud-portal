import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE=DigiBizz_PROD_Om_Sai_Master;UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("SELECT SENDER_INSTANCE, COUNT(*) FROM MASTER_NOTIFICATION_LOG GROUP BY SENDER_INSTANCE")
print("SENDER_INSTANCE counts:", cur.fetchall())

cur.execute("""
    SELECT TOP 10 UID, STATUS, CONTACT_DETAILS, NOTIFICATION_TYPE, SENDER_INSTANCE, NOTIFICATION_TITLE, NOTIFICATION_BODY, TIME_STAMP
    FROM MASTER_NOTIFICATION_LOG
    WHERE NOTIFICATION_TYPE = 'WhatsApp'
    ORDER BY UID DESC
""")
print("\nRecent WhatsApp notifications:")
for r in cur.fetchall():
    print(r)

conn.close()
