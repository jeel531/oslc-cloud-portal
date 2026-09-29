import io
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple
import pandas as pd
from fastapi import UploadFile, HTTPException

def normalize_col_name(c: str) -> str:
    return re.sub(r'[^a-z0-9]', '', str(c).lower().strip())

def parse_po_sheet(
    file_bytes: bytes,
    filename: str,
    default_portal: str,
    default_po_no: str = "",
    default_date: str = "",
    default_dispatch_date: str = ""
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    # Read into pandas DataFrame
    fname = filename.lower()
    try:
        if fname.endswith(".csv"):
            for enc in ("utf-8-sig", "utf-8", "cp1252", "latin1"):
                try:
                    df = pd.read_csv(io.BytesIO(file_bytes), encoding=enc)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                df = pd.read_csv(io.BytesIO(file_bytes))
        else:
            df = pd.read_excel(io.BytesIO(file_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read spreadsheet: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded sheet is empty.")

    # Identify matching columns
    col_map = {}
    normalized_cols = {c: normalize_col_name(c) for c in df.columns}

    # Match PO No
    po_candidates = ['ponumber', 'pono', 'purchaseorder', 'orderid', 'ordernumber', 'refpono', 'po', 'order']
    # Match SKU
    sku_candidates = ['sku', 'skucode', 'portalsku', 'portalskucode', 'itemsku', 'fsn', 'asin', 'productsku', 'itemcode', 'style', 'styleno', 'itemname', 'item']
    # Match ASIN
    asin_candidates = ['asin', 'portalasin', 'fsn', 'productid']
    # Match Qty
    qty_candidates = ['qty', 'quantity', 'orderedqty', 'orderqty', 'pieces', 'totalqty', 'units', 'count', 'pcs']
    # Match Pending Qty
    pending_candidates = ['pendingqty', 'pendingpieces', 'pendingqtypieces', 'balanceqty', 'pendqty']
    # Match Size
    size_candidates = ['size', 'itemsize', 'productsize', 'sizename']
    # Match Design
    design_candidates = ['design', 'designno', 'stylecode', 'model', 'designnumber']
    # Match Box
    box_candidates = ['box', 'boxno', 'carton', 'cartonno']
    # Match Dispatch / Delivery Date
    dispatch_candidates = [
        'dispatchdate', 'dispatch', 'moklvanidate', 'deliverydate', 'delivery',
        'shipbydate', 'shipdate', 'shipmentdate', 'expecteddate', 'expdate',
        'duedate', 'targetdate', 'scheduleddate', 'promiseddate', 'handoverdate',
        'outwarddate', 'targetdispatch', 'expecteddispatch', 'dispatchtat'
    ]

    def find_best_col(candidates):
        for orig, norm in normalized_cols.items():
            if norm in candidates:
                return orig
        for orig, norm in normalized_cols.items():
            if any(cand in norm for cand in candidates):
                return orig
        return None

    col_po = find_best_col(po_candidates)
    col_sku = find_best_col(sku_candidates)
    col_asin = find_best_col(asin_candidates)
    col_qty = find_best_col(qty_candidates)
    col_pending = find_best_col(pending_candidates)
    col_size = find_best_col(size_candidates)
    col_design = find_best_col(design_candidates)
    col_box = find_best_col(box_candidates)
    col_dispatch = find_best_col(dispatch_candidates)

    if not col_sku and not col_asin:
        # Fallback to the first text column
        for c in df.columns:
            if df[c].dtype == object:
                col_sku = c
                break
        if not col_sku:
            col_sku = df.columns[0]

    items = []
    total_qty = 0
    total_pending = 0
    detected_pos = set()

    for _, row in df.iterrows():
        # Determine PO Number
        row_po = ""
        if col_po and pd.notna(row[col_po]):
            row_po = str(row[col_po]).strip()
        if not row_po:
            row_po = default_po_no or Path(filename).stem

        # Determine SKU & ASIN
        sku = str(row[col_sku]).strip() if col_sku and pd.notna(row[col_sku]) else ""
        asin = str(row[col_asin]).strip() if col_asin and pd.notna(row[col_asin]) else ""
        if not sku and asin:
            sku = asin
        if not sku:
            continue

        # Quantity
        qty_val = 1
        if col_qty and pd.notna(row[col_qty]):
            try:
                qty_val = max(1, int(float(row[col_qty])))
            except Exception:
                qty_val = 1

        # Pending Quantity
        pending_val = qty_val
        if col_pending and pd.notna(row[col_pending]):
            try:
                pending_val = max(0, int(float(row[col_pending])))
            except Exception:
                pending_val = qty_val

        # Size & Design & Box
        size_val = str(row[col_size]).strip() if col_size and pd.notna(row[col_size]) else ""
        design_val = str(row[col_design]).strip() if col_design and pd.notna(row[col_design]) else ""
        box_val = str(row[col_box]).strip() if col_box and pd.notna(row[col_box]) else ""

        # Dispatch Date
        row_dispatch = ""
        if col_dispatch and pd.notna(row[col_dispatch]):
            try:
                dt_p = pd.to_datetime(row[col_dispatch], errors="coerce")
                if pd.notna(dt_p):
                    row_dispatch = dt_p.strftime("%Y-%m-%d")
            except Exception:
                pass
        if not row_dispatch:
            row_dispatch = default_dispatch_date

        detected_pos.add(row_po)
        total_qty += qty_val
        total_pending += pending_val

        items.append({
            "portal": default_portal,
            "po_no": row_po,
            "po_date": default_date,
            "dispatch_date": row_dispatch,
            "sku": sku,
            "asin": asin,
            "design_no": design_val,
            "size": size_val,
            "qty": qty_val,
            "pending_qty": pending_val,
            "box_no": box_val,
            "voucher_no": f"UPLOAD/{Path(filename).stem}"
        })

    summary = {
        "filename": filename,
        "portal": default_portal,
        "po_count": len(detected_pos),
        "po_numbers": list(detected_pos)[:5],
        "total_items": len(items),
        "total_qty": total_qty,
        "pending_qty": total_pending,
        "dispatch_date": default_dispatch_date,
        "columns_detected": {
            "po": col_po,
            "sku": col_sku,
            "asin": col_asin,
            "qty": col_qty,
            "pending_qty": col_pending,
            "size": col_size,
            "design": col_design,
            "box": col_box,
            "dispatch_date": col_dispatch,
        }
    }

    return items, summary
