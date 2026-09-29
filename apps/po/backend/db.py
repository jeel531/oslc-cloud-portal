import json
import os
import time
from datetime import datetime, date
from pathlib import Path
from typing import Any, List, Dict, Optional
import pyodbc

CONFIG_FILE = Path(__file__).resolve().parent / "config.json"

def load_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "server": "103.118.17.67,3595",
        "database": "DigiBizz_PROD_Om_Sai_Trans_2026_27",
        "username": "_oslc_report-user",
        "password": "_oslc_report-user@Abc@#123#",
        "driver": "SQL Server",
        "cache_seconds": 15
    }

def get_connection():
    cfg = load_config()
    driver = "SQL Server"
    try:
        installed = pyodbc.drivers()
        for d in ["ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server", "SQL Server"]:
            if d in installed:
                driver = d
                break
    except Exception:
        driver = cfg.get("driver", "SQL Server")

    conn_str = (
        f"DRIVER={{{driver}}};"
        f"SERVER={cfg['server']};"
        f"DATABASE={cfg['database']};"
        f"UID={cfg['username']};"
        f"PWD={cfg['password']};"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str, timeout=12)

def test_db_connection() -> dict:
    t0 = time.time()
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1, GETDATE()")
        row = cur.fetchone()
        latency_ms = round((time.time() - t0) * 1000, 1)
        cur.execute("SELECT COUNT(*) FROM View_Dboard_Portal_PO_Entry WITH (NOLOCK) WHERE CAST(TRANS_DATE AS DATE) = CAST(GETDATE() AS DATE)")
        today_records = cur.fetchone()[0]
        conn.close()
        return {
            "status": "online",
            "connected": True,
            "latency_ms": latency_ms,
            "server_time": str(row[1]) if row else "",
            "today_records": today_records,
            "error": None
        }
    except Exception as e:
        return {
            "status": "error",
            "connected": False,
            "latency_ms": round((time.time() - t0) * 1000, 1),
            "server_time": None,
            "today_records": 0,
            "error": str(e)
        }

def get_available_dates(limit: int = 180) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    query = """
        SELECT 
            CAST(TRANS_DATE AS DATE) AS tdate,
            COUNT(DISTINCT PORTAL_PO_NO) AS po_count,
            COUNT(*) AS row_count,
            ISNULL(SUM(QTY_PIECES), 0) AS total_qty,
            ISNULL(SUM(PENDING_QTY_PIECES), 0) AS pending_qty,
            ISNULL(SUM(AMOUNT_VALUE), 0) AS total_amt
        FROM View_Dboard_Portal_PO_Entry WITH (NOLOCK)
        WHERE TRANS_DATE >= DATEADD(day, -365, GETDATE())
        GROUP BY CAST(TRANS_DATE AS DATE)
        ORDER BY tdate DESC
    """
    cur.execute(query)
    results = []
    for r in cur.fetchall():
        d_str = str(r[0])
        total_q = float(r[3] or 0)
        pend_q = float(r[4] or 0)
        proc_q = max(0.0, total_q - pend_q)
        pct = round((proc_q / total_q * 100), 1) if total_q > 0 else 0
        results.append({
            "date": d_str,
            "po_count": int(r[1] or 0),
            "row_count": int(r[2] or 0),
            "total_qty": int(total_q),
            "pending_qty": int(pend_q),
            "processed_qty": int(proc_q),
            "completion_pct": pct,
            "total_amount": round(float(r[5] or 0), 2)
        })
    conn.close()
    return results[:limit]

def build_portal_sql_condition(portal_filter: Optional[str]) -> str:
    if not portal_filter or portal_filter.strip().upper() in ("ALL", ""):
        return ""
    pf = portal_filter.strip().upper()
    if "AMAZON" in pf or "AMEZON" in pf:
        return "AND (UPPER(PORTAL) LIKE '%AMAZON%' OR UPPER(PORTAL) LIKE '%AMEZON%')"
    elif "FLIPKART" in pf:
        return "AND UPPER(PORTAL) LIKE '%FLIPKART%'"
    elif "MYNTRA" in pf:
        return "AND UPPER(PORTAL) LIKE '%MYNTRA%'"
    elif "BLINKIT" in pf:
        return "AND UPPER(PORTAL) LIKE '%BLINKIT%'"
    elif "NEO" in pf:
        return "AND UPPER(PORTAL) LIKE '%NEO%'"
    elif "DUBAI" in pf or "DUBALE" in pf:
        return "AND (UPPER(PORTAL) LIKE '%DUBAI%' OR UPPER(PORTAL) LIKE '%DUBALE%')"
    else:
        return f"AND UPPER(PORTAL) LIKE '%{pf}%'"

def get_po_summary(dates: List[str], portal_filter: Optional[str] = None) -> Dict[str, Any]:
    if not dates:
        return {
            "total_pos": 0,
            "total_qty": 0,
            "pending_qty": 0,
            "processed_qty": 0,
            "completion_pct": 0,
            "total_amount": 0,
            "total_items": 0,
            "portals": []
        }
    
    date_placeholders = ",".join(f"'{d}'" for d in dates)
    portal_condition = build_portal_sql_condition(portal_filter)
    conn = get_connection()
    cur = conn.cursor()
    
    query = f"""
        SELECT 
            COUNT(DISTINCT PORTAL_PO_NO) AS total_pos,
            COUNT(*) AS total_items,
            ISNULL(SUM(QTY_PIECES), 0) AS total_qty,
            ISNULL(SUM(PENDING_QTY_PIECES), 0) AS pending_qty,
            ISNULL(SUM(AMOUNT_VALUE), 0) AS total_amt
        FROM View_Dboard_Portal_PO_Entry WITH (NOLOCK)
        WHERE CAST(TRANS_DATE AS DATE) IN ({date_placeholders})
          {portal_condition}
    """
    cur.execute(query)
    main_row = cur.fetchone()
    
    portal_query = f"""
        SELECT 
            ISNULL(PORTAL, 'OTHER') AS portal_name,
            COUNT(DISTINCT PORTAL_PO_NO) AS po_count,
            ISNULL(SUM(QTY_PIECES), 0) AS qty,
            ISNULL(SUM(PENDING_QTY_PIECES), 0) AS pending_qty,
            ISNULL(SUM(AMOUNT_VALUE), 0) AS amt
        FROM View_Dboard_Portal_PO_Entry WITH (NOLOCK)
        WHERE CAST(TRANS_DATE AS DATE) IN ({date_placeholders})
          {portal_condition}
        GROUP BY PORTAL
        ORDER BY qty DESC
    """
    cur.execute(portal_query)
    portal_breakdown = []
    for r in cur.fetchall():
        portal_breakdown.append({
            "portal": str(r[0]),
            "po_count": int(r[1] or 0),
            "qty": int(float(r[2] or 0)),
            "pending_qty": int(float(r[3] or 0)),
            "amount": round(float(r[4] or 0), 2)
        })
        
    conn.close()
    
    total_qty = int(float(main_row[2] or 0)) if main_row else 0
    pending_qty = int(float(main_row[3] or 0)) if main_row else 0
    processed_qty = max(0, total_qty - pending_qty)
    pct = round((processed_qty / total_qty * 100), 1) if total_qty > 0 else 0
    
    return {
        "dates": dates,
        "total_pos": int(main_row[0] or 0) if main_row else 0,
        "total_items": int(main_row[1] or 0) if main_row else 0,
        "total_qty": total_qty,
        "pending_qty": pending_qty,
        "processed_qty": processed_qty,
        "completion_pct": pct,
        "total_amount": round(float(main_row[4] or 0), 2) if main_row else 0,
        "portals": portal_breakdown
    }

def get_po_list(dates: List[str], portal_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    if not dates:
        return []
    
    date_placeholders = ",".join(f"'{d}'" for d in dates)
    portal_condition = build_portal_sql_condition(portal_filter)
    
    conn = get_connection()
    cur = conn.cursor()
    
    query = f"""
        SELECT 
            CAST(TRANS_DATE AS DATE) AS po_date,
            ISNULL(PORTAL, 'OTHER') AS portal,
            PORTAL_PO_NO,
            MAX(VOUCHER_NO) AS voucher_no,
            COUNT(*) AS item_count,
            ISNULL(SUM(QTY_PIECES), 0) AS total_qty,
            ISNULL(SUM(PENDING_QTY_PIECES), 0) AS pending_qty,
            ISNULL(SUM(AMOUNT_VALUE), 0) AS total_amt,
            MAX(CREATED_DATE) AS latest_created,
            MAX(CREATED_BY) AS created_by
        FROM View_Dboard_Portal_PO_Entry WITH (NOLOCK)
        WHERE CAST(TRANS_DATE AS DATE) IN ({date_placeholders})
          {portal_condition}
        GROUP BY CAST(TRANS_DATE AS DATE), PORTAL, PORTAL_PO_NO
        ORDER BY po_date DESC, total_qty DESC
    """
    cur.execute(query)
    rows = cur.fetchall()
    conn.close()

    try:
        from uploaded_db import get_po_dispatch_schedules, calculate_dispatch_metrics
        schedules = get_po_dispatch_schedules()
    except Exception:
        schedules = {}
        calculate_dispatch_metrics = None
    
    pos = []
    for r in rows:
        t_qty = int(float(r[5] or 0))
        p_qty = int(float(r[6] or 0))
        proc_qty = max(0, t_qty - p_qty)
        pct = round((proc_qty / t_qty * 100), 1) if t_qty > 0 else 0
        
        is_completed = (p_qty == 0)
        if is_completed:
            status = "Completed"
            status_color = "emerald"
        elif proc_qty > 0:
            status = "In Progress"
            status_color = "amber"
        else:
            status = "Pending"
            status_color = "rose"

        po_no = str(r[2])
        po_date = str(r[0])
        dispatch_date = ""
        if po_no in schedules and schedules[po_no].get("dispatch_date"):
            dispatch_date = schedules[po_no]["dispatch_date"]

        if calculate_dispatch_metrics:
            metrics = calculate_dispatch_metrics(
                po_date_str=po_date,
                dispatch_date_str=dispatch_date,
                is_completed=is_completed
            )
        else:
            metrics = {
                "dispatch_date": dispatch_date or po_date,
                "days_left": None,
                "priority_level": "P4_NORMAL",
                "urgency_status": "normal",
                "priority_badge": "📅 NORMAL",
                "priority_color": "slate",
                "alert_message": None,
                "priority_rank": 5
            }
            
        pos.append({
            "date": po_date,
            "portal": str(r[1]),
            "po_no": po_no,
            "voucher_no": str(r[3] or ""),
            "item_count": int(r[4] or 0),
            "total_qty": t_qty,
            "pending_qty": p_qty,
            "processed_qty": proc_qty,
            "completion_pct": pct,
            "total_amount": round(float(r[7] or 0), 2),
            "latest_created": str(r[8] or ""),
            "created_by": str(r[9] or ""),
            "status": status,
            "status_color": status_color,
            "dispatch_date": metrics["dispatch_date"],
            "days_left": metrics["days_left"],
            "priority_level": metrics["priority_level"],
            "urgency_status": metrics["urgency_status"],
            "priority_badge": metrics["priority_badge"],
            "priority_color": metrics["priority_color"],
            "alert_message": metrics["alert_message"],
            "priority_rank": metrics["priority_rank"]
        })
        
    return pos

def get_po_items(po_no: str, po_date: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    
    date_filter = f"AND CAST(TRANS_DATE AS DATE) = '{po_date}'" if po_date else ""
    query = f"""
        SELECT 
            VOUCHER_NO,
            TRANS_DATE,
            PORTAL,
            PORTAL_PO_NO,
            PORTAL_ASIN,
            PORTAL_SKU_CODE,
            DESIGN_NO,
            SIZE,
            ISNULL(QTY_PIECES, 0) AS QTY_PIECES,
            ISNULL(PENDING_QTY_PIECES, 0) AS PENDING_QTY_PIECES,
            ISNULL(RATE_VALUE, 0) AS RATE_VALUE,
            ISNULL(AMOUNT_VALUE, 0) AS AMOUNT_VALUE,
            REMARK,
            CREATED_DATE,
            CREATED_BY,
            BOX_NO
        FROM View_Dboard_Portal_PO_Entry WITH (NOLOCK)
        WHERE PORTAL_PO_NO = ? {date_filter}
        ORDER BY QTY_PIECES DESC
    """
    cur.execute(query, (po_no,))
    rows = cur.fetchall()
    conn.close()
    
    items = []
    for r in rows:
        t_qty = int(float(r[8] or 0))
        p_qty = int(float(r[9] or 0))
        proc_qty = max(0, t_qty - p_qty)
        pct = round((proc_qty / t_qty * 100), 1) if t_qty > 0 else 0
        items.append({
            "voucher_no": str(r[0] or ""),
            "trans_date": str(r[1] or ""),
            "portal": str(r[2] or ""),
            "portal_po_no": str(r[3] or ""),
            "portal_asin": str(r[4] or ""),
            "portal_sku": str(r[5] or ""),
            "design_no": str(r[6] or ""),
            "size": str(r[7] or ""),
            "qty": t_qty,
            "pending_qty": p_qty,
            "processed_qty": proc_qty,
            "completion_pct": pct,
            "rate": round(float(r[10] or 0), 2),
            "amount": round(float(r[11] or 0), 2),
            "remark": str(r[12] or ""),
            "created_date": str(r[13] or ""),
            "created_by": str(r[14] or ""),
            "box_no": str(r[15] or "")
        })
    return items


def get_wms_order_process_records(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    order_id: Optional[str] = None,
    order_type: Optional[str] = "PO",
    limit: int = 500
) -> List[Dict[str, Any]]:
    """Fetches WMS Order Process list from Digi matching the user's ERP screen (default ORDER_TYPE = 'PO')."""
    conn = get_connection()
    cur = conn.cursor()
    
    conditions = ["1=1"]
    params = []
    
    if order_type and order_type.strip():
        conditions.append("w.ORDER_TYPE = ?")
        params.append(order_type.strip())
        
    if from_date and from_date.strip():
        conditions.append("CAST(w.TRANS_DATE AS DATE) >= ?")
        params.append(from_date.strip())
        
    if to_date and to_date.strip():
        conditions.append("CAST(w.TRANS_DATE AS DATE) <= ?")
        params.append(to_date.strip())
        
    if order_id and order_id.strip():
        conditions.append("(w.BILL_NO LIKE ? OR w.VOUCHER_NO LIKE ?)")
        params.append(f"%{order_id.strip()}%")
        params.append(f"%{order_id.strip()}%")
        
    where_sql = " AND ".join(conditions)
    
    query = f"""
        SELECT TOP ({limit})
            w.ORDER_TRANS_UID,
            w.VOUCHER_NO,
            w.BILL_NO,
            CAST(w.TRANS_DATE AS DATE) AS TRANS_DATE,
            ISNULL(w.TOTAL_QTY_PIECES, 0) AS QTY_PIECES,
            ISNULL(w.TOTAL_QTY_PIECES_BAL, 0) AS BAL_QTY,
            w.ORDER_TYPE,
            w.ORDER_STATUS,
            w.ORDER_PORTAL,
            w.CREATED_BY,
            w.CREATED_DATE,
            p.ITEM_NAMEs,
            p.TOTAL_QTY_SIZE
        FROM VIEW_DIGIWEB_TRANS_WMS_ORDER_PROCESS w WITH (NOLOCK)
        LEFT JOIN View_Dboard_Trans_Process_Data p WITH (NOLOCK) ON w.VOUCHER_NO = p.VOUCHER_NO
        WHERE {where_sql}
        ORDER BY w.TRANS_DATE DESC, w.CREATED_DATE DESC
    """
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()
    
    records = []
    for r in rows:
        records.append({
            "order_trans_uid": r[0],
            "voucher_no": str(r[1] or ""),
            "bill_no": str(r[2] or ""),
            "trans_date": str(r[3] or ""),
            "qty": int(float(r[4] or 0)),
            "bal_qty": int(float(r[5] or 0)),
            "order_type": str(r[6] or ""),
            "order_status": str(r[7] or ""),
            "portal": str(r[8] or ""),
            "created_by": str(r[9] or ""),
            "created_on": str(r[10] or "")[:19],
            "details": str(r[11] or ""),
            "size": str(r[12] or "")
        })
    return records


def get_available_pos_for_reconciliation() -> List[Dict[str, Any]]:
    """Returns a list of all POs (Digi Live, Uploaded Sheets, and WMS Punches) for reconciliation selection."""
    conn = get_connection()
    cur = conn.cursor()
    
    # 1. Distinct recent WMS PO Punches
    cur.execute("""
        SELECT 
            LEFT(BILL_NO, CASE WHEN CHARINDEX(' (RACK:', BILL_NO) > 0 THEN CHARINDEX(' (RACK:', BILL_NO) - 1 ELSE LEN(BILL_NO) END) AS PUNCH_ID,
            ISNULL(ORDER_PORTAL, 'AMAZON') AS PORTAL,
            MAX(CAST(TRANS_DATE AS DATE)) AS LAST_DATE,
            SUM(TOTAL_QTY_PIECES) AS TOTAL_WMS_QTY,
            COUNT(DISTINCT VOUCHER_NO) AS VOUCHERS
        FROM VIEW_DIGIWEB_TRANS_WMS_ORDER_PROCESS WITH (NOLOCK)
        WHERE ORDER_TYPE = 'PO' AND BILL_NO IS NOT NULL AND BILL_NO <> ''
          AND TRANS_DATE >= DATEADD(day, -60, GETDATE())
        GROUP BY LEFT(BILL_NO, CASE WHEN CHARINDEX(' (RACK:', BILL_NO) > 0 THEN CHARINDEX(' (RACK:', BILL_NO) - 1 ELSE LEN(BILL_NO) END), ORDER_PORTAL
        ORDER BY LAST_DATE DESC
    """)
    wms_punches = []
    for r in cur.fetchall():
        wms_punches.append({
            "po_no": str(r[0]),
            "portal": str(r[1]),
            "date": str(r[2]),
            "wms_qty": int(float(r[3] or 0)),
            "voucher_count": int(r[4] or 0),
            "source": "WMS PUNCH"
        })
        
    # 2. Distinct Digi Live POs
    cur.execute("""
        SELECT 
            PORTAL_PO_NO,
            ISNULL(PORTAL, 'PORTAL') AS PORTAL,
            MAX(CAST(TRANS_DATE AS DATE)) AS LAST_DATE,
            SUM(QTY_PIECES) AS TOTAL_ORDERED,
            SUM(PENDING_QTY_PIECES) AS TOTAL_PENDING
        FROM View_Dboard_Portal_PO_Entry WITH (NOLOCK)
        WHERE TRANS_DATE >= DATEADD(day, -45, GETDATE())
        GROUP BY PORTAL_PO_NO, PORTAL
        ORDER BY LAST_DATE DESC
    """)
    live_pos = []
    for r in cur.fetchall():
        live_pos.append({
            "po_no": str(r[0]),
            "portal": str(r[1]),
            "date": str(r[2]),
            "total_qty": int(float(r[3] or 0)),
            "pending_qty": int(float(r[4] or 0)),
            "source": "DIGI LIVE"
        })
    conn.close()

    # 3. Uploaded Sheets from SQLite
    uploaded_pos = []
    try:
        from uploaded_db import get_uploaded_batches
        batches = get_uploaded_batches()
        for b in batches:
            uploaded_pos.append({
                "po_no": b.get("po_no") or b.get("filename"),
                "portal": b.get("portal") or "UPLOADED",
                "date": b.get("po_date") or "",
                "total_qty": b.get("total_qty", 0),
                "source": "UPLOADED SHEET",
                "batch_id": b.get("id")
            })
    except Exception:
        pass
        
    return {
        "wms_punches": wms_punches,
        "live_pos": live_pos,
        "uploaded_pos": uploaded_pos
    }


def get_po_cutting_reconciliation(po_no: str) -> Dict[str, Any]:
    """
    Reconciles PO items against WMS picked pieces (Type='PO') and real-time WIP stock.
    Formula:
      - Ordered Qty (Sheet / PO Entry)
      - WMS Picked Qty (VIEW_DIGIWEB_TRANS_WMS_ORDER_PROCESS Type='PO')
      - Balance Qty = max(0, Ordered Qty - WMS Qty)
      - WIP Qty = real-time stock in stitching / finishing (View_Dboard_Trans_WIP_WMS_STOCK)
      - Covered by WIP = min(Balance Qty, WIP Qty)
      - Cutting PO Required = max(0, Balance Qty - Covered by WIP)
    """
    conn = get_connection()
    cur = conn.cursor()
    
    po_clean = po_no.strip()
    
    # 1. First, check if po_no is a WMS Punch Order (e.g. AMZ_PO_PUNCH_2509_03)
    cur.execute("""
        SELECT 
            ITEM_NAME, SIZE, ISNULL(SKU_CODE, ITEM_NAME + '-' + SIZE) AS SKU,
            SUM(CASE WHEN TRANS_TYPE_NAME = 'WMS Order Process' THEN QTY_PIECES ELSE 0 END) AS ORDERED_QTY,
            SUM(CASE WHEN TRANS_TYPE_NAME = 'WMS Order Pickup' THEN QTY_PIECES ELSE 0 END) AS PICKED_QTY,
            SUM(QTY_PIECES) AS TOTAL_QTY
        FROM View_Dboard_Trans_Process_Detail_Data WITH (NOLOCK)
        WHERE BILL_NO LIKE ? + '%'
        GROUP BY ITEM_NAME, SIZE, SKU_CODE
    """, (po_clean,))
    punch_rows = cur.fetchall()
    
    items_map: Dict[str, Dict[str, Any]] = {}
    is_wms_punch = len(punch_rows) > 0
    portal_name = "AMAZON"
    po_date_str = ""
    
    if is_wms_punch:
        # User selected a WMS Punch directly:
        for r in punch_rows:
            d_name = str(r[0] or "").strip()
            s_name = str(r[1] or "").strip()
            sku_code = str(r[2] or f"{d_name}-{s_name}").strip()
            ord_q = float(r[3] or 0)
            pick_q = float(r[4] or 0)
            tot_q = float(r[5] or 0)
            
            # WMS Order Process is ordered qty from sheet; WMS Order Pickup is picked qty
            final_ord = ord_q if ord_q > 0 else tot_q
            final_pick = pick_q if (ord_q > 0 or pick_q > 0) else 0.0

            items_map[sku_code] = {
                "design_no": d_name,
                "size": s_name,
                "sku": sku_code,
                "ordered_qty": final_ord,
                "wms_qty": final_pick,
            }
            
        # Get portal and date from WMS table
        cur.execute("""
            SELECT TOP 1 ORDER_PORTAL, CAST(TRANS_DATE AS DATE)
            FROM VIEW_DIGIWEB_TRANS_WMS_ORDER_PROCESS WITH (NOLOCK)
            WHERE BILL_NO LIKE ? + '%'
        """, (po_clean,))
        meta = cur.fetchone()
        if meta:
            portal_name = str(meta[0] or "AMAZON")
            po_date_str = str(meta[1] or "")
            
    else:
        # Check Digi Live PO Entry
        cur.execute("""
            SELECT 
                DESIGN_NO, SIZE, 
                ISNULL(PORTAL_SKU_CODE, DESIGN_NO + '-' + SIZE) AS SKU,
                ISNULL(SUM(QTY_PIECES), 0) AS ORDERED_QTY,
                MAX(PORTAL), MAX(CAST(TRANS_DATE AS DATE))
            FROM View_Dboard_Portal_PO_Entry WITH (NOLOCK)
            WHERE PORTAL_PO_NO = ?
            GROUP BY DESIGN_NO, SIZE, PORTAL_SKU_CODE
        """, (po_clean,))
        live_rows = cur.fetchall()
        
        if live_rows:
            for r in live_rows:
                d_name = str(r[0] or "").strip()
                s_name = str(r[1] or "").strip()
                sku_code = str(r[2] or f"{d_name}-{s_name}").strip()
                o_q = float(r[3] or 0)
                portal_name = str(r[4] or "PORTAL")
                po_date_str = str(r[5] or "")
                items_map[sku_code] = {
                    "design_no": d_name,
                    "size": s_name,
                    "sku": sku_code,
                    "ordered_qty": o_q,
                    "wms_qty": 0.0
                }
        else:
            # Check SQLite uploaded PO sheet items
            try:
                import sqlite3
                sqlite_path = Path(__file__).resolve().parent.parent / "data" / "uploaded_pos.db"
                if sqlite_path.exists():
                    s_conn = sqlite3.connect(sqlite_path)
                    s_cur = s_conn.cursor()
                    s_cur.execute("""
                        SELECT design_no, size, sku, qty, portal, po_date 
                        FROM uploaded_po_items 
                        WHERE po_no = ?
                    """, (po_clean,))
                    s_rows = s_cur.fetchall()
                    for r in s_rows:
                        d_name = str(r[0] or "").strip()
                        s_name = str(r[1] or "").strip()
                        sku_code = str(r[2] or f"{d_name}-{s_name}").strip()
                        o_q = float(r[3] or 0)
                        portal_name = str(r[4] or "UPLOADED")
                        po_date_str = str(r[5] or "")
                        if sku_code in items_map:
                            items_map[sku_code]["ordered_qty"] += o_q
                        else:
                            items_map[sku_code] = {
                                "design_no": d_name,
                                "size": s_name,
                                "sku": sku_code,
                                "ordered_qty": o_q,
                                "wms_qty": 0.0
                            }
                    s_conn.close()
            except Exception:
                pass
                
        # If we have items from PO entry/sheet, find their WMS processed qty
        if items_map:
            design_list = list(set(it["design_no"] for it in items_map.values() if it["design_no"]))
            if design_list:
                d_placeholders = ",".join(f"'{d}'" for d in design_list[:200])
                cur.execute(f"""
                    SELECT 
                        ITEM_NAME, SIZE, ISNULL(SKU_CODE, ITEM_NAME + '-' + SIZE) AS SKU,
                        ISNULL(SUM(QTY_PIECES), 0) AS WMS_PICKED_QTY
                    FROM View_Dboard_Trans_Process_Detail_Data WITH (NOLOCK)
                    WHERE ITEM_NAME IN ({d_placeholders})
                      AND (BILL_NO LIKE ? + '%' OR BILL_NO LIKE '%' + ? + '%')
                    GROUP BY ITEM_NAME, SIZE, SKU_CODE
                """, (po_clean, po_clean))
                for w_row in cur.fetchall():
                    d_w, s_w, sku_w, q_w = str(w_row[0]), str(w_row[1]), str(w_row[2]), float(w_row[3] or 0)
                    if sku_w in items_map:
                        items_map[sku_w]["wms_qty"] += q_w
                    else:
                        for k, v in items_map.items():
                            if v["design_no"] == d_w and v["size"] == s_w:
                                v["wms_qty"] += q_w
                                break

    # 3. Check Real-Time WIP Stock for all designs in items_map
    distinct_designs = list(set(it["design_no"] for it in items_map.values() if it["design_no"]))
    wip_map: Dict[tuple, float] = {}
    if distinct_designs:
        d_placeholders = ",".join(f"'{d}'" for d in distinct_designs[:200])
        cur.execute(f"""
            SELECT 
                DESIGN_NAME, SIZE,
                ISNULL(SUM(WIP_STOCK), 0) AS WIP_QTY
            FROM View_Dboard_Trans_WIP_WMS_STOCK WITH (NOLOCK)
            WHERE DESIGN_NAME IN ({d_placeholders})
            GROUP BY DESIGN_NAME, SIZE
        """)
        for w_row in cur.fetchall():
            wip_map[(str(w_row[0]).strip(), str(w_row[1]).strip())] = float(w_row[2] or 0)
            
    conn.close()

    # 4. Compute Reconciliation & Cutting PO items
    reconciled_items = []
    total_ordered = 0
    total_wms = 0
    total_balance = 0
    total_wip_covered = 0
    total_cutting_required = 0

    for sku_code, it in items_map.items():
        o_qty = int(it["ordered_qty"])
        w_qty = int(it["wms_qty"])
        bal_qty = max(0, o_qty - w_qty)
        
        wip_stock = int(wip_map.get((it["design_no"], it["size"]), 0))
        covered_wip = min(bal_qty, wip_stock)
        cutting_req = max(0, bal_qty - covered_wip)
        
        if bal_qty == 0:
            status = "Completed"
            status_color = "emerald"
        elif cutting_req == 0:
            status = "Covered in WIP"
            status_color = "sky"
        elif covered_wip > 0:
            status = "Partial WIP + Cutting"
            status_color = "amber"
        else:
            status = "Cutting Required"
            status_color = "rose"
            
        total_ordered += o_qty
        total_wms += w_qty
        total_balance += bal_qty
        total_wip_covered += covered_wip
        total_cutting_required += cutting_req
        
        reconciled_items.append({
            "design_no": it["design_no"],
            "size": it["size"],
            "sku": it["sku"],
            "ordered_qty": o_qty,
            "wms_qty": w_qty,
            "balance_qty": bal_qty,
            "wip_stock": wip_stock,
            "covered_wip": covered_wip,
            "cutting_po_qty": cutting_req,
            "status": status,
            "status_color": status_color
        })

    # Sort: SKUs with Cutting Required FIRST, then Balance DESC
    reconciled_items.sort(key=lambda x: (-x["cutting_po_qty"], -x["balance_qty"], x["design_no"]))
    
    completion_pct = round((total_wms / total_ordered * 100), 1) if total_ordered > 0 else 0
    
    return {
        "po_no": po_clean,
        "portal": portal_name,
        "po_date": po_date_str,
        "summary": {
            "total_ordered": total_ordered,
            "total_wms": total_wms,
            "total_balance": total_balance,
            "total_wip_covered": total_wip_covered,
            "total_cutting_required": total_cutting_required,
            "completion_pct": completion_pct,
            "item_count": len(reconciled_items)
        },
        "items": reconciled_items
    }
