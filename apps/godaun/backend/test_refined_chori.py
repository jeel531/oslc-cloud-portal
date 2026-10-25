import pyodbc, json, time
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

today = '2026-10-17'

t0 = time.time()
query = """
    WITH ScansWithSeq AS (
        SELECT 
            c.TRANS_DATE,
            c.VOUCHER_NO,
            c.PROCESS_NAME,
            CASE WHEN c.PROCESS_NAME = 'WMS Stock Inward' THEN 'INWARD' ELSE 'OUTWARD' END AS NORM_PROCESS,
            c.CREATED_BY,
            c.QTY_PIECES,
            c.CREATED_DATE,
            c.DESIGN_NO,
            c.SIZE,
            c.BARCODE,
            ROW_NUMBER() OVER (
                PARTITION BY c.TRANS_DATE, c.PROCESS_NAME, c.BARCODE 
                ORDER BY c.CREATED_DATE ASC
            ) AS SCAN_SEQ
        FROM View_Dboard_Common_Dashboard c
        WHERE c.TRANS_DATE = ?
          AND c.PROCESS_NAME IN ('WMS Stock Inward', 'WMS Order Pickup', 'WMS Stock Outward')
          AND (c.BARCODE IS NOT NULL AND c.BARCODE <> '')
    )
    SELECT TOP 20
        s.BARCODE,
        s.VOUCHER_NO,
        s.PROCESS_NAME,
        s.NORM_PROCESS,
        ISNULL(s.CREATED_BY, 'UNKNOWN') AS CREATED_BY,
        ISNULL(s.DESIGN_NO, 'N/A') AS DESIGN_NO,
        ISNULL(s.SIZE, '-') AS SIZE,
        s.QTY_PIECES,
        s.CREATED_DATE,
        s.SCAN_SEQ,
        ISNULL(d.SHELF_CODE, '-') AS SHELF_CODE,
        ISNULL(d.RACK_CODE, '-') AS RACK_CODE,
        CASE 
            WHEN CAST(s.CREATED_DATE AS TIME) >= '07:30:00' AND CAST(s.CREATED_DATE AS TIME) < '19:30:00' 
            THEN 'Day (સવાર)' 
            ELSE 'Night (રાત)' 
        END AS SHIFT_NAME
    FROM ScansWithSeq s
    LEFT JOIN View_Dboard_Trans_All_Detail d
      ON s.TRANS_DATE = d.TRANS_DATE
     AND s.VOUCHER_NO = d.VOUCHER_NO
     AND s.BARCODE = d.BARCODE
    WHERE s.SCAN_SEQ > 1
    ORDER BY s.CREATED_DATE DESC
"""
cur.execute(query, (today,))
rows = cur.fetchall()
print(f"Detail duplicates query took {time.time() - t0:.2f}s, found sample {len(rows)} rows:")
for r in rows[:10]:
    print(r)

# Count total duplicates per process
cur.execute("""
    WITH ScansWithSeq AS (
        SELECT 
            PROCESS_NAME,
            BARCODE,
            QTY_PIECES,
            ROW_NUMBER() OVER (
                PARTITION BY TRANS_DATE, PROCESS_NAME, BARCODE 
                ORDER BY CREATED_DATE ASC
            ) AS SCAN_SEQ
        FROM View_Dboard_Common_Dashboard
        WHERE TRANS_DATE = ?
          AND PROCESS_NAME IN ('WMS Stock Inward', 'WMS Order Pickup', 'WMS Stock Outward')
          AND (BARCODE IS NOT NULL AND BARCODE <> '')
    )
    SELECT PROCESS_NAME, 
           COUNT(*) AS TOTAL_DUPES,
           SUM(QTY_PIECES) AS DUPE_PCS
    FROM ScansWithSeq
    WHERE SCAN_SEQ > 1
    GROUP BY PROCESS_NAME
""", (today,))
print("\nDuplicate counts strictly partitioned by TRANS_DATE, PROCESS_NAME, BARCODE:")
for r in cur.fetchall():
    print(r)

conn.close()
