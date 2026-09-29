# -*- coding: utf-8 -*-
"""
Om Sai Latest Creation - OSLC Alter & Stitching Receive Karigar Report
FastAPI Web Server Engine (DigiBizz Report 127)
"""
from __future__ import annotations

import io
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

import apps.alter.backend.db as db
from apps.alter.backend.config import SERVER_HOST, SERVER_PORT, APP_NAME, APP_VERSION, APP_SUBTITLE, COMPANY_NAME

app = FastAPI(title=APP_NAME, version=APP_VERSION)

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
        try:
            db._CACHE.clear()
        except Exception:
            pass

    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

import sys

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "frontend"
PUBLIC_DIR.mkdir(exist_ok=True)


@app.on_event("startup")
def on_startup():
    db.prewarm_cache_background()


@app.get("/api/health")
def api_health():
    """Health check verifying database connection and server status."""
    db_ok = False
    try:
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        conn.close()
        db_ok = True
    except Exception as exc:
        db_ok = False

    return {
        "status": "online",
        "app": APP_NAME,
        "company": COMPANY_NAME,
        "report_id": "127",
        "database_connected": db_ok,
        "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


@app.get("/api/karigar-summary")
def api_karigar_summary(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    alter_mode: str = Query("ALTER_ISSUE"),  # ALTER_ISSUE, ALTER_RECEIVE, BOTH
    floor: str = Query("ALL"),
    search: str = Query(""),
    refresh: bool = Query(False)
):
    """
    Returns Karigar-wise aggregated report for Stitching Receive & Alter (Report 127).
    """
    today_str = date.today().strftime("%Y-%m-%d")
    # Default to first day of current month to today
    first_day_curr_month = date.today().replace(day=1).strftime("%Y-%m-%d")

    start = from_date.strip() if from_date else first_day_curr_month
    end = to_date.strip() if to_date else today_str

    try:
        report_data = db.build_karigar_report(
            from_date=start,
            to_date=end,
            alter_mode=alter_mode,
            search=search,
            floor_filter=floor,
            force_refresh=refresh
        )
        return report_data
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(exc)}
        )


@app.get("/api/karigar-detail")
def api_karigar_detail(
    employee_key: str = Query(...),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    alter_mode: str = Query("ALTER_ISSUE")
):
    """
    Returns itemized design & lot breakdown for a single Karigar.
    """
    today_str = date.today().strftime("%Y-%m-%d")
    first_day_curr_month = date.today().replace(day=1).strftime("%Y-%m-%d")

    start = from_date.strip() if from_date else first_day_curr_month
    end = to_date.strip() if to_date else today_str

    try:
        detail_data = db.get_karigar_detail(
            employee_key=employee_key,
            from_date=start,
            to_date=end,
            alter_mode=alter_mode
        )
        return detail_data
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(exc)}
        )


@app.get("/api/export-excel")
def api_export_excel(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    alter_mode: str = Query("ALTER_ISSUE")
):
    """
    Exports full multi-sheet formatted Excel report matching OSLC Karigar Report layout.
    """
    today_str = date.today().strftime("%Y-%m-%d")
    first_day_curr_month = date.today().replace(day=1).strftime("%Y-%m-%d")

    start = from_date.strip() if from_date else first_day_curr_month
    end = to_date.strip() if to_date else today_str

    try:
        excel_buf = db.generate_karigar_excel(
            from_date=start,
            to_date=end,
            alter_mode=alter_mode
        )
        date_tag = start if start == end else f"{start}_to_{end}"
        filename = f"OSLC_KARIGAR_ALTER_REPORT_{date_tag}.xlsx"

        return StreamingResponse(
            excel_buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(exc)}
        )


@app.get("/api/period-comparison")
def api_period_comparison(
    from_date1: str = Query(...),
    to_date1: str = Query(...),
    from_date2: str = Query(...),
    to_date2: str = Query(...),
    alter_mode: str = Query("ALTER_ISSUE"),
    refresh: bool = Query(False)
):
    """
    Returns side-by-side comparison for two distinct date periods across all karigars.
    """
    try:
        data = db.build_period_comparison_report(
            from_date1=from_date1.strip(),
            to_date1=to_date1.strip(),
            from_date2=from_date2.strip(),
            to_date2=to_date2.strip(),
            alter_mode=alter_mode,
            force_refresh=refresh
        )
        return data
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(exc)}
        )


@app.get("/api/export-comparison-excel")
def api_export_comparison_excel(
    from_date1: str = Query(...),
    to_date1: str = Query(...),
    from_date2: str = Query(...),
    to_date2: str = Query(...),
    alter_mode: str = Query("ALTER_ISSUE"),
    p1_label: Optional[str] = Query(None),
    p2_label: Optional[str] = Query(None)
):
    """
    Exports side-by-side comparison Excel file matching User's exact reference template.
    """
    try:
        excel_buf = db.generate_period_comparison_excel(
            from_date1=from_date1.strip(),
            to_date1=to_date1.strip(),
            from_date2=from_date2.strip(),
            to_date2=to_date2.strip(),
            alter_mode=alter_mode,
            p1_label=p1_label,
            p2_label=p2_label
        )
        filename = f"OSLC_ALTER_COMPARISON_REPORT_{from_date1}_vs_{from_date2}.xlsx"
        return StreamingResponse(
            excel_buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(exc)}
        )


@app.get("/api/alter-checking")
def api_alter_checking(
    from_date1: str = Query(...),
    to_date1: str = Query(...),
    from_date2: str = Query(...),
    to_date2: str = Query(...),
    alter_mode: str = Query("ALTER_ISSUE"),
    refresh: bool = Query(False)
):
    """
    Returns 2-period comparison report for Alter Checking:
    - STR: All lots included
    - ALTER: DB (Duplicate) lots only
    """
    try:
        data = db.build_alter_checking_report(
            from_date1=from_date1.strip(),
            to_date1=to_date1.strip(),
            from_date2=from_date2.strip(),
            to_date2=to_date2.strip(),
            alter_mode=alter_mode,
            force_refresh=refresh
        )
        return data
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(exc)}
        )


@app.get("/api/export-alter-checking-excel")
def api_export_alter_checking_excel(
    from_date1: str = Query(...),
    to_date1: str = Query(...),
    from_date2: str = Query(...),
    to_date2: str = Query(...),
    alter_mode: str = Query("ALTER_ISSUE"),
    p1_label: Optional[str] = Query(None),
    p2_label: Optional[str] = Query(None)
):
    """
    Exports Alter Checking Excel report (STR: All Lots | ALTER: DB Lots Only).
    """
    try:
        excel_buf = db.generate_alter_checking_excel(
            from_date1=from_date1.strip(),
            to_date1=to_date1.strip(),
            from_date2=from_date2.strip(),
            to_date2=to_date2.strip(),
            alter_mode=alter_mode,
            p1_label=p1_label,
            p2_label=p2_label
        )
        filename = f"OSLC_ALTER_CHECKING_REPORT_{from_date1}_vs_{from_date2}.xlsx"
        return StreamingResponse(
            excel_buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(exc)}
        )


# Mount static assets
app.mount("/static", StaticFiles(directory=str(PUBLIC_DIR)), name="static")

@app.get("/styles.css")
def get_styles_css():
    css_file = PUBLIC_DIR / "styles.css"
    if css_file.exists():
        return FileResponse(css_file, media_type="text/css")
    return HTMLResponse("", status_code=404)

@app.get("/app.js")
def get_app_js():
    js_file = PUBLIC_DIR / "app.js"
    if js_file.exists():
        return FileResponse(js_file, media_type="application/javascript")
    return HTMLResponse("", status_code=404)

@app.get("/oslc_logo.png")
def get_oslc_logo():
    logo = PUBLIC_DIR / "oslc_logo.png"
    if logo.exists():
        return FileResponse(logo, media_type="image/png")
    return HTMLResponse("", status_code=404)

@app.get("/", response_class=HTMLResponse)
def index_page():
    index_file = PUBLIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse("<h1>OSLC Karigar Alter & Stitching Receive Report</h1><p>UI loading...</p>")


if __name__ == "__main__":
    import uvicorn
    print(f"Starting {APP_NAME} on http://localhost:{SERVER_PORT} ...")
    uvicorn.run("server:app", host=SERVER_HOST, port=SERVER_PORT, reload=False)
