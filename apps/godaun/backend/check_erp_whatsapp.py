import pyodbc, json

cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

# 1. Search Tables
cur.execute("""
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME LIKE '%WHATSAPP%' 
       OR TABLE_NAME LIKE '%SMS%' 
       OR TABLE_NAME LIKE '%MSG%' 
       OR TABLE_NAME LIKE '%API%' 
       OR TABLE_NAME LIKE '%GATEWAY%' 
       OR TABLE_NAME LIKE '%NOTIFICATION%'
       OR TABLE_NAME LIKE '%CONFIG%'
       OR TABLE_NAME LIKE '%SETTING%'
       OR TABLE_NAME LIKE '%INTEGRATION%'
""")
tables = [r[0] for r in cur.fetchall()]
print("Matching Tables:", tables)

# 2. Search Columns
cur.execute("""
    SELECT TABLE_NAME, COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE COLUMN_NAME LIKE '%WHATSAPP%' 
       OR COLUMN_NAME LIKE '%SMS%' 
       OR COLUMN_NAME LIKE '%INSTANCE%'
       OR COLUMN_NAME LIKE '%API_KEY%'
       OR COLUMN_NAME LIKE '%TOKEN%'
       OR COLUMN_NAME LIKE '%WEBHOOK%'
""")
cols = cur.fetchall()
print("\nMatching Columns:")
for c in cols:
    print(c)

conn.close()
