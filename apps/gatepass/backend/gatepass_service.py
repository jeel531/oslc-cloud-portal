# -*- coding: utf-8 -*-
"""
OSLC KARIGAR GATE PASS SYSTEM - Gate Pass Business Logic & Excel Generation
Generates official Gate Pass Excel files matching OSLC KARIGAR GATEPASS template.
Updated to include Ghanshyam Bhai signature, mandatory tool checklist, and Report 141 Mall.
Created By JEEL VAGHANI
"""
import os
import io
import json
import time
import base64
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.drawing.image import Image as OpenpyxlImage
from PIL import Image as PILImage

from apps.gatepass.backend.config import DATA_DIR, TEMPLATE_EXCEL, COMPANY_NAME, FULL_COMPANY_NAME
from apps.gatepass.backend.db import fetch_karigar_details

RECORDS_FILE = DATA_DIR / "gatepass_records.json"


def load_records() -> List[Dict[str, Any]]:
    """Loads all saved gate pass records from disk."""
    if not RECORDS_FILE.exists():
        return []
    try:
        with open(RECORDS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        print(f"Error loading records: {exc}")
        return []


def save_records(records: List[Dict[str, Any]]) -> bool:
    """Saves records list to JSON file."""
    try:
        with open(RECORDS_FILE, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        return True
    except Exception as exc:
        print(f"Error saving records: {exc}")
        return False


def get_next_int_no(date_str: str) -> str:
    """Returns the next sequential Int No. (e.g. 01, 02...) for the given date."""
    records = load_records()
    today_records = [r for r in records if r.get("date") == date_str]
    max_num = 0
    for r in today_records:
        try:
            val = int(str(r.get("int_no", "0")).strip())
            if val > max_num:
                max_num = val
        except ValueError:
            pass
    return f"{max_num + 1:02d}"


def save_issued_gatepass(data: Dict[str, Any]) -> Dict[str, Any]:
    """Records an issued gate pass into persistent storage."""
    records = load_records()
    
    pass_id = data.get("pass_id") or f"GP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{data.get('code', 'EMP')}"
    
    # Tool checklist items (Small Cutter, Scissor, Stool/Table, ID Card)
    # If unreturned, items are empty/blank [  ] but print proceeds
    checklist = data.get("checklist")
    if checklist is None:
        checklist = {
            "small_cutter": True,
            "scissor": True,
            "stool": True,
            "id_card": True,
        }
    
    floor_val = data.get("floor", "3RD FLOOR")
    if "3TH" in floor_val:
        floor_val = floor_val.replace("3TH", "3RD")
    
    record = {
        "pass_id": pass_id,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "code": data.get("code", "").strip().upper(),
        "name": data.get("name", "").strip(),
        "floor": floor_val,
        "department": data.get("department", "KARIGAR"),
        "date": data.get("date", datetime.now().strftime("%d/%m/%Y")),
        "int_no": data.get("int_no", "01"),
        "out_time": data.get("out_time", datetime.now().strftime("%I:%M %p")),
        "in_time": data.get("in_time", ""),
        "reason": data.get("reason", "Personal Work"),
        "sign_permission": data.get("sign_permission") or data.get("sign_rafik") or "RAFIK",
        "sign_checking": data.get("sign_checking") or data.get("sign_ghanshyam") or "GHANSHYAM BHAI",
        "sign_issued": data.get("sign_issued") or data.get("sign_jeel") or "JEEL BHAI",
        "sign_rafik": data.get("sign_permission") or data.get("sign_rafik") or "RAFIK",
        "sign_ghanshyam": data.get("sign_checking") or data.get("sign_ghanshyam") or "GHANSHYAM BHAI",
        "sign_jeel": data.get("sign_issued") or data.get("sign_jeel") or "JEEL BHAI",
        "checklist": checklist,
        "has_pending_mall": data.get("has_pending_mall", False),
        "total_pending_pcs": data.get("total_pending_pcs", 0),
        "sti_pending_pcs": data.get("sti_pending_pcs", 0),
        "alter_pending_pcs": data.get("alter_pending_pcs", 0),
        "pending_items": data.get("pending_items", []),
        "pending_items_count": len(data.get("pending_items", [])),
        "is_reprint": data.get("is_reprint", False),
        "reprint_count": data.get("reprint_count", 0),
        "created_by": "JEEL VAGHANI",
    }

    records.insert(0, record)
    save_records(records)
    return record


def reprint_gatepass(
    pass_id: str,
    int_no: Optional[str] = None,
    code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Logs a new entry for a reprinted gate pass while strictly preserving
    the exact same Serial / Internal Number (int_no).
    Satisfies: 'REPRINT APU TE MA NEW ENTRY PADVI JOYE BUT SERYAL NUBAR CHENG NO THAVO PADE'
    Ultra-resilient matcher: checks pass_id, int_no, code, and original_pass_id.
    """
    records = load_records()
    target = None
    pid_clean = str(pass_id).strip()

    # 1. Exact pass_id match
    for r in records:
        if r.get("pass_id") == pid_clean or r.get("pass_id") == f"GP-{pid_clean}":
            target = r
            break

    # 2. Match by original_pass_id or substring
    if not target and pid_clean:
        for r in records:
            if r.get("original_pass_id") == pid_clean or pid_clean in r.get("pass_id", ""):
                target = r
                break

    # 3. Match by int_no
    target_int = str(int_no or pid_clean).strip().lstrip("#").lstrip("0")
    if not target and target_int:
        for r in records:
            r_int = str(r.get("int_no", "")).strip().lstrip("#").lstrip("0")
            if r_int and r_int == target_int:
                target = r
                break

    # 4. Match by worker code
    target_code = str(code or pid_clean).strip().upper()
    if not target and target_code:
        for r in records:
            if r.get("code", "").upper() == target_code:
                target = r
                break

    if not target:
        raise ValueError(f"Gate pass with ID/IntNo '{pass_id}' not found.")

    # Calculate new reprint count
    reprint_count = target.get("reprint_count", 0) + 1
    reprint_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Update original target's reprint metadata
    target["reprint_count"] = reprint_count
    target["last_reprinted_at"] = reprint_time

    # Create new entry in records history while KEEPING exact same int_no
    new_reprint_record = dict(target)
    new_reprint_record["pass_id"] = f"{target.get('pass_id', 'GP')}-RP{reprint_count}-{int(time.time())}"
    new_reprint_record["created_at"] = reprint_time
    new_reprint_record["is_reprint"] = True
    new_reprint_record["original_pass_id"] = target.get("pass_id")
    new_reprint_record["reprint_count"] = reprint_count
    new_reprint_record["int_no"] = target.get("int_no")  # SERIAL NUMBER NEVER CHANGES!
    
    # Ensure checklist exists
    if not new_reprint_record.get("checklist"):
        new_reprint_record["checklist"] = {
            "small_cutter": True,
            "scissor": True,
            "stool": True,
            "id_card": True,
        }
    new_reprint_record["sign_ghanshyam"] = "GHANSHYAM BHAI"
    if "3TH" in str(new_reprint_record.get("floor", "")):
        new_reprint_record["floor"] = str(new_reprint_record.get("floor", "")).replace("3TH", "3RD")

    records.insert(0, new_reprint_record)
    save_records(records)
    return new_reprint_record


def delete_gatepass_record(identifier: str) -> bool:
    """
    Deletes a gate pass record from disk by pass_id, int_no, or worker code.
    Satisfies: 'J MASHIN NUMBAR NI 1 VAR PRINT API TE DELET KARVA NO PAN OPSEN ADD KAR'
    """
    records = load_records()
    target_idx = None
    ident = str(identifier).strip()
    ident_num = ident.lstrip("#").lstrip("0")

    # 1. Exact pass_id match
    for idx, r in enumerate(records):
        if r.get("pass_id") == ident or r.get("pass_id") == f"GP-{ident}":
            target_idx = idx
            break

    # 2. Int No match
    if target_idx is None and ident_num:
        for idx, r in enumerate(records):
            r_num = str(r.get("int_no", "")).strip().lstrip("#").lstrip("0")
            if r_num and r_num == ident_num:
                target_idx = idx
                break

    # 3. Worker code match
    if target_idx is None and ident:
        for idx, r in enumerate(records):
            if r.get("code", "").upper() == ident.upper():
                target_idx = idx
                break

    if target_idx is not None:
        deleted = records.pop(target_idx)
        save_records(records)
        print(f"Deleted Gate Pass: #{deleted.get('int_no')} ({deleted.get('code')} - {deleted.get('name')})")
        return True
    
    return False


def get_gatepass_history(
    date_str: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    search_query: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Retrieves issued gate pass history with versatile date and text search.
    Supports single date, date ranges, and searching by worker name/code/int_no.
    """
    records = load_records()
    filtered = records

    # Single date filter
    if date_str and date_str.upper() != "ALL":
        filtered = [r for r in filtered if r.get("date") == date_str]

    # Date range filter (from_date, to_date in YYYY-MM-DD or DD/MM/YYYY)
    if from_date or to_date:
        def parse_date(d_str: str) -> Optional[datetime]:
            if not d_str:
                return None
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                try:
                    return datetime.strptime(d_str, fmt)
                except ValueError:
                    pass
            return None

        dt_from = parse_date(from_date) if from_date else None
        dt_to = parse_date(to_date) if to_date else None

        res = []
        for r in filtered:
            r_dt = parse_date(r.get("date", ""))
            if not r_dt:
                res.append(r)
                continue
            if dt_from and r_dt < dt_from:
                continue
            if dt_to and r_dt > dt_to:
                continue
            res.append(r)
        filtered = res

    # Search query filter (matches code, name, department, or int_no)
    if search_query:
        sq = search_query.strip().lower()
        filtered = [
            r for r in filtered
            if sq in str(r.get("code", "")).lower()
            or sq in str(r.get("name", "")).lower()
            or sq in str(r.get("department", "")).lower()
            or sq in str(r.get("int_no", "")).lower()
            or sq in str(r.get("floor", "")).lower()
        ]

    return filtered


def generate_gatepass_excel(pass_data: Dict[str, Any]) -> io.BytesIO:
    """
    Generates an exact Excel file matching OSLC KARIGAR GATEPASS-15-06-2026-NEW.xlsx
    with embedded Karigar photo, Ghanshyam Bhai signature, tool checklist,
    and 141 Report Pending Mall details.
    """
    code = pass_data.get("code", "")
    name = pass_data.get("name", "")
    floor = pass_data.get("floor", "3TH FLOOR")
    dept = pass_data.get("department", "KARIGAR")
    date_val = pass_data.get("date", datetime.now().strftime("%d/%m/%Y"))
    int_no = pass_data.get("int_no", "01")
    out_time = pass_data.get("out_time", "")
    in_time = pass_data.get("in_time", "")
    pending_items = pass_data.get("pending_items", [])
    has_mall = pass_data.get("has_pending_mall", False)
    sti_pcs = pass_data.get("sti_pending_pcs", 0)
    alter_pcs = pass_data.get("alter_pending_pcs", 0)
    is_reprint = pass_data.get("is_reprint", False)

    # Styles
    f_header = Font(name="Algerian", size=18, bold=True, color="000000")
    f_body_bold = Font(name="Calibri", size=13, bold=True, color="000000")
    f_body = Font(name="Calibri", size=12, bold=False, color="000000")
    
    fill_header = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    fill_warning = PatternFill(start_color="FEF2F2", end_color="FEF2F2", fill_type="solid")
    fill_clear = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
    fill_checklist = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    thin_border_side = Side(style="thin", color="1E293B")
    medium_border_side = Side(style="medium", color="0F172A")
    double_border_side = Side(style="double", color="0F172A")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "GATEPASS"

    # Column widths
    ws.column_dimensions["A"].width = 24
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 28
    ws.column_dimensions["D"].width = 4

    # Setup Page for clean Half-A4 / A5 printing
    ws.page_setup.orientation = ws.ORIENTATION_PORTRAIT
    ws.page_setup.paperSize = ws.PAPERSIZE_A5
    ws.sheet_properties.pageSetUpPr.fitToPage = True

    # Row heights
    for r in range(1, 20):
        ws.row_dimensions[r].height = 22.0
    ws.row_dimensions[1].height = 26.0
    ws.row_dimensions[7].height = 32.0  # Name row

    # --- Header ---
    ws.merge_cells("A1:C2")
    ws["A1"] = COMPANY_NAME
    ws["A1"].font = f_header
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws["A1"].fill = fill_header

    # --- Sr No & Int No ---
    ws.merge_cells("A3:A4")
    ws["A3"] = f"Sr. No. {code}"
    ws["A3"].font = f_body_bold
    ws["A3"].alignment = Alignment(horizontal="left", vertical="center")

    ws.merge_cells("B3:C4")
    reprint_tag = " [REPRINT]" if is_reprint else ""
    ws["B3"] = f"Int No. {int_no}{reprint_tag}"
    ws["B3"].font = f_body_bold
    ws["B3"].alignment = Alignment(horizontal="left", vertical="center")

    # --- Date ---
    ws.merge_cells("A5:C5")
    ws["A5"] = f"Date :     {date_val}"
    ws["A5"].font = f_body_bold
    ws["A5"].alignment = Alignment(horizontal="left", vertical="center")

    # --- Department ---
    ws.merge_cells("A6:C6")
    ws["A6"] = f"Department : {dept}"
    ws["A6"].font = f_body_bold
    ws["A6"].alignment = Alignment(horizontal="left", vertical="center")

    # --- Name ---
    ws.merge_cells("A7:C7")
    ws["A7"] = f"Name : {name}"
    ws["A7"].font = f_body_bold
    ws["A7"].alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

    # --- Floor No ---
    floor_display = str(floor).replace("3TH", "3RD")
    ws.merge_cells("A8:C8")
    ws["A8"] = f"Floor No :   {floor_display}"
    ws["A8"].font = f_body_bold
    ws["A8"].alignment = Alignment(horizontal="left", vertical="center")

    # --- Out Time ---
    ws.merge_cells("A9:C9")
    ws["A9"] = f"Out Time : {out_time}"
    ws["A9"].font = f_body_bold
    ws["A9"].alignment = Alignment(horizontal="left", vertical="center")

    # --- In Time ---
    ws.merge_cells("A10:C10")
    ws["A10"] = f"In Time : {in_time or '____________________'}"
    ws["A10"].font = f_body_bold
    ws["A10"].alignment = Alignment(horizontal="left", vertical="center")

    # --- Checklist Verification Row (Empty [     ] if not returned, [DONE] if returned) ---
    chk = pass_data.get("checklist") or {}
    c_cutter = "[DONE]" if chk.get("small_cutter") else "[     ]"
    c_scissor = "[DONE]" if chk.get("scissor") else "[     ]"
    c_stool = "[DONE]" if chk.get("stool") else "[     ]"
    c_id = "[DONE]" if chk.get("id_card") else "[     ]"
    
    ws.merge_cells("A11:C11")
    ws["A11"] = f"RETURNED ASSETS:  CUTTER: {c_cutter}  |  SCISSOR: {c_scissor}  |  STOOL: {c_stool}  |  ID CARD: {c_id}"
    ws["A11"].font = Font(name="Calibri", size=10, bold=True, color="047857" if (chk.get("small_cutter") and chk.get("scissor") and chk.get("stool") and chk.get("id_card")) else "B45309")
    ws["A11"].alignment = Alignment(horizontal="center", vertical="center")
    ws["A11"].fill = fill_checklist

    # --- Signatures (3 Authorized Signatures with Selected Names) ---
    sign_perm = pass_data.get("sign_permission") or pass_data.get("sign_rafik") or "RAFIK / TIPU"
    sign_chk = pass_data.get("sign_checking") or pass_data.get("sign_ghanshyam") or "GHANSHYAM BHAI"
    sign_iss = pass_data.get("sign_issued") or pass_data.get("sign_jeel") or "JEEL BHAI"

    ws.merge_cells("A12:C12")
    ws["A12"] = f"Sign. & Name : Permission By ({sign_perm}): ___________________"
    ws["A12"].font = f_body_bold
    ws["A12"].alignment = Alignment(horizontal="left", vertical="center")

    ws.merge_cells("A13:C13")
    ws["A13"] = f"Sign. & Name : Checking Done By ({sign_chk}): ___________________"
    ws["A13"].font = f_body_bold
    ws["A13"].alignment = Alignment(horizontal="left", vertical="center")

    ws.merge_cells("A14:C14")
    ws["A14"] = f"Sign. & Name : Gate Pass Issued By ({sign_iss}): ___________________"
    ws["A14"].font = f_body_bold
    ws["A14"].alignment = Alignment(horizontal="left", vertical="center")

    # --- 141 Pending Goods (Mall) Notice on Pass (Pure English) ---
    ws.merge_cells("A15:C15")
    if has_mall:
        ws["A15"] = f"[REPORT 141 ALERT] PENDING GOODS: STI = {sti_pcs} Pcs | ALTER = {alter_pcs} Pcs (TOTAL: {sti_pcs + alter_pcs} Pcs)"
        ws["A15"].font = Font(name="Calibri", size=11, bold=True, color="991B1B")
        ws["A15"].fill = fill_warning
    else:
        ws["A15"] = "[REPORT 141 CLEAR] NO PENDING GOODS (STI: 0 | ALTER: 0 PCS) - ALL CLEAR"
        ws["A15"].font = Font(name="Calibri", size=11, bold=True, color="166534")
        ws["A15"].fill = fill_clear
    ws["A15"].alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # --- Created By JEEL VAGHANI Credit Row ---
    ws.merge_cells("A16:C16")
    ws["A16"] = "CREATED BY JEEL VAGHANI • OSLC HOUSE"
    ws["A16"].font = Font(name="Calibri", size=9, bold=True, color="475569")
    ws["A16"].alignment = Alignment(horizontal="center", vertical="center")

    # Apply borders around pass slip
    for r in range(1, 17):
        for c in range(1, 4):
            cell = ws.cell(r, c)
            top_s = medium_border_side if r == 1 else thin_border_side
            bot_s = double_border_side if r == 16 else thin_border_side
            left_s = medium_border_side if c == 1 else None
            right_s = medium_border_side if c == 3 else None
            cell.border = Border(top=top_s, bottom=bot_s, left=left_s, right=right_s)

    # Embed Photo if available
    photo_bytes = pass_data.get("photo_bytes")
    if not photo_bytes and pass_data.get("photo_base64"):
        try:
            photo_bytes = base64.b64decode(pass_data["photo_base64"])
        except Exception:
            pass

    if photo_bytes:
        try:
            pil_img = PILImage.open(io.BytesIO(photo_bytes))
            pil_img.thumbnail((140, 160), PILImage.Resampling.LANCZOS)
            img_buf = io.BytesIO()
            pil_img.save(img_buf, format="PNG")
            img_buf.seek(0)

            xl_img = OpenpyxlImage(img_buf)
            ws.add_image(xl_img, "C3")
        except Exception as exc:
            print(f"Failed to embed photo into Excel: {exc}")

    # --- Embed 141 Pending Mall Table directly under the slip if goods exist ---
    if pending_items:
        start_r = 18
        ws.cell(start_r, 1, f"REPORT 141 PENDING MALL DETAILS ({len(pending_items)} Lots Pending)").font = Font(name="Calibri", size=12, bold=True, color="991B1B")
        ws.merge_cells(start_row=start_r, start_column=1, end_row=start_r, end_column=3)
        ws.row_dimensions[start_r].height = 20

        sub_headers = ["Process", "Lot No & SKU", "Bal Pcs / Date"]
        start_r += 1
        for col_idx, sh in enumerate(sub_headers, 1):
            c = ws.cell(start_r, col_idx, sh)
            c.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
            c.fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
            c.alignment = Alignment(horizontal="center", vertical="center")

        for item in pending_items:
            start_r += 1
            ws.cell(start_r, 1, f"{item.get('process_short', item.get('process', ''))}").alignment = Alignment(horizontal="center")
            ws.cell(start_r, 2, f"{item.get('lot_no', '')} ({item.get('item_name', '')})")
            ws.cell(start_r, 3, f"{item.get('bal_qty', 0)} Pcs | {item.get('date', '')}").alignment = Alignment(horizontal="center")
            for c in range(1, 4):
                ws.cell(start_r, c).font = Font(name="Calibri", size=9)
                ws.cell(start_r, c).border = Border(
                    top=thin_border_side, bottom=thin_border_side,
                    left=thin_border_side, right=thin_border_side
                )

    # --- Sheet 2: Full Detailed 141 Pending Mall Details ---
    if pending_items:
        ws2 = wb.create_sheet(title="141 PENDING MALL")
        ws2.views.sheetView[0].showGridLines = True

        headers = ["SR", "PROCESS", "LOT NO", "BARCODE NO", "ITEM NAME", "SKU CODE", "SIZE", "BAL QTY (PCS)", "ISSUE DATE", "VOUCHER NO"]
        ws2.append([f"REPORT 141 PENDING MALL FOR {code} - {name} (Total: {len(pending_items)} Lots)"])
        ws2.merge_cells("A1:J1")
        ws2["A1"].font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
        ws2["A1"].alignment = Alignment(horizontal="center", vertical="center")
        ws2.row_dimensions[1].height = 25

        ws2.append(headers)
        ws2.row_dimensions[2].height = 22
        for col_idx in range(1, len(headers) + 1):
            c = ws2.cell(2, col_idx)
            c.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
            c.fill = PatternFill(start_color="1E40AF", end_color="1E40AF", fill_type="solid")
            c.alignment = Alignment(horizontal="center", vertical="center")

        for idx, item in enumerate(pending_items, 1):
            row_data = [
                idx,
                item.get("process", ""),
                item.get("lot_no", ""),
                item.get("barcode_no", item.get("voucher_no", "")),
                item.get("item_name", ""),
                item.get("sku_code", ""),
                item.get("size", ""),
                item.get("bal_qty", 0),
                item.get("date", ""),
                item.get("voucher_no", ""),
            ]
            ws2.append(row_data)
            r_idx = idx + 2
            ws2.row_dimensions[r_idx].height = 20
            for col_idx in range(1, len(headers) + 1):
                cell = ws2.cell(r_idx, col_idx)
                cell.font = Font(name="Calibri", size=11)
                cell.border = Border(
                    top=Side(style="thin", color="CBD5E1"),
                    bottom=Side(style="thin", color="CBD5E1"),
                    left=Side(style="thin", color="CBD5E1"),
                    right=Side(style="thin", color="CBD5E1"),
                )
                if col_idx in [1, 2, 6, 7, 8]:
                    cell.alignment = Alignment(horizontal="center", vertical="center")

        # Auto column width for sheet 2
        for col in ws2.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws2.column_dimensions[col_letter].width = max(max_len + 3, 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def export_gatepass_register_excel(records: List[Dict[str, Any]], title_suffix: str = "") -> io.BytesIO:
    """
    Exports the comprehensive Gate Pass Register & Report into an Excel file.
    Enables searching, archiving, and printing records for any date or date range.
    Satisfies: 'TENO REPOT MANE ALG PAGE MA J JOYE CE JENI HU GAME TE DAY SHARCH KARI SAKU KE EXCEL NI PRINT NIKALI SAKU'
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "GATEPASS REGISTER"
    ws.views.sheetView[0].showGridLines = True

    # Title
    ws.merge_cells("A1:N1")
    ws["A1"] = f"OSLC HOUSE • KARIGAR GATE PASS REGISTER {title_suffix}"
    ws["A1"].font = Font(name="Algerian", size=16, bold=True, color="1E3A8A")
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 32

    # Subtitle
    ws.merge_cells("A2:N2")
    ws["A2"] = f"Generated on {datetime.now().strftime('%d/%m/%Y %I:%M %p')} • Total Passes: {len(records)} • Created By JEEL VAGHANI"
    ws["A2"].font = Font(name="Calibri", size=11, bold=True, color="475569")
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    # Table Headers
    headers = [
        "SR", "INT NO", "DATE", "OUT TIME", "CODE", "KARIGAR NAME", 
        "DEPARTMENT", "FLOOR", "REASON", "TOOLS CHECKED", 
        "141 MALL STATUS", "BAL PCS", "REPRINT STATUS", "AUTHORIZED SIGNS"
    ]
    ws.append([])  # Row 3 blank
    ws.append(headers)  # Row 4
    ws.row_dimensions[4].height = 24

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(4, col_idx)
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    thin_border = Border(
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
    )

    for idx, r in enumerate(records, 1):
        r_num = idx + 4
        ws.row_dimensions[r_num].height = 22

        # Checklist string (reflect returned status accurately)
        chk = r.get("checklist") or {}
        c_c = "✔" if chk.get("small_cutter", True) else "❌"
        c_s = "✔" if chk.get("scissor", True) else "❌"
        c_st = "✔" if chk.get("stool", True) else "❌"
        c_id = "✔" if chk.get("id_card", True) else "❌"
        chk_str = f"Cutter:{c_c} | Scissor:{c_s} | Stool:{c_st} | ID:{c_id}"

        # Mall status
        has_mall = r.get("has_pending_mall", False)
        tot_pcs = r.get("total_pending_pcs", 0)
        mall_status = f"⚠️ PENDING ({tot_pcs} Pcs)" if has_mall else "✅ CLEAR (0 Pcs)"

        # Reprint
        reprint_str = f"Reprint ({r.get('reprint_count', 1)})" if r.get("is_reprint") else "Original"

        floor_str = str(r.get("floor", "3RD FLOOR")).replace("3TH", "3RD")

        row_data = [
            idx,
            r.get("int_no", ""),
            r.get("date", ""),
            r.get("out_time", ""),
            r.get("code", ""),
            r.get("name", ""),
            r.get("department", "KARIGAR"),
            floor_str,
            r.get("reason", "Personal"),
            chk_str,
            mall_status,
            tot_pcs,
            reprint_str,
            "Rafik / Ghanshyam Bhai / Jeel",
        ]

        for col_idx, val in enumerate(row_data, 1):
            c = ws.cell(r_num, col_idx, val)
            c.font = Font(name="Calibri", size=10)
            c.border = thin_border
            if col_idx in [1, 2, 3, 4, 5, 8, 10, 11, 12, 13]:
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

            # Highlighting pending mall
            if col_idx == 11 and has_mall:
                c.font = Font(name="Calibri", size=10, bold=True, color="991B1B")
                c.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")

    # Auto column width
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf
