import pyodbc, json
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

# Check sample row of WMS Stock Inward from View_Dboard_Trans_All_Detail
cur.execute("""
    SELECT TOP 5 VOUCHER_NO, TRANS_DATE, TRANS_TYPE_NAME, ITEM_NAME, SIZE, SHELF_CODE, RACK_CODE, BARCODE, QTY_PIECES, USER_NAME
    FROM View_Dboard_Trans_All_Detail
    WHERE TRANS_DATE = '2026-10-17' AND TRANS_TYPE_NAME = 'WMS Stock Inward'
""")
for r in cur.fetchall():
    print("Trans_All_Detail:", r)

conn.close()
