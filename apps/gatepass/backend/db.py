# -*- coding: utf-8 -*-
"""
OSLC KARIGAR GATE PASS SYSTEM - Database & DigiBizz Services
Connects to DigiBizz Master & Trans databases with live caching.
Created By JEEL VAGHANI
"""
import os
import re
import io
import time
import base64
import pyodbc
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
try:
    from apps.gatepass.backend.config import DB_CONFIG, LOCAL_IMAGE_DIRS, FLOOR_KEYWORDS, DEFAULT_FLOOR
except ImportError:
    from config import DB_CONFIG, LOCAL_IMAGE_DIRS, FLOOR_KEYWORDS, DEFAULT_FLOOR

# Global In-Memory Employee Cache for instant search
_EMPLOYEE_CACHE: List[Dict[str, Any]] = []
_CACHE_TIMESTAMP: float = 0.0
CACHE_TTL: int = 1800  # 30 minutes


def get_connection(database: Optional[str] = None):
    """Establishes high-performance ODBC connection to DigiBizz SQL Server."""
    driver = "SQL Server"
    installed = pyodbc.drivers()
    for d in ["ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server", "SQL Server"]:
        if d in installed:
            driver = d
            break

    target_db = database or DB_CONFIG["database"]
    conn_str = (
        f"DRIVER={{{driver}}};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={target_db};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        "TrustServerCertificate=yes;"
        f"Connection Timeout={DB_CONFIG.get('timeout', 15)};"
    )
    return pyodbc.connect(conn_str)


def test_db_connection() -> Dict[str, Any]:
    """Tests live connectivity to DigiBizz databases."""
    t0 = time.time()
    try:
        conn = get_connection(DB_CONFIG["master_db"])
        cur = conn.cursor()
        cur.execute("SELECT COUNT(1) FROM [dbo].[MASTER_GENERAL_SETTING] WITH (NOLOCK) WHERE GENERAL_SETTING_TYPE_ID = 60")
        total_emp = cur.fetchone()[0]
        conn.close()

        conn_trans = get_connection(DB_CONFIG["database"])
        cur_t = conn_trans.cursor()
        cur_t.execute("""
            SELECT COUNT(1) 
            FROM [dbo].[View_Dboard_Trans_Process_Detail_Data] WITH (NOLOCK) 
            WHERE ENTRY_STATUS = 'FRESH' AND TRANS_TYPE_NAME IN ('Stitching Issue', 'Alter Issue') AND ISNULL(BAL_QTY_PIECES, 0) > 0
        """)
        pending_records = cur_t.fetchone()[0]
        conn_trans.close()

        elapsed = round(time.time() - t0, 2)
        return {
            "status": "connected",
            "message": f"Connected to DigiBizz Live in {elapsed}s",
            "total_employees": total_emp,
            "pending_141_records": pending_records,
            "response_time_sec": elapsed,
            "created_by": "JEEL VAGHANI",
        }
    except Exception as exc:
        return {
            "status": "error",
            "message": f"Connection error: {str(exc)}",
            "total_employees": 0,
            "pending_141_records": 0,
            "response_time_sec": round(time.time() - t0, 2),
            "created_by": "JEEL VAGHANI",
        }


def detect_floor_from_name(name: str, dept: str = "") -> str:
    """Detects floor from Karigar code/name/department."""
    name_up = (name or "").upper()
    dept_up = (dept or "").upper()
    
    if "BASEMENT" in dept_up or "BASEMENT" in name_up:
        return "BASEMENT"
    if "GROUND" in name_up or "-GF-" in name_up:
        return "GROUND FLOOR"
    if "2TH FLOOR" in name_up or "2ND FLOOR" in name_up or "-2TH-" in name_up or "-E2-" in name_up or " E2 " in name_up or "-E2 " in name_up:
        return "2ND FLOOR"
    if "3TH FLOOR" in name_up or "3RD FLOOR" in name_up or "-3TH-" in name_up or "-E3-" in name_up or "-O3-" in name_up or " E3 " in name_up or " O3 " in name_up:
        return "3RD FLOOR"
    if "4TH FLOOR" in name_up or "-4TH-" in name_up or "-E4-" in name_up or "-O4-" in name_up:
        return "4TH FLOOR"
    if "5TH FLOOR" in name_up or "-5TH-" in name_up or "-E5-" in name_up or "-O5-" in name_up or " E5 " in name_up:
        return "5TH FLOOR"
    if "CUTTING" in dept_up or "CHECKING" in dept_up:
        return "4TH FLOOR"

    for token, fl in FLOOR_KEYWORDS.items():
        pattern = rf"(?:^|[\-\s_/]){token}(?:[\-\s_/]|$)"
        if re.search(pattern, name_up):
            return fl

    return DEFAULT_FLOOR


