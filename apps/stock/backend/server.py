# pyrefly: ignore-errors
# type: ignore
"""
OSLC Stock Report - FastAPI Web Server
Powers PC Dashboard and remote API requests.
"""
from __future__ import annotations

import os
from pathlib import Path
from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from apps.stock.backend.config import SERVER_HOST, SERVER_PORT, APP_NAME, APP_VERSION, CREATED_BY
from apps.stock.backend.db import get_stock_data, search_stock, generate_excel

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title=f"{APP_NAME} - By {CREATED_BY}",
    version=APP_VERSION,
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "status": "online",
        "app": APP_NAME,
        "version": APP_VERSION,
        "created_by": CREATED_BY,
        "db": "DigiBizz_PROD_Om_Sai_Trans_2026_27",
    }


@app.get("/api/stock")
def get_stock(refresh: bool = False):
    records, metrics = get_stock_data(force_refresh=refresh)
    return {
        "success": True,
        "metrics": metrics,
        "count": len(records),
        "rows": records,
    }


@app.get("/api/stock/search")
def api_search_stock(q: str = Query("", description="Search term")):
    return search_stock(q)


@app.get("/api/stock/export")
def export_stock_excel():
    excel_bytes = generate_excel()
    filename = f"OSLC_Stock_Report_{CREATED_BY.replace(' ', '_')}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Serve Static Frontend Files
if PUBLIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")


@app.exception_handler(404)
async def custom_404_handler(request, exc):
    index_file = PUBLIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return Response(content="Not Found", status_code=404)


if __name__ == "__main__":
    import uvicorn

    print(f"Starting {APP_NAME} by {CREATED_BY} on http://localhost:{SERVER_PORT}")
    uvicorn.run(app, host=SERVER_HOST, port=SERVER_PORT)

