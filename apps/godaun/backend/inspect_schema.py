import pyodbc, json
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()
cur.execute("SELECT TOP 1 * FROM View_Dboard_Common_Dashboard")
columns = [column[0] for column in cur.description]
print("Columns in View_Dboard_Common_Dashboard:")
for c in columns:
    print(c)
conn.close()