def detect_department(dept_raw: Optional[str], code: str, name: str) -> str:
    """
    Detects worker's department based on DigiBizz TEXT_VALUE2, code (M vs P),
    or floor codes (E2, E3, O3, E5).
    """
    if dept_raw:
        dept_up = str(dept_raw).strip().upper()
        if dept_up in ["STITCHING", "STITCH"]:
            return "KARIGAR (STITCHING)"
        if dept_up in [
            "CHECKING", "CUTTING", "PRODUCTION", "THREAD CUTTING",
            "BUTTON & GAAJ & MARKING", "BUTTON & MARKING", "PRESS",
            "CLEANING", "DISPATCH", "PO", "WMS", "BASEMENT", "QC",
            "ACCOUNT", "SALES", "DHULAI"
        ]:
            return dept_up
        if dept_up != "NULL" and dept_up != "NONE":
            return dept_up

    c_up = (code or "").strip().upper()
    n_up = (name or "").strip().upper()

    if c_up.startswith("M") or "-E2-" in n_up or "-E3-" in n_up or "-O3-" in n_up or "-E5-" in n_up:
        return "KARIGAR (STITCHING)"
    if c_up.startswith("P"):
        return "PRODUCTION"

    return "KARIGAR"


def find_local_photo(code: str, name: str = "") -> Optional[bytes]:
    """Searches local image directories for worker photo if not in DB."""
    candidates = []
    if code:
        clean_code = re.sub(r"[^\w]", "", code).upper()
        if clean_code:
            candidates.append(clean_code)
        clean_num = re.sub(r"[^\d]", "", code)
        if clean_num:
            candidates.extend([f"M{clean_num}", f"P{clean_num}", f"B{clean_num}", f"BT{clean_num}", clean_num])
    if name:
        clean_name = name.split("-")[0].strip().upper()
        if clean_name and clean_name not in candidates:
            candidates.append(clean_name)

    for img_dir in LOCAL_IMAGE_DIRS:
        p = Path(img_dir)
        if not p.exists():
            continue
        for cand in candidates:
            for ext in [".jpg", ".jpeg", ".png", ".webp", ".JPG", ".PNG"]:
                target = p / f"{cand}{ext}"
                if target.exists():
                    try:
                        return target.read_bytes()
                    except Exception:
                        pass
            try:
                for f in p.iterdir():
                    if f.stem.upper().startswith(cand) and f.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                        return f.read_bytes()
            except Exception:
                pass
    return None


def search_workers_with_photos(query: str = "", limit: int = 30, active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Searches workers by number (e.g. 84, 101, 287, 431), code (M84, P414, B11, BT18), or name.
    If query is empty, returns the top active workers with photos so the app populates immediately.
    Supports comma-separated or space-separated multiple codes.
    """
    raw_q = (query or "").strip().upper()

    # Multi-token check: e.g. "84, 101" or "84 101 287" or "M84, M101"
    split_tokens = [t.strip() for t in re.split(r"[,+]+", raw_q) if t.strip()]
    if len(split_tokens) <= 1:
        # Also check space-separated if tokens look like codes/numbers
        space_tokens = [t.strip() for t in raw_q.split() if t.strip()]
        if len(space_tokens) > 1 and all(re.match(r"^[A-Z]?\d+$", t) for t in space_tokens):
            split_tokens = space_tokens

    if len(split_tokens) > 1:
        merged_results = []
        seen_ids = set()
        for tok in split_tokens[:10]:
            sub_res = search_workers_with_photos(tok, limit=10, active_only=active_only)
            for item in sub_res:
                if item["id"] not in seen_ids:
                    seen_ids.add(item["id"])
                    merged_results.append(item)
        return merged_results

    conn = get_connection(DB_CONFIG["master_db"])
    cur = conn.cursor()

    def fetch_rows(req_active: bool):
        act_filter = "AND m.IS_ACTIVE = 1" if req_active else ""
        if not raw_q:
            # Default empty search: return top active workers prioritizing those with photos
            sql = f"""
            SELECT TOP (?)
                m.GENERAL_SETTING_ID,
                UPPER(LTRIM(RTRIM(ISNULL(m.GENERAL_SETTING_CODE, '')))) AS CODE,
                LTRIM(RTRIM(ISNULL(m.GENERAL_SETTING_NAME, ''))) AS NAME,
                LTRIM(RTRIM(ISNULL(m.TEXT_VALUE2, ''))) AS DEPARTMENT_RAW,
                ISNULL(m.UPLOAD_DOC_UIDs, '') AS DOC_UID,
                m.IS_ACTIVE,
                COALESCE(d.FILE_DATA_THUMB, d.FILE_DATA) AS THUMB_DATA,
                d.FILE_DATA,
                d.UPLOAD_DOC_NAME
            FROM [dbo].[MASTER_GENERAL_SETTING] m WITH (NOLOCK)
            LEFT JOIN [dbo].[MASTER_UPLOAD_DOCUMENT] d WITH (NOLOCK)
                ON TRY_CAST(m.UPLOAD_DOC_UIDs AS INT) = d.UPLOAD_DOC_ID
            WHERE m.GENERAL_SETTING_TYPE_ID = 60
              {act_filter}
            ORDER BY 
                CASE WHEN d.FILE_DATA IS NOT NULL OR d.FILE_DATA_THUMB IS NOT NULL THEN 1 ELSE 0 END DESC,
                m.IS_ACTIVE DESC,
                m.GENERAL_SETTING_CODE ASC
            """
            cur.execute(sql, (limit,))
            return cur.fetchall()

        # Query has search term
        clean_num = re.sub(r"[^\d]", "", raw_q)
        m_code = f"M{clean_num}" if clean_num else raw_q
        p_code = f"P{clean_num}" if clean_num else raw_q
        b_code = f"B{clean_num}" if clean_num else raw_q
        bt_code = f"BT{clean_num}" if clean_num else raw_q
        like_q = f"%{raw_q}%"
        like_num = f"%{clean_num}%" if clean_num else like_q
        like_start = f"{raw_q}%"

        sql = f"""
        SELECT TOP (?)
            m.GENERAL_SETTING_ID,
            UPPER(LTRIM(RTRIM(ISNULL(m.GENERAL_SETTING_CODE, '')))) AS CODE,
            LTRIM(RTRIM(ISNULL(m.GENERAL_SETTING_NAME, ''))) AS NAME,
            LTRIM(RTRIM(ISNULL(m.TEXT_VALUE2, ''))) AS DEPARTMENT_RAW,
            ISNULL(m.UPLOAD_DOC_UIDs, '') AS DOC_UID,
            m.IS_ACTIVE,
            COALESCE(d.FILE_DATA_THUMB, d.FILE_DATA) AS THUMB_DATA,
            d.FILE_DATA,
            d.UPLOAD_DOC_NAME
        FROM [dbo].[MASTER_GENERAL_SETTING] m WITH (NOLOCK)
        LEFT JOIN [dbo].[MASTER_UPLOAD_DOCUMENT] d WITH (NOLOCK)
            ON TRY_CAST(m.UPLOAD_DOC_UIDs AS INT) = d.UPLOAD_DOC_ID
        WHERE m.GENERAL_SETTING_TYPE_ID = 60
          {act_filter}
          AND (
              LTRIM(RTRIM(m.GENERAL_SETTING_CODE)) = ?
              OR LTRIM(RTRIM(m.GENERAL_SETTING_CODE)) = ?
              OR LTRIM(RTRIM(m.GENERAL_SETTING_CODE)) = ?
              OR LTRIM(RTRIM(m.GENERAL_SETTING_CODE)) = ?
              OR LTRIM(RTRIM(m.GENERAL_SETTING_CODE)) = ?
              OR LTRIM(RTRIM(m.GENERAL_SETTING_CODE)) = ?
              OR m.GENERAL_SETTING_CODE LIKE ?
              OR m.GENERAL_SETTING_CODE LIKE ?
              OR m.GENERAL_SETTING_NAME LIKE ?
              OR m.GENERAL_SETTING_NAME LIKE ?
              OR ISNULL(m.TEXT_VALUE8, '') LIKE ?
              OR ISNULL(m.TEXT_VALUE9, '') LIKE ?
          )
        ORDER BY 
            CASE 
                WHEN LTRIM(RTRIM(m.GENERAL_SETTING_CODE)) = ? THEN 1
                WHEN LTRIM(RTRIM(m.GENERAL_SETTING_CODE)) = ? THEN 2
                WHEN m.GENERAL_SETTING_CODE LIKE ? THEN 3
                WHEN m.GENERAL_SETTING_NAME LIKE ? THEN 4
                ELSE 5
            END,
            m.IS_ACTIVE DESC,
            CASE WHEN d.FILE_DATA IS NOT NULL OR d.FILE_DATA_THUMB IS NOT NULL THEN 1 ELSE 0 END DESC,
            m.GENERAL_SETTING_CODE ASC
        """
        cur.execute(sql, (
            limit,
            raw_q, m_code, p_code, b_code, bt_code, clean_num,
            like_q, like_num, like_start, like_q, like_q, like_q,
            raw_q, m_code, like_start, like_start
        ))
        return cur.fetchall()

    rows = []
    if active_only:
        rows = fetch_rows(req_active=True)

    # Fallback to inactive if 0 results found (e.g. for M178)
    if not rows:
        rows = fetch_rows(req_active=False)

    conn.close()

    results = []
    for r in rows:
        gid, code_val, name_val, dept_raw, doc_uid, is_act, thumb_data, file_data, doc_name = r
        if not code_val and not name_val:
            continue

        dept = detect_department(dept_raw, code_val, name_val)
        floor = detect_floor_from_name(name_val, dept)

        photo_bytes = thumb_data or file_data
        if not photo_bytes:
            photo_bytes = find_local_photo(code_val, name_val)

        photo_b64 = None
        if photo_bytes:
            photo_b64 = base64.b64encode(photo_bytes).decode("utf-8")

        results.append({
            "id": gid,
            "code": code_val,
            "name": name_val,
            "department": dept,
            "floor": floor,
            "is_active": bool(is_act),
            "has_photo": bool(photo_b64),
            "photo_base64": photo_b64,
            "doc_uid": str(doc_uid).strip(),
            "created_by": "JEEL VAGHANI",
        })

    return results


def fetch_worker_full_profile_by_id(worker_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetches the EXACT worker chosen by the user by their unique GENERAL_SETTING_ID.
    Loads their high-resolution photo and their specific 141 Pending Mall status.
    """
    t0 = time.time()
    conn = get_connection(DB_CONFIG["master_db"])
    cur = conn.cursor()

    master_query = """
    SELECT 
        m.GENERAL_SETTING_ID,
        UPPER(LTRIM(RTRIM(ISNULL(m.GENERAL_SETTING_CODE, '')))) AS CODE,
        LTRIM(RTRIM(ISNULL(m.GENERAL_SETTING_NAME, ''))) AS NAME,
        LTRIM(RTRIM(ISNULL(m.TEXT_VALUE2, ''))) AS DEPARTMENT_RAW,
        ISNULL(m.UPLOAD_DOC_UIDs, '') AS DOC_UID,
        d.UPLOAD_DOC_NAME,
        COALESCE(d.FILE_DATA, d.FILE_DATA_THUMB) AS FILE_DATA,
        d.FILE_DATA_THUMB,
        m.IS_ACTIVE
    FROM [dbo].[MASTER_GENERAL_SETTING] m WITH (NOLOCK)
    LEFT JOIN [dbo].[MASTER_UPLOAD_DOCUMENT] d WITH (NOLOCK)
        ON TRY_CAST(m.UPLOAD_DOC_UIDs AS INT) = d.UPLOAD_DOC_ID
    WHERE m.GENERAL_SETTING_ID = ?
    """
    cur.execute(master_query, (worker_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    emp_id, emp_c, emp_name, dept_raw, doc_uid, doc_name, file_data, thumb_data, is_act = row

    dept = detect_department(dept_raw, emp_c, emp_name)
    floor = detect_floor_from_name(emp_name, dept)

    photo_bytes = file_data or thumb_data
    if not photo_bytes:
        photo_bytes = find_local_photo(emp_c, emp_name)

    photo_b64 = None
    if photo_bytes:
        photo_b64 = base64.b64encode(photo_bytes).decode("utf-8")

    # Fetch live 141 Pending Mall Report (Stitching Issue & Alter Issue)
    p_rows = []
    try:
        conn_trans = get_connection(DB_CONFIG["database"])
        cur_t = conn_trans.cursor()

        report_141_query = """
        SELECT 
            TRANS_TYPE_NAME,
            ISNULL(LOT_NO, '') AS LOT_NO,
            ISNULL(BARCODE, ISNULL(VOUCHER_NO, '')) AS BARCODE_NO,
            ISNULL(ITEM_NAME, '') AS ITEM_NAME,
            ISNULL(SKU_CODE, '') AS SKU_CODE,
            ISNULL(SIZE, '') AS SIZE,
            ISNULL(BAL_QTY_PIECES, 0) AS BAL_QTY_PIECES,
            CONVERT(VARCHAR(10), TRANS_DATE, 105) AS ISSUE_DATE,
            ISNULL(VOUCHER_NO, '') AS VOUCHER_NO,
            ISNULL(EMPLOYEE_NAME, '') AS EMP_NAME
        FROM [dbo].[View_Dboard_Trans_Process_Detail_Data] WITH (NOLOCK)
        WHERE ENTRY_STATUS = 'FRESH'
          AND TRANS_TYPE_NAME IN ('Stitching Issue', 'Alter Issue')
          AND ISNULL(BAL_QTY_PIECES, 0) > 0
          AND (
              EMPLOYEE_NAME = ?
              OR EMPLOYEE_NAME LIKE ?
              OR (EMPLOYEE_CODE = ? AND EMPLOYEE_NAME LIKE ?)
          )
        ORDER BY TRANS_TYPE_NAME, TRANS_DATE DESC
        """
        name_like = f"%{emp_name}%"
        name_snippet = f"%{emp_name.split('-')[1] if '-' in emp_name else emp_name}%"

        cur_t.execute(report_141_query, (emp_name, name_like, emp_c, name_snippet))
        p_rows = cur_t.fetchall()

        # If no records found by exact name, fallback to code match
        if not p_rows:
            fallback_query = """
            SELECT 
                TRANS_TYPE_NAME,
                ISNULL(LOT_NO, '') AS LOT_NO,
                ISNULL(BARCODE, ISNULL(VOUCHER_NO, '')) AS BARCODE_NO,
                ISNULL(ITEM_NAME, '') AS ITEM_NAME,
                ISNULL(SKU_CODE, '') AS SKU_CODE,
                ISNULL(SIZE, '') AS SIZE,
                ISNULL(BAL_QTY_PIECES, 0) AS BAL_QTY_PIECES,
                CONVERT(VARCHAR(10), TRANS_DATE, 105) AS ISSUE_DATE,
                ISNULL(VOUCHER_NO, '') AS VOUCHER_NO,
                ISNULL(EMPLOYEE_NAME, '') AS EMP_NAME
            FROM [dbo].[View_Dboard_Trans_Process_Detail_Data] WITH (NOLOCK)
            WHERE ENTRY_STATUS = 'FRESH'
              AND TRANS_TYPE_NAME IN ('Stitching Issue', 'Alter Issue')
              AND ISNULL(BAL_QTY_PIECES, 0) > 0
              AND (EMPLOYEE_CODE = ? OR EMPLOYEE_NAME LIKE ?)
            ORDER BY TRANS_TYPE_NAME, TRANS_DATE DESC
            """
            cur_t.execute(fallback_query, (emp_c, f"{emp_c}-%"))
            p_rows = cur_t.fetchall()

        conn_trans.close()
    except Exception as exc:
        print(f"Warning: 141 query failed for worker {emp_id}: {exc}")

    sti_pcs = 0.0
    sti_lots = 0
    alter_pcs = 0.0
    alter_lots = 0
    items = []

    for r in p_rows:
        ttype, lot, bcode, item, sku, sz, bal, dt, v_no, e_nm = r
        bal = float(bal)
        if ttype == "Stitching Issue":
            sti_pcs += bal
            sti_lots += 1
        elif ttype == "Alter Issue":
            alter_pcs += bal
            alter_lots += 1

        items.append({
            "process": ttype,
            "process_short": "STI" if ttype == "Stitching Issue" else "ALTER",
            "lot_no": lot,
            "barcode_no": bcode or v_no,
            "item_name": item,
            "sku_code": sku,
            "size": sz,
            "bal_qty": bal,
            "date": dt,
            "voucher_no": v_no,
            "emp_name": e_nm,
        })

    total_pending = round(sti_pcs + alter_pcs, 2)
    elapsed = round(time.time() - t0, 2)

    return {
        "id": emp_id,
        "code": emp_c,
        "name": emp_name,
        "department": dept,
        "floor": floor,
        "is_active": is_act,
        "has_photo": bool(photo_b64),
        "photo_base64": photo_b64,
        "has_pending_mall": total_pending > 0,
        "total_pending_pcs": total_pending,
        "sti_pending_pcs": round(sti_pcs, 2),
        "sti_lots_count": sti_lots,
        "alter_pending_pcs": round(alter_pcs, 2),
        "alter_lots_count": alter_lots,
        "pending_items": items,
        "elapsed_sec": elapsed,
        "created_by": "JEEL VAGHANI",
    }


def fetch_karigar_details(emp_code: str) -> Optional[Dict[str, Any]]:
    """Legacy code search fallback: loads the top active worker matching code."""
    workers = search_workers_with_photos(emp_code, limit=1)
    if not workers:
        return None
    return fetch_worker_full_profile_by_id(workers[0]["id"])


def search_karigars(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    """Legacy search wrapper."""
    return search_workers_with_photos(query, limit=limit)

