import pyodbc, json, time
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

t0 = time.time()
cur.execute("""
    SELECT TOP 5 
        c.TRANS_DATE, c.PROCESS_NAME, c.VOUCHER_NO, c.BARCODE, c.CREATED_BY, c.CREATED_DATE,
        d.SHELF_CODE, d.RACK_CODE
    FROM View_Dboard_Common_Dashboard c
    LEFT JOIN View_Dboard_Trans_All_Detail d
      ON c.TRANS_DATE = d.TRANS_DATE
     AND c.VOUCHER_NO = d.VOUCHER_NO
     AND c.BARCODE = d.BARCODE
    WHERE c.TRANS_DATE = '2026-10-17'
      AND c.PROCESS_NAME IN ('WMS Stock Inward', 'WMS Stock Outward')
""")
rows = cur.fetchall()
print(f"Join query took {time.time() - t0:.2f}s, rows: {len(rows)}")
for r in rows:
    print(r)

conn.close()
