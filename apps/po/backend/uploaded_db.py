import sqlite3
import os
import json
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "uploaded_pos.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS uploaded_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            portal TEXT,
            po_no TEXT,
            po_date TEXT,
            dispatch_date TEXT,
            total_rows INTEGER,
            total_qty INTEGER,
            pending_qty INTEGER,
            uploaded_at TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS uploaded_po_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER,
            portal TEXT,
            po_no TEXT,
            po_date TEXT,
            dispatch_date TEXT,
            sku TEXT,
            asin TEXT,
            design_no TEXT,
            size TEXT,
            qty INTEGER,
            pending_qty INTEGER,
            box_no TEXT,
            voucher_no TEXT,
            remark TEXT,
            created_date TEXT,
            FOREIGN KEY (batch_id) REFERENCES uploaded_batches (id) ON DELETE CASCADE
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS po_dispatch_schedules (
            po_no TEXT PRIMARY KEY,
            dispatch_date TEXT,
            priority_level TEXT,
            notes TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)

    # Migrations for existing DB tables
    cur.execute("PRAGMA table_info(uploaded_batches)")
    b_cols = [r[1] for r in cur.fetchall()]
    if "dispatch_date" not in b_cols:
        cur.execute("ALTER TABLE uploaded_batches ADD COLUMN dispatch_date TEXT")

    cur.execute("PRAGMA table_info(uploaded_po_items)")
    i_cols = [r[1] for r in cur.fetchall()]
    if "dispatch_date" not in i_cols:
        cur.execute("ALTER TABLE uploaded_po_items ADD COLUMN dispatch_date TEXT")

    conn.commit()
    conn.close()

init_db()

def calculate_dispatch_metrics(
    po_date_str: str,
    dispatch_date_str: Optional[str] = None,
    is_completed: bool = False
) -> Dict[str, Any]:
    """
    Calculates priority metrics based on the target dispatch date:
    - Overdue (< 0 days): P1_CRITICAL (Red)
    - Due Today (0 days): P1_CRITICAL (Red)
    - Tomorrow (1 day): P2_HIGH (Orange/Amber)
    - 2-3 Days: P3_MEDIUM (Yellow)
    - 4+ Days: P4_NORMAL (Slate/Blue)
    - Completed: P5_COMPLETED (Emerald)
    """
    today = date.today()

    # If completed, priority is relaxed
    if is_completed:
        return {
            "dispatch_date": dispatch_date_str or po_date_str,
            "days_left": None,
            "priority_level": "P5_COMPLETED",
            "urgency_status": "completed",
            "priority_badge": "✅ Completed",
            "priority_color": "emerald",
            "alert_message": None,
            "priority_rank": 99
        }

    # If no dispatch date was provided, default to PO date + 2 days
    target_dt: Optional[date] = None
    if dispatch_date_str and str(dispatch_date_str).strip():
        try:
            target_dt = datetime.strptime(str(dispatch_date_str).strip()[:10], "%Y-%m-%d").date()
        except Exception:
            target_dt = None

    if not target_dt and po_date_str and str(po_date_str).strip():
        try:
            po_dt = datetime.strptime(str(po_date_str).strip()[:10], "%Y-%m-%d").date()
            target_dt = po_dt + timedelta(days=2)
        except Exception:
            target_dt = today + timedelta(days=1)

    if not target_dt:
        target_dt = today + timedelta(days=1)

    normalized_dispatch_date = target_dt.strftime("%Y-%m-%d")
    days_left = (target_dt - today).days

    if days_left < 0:
        overdue_days = abs(days_left)
        return {
            "dispatch_date": normalized_dispatch_date,
            "days_left": days_left,
            "priority_level": "P1_CRITICAL",
            "urgency_status": "overdue",
            "priority_badge": f"🚨 {overdue_days}d OVERDUE",
            "priority_color": "rose",
            "alert_message": f"🚨 અતિ તાકીદે: આ PO મોકલવાની તારીખ {overdue_days} દિવસ પહેલાં વીતી ગઈ છે! તુરંત ડિસ્પેચ કરો.",
            "priority_rank": 1
        }
    elif days_left == 0:
        return {
            "dispatch_date": normalized_dispatch_date,
            "days_left": 0,
            "priority_level": "P1_CRITICAL",
            "urgency_status": "today",
            "priority_badge": "🔥 DUE TODAY",
            "priority_color": "rose",
            "alert_message": "🔥 તાકીદનો એલર્ટ: આ PO આજે જ મોકલવાનો છે! પેકિંગ તાત્કાલિક પૂર્ણ કરો.",
            "priority_rank": 2
        }
    elif days_left == 1:
        return {
            "dispatch_date": normalized_dispatch_date,
            "days_left": 1,
            "priority_level": "P2_HIGH",
            "urgency_status": "tomorrow",
            "priority_badge": "⚠️ 1 DAY LEFT",
            "priority_color": "amber",
            "alert_message": "⚠️ એલર્ટ: આ PO આવતીકાલે મોકલવાનો છે (માત્ર ૧ દિવસ બાકી)!",
            "priority_rank": 3
        }
    elif days_left in (2, 3):
        return {
            "dispatch_date": normalized_dispatch_date,
            "days_left": days_left,
            "priority_level": "P3_MEDIUM",
            "urgency_status": "soon",
            "priority_badge": f"⏳ {days_left} DAYS",
            "priority_color": "yellow",
            "alert_message": f"⏳ ધ્યાન આપો: આ PO {days_left} દિવસમાં મોકલવાનો છે.",
            "priority_rank": 4
        }
    else:
        return {
            "dispatch_date": normalized_dispatch_date,
            "days_left": days_left,
            "priority_level": "P4_NORMAL",
            "urgency_status": "normal",
            "priority_badge": f"📅 {days_left} DAYS",
            "priority_color": "slate",
            "alert_message": None,
            "priority_rank": 5
        }

