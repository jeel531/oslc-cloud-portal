"""
OSLC CHEKING - Database and Excel Export Operations
Specifically tailored for DigiBizz Detail Report (127) - Checking Receive
Matching the exact layout and structure of CHEKING REPORT 20-9-26.xlsx
"""
from __future__ import annotations

import io
import re
from datetime import datetime
from typing import Any, Dict, List, Tuple
import importlib

try:
    import pyodbc
except ImportError:
    pyodbc = None

pymssql = None
try:
    pymssql = importlib.import_module("pymssql")
except Exception:
    pymssql = None
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from apps.mk.backend.config import DBConfig

cfg = DBConfig()

# Standard Department to Checker Hierarchy (from CHEKING REPORT 20-9-26.xlsx)
DEPARTMENT_CHECKERS = [
    {
        "dept": "SHIRT",
        "supervisor": "ABBAS",
        "checkers": [
            ("P643", "643(AMIR)"),
            ("P675", "675(SAHID)"),
            ("P658", "658(SUKCHAND)"),
            ("P615", "615(SALAM)"),
            ("P639", "639(ABDUL M)"),
            ("P636", "636(RAJU)"),
            ("P682", "682(APTABUDDIN)"),
            ("P683", "683(MURSID)"),
            ("P674", "674(HOSSIN)"),
            ("P4055", "4055(SUNITA)"),
            ("P4002", "4002(CHETALI)"),
        ]
    },
    {
        "dept": "KURTI",
        "supervisor": "ABDUL",
        "checkers": [
            ("P630", "630(ANARUL)"),
            ("P603", "603(SAFIUDDIN)"),
            ("P-OSLC", "OSLC"),
            ("P635", "635(ARMAN)"),
            ("P645", "645(YASIN)"),
            ("P664", "664(REJABUL)"),
            ("P667", "667(SAHIL)"),
            ("P638", "638(ARIFUL)"),
            ("P620", "620(KABIR)"),
            ("P646", "646(SAMIUL)"),
            ("P653", "653(KARIF)"),
            ("P662", "662(NUSURDDIN)"),
        ]
    },
    {
        "dept": "PENT",
        "supervisor": "ALI",
        "checkers": [
            ("P612", "612(SAKIR)"),
            ("P660", "660(SUSANTA)"),
            ("P654", "654(BARKTULLA)"),
            ("P637", "637(DELVER)"),
            ("P657", "657(SAHEB)"),
            ("P673", "673(SKRIBUL)"),
            ("P608", "608(SAFURDIN)"),
        ]
    },
    {
        "dept": "JOB WORK",
        "supervisor": "NAJIR",
        "checkers": [
            ("P661", "661(PARBESH)"),
            ("P652", "652(ASHIK)"),
            ("P647", "647(SAHID)"),
            ("P634", "634(KABIR H)"),
            ("P680", "680(ASMOT)"),
            ("P644", "644(REJAUL)"),
            ("P605", "605(ALINUR)"),
            ("P602", "602(MIJANUR)"),
            ("P622", "622(SAHRUKH)"),
        ]
    }
]


def get_connection():
    last_err = None
    if pyodbc is not None:
        try:
            return pyodbc.connect(cfg.connection_string, timeout=cfg.timeout)
        except Exception as e:
            last_err = e

    if pymssql is not None:
        try:
            host_parts = cfg.server.split(",")
            server_ip = host_parts[0]
            port = int(host_parts[1]) if len(host_parts) > 1 else 1433
            return pymssql.connect(
                server=server_ip,
                port=port,
                user=cfg.username,
                password=cfg.password,
                database=cfg.database,
                timeout=cfg.timeout
            )
        except Exception as e:
            last_err = e

    raise RuntimeError(f"Database connection failed: {last_err}")



