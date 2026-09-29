# -*- coding: utf-8 -*-
"""
OSLC Godaun Shelf Barcode Print Software - FastAPI Backend
Serves modern web interface & barcode printing/export APIs
"""
import io
import os
import re
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, Query, File, UploadFile, Body
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from apps.barcode.backend.config import APP_NAME, APP_SUBTITLE, COMPANY_NAME, APP_VERSION, SERVER_HOST, SERVER_PORT, PUBLIC_DIR, BASE_DIR
import apps.barcode.backend.db as db
import apps.barcode.backend.pdf_engine as pdf_engine

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRangeRequest(BaseModel):
    prefix: str = "AAA"
    from_num: int = 1
    to_num: int = 10
    zero_pad: int = 0
    rack_code: str = ""
    step: int = 1


class GeneratePdfRequest(BaseModel):
    items: List[Dict[str, Any]]
    layout_type: str = "2x10"         # "2x10" (20/page - default), "2x5" (10/page), or "1x10"
    order_direction: str = "row"      # "row" or "col"
    show_border: bool = True
    show_rack: bool = True
    barcode_height: float = 34.0
    barcode_scale: float = 1.10
    font_size: float = 10.5


@app.get("/api/status")
def get_status():
    """Health check and DB status."""
    db_connected = False
    error_msg = ""
    try:
        conn = db.get_connection()
        conn.close()
        db_connected = True
    except Exception as e:
        error_msg = str(e)

    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "company": COMPANY_NAME,
        "db_connected": db_connected,
        "db_error": error_msg
    }


