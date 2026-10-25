import pyodbc, json
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

today = '2026-10-17'

cur.execute("""
    SELECT o.BARCODE, o.VOUCHER_NO, o.PROCESS_NAME, o.CREATED_BY, o.CREATED_DATE,
           p.VOUCHER_NO, p.PROCESS_NAME, p.CREATED_BY, p.CREATED_DATE
    FROM View_Dboard_Common_Dashboard o
    JOIN View_Dboard_Common_Dashboard p 
      ON o.TRANS_DATE = p.TRANS_DATE 
     AND o.BARCODE = p.BARCODE
    WHERE o.TRANS_DATE = ?
      AND o.PROCESS_NAME = 'WMS Stock Outward'
      AND p.PROCESS_NAME = 'WMS Order Pickup'
""", (today,))
rows = cur.fetchall()
print(f"Overlap between WMS Stock Outward and WMS Order Pickup on {today}: {len(rows)} barcodes")
for r in rows[:10]:
    print(r)

# Check duplicate barcodes strictly within WMS Stock Inward on today
cur.execute("""
    SELECT BARCODE, COUNT(*), MIN(CREATED_DATE), MAX(CREATED_DATE), MIN(CREATED_BY), MAX(CREATED_BY)
    FROM View_Dboard_Common_Dashboard
    WHERE TRANS_DATE = ? AND PROCESS_NAME = 'WMS Stock Inward'
    GROUP BY BARCODE
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
""", (today,))
in_dupes = cur.fetchall()
print(f"\nDuplicates strictly within WMS Stock Inward on {today}: {len(in_dupes)} barcodes")
for r in in_dupes[:10]:
    print(r)

# Check duplicate barcodes strictly within WMS Stock Outward on today
cur.execute("""
    SELECT BARCODE, COUNT(*), MIN(CREATED_DATE), MAX(CREATED_DATE), MIN(CREATED_BY), MAX(CREATED_BY)
    FROM View_Dboard_Common_Dashboard
    WHERE TRANS_DATE = ? AND PROCESS_NAME = 'WMS Stock Outward'
    GROUP BY BARCODE
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
""", (today,))
out_dupes = cur.fetchall()
print(f"\nDuplicates strictly within WMS Stock Outward on {today}: {len(out_dupes)} barcodes")
for r in out_dupes[:10]:
    print(r)

# Check duplicate barcodes strictly within WMS Order Pickup on today
cur.execute("""
    SELECT BARCODE, COUNT(*), MIN(CREATED_DATE), MAX(CREATED_DATE), MIN(CREATED_BY), MAX(CREATED_BY)
    FROM View_Dboard_Common_Dashboard
    WHERE TRANS_DATE = ? AND PROCESS_NAME = 'WMS Order Pickup'
    GROUP BY BARCODE
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
""", (today,))
pickup_dupes = cur.fetchall()
print(f"\nDuplicates strictly within WMS Order Pickup on {today}: {len(pickup_dupes)} barcodes")
for r in pickup_dupes[:10]:
    print(r)

conn.close()
