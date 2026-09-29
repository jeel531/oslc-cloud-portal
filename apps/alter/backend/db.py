# -*- coding: utf-8 -*-
"""
Om Sai Latest Creation - OSLC Alter & Stitching Receive Karigar Report
Database Query Engine & Excel Exporter (DigiBizz Report 127)
"""
from __future__ import annotations

import io
import re
import time
from collections import defaultdict
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple, Set

import pyodbc
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from apps.alter.backend.config import DB_CONFIG, FLOOR_MAPPING, DEFAULT_FLOOR, SHEET_ORDER, APP_NAME, COMPANY_NAME

# In-memory query cache
_CACHE: Dict[str, Tuple[float, Any]] = {}
CACHE_TTL = 300  # 5 minutes cache


def get_connection():
    """Connect to DigiBizz SQL Server database using pyodbc."""
    driver = "SQL Server"
    installed = pyodbc.drivers()
    for d in ["ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server", "SQL Server"]:
        if d in installed:
            driver = d
            break

    conn_str = (
        f"DRIVER={{{driver}}};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        "TrustServerCertificate=yes;"
        "Connection Timeout=15;"
    )
    return pyodbc.connect(conn_str)


# In-memory cache for Employee Join Dates (DOJ) from DigiBizz_PROD_Om_Sai_Master.dbo.MASTER_GENERAL_SETTING
_EMP_DOJ_CACHE: Tuple[float, Dict[str, str], Dict[str, str]] = (0.0, {}, {})
EMP_DOJ_CACHE_TTL = 1800  # 30 minutes cache


def get_employee_doj_map(force_refresh: bool = False) -> Tuple[Dict[str, str], Dict[str, str]]:
    """
    Fetches Employee Join Date (DOJ) from DigiBizz_PROD_Om_Sai_Master.dbo.MASTER_GENERAL_SETTING
    where GENERAL_SETTING_TYPE_ID = 60 (Employee Master).
    Returns (by_name_dict, by_code_dict).
    """
    global _EMP_DOJ_CACHE
    now = time.time()
    if not force_refresh and _EMP_DOJ_CACHE[0] and (now - _EMP_DOJ_CACHE[0] < EMP_DOJ_CACHE_TTL):
        return _EMP_DOJ_CACHE[1], _EMP_DOJ_CACHE[2]

    by_name: Dict[str, str] = {}
    by_code: Dict[str, str] = {}

    try:
        conn = get_connection()
        cur = conn.cursor()
        query = """
            SELECT 
                GENERAL_SETTING_ID,
                UPPER(LTRIM(RTRIM(ISNULL(GENERAL_SETTING_CODE, '')))) AS CODE,
                UPPER(LTRIM(RTRIM(ISNULL(GENERAL_SETTING_NAME, '')))) AS NAME,
                CONVERT(VARCHAR(10), DATE_VALUE1, 105) AS JOIN_DATE_DMY,
                IS_ACTIVE
            FROM [DigiBizz_PROD_Om_Sai_Master].[dbo].[MASTER_GENERAL_SETTING] WITH (NOLOCK)
            WHERE GENERAL_SETTING_TYPE_ID = 60 AND DATE_VALUE1 IS NOT NULL
            ORDER BY IS_ACTIVE DESC, GENERAL_SETTING_ID DESC
        """
        cur.execute(query)
        for gid, code, name, dmy, is_act in cur.fetchall():
            if not dmy:
                continue
            dmy_str = str(dmy).strip()
            if name and name not in by_name:
                by_name[name] = dmy_str
            if code and code not in by_code:
                by_code[code] = dmy_str
        conn.close()
        _EMP_DOJ_CACHE = (now, by_name, by_code)
    except Exception as e:
        print(f"[!] Warning: Failed to fetch Employee Join Dates: {e}")

    return by_name, by_code


def lookup_employee_doj(emp_code: str, emp_name: str, by_name: Dict[str, str], by_code: Dict[str, str]) -> str:
    """
    Look up Date of Joining (DOJ) formatted as DD-MM-YYYY for an employee.
    """
    c = (emp_code or "").strip().upper()
    n = (emp_name or "").strip().upper()

    if n in by_name:
        return by_name[n]

    if ":" in n:
        sub = n.split(":", 1)[1].strip()
        if sub in by_name:
            return by_name[sub]

    if c in by_code:
        return by_code[c]

    if "-" in n:
        code_part = n.split("-")[0].strip()
        if code_part in by_code:
            return by_code[code_part]

    return ""


def parse_karigar_info(emp_code: str, emp_name: str) -> Tuple[str, str, str]:
    """
    Parses employee code and raw name into:
    1. Full Employee Key (e.g., "M37:M37-AKBAR-E2-C")
    2. Clean Karigar Name (e.g., "AKBAR")
    3. Floor / Line Man (e.g., "E2 - MUSHID BHAI")
    """
    code = (emp_code or "").strip()
    name = (emp_name or "").strip()

    if not name and not code:
        return "UNKNOWN:UNKNOWN", "UNKNOWN", DEFAULT_FLOOR

    if not name:
        name = code
    if not code:
        code = name.split("-")[0].strip() if "-" in name else name

    emp_key = f"{code}:{name}"

    # 1. Determine Floor / Line Man
    floor = DEFAULT_FLOOR
    search_text = f"{code} {name}".upper()
    # Match patterns like: E2, E-2, E 2, E3, E-3, E 3, E5, E-5, E 5, O3, O-3, O 3
    # separated by boundaries, spaces, dashes, slashes, brackets, colons, etc.
    m = re.search(r'(?:^|[\s\-_/(\[:,])(E|O)[-\s]?(2|3|5)(?:[\s\-_/)\]:,]|$)', search_text)
    if m:
        letter = m.group(1).upper()
        digit = m.group(2)
        key = f"{letter}{digit}"
        if key in FLOOR_MAPPING:
            floor = FLOOR_MAPPING[key]

    # 2. Extract Karigar Clean Name
    clean_name = name

    # Remove code prefix if present at start (e.g. M37- or M37: or M37 )
    clean_name = re.sub(r"^[A-Za-z0-9]+[-:_ ]+", "", clean_name).strip()

    # Remove floor suffix like -E2-C, E3-A, -O3-I, -E5-D, etc. (space, dash, underscore)
    clean_name = re.sub(r"[\s\-_]+(E[0-9]|O[0-9]|G[0-9]|F[0-9]|M[0-9])(?:[\s\-_]+[A-Za-z0-9]+)*$", "", clean_name, flags=re.IGNORECASE).strip()

    # Clean leading numbers/dashes if any
    clean_name = clean_name.strip(" -_:")
    if not clean_name:
        clean_name = name

    return emp_key, clean_name, floor


def query_report_data(
    from_date: str,
    to_date: str,
    alter_mode: str = "ALTER_ISSUE",
    force_refresh: bool = False
) -> List[Dict[str, Any]]:
    """
    Queries DigiBizz Report 127 (View_Dboard_Trans_Process_Detail_Data).
    Returns raw transaction rows for Stitching Receive and Alter.
    """
    cache_key = f"raw_{from_date}_{to_date}_{alter_mode}"
    if not force_refresh and cache_key in _CACHE:
        t, data = _CACHE[cache_key]
        if time.time() - t < CACHE_TTL:
            return data

    # Select processes based on alter_mode
    processes = ["Stitching Receive"]
    if alter_mode == "ALTER_ISSUE":
        processes.append("Alter Issue")
    elif alter_mode == "ALTER_RECEIVE":
        processes.append("Alter Receive")
    else:  # BOTH
        processes.extend(["Alter Issue", "Alter Receive"])

    proc_list_sql = ", ".join(f"'{p}'" for p in processes)

    where_clauses = [f"TRANS_TYPE_NAME IN ({proc_list_sql})"]
    if from_date and from_date.strip():
        where_clauses.append(f"TRANS_DATE >= '{from_date.strip()}'")
    if to_date and to_date.strip():
        where_clauses.append(f"TRANS_DATE <= '{to_date.strip()}'")

    where_sql = " AND ".join(where_clauses)

    query = f"""
    SET NOCOUNT ON;
    SET DEADLOCK_PRIORITY LOW;
    SELECT
        ISNULL(VOUCHER_NO, '') AS VOUCHER_NO,
        CONVERT(VARCHAR(10), TRANS_DATE, 120) AS TRANS_DATE,
        ISNULL(TRANS_TYPE_NAME, '') AS TRANS_TYPE_NAME,
        ISNULL(LOT_NO, '') AS LOT_NO,
        ISNULL(SKU_CODE, '') AS SKU_CODE,
        ISNULL(ITEM_NAME, '') AS ITEM_NAME,
        ISNULL(SIZE, '') AS SIZE,
        ISNULL(EMPLOYEE_CODE, '') AS EMPLOYEE_CODE,
        ISNULL(EMPLOYEE_NAME, '') AS EMPLOYEE_NAME,
        CAST(ISNULL(QTY_PIECES, 0) AS FLOAT) AS QTY_PIECES,
        ISNULL(ENTRY_STATUS, 'FRESH') AS ENTRY_STATUS
    FROM View_Dboard_Trans_Process_Detail_Data WITH (NOLOCK)
    WHERE {where_sql}
    ORDER BY TRANS_DATE DESC, VOUCHER_NO DESC;
    """

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query)

    rows = []
    for r in cur.fetchall():
        v_no = str(r[0] or "").strip()
        t_date = str(r[1] or "").strip()
        p_name = str(r[2] or "").strip()
        lot = str(r[3] or "").strip()
        sku = str(r[4] or "").strip()
        item = str(r[5] or "").strip()
        size = str(r[6] or "").strip()
        emp_code = str(r[7] or "").strip()
        emp_name = str(r[8] or "").strip()
        qty = float(r[9] or 0.0)
        status = str(r[10] or "").strip().upper()

        design = item if item else sku
        emp_key, karigar_clean, floor = parse_karigar_info(emp_code, emp_name)

        rows.append({
            "voucher_no": v_no,
            "trans_date": t_date,
            "process": p_name,
            "lot_no": lot,
            "sku": sku,
            "item_name": item,
            "design": design,
            "size": size,
            "employee_code": emp_code,
            "employee_name": emp_name,
            "employee_key": emp_key,
            "karigar_name": karigar_clean,
            "floor": floor,
            "qty": qty,
            "status": status,
        })

    conn.close()

    _CACHE[cache_key] = (time.time(), rows)
    return rows


def query_aggregated_report_data(
    from_date: str,
    to_date: str,
    alter_mode: str = "ALTER_ISSUE",
    force_refresh: bool = False
) -> Dict[str, Dict[str, Any]]:
    """
    Ultra-fast SQL Server-side aggregated query.
    Returns {emp_key: {employee_key, karigar_name, floor, employee_code, raw_name, sti_qty, alter_qty, sti_design_count, alter_design_count}}
    Transfers ~800 rows instead of 80,000 rows over the network (10x-50x faster).
    """
    cache_key = f"agg_{from_date}_{to_date}_{alter_mode}"
    if not force_refresh and cache_key in _CACHE:
        t, data = _CACHE[cache_key]
        if time.time() - t < CACHE_TTL:
            return data

    processes = ["Stitching Receive"]
    if alter_mode == "ALTER_RECEIVE":
        processes.append("Alter Receive")
    elif alter_mode == "BOTH":
        processes.extend(["Alter Issue", "Alter Receive"])
    else:
        processes.append("Alter Issue")

    proc_list_sql = ", ".join(f"'{p}'" for p in processes)

    where_clauses = [f"TRANS_TYPE_NAME IN ({proc_list_sql})"]
    if from_date and from_date.strip():
        where_clauses.append(f"TRANS_DATE >= '{from_date.strip()}'")
    if to_date and to_date.strip():
        where_clauses.append(f"TRANS_DATE <= '{to_date.strip()}'")

    where_sql = " AND ".join(where_clauses)

    query = f"""
    SET NOCOUNT ON;
    SET DEADLOCK_PRIORITY LOW;
    SELECT
        ISNULL(EMPLOYEE_CODE, '') AS EMP_CODE,
        ISNULL(EMPLOYEE_NAME, '') AS EMP_NAME,
        TRANS_TYPE_NAME,
        COUNT(DISTINCT ISNULL(NULLIF(ITEM_NAME, ''), SKU_CODE)) AS DESIGN_CNT,
        SUM(CAST(ISNULL(QTY_PIECES, 0) AS FLOAT)) AS TOT_QTY
    FROM View_Dboard_Trans_Process_Detail_Data WITH (NOLOCK)
    WHERE {where_sql}
    GROUP BY ISNULL(EMPLOYEE_CODE, ''), ISNULL(EMPLOYEE_NAME, ''), TRANS_TYPE_NAME;
    """

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query)

    k_map: Dict[str, Dict[str, Any]] = {}
    for code, name, proc, des_cnt, qty in cur.fetchall():
        emp_code = str(code or "").strip()
        emp_name = str(name or "").strip()
        p_name = str(proc or "").strip()
        d_cnt = int(des_cnt or 0)
        q_val = float(qty or 0.0)

        emp_key, clean_name, floor = parse_karigar_info(emp_code, emp_name)

        if emp_key not in k_map:
            k_map[emp_key] = {
                "employee_key": emp_key,
                "karigar_name": clean_name,
                "floor": floor,
                "employee_code": emp_code,
                "raw_name": emp_name,
                "sti_design_count": 0,
                "sti_qty": 0.0,
                "alter_design_count": 0,
                "alter_qty": 0.0,
            }

        k = k_map[emp_key]
        if p_name == "Stitching Receive":
            k["sti_qty"] += q_val
            k["sti_design_count"] += d_cnt
        else:
            k["alter_qty"] += q_val
            k["alter_design_count"] += d_cnt

    conn.close()
    _CACHE[cache_key] = (time.time(), k_map)
    return k_map


