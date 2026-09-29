# -*- coding: utf-8 -*-
"""
OSLC Master Cloud Portal - Unified FastAPI Server
Om Sai Latest Creation
Powers:
 1. Godaun In/Out Report (/godaun)
 2. Stock Warehouse Report (/stock)
 3. Karigar Alter Report (/alter)
 4. PO & Cutting Dashboard (/po)
"""
import sys
import os
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
import uvicorn

# Import Sub-Applications
from apps.godaun.backend.godaun_service import app as godaun_app
from apps.stock.backend.server import app as stock_app
from apps.alter.backend.server import app as alter_app
from apps.po.backend.app import app as po_app

master_app = FastAPI(
    title="OSLC Cloud Master Portal - Om Sai Latest Creation",
    version="2.0.0",
    docs_url=None,
    redoc_url=None
)

# Global CORS
master_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper: Pass ASGI scope directly without stripping route prefix
async def forward_to_app(target_app, request: Request):
    status_code = 200
    headers = []
    body_parts = []

    async def send(msg):
        nonlocal status_code, headers, body_parts
        if msg["type"] == "http.response.start":
            status_code = msg["status"]
            headers = msg.get("headers", [])
        elif msg["type"] == "http.response.body":
            body_parts.append(msg.get("body", b""))

    await target_app(request.scope, request.receive, send)
    resp_headers = {
        (k.decode() if isinstance(k, bytes) else k): (v.decode() if isinstance(v, bytes) else v)
        for k, v in headers
    }
    return Response(content=b"".join(body_parts), status_code=status_code, headers=resp_headers)

# ----------------- Root API Proxies -----------------
# 1. Godaun APIs
@master_app.api_route("/api/godaun/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_godaun_api(request: Request, path: str):
    return await forward_to_app(godaun_app, request)

# 2. Stock APIs
@master_app.api_route("/api/stock", methods=["GET", "POST"])
@master_app.api_route("/api/stock/{path:path}", methods=["GET", "POST"])
async def proxy_stock_api(request: Request, path: str = ""):
    return await forward_to_app(stock_app, request)

# 3. Alter APIs
ALTER_API_ROUTES = [
    "/api/karigar-summary",
    "/api/karigar-detail",
    "/api/export-excel",
    "/api/period-comparison",
    "/api/export-comparison-excel",
    "/api/alter-checking",
    "/api/export-alter-checking-excel"
]
for route in ALTER_API_ROUTES:
    master_app.add_api_route(
        route,
        lambda request, target=alter_app: forward_to_app(target, request),
        methods=["GET", "POST"]
    )

# 4. PO APIs
PO_API_ROUTES = [
    "/api/pos",
    "/api/po-items",
    "/api/summary",
    "/api/dates",
    "/api/compare",
    "/api/status",
    "/api/wms-orders",
    "/api/reconciliation-pos",
    "/api/po-cutting-report",
    "/api/upload-po-sheet",
    "/api/update-po-dispatch-date",
    "/api/dispatch-alerts",
    "/api/uploaded-batches",
    "/api/uploaded-batch",
    "/api/refresh-cache"
]
for route in PO_API_ROUTES:
    master_app.add_api_route(
        route,
        lambda request, target=po_app: forward_to_app(target, request),
        methods=["GET", "POST", "DELETE"]
    )

# Static asset mounts at root for sub-app assets
ALTER_FRONTEND = ROOT / "apps" / "alter" / "frontend"
PO_ASSETS = ROOT / "apps" / "po" / "frontend" / "assets"
if ALTER_FRONTEND.exists():
    master_app.mount("/static", StaticFiles(directory=str(ALTER_FRONTEND)), name="alter_static")
if PO_ASSETS.exists():
    master_app.mount("/assets", StaticFiles(directory=str(PO_ASSETS)), name="po_assets")

# Health & Overview Status Endpoint
@master_app.get("/api/hub-status")
def hub_status():
    return {
        "status": "online",
        "company": "OM SAI LATEST CREATION",
        "cloud_mode": "24x7 Active",
        "server_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "modules": {
            "godaun": {"name": "Godaun In/Out Report", "path": "/godaun", "status": "active"},
            "stock": {"name": "Stock Warehouse Report", "path": "/stock", "status": "active"},
            "alter": {"name": "Karigar Alter Report", "path": "/alter", "status": "active"},
            "po": {"name": "PO & Cutting Dashboard", "path": "/po", "status": "active"}
        }
    }

# ----------------- Mount Sub-Applications -----------------
master_app.mount("/godaun", godaun_app)
master_app.mount("/stock", stock_app)
master_app.mount("/alter", alter_app)
master_app.mount("/po", po_app)

# ----------------- Master Landing Portal UI -----------------
PORTAL_UI_DIR = ROOT / "portal_ui"
if PORTAL_UI_DIR.exists():
    master_app.mount("/portal_static", StaticFiles(directory=str(PORTAL_UI_DIR)), name="portal_static")

@master_app.get("/", response_class=HTMLResponse)
async def master_portal_home():
    index_file = PORTAL_UI_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse("<h1>OSLC Cloud Master Portal is Online</h1>")

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    print(f"Starting OSLC Master Cloud Portal on http://0.0.0.0:{port}")
    uvicorn.run("master_server:master_app", host="0.0.0.0", port=port, reload=False)
