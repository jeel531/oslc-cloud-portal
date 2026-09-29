# -*- coding: utf-8 -*-
"""
OSLC KARIGAR GATE PASS SYSTEM - FastAPI Web & API Server
"""
import io
import time
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query, Body, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse

from apps.gatepass.backend.config import (
    APP_TITLE,
    APP_SUBTITLE,
    COMPANY_NAME,
    FULL_COMPANY_NAME,
    SERVER_HOST,
    SERVER_PORT,
    LOCAL_IP,
    STATIC_DIR,
)
from apps.gatepass.backend.db import (
    test_db_connection,
    search_karigars,
    search_workers_with_photos,
    fetch_worker_full_profile_by_id,
    fetch_karigar_details,
)
from apps.gatepass.backend.gatepass_service import (
    save_issued_gatepass,
    reprint_gatepass,
    delete_gatepass_record,
    get_gatepass_history,
    get_next_int_no,
    generate_gatepass_excel,
    export_gatepass_register_excel,
)

app = FastAPI(
    title=APP_TITLE,
    description=APP_SUBTITLE,
    version="1.0.0",
)

# Enable CORS for local cross-origin development if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Warm up connection on server startup."""
    print("Testing DigiBizz Live Database Connection...")
    try:
        search_workers_with_photos("M101", limit=1)
        print("DigiBizz Live Database ready!")
    except Exception as exc:
        print(f"Startup warning: {exc}")
        print(f"Startup cache warning: {exc}")


@app.get("/api/health")
def api_health():
    """Returns system status and live database health."""
    db_status = test_db_connection()
    return {
        "app": APP_TITLE,
        "subtitle": APP_SUBTITLE,
        "company": COMPANY_NAME,
        "created_by": "JEEL VAGHANI",
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "db": db_status,
    }


@app.get("/api/network_info")
def api_network_info():
    """
    Returns local network IP and URL for multi-PC office access.
    Satisfies: 'A SOFTWER HU BIJA PC MA PAN CHALAVI SAKVO JOYE MARU PC OFF HOY TOY'
    """
    return {
        "local_ip": LOCAL_IP,
        "port": SERVER_PORT,
        "local_url": f"http://localhost:{SERVER_PORT}",
        "network_url": f"http://{LOCAL_IP}:{SERVER_PORT}",
        "instructions": f"Open http://{LOCAL_IP}:{SERVER_PORT} in Chrome/Edge on any PC or mobile on this Wi-Fi/LAN.",
        "created_by": "JEEL VAGHANI",
    }


@app.get("/api/search_workers")
def api_search_workers(q: str = Query("", min_length=0)):
    """
    Returns ALL matching workers with photos, names, floors, and departments.
    Supports searching by number (84, 101, 287), code (M84, P571), or name.
    """
    results = search_workers_with_photos(q, limit=25)
    return {
        "query": q,
        "count": len(results),
        "results": results,
        "created_by": "JEEL VAGHANI",
    }


@app.get("/api/worker/{worker_id}")
def api_worker_by_id(worker_id: int):
    """
    Fetches the EXACT worker chosen by the user by unique ID.
    Loads their full photo and their specific 141 Pending Mall report.
    """
    res = fetch_worker_full_profile_by_id(worker_id)
    if not res:
        raise HTTPException(status_code=404, detail="Worker not found")
    return res


@app.get("/api/search")
def api_search(q: str = Query("", min_length=0)):
    """Legacy Karigar auto-complete search."""
    results = search_karigars(q, limit=15)
    return {
        "query": q,
        "count": len(results),
        "results": results,
        "created_by": "JEEL VAGHANI",
    }



@app.get("/api/karigar/{code}")
def api_karigar(code: str):
    """
    Fetches full Karigar profile, Photo (base64), 
    and live 141 Pending Mall (STI & Alter Issue).
    """
    res = fetch_karigar_details(code)
    if not res:
        raise HTTPException(status_code=404, detail=f"Karigar '{code}' not found in DigiBizz Master")
    return res


@app.get("/api/next_int_no")
def api_next_int_no(date: Optional[str] = Query(None)):
    """Returns next auto-incrementing Int No for the selected date."""
    target_date = date or datetime.now().strftime("%d/%m/%Y")
    next_no = get_next_int_no(target_date)
    return {"date": target_date, "next_int_no": next_no}


@app.post("/api/issue")
def api_issue_gatepass(payload: Dict[str, Any] = Body(...)):
    """Saves an issued gate pass into persistent records."""
    if not payload.get("code"):
        raise HTTPException(status_code=400, detail="Karigar code is required")
    record = save_issued_gatepass(payload)
    return {"success": True, "record": record}


