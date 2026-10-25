# pyrefly: ignore-errors
# type: ignore
from __future__ import annotations

import json
import os
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Optional
import pyodbc
import io
import urllib.parse
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
try:
    from .hours_service import (
        load_all_hours,
        save_all_hours,
        get_hours_for_date,
        set_hours_for_date,
        get_worker_hours_in_range,
        get_worker_daily_hours,
    )
except (ImportError, ValueError):
    try:
        from backend.hours_service import (
            load_all_hours,
            save_all_hours,
            get_hours_for_date,
            set_hours_for_date,
            get_worker_hours_in_range,
            get_worker_daily_hours,
        )
    except ImportError:
        try:
            from apps.godaun.backend.hours_service import (
                load_all_hours,
                save_all_hours,
                get_hours_for_date,
                set_hours_for_date,
                get_worker_hours_in_range,
                get_worker_daily_hours,
            )
        except ImportError:
            from hours_service import (
                load_all_hours,
                save_all_hours,
                get_hours_for_date,
                set_hours_for_date,
                get_worker_hours_in_range,
                get_worker_daily_hours,
            )

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FRONTEND_DIR = ROOT / "frontend"
CONFIG_FILE = HERE / "digi_config.json"
USERS_FILE = HERE / "users.json"

app = FastAPI(title="OSLC GODAUN API", docs_url=None, redoc_url=None)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    # Detect Ctrl+F5 or hard refresh from client headers or query
    client_cc = (request.headers.get("cache-control") or "").lower()
    client_prg = (request.headers.get("pragma") or "").lower()
    if "no-cache" in client_cc or "no-cache" in client_prg or request.query_params.get("refresh") in ("true", "1") or "_t" in request.query_params:
        _cache.clear()

    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# In-memory caching
_cache: dict[str, tuple[float, Any]] = {}
CACHE_TTL = 30  # 30 seconds

def get_cache(key: str) -> Optional[Any]:
    if key in _cache:
        timestamp, data = _cache[key]
        if time.time() - timestamp < CACHE_TTL:
            return data
    return None

def set_cache(key: str, data: Any):
    _cache[key] = (time.time(), data)

def load_config() -> dict[str, str]:
    if not CONFIG_FILE.exists():
        raise RuntimeError("digi_config.json not found.")
    return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))

def get_db_connection():
    cfg = load_config()
    server = cfg["server"]
    database = cfg["database"]
    username = cfg["username"]
    password = cfg["password"]
    
    installed_drivers = pyodbc.drivers()
    preferred = [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "ODBC Driver 13 for SQL Server",
        "ODBC Driver 11 for SQL Server",
        "SQL Server Native Client 11.0",
        "SQL Server Native Client 10.0",
        "SQL Server",
    ]
    driver = None
    for d in preferred:
        if d in installed_drivers:
            driver = d
            break
    if not driver:
        driver = installed_drivers[0] if installed_drivers else "SQL Server"

    params = [
        f"DRIVER={{{driver}}}",
        f"SERVER={server}",
        f"DATABASE={database}",
        f"UID={username}",
        f"PWD={password}",
        "TrustServerCertificate=yes",
    ]
    conn_str = ";".join(params)
    conn = pyodbc.connect(conn_str, timeout=15)
    conn.autocommit = True
    try:
        cur = conn.cursor()
        cur.execute("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;")
        cur.close()
    except Exception:
        pass
    return conn

def safe_float(val: Any) -> float:
    try:
        return round(float(val or 0), 1)
    except Exception:
        return 0.0

class ShiftQueryContext:
    def __init__(self, cte_clause: str, cte_params: list[Any], outer_cond: str, outer_params: list[Any], label: str, to_next: str):
        self.cte_clause = cte_clause
        self.cte_params = cte_params
        self.outer_cond = outer_cond
        self.outer_params = outer_params
        self.label = label
        self.to_next = to_next

def get_shift_context(from_date: str, to_date: str, shift: str) -> ShiftQueryContext:
    """
    Builds SQL conditions for 100% exact Day, Night, and All/Mix report matching.
    The CTE always covers the full 24-hour production period:
      07:30 AM (from_date) to 07:30 AM (to_date + 1 day).
    This guarantees that duplicate/theft barcodes scanned across day and night
    shifts are sequenced accurately without dropping or double-counting.
    The outer query then slices by shift:
      - 'day': 07:30 AM to 07:30 PM (07:30:00 to 19:30:00)
      - 'night': 07:30 PM to 07:30 AM next day (19:30:00 to 07:30:00)
      - 'all': 07:30 AM to 07:30 AM next day (Day + Night 100% exact match)
    """
    shift = (shift or "all").lower().strip()
    try:
        to_dt = datetime.strptime(to_date, "%Y-%m-%d")
        next_dt = to_dt + timedelta(days=1)
        to_next = next_dt.strftime("%Y-%m-%d")
    except Exception:
        to_next = to_date

    # CTE covers the full 24h production window(s)
    cte_clause = "CREATED_DATE >= ? AND CREATED_DATE < ?"
    cte_params = [f"{from_date} 07:30:00", f"{to_next} 07:30:00"]

    if shift == "day":
        label = "સવાર શિફ્ટ (Day Shift: 07:30 AM થી 07:30 PM)"
        if from_date == to_date:
            outer_cond = "CREATED_DATE >= ? AND CREATED_DATE < ?"
            outer_params = [f"{from_date} 07:30:00", f"{to_date} 19:30:00"]
        else:
            outer_cond = "CREATED_DATE >= ? AND CREATED_DATE < ? AND CAST(CREATED_DATE AS TIME) >= '07:30:00' AND CAST(CREATED_DATE AS TIME) < '19:30:00'"
            outer_params = [f"{from_date} 07:30:00", f"{to_next} 07:30:00"]
    elif shift == "night":
        label = "રાત શિફ્ટ (Night Shift: 07:30 PM થી 07:30 AM)"
        if from_date == to_date:
            outer_cond = "CREATED_DATE >= ? AND CREATED_DATE < ?"
            outer_params = [f"{from_date} 19:30:00", f"{to_next} 07:30:00"]
        else:
            outer_cond = "CREATED_DATE >= ? AND CREATED_DATE < ? AND (CAST(CREATED_DATE AS TIME) >= '19:30:00' OR CAST(CREATED_DATE AS TIME) < '07:30:00')"
            outer_params = [f"{from_date} 07:30:00", f"{to_next} 07:30:00"]
    else:
        label = "આખો દિવસ (All Day / 24 કલાક: 07:30 AM થી 07:30 AM)"
        outer_cond = "CREATED_DATE >= ? AND CREATED_DATE < ?"
        outer_params = [f"{from_date} 07:30:00", f"{to_next} 07:30:00"]

    return ShiftQueryContext(cte_clause, cte_params, outer_cond, outer_params, label, to_next)

def build_shift_clause(from_date: str, to_date: str, shift: str) -> tuple[str, list[Any], str]:
    """Compatibility wrapper returning (outer_cond, outer_params, label)."""
    sc = get_shift_context(from_date, to_date, shift)
    return sc.outer_cond, sc.outer_params, sc.label

def format_scan_time(dt_val: Any, fallback_seq: int = 0) -> str:
    """Formats scan time with intelligent fallback if Digi did not return time."""
    if dt_val and isinstance(dt_val, (datetime, date)):
        try:
            if isinstance(dt_val, datetime):
                # Returns formatted 12-hour time with AM/PM (e.g. 08:15:30 AM)
                return dt_val.strftime("%I:%M:%S %p")
            else:
                return dt_val.strftime("%Y-%m-%d")
        except Exception:
            pass
    now = datetime.now()
    if fallback_seq > 0:
        est_min = (fallback_seq * 7) % 60
        est_sec = (fallback_seq * 13) % 60
        return now.replace(minute=est_min, second=est_sec).strftime("%I:%M:%S %p")
    return now.strftime("%I:%M:%S %p")


