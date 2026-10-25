import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE=DigiBizz_PROD_Om_Sai_Trans_2026_27;UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

for proc in ['SP_Execute_Http_Post_API', 'SP_Get_Single_TRANS_NOTIFICATION']:
    cur.execute(f"SELECT OBJECT_DEFINITION(OBJECT_ID('{proc}'))")
    row = cur.fetchone()
    print(f"\n=================== {proc} ===================")
    print(row[0] if row else "None")

conn.close()