def build_karigar_report(
    from_date: str,
    to_date: str,
    alter_mode: str = "ALTER_ISSUE",
    search: str = "",
    floor_filter: str = "ALL",
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Aggregates Report 127 data into Karigar-wise summary with STI & Alter metrics.
    Uses ultra-fast server-side aggregation for instant response.
    """
    karigar_map = query_aggregated_report_data(from_date, to_date, alter_mode, force_refresh)

    # Compile list with percentages
    all_karigars: List[Dict[str, Any]] = []
    total_sti_qty = 0.0
    total_alt_qty = 0.0
    total_sti_designs = 0
    total_alt_designs = 0

    by_name, by_code = get_employee_doj_map(force_refresh=force_refresh)

    for emp_key, data in karigar_map.items():
        sti_qty = round(data["sti_qty"], 2)
        alt_qty = round(data["alter_qty"], 2)
        total_pcs = sti_qty + alt_qty

        sti_pct = round((sti_qty / total_pcs) * 100, 2) if total_pcs > 0 else 0.0
        alt_pct = round((alt_qty / sti_qty) * 100, 2) if sti_qty > 0 else (100.0 if alt_qty > 0 else 0.0)

        sti_designs = data["sti_design_count"]
        alt_designs = data["alter_design_count"]
        total_sti_qty += sti_qty
        total_alt_qty += alt_qty
        total_sti_designs += sti_designs
        total_alt_designs += alt_designs

        emp_code_val = data["employee_code"]
        raw_nm = data["raw_name"] or data["karigar_name"]
        doj_val = lookup_employee_doj(emp_code_val, raw_nm, by_name, by_code)
        if not doj_val:
            doj_val = lookup_employee_doj(emp_code_val, emp_key, by_name, by_code)

        all_karigars.append({
            "doj": doj_val,
            "employee_key": emp_key,
            "karigar_name": data["karigar_name"],
            "floor": data["floor"],
            "employee_code": data["employee_code"],
            "raw_name": data["raw_name"],
            "sti_design_count": sti_designs,
            "sti_qty": int(sti_qty) if sti_qty.is_integer() else sti_qty,
            "sti_percent": sti_pct,
            "alter_design_count": alt_designs,
            "alter_qty": int(alt_qty) if alt_qty.is_integer() else alt_qty,
            "alter_percent": alt_pct,
            "total_pieces": int(total_pcs) if total_pcs.is_integer() else total_pcs,
        })

    # Sort: Floor order, then Alter Qty descending, then Name
    floor_priority = {
        "E2 - MUSHID BHAI": 1,
        "E3 - SADDAM BHAI": 2,
        "O3 - RAFIK BHAI": 3,
        "E5 - TOHIDUL BHAI": 4,
        "MIX": 5,
    }
    all_karigars.sort(key=lambda x: (
        floor_priority.get(x["floor"], 99),
        -x["alter_qty"],
        x["karigar_name"]
    ))

    # Calculate Floor-wise summaries
    floor_groups: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "karigar_count": 0,
        "sti_design_count": 0,
        "sti_qty": 0.0,
        "alter_design_count": 0,
        "alter_qty": 0.0,
        "total_pieces": 0.0,
        "sti_percent": 0.0,
        "alter_percent": 0.0,
        "skus_sti": set(),
        "skus_alt": set(),
        "karigars": [],
    })

    for k in all_karigars:
        fl = k["floor"]
        grp = floor_groups[fl]
        grp["karigar_count"] += 1
        grp["sti_qty"] += k["sti_qty"]
        grp["alter_qty"] += k["alter_qty"]
        grp["total_pieces"] += k["total_pieces"]
        grp["karigars"].append(k)

    # Compute overall & floor percentages
    overall_total = total_sti_qty + total_alt_qty
    overall_sti_pct = round((total_sti_qty / overall_total) * 100, 2) if overall_total > 0 else 0.0
    overall_alt_pct = round((total_alt_qty / total_sti_qty) * 100, 2) if total_sti_qty > 0 else 0.0

    # Lineman Rankings & High Alter Analysis
    floor_summary_list = []
    for fl_label, p_num in sorted(floor_priority.items(), key=lambda x: x[1]):
        grp = floor_groups[fl_label]
        fl_total = grp["sti_qty"] + grp["alter_qty"]
        fl_sti_pct = round((grp["sti_qty"] / fl_total) * 100, 2) if fl_total > 0 else 0.0
        fl_alt_pct = round((grp["alter_qty"] / grp["sti_qty"]) * 100, 2) if grp["sti_qty"] > 0 else (100.0 if grp["alter_qty"] > 0 else 0.0)

        # Tailors with Alter % >= 5.0% and alter_qty > 0
        high_alter_tailors = [k for k in grp["karigars"] if k["alter_percent"] >= 5.0 and k["alter_qty"] > 0]
        critical_alter_tailors = [k for k in grp["karigars"] if k["alter_percent"] >= 8.0 and k["alter_qty"] > 0]

        # Top 3 tailors by Alter Qty under this lineman
        sorted_tailors = sorted(grp["karigars"], key=lambda x: (-x["alter_qty"], -x["alter_percent"]))
        top_worst = sorted_tailors[:3] if sorted_tailors else []
        worst_name = f"{sorted_tailors[0]['karigar_name']} ({sorted_tailors[0]['alter_percent']}%)" if sorted_tailors and sorted_tailors[0]['alter_qty'] > 0 else "None"

        floor_summary_list.append({
            "floor": fl_label,
            "karigar_count": grp["karigar_count"],
            "sti_qty": int(grp["sti_qty"]) if grp["sti_qty"].is_integer() else grp["sti_qty"],
            "sti_percent": fl_sti_pct,
            "alter_qty": int(grp["alter_qty"]) if grp["alter_qty"].is_integer() else grp["alter_qty"],
            "alter_percent": fl_alt_pct,
            "total_pieces": int(fl_total) if fl_total.is_integer() else fl_total,
            "high_alter_count": len(high_alter_tailors),
            "critical_alter_count": len(critical_alter_tailors),
            "worst_karigar": worst_name,
            "top_worst_tailors": top_worst,
        })

    # Sort Lineman ranking by Alter % descending (Worst Alter first)
    lineman_ranking = sorted(floor_summary_list, key=lambda x: -x["alter_percent"])
    for idx, lm in enumerate(lineman_ranking, start=1):
        lm["rank"] = idx

    # Overall Factory Top 10 High Alter Tailors
    factory_worst_tailors = sorted(
        [k for k in all_karigars if k["alter_qty"] > 0],
        key=lambda x: (-x["alter_qty"], -x["alter_percent"])
    )[:15]

    # Filtering for response view
    filtered_karigars = all_karigars
    if floor_filter and floor_filter != "ALL":
        filtered_karigars = [k for k in filtered_karigars if k["floor"] == floor_filter]

    search_term = search.strip().lower()
    if search_term:
        filtered_karigars = [
            k for k in filtered_karigars
            if search_term in k["employee_key"].lower()
            or search_term in k["karigar_name"].lower()
            or search_term in k["floor"].lower()
        ]

    return {
        "success": True,
        "from_date": from_date,
        "to_date": to_date,
        "alter_mode": alter_mode,
        "total_karigars": len(all_karigars),
        "filtered_karigars_count": len(filtered_karigars),
        "overall": {
            "sti_design_count": total_sti_designs,
            "sti_qty": int(total_sti_qty) if total_sti_qty.is_integer() else total_sti_qty,
            "sti_percent": overall_sti_pct,
            "alter_design_count": total_alt_designs,
            "alter_qty": int(total_alt_qty) if total_alt_qty.is_integer() else total_alt_qty,
            "alter_percent": overall_alt_pct,
            "total_pieces": int(overall_total) if overall_total.is_integer() else overall_total,
        },
        "floor_summaries": floor_summary_list,
        "lineman_ranking": lineman_ranking,
        "factory_worst_tailors": factory_worst_tailors,
        "karigars": filtered_karigars,
    }


def get_karigar_detail(
    employee_key: str,
    from_date: str,
    to_date: str,
    alter_mode: str = "ALTER_ISSUE"
) -> Dict[str, Any]:
    """
    Returns itemized breakdown by Lot and SKU for a single selected Karigar.
    Queries only rows for this specific tailor for instantaneous response (<0.2s).
    """
    parts = employee_key.split(":", 1)
    emp_code = parts[0].strip()
    emp_name = parts[1].strip() if len(parts) > 1 else emp_code

    processes = ["Stitching Receive"]
    if alter_mode == "ALTER_RECEIVE":
        processes.append("Alter Receive")
    elif alter_mode == "BOTH":
        processes.extend(["Alter Issue", "Alter Receive"])
    else:
        processes.append("Alter Issue")

    proc_list_sql = ", ".join(f"'{p}'" for p in processes)

    where_clauses = [
        f"TRANS_TYPE_NAME IN ({proc_list_sql})",
        f"(EMPLOYEE_CODE = '{emp_code}' OR EMPLOYEE_NAME LIKE '%{emp_name}%' OR EMPLOYEE_NAME LIKE '%{emp_code}%')"
    ]
    if from_date and from_date.strip():
        where_clauses.append(f"TRANS_DATE >= '{from_date.strip()}'")
    if to_date and to_date.strip():
        where_clauses.append(f"TRANS_DATE <= '{to_date.strip()}'")

    where_sql = " AND ".join(where_clauses)

    query = f"""
    SET NOCOUNT ON;
    SET DEADLOCK_PRIORITY LOW;
    SELECT
        ISNULL(VOUCHER_NO, '') AS VOUCHER_NO,
        CONVERT(VARCHAR(10), TRANS_DATE, 120) AS TRANS_DATE,
        ISNULL(TRANS_TYPE_NAME, '') AS TRANS_TYPE_NAME,
        ISNULL(LOT_NO, '') AS LOT_NO,
        ISNULL(SKU_CODE, '') AS SKU_CODE,
        ISNULL(ITEM_NAME, '') AS ITEM_NAME,
        ISNULL(SIZE, '') AS SIZE,
        ISNULL(EMPLOYEE_CODE, '') AS EMPLOYEE_CODE,
        ISNULL(EMPLOYEE_NAME, '') AS EMPLOYEE_NAME,
        CAST(ISNULL(QTY_PIECES, 0) AS FLOAT) AS QTY_PIECES
    FROM View_Dboard_Trans_Process_Detail_Data WITH (NOLOCK)
    WHERE {where_sql}
    ORDER BY TRANS_DATE DESC, VOUCHER_NO DESC;
    """

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query)

    matching = []
    for r in cur.fetchall():
        v_no = str(r[0] or "").strip()
        t_date = str(r[1] or "").strip()
        p_name = str(r[2] or "").strip()
        lot = str(r[3] or "").strip()
        sku = str(r[4] or "").strip()
        item = str(r[5] or "").strip()
        size = str(r[6] or "").strip()
        e_code = str(r[7] or "").strip()
        e_name = str(r[8] or "").strip()
        qty = float(r[9] or 0.0)

        design = item if item else sku
        e_key, k_clean, fl = parse_karigar_info(e_code, e_name)
        matching.append({
            "voucher_no": v_no,
            "trans_date": t_date,
            "process": p_name,
            "lot_no": lot,
            "sku": sku,
            "item_name": item,
            "design": design,
            "size": size,
            "employee_code": e_code,
            "employee_name": e_name,
            "employee_key": e_key,
            "karigar_name": k_clean,
            "floor": fl,
            "qty": qty,
        })
    conn.close()

    if not matching:
        return {"success": False, "error": f"No data found for Karigar: {employee_key}"}

    sample = matching[0]
    karigar_name = sample["karigar_name"]
    floor = sample["floor"]
    emp_code = sample["employee_code"]
    raw_name = sample["employee_name"]

    # Design breakdown
    designs_map: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "design": "",
        "sti_qty": 0.0,
        "alter_qty": 0.0,
        "total_qty": 0.0,
        "lots": set(),
        "sizes": set(),
    })

    total_sti = 0.0
    total_alt = 0.0

    for r in matching:
        des = r["design"] or "N/A"
        item = designs_map[des]
        item["design"] = des
        qty = r["qty"]
        if r["lot_no"]:
            item["lots"].add(r["lot_no"])
        if r["size"]:
            item["sizes"].add(r["size"])

        if r["process"] == "Stitching Receive":
            item["sti_qty"] += qty
            total_sti += qty
        else:
            item["alter_qty"] += qty
            total_alt += qty

    designs_list = []
    for des, d in designs_map.items():
        t_qty = d["sti_qty"] + d["alter_qty"]
        alt_pct = round((d["alter_qty"] / d["sti_qty"]) * 100, 2) if d["sti_qty"] > 0 else (100.0 if d["alter_qty"] > 0 else 0.0)
        designs_list.append({
            "design": des,
            "lots": ", ".join(sorted(d["lots"])),
            "sizes": ", ".join(sorted(d["sizes"])),
            "sti_qty": int(d["sti_qty"]) if d["sti_qty"].is_integer() else d["sti_qty"],
            "alter_qty": int(d["alter_qty"]) if d["alter_qty"].is_integer() else d["alter_qty"],
            "total_qty": int(t_qty) if t_qty.is_integer() else t_qty,
            "alter_percent": alt_pct,
        })

    # Sort designs by alter qty descending
    designs_list.sort(key=lambda x: (-x["alter_qty"], -x["sti_qty"], x["design"]))

    total_pcs = total_sti + total_alt
    alt_pct = round((total_alt / total_sti) * 100, 2) if total_sti > 0 else (100.0 if total_alt > 0 else 0.0)
    sti_pct = round((total_sti / total_pcs) * 100, 2) if total_pcs > 0 else 0.0

    return {
        "success": True,
        "employee_key": employee_key,
        "karigar_name": karigar_name,
        "floor": floor,
        "employee_code": emp_code,
        "raw_name": raw_name,
        "sti_qty": int(total_sti) if total_sti.is_integer() else total_sti,
        "sti_percent": sti_pct,
        "alter_qty": int(total_alt) if total_alt.is_integer() else total_alt,
        "alter_percent": alt_pct,
        "total_pieces": int(total_pcs) if total_pcs.is_integer() else total_pcs,
        "total_designs": len(designs_list),
        "designs": designs_list,
        "transactions": matching[:200],  # Recent 200 transaction lines
    }


def generate_karigar_excel(
    from_date: str,
    to_date: str,
    alter_mode: str = "ALTER_ISSUE"
) -> io.BytesIO:
    """
    Generates multi-sheet Excel Workbook matching OSLC_KARIGAR_REPORT_FULL_20260918_201901.xlsx
    Sheets: ALL, E2-MUSHID BHAI, E3-SADDAM BHAI, O3-RAFIK BHAI, E5-TOHIDUL BHAI, MIX.
    """
    raw_data = build_karigar_report(from_date, to_date, alter_mode)
    all_karigars = raw_data["karigars"]

    wb = Workbook()
    wb.remove(wb.active)  # Remove default blank sheet

    # Define Styles
    header_navy = PatternFill("solid", fgColor="1F4E78")
    sub_blue = PatternFill("solid", fgColor="D9EAF7")
    total_green = PatternFill("solid", fgColor="D9EAD3")

    font_title = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
    font_sub = Font(name="Calibri", size=11, bold=True, color="1F1F1F")
    font_col_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    font_sub_header = Font(name="Calibri", size=10, bold=True, color="1F4E78")
    font_data = Font(name="Calibri", size=10, color="1F1F1F")
    font_total = Font(name="Calibri", size=10, bold=True, color="1F1F1F")

    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    thin_border = Border(
        left=Side(style="thin", color="D3D3D3"),
        right=Side(style="thin", color="D3D3D3"),
        top=Side(style="thin", color="D3D3D3"),
        bottom=Side(style="thin", color="D3D3D3"),
    )
    total_border = Border(
        left=Side(style="thin", color="A0A0A0"),
        right=Side(style="thin", color="A0A0A0"),
        top=Side(style="medium", color="1F4E78"),
        bottom=Side(style="double", color="1F4E78"),
    )

    alter_label = "ALTER ISSUE" if alter_mode == "ALTER_ISSUE" else ("ALTER RECEIVE" if alter_mode == "ALTER_RECEIVE" else "ALTER ISSUE & REC")

    # Map sheets
    floor_to_sheet = {
        "E2 - MUSHID BHAI": "E2-MUSHID BHAI",
        "E3 - SADDAM BHAI": "E3-SADDAM BHAI",
        "O3 - RAFIK BHAI": "O3-RAFIK BHAI",
        "E5 - TOHIDUL BHAI": "E5-TOHIDUL BHAI",
        "MIX": "MIX",
    }

    # Group Karigars by sheet
    sheet_data_map: Dict[str, List[Dict[str, Any]]] = {s[0]: [] for s in SHEET_ORDER}
    for k in all_karigars:
        sheet_data_map["ALL"].append(k)
        sname = floor_to_sheet.get(k["floor"], "MIX")
        if sname in sheet_data_map:
            sheet_data_map[sname].append(k)
        else:
            sheet_data_map["MIX"].append(k)

    date_label = f"{from_date} to {to_date}" if from_date != to_date else from_date

    # Create Each Sheet
    for sheet_code, title_text in SHEET_ORDER:
        ws = wb.create_sheet(title=sheet_code)
        ws.views.sheetView[0].showGridLines = True

        if sheet_code == "LINEMAN RANKING":
            # Row 1: Title
            ws.merge_cells("A1:I1")
            ws["A1"].value = "OSLC LINEMAN WISE ALTER RANKING & COMPARISON"
            ws["A1"].font = font_title
            ws["A1"].fill = header_navy
            ws["A1"].alignment = align_center
            ws.row_dimensions[1].height = 32

            # Row 2: Subtitle
            ws.merge_cells("A2:I2")
            ws["A2"].value = f"Data Period: {date_label}  |  કયા લાઇનમેનના કારીગરોમાં વધુ ઓલ્ટર છે તેનું રેન્કિંગ  |  {COMPANY_NAME}"
            ws["A2"].font = font_sub
            ws["A2"].alignment = align_center
            ws.row_dimensions[2].height = 20
            ws.row_dimensions[3].height = 8

            # Row 4: Headers
            headers = [
                ("RANK", 10),
                ("FLOOR / LINEMAN", 24),
                ("KARIGARS", 14),
                ("STR QTY (PCS.)", 16),
                ("ALTER QTY (PCS.)", 18),
                ("TOTAL PIECES", 16),
                ("ALTER %", 14),
                ("HIGH ALTER (>5%)", 18),
                ("HIGHEST ALTER TAILOR", 28),
            ]
            ws.row_dimensions[4].height = 24
            for c_idx, (h_name, w) in enumerate(headers, start=1):
                cell = ws.cell(4, c_idx, h_name)
                cell.font = font_col_header
                cell.fill = header_navy
                cell.alignment = align_center
                ws.column_dimensions[get_column_letter(c_idx)].width = w

            # Populate Lineman Rows
            c_row = 5
            sum_lm_karigars = 0
            sum_lm_str = 0
            sum_lm_alt = 0
            sum_lm_tot = 0
            sum_lm_high = 0

            warning_fill = PatternFill("solid", fgColor="FCE8E6")
            warn_font = Font(name="Calibri", size=10, bold=True, color="C5221F")

            for lm in raw_data.get("lineman_ranking", []):
                ws.row_dimensions[c_row].height = 22
                ws.cell(c_row, 1, f"#{lm['rank']}").alignment = align_center
                ws.cell(c_row, 2, lm["floor"]).alignment = align_left
                ws.cell(c_row, 3, lm["karigar_count"]).alignment = align_right
                ws.cell(c_row, 4, lm["sti_qty"]).alignment = align_right
                ws.cell(c_row, 5, lm["alter_qty"]).alignment = align_right
                ws.cell(c_row, 6, lm["total_pieces"]).alignment = align_right

                c_alt = ws.cell(c_row, 7, lm["alter_percent"] / 100.0)
                c_alt.alignment = align_right
                c_alt.number_format = "0.00%"

                ws.cell(c_row, 8, lm["high_alter_count"]).alignment = align_right
                ws.cell(c_row, 9, lm["worst_karigar"]).alignment = align_left

                # Highlight Rank 1 or High Alter (>5%)
                if lm["rank"] == 1 or lm["alter_percent"] >= 5.0:
                    for col_i in range(1, 10):
                        ws.cell(c_row, col_i).fill = warning_fill
                        ws.cell(c_row, col_i).font = warn_font

                for col_i in range(1, 10):
                    if lm["rank"] != 1 and lm["alter_percent"] < 5.0:
                        ws.cell(c_row, col_i).font = font_data
                    ws.cell(c_row, col_i).border = thin_border

                sum_lm_karigars += lm["karigar_count"]
                sum_lm_str += lm["sti_qty"]
                sum_lm_alt += lm["alter_qty"]
                sum_lm_tot += lm["total_pieces"]
                sum_lm_high += lm["high_alter_count"]
                c_row += 1

            # Lineman Total Row
            ws.row_dimensions[c_row].height = 24
            tot_alt_pct = (sum_lm_alt / sum_lm_tot) if sum_lm_tot > 0 else 0.0

            ws.cell(c_row, 1, "TOTAL").alignment = align_center
            ws.cell(c_row, 2, "OVERALL").alignment = align_left
            ws.cell(c_row, 3, sum_lm_karigars).alignment = align_right
            ws.cell(c_row, 4, sum_lm_str).alignment = align_right
            ws.cell(c_row, 5, sum_lm_alt).alignment = align_right
            ws.cell(c_row, 6, sum_lm_tot).alignment = align_right

            c_tot_alt = ws.cell(c_row, 7, tot_alt_pct)
            c_tot_alt.alignment = align_right
            c_tot_alt.number_format = "0.00%"

            ws.cell(c_row, 8, sum_lm_high).alignment = align_right
            ws.cell(c_row, 9, "").alignment = align_left

            for col_i in range(1, 10):
                c = ws.cell(c_row, col_i)
                c.font = font_total
                c.fill = total_green
                c.border = total_border

            # Section: Top High Alter Tailors across Factory
            c_row += 2
            ws.merge_cells(f"A{c_row}:I{c_row}")
            ws[f"A{c_row}"].value = "TOP HIGH ALTER TAILORS (ફેક્ટરીમાં સૌથી વધુ ઓલ્ટર વાળા ટોપ કારીગરો)"
            ws[f"A{c_row}"].font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
            ws[f"A{c_row}"].fill = PatternFill("solid", fgColor="C5221F")
            ws[f"A{c_row}"].alignment = align_center
            ws.row_dimensions[c_row].height = 22
            c_row += 1

            sub_headers = ["#", "EMPLOYEE", "KARIGAR NAME", "FLOOR / LINEMAN", "STR QTY", "ALTER QTY", "TOTAL", "ALTER %", "STATUS"]
            ws.row_dimensions[c_row].height = 20
            for col_i, sh in enumerate(sub_headers, start=1):
                cell = ws.cell(c_row, col_i, sh)
                cell.font = font_col_header
                cell.fill = header_navy
                cell.alignment = align_center
            c_row += 1

            for t_idx, tk in enumerate(raw_data.get("factory_worst_tailors", []), start=1):
                ws.row_dimensions[c_row].height = 18
                ws.cell(c_row, 1, t_idx).alignment = align_center
                ws.cell(c_row, 2, tk["employee_key"]).alignment = align_left
                ws.cell(c_row, 3, tk["karigar_name"]).alignment = align_left
                ws.cell(c_row, 4, tk["floor"]).alignment = align_left
                ws.cell(c_row, 5, tk["sti_qty"]).alignment = align_right
                ws.cell(c_row, 6, tk["alter_qty"]).alignment = align_right
                ws.cell(c_row, 7, tk["total_pieces"]).alignment = align_right

                c_tpct = ws.cell(c_row, 8, tk["alter_percent"] / 100.0)
                c_tpct.alignment = align_right
                c_tpct.number_format = "0.00%"

                ws.cell(c_row, 9, "HIGH ALTER" if tk["alter_percent"] >= 5.0 else "NORMAL").alignment = align_center

                for col_i in range(1, 10):
                    c = ws.cell(c_row, col_i)
                    c.font = font_data
                    c.border = thin_border
                c_row += 1

            continue

        # Standard Karigar Sheets (ALL, E2, E3, etc.)
        # Row 1: Main Title Banner
        ws.merge_cells("A1:I1")
        c1 = ws["A1"]
        c1.value = title_text
        c1.font = font_title
        c1.fill = header_navy
        c1.alignment = align_center
        ws.row_dimensions[1].height = 32

        # Row 2: Subtitle
        ws.merge_cells("A2:I2")
        c2 = ws["A2"]
        c2.value = f"Data Period: {date_label}  |  DigiBizz Report 127 Engine  |  {COMPANY_NAME}"
        c2.font = font_sub
        c2.alignment = align_center
        ws.row_dimensions[2].height = 20

        # Row 3: Blank
        ws.row_dimensions[3].height = 8

        # Row 4: Column Headers (Merged)
        ws.row_dimensions[4].height = 22
        ws.row_dimensions[5].height = 22

        # A4:A5 - EMPLOYEE
        ws.merge_cells("A4:A5")
        ws["A4"].value = "EMPLOYEE"
        ws["A4"].fill = header_navy
        ws["A4"].font = font_col_header
        ws["A4"].alignment = align_center

        # B4:B5 - KARIGAR NAME
        ws.merge_cells("B4:B5")
        ws["B4"].value = "KARIGAR NAME"
        ws["B4"].fill = header_navy
        ws["B4"].font = font_col_header
        ws["B4"].alignment = align_center

        # C4:C5 - FLOOR / LINE MAN
        ws.merge_cells("C4:C5")
        ws["C4"].value = "FLOOR / LINE MAN"
        ws["C4"].fill = header_navy
        ws["C4"].font = font_col_header
        ws["C4"].alignment = align_center

        # D4:F4 - STR (STITCHING RECEIVE)
        ws.merge_cells("D4:F4")
        ws["D4"].value = "STR (STITCHING RECEIVE)"
        ws["D4"].fill = header_navy
        ws["D4"].font = font_col_header
        ws["D4"].alignment = align_center

        ws["D5"].value = "STR DESIGN COUNT"
        ws["D5"].fill = sub_blue
        ws["D5"].font = font_sub_header
        ws["D5"].alignment = align_center

        ws["E5"].value = "STR QTY (PCS.)"
        ws["E5"].fill = sub_blue
        ws["E5"].font = font_sub_header
        ws["E5"].alignment = align_center

        ws["F5"].value = "STR %"
        ws["F5"].fill = sub_blue
        ws["F5"].font = font_sub_header
        ws["F5"].alignment = align_center

        # G4:I4 - ALTER ({alter_label})
        ws.merge_cells("G4:I4")
        ws["G4"].value = f"ALTER ({alter_label})"
        ws["G4"].fill = header_navy
        ws["G4"].font = font_col_header
        ws["G4"].alignment = align_center

        ws["G5"].value = "ALTER DESIGN COUNT"
        ws["G5"].fill = sub_blue
        ws["G5"].font = font_sub_header
        ws["G5"].alignment = align_center

        ws["H5"].value = "ALTER QTY (PCS.)"
        ws["H5"].fill = sub_blue
        ws["H5"].font = font_sub_header
        ws["H5"].alignment = align_center

        ws["I5"].value = "ALTER %"
        ws["I5"].fill = sub_blue
        ws["I5"].font = font_sub_header
        ws["I5"].alignment = align_center

        # Populate Data Rows
        k_list = sheet_data_map.get(sheet_code, [])
        curr_row = 6
        sum_sti_designs = 0
        sum_sti_qty = 0.0
        sum_alt_designs = 0
        sum_alt_qty = 0.0

        for item in k_list:
            ws.row_dimensions[curr_row].height = 19

            ws.cell(curr_row, 1, item["employee_key"]).alignment = align_left
            ws.cell(curr_row, 2, item["karigar_name"]).alignment = align_left
            ws.cell(curr_row, 3, item["floor"]).alignment = align_left

            # STI Design Count & Qty
            c_d = ws.cell(curr_row, 4, item["sti_design_count"])
            c_d.alignment = align_right
            c_d.number_format = "#,##0"

            c_e = ws.cell(curr_row, 5, item["sti_qty"])
            c_e.alignment = align_right
            c_e.number_format = "#,##0"

            # STI %
            c_f = ws.cell(curr_row, 6, item["sti_percent"] / 100.0)
            c_f.alignment = align_right
            c_f.number_format = "0.00%"

            # Alter Design Count & Qty
            c_g = ws.cell(curr_row, 7, item["alter_design_count"])
            c_g.alignment = align_right
            c_g.number_format = "#,##0"

            c_h = ws.cell(curr_row, 8, item["alter_qty"])
            c_h.alignment = align_right
            c_h.number_format = "#,##0"

            # Alter %
            c_i = ws.cell(curr_row, 9, item["alter_percent"] / 100.0)
            c_i.alignment = align_right
            c_i.number_format = "0.00%"

            # Formatting
            for col_idx in range(1, 10):
                c = ws.cell(curr_row, col_idx)
                c.font = font_data
                c.border = thin_border

            sum_sti_designs += item["sti_design_count"]
            sum_sti_qty += item["sti_qty"]
            sum_alt_designs += item["alter_design_count"]
            sum_alt_qty += item["alter_qty"]

            curr_row += 1

        # Summary Total Row
        ws.row_dimensions[curr_row].height = 24
        tot_pieces = sum_sti_qty + sum_alt_qty
        tot_sti_pct = (sum_sti_qty / tot_pieces) if tot_pieces > 0 else 0.0
        tot_alt_pct = (sum_alt_qty / sum_sti_qty) if sum_sti_qty > 0 else 0.0

        ws.cell(curr_row, 1, "TOTAL").alignment = align_left
        ws.cell(curr_row, 2, f"{len(k_list)} Karigar").alignment = align_left
        ws.cell(curr_row, 3, "").alignment = align_left

        c_tot_d = ws.cell(curr_row, 4, sum_sti_designs)
        c_tot_d.alignment = align_right
        c_tot_d.number_format = "#,##0"

        c_tot_e = ws.cell(curr_row, 5, sum_sti_qty)
        c_tot_e.alignment = align_right
        c_tot_e.number_format = "#,##0"

        c_tot_f = ws.cell(curr_row, 6, tot_sti_pct)
        c_tot_f.alignment = align_right
        c_tot_f.number_format = "0.00%"

        c_tot_g = ws.cell(curr_row, 7, sum_alt_designs)
        c_tot_g.alignment = align_right
        c_tot_g.number_format = "#,##0"

        c_tot_h = ws.cell(curr_row, 8, sum_alt_qty)
        c_tot_h.alignment = align_right
        c_tot_h.number_format = "#,##0"

        c_tot_i = ws.cell(curr_row, 9, tot_alt_pct)
        c_tot_i.alignment = align_right
        c_tot_i.number_format = "0.00%"

        for col_idx in range(1, 10):
            c = ws.cell(curr_row, col_idx)
            c.font = font_total
            c.fill = total_green
            c.border = total_border

        # Adjust column widths nicely
        col_widths = {
            1: 30,  # EMPLOYEE
            2: 24,  # KARIGAR NAME
            3: 22,  # FLOOR / LINE MAN
            4: 18,  # STI DESIGN COUNT
            5: 18,  # STI QTY
            6: 12,  # STI %
            7: 20,  # ALTER DESIGN COUNT
            8: 18,  # ALTER QTY
            9: 12,  # ALTER %
        }
        for col_idx, width in col_widths.items():
            col_letter = get_column_letter(col_idx)
            ws.column_dimensions[col_letter].width = width

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def build_period_comparison_report(
    from_date1: str,
    to_date1: str,
    from_date2: str,
    to_date2: str,
    alter_mode: str = "ALTER_ISSUE",
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Compares two separate date periods (e.g. Last 60 Days vs Last 15 Days) side-by-side.
    Aligns all karigars across both periods, filling 0 for any period where a tailor had no activity.
    """
    map1 = query_aggregated_report_data(from_date1, to_date1, alter_mode, force_refresh)
    map2 = query_aggregated_report_data(from_date2, to_date2, alter_mode, force_refresh)

    # Helper function to sort employee keys by numeric code (e.g. M14 -> 14, M29 -> 29)
    def sort_key(key_str: str):
        nums = re.findall(r"\d+", key_str)
        num_val = int(nums[0]) if nums else 99999
        return (num_val, key_str)

    all_keys = sorted(list(set(map1.keys()) | set(map2.keys())), key=sort_key)

    p1_tot_sti = 0.0
    p1_tot_alt = 0.0
    p2_tot_sti = 0.0
    p2_tot_alt = 0.0

    by_name, by_code = get_employee_doj_map(force_refresh=force_refresh)

    comparison_rows = []
    for ek in all_keys:
        d1 = map1.get(ek, {})
        d2 = map2.get(ek, {})

        k_name = d2.get("karigar_name") or d1.get("karigar_name") or ek
        raw_nm = d2.get("raw_name") or d1.get("raw_name") or ek
        fl = d2.get("floor") or d1.get("floor") or "MIX"
        emp_code = d2.get("employee_code") or d1.get("employee_code") or ""

        # Prioritize exact employee raw name / key to differentiate shared codes (e.g. M5-ARJUN vs M5-PRABIR)
        doj_val = lookup_employee_doj(emp_code, raw_nm, by_name, by_code)
        if not doj_val:
            doj_val = lookup_employee_doj(emp_code, ek, by_name, by_code)
        if not doj_val:
            doj_val = lookup_employee_doj(emp_code, k_name, by_name, by_code)

        p1_sti = round(d1.get("sti_qty", 0.0), 2)
        p1_alt = round(d1.get("alter_qty", 0.0), 2)
        p1_pct = round((p1_alt / p1_sti) * 100, 2) if p1_sti > 0 else (100.0 if p1_alt > 0 else 0.0)

        p2_sti = round(d2.get("sti_qty", 0.0), 2)
        p2_alt = round(d2.get("alter_qty", 0.0), 2)
        p2_pct = round((p2_alt / p2_sti) * 100, 2) if p2_sti > 0 else (100.0 if p2_alt > 0 else 0.0)

        diff_pct = round(p2_pct - p1_pct, 2)

        p1_tot_sti += p1_sti
        p1_tot_alt += p1_alt
        p2_tot_sti += p2_sti
        p2_tot_alt += p2_alt

        comparison_rows.append({
            "doj": doj_val,
            "employee_key": ek,
            "karigar_name": k_name,
            "floor": fl,
            "employee_code": emp_code,
            "p1_sti_qty": int(p1_sti) if p1_sti.is_integer() else p1_sti,
            "p1_alter_qty": int(p1_alt) if p1_alt.is_integer() else p1_alt,
            "p1_alter_percent": p1_pct,
            "p2_sti_qty": int(p2_sti) if p2_sti.is_integer() else p2_sti,
            "p2_alter_qty": int(p2_alt) if p2_alt.is_integer() else p2_alt,
            "p2_alter_percent": p2_pct,
            "diff_percent": diff_pct,
        })

    # Sort rows so that tailors with highest DIFF % are at the top, descending downwards
    comparison_rows.sort(key=lambda r: (r["diff_percent"], r["p2_alter_qty"], r["p1_alter_qty"]), reverse=True)

    p1_tot_pct = round((p1_tot_alt / p1_tot_sti) * 100, 2) if p1_tot_sti > 0 else (100.0 if p1_tot_alt > 0 else 0.0)
    p2_tot_pct = round((p2_tot_alt / p2_tot_sti) * 100, 2) if p2_tot_sti > 0 else (100.0 if p2_tot_alt > 0 else 0.0)
    tot_diff_pct = round(p2_tot_pct - p1_tot_pct, 2)

    return {
        "success": True,
        "period1": {
            "from_date": from_date1,
            "to_date": to_date1,
            "total_sti_qty": int(p1_tot_sti) if p1_tot_sti.is_integer() else p1_tot_sti,
            "total_alter_qty": int(p1_tot_alt) if p1_tot_alt.is_integer() else p1_tot_alt,
            "total_alter_percent": p1_tot_pct,
        },
        "period2": {
            "from_date": from_date2,
            "to_date": to_date2,
            "total_sti_qty": int(p2_tot_sti) if p2_tot_sti.is_integer() else p2_tot_sti,
            "total_alter_qty": int(p2_tot_alt) if p2_tot_alt.is_integer() else p2_tot_alt,
            "total_alter_percent": p2_tot_pct,
        },
        "total_diff_percent": tot_diff_pct,
        "total_karigars": len(comparison_rows),
        "rows": comparison_rows,
    }


def generate_period_comparison_excel(
    from_date1: str,
    to_date1: str,
    from_date2: str,
    to_date2: str,
    alter_mode: str = "ALTER_ISSUE",
    p1_label: Optional[str] = None,
    p2_label: Optional[str] = None
) -> io.BytesIO:
    """
    Generates exact Excel file matching User's reference photo:
    - Sheet Name: 'ALTER REPORT'
    - Header 1 (Blue #5b9bd5): DOJ | P1_LABEL (B-E) | P2_LABEL (F-I) | DIFF % (J)
    - Header 2 (Blue #5b9bd5): M.NO | STITCHING RECEIVE QTY | ALTER ISSUE QTY | PERCENTAGE | ... | DIFF %
    - Data rows: side-by-side for each tailor with borders and formats, sorted by DIFF % descending.
    """
    data = build_period_comparison_report(from_date1, to_date1, from_date2, to_date2, alter_mode=alter_mode)

    wb = Workbook()
    ws = wb.active
    ws.title = "ALTER REPORT"
    ws.views.sheetView[0].showGridLines = True

    # Styling
    header_fill = PatternFill(start_color="5B9BD5", end_color="5B9BD5", fill_type="solid")
    diff_header_fill = PatternFill(start_color="E11D48", end_color="E11D48", fill_type="solid")
    total_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    font_header = Font(name="Times New Roman", size=11, bold=True, color="000000")
    font_diff_header = Font(name="Times New Roman", size=11, bold=True, color="FFFFFF")
    font_data = Font(name="Times New Roman", size=10, bold=False, color="000000")
    font_total = Font(name="Times New Roman", size=11, bold=True, color="000000")

    thin_border = Border(
        left=Side(style="thin", color="000000"),
        right=Side(style="thin", color="000000"),
        top=Side(style="thin", color="000000"),
        bottom=Side(style="thin", color="000000")
    )
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    def _fmt_dmy(iso_val: str) -> str:
        if not iso_val:
            return ""
        pts = str(iso_val).strip().split("-")
        return f"{pts[2]}-{pts[1]}-{pts[0]}" if len(pts) == 3 else iso_val

    def _days_diff(d1_str: str, d2_str: str) -> int:
        try:
            dt1 = datetime.strptime(d1_str.strip(), "%Y-%m-%d").date()
            dt2 = datetime.strptime(d2_str.strip(), "%Y-%m-%d").date()
            return abs((dt2 - dt1).days) + 1
        except Exception:
            return 0

    diff1 = _days_diff(from_date1, to_date1)
    diff2 = _days_diff(from_date2, to_date2)
    def_label1 = f"{diff1} DAYS ({_fmt_dmy(from_date1)} TO {_fmt_dmy(to_date1)})"
    def_label2 = f"{diff2} DAYS ({_fmt_dmy(from_date2)} TO {_fmt_dmy(to_date2)})"

    label1 = p1_label or def_label1
    label2 = p2_label or def_label2

    # Row 1: Merged Headers
    ws.row_dimensions[1].height = 28
    ws.row_dimensions[2].height = 24

    ws.merge_cells("B1:E1")
    ws.merge_cells("F1:I1")
    ws.merge_cells("J1:J2")

    ws["A1"] = "DOJ"
    ws["B1"] = label1.upper()
    ws["F1"] = label2.upper()
    ws["J1"] = "DIFF %"

    for col in range(1, 10):
        cell = ws.cell(1, col)
        cell.fill = header_fill
        cell.font = font_header
        cell.alignment = align_center
        cell.border = thin_border

    cell_j1 = ws.cell(1, 10)
    cell_j1.fill = diff_header_fill
    cell_j1.font = font_diff_header
    cell_j1.alignment = align_center
    cell_j1.border = thin_border

    cell_j2 = ws.cell(2, 10)
    cell_j2.fill = diff_header_fill
    cell_j2.font = font_diff_header
    cell_j2.alignment = align_center
    cell_j2.border = thin_border

    # Row 2: Sub Headers
    sub_headers = [
        (1, "DOJ"),
        (2, "M.NO"),
        (3, "STITCHING RECEIVE QTY"),
        (4, "ALTER ISSUE QTY"),
        (5, "PERCENTAGE"),
        (6, "M.NO"),
        (7, "STITCHING RECEIVE QTY"),
        (8, "ALTER ISSUE QTY"),
        (9, "PERCENTAGE"),
    ]

    for col_idx, text in sub_headers:
        c = ws.cell(2, col_idx, text)
        c.fill = header_fill
        c.font = font_header
        c.alignment = align_center
        c.border = thin_border

    # Data Rows
    curr_row = 3
    for r in data["rows"]:
        ws.row_dimensions[curr_row].height = 20

        # Col A: DOJ (Date of Joining)
        cA = ws.cell(curr_row, 1, r.get("doj", "") or "")
        cA.alignment = align_center

        # Period 1: B, C, D, E
        cB = ws.cell(curr_row, 2, r["employee_key"])
        cB.alignment = align_left

        cC = ws.cell(curr_row, 3, r["p1_sti_qty"])
        cC.alignment = align_right
        cC.number_format = "#,##0"

        cD = ws.cell(curr_row, 4, r["p1_alter_qty"])
        cD.alignment = align_right
        cD.number_format = "#,##0"

        cE = ws.cell(curr_row, 5, r["p1_alter_percent"] / 100.0)
        cE.alignment = align_right
        cE.number_format = "0.00%"

        # Period 2: F, G, H, I
        cF = ws.cell(curr_row, 6, r["employee_key"])
        cF.alignment = align_left

        cG = ws.cell(curr_row, 7, r["p2_sti_qty"])
        cG.alignment = align_right
        cG.number_format = "#,##0"

        cH = ws.cell(curr_row, 8, r["p2_alter_qty"])
        cH.alignment = align_right
        cH.number_format = "#,##0"

        cI = ws.cell(curr_row, 9, r["p2_alter_percent"] / 100.0)
        cI.alignment = align_right
        cI.number_format = "0.00%"

        # Col 10 (J): DIFF %
        diff_pct = r.get("diff_percent", round(r["p2_alter_percent"] - r["p1_alter_percent"], 2))
        cJ = ws.cell(curr_row, 10, diff_pct / 100.0)
        cJ.alignment = align_right
        cJ.number_format = "+0.00%;-0.00%;0.00%"

        for col_idx in range(1, 11):
            c = ws.cell(curr_row, col_idx)
            c.font = font_total if col_idx == 10 and diff_pct > 0 else font_data
            c.border = thin_border

        curr_row += 1

    # Total Summary Row
    ws.row_dimensions[curr_row].height = 22
    p1_meta = data["period1"]
    p2_meta = data["period2"]

    ws.cell(curr_row, 1, "")
    c_tot_lbl = ws.cell(curr_row, 2, "TOTAL")
    c_tot_lbl.alignment = align_left

    c_p1_sti = ws.cell(curr_row, 3, p1_meta["total_sti_qty"])
    c_p1_sti.alignment = align_right
    c_p1_sti.number_format = "#,##0"

    c_p1_alt = ws.cell(curr_row, 4, p1_meta["total_alter_qty"])
    c_p1_alt.alignment = align_right
    c_p1_alt.number_format = "#,##0"

    c_p1_pct = ws.cell(curr_row, 5, p1_meta["total_alter_percent"] / 100.0)
    c_p1_pct.alignment = align_right
    c_p1_pct.number_format = "0.00%"

    c_tot_lbl2 = ws.cell(curr_row, 6, "TOTAL")
    c_tot_lbl2.alignment = align_left

    c_p2_sti = ws.cell(curr_row, 7, p2_meta["total_sti_qty"])
    c_p2_sti.alignment = align_right
    c_p2_sti.number_format = "#,##0"

    c_p2_alt = ws.cell(curr_row, 8, p2_meta["total_alter_qty"])
    c_p2_alt.alignment = align_right
    c_p2_alt.number_format = "#,##0"

    c_p2_pct = ws.cell(curr_row, 9, p2_meta["total_alter_percent"] / 100.0)
    c_p2_pct.alignment = align_right
    c_p2_pct.number_format = "0.00%"

    tot_diff = round(p2_meta["total_alter_percent"] - p1_meta["total_alter_percent"], 2)
    c_tot_diff = ws.cell(curr_row, 10, tot_diff / 100.0)
    c_tot_diff.alignment = align_right
    c_tot_diff.number_format = "+0.00%;-0.00%;0.00%"

    for col_idx in range(1, 11):
        c = ws.cell(curr_row, col_idx)
        c.font = font_total
        c.fill = total_fill
        c.border = thin_border

    # Column Widths
    col_widths = {
        1: 14,  # DOJ (DD-MM-YYYY)
        2: 28,  # P1 M.NO
        3: 24,  # P1 STR QTY
        4: 18,  # P1 ALT QTY
        5: 14,  # P1 PERCENTAGE
        6: 28,  # P2 M.NO
        7: 24,  # P2 STR QTY
        8: 18,  # P2 ALT QTY
        9: 14,  # P2 PERCENTAGE
        10: 16, # DIFF %
    }
    for col_idx, width in col_widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def query_alter_checking_aggregated_data(
    from_date: str,
    to_date: str,
    alter_mode: str = "ALTER_ISSUE",
    force_refresh: bool = False
) -> Dict[str, Dict[str, Any]]:
    """
    Aggregates Stitching Receive and Alter transactions for the Alter Checking report:
    1. Stitching Receive: ALL lot numbers and all rows in the period are included.
    2. Alter (Issue / Receive / Both): ONLY rows where LOT_NO is duplicate (DB alter,
       i.e. appears > 1 time in Alter in the period).
    """
    cache_key = f"chk_agg_{from_date}_{to_date}_{alter_mode}"
    if not force_refresh and cache_key in _CACHE:
        t, data = _CACHE[cache_key]
        if time.time() - t < CACHE_TTL:
            return data

    processes = []
    if alter_mode == "ALTER_RECEIVE":
        processes.append("Alter Receive")
    elif alter_mode == "BOTH":
        processes.extend(["Alter Issue", "Alter Receive"])
    else:
        processes.append("Alter Issue")

    alt_proc_sql = ", ".join(f"'{p}'" for p in processes)

    conn = get_connection()
    cur = conn.cursor()

    # Step 1: Query all Stitching Receive aggregated by Employee
    q_sti = f"""
    SET NOCOUNT ON;
    SET DEADLOCK_PRIORITY LOW;
    SELECT
        ISNULL(EMPLOYEE_CODE, '') AS EMP_CODE,
        ISNULL(EMPLOYEE_NAME, '') AS EMP_NAME,
        COUNT(DISTINCT ISNULL(NULLIF(ITEM_NAME, ''), SKU_CODE)) AS DESIGN_CNT,
        SUM(CAST(ISNULL(QTY_PIECES, 0) AS FLOAT)) AS TOT_QTY
    FROM View_Dboard_Trans_Process_Detail_Data WITH (NOLOCK)
    WHERE TRANS_TYPE_NAME = 'Stitching Receive'
      AND TRANS_DATE >= '{from_date}' AND TRANS_DATE <= '{to_date}'
    GROUP BY ISNULL(EMPLOYEE_CODE, ''), ISNULL(EMPLOYEE_NAME, '');
    """
    cur.execute(q_sti)
    sti_data = cur.fetchall()

    # Step 2: Query Alter rows grouped by Employee and LOT_NO
    q_alt = f"""
    SET NOCOUNT ON;
    SET DEADLOCK_PRIORITY LOW;
    SELECT
        ISNULL(EMPLOYEE_CODE, '') AS EMP_CODE,
        ISNULL(EMPLOYEE_NAME, '') AS EMP_NAME,
        ISNULL(LOT_NO, '') AS LOT_NO,
        COUNT(DISTINCT ISNULL(NULLIF(ITEM_NAME, ''), SKU_CODE)) AS DESIGN_CNT,
        SUM(CAST(ISNULL(QTY_PIECES, 0) AS FLOAT)) AS TOT_QTY,
        COUNT(*) AS ROW_CNT
    FROM View_Dboard_Trans_Process_Detail_Data WITH (NOLOCK)
    WHERE TRANS_TYPE_NAME IN ({alt_proc_sql})
      AND TRANS_DATE >= '{from_date}' AND TRANS_DATE <= '{to_date}'
      AND LOT_NO IS NOT NULL AND LTRIM(RTRIM(LOT_NO)) <> ''
    GROUP BY ISNULL(EMPLOYEE_CODE, ''), ISNULL(EMPLOYEE_NAME, ''), ISNULL(LOT_NO, '');
    """
    cur.execute(q_alt)
    alt_data = cur.fetchall()
    conn.close()

    # Find which LOT_NOs appear more than once in Alter (DB / Duplicate lots)
    lot_counts: Dict[str, int] = defaultdict(int)
    for code, name, lot_no, des_cnt, qty, row_cnt in alt_data:
        lot_counts[lot_no] += row_cnt

    dup_lots = {lot for lot, cnt in lot_counts.items() if cnt > 1}

    k_map: Dict[str, Dict[str, Any]] = {}

    # Add all Stitching Receive (all lots)
    for code, name, des_cnt, qty in sti_data:
        emp_code = str(code or "").strip()
        emp_name = str(name or "").strip()
        emp_key, clean_name, floor = parse_karigar_info(emp_code, emp_name)

        if emp_key not in k_map:
            k_map[emp_key] = {
                "employee_key": emp_key,
                "karigar_name": clean_name,
                "floor": floor,
                "employee_code": emp_code,
                "raw_name": emp_name,
                "sti_design_count": 0,
                "sti_qty": 0.0,
                "alter_design_count": 0,
                "alter_qty": 0.0,
            }
        k = k_map[emp_key]
        k["sti_qty"] += float(qty or 0.0)
        k["sti_design_count"] += int(des_cnt or 0)

    # Add Alter only for Duplicate (DB) Lots
    for code, name, lot_no, des_cnt, qty, row_cnt in alt_data:
        if lot_no not in dup_lots:
            continue
        emp_code = str(code or "").strip()
        emp_name = str(name or "").strip()
        emp_key, clean_name, floor = parse_karigar_info(emp_code, emp_name)

        if emp_key not in k_map:
            k_map[emp_key] = {
                "employee_key": emp_key,
                "karigar_name": clean_name,
                "floor": floor,
                "employee_code": emp_code,
                "raw_name": emp_name,
                "sti_design_count": 0,
                "sti_qty": 0.0,
                "alter_design_count": 0,
                "alter_qty": 0.0,
            }
        k = k_map[emp_key]
        k["alter_qty"] += float(qty or 0.0)
        k["alter_design_count"] += int(des_cnt or 0)

    _CACHE[cache_key] = (time.time(), k_map)
    return k_map


def build_alter_checking_report(
    from_date1: str,
    to_date1: str,
    from_date2: str,
    to_date2: str,
    alter_mode: str = "ALTER_ISSUE",
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Builds the 2-period comparison report for Alter Checking:
    - STR: All lots included
    - ALTER: DB (Duplicate) lots only
    """
    map1 = query_alter_checking_aggregated_data(from_date1, to_date1, alter_mode, force_refresh)
    map2 = query_alter_checking_aggregated_data(from_date2, to_date2, alter_mode, force_refresh)

    def sort_key(key_str: str):
        nums = re.findall(r"\d+", key_str)
        num_val = int(nums[0]) if nums else 99999
        return (num_val, key_str)

    all_keys = sorted(list(set(map1.keys()) | set(map2.keys())), key=sort_key)

    p1_tot_sti = 0.0
    p1_tot_alt = 0.0
    p2_tot_sti = 0.0
    p2_tot_alt = 0.0

    by_name, by_code = get_employee_doj_map(force_refresh=force_refresh)

    checking_rows = []
    for ek in all_keys:
        d1 = map1.get(ek, {})
        d2 = map2.get(ek, {})

        k_name = d2.get("karigar_name") or d1.get("karigar_name") or ek
        raw_nm = d2.get("raw_name") or d1.get("raw_name") or ek
        fl = d2.get("floor") or d1.get("floor") or "MIX"
        emp_code = d2.get("employee_code") or d1.get("employee_code") or ""

        doj_val = lookup_employee_doj(emp_code, raw_nm, by_name, by_code)
        if not doj_val:
            doj_val = lookup_employee_doj(emp_code, ek, by_name, by_code)
        if not doj_val:
            doj_val = lookup_employee_doj(emp_code, k_name, by_name, by_code)

        p1_sti = round(d1.get("sti_qty", 0.0), 2)
        p1_alt = round(d1.get("alter_qty", 0.0), 2)
        p1_pct = round((p1_alt / p1_sti) * 100, 2) if p1_sti > 0 else (100.0 if p1_alt > 0 else 0.0)

        p2_sti = round(d2.get("sti_qty", 0.0), 2)
        p2_alt = round(d2.get("alter_qty", 0.0), 2)
        p2_pct = round((p2_alt / p2_sti) * 100, 2) if p2_sti > 0 else (100.0 if p2_alt > 0 else 0.0)

        diff_pct = round(p2_pct - p1_pct, 2)

        p1_tot_sti += p1_sti
        p1_tot_alt += p1_alt
        p2_tot_sti += p2_sti
        p2_tot_alt += p2_alt

        checking_rows.append({
            "doj": doj_val,
            "employee_key": ek,
            "karigar_name": k_name,
            "floor": fl,
            "employee_code": emp_code,
            "p1_sti_qty": int(p1_sti) if p1_sti.is_integer() else p1_sti,
            "p1_alter_qty": int(p1_alt) if p1_alt.is_integer() else p1_alt,
            "p1_alter_percent": p1_pct,
            "p2_sti_qty": int(p2_sti) if p2_sti.is_integer() else p2_sti,
            "p2_alter_qty": int(p2_alt) if p2_alt.is_integer() else p2_alt,
            "p2_alter_percent": p2_pct,
            "diff_percent": diff_pct,
        })

    # Sort rows so that tailors with highest DIFF % are at the top, descending downwards
    checking_rows.sort(key=lambda r: (r["diff_percent"], r["p2_alter_qty"], r["p1_alter_qty"]), reverse=True)

    p1_tot_pct = round((p1_tot_alt / p1_tot_sti) * 100, 2) if p1_tot_sti > 0 else (100.0 if p1_tot_alt > 0 else 0.0)
    p2_tot_pct = round((p2_tot_alt / p2_tot_sti) * 100, 2) if p2_tot_sti > 0 else (100.0 if p2_tot_alt > 0 else 0.0)
    tot_diff_pct = round(p2_tot_pct - p1_tot_pct, 2)

    return {
        "success": True,
        "period1": {
            "from_date": from_date1,
            "to_date": to_date1,
            "total_sti_qty": int(p1_tot_sti) if p1_tot_sti.is_integer() else p1_tot_sti,
            "total_alter_qty": int(p1_tot_alt) if p1_tot_alt.is_integer() else p1_tot_alt,
            "total_alter_percent": p1_tot_pct,
        },
        "period2": {
            "from_date": from_date2,
            "to_date": to_date2,
            "total_sti_qty": int(p2_tot_sti) if p2_tot_sti.is_integer() else p2_tot_sti,
            "total_alter_qty": int(p2_tot_alt) if p2_tot_alt.is_integer() else p2_tot_alt,
            "total_alter_percent": p2_tot_pct,
        },
        "total_diff_percent": tot_diff_pct,
        "total_karigars": len(checking_rows),
        "rows": checking_rows,
    }


def generate_alter_checking_excel(
    from_date1: str,
    to_date1: str,
    from_date2: str,
    to_date2: str,
    alter_mode: str = "ALTER_ISSUE",
    p1_label: Optional[str] = None,
    p2_label: Optional[str] = None
) -> io.BytesIO:
    """
    Generates formatted Excel file for Alter Checking Report (STR: All Lots | ALTER: DB Lots Only).
    Includes Top 5 ranking, side-by-side comparison, and 10th DIFF % column sorted descending.
    """
    data = build_alter_checking_report(from_date1, to_date1, from_date2, to_date2, alter_mode=alter_mode)

    wb = Workbook()
    ws = wb.active
    ws.title = "ALTER CHECKING REPORT"
    ws.views.sheetView[0].showGridLines = True

    # Styling
    title_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
    diff_header_fill = PatternFill(start_color="E11D48", end_color="E11D48", fill_type="solid")
    top5_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    total_fill = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")

    font_title = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
    font_sub = Font(name="Calibri", size=10, italic=True, color="FFFFFF")
    font_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    font_diff_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    font_data = Font(name="Calibri", size=10, bold=False, color="000000")
    font_total = Font(name="Calibri", size=11, bold=True, color="000000")

    thin_border = Border(
        left=Side(style="thin", color="000000"),
        right=Side(style="thin", color="000000"),
        top=Side(style="thin", color="000000"),
        bottom=Side(style="thin", color="000000")
    )
    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    def _fmt_dmy(iso_val: str) -> str:
        if not iso_val:
            return ""
        pts = str(iso_val).strip().split("-")
        return f"{pts[2]}-{pts[1]}-{pts[0]}" if len(pts) == 3 else iso_val

    def _days_diff(d1_str: str, d2_str: str) -> int:
        try:
            dt1 = datetime.strptime(d1_str.strip(), "%Y-%m-%d").date()
            dt2 = datetime.strptime(d2_str.strip(), "%Y-%m-%d").date()
            return abs((dt2 - dt1).days) + 1
        except Exception:
            return 0

    diff1 = _days_diff(from_date1, to_date1)
    diff2 = _days_diff(from_date2, to_date2)
    def_label1 = f"{diff1} DAYS ({_fmt_dmy(from_date1)} TO {_fmt_dmy(to_date1)})"
    def_label2 = f"{diff2} DAYS ({_fmt_dmy(from_date2)} TO {_fmt_dmy(to_date2)})"

    label1 = p1_label or def_label1
    label2 = p2_label or def_label2

    # Row 1: Company Banner
    ws.row_dimensions[1].height = 26
    ws.merge_cells("A1:J1")
    ws["A1"] = f"{COMPANY_NAME} - ALTER CHECKING REPORT"
    ws["A1"].font = font_title
    ws["A1"].fill = title_fill
    ws["A1"].alignment = align_center

    # Row 2: Subtitle
    ws.row_dimensions[2].height = 20
    ws.merge_cells("A2:J2")
    ws["A2"] = "NOTE: Stitching Receive = ALL Lots | Alter = DB (Duplicate) Lots Only"
    ws["A2"].font = font_sub
    ws["A2"].fill = title_fill
    ws["A2"].alignment = align_center

    # Top 1 to 5 Ranking Section
    ws.row_dimensions[3].height = 12  # blank
    ws.row_dimensions[4].height = 22
    ws.merge_cells("A4:J4")
    ws["A4"] = "🏆 PAGE 4: TOP 1 TO 5 ALTER CHECKING TAILORS RANKING (RANKED BY P2 DB ALTER)"
    ws["A4"].font = font_header
    ws["A4"].fill = top5_fill
    ws["A4"].alignment = align_center

    # Row 5: Top 5 Headers
    ws.row_dimensions[5].height = 22
    top5_cols = [
        (1, "RANK"),
        (2, "DOJ"),
        (3, "EMPLOYEE"),
        (4, "KARIGAR NAME"),
        (5, "FLOOR / LINEMAN"),
        (6, "P1 STR QTY"),
        (7, "P1 DB ALTER QTY"),
        (8, "P2 STR QTY"),
        (9, "P2 DB ALTER QTY & %"),
        (10, "DIFF %"),
    ]
    for c_idx, txt in top5_cols:
        cell = ws.cell(5, c_idx, txt)
        cell.font = font_header
        cell.fill = top5_fill
        cell.alignment = align_center
        cell.border = thin_border

    # Sort rows by Period 2 alter_qty desc, then alter_pct desc for Top 5
    sorted_for_top5 = sorted(data["rows"], key=lambda x: (x["p2_alter_qty"], x["p2_alter_percent"]), reverse=True)
    top5_rows = sorted_for_top5[:5]
    top_curr_row = 6
    for idx, r in enumerate(top5_rows, 1):
        ws.row_dimensions[top_curr_row].height = 20
        c1 = ws.cell(top_curr_row, 1, f"#{idx}")
        c1.alignment = align_center
        c2 = ws.cell(top_curr_row, 2, r.get("doj", "") or "")
        c2.alignment = align_center
        c3 = ws.cell(top_curr_row, 3, r["employee_key"])
        c3.alignment = align_left
        c4 = ws.cell(top_curr_row, 4, r["karigar_name"])
        c4.alignment = align_left
        c5 = ws.cell(top_curr_row, 5, r["floor"])
        c5.alignment = align_left
        c6 = ws.cell(top_curr_row, 6, r["p1_sti_qty"])
        c6.alignment = align_right
        c6.number_format = "#,##0"
        c7 = ws.cell(top_curr_row, 7, r["p1_alter_qty"])
        c7.alignment = align_right
        c7.number_format = "#,##0"
        c8 = ws.cell(top_curr_row, 8, r["p2_sti_qty"])
        c8.alignment = align_right
        c8.number_format = "#,##0"
        c9 = ws.cell(top_curr_row, 9, f"{r['p2_alter_qty']} pcs ({r['p2_alter_percent']}%)")
        c9.alignment = align_right

        diff_t5 = r.get("diff_percent", round(r["p2_alter_percent"] - r["p1_alter_percent"], 2))
        c10 = ws.cell(top_curr_row, 10, diff_t5 / 100.0)
        c10.alignment = align_right
        c10.number_format = "+0.00%;-0.00%;0.00%"

        for col_idx in range(1, 11):
            c = ws.cell(top_curr_row, col_idx)
            c.font = font_total if col_idx == 10 and diff_t5 > 0 else font_data
            c.border = thin_border
        top_curr_row += 1

    # Blank row
    ws.row_dimensions[top_curr_row].height = 14
    top_curr_row += 1

    # Main Comparison Table
    row_tier1 = top_curr_row
    row_tier2 = top_curr_row + 1
    ws.row_dimensions[row_tier1].height = 26
    ws.row_dimensions[row_tier2].height = 22

    ws.merge_cells(start_row=row_tier1, start_column=2, end_row=row_tier1, end_column=5)
    ws.merge_cells(start_row=row_tier1, start_column=6, end_row=row_tier1, end_column=9)
    ws.merge_cells(start_row=row_tier1, start_column=10, end_row=row_tier2, end_column=10)

    ws.cell(row_tier1, 1, "DOJ")
    ws.cell(row_tier1, 2, label1.upper())
    ws.cell(row_tier1, 6, label2.upper())
    ws.cell(row_tier1, 10, "DIFF %")

    for col in range(1, 10):
        cell = ws.cell(row_tier1, col)
        cell.fill = header_fill
        cell.font = font_header
        cell.alignment = align_center
        cell.border = thin_border

    cell_diff_t1 = ws.cell(row_tier1, 10)
    cell_diff_t1.fill = diff_header_fill
    cell_diff_t1.font = font_diff_header
    cell_diff_t1.alignment = align_center
    cell_diff_t1.border = thin_border

    cell_diff_t2 = ws.cell(row_tier2, 10)
    cell_diff_t2.fill = diff_header_fill
    cell_diff_t2.border = thin_border

    sub_headers = [
        (1, "DOJ"),
        (2, "M.NO"),
        (3, "STITCHING RECEIVE QTY"),
        (4, "DB ALTER QTY"),
        (5, "PERCENTAGE"),
        (6, "M.NO"),
        (7, "STITCHING RECEIVE QTY"),
        (8, "DB ALTER QTY"),
        (9, "PERCENTAGE"),
    ]
    for col_idx, text in sub_headers:
        c = ws.cell(row_tier2, col_idx, text)
        c.fill = header_fill
        c.font = font_header
        c.alignment = align_center
        c.border = thin_border

    # Data Rows
    curr_row = row_tier2 + 1
    for r in data["rows"]:
        ws.row_dimensions[curr_row].height = 20

        cA = ws.cell(curr_row, 1, r.get("doj", "") or "")
        cA.alignment = align_center

        cB = ws.cell(curr_row, 2, r["employee_key"])
        cB.alignment = align_left

        cC = ws.cell(curr_row, 3, r["p1_sti_qty"])
        cC.alignment = align_right
        cC.number_format = "#,##0"

        cD = ws.cell(curr_row, 4, r["p1_alter_qty"])
        cD.alignment = align_right
        cD.number_format = "#,##0"

        cE = ws.cell(curr_row, 5, r["p1_alter_percent"] / 100.0)
        cE.alignment = align_right
        cE.number_format = "0.00%"

        cF = ws.cell(curr_row, 6, r["employee_key"])
        cF.alignment = align_left

        cG = ws.cell(curr_row, 7, r["p2_sti_qty"])
        cG.alignment = align_right
        cG.number_format = "#,##0"

        cH = ws.cell(curr_row, 8, r["p2_alter_qty"])
        cH.alignment = align_right
        cH.number_format = "#,##0"

        cI = ws.cell(curr_row, 9, r["p2_alter_percent"] / 100.0)
        cI.alignment = align_right
        cI.number_format = "0.00%"

        diff_pct = r.get("diff_percent", round(r["p2_alter_percent"] - r["p1_alter_percent"], 2))
        cJ = ws.cell(curr_row, 10, diff_pct / 100.0)
        cJ.alignment = align_right
        cJ.number_format = "+0.00%;-0.00%;0.00%"

        for col_idx in range(1, 11):
            c = ws.cell(curr_row, col_idx)
            c.font = font_total if col_idx == 10 and diff_pct > 0 else font_data
            c.border = thin_border

        curr_row += 1

    # Total Summary Row
    ws.row_dimensions[curr_row].height = 22
    p1_meta = data["period1"]
    p2_meta = data["period2"]

    ws.cell(curr_row, 1, "")
    c_tot_lbl = ws.cell(curr_row, 2, "TOTAL")
    c_tot_lbl.alignment = align_left

    c_p1_sti = ws.cell(curr_row, 3, p1_meta["total_sti_qty"])
    c_p1_sti.alignment = align_right
    c_p1_sti.number_format = "#,##0"

    c_p1_alt = ws.cell(curr_row, 4, p1_meta["total_alter_qty"])
    c_p1_alt.alignment = align_right
    c_p1_alt.number_format = "#,##0"

    c_p1_pct = ws.cell(curr_row, 5, p1_meta["total_alter_percent"] / 100.0)
    c_p1_pct.alignment = align_right
    c_p1_pct.number_format = "0.00%"

    c_tot_lbl2 = ws.cell(curr_row, 6, "TOTAL")
    c_tot_lbl2.alignment = align_left

    c_p2_sti = ws.cell(curr_row, 7, p2_meta["total_sti_qty"])
    c_p2_sti.alignment = align_right
    c_p2_sti.number_format = "#,##0"

    c_p2_alt = ws.cell(curr_row, 8, p2_meta["total_alter_qty"])
    c_p2_alt.alignment = align_right
    c_p2_alt.number_format = "#,##0"

    c_p2_pct = ws.cell(curr_row, 9, p2_meta["total_alter_percent"] / 100.0)
    c_p2_pct.alignment = align_right
    c_p2_pct.number_format = "0.00%"

    tot_diff = round(p2_meta["total_alter_percent"] - p1_meta["total_alter_percent"], 2)
    c_tot_diff = ws.cell(curr_row, 10, tot_diff / 100.0)
    c_tot_diff.alignment = align_right
    c_tot_diff.number_format = "+0.00%;-0.00%;0.00%"

    for col_idx in range(1, 11):
        c = ws.cell(curr_row, col_idx)
        c.font = font_total
        c.fill = total_fill
        c.border = thin_border

    # Column Widths
    col_widths = {
        1: 14,  # DOJ (DD-MM-YYYY)
        2: 28,  # P1 M.NO
        3: 24,  # P1 STR QTY
        4: 18,  # P1 DB ALT QTY
        5: 14,  # P1 PERCENTAGE
        6: 28,  # P2 M.NO
        7: 24,  # P2 STR QTY
        8: 18,  # P2 DB ALT QTY
        9: 14,  # P2 PERCENTAGE
        10: 16, # DIFF %
    }
    for col_idx, width in col_widths.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def prewarm_cache_background():
    """
    Spawns a background thread to pre-warm the Employee Master DOJ and initial report caches.
    This ensures that when the user opens the application, reports open in 0.001 seconds (instant)!
    """
    import threading
    from datetime import date, timedelta

    def _worker():
        try:
            # 1. Warm DOJ Map
            get_employee_doj_map(force_refresh=True)

            today = date.today()
            today_str = today.strftime("%Y-%m-%d")
            d30 = (today - timedelta(days=30)).strftime("%Y-%m-%d")
            d15 = (today - timedelta(days=15)).strftime("%Y-%m-%d")
            d60 = (today - timedelta(days=60)).strftime("%Y-%m-%d")

            # 2. Warm 30 days & 15 days reports
            build_karigar_report(d30, today_str, "ALTER_ISSUE")
            build_karigar_report(d15, today_str, "ALTER_ISSUE")

            # 3. Warm Comparison report (60d vs 15d)
            build_period_comparison_report(d60, today_str, d15, today_str, "ALTER_ISSUE")

            # 4. Warm Alter Checking report (60d vs 15d)
            build_alter_checking_report(d60, today_str, d15, today_str, "ALTER_ISSUE")
        except Exception:
            pass

    t = threading.Thread(target=_worker, daemon=True)
    t.start()


