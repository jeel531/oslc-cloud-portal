import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE=DigiBizz_PROD_Om_Sai_Trans_2026_27;UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

cur.execute("SELECT OBJECT_DEFINITION(OBJECT_ID('SP_Get_All_TRANS_NOTIFICATION_LOG'))")
defn = cur.fetchone()[0]
print("SP_Get_All_TRANS_NOTIFICATION_LOG:")
print(defn if defn else "None")

conn.close()