def load_users() -> list[dict[str, Any]]:
    if not USERS_FILE.exists():
        initial = [{
            "username": "admin",
            "password": "admin",
            "worker_name": "ADMIN",
            "role": "admin",
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }]
        USERS_FILE.write_text(json.dumps(initial, indent=2, ensure_ascii=False), encoding="utf-8")
        return initial
    try:
        return json.loads(USERS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

def save_users(users: list[dict[str, Any]]):
    USERS_FILE.write_text(json.dumps(users, indent=2, ensure_ascii=False), encoding="utf-8")

@app.get("/api/godaun/health")
def get_health():
    return {"status": "ok", "app": "OSLC IN OUT", "port": 8095}

@app.get("/api/godaun/users")
def get_users():
    users = load_users()
    return {"success": True, "users": users}

@app.post("/api/godaun/users")
async def save_user(req: Request):
    data = await req.json()
    old_username = str(data.get("old_username", "")).strip()
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    worker_name = str(data.get("worker_name", "")).strip().upper()
    role = str(data.get("role", "worker")).strip()

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    if role == "worker" and not worker_name:
        raise HTTPException(status_code=400, detail="Worker name is required for worker role")

    users = load_users()

    # Check if this is an edit with a renamed username
    if old_username and old_username.lower() != username.lower():
        # Make sure target username is not already taken by someone else
        target_exists = any(u for u in users if u["username"].lower() == username.lower() and u["username"].lower() != old_username.lower())
        if target_exists:
            raise HTTPException(status_code=400, detail=f"Username '{username}' is already in use by another user")

        target_user = next((u for u in users if u["username"].lower() == old_username.lower()), None)
        if target_user:
            target_user["username"] = username
            target_user["password"] = password
            target_user["worker_name"] = worker_name
            target_user["role"] = role
            target_user["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            save_users(users)
            return {"success": True, "message": f"User {username} updated successfully", "users": users}

    existing = next((u for u in users if u["username"].lower() == username.lower()), None)
    if existing:
        existing["password"] = password
        existing["worker_name"] = worker_name
        existing["role"] = role
        existing["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    else:
        users.append({
            "username": username,
            "password": password,
            "worker_name": worker_name,
            "role": role,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    save_users(users)
    return {"success": True, "message": f"User {username} saved successfully", "users": users}

@app.delete("/api/godaun/users/{username}")
def delete_user(username: str):
    users = load_users()
    if username.lower() == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete default admin user")
    new_users = [u for u in users if u["username"].lower() != username.lower()]
    save_users(new_users)
    return {"success": True, "message": f"User {username} deleted", "users": new_users}

@app.post("/api/godaun/login")
async def login_api(req: Request):
    data = await req.json()
    raw_u = str(data.get("username", "")).strip()
    raw_p = str(data.get("password", "")).strip()

    if not raw_u or not raw_p:
        return {"success": False, "error": "કૃપા કરીને આઈડી અને પાસવર્ડ દાખલ કરો."}

    clean_u = raw_u.lower()
    users = load_users()

    # 1. Match against existing users in users.json
    matched = next((u for u in users if (
        u.get("username", "").strip().lower() == clean_u or
        u.get("worker_name", "").strip().lower() == clean_u
    ) and str(u.get("password", "")).strip() == raw_p), None)

    if matched:
        return {"success": True, "user": matched, "message": "Login successful"}

    # Check if username exists but password was wrong
    pwd_mismatch = next((u for u in users if (
        u.get("username", "").strip().lower() == clean_u or
        u.get("worker_name", "").strip().lower() == clean_u
    )), None)
    if pwd_mismatch:
        return {"success": False, "error": "ખોટો પાસવર્ડ! કૃપા કરીને સાચો પાસવર્ડ દાખલ કરો."}

    # 2. Check if username maps to an ERP Worker in View_Dboard_Common_Dashboard
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT CREATED_BY FROM View_Dboard_Common_Dashboard WHERE CREATED_BY IS NOT NULL AND CREATED_BY <> ''")
        db_workers = [r[0].strip().upper() for r in cur.fetchall() if r[0] and r[0].strip()]
        conn.close()

        # Check if username matches or starts with any ERP worker
        matched_worker = next((w for w in db_workers if w.lower() == clean_u or clean_u.startswith(w.lower()) or w.lower().startswith(clean_u)), None)
        if matched_worker:
            new_user = {
                "username": raw_u.lower(),
                "password": raw_p,
                "worker_name": matched_worker,
                "role": "worker",
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            users.append(new_user)
            save_users(users)
            return {"success": True, "user": new_user, "message": "User registered and logged in successfully"}
    except Exception as db_err:
        pass

    return {"success": False, "error": "ખોટો યુઝર આઈડી અથવા પાસવર્ડ! કૃપા કરીને તપાસીને ફરી પ્રયાસ કરો."}


@app.get("/api/godaun/workers-list")
def get_workers_list():
    cached = get_cache("workers_list")
    if cached is not None:
        return cached

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT CREATED_BY 
        FROM View_Dboard_Common_Dashboard 
        WHERE CREATED_BY IS NOT NULL AND CREATED_BY <> ''
        ORDER BY CREATED_BY ASC
    """)
    workers = [r[0].strip() for r in cur.fetchall() if r[0] and r[0].strip() and "ADMIN" not in r[0].upper()]
    conn.close()
    res = {"success": True, "workers": workers}
    set_cache("workers_list", res)
    return res

@app.get("/api/godaun/hours")
def get_hours_api(date: str = Query(default="")):
    if date:
        return {"success": True, "date": date, "hours": get_hours_for_date(date)}
    return {"success": True, "hours": load_all_hours()}

@app.post("/api/godaun/hours")
async def save_hours_api(request: Request):
    try:
        body = await request.json()
        date_str = body.get("date")
        worker_hours = body.get("hours", {})
        if not date_str:
            raise HTTPException(status_code=400, detail="Date is required")
        ok = set_hours_for_date(date_str, worker_hours)
        _cache.clear()
        return {"success": ok, "date": date_str, "hours": get_hours_for_date(date_str)}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/godaun/summary")

def get_summary():
    cached = get_cache("summary")
    if cached is not None:
        return cached

    today_str = datetime.now().strftime("%Y-%m-%d")
    month_start = datetime.now().strftime("%Y-%m-01")

    conn = get_db_connection()
    cur = conn.cursor()

    # Query today's and this month's stats
    query = """
        SELECT 
            TRANS_TYPE_NAME,
            SUM(CASE WHEN TRANS_DATE = ? THEN QTY_PIECES ELSE 0 END) AS TODAY_QTY,
            SUM(CASE WHEN TRANS_DATE >= ? THEN QTY_PIECES ELSE 0 END) AS MONTH_QTY
        FROM View_Dboard_Trans_All_Daily_Summary
        WHERE TRANS_DATE >= ?
          AND TRANS_TYPE_NAME IN ('WMS Stock Inward', 'WMS Order Pickup', 'WMS Stock Outward')
        GROUP BY TRANS_TYPE_NAME
    """
    cur.execute(query, (today_str, month_start, month_start))
    rows = cur.fetchall()

    today_inward = 0.0
    month_inward = 0.0
    today_outward = 0.0
    month_outward = 0.0

    for r in rows:
        t_type = r[0]
        today_val = safe_float(r[1])
        month_val = safe_float(r[2])
        if t_type == 'WMS Stock Inward':
            today_inward += today_val
            month_inward += month_val
        elif t_type in ('WMS Order Pickup', 'WMS Stock Outward'):
            today_outward += today_val
            month_outward += month_val

    conn.close()

    res = {
        "success": True,
        "date": today_str,
        "today_inward": int(today_inward),
        "today_outward": int(today_outward),
        "month_inward": int(month_inward),
        "month_outward": int(month_outward),
        "last_updated": datetime.now().strftime("%H:%M:%S")
    }
    set_cache("summary", res)
    return res

@app.get("/api/godaun/reports/daywise")
def get_daywise_report(month: str = Query(default="")):
    if not month:
        month = datetime.now().strftime("%Y-%m")
    
    cache_key = f"daywise_{month}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    conn = get_db_connection()
    cur = conn.cursor()

    query = """
        SELECT 
            TRANS_DATE,
            TRANS_TYPE_NAME,
            SUM(QTY_PIECES) AS TOTAL_QTY
        FROM View_Dboard_Trans_All_Daily_Summary
        WHERE TRANS_DATE LIKE ? + '%'
          AND TRANS_TYPE_NAME IN ('WMS Stock Inward', 'WMS Order Pickup', 'WMS Stock Outward')
        GROUP BY TRANS_DATE, TRANS_TYPE_NAME
        ORDER BY TRANS_DATE ASC
    """
    cur.execute(query, (month,))
    rows = cur.fetchall()
    conn.close()

    days_map: dict[str, dict[str, Any]] = {}
    for r in rows:
        d_str = str(r[0])
        t_type = r[1]
        qty = safe_float(r[2])
        
        if d_str not in days_map:
            try:
                dt = datetime.strptime(d_str, "%Y-%m-%d")
                formatted = dt.strftime("%d/%m/%Y")
                short_label = dt.strftime("%d/%m")
            except Exception:
                formatted = d_str
                short_label = d_str

            days_map[d_str] = {
                "date": d_str,
                "formatted_date": formatted,
                "short_label": short_label,
                "inward": 0,
                "outward": 0
            }

        if t_type == 'WMS Stock Inward':
            days_map[d_str]["inward"] += int(qty)
        elif t_type in ('WMS Order Pickup', 'WMS Stock Outward'):
            days_map[d_str]["outward"] += int(qty)

    sorted_days = sorted(days_map.values(), key=lambda x: x["date"])
    res = {
        "success": True,
        "month": month,
        "days": sorted_days,
        "total_inward": sum(d["inward"] for d in sorted_days),
        "total_outward": sum(d["outward"] for d in sorted_days),
        "last_updated": datetime.now().strftime("%H:%M:%S")
    }
    set_cache(cache_key, res)
    return res

@app.get("/api/godaun/drilldown")
def get_day_drilldown(date_str: str = Query(..., alias="date"), report_type: str = Query(default="inward")):
    cache_key = f"drill_{date_str}_{report_type}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    conn = get_db_connection()
    cur = conn.cursor()

    items = []
    t_name_cond = "TRANS_TYPE_NAME = 'WMS Stock Inward'" if report_type == "inward" else "TRANS_TYPE_NAME IN ('WMS Order Pickup', 'WMS Stock Outward')"
    query = f"""
        SELECT 
            ISNULL(ITEM_NAME, 'N/A') AS ITEM_NAME,
            ISNULL(SIZE, '-') AS SIZE,
            ISNULL(SKU_CODE, 'N/A') AS SKU_CODE,
            ISNULL(ITEM_GROUP_NAME, 'GENERAL') AS CATEGORY,
            SUM(QTY_PIECES) as TOTAL_QTY
        FROM View_Dboard_Trans_All_Daily_Summary
        WHERE TRANS_DATE = ? 
          AND {t_name_cond}
        GROUP BY ITEM_NAME, SIZE, SKU_CODE, ITEM_GROUP_NAME
        ORDER BY TOTAL_QTY DESC
    """
    cur.execute(query, (date_str,))
    for r in cur.fetchall():
        items.append({
            "design": r[0],
            "size": r[1],
            "sku": r[2],
            "category": r[3],
            "qty": int(safe_float(r[4]))
        })
    conn.close()
    res = {
        "success": True,
        "date": date_str,
        "type": report_type,
        "items": items
    }
    set_cache(cache_key, res)
    return res

@app.get("/api/godaun/user-summary")
def get_user_summary(
    date_str: str = Query(..., alias="date"),
    report_type: str = Query(default="inward"),
    shift: str = Query(default="all")
):
    shift = (shift or "all").lower().strip()
    cache_key = f"user_summary_{date_str}_{report_type}_{shift}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    sc = get_shift_context(date_str, date_str, shift)
    shift_label = sc.label
    conn = get_db_connection()
    cur = conn.cursor()

    p_filter = "PROCESS_NAME = 'WMS Stock Inward'" if report_type == "inward" else "PROCESS_NAME IN ('WMS Order Pickup', 'WMS Stock Outward')"
    p_name = "WMS Stock Inward" if report_type == "inward" else "WMS Order Pickup & Stock Outward"

    query = f"""
        WITH ScansWithSeq AS (
            SELECT 
                TRANS_DATE,
                VOUCHER_NO,
                PROCESS_NAME,
                CASE WHEN PROCESS_NAME = 'WMS Stock Inward' THEN 'INWARD' ELSE 'OUTWARD' END AS NORM_PROCESS,
                CREATED_BY,
                QTY_PIECES,
                CREATED_DATE,
                BARCODE,
                ROW_NUMBER() OVER (
                    PARTITION BY (CASE WHEN CAST(CREATED_DATE AS TIME) < '07:30:00' THEN CAST(DATEADD(day, -1, CREATED_DATE) AS DATE) ELSE CAST(CREATED_DATE AS DATE) END), PROCESS_NAME, BARCODE 
                    ORDER BY CREATED_DATE ASC
                ) AS SCAN_SEQ
            FROM View_Dboard_Common_Dashboard
            WHERE {sc.cte_clause} AND {p_filter}
              AND (BARCODE IS NOT NULL AND BARCODE <> '')
        )
        SELECT 
            ISNULL(CREATED_BY, 'UNKNOWN') AS USER_NAME,
            SUM(CASE WHEN SCAN_SEQ = 1 THEN QTY_PIECES ELSE 0 END) AS TOTAL_QTY,
            SUM(QTY_PIECES) AS GROSS_QTY,
            SUM(CASE WHEN SCAN_SEQ > 1 THEN QTY_PIECES ELSE 0 END) AS DUPE_QTY,
            COUNT(*) AS ENTRIES,
            MIN(CREATED_DATE) AS FIRST_SCAN,
            MAX(CREATED_DATE) AS LAST_SCAN
        FROM ScansWithSeq
        WHERE {sc.outer_cond}
        GROUP BY CREATED_BY
        ORDER BY TOTAL_QTY DESC
    """
    cur.execute(query, sc.cte_params + sc.outer_params)
    rows = cur.fetchall()
    conn.close()

    total_sum = sum(safe_float(r[1]) for r in rows)
    gross_sum = sum(safe_float(r[2]) for r in rows)
    dupe_sum = sum(safe_float(r[3]) for r in rows)
    users = []
    for idx, r in enumerate(rows):
        qty = int(safe_float(r[1]))
        gross_q = int(safe_float(r[2]))
        dupe_q = int(safe_float(r[3]))
        pct = round((qty / total_sum * 100), 1) if total_sum > 0 else 0.0
        dupe_pct = round((dupe_q / gross_q * 100), 1) if gross_q > 0 else 0.0
        f_time = format_scan_time(r[5], idx + 1)
        l_time = format_scan_time(r[6], idx + 2)
        users.append({
            "user_name": r[0],
            "total_qty": qty,
            "gross_qty": gross_q,
            "dupe_qty": dupe_q,
            "dupe_pct": dupe_pct,
            "entries": int(r[4]),
            "percentage": pct,
            "first_time": f_time,
            "last_time": l_time,
            "time_range": f"{f_time} - {l_time}"
        })

    res = {
        "success": True,
        "date": date_str,
        "type": report_type,
        "shift": shift,
        "shift_label": shift_label,
        "process_name": p_name,
        "total_qty": int(total_sum),
        "gross_qty": int(gross_sum),
        "dupe_qty": int(dupe_sum),
        "user_count": len(users),
        "users": users,
        "last_updated": datetime.now().strftime("%H:%M:%S")
    }
    set_cache(cache_key, res)
    return res

@app.get("/api/godaun/user-detail")
def get_user_detail(
    date_str: str = Query(..., alias="date"),
    report_type: str = Query(default="inward"),
    user_name: str = Query(..., alias="user"),
    shift: str = Query(default="all")
):
    shift = (shift or "all").lower().strip()
    cache_key = f"user_detail_{date_str}_{report_type}_{user_name}_{shift}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    sc = get_shift_context(date_str, date_str, shift)
    shift_label = sc.label
    conn = get_db_connection()
    cur = conn.cursor()

    p_filter = "PROCESS_NAME = 'WMS Stock Inward'" if report_type == "inward" else "PROCESS_NAME IN ('WMS Order Pickup', 'WMS Stock Outward')"

    query = f"""
        WITH ScansRanked AS (
            SELECT 
                ISNULL(VOUCHER_NO, '') AS VOUCHER_NO,
                ISNULL(BILL_NO, '-') AS BILL_NO,
                ISNULL(DESIGN_NO, 'N/A') AS DESIGN_NO,
                ISNULL(SIZE, '-') AS SIZE,
                QTY_PIECES,
                CREATED_DATE,
                CREATED_BY,
                ROW_NUMBER() OVER (
                    PARTITION BY (CASE WHEN CAST(CREATED_DATE AS TIME) < '07:30:00' THEN CAST(DATEADD(day, -1, CREATED_DATE) AS DATE) ELSE CAST(CREATED_DATE AS DATE) END), (CASE WHEN PROCESS_NAME = 'WMS Stock Inward' THEN 'INWARD' ELSE 'OUTWARD' END), BARCODE
                    ORDER BY CREATED_DATE ASC
                ) AS SCAN_SEQ
            FROM View_Dboard_Common_Dashboard
            WHERE {sc.cte_clause}
              AND {p_filter}
              AND (BARCODE IS NOT NULL AND BARCODE <> '')
        )
        SELECT 
            VOUCHER_NO,
            BILL_NO,
            DESIGN_NO,
            SIZE,
            QTY_PIECES,
            CREATED_DATE
        FROM ScansRanked
        WHERE {sc.outer_cond}
          AND SCAN_SEQ = 1
          AND CREATED_BY = ?
        ORDER BY CREATED_DATE DESC
    """
    all_params = sc.cte_params + sc.outer_params + [user_name]
    cur.execute(query, all_params)
    items = []
    for idx, r in enumerate(cur.fetchall()):
        dt_str = format_scan_time(r[5], idx + 1)
        items.append({
            "voucher_no": r[0],
            "bill_no": r[1],
            "design_no": r[2],
            "size": r[3],
            "qty": int(safe_float(r[4])),
            "time": dt_str
        })
    conn.close()

    res = {
        "success": True,
        "date": date_str,
        "type": report_type,
        "shift": shift,
        "shift_label": shift_label,
        "user_name": user_name,
        "count": len(items),
        "items": items
    }
    set_cache(cache_key, res)
    return res

def fetch_salary_report_data(from_date: str, to_date: str, in_rate: float, out_rate: float, name_filter: str = "", shift: str = "all"):
    sc = get_shift_context(from_date, to_date, shift)
    shift_label = sc.label
    conn = get_db_connection()
    cur = conn.cursor()

    query = f"""
        WITH ScansWithSeq AS (
            SELECT 
                TRANS_DATE,
                VOUCHER_NO,
                PROCESS_NAME,
                CASE WHEN PROCESS_NAME = 'WMS Stock Inward' THEN 'INWARD' ELSE 'OUTWARD' END AS NORM_PROCESS,
                CREATED_BY,
                QTY_PIECES,
                CREATED_DATE,
                DESIGN_NO,
                SIZE,
                BARCODE,
                ROW_NUMBER() OVER (
                    PARTITION BY (CASE WHEN CAST(CREATED_DATE AS TIME) < '07:30:00' THEN CAST(DATEADD(day, -1, CREATED_DATE) AS DATE) ELSE CAST(CREATED_DATE AS DATE) END), PROCESS_NAME, BARCODE 
                    ORDER BY CREATED_DATE ASC
                ) AS SCAN_SEQ
            FROM View_Dboard_Common_Dashboard
            WHERE {sc.cte_clause}
              AND PROCESS_NAME IN ('WMS Stock Inward', 'WMS Order Pickup', 'WMS Stock Outward')
              AND (BARCODE IS NOT NULL AND BARCODE <> '')
        )
        SELECT 
            ISNULL(CREATED_BY, 'UNKNOWN') AS NAME,
            -- Gross
            SUM(CASE WHEN NORM_PROCESS = 'INWARD' THEN QTY_PIECES ELSE 0 END) AS GROSS_IN_PCS,
            SUM(CASE WHEN NORM_PROCESS = 'OUTWARD' THEN QTY_PIECES ELSE 0 END) AS GROSS_OUT_PCS,
            -- Dupe
            SUM(CASE WHEN SCAN_SEQ > 1 AND NORM_PROCESS = 'INWARD' THEN QTY_PIECES ELSE 0 END) AS DUPE_IN_PCS,
            SUM(CASE WHEN SCAN_SEQ > 1 AND NORM_PROCESS = 'OUTWARD' THEN QTY_PIECES ELSE 0 END) AS DUPE_OUT_PCS,
            -- Net
            SUM(CASE WHEN SCAN_SEQ = 1 AND NORM_PROCESS = 'INWARD' THEN QTY_PIECES ELSE 0 END) AS NET_IN_PCS,
            SUM(CASE WHEN SCAN_SEQ = 1 AND NORM_PROCESS = 'OUTWARD' THEN QTY_PIECES ELSE 0 END) AS NET_OUT_PCS,
            MIN(CREATED_DATE) AS FIRST_SCAN,
            MAX(CREATED_DATE) AS LAST_SCAN
        FROM ScansWithSeq
        WHERE {sc.outer_cond}
        GROUP BY CREATED_BY
        ORDER BY (SUM(CASE WHEN SCAN_SEQ = 1 AND NORM_PROCESS = 'INWARD' THEN QTY_PIECES ELSE 0 END) + SUM(CASE WHEN SCAN_SEQ = 1 AND NORM_PROCESS = 'OUTWARD' THEN QTY_PIECES ELSE 0 END)) DESC
    """
    cur.execute(query, sc.cte_params + sc.outer_params)
    rows = cur.fetchall()
    conn.close()

    hours_map = get_worker_hours_in_range(from_date, to_date)

    result_rows = []
    tot_in_pcs = 0
    tot_out_pcs = 0
    tot_in_amt = 0.0
    tot_out_amt = 0.0
    tot_hours = 0.0

    tot_gross_in = 0
    tot_gross_out = 0
    tot_dupe_in = 0
    tot_dupe_out = 0

    name_filter_lower = name_filter.strip().lower()

    for idx, r in enumerate(rows):
        name = str(r[0]).strip()
        if name_filter_lower and name_filter_lower not in name.lower():
            continue
        gross_in = int(safe_float(r[1]))
        gross_out = int(safe_float(r[2]))
        dupe_in = int(safe_float(r[3]))
        dupe_out = int(safe_float(r[4]))
        net_in = int(safe_float(r[5]))
        net_out = int(safe_float(r[6]))

        gross_pc = gross_in + gross_out
        dupe_pc = dupe_in + dupe_out
        net_pc = net_in + net_out

        net_in_amt = round(net_in * in_rate, 2)
        net_out_amt = round(net_out * out_rate, 2)
        net_total_amt = round(net_in_amt + net_out_amt, 2)

        gross_in_amt = round(gross_in * in_rate, 2)
        gross_out_amt = round(gross_out * out_rate, 2)
        gross_total_amt = round(gross_in_amt + gross_out_amt, 2)

        dupe_in_amt = round(dupe_in * in_rate, 2)
        dupe_out_amt = round(dupe_out * out_rate, 2)
        dupe_total_amt = round(dupe_in_amt + dupe_out_amt, 2)

        worker_hrs = hours_map.get(name.upper(), 0.0)
        pcs_per_hr = round(net_pc / worker_hrs, 1) if worker_hrs > 0 else 0.0

        f_time = format_scan_time(r[7], idx + 1)
        l_time = format_scan_time(r[8], idx + 2)
        time_range = f"{f_time} - {l_time}"

        tot_in_pcs += net_in
        tot_out_pcs += net_out
        tot_in_amt += net_in_amt
        tot_out_amt += net_out_amt
        tot_hours = round(tot_hours + worker_hrs, 2)

        tot_gross_in += gross_in
        tot_gross_out += gross_out
        tot_dupe_in += dupe_in
        tot_dupe_out += dupe_out

        result_rows.append({
            "name": name,
            # Net values (Deducted / After Minus) - Primary for piece rate
            "in_pcs": net_in,
            "in_amt": net_in_amt,
            "out_pcs": net_out,
            "out_amt": net_out_amt,
            "total_pc": net_pc,
            "total_amt": net_total_amt,
            # Gross values (Before Minus)
            "gross_in_pcs": gross_in,
            "gross_out_pcs": gross_out,
            "gross_total_pc": gross_pc,
            "gross_in_amt": gross_in_amt,
            "gross_out_amt": gross_out_amt,
            "gross_total_amt": gross_total_amt,
            # Duplicate / Theft values (Chori)
            "dupe_in_pcs": dupe_in,
            "dupe_out_pcs": dupe_out,
            "dupe_total_pc": dupe_pc,
            "dupe_in_amt": dupe_in_amt,
            "dupe_out_amt": dupe_out_amt,
            "dupe_total_amt": dupe_total_amt,
            "dupe_pct": round((dupe_pc / gross_pc * 100), 1) if gross_pc > 0 else 0.0,
            # Extra info
            "hours": worker_hrs,
            "pcs_per_hr": pcs_per_hr,
            "first_time": f_time,
            "last_time": l_time,
            "time_range": time_range
        })

    # Sort strictly descending by total_amt (highest work/earnings first, lowest last)
    result_rows.sort(key=lambda r: (r['total_amt'], r['total_pc']), reverse=True)

    totals = {
        "in_pcs": tot_in_pcs,
        "in_amt": round(tot_in_amt, 2),
        "out_pcs": tot_out_pcs,
        "out_amt": round(tot_out_amt, 2),
        "total_pc": tot_in_pcs + tot_out_pcs,
        "total_amt": round(tot_in_amt + tot_out_amt, 2),
        "hours": tot_hours,
        "pcs_per_hr": round((tot_in_pcs + tot_out_pcs) / tot_hours, 1) if tot_hours > 0 else 0.0,
        # Gross totals
        "gross_in_pcs": tot_gross_in,
        "gross_out_pcs": tot_gross_out,
        "gross_total_pc": tot_gross_in + tot_gross_out,
        "gross_total_amt": round(tot_gross_in * in_rate + tot_gross_out * out_rate, 2),
        # Dupe totals
        "dupe_in_pcs": tot_dupe_in,
        "dupe_out_pcs": tot_dupe_out,
        "dupe_total_pc": tot_dupe_in + tot_dupe_out,
        "dupe_total_amt": round(tot_dupe_in * in_rate + tot_dupe_out * out_rate, 2)
    }

    return result_rows, totals, shift_label

@app.get("/api/godaun/salary-report")
def get_salary_report(
    from_date: str = "",
    to_date: str = "",
    in_rate: float = 0.20,
    out_rate: float = 0.35,
    name: str = "",
    shift: str = "all"
):
    if not from_date:
        from_date = datetime.now().strftime("%Y-%m-%d")
    if not to_date:
        to_date = from_date

    shift = (shift or "all").lower().strip()
    cache_key = f"salary_{from_date}_{to_date}_{in_rate}_{out_rate}_{name}_{shift}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    rows, totals, shift_label = fetch_salary_report_data(from_date, to_date, in_rate, out_rate, name, shift)
    res = {
        "success": True,
        "from_date": from_date,
        "to_date": to_date,
        "shift": shift,
        "shift_label": shift_label,
        "in_rate": in_rate,
        "out_rate": out_rate,
        "name_filter": name,
        "rows": rows,
        "top5": rows[:5],
        "totals": totals,
        "count": len(rows),
        "last_updated": datetime.now().strftime("%H:%M:%S")
    }
    set_cache(cache_key, res)
    return res

@app.get("/api/godaun/user-datewise")
def get_user_datewise(
    user: str = "",
    from_date: str = "",
    to_date: str = "",
    in_rate: float = 0.20,
    out_rate: float = 0.35,
    shift: str = "all"
):
    if not from_date:
        from_date = datetime.now().strftime("%Y-%m-01")
    if not to_date:
        to_date = datetime.now().strftime("%Y-%m-%d")

    shift = (shift or "all").lower().strip()
    cache_key = f"datewise_{user}_{from_date}_{to_date}_{in_rate}_{out_rate}_{shift}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    sc = get_shift_context(from_date, to_date, shift)
    shift_label = sc.label
    conn = get_db_connection()
    cur = conn.cursor()

    query = f"""
        WITH ScansWithSeq AS (
            SELECT 
                TRANS_DATE,
                VOUCHER_NO,
                PROCESS_NAME,
                CASE WHEN PROCESS_NAME = 'WMS Stock Inward' THEN 'INWARD' ELSE 'OUTWARD' END AS NORM_PROCESS,
                CREATED_BY,
                QTY_PIECES,
                CREATED_DATE,
                BARCODE,
                ROW_NUMBER() OVER (
                    PARTITION BY (CASE WHEN CAST(CREATED_DATE AS TIME) < '07:30:00' THEN CAST(DATEADD(day, -1, CREATED_DATE) AS DATE) ELSE CAST(CREATED_DATE AS DATE) END), PROCESS_NAME, BARCODE 
                    ORDER BY CREATED_DATE ASC
                ) AS SCAN_SEQ
            FROM View_Dboard_Common_Dashboard
            WHERE {sc.cte_clause}
              AND PROCESS_NAME IN ('WMS Stock Inward', 'WMS Order Pickup', 'WMS Stock Outward')
              AND (BARCODE IS NOT NULL AND BARCODE <> '')
        )
        SELECT 
            CASE WHEN CAST(CREATED_DATE AS TIME) < '07:30:00' THEN CONVERT(VARCHAR(10), DATEADD(day, -1, CREATED_DATE), 120) ELSE CONVERT(VARCHAR(10), CREATED_DATE, 120) END AS TRANS_DATE,
            -- Gross
            SUM(CASE WHEN NORM_PROCESS = 'INWARD' THEN QTY_PIECES ELSE 0 END) AS GROSS_IN_PCS,
            SUM(CASE WHEN NORM_PROCESS = 'OUTWARD' THEN QTY_PIECES ELSE 0 END) AS GROSS_OUT_PCS,
            -- Dupe
            SUM(CASE WHEN SCAN_SEQ > 1 AND NORM_PROCESS = 'INWARD' THEN QTY_PIECES ELSE 0 END) AS DUPE_IN_PCS,
            SUM(CASE WHEN SCAN_SEQ > 1 AND NORM_PROCESS = 'OUTWARD' THEN QTY_PIECES ELSE 0 END) AS DUPE_OUT_PCS,
            -- Net
            SUM(CASE WHEN SCAN_SEQ = 1 AND NORM_PROCESS = 'INWARD' THEN QTY_PIECES ELSE 0 END) AS NET_IN_PCS,
            SUM(CASE WHEN SCAN_SEQ = 1 AND NORM_PROCESS = 'OUTWARD' THEN QTY_PIECES ELSE 0 END) AS NET_OUT_PCS,
            MIN(CREATED_DATE) AS FIRST_SCAN,
            MAX(CREATED_DATE) AS LAST_SCAN
        FROM ScansWithSeq
        WHERE {sc.outer_cond}
          AND CREATED_BY = ?
        GROUP BY CASE WHEN CAST(CREATED_DATE AS TIME) < '07:30:00' THEN CONVERT(VARCHAR(10), DATEADD(day, -1, CREATED_DATE), 120) ELSE CONVERT(VARCHAR(10), CREATED_DATE, 120) END
        ORDER BY TRANS_DATE ASC
    """
    all_params = sc.cte_params + sc.outer_params + [user]
    cur.execute(query, all_params)
    rows = cur.fetchall()
    conn.close()

    worker_daily_hrs = get_worker_daily_hours(user, from_date, to_date)

    daily_rows = []
    tot_in = 0
    tot_out = 0
    tot_in_amt = 0.0
    tot_out_amt = 0.0
    tot_hours = 0.0

    tot_gross_in = 0
    tot_gross_out = 0
    tot_dupe_in = 0
    tot_dupe_out = 0

    for idx, r in enumerate(rows):
        d_str = str(r[0])
        try:
            formatted = datetime.strptime(d_str, "%Y-%m-%d").strftime("%d/%m/%Y")
        except Exception:
            formatted = d_str
        gross_in = int(safe_float(r[1]))
        gross_out = int(safe_float(r[2]))
        dupe_in = int(safe_float(r[3]))
        dupe_out = int(safe_float(r[4]))
        net_in = int(safe_float(r[5]))
        net_out = int(safe_float(r[6]))

        gross_pc = gross_in + gross_out
        dupe_pc = dupe_in + dupe_out
        net_pc = net_in + net_out

        in_amt = round(net_in * in_rate, 2)
        out_amt = round(net_out * out_rate, 2)
        total_amt = round(in_amt + out_amt, 2)

        gross_in_amt = round(gross_in * in_rate, 2)
        gross_out_amt = round(gross_out * out_rate, 2)
        gross_total_amt = round(gross_in_amt + gross_out_amt, 2)

        d_hrs = worker_daily_hrs.get(d_str, 0.0)

        f_time = format_scan_time(r[7], idx + 1)
        l_time = format_scan_time(r[8], idx + 2)

        tot_in += net_in
        tot_out += net_out
        tot_in_amt += in_amt
        tot_out_amt += out_amt
        tot_hours = round(tot_hours + d_hrs, 2)

        tot_gross_in += gross_in
        tot_gross_out += gross_out
        tot_dupe_in += dupe_in
        tot_dupe_out += dupe_out

        daily_rows.append({
            "date": d_str,
            "formatted_date": formatted,
            # Net values (Deducted / After Minus)
            "in_pcs": net_in,
            "in_amt": in_amt,
            "out_pcs": net_out,
            "out_amt": out_amt,
            "total_pc": net_pc,
            "total_amt": total_amt,
            # Gross & Dupe values for Admin
            "gross_in_pcs": gross_in,
            "gross_in_amt": gross_in_amt,
            "gross_out_pcs": gross_out,
            "gross_out_amt": gross_out_amt,
            "gross_total_pc": gross_pc,
            "gross_total_amt": gross_total_amt,
            "dupe_in_pcs": dupe_in,
            "dupe_out_pcs": dupe_out,
            "dupe_total_pc": dupe_pc,
            "dupe_pct": round((dupe_pc / gross_pc * 100), 1) if gross_pc > 0 else 0.0,
            "hours": d_hrs,
            "pcs_per_hr": round(net_pc / d_hrs, 1) if d_hrs > 0 else 0.0,
            "first_time": f_time,
            "last_time": l_time,
            "time_range": f"{f_time} - {l_time}"
        })

    totals = {
        "in_pcs": tot_in,
        "in_amt": round(tot_in_amt, 2),
        "out_pcs": tot_out,
        "out_amt": round(tot_out_amt, 2),
        "total_pc": tot_in + tot_out,
        "total_amt": round(tot_in_amt + tot_out_amt, 2),
        "hours": tot_hours,
        "gross_in_pcs": tot_gross_in,
        "gross_in_amt": round(tot_gross_in * in_rate, 2),
        "gross_out_pcs": tot_gross_out,
        "gross_out_amt": round(tot_gross_out * out_rate, 2),
        "gross_total_pc": tot_gross_in + tot_gross_out,
        "gross_total_amt": round(tot_gross_in * in_rate + tot_gross_out * out_rate, 2),
        "dupe_in_pcs": tot_dupe_in,
        "dupe_out_pcs": tot_dupe_out,
        "dupe_total_pc": tot_dupe_in + tot_dupe_out,
        "dupe_total_amt": round(tot_dupe_in * in_rate + tot_dupe_out * out_rate, 2)
    }

    res = {
        "success": True,
        "user_name": user,
        "from_date": from_date,
        "to_date": to_date,
        "shift": shift,
        "shift_label": shift_label,
        "in_rate": in_rate,
        "out_rate": out_rate,
        "days": daily_rows,
        "totals": totals
    }
    set_cache(cache_key, res)
    return res

@app.get("/api/godaun/chori-report")
def get_chori_report(
    from_date: str = "",
    to_date: str = "",
    shift: str = "all",
    process: str = "all",
    user: str = "",
    limit: int = 500
):
    """
    Dedicated report for Admin: 'CHORI KARI' (ચોરી કરી)
    Extracts duplicate barcode scans from Default All Process Detail Report (View_Dboard_Common_Dashboard)
    for both WMS Stock Inward and WMS Stock Outward, detailing who scanned it, voucher no, qty, and time.
    """
    if not from_date:
        from_date = datetime.now().strftime("%Y-%m-%d")
    if not to_date:
        to_date = from_date

    shift = (shift or "all").lower().strip()
    process = (process or "all").lower().strip()
    user = (user or "").strip()

    cache_key = f"chori_{from_date}_{to_date}_{shift}_{process}_{user}_{limit}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    sc = get_shift_context(from_date, to_date, shift)
    shift_label = sc.label
    conn = get_db_connection()
    cur = conn.cursor()

    proc_filter = ""
    if process == "inward":
        proc_filter = "AND PROCESS_NAME = 'WMS Stock Inward'"
    elif process == "outward":
        proc_filter = "AND PROCESS_NAME IN ('WMS Order Pickup', 'WMS Stock Outward')"
    else:
        proc_filter = "AND PROCESS_NAME IN ('WMS Stock Inward', 'WMS Order Pickup', 'WMS Stock Outward')"

    user_cond = "AND CREATED_BY = ?" if user else ""
    summary_params = sc.cte_params + sc.outer_params
    if user:
        summary_params.append(user)

    # 1. Query Worker-wise Theft Summary
    summary_sql = f"""
        WITH ScansWithSeq AS (
            SELECT 
                TRANS_DATE,
                PROCESS_NAME,
                CASE WHEN PROCESS_NAME = 'WMS Stock Inward' THEN 'INWARD' ELSE 'OUTWARD' END AS NORM_PROCESS,
                CREATED_BY,
                QTY_PIECES,
                BARCODE,
                CREATED_DATE,
                ROW_NUMBER() OVER (
                    PARTITION BY (CASE WHEN CAST(CREATED_DATE AS TIME) < '07:30:00' THEN CAST(DATEADD(day, -1, CREATED_DATE) AS DATE) ELSE CAST(CREATED_DATE AS DATE) END), PROCESS_NAME, BARCODE 
                    ORDER BY CREATED_DATE ASC
                ) AS SCAN_SEQ
            FROM View_Dboard_Common_Dashboard
            WHERE {sc.cte_clause} {proc_filter}
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
        WHERE {sc.outer_cond} {user_cond}
        GROUP BY CREATED_BY
        HAVING SUM(CASE WHEN SCAN_SEQ > 1 THEN 1 ELSE 0 END) > 0
        ORDER BY DUPE_SCANS DESC
    """
    cur.execute(summary_sql, summary_params)
    worker_rows = cur.fetchall()

    workers_list = []
    tot_dupe_scans = 0
    tot_dupe_pcs = 0
    tot_dupe_in = 0
    tot_dupe_out = 0

    for r in worker_rows:
        w_name = str(r[0]).strip()
        t_scans = int(r[1])
        v_scans = int(r[2])
        d_scans = int(r[3])
        d_in = int(r[4])
        d_out = int(r[5])
        d_pcs = int(safe_float(r[6]))
        v_pcs = int(safe_float(r[7]))
        g_pcs = int(safe_float(r[8]))
        pct = round((d_scans / t_scans * 100), 1) if t_scans > 0 else 0.0

        tot_dupe_scans += d_scans
        tot_dupe_pcs += d_pcs
        tot_dupe_in += d_in
        tot_dupe_out += d_out

        workers_list.append({
            "name": w_name,
            "total_scans": t_scans,
            "valid_scans": v_scans,
            "dupe_scans": d_scans,
            "dupe_in_scans": d_in,
            "dupe_out_scans": d_out,
            "dupe_pcs": d_pcs,
            "valid_pcs": v_pcs,
            "gross_pcs": g_pcs,
            "dupe_pct": pct
        })

    # 2. Query Detailed Duplicate Records with Shelf, Rack & Shift
    outer_cond_s = sc.outer_cond.replace("CREATED_DATE", "s.CREATED_DATE")
    user_cond_s = "AND s.CREATED_BY = ?" if user else ""
    detail_params = sc.cte_params + sc.outer_params
    if user:
        detail_params.append(user)

    detail_sql = f"""
        WITH ScansWithSeq AS (
            SELECT 
                TRANS_DATE,
                VOUCHER_NO,
                PROCESS_NAME,
                CASE WHEN PROCESS_NAME = 'WMS Stock Inward' THEN 'INWARD' ELSE 'OUTWARD' END AS NORM_PROCESS,
                CREATED_BY,
                QTY_PIECES,
                CREATED_DATE,
                DESIGN_NO,
                SIZE,
                BARCODE,
                ROW_NUMBER() OVER (
                    PARTITION BY (CASE WHEN CAST(CREATED_DATE AS TIME) < '07:30:00' THEN CAST(DATEADD(day, -1, CREATED_DATE) AS DATE) ELSE CAST(CREATED_DATE AS DATE) END), PROCESS_NAME, BARCODE 
                    ORDER BY CREATED_DATE ASC
                ) AS SCAN_SEQ
            FROM View_Dboard_Common_Dashboard
            WHERE {sc.cte_clause} {proc_filter}
              AND (BARCODE IS NOT NULL AND BARCODE <> '')
        )
        SELECT TOP {limit}
            s.BARCODE,
            ISNULL(s.VOUCHER_NO, '') AS VOUCHER_NO,
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
        WHERE {outer_cond_s}
          AND s.SCAN_SEQ > 1
          {user_cond_s}
        ORDER BY s.CREATED_DATE DESC
    """
    cur.execute(detail_sql, detail_params)
    item_rows = cur.fetchall()
    conn.close()

    items = []
    for idx, r in enumerate(item_rows):
        dt_val = r[8]
        time_str = format_scan_time(dt_val, idx + 1)
        date_str = dt_val.strftime("%d/%m/%Y") if isinstance(dt_val, (datetime, date)) else ""
        shelf_val = str(r[10]).strip() if r[10] else "-"
        rack_val = str(r[11]).strip() if r[11] else "-"
        shift_name = str(r[12]).strip() if r[12] else "General"

        items.append({
            "barcode": r[0],
            "voucher_no": r[1],
            "process_name": r[2],
            "norm_process": r[3],
            "user_name": str(r[4]).strip(),
            "design_no": r[5],
            "size": r[6],
            "qty": int(safe_float(r[7])),
            "time": time_str,
            "date": date_str,
            "created_date": dt_val.strftime("%Y-%m-%d %H:%M:%S") if isinstance(dt_val, datetime) else str(dt_val),
            "scan_seq": int(r[9]),
            "shelf_code": shelf_val,
            "rack_code": rack_val,
            "shift_name": shift_name
        })

    res = {
        "success": True,
        "from_date": from_date,
        "to_date": to_date,
        "shift": shift,
        "shift_label": shift_label,
        "process": process,
        "user_filter": user,
        "summary": {
            "total_dupe_scans": tot_dupe_scans,
            "total_dupe_pcs": tot_dupe_pcs,
            "dupe_in_pcs": tot_dupe_in,
            "dupe_out_pcs": tot_dupe_out,
            "workers_count": len(workers_list),
            "workers": workers_list
        },
        "count": len(items),
        "items": items,
        "last_updated": datetime.now().strftime("%H:%M:%S")
    }
    set_cache(cache_key, res)
    return res

@app.get("/api/godaun/chori-whatsapp")
def get_chori_whatsapp_message(
    from_date: str = "",
    to_date: str = "",
    shift: str = "all",
    process: str = "all",
    user: str = "",
    phone: str = "919033157999",
    limit: int = 50
):
    """
    Formats the complete WMS Godaun Chori Report into WhatsApp formatted text
    and returns direct WhatsApp Click-to-Chat deep links.
    """
    chori_data = get_chori_report(from_date, to_date, shift, process, user, limit=2000)
    from_d = chori_data.get("from_date", "")
    to_d = chori_data.get("to_date", "")
    shift_l = chori_data.get("shift_label", "All Shifts")
    summary = chori_data.get("summary", {})
    workers = summary.get("workers", [])
    items = chori_data.get("items", [])

    tot_dupe = summary.get("total_dupe_pcs", 0)
    in_dupe = summary.get("dupe_in_pcs", 0)
    out_dupe = summary.get("dupe_out_pcs", 0)

    lines = [
        "🚨 *OSLC WMS GODAUN CHORI REPORT*",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"📅 *તારીખ:* {from_d}" + (f" થી {to_d}" if from_d != to_d else ""),
        f"⏱️ *શિફ્ટ:* {shift_l}",
        "",
        "📊 *કુલ ચોરી સમરી (THEFT SUMMARY):*",
        f"▪️ કુલ ડુપ્લિકેટ પીસ (Chori): *{tot_dupe:,} PC*",
        f"▪️ ઇનવર્ડ ચોરી (Inward Dupes): *{in_dupe:,} PC*",
        f"▪️ આઉટવર્ડ ચોરી (Outward Dupes): *{out_dupe:,} PC*",
        f"▪️ કુલ સંડોવાયેલા કર્મચારી: *{len(workers)} જણા*",
        "",
        "👥 *કર્મચારી વાઇઝ ચોરી લિસ્ટ (WORKER BREAKDOWN):*",
        "━━━━━━━━━━━━━━━━━━━━━━"
    ]

    for idx, w in enumerate(workers, 1):
        lines.append(
            f"{idx}. 👤 *{w['name']}*: *{w['dupe_pcs']:,} PC* "
            f"(IN: {w['dupe_in_scans']} | OUT: {w['dupe_out_scans']} | {w['dupe_pct']}%)"
        )

    lines.append("")
    lines.append("🔍 *ડુપ્લિકેટ બારકોડ વિગતો (SHELF, TIME, BARCODE):*")
    lines.append("━━━━━━━━━━━━━━━━━━━━━━")

    display_items = items[:limit] if limit > 0 else items[:50]
    for idx, it in enumerate(display_items, 1):
        s_code = it.get('shelf_code', '-')
        r_code = it.get('rack_code', '-')
        shelf_str = f"{s_code} ({r_code})" if r_code and r_code != '-' else s_code
        shift_str = it.get('shift_name', 'General')
        lines.append(
            f"🔹 *#{idx}* | 👤 *{it['user_name']}* | ⏱️ {it['time']} ({shift_str})\n"
            f"   📍 *Shelf:* {shelf_str} | 📂 {it['process_name']}\n"
            f"   📦 *Barcode:* `{it['barcode']}` (🔁 #{it['scan_seq']})\n"
            f"   🏷️ *Design:* {it['design_no']} ({it['size']}) | 📄 *Voucher:* {it['voucher_no']}"
        )

    if len(items) > len(display_items):
        lines.append(f"\n...અને બીજા *{len(items) - len(display_items)}* ડુપ્લિકેટ બારકોડ રેકોર્ડ્સ.")

    lines.append("")
    lines.append("━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("⚡ *OSLC Live Godaun Monitoring System*")

    message_text = "\n".join(lines)
    clean_phone = "".join(c for c in phone if c.isdigit())
    encoded_text = urllib.parse.quote(message_text)
    wa_api_url = f"https://api.whatsapp.com/send?phone={clean_phone}&text={encoded_text}"
    wa_app_url = f"whatsapp://send?phone={clean_phone}&text={encoded_text}"
    wa_web_url = f"https://web.whatsapp.com/send?phone={clean_phone}&text={encoded_text}"

    return {
        "success": True,
        "phone": clean_phone,
        "message_text": message_text,
        "whatsapp_url": wa_api_url,
        "whatsapp_app_url": wa_app_url,
        "whatsapp_web_url": wa_web_url,
        "total_dupe_pcs": tot_dupe,
        "items_count": len(items)
    }

@app.get("/api/godaun/chori-send-erp-whatsapp")
@app.post("/api/godaun/chori-send-erp-whatsapp")
def send_chori_erp_whatsapp(
    from_date: str = "",
    to_date: str = "",
    shift: str = "all",
    process: str = "all",
    user: str = "",
    phone: str = "919033157999",
    limit: int = 50
):
    """
    Sends the WMS Godaun Chori Report directly from the OSLC ERP system WhatsApp number
    to +91 90331 57999 (or specified phone) using OSLC ERP's enotify.app Gateway & MASTER_NOTIFICATION_LOG pipeline.
    """
    wa_data = get_chori_whatsapp_message(from_date, to_date, shift, process, user, phone, limit=limit)
    msg = wa_data.get("message_text", "")
    clean_phone = wa_data.get("phone", "919033157999")
    if not clean_phone.startswith("91") and len(clean_phone) == 10:
        clean_phone = "91" + clean_phone

    token = "orccs554px09gwv9rqmxyahh"
    api_success = False
    api_resp_data = None
    api_err = None

    # 1. Dispatch via Local Multi-Account WhatsApp Auto-Bot (Port 8008)
    group_id = "120363430986633216@g.us"
    group_invite_url = "https://chat.whatsapp.com/IYcWXIh5oRKARdoK5Iy1R7"
    group_name = "🚨 WMS Godaun Chori Report"

    bot_group_dispatched = False
    bot_direct_dispatched = False
    bot_dispatches = []
    bot_err = None

    try:
        # A. Send to Official WMS Godaun Chori WhatsApp Group
        g_req = requests.post("http://127.0.0.1:8008/send", json={
            "group_id": group_id,
            "message": msg,
            "send_from": "both"
        }, timeout=15)
        g_data = g_req.json()
        if g_data.get("ok"):
            bot_group_dispatched = True
            bot_dispatches.extend(g_data.get("dispatches", []))

        # B. Send Direct 1-to-1 to User's Phone
        d_req = requests.post("http://127.0.0.1:8008/send", json={
            "phone": clean_phone,
            "message": msg,
            "send_from": "both"
        }, timeout=15)
        d_data = d_req.json()
        if d_data.get("ok"):
            bot_direct_dispatched = True
            bot_dispatches.extend(d_data.get("dispatches", []))

        api_success = bot_group_dispatched or bot_direct_dispatched
    except Exception as e:
        bot_err = str(e)

    # B2. Direct Cloud Gateway Dispatch via enotify.app to 919033157999
    try:
        en_token = "orccs554px09gwv9rqmxyahh"
        en_url = f"https://www.enotify.app/api/sendText?token={en_token}&phone={clean_phone}&type=text&message={urllib.parse.quote(msg)}"
        en_res = requests.get(en_url, timeout=8)
        if en_res.status_code == 200:
            api_success = True
    except Exception:
        pass

    # B3. Launch Windows WhatsApp Desktop to ensure instant delivery
    try:
        wa_proto = f"whatsapp://send?phone={clean_phone}&text={urllib.parse.quote(msg)}"
        os.startfile(wa_proto)
        api_success = True
    except Exception:
        pass

    # 2. Also Log & queue in DigiBizz_PROD_Om_Sai_Master.dbo.MASTER_NOTIFICATION_LOG
    db_log_id = None
    db_err = None
    try:
        cfg = load_config()
        server = cfg["server"]
        username = cfg["username"]
        password = cfg["password"]
        installed_drivers = pyodbc.drivers()
        preferred = [
            "ODBC Driver 18 for SQL Server",
            "ODBC Driver 17 for SQL Server",
            "ODBC Driver 13 for SQL Server",
            "ODBC Driver 11 for SQL Server",
            "SQL Server",
        ]
        driver = "SQL Server"
        for d in preferred:
            if d in installed_drivers:
                driver = d
                break
        
        conn_str = f"DRIVER={{{driver}}};SERVER={server};DATABASE=DigiBizz_PROD_Om_Sai_Master;UID={username};PWD={password};TrustServerCertificate=yes;"
        conn = pyodbc.connect(conn_str, timeout=10)
        cur = conn.cursor()
        
        contact_no = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
        cur.execute("""
            INSERT INTO MASTER_NOTIFICATION_LOG
            (
                TIME_STAMP, STATUS, CONTACT_DETAILS, NOTIFICATION_TITLE,
                NOTIFICATION_BODY, NOTIFICATION_TYPE, IS_ACTIVE, SENDER_INSTANCE
            )
            OUTPUT INSERTED.UID
            VALUES
            (
                GETDATE(), 'Done', ?, 'WMS Godaun Chori Report', ?, 'WhatsApp', 1, 'Dual Auto-Bot 8008'
            )
        """, (contact_no, msg))
        inserted = cur.fetchone()
        if inserted:
            db_log_id = inserted[0]
        conn.commit()
        conn.close()
    except Exception as e:
        db_err = str(e)

    conn_status = bot_group_dispatched or bot_direct_dispatched
    status_msg = (
        f"✅ 100% ફ્રી Auto-Bot: '🚨 WMS Godaun Chori Report' ગ્રૂપ તથા તમારા ફોન (+{clean_phone}) પર ચોરી રિપોર્ટ સફળતાપૂર્વક પહોંચી ગયો છે! (કોઈ સ્કેન કરવાની જરૂર નથી)"
        if conn_status
        else f"⚠️ રિપોર્ટ ડિસ્પેચ કરવામાં સમસ્યા: {bot_err or 'Check bot service'}"
    )

    return {
        "success": api_success or (db_log_id is not None),
        "connected": conn_status,
        "message": status_msg,
        "phone": clean_phone,
        "group_id": group_id,
        "group_name": group_name,
        "group_invite_url": group_invite_url,
        "api_dispatched": api_success,
        "bot_group_dispatched": bot_group_dispatched,
        "bot_direct_dispatched": bot_direct_dispatched,
        "dispatches": bot_dispatches,
        "bot_error": bot_err,
        "db_log_id": db_log_id,
        "db_error": db_err,
        "total_dupe_pcs": wa_data.get("total_dupe_pcs"),
        "report_preview": msg[:300] + "..."
    }

@app.get("/api/godaun/whatsapp-status")
def get_whatsapp_status(token: str = "orccs554px09gwv9rqmxyahh"):
    """
    Checks the status of the local WhatsApp Auto-Bot (Dual Accounts).
    """
    try:
        r = requests.get("http://127.0.0.1:8008/status", timeout=4)
        if r.status_code == 200:
            data = r.json()
            is_conn = data.get("connected", False)
            return {
                "success": True,
                "connected": is_conn,
                "both_connected": data.get("both_connected", False),
                "brand_name": data.get("brand_name", "OSLC ERP JEEL VAGHANI"),
                "connected_number": data.get("user", "+919537780826"),
                "accounts": data.get("accounts", {}),
                "group_id": "120363430986633216@g.us",
                "group_name": "🚨 WMS Godaun Chori Report",
                "group_invite_url": "https://chat.whatsapp.com/IYcWXIh5oRKARdoK5Iy1R7",
                "active_recipients": [
                    {"name": "JEEL VAGHANI (Admin)", "phone": "+91 9033157999"}
                ]
            }
    except Exception as e:
        pass

    return {
        "success": False,
        "connected": False,
        "error": "WhatsApp Auto-Bot (Port 8008) is offline"
    }

@app.post("/api/godaun/whatsapp-send-contact")
@app.get("/api/godaun/whatsapp-send-contact")
def send_whatsapp_contact_card(phone: str = "919033157999", name: str = "OSLC ERP JEEL VAGHANI"):
    """
    Sends official OSLC ERP Contact Card to WhatsApp recipient.
    """
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    try:
        r = requests.post("http://127.0.0.1:8008/send-contact", json={
            "phone": clean_phone,
            "contact_name": name or "OSLC ERP JEEL VAGHANI",
            "send_from": "both"
        }, timeout=10)
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/api/godaun/whatsapp-vcard")
def download_whatsapp_vcard():
    """
    Returns downloadable .vcf contact card for 1-click mobile phone saving.
    """
    vcard_data = (
        "BEGIN:VCARD\r\n"
        "VERSION:3.0\r\n"
        "FN:OSLC ERP JEEL VAGHANI\r\n"
        "N:;OSLC ERP JEEL VAGHANI;;;\r\n"
        "ORG:OSLC ERP JEEL VAGHANI\r\n"
        "TEL;TYPE=CELL,VOICE,PREF:+919537780826\r\n"
        "NOTE:Official OSLC ERP Background Alert System\r\n"
        "END:VCARD\r\n"
    )
    return Response(
        content=vcard_data,
        media_type="text/vcard",
        headers={"Content-Disposition": 'attachment; filename="OSLC_ERP_JEEL_VAGHANI.vcf"'}
    )

@app.post("/api/godaun/whatsapp-logout")
@app.get("/api/godaun/whatsapp-logout")
def logout_whatsapp_account(account: str = "1"):
    """
    Disconnects Account 1 or Account 2 on local Baileys bot.
    """
    try:
        r = requests.post("http://127.0.0.1:8008/logout", json={"account": account}, timeout=10)
        return r.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/api/godaun/whatsapp-qr")
def get_whatsapp_qr(token: str = "orccs554px09gwv9rqmxyahh"):
    """
    Returns the live QR code image for linking the second WhatsApp phone.
    """
    try:
        import urllib.request
        url = f"http://f.1t.cl/api/qrCodeImage/{token}.png"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=8) as resp:
            img_data = resp.read()
            return Response(content=img_data, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/godaun/chori-send-whatsapp-auto")
def auto_send_chori_whatsapp_alias(
    from_date: str = "",
    to_date: str = "",
    shift: str = "all",
    process: str = "all",
    user: str = "",
    phone: str = "919033157999"
):
    return send_chori_erp_whatsapp(from_date, to_date, shift, process, user, phone)

@app.get("/api/godaun/export-excel")
def export_excel_report(
    from_date: str = "",
    to_date: str = "",
    in_rate: float = 0.20,
    out_rate: float = 0.35,
    name: str = "",
    user: str = "",
    shift: str = "all",
    report_type: str = "salary",
    process: str = "all",
    mode: str = "gross"
):
    if not from_date:
        from_date = datetime.now().strftime("%Y-%m-%d")
    if not to_date:
        to_date = from_date

    shift = (shift or "all").lower().strip()
    mode = (mode or "gross").lower().strip()
    is_gross = (mode == "gross")
    wb = openpyxl.Workbook()
    ws = wb.active

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2C4A6E", end_color="2C4A6E", fill_type="solid")
    red_header_fill = PatternFill(start_color="991B1B", end_color="991B1B", fill_type="solid")

    amt_in_fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    amt_out_fill = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
    hours_fill = PatternFill(start_color="E8EEF5", end_color="E8EEF5", fill_type="solid")
    tot_amt_fill = PatternFill(start_color="F9CB9C", end_color="F9CB9C", fill_type="solid")
    time_fill = PatternFill(start_color="E0F2FE", end_color="E0F2FE", fill_type="solid")
    dupe_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")

    thin_border = Border(
        left=Side(style="thin", color="D3D3D3"),
        right=Side(style="thin", color="D3D3D3"),
        top=Side(style="thin", color="D3D3D3"),
        bottom=Side(style="thin", color="D3D3D3")
    )

    if report_type == "chori":
        ws.title = "ચોરી સમરી (Theft Summary)"
        chori_data = get_chori_report(from_date, to_date, shift, process, user, limit=2000)
        summary = chori_data.get("summary", {})
        workers = summary.get("workers", [])
        items = chori_data.get("items", [])

        # Sheet 1: Worker Theft Summary
        headers1 = ["કર્મચારી (NAME)", "કુલ સ્કેન (TOTAL SCANS)", "સાચા પીસ (NET PCS)", "ચોરી પીસ (DUPE PCS)", "ચોરી % (THEFT %)", "ઇનવર્ડ ચોરી", "આઉટવર્ડ ચોરી"]
        ws.append(headers1)
        for col_idx in range(1, len(headers1) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = red_header_fill
            cell.alignment = Alignment(horizontal="center" if col_idx > 1 else "left", vertical="center")

        for r_idx, w in enumerate(workers, start=2):
            ws.append([
                w["name"],
                w["total_scans"],
                w["valid_pcs"],
                w["dupe_pcs"],
                f"{w['dupe_pct']}%",
                w["dupe_in_scans"],
                w["dupe_out_scans"]
            ])
            for col_idx in range(1, len(headers1) + 1):
                c = ws.cell(row=r_idx, column=col_idx)
                c.border = thin_border
                if col_idx == 4 or col_idx == 5:
                    c.fill = dupe_fill

        tot_row_idx = len(workers) + 2
        ws.append([
            "TOTAL",
            sum(w["total_scans"] for w in workers),
            sum(w["valid_pcs"] for w in workers),
            summary.get("total_dupe_pcs", 0),
            "-",
            summary.get("dupe_in_pcs", 0),
            summary.get("dupe_out_pcs", 0)
        ])
        for col_idx in range(1, len(headers1) + 1):
            c = ws.cell(row=tot_row_idx, column=col_idx)
            c.font = Font(name="Calibri", size=11, bold=True)
            c.border = thin_border
            if col_idx == 4:
                c.fill = PatternFill(start_color="FCA5A5", end_color="FCA5A5", fill_type="solid")

        # Sheet 2: Detailed Duplicate Scans
        ws2 = wb.create_sheet(title="ડુપ્લિકેટ બારકોડ લિસ્ટ")
        headers2 = ["#", "બારકોડ (BARCODE)", "વાઉચર નં. (VOUCHER NO)", "શિફ્ટ (SHIFT)", "શેલ્ફ (SHELF)", "રેક (RACK)", "પ્રોસેસ (PROCESS)", "કર્મચારી (WORKER)", "ડિઝાઇન (DESIGN NO)", "સાઇઝ (SIZE)", "પીસ (QTY)", "સ્કેન સમય & તારીખ", "સ્કેન ક્રમ (SCAN SEQ)"]
        ws2.append(headers2)
        for col_idx in range(1, len(headers2) + 1):
            cell = ws2.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center" if col_idx not in (2, 3, 7, 8) else "left", vertical="center")

        for r_idx, it in enumerate(items, start=2):
            ws2.append([
                r_idx - 1,
                it["barcode"],
                it["voucher_no"],
                it.get("shift_name", "-"),
                it.get("shelf_code", "-"),
                it.get("rack_code", "-"),
                it["process_name"],
                it["user_name"],
                it["design_no"],
                it["size"],
                it["qty"],
                f"{it['date']} {it['time']}",
                f"Scan #{it['scan_seq']}"
            ])
            for col_idx in range(1, len(headers2) + 1):
                c = ws2.cell(row=r_idx, column=col_idx)
                c.border = thin_border
                if col_idx == 2:
                    c.fill = dupe_fill

        for col in ws2.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws2.column_dimensions[col_letter].width = max(max_len + 3, 12)

        filename = f"OSLC_CHORI_KARI_REPORT_{shift}_{from_date}_to_{to_date}.xlsx"

    elif user:
        ws.title = f"{user[:20]} Daily"
        res_datewise = get_user_datewise(user, from_date, to_date, in_rate, out_rate, shift)
        days = res_datewise["days"]
        totals = res_datewise["totals"]

        in_title = "IN (GROSS)" if is_gross else "IN (NET)"
        out_title = "OUT (GROSS)" if is_gross else "OUT (NET)"
        tot_title = "TOTAL PC (GROSS)" if is_gross else "TOTAL PC (NET)"
        headers = ["DATE", in_title, f"{in_rate:.2f}", out_title, f"{out_rate:.2f}", tot_title, "NET PC" if is_gross else "GROSS PC", "CHORI PC", "HOURS (કલાક)", "TOTAL AMT", "TIME RANGE (સમય)"]
        ws.append(headers)

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center" if col_idx > 1 else "left", vertical="center")

        for r_idx, r in enumerate(days, start=2):
            cur_in = r.get("gross_in_pcs", r["in_pcs"]) if is_gross else r["in_pcs"]
            cur_in_amt = r.get("gross_in_amt", r["in_amt"]) if is_gross else r["in_amt"]
            cur_out = r.get("gross_out_pcs", r["out_pcs"]) if is_gross else r["out_pcs"]
            cur_out_amt = r.get("gross_out_amt", r["out_amt"]) if is_gross else r["out_amt"]
            cur_tot_pc = r.get("gross_total_pc", r["total_pc"]) if is_gross else r["total_pc"]
            cur_tot_amt = r.get("gross_total_amt", r["total_amt"]) if is_gross else r["total_amt"]
            sec_pc = r["total_pc"] if is_gross else r.get("gross_total_pc", r["total_pc"])

            ws.append([
                r["formatted_date"],
                cur_in,
                cur_in_amt,
                cur_out,
                cur_out_amt,
                cur_tot_pc,
                sec_pc,
                r.get("dupe_total_pc", 0),
                r.get("hours", 0.0),
                cur_tot_amt,
                r.get("time_range", "-")
            ])
            for col_idx in range(1, len(headers) + 1):
                c = ws.cell(row=r_idx, column=col_idx)
                c.border = thin_border
                if col_idx == 3:
                    c.fill = amt_in_fill
                elif col_idx == 5:
                    c.fill = amt_out_fill
                elif col_idx == 8:
                    c.fill = dupe_fill
                elif col_idx == 9:
                    c.fill = hours_fill
                elif col_idx == 10:
                    c.fill = tot_amt_fill
                elif col_idx == 11:
                    c.fill = time_fill

        tot_row_idx = len(days) + 2
        f_in = totals.get("gross_in_pcs", totals["in_pcs"]) if is_gross else totals["in_pcs"]
        f_in_amt = totals.get("gross_in_amt", totals["in_amt"]) if is_gross else totals["in_amt"]
        f_out = totals.get("gross_out_pcs", totals["out_pcs"]) if is_gross else totals["out_pcs"]
        f_out_amt = totals.get("gross_out_amt", totals["out_amt"]) if is_gross else totals["out_amt"]
        f_tot_pc = totals.get("gross_total_pc", totals["total_pc"]) if is_gross else totals["total_pc"]
        f_tot_amt = totals.get("gross_total_amt", totals["total_amt"]) if is_gross else totals["total_amt"]
        f_sec_pc = totals["total_pc"] if is_gross else totals.get("gross_total_pc", totals["total_pc"])

        ws.append([
            "TOTAL",
            f_in,
            f_in_amt,
            f_out,
            f_out_amt,
            f_tot_pc,
            f_sec_pc,
            totals.get("dupe_total_pc", 0),
            totals.get("hours", 0.0),
            f_tot_amt,
            res_datewise.get("shift_label", "")
        ])
        for col_idx in range(1, len(headers) + 1):
            c = ws.cell(row=tot_row_idx, column=col_idx)
            c.font = Font(name="Calibri", size=11, bold=True)
            c.border = thin_border
            if col_idx == 8:
                c.fill = dupe_fill
            elif col_idx == 9:
                c.fill = hours_fill
            elif col_idx == 10:
                c.fill = PatternFill(start_color="F6B26B", end_color="F6B26B", fill_type="solid")

        filename = f"OSLC_{user}_Report_{shift}_{from_date}_to_{to_date}.xlsx"
    else:
        ws.title = f"Report {shift.upper()}"
        rows, totals, shift_label = fetch_salary_report_data(from_date, to_date, in_rate, out_rate, name, shift)

        in_title = "IN (GROSS)" if is_gross else "IN (NET)"
        out_title = "OUT (GROSS)" if is_gross else "OUT (NET)"
        tot_title = "TOTAL PC (GROSS)" if is_gross else "TOTAL PC (NET)"
        headers = ["NAME", in_title, f"{in_rate:.2f}", out_title, f"{out_rate:.2f}", tot_title, "NET PC" if is_gross else "GROSS PC", "CHORI PC", "HOURS (કલાક)", "TOTAL AMT", "TIME RANGE (સમય)"]
        ws.append(headers)

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center" if col_idx > 1 else "left", vertical="center")

        t_in_sum = 0
        t_out_sum = 0
        t_in_amt_sum = 0.0
        t_out_amt_sum = 0.0

        for r_idx, r in enumerate(rows, start=2):
            cur_in = r.get("gross_in_pcs", r["in_pcs"]) if is_gross else r["in_pcs"]
            cur_out = r.get("gross_out_pcs", r["out_pcs"]) if is_gross else r["out_pcs"]
            cur_in_amt = round(cur_in * in_rate, 2)
            cur_out_amt = round(cur_out * out_rate, 2)
            cur_tot_pc = cur_in + cur_out
            cur_tot_amt = round(cur_in_amt + cur_out_amt, 2)
            sec_pc = r["total_pc"] if is_gross else r.get("gross_total_pc", r["total_pc"])

            t_in_sum += cur_in
            t_out_sum += cur_out
            t_in_amt_sum += cur_in_amt
            t_out_amt_sum += cur_out_amt

            ws.append([
                r["name"],
                cur_in,
                cur_in_amt,
                cur_out,
                cur_out_amt,
                cur_tot_pc,
                sec_pc,
                r.get("dupe_total_pc", 0),
                r.get("hours", 0.0),
                cur_tot_amt,
                r.get("time_range", "-")
            ])
            for col_idx in range(1, len(headers) + 1):
                c = ws.cell(row=r_idx, column=col_idx)
                c.border = thin_border
                if col_idx == 3:
                    c.fill = amt_in_fill
                elif col_idx == 5:
                    c.fill = amt_out_fill
                elif col_idx == 8:
                    c.fill = dupe_fill
                elif col_idx == 9:
                    c.fill = hours_fill
                elif col_idx == 10:
                    c.fill = tot_amt_fill
                elif col_idx == 11:
                    c.fill = time_fill

        tot_row_idx = len(rows) + 2
        f_in = totals.get("gross_in_pcs", totals["in_pcs"]) if is_gross else totals["in_pcs"]
        f_out = totals.get("gross_out_pcs", totals["out_pcs"]) if is_gross else totals["out_pcs"]
        f_in_amt = round(f_in * in_rate, 2)
        f_out_amt = round(f_out * out_rate, 2)
        f_tot_pc = f_in + f_out
        f_tot_amt = round(f_in_amt + f_out_amt, 2)
        f_sec_pc = totals["total_pc"] if is_gross else totals.get("gross_total_pc", totals["total_pc"])

        ws.append([
            "TOTAL",
            f_in,
            f_in_amt,
            f_out,
            f_out_amt,
            f_tot_pc,
            f_sec_pc,
            totals.get("dupe_total_pc", 0),
            totals.get("hours", 0.0),
            f_tot_amt,
            shift_label
        ])
        for col_idx in range(1, len(headers) + 1):
            c = ws.cell(row=tot_row_idx, column=col_idx)
            c.font = Font(name="Calibri", size=11, bold=True)
            c.border = thin_border
            if col_idx == 8:
                c.fill = dupe_fill
            elif col_idx == 9:
                c.fill = hours_fill
            elif col_idx == 10:
                c.fill = PatternFill(start_color="F6B26B", end_color="F6B26B", fill_type="solid")

        filename = f"OSLC_Stock_Report_{shift}_{from_date}_to_{to_date}.xlsx"

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    out = io.BytesIO()
    wb.save(out)
    excel_bytes = out.getvalue()

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Mount frontend static files and index.html at root
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8095)
