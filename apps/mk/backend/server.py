"""
OSLC CHEKING - FastAPI Web Server
Dedicated to DigiBizz Detail Report (127) - Checking Receive
"""
from __future__ import annotations

import io
from datetime import date, datetime
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

import apps.mk.backend.db as db
from apps.mk.backend.config import SERVER_HOST, SERVER_PORT, APP_NAME, APP_VERSION

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "frontend"
PUBLIC_DIR.mkdir(exist_ok=True)


@app.get("/api/health")
def api_health():
    try:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "online",
        "app": APP_NAME,
        "report_id": "127",
        "report_name": "Detail Report (127) - Checking Receive",
        "database_connected": db_ok,
        "server_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


@app.get("/api/data")
def api_data(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: str = Query("")
):
    today_str = date.today().strftime("%Y-%m-%d")
    start = from_date.strip() if from_date else today_str
    end = to_date.strip() if to_date else today_str

    try:
        # Strictly Checking Receive (Report 127)
        records = db.query_report_data(start, end, "Checking Receive", search)
        dept_summary = db.build_department_summary(records)

        # Unique dropdown options
        all_checkers = sorted({r.get("EMPLOYEE_NAME") for r in records if r.get("EMPLOYEE_NAME")})
        all_designs = sorted({r.get("ITEM_NAME") for r in records if r.get("ITEM_NAME")})

        return {
            "success": True,
            "report_id": "127",
            "process": "Checking Receive",
            "from_date": start,
            "to_date": end,
            "overall_total": dept_summary["overall_total"],
            "overall_fresh": dept_summary["overall_fresh"],
            "overall_alt": dept_summary["overall_alt"],
            "overall_return": dept_summary["overall_return"],
            "total_records": len(records),
            "department_summary": dept_summary["departments"],
            "category_summary": dept_summary["category_summary"],
            "alter_summary": dept_summary.get("alter_summary", {}),
            "id_wise_ranking": dept_summary.get("id_wise_ranking", []),
            "id_ranking_summary": dept_summary.get("id_ranking_summary", {}),
            "records": records,
            "filter_options": {
                "checkers": all_checkers,
                "designs": all_designs
            }
        }
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(exc)}
        )


@app.get("/api/export")
def api_export(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: str = Query("")
):
    today_str = date.today().strftime("%Y-%m-%d")
    start = from_date.strip() if from_date else today_str
    end = to_date.strip() if to_date else today_str

    try:
        records = db.query_report_data(start, end, "Checking Receive", search)
        excel_buf = db.generate_excel_report(start, end, records)

        # Match exact user naming convention: CHEKING REPORT {date}.xlsx
        date_label = start if start == end else f"{start}_to_{end}"
        filename = f"CHEKING REPORT {date_label}.xlsx"

        return StreamingResponse(
            excel_buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/download/apk")
def download_apk():
    apk_path = BASE_DIR / "OSLC_CHEKING.apk"
    if apk_path.exists():
        return FileResponse(
            path=str(apk_path),
            filename="OSLC_CHEKING.apk",
            media_type="application/vnd.android.package-archive"
        )
    raise HTTPException(status_code=404, detail="APK not found")


@app.get("/style.css")
def serve_root_css():
    return FileResponse(PUBLIC_DIR / "style.css", media_type="text/css")


@app.get("/app.js")
def serve_root_js():
    return FileResponse(PUBLIC_DIR / "app.js", media_type="application/javascript")


app.mount("/static", StaticFiles(directory=str(PUBLIC_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
def serve_index():
    index_file = PUBLIC_DIR / "index.html"
    if index_file.exists():
        return index_file.read_text(encoding="utf-8")
    return "<h1>OSLC CHEKING</h1><p>Frontend loading...</p>"


if __name__ == "__main__":
    import os
    import uvicorn
    listen_port = int(os.environ.get("PORT", SERVER_PORT))
    print(f"Starting {APP_NAME} on http://localhost:{listen_port}")
    uvicorn.run(app, host=SERVER_HOST, port=listen_port, log_level="info")
