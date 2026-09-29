import sys
import os
import time
from typing import Optional, List
from pathlib import Path

# Add current directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Query, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from apps.po.backend.db import (
    test_db_connection,
    get_available_dates,
    get_po_summary,
    get_po_list,
    get_po_items,
    get_wms_order_process_records,
    get_available_pos_for_reconciliation,
    get_po_cutting_reconciliation
)
from apps.po.backend.uploaded_db import (
    save_uploaded_batch,
    get_uploaded_batches,
    delete_uploaded_batch,
    get_uploaded_pos,
    get_uploaded_po_items,
    save_po_dispatch_schedule,
    get_po_dispatch_schedules
)
from apps.po.backend.sheet_parser import parse_po_sheet

app = FastAPI(title="OSLC PO Dashboard Backend API", version="1.0.0")

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lightweight cache
_CACHE = {}
_CACHE_TTL = 10  # seconds

def cache_get(key: str):
    item = _CACHE.get(key)
    if item and (time.time() - item["ts"] < _CACHE_TTL):
        return item["data"]
    return None

def cache_set(key: str, data):
    _CACHE[key] = {"ts": time.time(), "data": data}

@app.get("/api/status")
def get_status():
    return test_db_connection()

@app.get("/api/dates")
def get_dates(limit: int = 180):
    cache_key = f"dates_{limit}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    try:
        data = get_available_dates(limit)
        # Also include any dates from uploaded batches if not already in list
        batches = get_uploaded_batches()
        existing_dates = {d["date"] for d in data}
        for b in batches:
            b_date = b.get("po_date")
            if b_date and b_date not in existing_dates:
                data.append({
                    "date": b_date,
                    "po_count": 1,
                    "row_count": b.get("total_rows", 0),
                    "total_qty": b.get("total_qty", 0),
                    "pending_qty": b.get("pending_qty", 0),
                    "processed_qty": max(0, b.get("total_qty", 0) - b.get("pending_qty", 0)),
                    "completion_pct": 0,
                    "total_amount": 0
                })
                existing_dates.add(b_date)
        data.sort(key=lambda x: x["date"], reverse=True)
        cache_set(cache_key, data)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/summary")
def get_summary(
    dates: str = Query(..., description="Comma separated YYYY-MM-DD dates"),
    portal: Optional[str] = None
):
    date_list = [d.strip() for d in dates.split(",") if d.strip()]
    cache_key = f"summary_{'_'.join(date_list)}_{portal}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    try:
        # Digi live summary
        data = get_po_summary(date_list, portal)
        
        # Merge with uploaded POs for these dates
        up_pos = get_uploaded_pos(dates=date_list, portal_filter=portal)
        if up_pos:
            up_total_pos = len(up_pos)
            up_items = sum(p["item_count"] for p in up_pos)
            up_qty = sum(p["total_qty"] for p in up_pos)
            up_pending = sum(p["pending_qty"] for p in up_pos)
            up_proc = sum(p["processed_qty"] for p in up_pos)

            data["total_pos"] += up_total_pos
            data["total_items"] += up_items
            data["total_qty"] += up_qty
            data["pending_qty"] += up_pending
            data["processed_qty"] += up_proc
            if data["total_qty"] > 0:
                data["completion_pct"] = round((data["processed_qty"] / data["total_qty"]) * 100, 1)

            # Portal breakdown merge
            portal_map = {p["portal"]: p for p in data["portals"]}
            for up in up_pos:
                p_name = up["portal"]
                if p_name in portal_map:
                    portal_map[p_name]["po_count"] += 1
                    portal_map[p_name]["qty"] += up["total_qty"]
                    portal_map[p_name]["pending_qty"] += up["pending_qty"]
                else:
                    portal_map[p_name] = {
                        "portal": p_name,
                        "po_count": 1,
                        "qty": up["total_qty"],
                        "pending_qty": up["pending_qty"],
                        "amount": 0
                    }
            data["portals"] = list(portal_map.values())
            data["portals"].sort(key=lambda x: x["qty"], reverse=True)

        cache_set(cache_key, data)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pos")
def get_pos(
    dates: str = Query(..., description="Comma separated YYYY-MM-DD dates"),
    portal: Optional[str] = None
):
    date_list = [d.strip() for d in dates.split(",") if d.strip()]
    cache_key = f"pos_{'_'.join(date_list)}_{portal}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    try:
        # 1. Fetch live POs from Digi
        live_pos = get_po_list(date_list, portal)
        for p in live_pos:
            p["is_uploaded"] = False
            p["source"] = "DIGI LIVE"

        # 2. Fetch uploaded POs
        uploaded_pos = get_uploaded_pos(dates=date_list, portal_filter=portal)
        for p in uploaded_pos:
            p["is_uploaded"] = True
            p["source"] = "SHEET UPLOAD"

        combined = live_pos + uploaded_pos

        # Sort priority:
        # 1. Nearest dispatch date first (priority_rank ascending: Overdue=1, Today=2, Tomorrow=3, Soon=4, Normal=5, Completed=99)
        # 2. Within same rank, dispatch_date ascending
        # 3. Within same date, total_qty descending
        def get_sort_tuple(item):
            rank = item.get("priority_rank", 5)
            d_date = item.get("dispatch_date") or "9999-99-99"
            qty = item.get("total_qty", 0)
            return (rank, d_date, -qty)

        combined.sort(key=get_sort_tuple)

        cache_set(cache_key, combined)
        return combined
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/po-items")
def get_po_item_list(po_no: str, po_date: Optional[str] = None):
    cache_key = f"items_{po_no}_{po_date}"
    cached = cache_get(cache_key)
    if cached:
        return cached
    try:
        # First check uploaded items
        up_items = get_uploaded_po_items(po_no, po_date)
        if up_items:
            cache_set(cache_key, up_items)
            return up_items

        # Otherwise fetch from Digi Live
        data = get_po_items(po_no, po_date)
        cache_set(cache_key, data)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/compare")
