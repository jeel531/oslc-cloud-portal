import pyodbc, json
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

# Check tables or views containing shelf, rack, bin, location, shift
cur.execute("""
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME LIKE '%SHELF%' 
       OR TABLE_NAME LIKE '%RACK%' 
       OR TABLE_NAME LIKE '%BIN%' 
       OR TABLE_NAME LIKE '%LOCATION%'
       OR TABLE_NAME LIKE '%SHIFT%'
       OR TABLE_NAME LIKE '%WMS%'
""")
print("Matching tables/views:")
for r in cur.fetchall():
    print(r[0])

# Check all column names across all tables matching 'SHELF' or 'RACK' or 'BIN'
cur.execute("""
    SELECT TABLE_NAME, COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE COLUMN_NAME LIKE '%SHELF%' 
       OR COLUMN_NAME LIKE '%RACK%' 
       OR COLUMN_NAME LIKE '%BIN%' 
       OR COLUMN_NAME LIKE '%LOCATION%'
       OR COLUMN_NAME LIKE '%SHIFT%'
""")
print("\nMatching columns across DB:")
for r in cur.fetchall():
    print(r)
conn.close()