@app.get("/api/prefixes")
def get_prefixes():
    """Fetch distinct shelf prefixes with counts from DigiBizz."""
    try:
        data = db.get_shelf_prefixes()
        return {"success": True, "prefixes": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/racks")
def get_racks():
    """Fetch available racks from DigiBizz."""
    try:
        racks = db.get_racks_from_db()
        return {"success": True, "racks": racks}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/shelves")
def get_shelves(
    prefix: Optional[str] = Query(None),
    from_num: Optional[int] = Query(None),
    to_num: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(5000)
):
    """
    Fetch shelf barcodes from DigiBizz database.
    Sorted in exact natural linear order (1, 2, 3... AAA1, AAA2... AAA10, AAA11...).
    """
    try:
        items = db.get_shelves_from_db(
            prefix=prefix,
            from_num=from_num,
            to_num=to_num,
            search=search,
            limit=limit
        )
        return {
            "success": True,
            "count": len(items),
            "items": items
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/generate-range")
def api_generate_range(req: GenerateRangeRequest):
    """Generate linear barcode range programmatically without querying DB."""
    prefix = req.prefix.strip().upper()
    from_num = req.from_num
    to_num = req.to_num
    zero_pad = req.zero_pad
    rack = req.rack_code.strip()
    step = max(1, req.step)

    if from_num > to_num:
        from_num, to_num = to_num, from_num

    items = []
    for n in range(from_num, to_num + 1, step):
        num_str = str(n).zfill(zero_pad) if zero_pad > 0 else str(n)
        shelf_code = f"{prefix}{num_str}"
        items.append({
            "shelf": shelf_code,
            "rack": rack,
            "num": n
        })

    return {
        "success": True,
        "count": len(items),
        "items": items
    }


# In-memory storage for last uploaded DigiBizz PDF bytes
LAST_DIGIBIZZ_PDF = {"data": None, "filename": "vinay bhai fb godaun.pdf"}

# Initialize with local sample PDF if exists
sample_pdf_init = BASE_DIR / "vinay bhai fb godaun.pdf"
if sample_pdf_init.exists():
    try:
        with open(sample_pdf_init, "rb") as f:
            LAST_DIGIBIZZ_PDF["data"] = f.read()
    except Exception:
        pass


@app.get("/api/load-sample-pdf")
def api_load_sample_pdf():
    """Load the existing sample PDF in the folder (vinay bhai fb godaun.pdf) and extract all barcodes in sorted order."""
    pdf_path = BASE_DIR / "vinay bhai fb godaun.pdf"
    if not pdf_path.exists():
        return JSONResponse(status_code=404, content={"success": False, "error": "vinay bhai fb godaun.pdf not found"})

    try:
        with open(pdf_path, "rb") as f:
            data = f.read()
        LAST_DIGIBIZZ_PDF["data"] = data
        LAST_DIGIBIZZ_PDF["filename"] = "vinay bhai fb godaun.pdf"
        items = pdf_engine.parse_digibizz_pdf_with_thumbnails(data)
        return {
            "success": True,
            "filename": "vinay bhai fb godaun.pdf",
            "count": len(items),
            "items": items
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/upload-pdf")
async def api_upload_pdf(file: UploadFile = File(...)):
    """Upload any DigiBizz exported PDF, extract all barcodes, and sort them naturally into linear sequence."""
    try:
        content = await file.read()
        LAST_DIGIBIZZ_PDF["data"] = content
        LAST_DIGIBIZZ_PDF["filename"] = file.filename
        items = pdf_engine.parse_digibizz_pdf_with_thumbnails(content)
        return {
            "success": True,
            "filename": file.filename,
            "count": len(items),
            "items": items
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/generate-pdf")
def api_generate_pdf(req: GeneratePdfRequest):
    """Generate high-resolution A4 PDF with exactly 20 barcodes per page."""
    try:
        # Check if items are from a DigiBizz PDF
        has_pno = any("pno" in it for it in req.items)
        if has_pno and LAST_DIGIBIZZ_PDF["data"]:
            # Use PyMuPDF to place the exact original DigiBizz vector barcodes and labels!
            pdf_bytes = pdf_engine.assemble_digibizz_pdf_to_a4(
                file_source=LAST_DIGIBIZZ_PDF["data"],
                items_to_print=req.items,
                layout_type=req.layout_type,
                order_direction=req.order_direction,
                show_border=req.show_border
            )
        else:
            # Generate programmatic ReportLab vector barcodes
            pdf_bytes = pdf_engine.generate_a4_barcode_pdf(
                items=req.items,
                layout_type=req.layout_type,
                order_direction=req.order_direction,
                show_border=req.show_border,
                show_rack=req.show_rack,
                barcode_height=req.barcode_height,
                barcode_scale=req.barcode_scale,
                font_size=req.font_size
            )

        count = len(req.items)
        filename = f"OSLC_DigiBizz_Shelf_Barcodes_A4_{count}_labels.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{filename}"'}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/download-digibizz-a4")
def api_download_digibizz_a4(layout: str = "2x10", order: str = "row"):
    """One-click download of the assembled DigiBizz sample PDF into 20-per-page A4 format."""
    pdf_path = BASE_DIR / "vinay bhai fb godaun.pdf"
    if not pdf_path.exists():
        return JSONResponse(status_code=404, content={"success": False, "error": "vinay bhai fb godaun.pdf not found"})

    try:
        with open(pdf_path, "rb") as f:
            data = f.read()
        sorted_items = pdf_engine.parse_digibizz_pdf_with_thumbnails(data, dpi=72)
        pdf_bytes = pdf_engine.assemble_digibizz_pdf_to_a4(
            file_source=data,
            items_to_print=sorted_items,
            layout_type=layout,
            order_direction=order,
            show_border=True
        )
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": 'inline; filename="OSLC_DigiBizz_A4_20_Per_Page.pdf"'}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


# Mount static files
app.mount("/static", StaticFiles(directory=str(PUBLIC_DIR)), name="static")

@app.get("/styles.css")
def get_css():
    f = PUBLIC_DIR / "styles.css"
    if f.exists():
        return FileResponse(f, media_type="text/css")
    return HTMLResponse("", status_code=404)

@app.get("/app.js")
def get_js():
    f = PUBLIC_DIR / "app.js"
    if f.exists():
        return FileResponse(f, media_type="application/javascript")
    return HTMLResponse("", status_code=404)

@app.get("/JsBarcode.all.min.js")
def get_jsbarcode():
    f = PUBLIC_DIR / "JsBarcode.all.min.js"
    if f.exists():
        return FileResponse(f, media_type="application/javascript")
    return HTMLResponse("", status_code=404)

@app.get("/", response_class=HTMLResponse)
def index_page():
    f = PUBLIC_DIR / "index.html"
    if f.exists():
        return FileResponse(f)
    return HTMLResponse("<h1>OSLC Barcode Print</h1><p>UI loading...</p>")


if __name__ == "__main__":
    import uvicorn
    print(f"Starting {APP_NAME} on http://localhost:{SERVER_PORT} ...")
    uvicorn.run("server:app", host=SERVER_HOST, port=SERVER_PORT, reload=False)