def save_po_dispatch_schedule(
    po_no: str,
    dispatch_date: str,
    notes: str = "",
    priority_level: Optional[str] = None
):
    conn = get_db()
    cur = conn.cursor()
    now_str = datetime.now().isoformat()
    cur.execute("""
        INSERT INTO po_dispatch_schedules (po_no, dispatch_date, priority_level, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(po_no) DO UPDATE SET
            dispatch_date = excluded.dispatch_date,
            priority_level = excluded.priority_level,
            notes = excluded.notes,
            updated_at = excluded.updated_at
    """, (po_no, dispatch_date, priority_level or "", notes, now_str, now_str))

    # Also sync into uploaded tables if exists
    cur.execute("UPDATE uploaded_batches SET dispatch_date = ? WHERE po_no = ?", (dispatch_date, po_no))
    cur.execute("UPDATE uploaded_po_items SET dispatch_date = ? WHERE po_no = ?", (dispatch_date, po_no))
    conn.commit()
    conn.close()

def get_po_dispatch_schedules() -> Dict[str, Dict[str, Any]]:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT po_no, dispatch_date, priority_level, notes, updated_at FROM po_dispatch_schedules")
    rows = cur.fetchall()
    conn.close()
    schedules = {}
    for r in rows:
        schedules[str(r["po_no"])] = {
            "po_no": str(r["po_no"]),
            "dispatch_date": str(r["dispatch_date"] or ""),
            "priority_level": str(r["priority_level"] or ""),
            "notes": str(r["notes"] or ""),
            "updated_at": str(r["updated_at"] or "")
        }
    return schedules

def save_uploaded_batch(
    filename: str,
    portal: str,
    po_no: str,
    po_date: str,
    items: List[Dict[str, Any]],
    dispatch_date: str = ""
) -> int:
    conn = get_db()
    cur = conn.cursor()
    
    total_qty = sum(int(i.get("qty", 0)) for i in items)
    pending_qty = sum(int(i.get("pending_qty", i.get("qty", 0))) for i in items)
    uploaded_at = datetime.now().isoformat()
    
    # If no dispatch date specified, default to PO date + 2 days
    if not dispatch_date:
        try:
            p_dt = datetime.strptime(po_date[:10], "%Y-%m-%d").date()
            dispatch_date = (p_dt + timedelta(days=2)).strftime("%Y-%m-%d")
        except Exception:
            dispatch_date = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

    cur.execute("""
        INSERT INTO uploaded_batches (filename, portal, po_no, po_date, dispatch_date, total_rows, total_qty, pending_qty, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (filename, portal, po_no, po_date, dispatch_date, len(items), total_qty, pending_qty, uploaded_at))
    batch_id = cur.lastrowid
    
    for item in items:
        item_qty = int(item.get("qty", 0))
        item_pending = int(item.get("pending_qty", item_qty))
        item_dispatch = item.get("dispatch_date") or dispatch_date

        cur.execute("""
            INSERT INTO uploaded_po_items (
                batch_id, portal, po_no, po_date, dispatch_date, sku, asin, design_no, size,
                qty, pending_qty, box_no, voucher_no, remark, created_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            batch_id,
            item.get("portal", portal),
            item.get("po_no", po_no),
            item.get("po_date", po_date),
            item_dispatch,
            item.get("sku", ""),
            item.get("asin", ""),
            item.get("design_no", ""),
            item.get("size", ""),
            item_qty,
            item_pending,
            item.get("box_no", ""),
            item.get("voucher_no", f"UPLOAD/{batch_id}"),
            item.get("remark", f"Uploaded from {filename}"),
            uploaded_at
        ))
    
    conn.commit()
    conn.close()

    # Record in persistent dispatch schedules table
    save_po_dispatch_schedule(po_no=po_no, dispatch_date=dispatch_date, notes=f"Imported from {filename}")

    return batch_id