def query_report_data(
    from_date: str,
    to_date: str,
    process_type: str = "Checking Receive",
    search: str = ""
) -> List[Dict[str, Any]]:
    """
    Query Checking Receive records for Detail Report (127).
    """
    # Strict filter for Checking Receive unless explicitly specified
    target_process = process_type if process_type and process_type != "ALL" else "Checking Receive"

    sql = """
        SELECT 
            RTRIM(LTRIM(ISNULL(VOUCHER_NO, ''))) AS VOUCHER_NO,
            CONVERT(VARCHAR(10), TRANS_DATE, 120) AS TRANS_DATE,
            CONVERT(VARCHAR(19), CREATED_DATE, 120) AS CREATED_AT,
            RTRIM(LTRIM(ISNULL(TRANS_TYPE_NAME, ''))) AS TRANS_TYPE_NAME,
            RTRIM(LTRIM(ISNULL(ENTRY_STATUS, 'FRESH'))) AS ENTRY_STATUS,
            RTRIM(LTRIM(ISNULL(ITEM_NAME, ''))) AS ITEM_NAME,
            RTRIM(LTRIM(ISNULL(ITEM_GROUP_NAME, ''))) AS ITEM_GROUP_NAME,
            RTRIM(LTRIM(ISNULL(BASE_ITEM_NAME, ''))) AS BASE_ITEM_NAME,
            RTRIM(LTRIM(ISNULL(SIZE, ''))) AS SIZE,
            RTRIM(LTRIM(ISNULL(SKU_CODE, ''))) AS SKU_CODE,
            RTRIM(LTRIM(ISNULL(LOT_NO, ''))) AS LOT_NO,
            RTRIM(LTRIM(ISNULL(EMPLOYEE_CODE, ''))) AS EMPLOYEE_CODE,
            RTRIM(LTRIM(ISNULL(EMPLOYEE_NAME, ''))) AS EMPLOYEE_NAME,
            CAST(ISNULL(QTY_PIECES, 0) AS FLOAT) AS QTY_PIECES,
            CAST(ISNULL(BAL_QTY_PIECES, 0) AS FLOAT) AS BAL_QTY_PIECES,
            CAST(ISNULL(RATE, 0) AS FLOAT) AS RATE,
            CAST(ISNULL(AMOUNT, 0) AS FLOAT) AS AMOUNT,
            RTRIM(LTRIM(ISNULL(DET_REMARK, ''))) AS DET_REMARK,
            RTRIM(LTRIM(ISNULL(TRANS_REMARK, ''))) AS TRANS_REMARK
        FROM View_Dboard_Trans_Process_Detail_Data
        WHERE TRANS_DATE >= ? AND TRANS_DATE <= ?
          AND TRANS_TYPE_NAME = ?
        ORDER BY CREATED_DATE DESC, VOUCHER_NO DESC
    """

    with get_connection() as conn:
        cursor = conn.cursor()
        exec_sql = sql.replace("?", "%s") if (pyodbc is None) else sql
        cursor.execute(exec_sql, [from_date, to_date, target_process] if pyodbc is not None else (from_date, to_date, target_process))
        cols = [c[0] for c in cursor.description]
        records = []
        search_lower = search.strip().lower()

        for row in cursor.fetchall():
            item = dict(zip(cols, row))
            created_at = item.get("CREATED_AT") or ""
            item["TIME"] = created_at[11:19] if len(created_at) >= 19 else ""
            
            # Determine category prefix from ITEM_NAME
            item_name = item.get("ITEM_NAME") or ""
            item["CATEGORY"] = extract_category(item_name, item.get("ITEM_GROUP_NAME") or "")

            # Classify ENTRY_STATUS into FRESH, ALT (DAMAGE/REJECT), or RETURN (WASTAGE)
            status_raw = (item.get("ENTRY_STATUS") or "FRESH").upper().strip()
            if status_raw in ("DAMAGE", "ALTER", "REJECT"):
                item["STATUS_TYPE"] = "ALT"
                item["STATUS_LABEL"] = "ALTER (REJECT)"
            elif status_raw in ("WASTAGE", "SHORT", "RETURN"):
                item["STATUS_TYPE"] = "RETURN"
                item["STATUS_LABEL"] = "WASTAGE (RETURN)"
            else:
                item["STATUS_TYPE"] = "FRESH"
                item["STATUS_LABEL"] = "FRESH"

            if search_lower:
                blob = f"{item['VOUCHER_NO']} {item['ITEM_NAME']} {item['SKU_CODE']} {item['LOT_NO']} {item['EMPLOYEE_NAME']} {item['EMPLOYEE_CODE']} {item['STATUS_LABEL']}".lower()
                if search_lower not in blob:
                    continue

            records.append(item)

        return records


def extract_category(item_name: str, group_name: str) -> str:
    """
    Extract category code like WD, MS, TR, TP, MT, KURTI, WSH, CG, W.COMB, WESTERN, etc.
    """
    name = item_name.upper().strip()
    if name.startswith("WD"): return "WD"
    if name.startswith("WSH") and "&" not in name: return "WSH"
    if name.startswith("MS"): return "MS"
    if name.startswith("TR"): return "TR"
    if name.startswith("TP"): return "TP"
    if name.startswith("MT"): return "MT"
    if name.startswith("CG"): return "CG"
    if name.startswith("SK"): return "SK"
    if name.startswith("SH"): return "SH"
    if name.startswith("GK"): return "GK"
    # Western Combos (W & TR, W & SH, W & WSH, W & SK etc)
    if name.startswith("W.") or "COMB" in name or (name.startswith("W") and "&" in name):
        return "W.COMB"
    # Pure Single Western (W2704, W1894, etc)
    if name.startswith("W"):
        return "WESTERN"
    if name.startswith("K"): return "KURTI"
    if "KURTI" in group_name.upper(): return "KURTI"
    if "SHIRT" in group_name.upper(): return "SHIRT"
    if "TROUSER" in group_name.upper(): return "TR"
    return "MIX"


