import pyodbc, json, time
cfg = json.load(open('backend/digi_config.json'))
conn = pyodbc.connect(f"DRIVER={{SQL Server}};SERVER={cfg['server']};DATABASE={cfg['database']};UID={cfg['username']};PWD={cfg['password']};")
cur = conn.cursor()

today = '2026-10-17'

t0 = time.time()
cur.execute("""
    WITH ScansWithSeq AS (
        SELECT 
            TRANS_DATE,
            PROCESS_NAME,
            CASE WHEN PROCESS_NAME = 'WMS Stock Inward' THEN 'INWARD' ELSE 'OUTWARD' END AS NORM_PROCESS,
            CREATED_BY,
            QTY_PIECES,
            BARCODE,
            ROW_NUMBER() OVER (
                PARTITION BY TRANS_DATE, PROCESS_NAME, BARCODE 
                ORDER BY CREATED_DATE ASC
            ) AS SCAN_SEQ
        FROM View_Dboard_Common_Dashboard
        WHERE TRANS_DATE = ?
          AND PROCESS_NAME IN ('WMS Stock Inward', 'WMS Stock Outward')
          AND (BARCODE IS NOT NULL AND BARCODE <> '')
    )
    SELECT 
        ISNULL(CREATED_BY, 'UNKNOWN') AS NAME,
        COUNT(*) AS TOTAL_SCANS,
        SUM(CASE WHEN SCAN_SEQ = 1 THEN 1 ELSE 0 END) AS VALID_SCANS,
        SUM(CASE WHEN SCAN_SEQ > 1 THEN 1 ELSE 0 END) AS DUPE_SCANS,
        SUM(CASE WHEN SCAN_SEQ > 1 AND NORM_PROCESS = 'INWARD' THEN 1 ELSE 0 END) AS DUPE_IN_SCANS,
        SUM(CASE WHEN SCAN_SEQ > 1 AND NORM_PROCESS = 'OUTWARD' THEN 1 ELSE 0 END) AS DUPE_OUT_SCANS,
        SUM(CASE WHEN SCAN_SEQ > 1 THEN QTY_PIECES ELSE 0 END) AS DUPE_PCS,
        SUM(CASE WHEN SCAN_SEQ = 1 THEN QTY_PIECES ELSE 0 END) AS VALID_PCS,
        SUM(QTY_PIECES) AS GROSS_PCS
    FROM ScansWithSeq
    GROUP BY CREATED_BY
    HAVING SUM(CASE WHEN SCAN_SEQ > 1 THEN 1 ELSE 0 END) > 0
    ORDER BY DUPE_SCANS DESC
""", (today,))
rows = cur.fetchall()
print(f"Summary query took {time.time() - t0:.2f}s, found {len(rows)} workers with chori:")
for r in rows:
    print(r)

conn.close()