@app.post("/api/reprint")
@app.post("/api/reprint/{pass_id}")
def api_reprint_gatepass(
    pass_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = Body(None)
):
    """
    Logs a new reprint entry while strictly keeping the original Serial/Internal Number.
    Supports either path parameter or JSON body with pass_id, int_no, code.
    Satisfies: 'REPRINT APU TE MA NEW ENTRY PADVI JOYE BUT SERYAL NUBAR CHENG NO THAVO PADE'
    """
    try:
        pid = pass_id or ""
        int_no = None
        code = None
        if payload:
            pid = payload.get("pass_id") or pid
            int_no = payload.get("int_no")
            code = payload.get("code")

        if not pid and not int_no and not code:
            raise HTTPException(status_code=400, detail="Missing pass identifier")

        updated_record = reprint_gatepass(pass_id=pid, int_no=int_no, code=code)
        return {
            "success": True,
            "message": f"Reprint recorded for Gate Pass #{updated_record.get('int_no')}",
            "record": updated_record,
        }
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.delete("/api/gatepass/{pass_id}")
@app.post("/api/delete/{pass_id}")
def api_delete_gatepass(pass_id: str):
    """
    Deletes a gate pass record from disk by pass_id, int_no, or code.
    Satisfies: 'J MASHIN NUMBAR NI 1 VAR PRINT API TE DELET KARVA NO PAN OPSEN ADD KAR'
    """
    try:
        success = delete_gatepass_record(pass_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Gate pass '{pass_id}' not found")
        return {
            "success": True,
            "message": f"Gate pass '{pass_id}' deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/history")
def api_history(
    date: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    Returns issued gate passes with support for date range and search filtering.
    Used for the dedicated reports & history tab.
    """
    records = get_gatepass_history(
        date_str=date,
        from_date=from_date,
        to_date=to_date,
        search_query=search,
    )
    return {
        "date": date or "ALL",
        "from_date": from_date,
        "to_date": to_date,
        "search": search,
        "count": len(records),
        "records": records,
    }


@app.get("/api/export_register")
def api_export_register(
    date: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    Generates and downloads the comprehensive Gate Pass Register Excel file.
    Satisfies: 'TENO REPOT MANE ALG PAGE MA J JOYE CE JENI HU GAME TE DAY SHARCH KARI SAKU KE EXCEL NI PRINT NIKALI SAKU'
    """
    records = get_gatepass_history(
        date_str=date,
        from_date=from_date,
        to_date=to_date,
        search_query=search,
    )
    filter_label = date or (f"{from_date}_to_{to_date}" if from_date else "ALL_DATES")
    excel_buf = export_gatepass_register_excel(records, title_suffix=f"({filter_label})")
    filename = f"OSLC_GATEPASS_REGISTER_{filter_label.replace('/', '-')}.xlsx"

    return StreamingResponse(
        excel_buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/api/excel")
def api_export_excel(payload: Dict[str, Any] = Body(...)):
    """Generates and downloads the official Gate Pass Excel file."""
    code = payload.get("code", "KARIGAR")
    date_str = payload.get("date", datetime.now().strftime("%d-%m-%Y")).replace("/", "-")
    excel_buf = generate_gatepass_excel(payload)
    filename = f"OSLC_GATEPASS_{code}_{date_str}.xlsx"

    return StreamingResponse(
        excel_buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# Mount static assets
if STATIC_DIR.exists():
    if (STATIC_DIR / "css").exists():
        app.mount("/css", StaticFiles(directory=str(STATIC_DIR / "css")), name="gatepass_css")
    if (STATIC_DIR / "js").exists():
        app.mount("/js", StaticFiles(directory=str(STATIC_DIR / "js")), name="gatepass_js")
    if (STATIC_DIR / "img").exists():
        app.mount("/img", StaticFiles(directory=str(STATIC_DIR / "img")), name="gatepass_img")
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="gatepass_static")

@app.get("/")
def serve_index():
    """Serves the main application page."""
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        return Response("index.html not found", media_type="text/plain")
    return FileResponse(str(index_file))


if __name__ == "__main__":
    import uvicorn
    import socket

    def is_port_busy(port: int) -> bool:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            return s.connect_ex((SERVER_HOST, port)) == 0

    target_port = SERVER_PORT
    if is_port_busy(target_port):
        for p in range(target_port + 1, target_port + 20):
            if not is_port_busy(p):
                target_port = p
                break

    print(f"Starting {APP_TITLE} on http://{SERVER_HOST}:{target_port}")
    uvicorn.run("server:app", host=SERVER_HOST, port=target_port, reload=False)

