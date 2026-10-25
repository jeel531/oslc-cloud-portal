import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE=DigiBizz_PROD_Om_Sai_Master;UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("""
    SELECT TOP 1 
        UID, GENERAL_SETTING_ID, TRANS_TYPE_ID, TRANS_UID, IS_ACTIVE, TIME_STAMP, LOGIN_LOG_ID,
        STATUS, CONTACT_DETAILS, NOTIFICATION_TITLE, NOTIFICATION_TYPE, SENDER_INSTANCE, COMPANY_ID
    FROM MASTER_NOTIFICATION_LOG
    WHERE NOTIFICATION_BODY IS NOT NULL
    ORDER BY UID DESC
""")
r = cur.fetchone()
cols = [c[0] for c in cur.description]
print("Sample row:")
for c, val in zip(cols, r):
    print(f"  {c}: {val}")

conn.close()