def compare_dates(dates: str = Query(..., description="Comma separated dates, e.g. 2026-09-27,2026-09-26,2026-09-25")):
    date_list = [d.strip() for d in dates.split(",") if d.strip()]
    results = []
    for d in date_list:
        summary = get_summary(d)
        pos = get_pos(d)
        results.append({
            "date": d,
            "summary": summary,
            "po_count": len(pos),
            "pos": pos
        })
    return results

@app.post("/api/upload-po-sheet")
async def upload_po_sheet(
    file: UploadFile = File(...),
    portal: str = Form("FLIPKART PO"),
    po_no: str = Form(""),
    po_date: str = Form(""),
    dispatch_date: str = Form("")
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # If date not provided, default to current date
        if not po_date:
            po_date = time.strftime("%Y-%m-%d")

        # Parse the spreadsheet
        items, summary = parse_po_sheet(
            file_bytes=content,
            filename=file.filename or "upload.xlsx",
            default_portal=portal.upper().strip(),
            default_po_no=po_no.strip(),
            default_date=po_date,
            default_dispatch_date=dispatch_date.strip()
        )

        if not items:
            raise HTTPException(status_code=400, detail="No valid SKU or PO rows found in file.")

        chosen_dispatch_date = dispatch_date.strip() or summary.get("dispatch_date") or ""

        # Save to SQLite database
        batch_id = save_uploaded_batch(
            filename=file.filename or "upload.xlsx",
            portal=portal.upper().strip(),
            po_no=po_no.strip() or (summary["po_numbers"][0] if summary["po_numbers"] else "PO-IMPORT"),
            po_date=po_date,
            items=items,
            dispatch_date=chosen_dispatch_date
        )

        # Invalidate cache so UI refreshes immediately
        _CACHE.clear()

        return {
            "status": "success",
            "batch_id": batch_id,
            "summary": summary,
            "dispatch_date": chosen_dispatch_date,
            "message": f"Successfully uploaded {len(items)} items for {portal.upper().strip()}! Dispatch Date: {chosen_dispatch_date or 'Auto-scheduled'}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/update-po-dispatch-date")
def update_po_dispatch_date(
    po_no: str = Form(...),
    dispatch_date: str = Form(...),
    notes: str = Form("")
):
    try:
        save_po_dispatch_schedule(
            po_no=po_no.strip(),
            dispatch_date=dispatch_date.strip(),
            notes=notes.strip()
        )
        _CACHE.clear()
        return {
            "status": "success",
            "po_no": po_no.strip(),
            "dispatch_date": dispatch_date.strip(),
            "message": f"Dispatch date updated to {dispatch_date.strip()}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dispatch-alerts")
def get_dispatch_alerts(dates: Optional[str] = None, portal: Optional[str] = None):
    try:
        if not dates:
            dates = time.strftime("%Y-%m-%d")
        pos_list = get_pos(dates=dates, portal=portal)
        
        overdue_list = [p for p in pos_list if p.get("urgency_status") == "overdue"]
        today_list = [p for p in pos_list if p.get("urgency_status") == "today"]
        tomorrow_list = [p for p in pos_list if p.get("urgency_status") == "tomorrow"]
        soon_list = [p for p in pos_list if p.get("urgency_status") == "soon"]

        total_urgent = len(overdue_list) + len(today_list) + len(tomorrow_list)

        return {
            "total_urgent": total_urgent,
            "overdue_count": len(overdue_list),
            "today_count": len(today_list),
            "tomorrow_count": len(tomorrow_list),
            "soon_count": len(soon_list),
            "urgent_pos": overdue_list + today_list + tomorrow_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/uploaded-batches")
def list_uploaded_batches():
    return get_uploaded_batches()

@app.delete("/api/uploaded-batch/{batch_id}")
def delete_batch(batch_id: int):
    try:
        delete_uploaded_batch(batch_id)
        _CACHE.clear()
        return {"status": "ok", "message": f"Deleted batch {batch_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/refresh-cache")
def clear_all_cache():
    _CACHE.clear()
    return {"status": "ok", "message": "Cache cleared"}

@app.get("/api/wms-orders")
def get_wms_orders(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    order_type: Optional[str] = Query("PO"),
    limit: int = Query(500)
):
    try:
        return get_wms_order_process_records(
            from_date=from_date,
            to_date=to_date,
            order_id=order_id,
            order_type=order_type,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reconciliation-pos")
def get_recon_pos():
    try:
        return get_available_pos_for_reconciliation()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/po-cutting-report")
def get_cutting_report(po_no: str = Query(...)):
    try:
        return get_po_cutting_reconciliation(po_no)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Serve PO Dashboard React Frontend
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="po_assets")

    @app.get("/")
    def serve_po_index():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/{full_path:path}")
    def serve_po_fallback(full_path: str):
        file = FRONTEND_DIR / full_path
        if file.exists() and file.is_file():
            return FileResponse(file)
        return FileResponse(FRONTEND_DIR / "index.html")

if __name__ == "__main__":
    print("[SERVER] Starting OSLC PO Dashboard API on http://0.0.0.0:5050 (LAN accessible)")
    uvicorn.run("app:app", host="0.0.0.0", port=5050, reload=False, log_level="info")