def get_uploaded_batches() -> List[Dict[str, Any]]:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM uploaded_batches ORDER BY id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def delete_uploaded_batch(batch_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM uploaded_po_items WHERE batch_id = ?", (batch_id,))
    cur.execute("DELETE FROM uploaded_batches WHERE id = ?", (batch_id,))
    conn.commit()
    conn.close()

def get_uploaded_pos(dates: Optional[List[str]] = None, portal_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db()
    cur = conn.cursor()
    
    query = """
        SELECT 
            po_date as date,
            portal,
            po_no,
            MAX(voucher_no) as voucher_no,
            MAX(dispatch_date) as dispatch_date,
            COUNT(*) as item_count,
            SUM(qty) as total_qty,
            SUM(pending_qty) as pending_qty,
            MAX(created_date) as latest_created,
            'Sheet Upload' as created_by
        FROM uploaded_po_items
        WHERE 1=1
    """
    params = []
    if dates:
        placeholders = ",".join("?" for _ in dates)
        query += f" AND po_date IN ({placeholders})"
        params.extend(dates)
    if portal_filter and portal_filter.strip().upper() not in ("ALL", ""):
        pf = portal_filter.strip().upper()
        if "AMAZON" in pf or "AMEZON" in pf:
            query += " AND (UPPER(portal) LIKE '%AMAZON%' OR UPPER(portal) LIKE '%AMEZON%')"
        elif "FLIPKART" in pf:
            query += " AND UPPER(portal) LIKE '%FLIPKART%'"
        elif "MYNTRA" in pf:
            query += " AND UPPER(portal) LIKE '%MYNTRA%'"
        elif "BLINKIT" in pf:
            query += " AND UPPER(portal) LIKE '%BLINKIT%'"
        elif "NEO" in pf:
            query += " AND UPPER(portal) LIKE '%NEO%'"
        elif "DUBAI" in pf or "DUBALE" in pf:
            query += " AND (UPPER(portal) LIKE '%DUBAI%' OR UPPER(portal) LIKE '%DUBALE%')"
        else:
            query += " AND UPPER(portal) LIKE ?"
            params.append(f"%{pf}%")
        
    query += " GROUP BY po_date, portal, po_no ORDER BY po_date DESC, total_qty DESC"
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()

    # Load custom dispatch schedules overrides if any
    schedules = get_po_dispatch_schedules()
    
    results = []
    for r in rows:
        t_qty = int(r["total_qty"] or 0)
        p_qty = int(r["pending_qty"] or 0)
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

        po_no = r["po_no"]
        # Determine dispatch date (schedule override or row value or default)
        dispatch_date = ""
        if po_no in schedules and schedules[po_no].get("dispatch_date"):
            dispatch_date = schedules[po_no]["dispatch_date"]
        elif r["dispatch_date"]:
            dispatch_date = r["dispatch_date"]

        metrics = calculate_dispatch_metrics(
            po_date_str=r["date"],
            dispatch_date_str=dispatch_date,
            is_completed=is_completed
        )
            
        results.append({
            "date": r["date"],
            "portal": r["portal"],
            "po_no": po_no,
            "voucher_no": r["voucher_no"] or "",
            "item_count": int(r["item_count"] or 0),
            "total_qty": t_qty,
            "pending_qty": p_qty,
            "processed_qty": proc_qty,
            "completion_pct": pct,
            "total_amount": 0,
            "latest_created": r["latest_created"],
            "created_by": r["created_by"],
            "status": status,
            "status_color": status_color,
            "is_uploaded": True,
            "dispatch_date": metrics["dispatch_date"],
            "days_left": metrics["days_left"],
            "priority_level": metrics["priority_level"],
            "urgency_status": metrics["urgency_status"],
            "priority_badge": metrics["priority_badge"],
            "priority_color": metrics["priority_color"],
            "alert_message": metrics["alert_message"],
            "priority_rank": metrics["priority_rank"]
        })
    return results

def get_uploaded_po_items(po_no: str, po_date: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db()
    cur = conn.cursor()
    query = "SELECT * FROM uploaded_po_items WHERE po_no = ?"
    params = [po_no]
    if po_date:
        query += " AND po_date = ?"
        params.append(po_date)
    query += " ORDER BY qty DESC"
    cur.execute(query, params)
    rows = cur.fetchall()
    conn.close()
    
    items = []
    for r in rows:
        t_qty = int(r["qty"] or 0)
        p_qty = int(r["pending_qty"] or 0)
        proc_qty = max(0, t_qty - p_qty)
        pct = round((proc_qty / t_qty * 100), 1) if t_qty > 0 else 0
        items.append({
            "voucher_no": r["voucher_no"] or "",
            "trans_date": r["po_date"] or "",
            "portal": r["portal"] or "",
            "portal_po_no": r["po_no"] or "",
            "portal_asin": r["asin"] or "",
            "portal_sku": r["sku"] or "",
            "design_no": r["design_no"] or "",
            "size": r["size"] or "",
            "qty": t_qty,
            "pending_qty": p_qty,
            "processed_qty": proc_qty,
            "completion_pct": pct,
            "rate": 0,
            "amount": 0,
            "remark": r["remark"] or "",
            "created_date": r["created_date"] or "",
            "created_by": "Sheet Upload",
            "box_no": r["box_no"] or "",
            "dispatch_date": r["dispatch_date"] if "dispatch_date" in r.keys() else ""
        })
    return items
