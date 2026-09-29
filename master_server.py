# -*- coding: utf-8 -*-
"""
OSLC Master Cloud Portal - Unified FastAPI Server
Om Sai Latest Creation
Powers:
 1. Godaun In/Out Report (/godaun)
 2. Stock Warehouse Report (/stock)
 3. Karigar Alter Report (/alter)
 4. PO & Cutting Dashboard (/po)
 5. Karigar Gate Pass Control (/gatepass)
 6. MK Checking Report (/mk)
 7. Shelf Barcode Print Tool (/barcode)
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

# Import All 7 Sub-Applications
from apps.godaun.backend.godaun_service import app as godaun_app
from apps.stock.backend.server import app as stock_app
from apps.alter.backend.server import app as alter_app
from apps.po.backend.app import app as po_app
from apps.gatepass.backend.server import app as gatepass_app
from apps.mk.backend.server import app as mk_app
from apps.barcode.backend.server import app as barcode_app

master_app = FastAPI(
    title="OSLC Cloud Master Portal - Om Sai Latest Creation",
    version="3.0.0",
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

def make_handler(target_app):
    async def handler(request: Request):
        return await forward_to_app(target_app, request)
    return handler

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
        make_handler(alter_app),
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
        make_handler(po_app),
        methods=["GET", "POST", "DELETE"]
    )

# 5. Gatepass APIs
GATEPASS_API_ROUTES = [
    "/api/issue",
    "/api/search_workers",
    "/api/history",
    "/api/next_int_no",
    "/api/excel",
    "/api/reprint",
    "/api/export_register",
    "/api/delete",
    "/api/network_info"
]
for route in GATEPASS_API_ROUTES:
    master_app.add_api_route(
        route,
        make_handler(gatepass_app),
        methods=["GET", "POST", "DELETE"]
    )

@master_app.api_route("/api/worker/{path:path}", methods=["GET", "POST"])
async def proxy_gatepass_worker(request: Request, path: str):
    return await forward_to_app(gatepass_app, request)

# 6. Barcode APIs
BARCODE_API_ROUTES = [
    "/api/prefixes",
    "/api/racks",
    "/api/shelves",
    "/api/generate-range",
    "/api/load-sample-pdf",
    "/api/upload-pdf",
    "/api/generate-pdf",
    "/api/download-digibizz-a4"
]
for route in BARCODE_API_ROUTES:
    master_app.add_api_route(
        route,
        make_handler(barcode_app),
        methods=["GET", "POST"]
    )

# 7. MK Checking APIs
MK_API_ROUTES = [
    "/api/data",
    "/api/export",
    "/download/apk"
]
for route in MK_API_ROUTES:
    master_app.add_api_route(
        route,
        make_handler(mk_app),
        methods=["GET", "POST"]
    )

# Static asset mounts at root for legacy/relative asset requests
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
            "po": {"name": "PO & Cutting Dashboard", "path": "/po", "status": "active"},
            "gatepass": {"name": "Karigar Gate Pass System", "path": "/gatepass", "status": "active"},
            "mk": {"name": "MK Checking Report", "path": "/mk", "status": "active"},
            "barcode": {"name": "Godaun Barcode Print", "path": "/barcode", "status": "active"}
        }
    }

# ----------------- Mount Sub-Applications -----------------
master_app.mount("/godaun", godaun_app)
master_app.mount("/stock", stock_app)
master_app.mount("/alter", alter_app)
master_app.mount("/po", po_app)
master_app.mount("/gatepass", gatepass_app)
master_app.mount("/mk", mk_app)
master_app.mount("/barcode", barcode_app)

USER_PROJECTS_DIR = ROOT / "apps" / "user_projects"
SYNC_STATUS_FILE = ROOT / "portal_ui" / "sync_status.json"
import mimetypes

@master_app.get("/api/sync-status")
def get_sync_status():
    if SYNC_STATUS_FILE.exists():
        try:
            import json
            with open(SYNC_STATUS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "status": "active",
        "last_sync": "હમણાં જ (Live)",
        "message": "ઓટો-ક્લાઉડ સિન્ક સક્રિય છે"
    }

@master_app.get("/api/user-projects")
def get_user_projects():
    projects = []
    if USER_PROJECTS_DIR.exists():
        for item in sorted(USER_PROJECTS_DIR.iterdir()):
            if item.is_dir() and not item.name.startswith("."):
                index_exists = (item / "index.html").exists()
                mtime = os.path.getmtime(item)
                projects.append({
                    "id": item.name,
                    "title": item.name.replace("_", " ").replace("-", " ").title(),
                    "folder": item.name,
                    "url": f"/live/{item.name}/",
                    "has_index": index_exists,
                    "updated_at": time.strftime("%d-%b-%Y %I:%M %p", time.localtime(mtime))
                })
    return {"projects": projects, "count": len(projects)}

@master_app.get("/live/{proj_name}")
@master_app.get("/live/{proj_name}/")
@master_app.get("/live/{proj_name}/{subpath:path}")
async def serve_user_project(proj_name: str, subpath: str = ""):
    proj_dir = USER_PROJECTS_DIR / proj_name
    if not proj_dir.exists() or not proj_dir.is_dir():
        return HTMLResponse(
            f"<h3>પ્રોજેક્ટ '{proj_name}' મળ્યો નથી. કૃપા કરીને Desktop પરના ફોલ્ડરમાં ચેક કરો.</h3>", 
            status_code=404
        )
    
    if not subpath or subpath == "":
        subpath = "index.html"
    
    file_path = proj_dir / subpath
    try:
        resolved = file_path.resolve()
        if not str(resolved).startswith(str(proj_dir.resolve())):
            return HTMLResponse("<h3>Access Denied</h3>", status_code=403)
    except Exception:
        return HTMLResponse("<h3>Invalid Path</h3>", status_code=400)
    
    if resolved.is_dir():
        file_path = resolved / "index.html"
    else:
        file_path = resolved

    if not file_path.exists():
        return HTMLResponse(
            f"<h3>ફાઈલ '{subpath}' પ્રોજેક્ટ '{proj_name}' માં મળી નથી.</h3>", 
            status_code=404
        )
    
    mime_type, _ = mimetypes.guess_type(str(file_path))
    return FileResponse(file_path, media_type=mime_type or "application/octet-stream")

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