def build_department_summary(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Aggregate live Checking Receive records by Checker into Departments:
    SHIRT (ABBAS), KURTI (ABDUL), PENT (ALI), JOB WORK (NAJIR) + OTHER.
    Accurately splits pieces by FRESH, ALT (DAMAGE/REJECT), and RETURN (WASTAGE).
    """
    checker_fresh: Dict[str, float] = {}
    checker_alt: Dict[str, float] = {}
    checker_return: Dict[str, float] = {}
    checker_names: Dict[str, str] = {}

    for r in records:
        code = (r.get("EMPLOYEE_CODE") or "").upper().strip()
        norm_code = code.replace("-", "")
        qty = float(r.get("QTY_PIECES") or 0)
        stype = r.get("STATUS_TYPE") or "FRESH"

        if stype == "ALT":
            checker_alt[norm_code] = checker_alt.get(norm_code, 0.0) + qty
        elif stype == "RETURN":
            checker_return[norm_code] = checker_return.get(norm_code, 0.0) + qty
        else:
            checker_fresh[norm_code] = checker_fresh.get(norm_code, 0.0) + qty

        emp_name = r.get("EMPLOYEE_NAME") or norm_code
        if emp_name and norm_code not in checker_names:
            checker_names[norm_code] = emp_name

    department_data = []
    accounted_codes = set()
    overall_fresh = 0.0
    overall_alt = 0.0
    overall_return = 0.0
    overall_total = 0.0

    for d in DEPARTMENT_CHECKERS:
        dept_name = d["dept"]
        supervisor = d["supervisor"]
        checkers_list = []
        dept_fresh = 0.0
        dept_alt = 0.0
        dept_return = 0.0
        dept_total = 0.0

        for code, display_name in d["checkers"]:
            norm_code = code.upper().replace("-", "")
            accounted_codes.add(norm_code)
            f_qty = checker_fresh.get(norm_code, 0.0)
            a_qty = checker_alt.get(norm_code, 0.0)
            r_qty = checker_return.get(norm_code, 0.0)
            t_qty = f_qty + a_qty + r_qty

            dept_fresh += f_qty
            dept_alt += a_qty
            dept_return += r_qty
            dept_total += t_qty

            checkers_list.append({
                "code": code,
                "name": display_name,
                "fresh": round(f_qty),
                "alt": round(a_qty),
                "return_qty": round(r_qty),
                "total": round(t_qty)
            })

        # Sort checkers inside each department strictly descending by Total pieces (Highest work first)
        checkers_list.sort(key=lambda c: (c["total"], c["fresh"]), reverse=True)

        department_data.append({
            "department": dept_name,
            "supervisor": supervisor,
            "checkers": checkers_list,
            "subtotal_fresh": round(dept_fresh),
            "subtotal_alt": round(dept_alt),
            "subtotal_return": round(dept_return),
            "subtotal": round(dept_total)
        })
        overall_fresh += dept_fresh
        overall_alt += dept_alt
        overall_return += dept_return
        overall_total += dept_total

    # Any other checkers active today not in predefined departments
    all_codes = set(checker_fresh.keys()) | set(checker_alt.keys()) | set(checker_return.keys())
    other_checkers = []
    other_fresh = 0.0
    other_alt = 0.0
    other_return = 0.0
    other_total = 0.0

    for norm_code in all_codes:
        if norm_code not in accounted_codes:
            f_qty = checker_fresh.get(norm_code, 0.0)
            a_qty = checker_alt.get(norm_code, 0.0)
            r_qty = checker_return.get(norm_code, 0.0)
            t_qty = f_qty + a_qty + r_qty

            if t_qty > 0:
                name = checker_names.get(norm_code, norm_code)
                other_checkers.append({
                    "code": norm_code,
                    "name": name,
                    "fresh": round(f_qty),
                    "alt": round(a_qty),
                    "return_qty": round(r_qty),
                    "total": round(t_qty)
                })
                other_fresh += f_qty
                other_alt += a_qty
                other_return += r_qty
                other_total += t_qty

    if other_checkers:
        # Sort other checkers strictly descending by Total pieces
        other_checkers.sort(key=lambda c: (c["total"], c["fresh"]), reverse=True)
        department_data.append({
            "department": "OTHER CHECKERS",
            "supervisor": "GENERAL",
            "checkers": other_checkers,
            "subtotal_fresh": round(other_fresh),
            "subtotal_alt": round(other_alt),
            "subtotal_return": round(other_return),
            "subtotal": round(other_total)
        })
        overall_fresh += other_fresh
        overall_alt += other_alt
        overall_return += other_return
        overall_total += other_total

    # Sort departments strictly descending by Subtotal pieces (Highest department first)
    department_data.sort(key=lambda d: d["subtotal"], reverse=True)

    # Category Wise Summary (Sorted descending: highest category pieces first)
    category_totals: Dict[str, float] = {}
    for r in records:
        cat = r.get("CATEGORY") or "MIX"
        category_totals[cat] = category_totals.get(cat, 0.0) + float(r.get("QTY_PIECES") or 0)

    cat_list = [{"category": k, "qty": round(v)} for k, v in sorted(category_totals.items(), key=lambda x: (x[1], x[0]), reverse=True)]

    # -----------------------------------------------------------------
    # ID-Wise Performance & Top 1 Ranking (Requested by User)
    # Lists all checkers ID-wise and ranks them strictly by Total Pieces
    # checked descending: Top 1 🥇, Top 2 🥈, Top 3 🥉, #4, #5...
    # -----------------------------------------------------------------
    dept_lookup: Dict[str, Tuple[str, str, str, str]] = {}
    for d in DEPARTMENT_CHECKERS:
        for code, display_name in d["checkers"]:
            nc = code.upper().replace("-", "")
            dept_lookup[nc] = (d["dept"], d["supervisor"], code, display_name)

    checker_vouchers: Dict[str, int] = {}
    for r in records:
        code = (r.get("EMPLOYEE_CODE") or "").upper().strip().replace("-", "")
        if code:
            checker_vouchers[code] = checker_vouchers.get(code, 0) + 1

    id_wise_ranking = []
    for nc in all_codes:
        f = checker_fresh.get(nc, 0.0)
        a = checker_alt.get(nc, 0.0)
        ret = checker_return.get(nc, 0.0)
        tot = f + a + ret
        v_cnt = checker_vouchers.get(nc, 0)

        if nc in dept_lookup:
            d_name, s_name, orig_code, disp_name = dept_lookup[nc]
        else:
            d_name = "OTHER CHECKERS"
            s_name = "GENERAL"
            orig_code = nc
            disp_name = checker_names.get(nc, nc)

        share = (tot / overall_total * 100) if overall_total > 0 else 0.0
        alt_pct = (a / tot * 100) if tot > 0 else 0.0

        id_wise_ranking.append({
            "code": orig_code,
            "norm_code": nc,
            "name": disp_name,
            "department": d_name,
            "supervisor": s_name,
            "fresh": round(f),
            "alt": round(a),
            "return_qty": round(ret),
            "total": round(tot),
            "vouchers_count": v_cnt,
            "alt_pct": round(alt_pct, 1),
            "share_pct": round(share, 1)
        })

    # Sort strictly descending by total pieces, then by fresh
    id_wise_ranking.sort(key=lambda x: (x["total"], x["fresh"]), reverse=True)

    # Assign rank 1, 2, 3, 4, 5...
    for idx, item in enumerate(id_wise_ranking, start=1):
        item["rank"] = idx
        if idx == 1:
            item["badge"] = "👑 TOP 1"
        elif idx == 2:
            item["badge"] = "🥈 TOP 2"
        elif idx == 3:
            item["badge"] = "🥉 TOP 3"
        elif idx == 4:
            item["badge"] = "🎖️ TOP 4"
        elif idx == 5:
            item["badge"] = "🎖️ TOP 5"
        else:
            item["badge"] = f"#{idx}"

    active_checkers_list = [x for x in id_wise_ranking if x["total"] > 0]
    id_ranking_summary = {
        "ranking": id_wise_ranking,
        "total_active_checkers": len(active_checkers_list),
        "total_pieces": round(overall_total),
        "top1_checker": id_wise_ranking[0] if len(id_wise_ranking) > 0 else None,
        "top2_checker": id_wise_ranking[1] if len(id_wise_ranking) > 1 else None,
        "top3_checker": id_wise_ranking[2] if len(id_wise_ranking) > 2 else None,
        "top4_checker": id_wise_ranking[3] if len(id_wise_ranking) > 3 else None,
        "top5_checker": id_wise_ranking[4] if len(id_wise_ranking) > 4 else None,
        "top5": id_wise_ranking[:5],
        "avg_pcs_per_checker": round(overall_total / len(active_checkers_list), 1) if active_checkers_list else 0.0
    }

    # Alter Summary & Rankings (For dedicated Alter / Reject Report)
    checker_alt_ranking = []
    for nc in all_codes:
        a = checker_alt.get(nc, 0.0)
        f = checker_fresh.get(nc, 0.0)
        ret = checker_return.get(nc, 0.0)
        tot = f + a + ret
        if a > 0 or tot > 0:
            checker_alt_ranking.append({
                "code": nc,
                "name": checker_names.get(nc, nc),
                "alt": round(a),
                "fresh": round(f),
                "return_qty": round(ret),
                "total": round(tot),
                "alt_pct": round((a / tot * 100), 1) if tot > 0 else 0.0
            })
    checker_alt_ranking.sort(key=lambda x: (x["alt"], x["total"]), reverse=True)

    design_alt_totals: Dict[str, Dict[str, Any]] = {}
    for r in records:
        it_name = r.get("ITEM_NAME") or "UNKNOWN"
        cat = r.get("CATEGORY") or "MIX"
        st = r.get("STATUS_TYPE") or "FRESH"
        qty = float(r.get("QTY_PIECES") or 0)
        if it_name not in design_alt_totals:
            design_alt_totals[it_name] = {
                "item_name": it_name,
                "category": cat,
                "fresh": 0.0,
                "alt": 0.0,
                "return_qty": 0.0,
                "total": 0.0
            }
        design_alt_totals[it_name]["total"] += qty
        if st == "ALT":
            design_alt_totals[it_name]["alt"] += qty
        elif st == "RETURN":
            design_alt_totals[it_name]["return_qty"] += qty
        else:
            design_alt_totals[it_name]["fresh"] += qty

    design_alt_ranking = []
    for it_data in design_alt_totals.values():
        tot = it_data["total"]
        alt = it_data["alt"]
        it_data["alt"] = round(alt)
        it_data["fresh"] = round(it_data["fresh"])
        it_data["return_qty"] = round(it_data["return_qty"])
        it_data["total"] = round(tot)
        it_data["alt_pct"] = round((alt / tot * 100), 1) if tot > 0 else 0.0
        design_alt_ranking.append(it_data)
    design_alt_ranking.sort(key=lambda x: (x["alt"], x["total"]), reverse=True)

    alter_records = [r for r in records if (r.get("STATUS_TYPE") in ("ALT", "RETURN"))]

    alter_summary = {
        "total_alt_pcs": round(overall_alt),
        "total_fresh_pcs": round(overall_fresh),
        "total_return_pcs": round(overall_return),
        "overall_total": round(overall_total),
        "alt_rate_pct": round((overall_alt / overall_total * 100), 1) if overall_total > 0 else 0.0,
        "total_alter_vouchers": len(alter_records),
        "checker_alt_ranking": checker_alt_ranking,
        "design_alt_ranking": design_alt_ranking
    }

    return {
        "departments": department_data,
        "overall_total": round(overall_total),
        "overall_fresh": round(overall_fresh),
        "overall_alt": round(overall_alt),
        "overall_return": round(overall_return),
        "category_summary": cat_list,
        "alter_summary": alter_summary,
        "id_wise_ranking": id_wise_ranking,
        "id_ranking_summary": id_ranking_summary
    }


def generate_excel_report(
    from_date: str,
    to_date: str,
    records: List[Dict[str, Any]]
) -> io.BytesIO:
    """
    Generate exact CHEKING REPORT Excel workbook matching CHEKING REPORT 20-9-26.xlsx:
    Sheet 1: Supervisor/Department format (SHIRT, KURTI, PENT, JOB WORK) with FRESH, ALT, RETURN, TOTAL
    Sheet 2: Category Summary (WSH, GK, CG, SK, SH, MIX, TP, MT, KURTI, W.COMB, MS, TR, WD, WESTERN)
    Sheet 3: Detail Report (127) full vouchers with Status column
    Sheet 4: Alter (Reject) Report dedicated voucher list
    """
    wb = Workbook()

    summary_info = build_department_summary(records)

    # Styles
    f_calibri_14_bold = Font(name="Calibri", size=14, bold=True)
    f_calibri_14 = Font(name="Calibri", size=14, bold=False)
    f_calibri_11_bold = Font(name="Calibri", size=11, bold=True)
    f_calibri_11 = Font(name="Calibri", size=11, bold=False)
    f_calibri_10 = Font(name="Calibri", size=10)

    fill_header = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    fill_total = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    fill_alt = PatternFill(start_color="FDE68A", end_color="FDE68A", fill_type="solid")

    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    thin_border = Border(
        left=Side(style="thin", color="D0D7DE"),
        right=Side(style="thin", color="D0D7DE"),
        top=Side(style="thin", color="D0D7DE"),
        bottom=Side(style="thin", color="D0D7DE"),
    )

    # ----------------------------------------------------
    # SHEET 1: CHEKING SUMMARY (Exact 19-9-26 / 12-09 Layout)
    # ----------------------------------------------------
    ws1 = wb.active
    ws1.title = "CHEKING SUMMARY"
    ws1.views.sheetView[0].showGridLines = True

    date_str = from_date if from_date == to_date else f"{from_date} to {to_date}"
    cur_row = 1
    dept_total_cells = []
    dept_subtotal_rows = []

    for dept in summary_info["departments"]:
        dept_name = dept["department"]
        supervisor = dept["supervisor"]
        checkers = dept["checkers"]

        # Row 1: Supervisor Name
        ws1.cell(row=cur_row, column=4, value=supervisor).font = f_calibri_14
        ws1.cell(row=cur_row, column=4).alignment = align_center
        cur_row += 1

        # Row 2: Date in Col A, Department Name in Col D
        ws1.cell(row=cur_row, column=1, value=date_str).font = f_calibri_14_bold
        ws1.cell(row=cur_row, column=4, value=dept_name).font = f_calibri_14_bold
        ws1.cell(row=cur_row, column=4).alignment = align_center
        cur_row += 1

        # Row 3: Header columns
        headers = ["P.NO", "FRESH", "ALT", "RETURN", "TOTAL"]
        for col_idx, h in enumerate(headers, start=1):
            c = ws1.cell(row=cur_row, column=col_idx, value=h)
            c.font = f_calibri_14_bold
            c.alignment = align_center
            c.fill = fill_header
            c.border = thin_border
        cur_row += 1

        start_checker_row = cur_row
        for chk in checkers:
            # P.NO (Col A)
            c_a = ws1.cell(row=cur_row, column=1, value=chk["name"])
            c_a.font = f_calibri_14_bold
            c_a.border = thin_border

            # FRESH (Col B)
            c_b = ws1.cell(row=cur_row, column=2, value=chk["fresh"])
            c_b.font = f_calibri_14_bold
            c_b.alignment = align_right
            c_b.border = thin_border
            c_b.number_format = "#,##0"

            # ALT (Col C) - Live Alter / Damage Count!
            c_c = ws1.cell(row=cur_row, column=3, value=chk["alt"])
            c_c.font = f_calibri_14_bold
            c_c.alignment = align_right
            c_c.border = thin_border
            c_c.number_format = "#,##0"
            if chk["alt"] > 0:
                c_c.fill = fill_alt

            # RETURN (Col D) - Live Wastage Count!
            c_d = ws1.cell(row=cur_row, column=4, value=chk["return_qty"])
            c_d.font = f_calibri_14_bold
            c_d.alignment = align_right
            c_d.border = thin_border
            c_d.number_format = "#,##0"

            # TOTAL Formula (Col E) =B+C+D
            c_e = ws1.cell(row=cur_row, column=5, value=f"=B{cur_row}+C{cur_row}+D{cur_row}")
            c_e.font = f_calibri_14_bold
            c_e.alignment = align_right
            c_e.border = thin_border
            c_e.number_format = "#,##0"

            cur_row += 1

        end_checker_row = cur_row - 1

        # Department Subtotal Row
        ws1.cell(row=cur_row, column=1, value="TOTAL").font = f_calibri_14_bold
        ws1.cell(row=cur_row, column=1).fill = fill_total
        ws1.cell(row=cur_row, column=1).border = thin_border

        for c_idx, col_letter in [(2, "B"), (3, "C"), (4, "D")]:
            c = ws1.cell(row=cur_row, column=c_idx, value=f"=SUM({col_letter}{start_checker_row}:{col_letter}{end_checker_row})")
            c.font = f_calibri_14_bold
            c.alignment = align_right
            c.fill = fill_total
            c.border = thin_border
            c.number_format = "#,##0"

        c_tot = ws1.cell(row=cur_row, column=5, value=f"=B{cur_row}+C{cur_row}+D{cur_row}")
        c_tot.font = f_calibri_14_bold
        c_tot.alignment = align_right
        c_tot.fill = fill_total
        c_tot.border = thin_border
        c_tot.number_format = "#,##0"
        dept_total_cells.append(f"E{cur_row}")
        dept_subtotal_rows.append(cur_row)

        cur_row += 1  # blank line between departments

    # Overall Grand Total Row at bottom
    if dept_subtotal_rows:
        ws1.cell(row=cur_row, column=1, value="GRAND TOTAL : ").font = f_calibri_14_bold
        for c_idx, col_letter in [(2, "B"), (3, "C"), (4, "D"), (5, "E")]:
            cell_refs = [f"{col_letter}{r}" for r in dept_subtotal_rows]
            sum_expr = "+".join(cell_refs)
            gt_c = ws1.cell(row=cur_row, column=c_idx, value=f"={sum_expr}")
            gt_c.font = f_calibri_14_bold
            gt_c.alignment = align_right
            gt_c.fill = fill_total
            gt_c.border = thin_border
            gt_c.number_format = "#,##0"

    ws1.column_dimensions["A"].width = 24
    ws1.column_dimensions["B"].width = 14
    ws1.column_dimensions["C"].width = 14
    ws1.column_dimensions["D"].width = 14
    ws1.column_dimensions["E"].width = 14

    # ----------------------------------------------------
    # SHEET 2: ID WISE TOP RANKING (Top 1 Performer at Top!)
    # ----------------------------------------------------
    ws_id = wb.create_sheet(title="ID Wise Top Ranking")
    ws_id.views.sheetView[0].showGridLines = True

    # Title Banner Row 1 & 2
    ws_id.merge_cells("A1:K1")
    t_id = ws_id["A1"]
    t_id.value = "DIGIBIZZ CHECKER PERFORMANCE - ID-WISE TOP RANKING"
    t_id.font = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
    t_id.fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    t_id.alignment = align_center

    top1_name = ""
    top1_pcs = 0
    id_rankings = summary_info.get("id_wise_ranking", [])
    if id_rankings:
        top1_name = f"{id_rankings[0]['name']} ({id_rankings[0]['code']})"
        top1_pcs = id_rankings[0]['total']

    ws_id.merge_cells("A2:K2")
    s_id = ws_id["A2"]
    s_id.value = f"Date: {date_str} | 👑 Top 1 Checker: {top1_name} ({top1_pcs:,} Pcs) | Total Checkers: {len(id_rankings)} | Total Checked: {round(summary_info['overall_total']):,} Pcs"
    s_id.font = Font(name="Calibri", size=10, italic=True, color="DBEAFE")
    s_id.fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    s_id.alignment = align_center

    # Row 4: Column Headers
    id_headers = [
        "Rank", "Checker ID", "Checker Name", "Department", "Supervisor",
        "Fresh Pcs", "Alt Pcs", "Return Pcs", "Total Pcs", "Share %", "Vouchers"
    ]
    for c_i, h in enumerate(id_headers, start=1):
        cell = ws_id.cell(row=4, column=c_i, value=h)
        cell.fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.alignment = align_center
        cell.border = thin_border

    # Fills for top 3
    fill_gold = PatternFill(start_color="FEF08A", end_color="FEF08A", fill_type="solid")     # Top 1 Gold
    fill_silver = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")   # Top 2 Silver
    fill_bronze = PatternFill(start_color="FED7AA", end_color="FED7AA", fill_type="solid")   # Top 3 Bronze

    row_idx = 5
    for item in id_rankings:
        rk = item["rank"]
        row_fill = None
        if rk == 1:
            row_fill = fill_gold
            rank_label = "🥇 TOP 1"
        elif rk == 2:
            row_fill = fill_silver
            rank_label = "🥈 TOP 2"
        elif rk == 3:
            row_fill = fill_bronze
            rank_label = "🥉 TOP 3"
        else:
            rank_label = str(rk)

        row_font = f_calibri_11_bold if rk <= 3 else f_calibri_11

        c_rank = ws_id.cell(row=row_idx, column=1, value=rank_label)
        c_rank.alignment = align_center
        c_code = ws_id.cell(row=row_idx, column=2, value=item["code"])
        c_code.alignment = align_center
        c_name = ws_id.cell(row=row_idx, column=3, value=item["name"])
        c_name.alignment = align_left
        c_dept = ws_id.cell(row=row_idx, column=4, value=item["department"])
        c_dept.alignment = align_center
        c_sup = ws_id.cell(row=row_idx, column=5, value=item["supervisor"])
        c_sup.alignment = align_center

        c_fresh = ws_id.cell(row=row_idx, column=6, value=item["fresh"])
        c_fresh.alignment = align_right
        c_fresh.number_format = "#,##0"

        c_alt = ws_id.cell(row=row_idx, column=7, value=item["alt"])
        c_alt.alignment = align_right
        c_alt.number_format = "#,##0"
        if item["alt"] > 0 and rk > 3:
            c_alt.fill = fill_alt

        c_ret = ws_id.cell(row=row_idx, column=8, value=item["return_qty"])
        c_ret.alignment = align_right
        c_ret.number_format = "#,##0"

        c_tot = ws_id.cell(row=row_idx, column=9, value=f"=F{row_idx}+G{row_idx}+H{row_idx}")
        c_tot.alignment = align_right
        c_tot.number_format = "#,##0"

        c_share = ws_id.cell(row=row_idx, column=10, value=item["share_pct"] / 100.0)
        c_share.alignment = align_right
        c_share.number_format = "0.0%"

        c_vouch = ws_id.cell(row=row_idx, column=11, value=item["vouchers_count"])
        c_vouch.alignment = align_right
        c_vouch.number_format = "#,##0"

        for col_i in range(1, 12):
            cell = ws_id.cell(row=row_idx, column=col_i)
            cell.font = row_font
            cell.border = thin_border
            if row_fill:
                cell.fill = row_fill

        row_idx += 1

    last_data_row = row_idx - 1
    if last_data_row >= 5:
        # Summary Row at bottom
        ws_id.cell(row=row_idx, column=1, value="TOTAL").font = f_calibri_11_bold
        ws_id.cell(row=row_idx, column=1).alignment = align_center
        ws_id.cell(row=row_idx, column=1).fill = fill_total
        ws_id.cell(row=row_idx, column=1).border = thin_border

        for c_i in range(2, 6):
            c = ws_id.cell(row=row_idx, column=c_i, value="")
            c.fill = fill_total
            c.border = thin_border

        for c_i, col_let in [(6, "F"), (7, "G"), (8, "H"), (9, "I")]:
            c = ws_id.cell(row=row_idx, column=c_i, value=f"=SUM({col_let}5:{col_let}{last_data_row})")
            c.font = f_calibri_11_bold
            c.alignment = align_right
            c.fill = fill_total
            c.border = thin_border
            c.number_format = "#,##0"

        c_tot_share = ws_id.cell(row=row_idx, column=10, value=1.0)
        c_tot_share.font = f_calibri_11_bold
        c_tot_share.alignment = align_right
        c_tot_share.fill = fill_total
        c_tot_share.border = thin_border
        c_tot_share.number_format = "0.0%"

        c_tot_v = ws_id.cell(row=row_idx, column=11, value=f"=SUM(K5:K{last_data_row})")
        c_tot_v.font = f_calibri_11_bold
        c_tot_v.alignment = align_right
        c_tot_v.fill = fill_total
        c_tot_v.border = thin_border
        c_tot_v.number_format = "#,##0"

    ws_id.column_dimensions["A"].width = 14
    ws_id.column_dimensions["B"].width = 16
    ws_id.column_dimensions["C"].width = 22
    ws_id.column_dimensions["D"].width = 16
    ws_id.column_dimensions["E"].width = 16
    ws_id.column_dimensions["F"].width = 14
    ws_id.column_dimensions["G"].width = 14
    ws_id.column_dimensions["H"].width = 14
    ws_id.column_dimensions["I"].width = 16
    ws_id.column_dimensions["J"].width = 12
    ws_id.column_dimensions["K"].width = 14

    # ----------------------------------------------------
    # SHEET 3: CATEGORY SUMMARY (Exact Sheet3 Layout)
    # ----------------------------------------------------
    ws2 = wb.create_sheet(title="Category Summary")
    ws2.views.sheetView[0].showGridLines = True

    ws2.cell(row=1, column=2, value=f"DATE : {date_str}").font = f_calibri_14_bold
    ws2.cell(row=2, column=2, value="CATEGORY").font = f_calibri_14_bold
    ws2.cell(row=2, column=2).fill = fill_header
    ws2.cell(row=2, column=2).border = thin_border

    ws2.cell(row=2, column=3, value="QTY").font = f_calibri_14_bold
    ws2.cell(row=2, column=3).alignment = align_right
    ws2.cell(row=2, column=3).fill = fill_header
    ws2.cell(row=2, column=3).border = thin_border

    cat_start = 3
    c_r = 3
    for cat in summary_info["category_summary"]:
        c1 = ws2.cell(row=c_r, column=2, value=cat["category"])
        c1.font = f_calibri_14_bold
        c1.border = thin_border

        c2 = ws2.cell(row=c_r, column=3, value=cat["qty"])
        c2.font = f_calibri_14_bold
        c2.alignment = align_right
        c2.border = thin_border
        c2.number_format = "#,##0"
        c_r += 1

    cat_end = c_r - 1
    ws2.cell(row=c_r, column=2, value="Grand Total").font = f_calibri_14_bold
    ws2.cell(row=c_r, column=2).fill = fill_total
    ws2.cell(row=c_r, column=2).border = thin_border

    gt_c = ws2.cell(row=c_r, column=3, value=f"=SUM(C{cat_start}:C{cat_end})")
    gt_c.font = f_calibri_14_bold
    gt_c.alignment = align_right
    gt_c.fill = fill_total
    gt_c.border = thin_border
    gt_c.number_format = "#,##0"

    ws2.column_dimensions["B"].width = 20
    ws2.column_dimensions["C"].width = 16

    # ----------------------------------------------------
    # SHEET 3: DETAIL REPORT (127)
    # ----------------------------------------------------
    ws3 = wb.create_sheet(title="Detail Report (127)")
    ws3.views.sheetView[0].showGridLines = True

    ws3.merge_cells("A1:O1")
    t3 = ws3["A1"]
    t3.value = "DIGIBIZZ DETAIL REPORT (127) - CHECKING RECEIVE"
    t3.font = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
    t3.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    t3.alignment = align_center

    ws3.merge_cells("A2:O2")
    s3 = ws3["A2"]
    s3.value = f"Date: {date_str} | Generated: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')} | Total Rows: {len(records)} | Fresh: {summary_info['overall_fresh']} | Alter: {summary_info['overall_alt']}"
    s3.font = Font(name="Calibri", size=10, italic=True, color="CBD5E1")
    s3.fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    s3.alignment = align_center

    detail_headers = [
        "Voucher No", "Date", "Time", "Process", "Status", "Design No", 
        "Category", "Size", "SKU", "Lot No", "Checker / Employee", 
        "Qty (Pcs)", "Rate", "Amount", "Remarks"
    ]
    for c_i, h in enumerate(detail_headers, start=1):
        cell = ws3.cell(row=4, column=c_i, value=h)
        cell.fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.alignment = align_center
        cell.border = thin_border

    r_row = 5
    for r in records:
        pcs = float(r.get("QTY_PIECES") or 0)
        rate = float(r.get("RATE") or 0)
        amount = float(r.get("AMOUNT") or 0)
        st_label = r.get("STATUS_LABEL") or r.get("ENTRY_STATUS") or "FRESH"

        vals = [
            (r.get("VOUCHER_NO"), align_left, "@"),
            (r.get("TRANS_DATE"), align_center, "@"),
            (r.get("TIME"), align_center, "@"),
            (r.get("TRANS_TYPE_NAME"), align_left, "@"),
            (st_label, align_center, "@"),
            (r.get("ITEM_NAME"), align_left, "@"),
            (r.get("CATEGORY"), align_center, "@"),
            (r.get("SIZE"), align_center, "@"),
            (r.get("SKU_CODE"), align_left, "@"),
            (r.get("LOT_NO"), align_center, "@"),
            (r.get("EMPLOYEE_NAME"), align_left, "@"),
            (pcs, align_right, "#,##0"),
            (rate if rate else "", align_right, "0.00"),
            (amount if amount else "", align_right, "#,##0.00"),
            (r.get("TRANS_REMARK") or r.get("DET_REMARK") or "", align_left, "@"),
        ]
        for c_i, (v, aln, fmt) in enumerate(vals, start=1):
            cell = ws3.cell(row=r_row, column=c_i, value=v)
            cell.font = f_calibri_10
            cell.alignment = aln
            cell.border = thin_border
            if fmt and isinstance(v, (int, float)):
                cell.number_format = fmt
        r_row += 1

    # Totals in Sheet 3
    ws3.cell(row=r_row, column=1, value="TOTAL").font = f_calibri_11_bold
    ws3.cell(row=r_row, column=12, value=f"=SUM(L5:L{r_row-1})").font = f_calibri_11_bold
    ws3.cell(row=r_row, column=12).number_format = "#,##0"
    ws3.cell(row=r_row, column=14, value=f"=SUM(N5:N{r_row-1})").font = f_calibri_11_bold
    ws3.cell(row=r_row, column=14).number_format = "#,##0.00"

    for col in ws3.columns:
        col_letter = get_column_letter(col[0].column)
        max_l = max(len(str(cell.value or "")) for cell in col if cell.row > 2)
        ws3.column_dimensions[col_letter].width = max(max_l + 3, 11)

    # ----------------------------------------------------
    # SHEET 4: ALTER (REJECT) REPORT (Dedicated Sheet!)
    # ----------------------------------------------------
    alter_records = [r for r in records if r.get("STATUS_TYPE") in ("ALT", "RETURN")]
    ws4 = wb.create_sheet(title="Alter (Reject) Report")
    ws4.views.sheetView[0].showGridLines = True

    ws4.merge_cells("A1:N1")
    t4 = ws4["A1"]
    t4.value = "DIGIBIZZ ALTER / REJECT REPORT - CHECKING RECEIVE DEFECTS"
    t4.font = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
    t4.fill = PatternFill(start_color="92400E", end_color="92400E", fill_type="solid")
    t4.alignment = align_center

    ws4.merge_cells("A2:N2")
    s4 = ws4["A2"]
    s4.value = f"Date: {date_str} | Total Alter Pcs: {summary_info['overall_alt']} | Wastage Pcs: {summary_info['overall_return']} | Total Defect Rows: {len(alter_records)}"
    s4.font = Font(name="Calibri", size=10, italic=True, color="FEF3C7")
    s4.fill = PatternFill(start_color="92400E", end_color="92400E", fill_type="solid")
    s4.alignment = align_center

    alter_headers = [
        "Voucher No", "Date", "Time", "Status", "Design No", 
        "Category", "Size", "SKU", "Lot No", "Checker / Employee", 
        "Alter Qty (Pcs)", "Rate", "Amount", "Remarks"
    ]
    for c_i, h in enumerate(alter_headers, start=1):
        cell = ws4.cell(row=4, column=c_i, value=h)
        cell.fill = PatternFill(start_color="B45309", end_color="B45309", fill_type="solid")
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.alignment = align_center
        cell.border = thin_border

    r_row4 = 5
    for r in alter_records:
        pcs = float(r.get("QTY_PIECES") or 0)
        rate = float(r.get("RATE") or 0)
        amount = float(r.get("AMOUNT") or 0)
        st_label = r.get("STATUS_LABEL") or r.get("ENTRY_STATUS") or "ALTER"

        vals4 = [
            (r.get("VOUCHER_NO"), align_left, "@"),
            (r.get("TRANS_DATE"), align_center, "@"),
            (r.get("TIME"), align_center, "@"),
            (st_label, align_center, "@"),
            (r.get("ITEM_NAME"), align_left, "@"),
            (r.get("CATEGORY"), align_center, "@"),
            (r.get("SIZE"), align_center, "@"),
            (r.get("SKU_CODE"), align_left, "@"),
            (r.get("LOT_NO"), align_center, "@"),
            (r.get("EMPLOYEE_NAME"), align_left, "@"),
            (pcs, align_right, "#,##0"),
            (rate if rate else "", align_right, "0.00"),
            (amount if amount else "", align_right, "#,##0.00"),
            (r.get("TRANS_REMARK") or r.get("DET_REMARK") or "", align_left, "@"),
        ]
        for c_i, (v, aln, fmt) in enumerate(vals4, start=1):
            cell = ws4.cell(row=r_row4, column=c_i, value=v)
            cell.font = f_calibri_10
            cell.alignment = aln
            cell.border = thin_border
            if fmt and isinstance(v, (int, float)):
                cell.number_format = fmt
        r_row4 += 1

    if r_row4 > 5:
        ws4.cell(row=r_row4, column=1, value="TOTAL ALTER PIECES").font = f_calibri_11_bold
        ws4.cell(row=r_row4, column=11, value=f"=SUM(K5:K{r_row4-1})").font = f_calibri_11_bold
        ws4.cell(row=r_row4, column=11).number_format = "#,##0"

    for col in ws4.columns:
        col_letter = get_column_letter(col[0].column)
        max_l = max(len(str(cell.value or "")) for cell in col if cell.row > 2)
        ws4.column_dimensions[col_letter].width = max(max_l + 3, 11)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf

