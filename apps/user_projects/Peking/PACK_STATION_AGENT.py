import ctypes,io,json,os,re,subprocess,threading,urllib.parse,urllib.request,webbrowser
from ctypes import wintypes
from datetime import datetime
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path

import pymupdf as fitz
from PIL import Image
try:
    from PIL import ImageWin
except Exception:
    ImageWin = None


ROOT=Path(__file__).resolve().parent
CFG=ROOT/"pack_station_config.json"
OUT=ROOT/"LOCAL_PRINTED_PDF";OUT.mkdir(exist_ok=True)
DEFAULT={"mrp_printer":"TSC TE244","shipping_printer":"TSC DA310","retail_printer":"TSC TE244","mrp_width_mm":75.0,"mrp_height_mm":50.0,"shipping_width_mm":100.0,"shipping_height_mm":150.0}
AGENT_VERSION="V01.01.3"
PRINT_LOCK=threading.Lock()

def default_printer():
    try:
        import win32print
        dp = win32print.GetDefaultPrinter()
        if dp: return dp
    except Exception:
        pass
    p_list = printers()
    tsc = [p for p in p_list if "TSC" in p.upper()]
    if tsc: return tsc[0]
    return p_list[0] if p_list else ""

def config():
    if not CFG.exists(): CFG.write_text(json.dumps(DEFAULT,indent=2),encoding="utf-8")
    try: c = {**DEFAULT,**json.loads(CFG.read_text(encoding="utf-8"))}
    except: c = dict(DEFAULT)
    all_p = printers()
    dp = default_printer()
    if not c.get("mrp_printer") or (all_p and c["mrp_printer"] not in all_p):
        match = next((p for p in all_p if "244" in p.upper() or ("TE" in p.upper() and "TSC" in p.upper())), None) if all_p else None
        c["mrp_printer"] = match or dp or "TSC TE244"
    if not c.get("retail_printer"):
        c["retail_printer"] = c.get("mrp_printer")
    if not c.get("shipping_printer") or (all_p and c["shipping_printer"] not in all_p):
        match = next((p for p in all_p if "310" in p.upper() or ("DA" in p.upper() and "TSC" in p.upper())), None) if all_p else None
        c["shipping_printer"] = match or dp or "TSC DA310"
    return c

def save_config(data):
    c=config()
    for k in ("mrp_printer","shipping_printer","retail_printer"):
        val = str(data.get(k) or "").strip()
        if val and val.upper() not in ("SELECT PRINTER", "NONE", "NULL", "UNDEFINED", "CHOOSE PRINTER", "-- SELECT --"):
            c[k] = val
    if "label_size" in data:
        lsz = str(data["label_size"]).lower().replace("mm", "")
        parts = lsz.split("x")
        if len(parts) == 2:
            try:
                c["mrp_width_mm"] = float(parts[0])
                c["mrp_height_mm"] = float(parts[1])
            except Exception: pass
    for k in ("mrp_width_mm","mrp_height_mm","shipping_width_mm","shipping_height_mm"):
        try:
            val = float(data.get(k, c.get(k, DEFAULT[k])))
            if val >= 10:
                c[k] = val
        except: pass
    CFG.write_text(json.dumps(c,indent=2),encoding="utf-8")
    try:
        desk_cfg = Path(os.path.expanduser("~")) / "OneDrive" / "Desktop" / "pack_station_config.json"
        if not desk_cfg.exists(): desk_cfg = Path(os.path.expanduser("~")) / "Desktop" / "pack_station_config.json"
        if desk_cfg.parent.exists(): desk_cfg.write_text(json.dumps(c,indent=2),encoding="utf-8")
    except Exception:
        pass
    return c

_PRINTERS_CACHE = ([], 0)
def printers():
    global _PRINTERS_CACHE
    import time
    now = time.time()
    if _PRINTERS_CACHE[0] and (now - _PRINTERS_CACHE[1] < 10):
        return _PRINTERS_CACHE[0]
    try:
        import win32print
        res = sorted({p[2] for p in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)})
        if res:
            _PRINTERS_CACHE = (res, now)
            return res
    except Exception:
        pass
    flags=getattr(subprocess,"CREATE_NO_WINDOW",0)
    for cmd in (
        ["powershell","-NoProfile","-Command","Get-CimInstance Win32_Printer | ForEach-Object {$_.Name}"],
        ["powershell","-NoProfile","-Command","Get-Printer | ForEach-Object {$_.Name}"]
    ):
        try:
            out=subprocess.check_output(cmd,text=True,encoding="utf-8",errors="ignore",timeout=5,creationflags=flags)
            names=sorted({x.strip() for x in out.splitlines() if x.strip()})
            if names:return names
        except Exception:pass
    return []

def safe(v):return re.sub(r"[^A-Za-z0-9._-]+","_",str(v or "LABEL"))[:80]
def pdf_printer(name):return "MICROSOFT PRINT TO PDF" in str(name or "").upper()
def save_pdf(img,path,wmm,hmm):
    doc=fitz.open();page=doc.new_page(width=wmm*72/25.4,height=hmm*72/25.4);b=io.BytesIO();img.convert("RGB").save(b,"PNG",dpi=(300,300));page.insert_image(page.rect,stream=b.getvalue(),keep_proportion=True);doc.save(path);doc.close()

def get_printer_dimensions_mm(name):
    if not name: return None, None
    try:
        import win32ui
        dc = win32ui.CreateDC()
        dc.CreatePrinterDC(name)
        pw = dc.GetDeviceCaps(8)
        ph = dc.GetDeviceCaps(10)
        dx = dc.GetDeviceCaps(88)
        dy = dc.GetDeviceCaps(90)
        dc.DeleteDC()
        if pw > 0 and ph > 0 and dx > 0 and dy > 0:
            w = round(pw * 25.4 / dx, 1)
            h = round(ph * 25.4 / dy, 1)
            if 10.0 <= w <= 500.0 and 10.0 <= h <= 500.0:
                return w, h
    except Exception:
        pass
    try:
        import win32print
        h = win32print.OpenPrinter(name)
        try:
            info = win32print.GetPrinter(h, 2)
            dm = info.get("pDevMode")
            if dm and getattr(dm, "PaperWidth", 0) > 0 and getattr(dm, "PaperLength", 0) > 0:
                w = round(dm.PaperWidth / 10.0, 1)
                h = round(dm.PaperLength / 10.0, 1)
                if 10.0 <= w <= 500.0 and 10.0 <= h <= 500.0:
                    return w, h
        finally:
            win32print.ClosePrinter(h)
    except Exception:
        pass
    return None, None

def get_printer_dpi(printer):
    u = str(printer or "").upper()
    if any(k in u for k in ("310", "320", "344", "300", "342", "345", "343", "DA3", "TE3", "TA3", "TX3", "MB3", "MH3", "MX3", "TDP-3", "TTP-3", "300DPI", "300 DPI", "300_DPI")):
        return 300
    return 203

def image_to_tspl_bytes(img, wmm, hmm, dpi=None, printer=""):
    if dpi is None:
        dpi = get_printer_dpi(printer)
    w_dots = int(round(wmm * dpi / 25.4))
    h_dots = int(round(hmm * dpi / 25.4))
    w_bytes = (w_dots + 7) // 8
    w_dots = w_bytes * 8
    res = img.convert("L").resize((w_dots, h_dots), Image.Resampling.BICUBIC)
    # TSPL hardware protocol: 1 = unheated white paper (0xFF), 0 = heated black dot (barcode/text)
    bw = res.point(lambda p: 0 if p < 160 else 1, mode="1")
    raw = bw.tobytes()
    # Polarity guard: If 0 bits (black dots) exceed 50% of the entire label, something was inverted, so invert!
    zeros = sum(bin(b ^ 0xFF).count('1') for b in raw)
    if zeros > len(raw) * 4: # more than 50% black dots means inverted!
        raw = bytes(b ^ 0xFF for b in raw)
    header = f"SIZE {wmm:.1f} mm, {hmm:.1f} mm\r\nGAP 3 mm, 0 mm\r\nDIRECTION 1\r\nCLS\r\nBITMAP 0,0,{w_bytes},{h_dots},0,".encode("iso-8859-1")
    footer = b"\r\nPRINT 1,1\r\n"
    return header + raw + footer

def print_raw_bytes(printer, data, job="OSLC_LABEL"):
    try:
        import win32print
        h = win32print.OpenPrinter(printer)
        try:
            win32print.StartDocPrinter(h, 1, (safe(job), None, "RAW"))
            win32print.StartPagePrinter(h)
            win32print.WritePrinter(h, data)
            win32print.EndPagePrinter(h)
            win32print.EndDocPrinter(h)
            return True
        finally:
            win32print.ClosePrinter(h)
    except Exception:
        pass
    try:
        winspool = ctypes.windll.winspool_drv
        class DOC_INFO_1(ctypes.Structure):
            _fields_ = [("pDocName", wintypes.LPCWSTR), ("pOutputFile", wintypes.LPCWSTR), ("pDatatype", wintypes.LPCWSTR)]
        hPrinter = wintypes.HANDLE()
        if winspool.OpenPrinterW(printer, ctypes.byref(hPrinter), None):
            try:
                docInfo = DOC_INFO_1(str(job), None, "RAW")
                if winspool.StartDocPrinterW(hPrinter, 1, ctypes.byref(docInfo)) > 0:
                    winspool.StartPagePrinter(hPrinter)
                    written = wintypes.DWORD()
                    winspool.WritePrinter(hPrinter, data, len(data), ctypes.byref(written))
                    winspool.EndPagePrinter(hPrinter)
                    winspool.EndDocPrinter(hPrinter)
                    return True
            finally:
                winspool.ClosePrinter(hPrinter)
    except Exception:
        pass
    return False

def output_image(img,printer,job,wmm,hmm):
    all_p = printers()
    if not printer or printer not in all_p:
        printer = default_printer()
    if not printer: raise RuntimeError("Is station par printer select nahi hua. Default printer check karein.")
    if pdf_printer(printer):
        path=OUT/f"{datetime.now():%Y%m%d_%H%M%S_%f}_{safe(job)}.pdf";save_pdf(img,path,wmm,hmm);return path.name

    # 1. PRIMARY: Universal Windows GDI Printing with 100% Pure White Background
    # Works reliably across ALL PCs and printer models without any firmware polarity mismatch!
    try:
        class DOCINFOW(ctypes.Structure):
            _fields_=[("cbSize",ctypes.c_int),("lpszDocName",wintypes.LPCWSTR),("lpszOutput",wintypes.LPCWSTR),("lpszDatatype",wintypes.LPCWSTR),("fwType",wintypes.DWORD)]
        gdi=ctypes.windll.gdi32
        gdi.CreateDCW.argtypes=[wintypes.LPCWSTR,wintypes.LPCWSTR,wintypes.LPCWSTR,ctypes.c_void_p]
        gdi.CreateDCW.restype=wintypes.HDC
        gdi.GetDeviceCaps.argtypes=[wintypes.HDC,ctypes.c_int]
        gdi.StartDocW.argtypes=[wintypes.HDC,ctypes.POINTER(DOCINFOW)]
        gdi.StartPage.argtypes=[wintypes.HDC];gdi.EndPage.argtypes=[wintypes.HDC]
        gdi.EndDoc.argtypes=[wintypes.HDC];gdi.AbortDoc.argtypes=[wintypes.HDC]
        gdi.DeleteDC.argtypes=[wintypes.HDC]
        gdi.SetStretchBltMode.argtypes=[wintypes.HDC,ctypes.c_int]
        gdi.PatBlt.argtypes=[wintypes.HDC,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_int,wintypes.DWORD]
        hdc=gdi.CreateDCW("WINSPOOL",printer,None,None)
        if hdc:
            pw,ph=gdi.GetDeviceCaps(hdc,8),gdi.GetDeviceCaps(hdc,10);dx,dy=gdi.GetDeviceCaps(hdc,88),gdi.GetDeviceCaps(hdc,90)
            tw,th=int(round(wmm*dx/25.4)),int(round(hmm*dy/25.4))
            if pw>0 and tw>pw: tw=pw
            if ph>0 and th>ph: th=ph
            x,y=0,0
            doc=DOCINFOW(ctypes.sizeof(DOCINFOW),str(job),None,None,0)
            started=False
            try:
                if gdi.StartDocW(hdc,ctypes.byref(doc))>0:
                    started=True
                    if gdi.StartPage(hdc)>0:
                        try:
                            gdi.SetStretchBltMode(hdc, 3)
                            gdi.PatBlt(hdc, 0, 0, tw, th, 0x00FF0062) # WHITENESS
                        except Exception:
                            pass
                        if ImageWin:
                            ImageWin.Dib(img.convert("RGB")).draw(hdc,(x,y,x+tw,y+th))
                        gdi.EndPage(hdc)
                        gdi.EndDoc(hdc)
                        started=False
                        return printer
            except:
                if started: gdi.AbortDoc(hdc)
            finally:
                gdi.DeleteDC(hdc)
    except Exception:
        pass

    # 2. Hardware Direct TSPL Fallback (only if GDI was not supported)
    u_p = str(printer).upper()
    if any(k in u_p for k in ("TSC", "TE", "TA", "DA", "BARCODE", "LABEL", "THERMAL", "4BARCODE", "XPRINTER", "GPRINTER", "GENERIC", "TEXT")):
        try:
            tspl = image_to_tspl_bytes(img, wmm, hmm, printer=printer)
            if print_raw_bytes(printer, tspl, safe(job)):
                return printer
        except Exception:
            pass

    return printer

def request(url,data=None):
    body=urllib.parse.urlencode(data).encode() if data is not None else None
    h={"X-Agent-Version":AGENT_VERSION}
    if body: h["Content-Type"]="application/x-www-form-urlencoded"
    req=urllib.request.Request(url,data=body,headers=h)
    with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(req,timeout=60) as r:return r.read(),dict(r.headers)

def do_job(data):
    server=str(data["server"]).rstrip("/");oid=int(data["oid"]);station=str(data["station"]);cfg=config();outputs=[]
    all_p=printers()
    dp=default_printer()
    mrp_p=cfg.get("mrp_printer")
    ship_p=cfg.get("shipping_printer")
    if not mrp_p or mrp_p not in all_p:
        mrp_p = next((p for p in all_p if "244" in p.upper()), None) or next((p for p in all_p if "TSC" in p.upper() and "310" not in p.upper()), dp)
    if not ship_p or ship_p not in all_p:
        ship_p = next((p for p in all_p if "310" in p.upper()), None) or next((p for p in all_p if "DA" in p.upper() or "SHIP" in p.upper()), dp)
    
    # Dynamic label size selection
    mrp_w=float(cfg.get("mrp_width_mm") or 75.0)
    mrp_h=float(cfg.get("mrp_height_mm") or 50.0)
    label_size = str(data.get("label_size") or "").strip()
    if label_size:
        parts = label_size.lower().replace("mm", "").split("x")
        if len(parts) == 2:
            try:
                mrp_w = float(parts[0])
                mrp_h = float(parts[1])
            except Exception: pass
    if data.get("mrp_width_mm") and float(data["mrp_width_mm"]) >= 10:
        mrp_w = float(data["mrp_width_mm"])
    if data.get("mrp_height_mm") and float(data["mrp_height_mm"]) >= 10:
        mrp_h = float(data["mrp_height_mm"])

    ship_w=float(cfg.get("shipping_width_mm") or 100.0)
    ship_h=float(cfg.get("shipping_height_mm") or 150.0)
    scan_mode=str(data.get("scan_mode") or "").upper()
    print_mrp_arg = data.get("print_mrp")
    print_ship_arg = data.get("print_shipping")
    is_mrp = (scan_mode != "SHIPPING_ONLY") if print_mrp_arg is None else bool(print_mrp_arg)
    is_shipping = (scan_mode != "AWB_MRP") if print_ship_arg is None else bool(print_ship_arg)
    with PRINT_LOCK:
        try:
            for kind,required,printer,w,h in (
                ("MRP",is_mrp,mrp_p,mrp_w,mrp_h),
                ("SHIPPING",is_shipping,ship_p,ship_w,ship_h)
            ):
                if not required:continue
                try:
                    qparams = {"station": station, "width_mm": w, "height_mm": h}
                    if kind == "MRP" and label_size:
                        qparams["label_size"] = label_size
                    url=f"{server}/api/local-print-asset/{oid}/{kind}?"+urllib.parse.urlencode(qparams)
                    raw,_=request(url);img=Image.open(io.BytesIO(raw));outputs.append(output_image(img,printer,f"{kind}_{data.get('order_id',oid)}",w,h))
                except Exception as ex_label:
                    print(f"[{kind}] print warning for order {oid}: {ex_label}")
            raw,_=request(f"{server}/api/confirm-local-print/{oid}",{
                "station":station,
                "files":"|".join(outputs),
                "printed_mrp":"YES" if is_mrp else "NO",
                "printed_shipping":"YES" if is_shipping else "NO",
                "scan_token":data.get("scan_token","")
            })
            result=json.loads(raw.decode());result["local_outputs"]=outputs;return result
        except Exception as e:
            try:request(f"{server}/api/cancel-local-print/{oid}",{"station":station,"message":str(e),"scan_token":data.get("scan_token","")})
            except:pass
            raise

def do_reprint(data):
    server=str(data["server"]).rstrip("/");oid=int(data["oid"]);cfg=config();outputs=[]
    all_p=printers()
    dp=default_printer()
    mrp_p=cfg.get("mrp_printer")
    ship_p=cfg.get("shipping_printer")
    if not mrp_p or mrp_p not in all_p:
        mrp_p = next((p for p in all_p if "244" in p.upper()), None) or next((p for p in all_p if "TSC" in p.upper() and "310" not in p.upper()), dp)
    if not ship_p or ship_p not in all_p:
        ship_p = next((p for p in all_p if "310" in p.upper()), None) or next((p for p in all_p if "DA" in p.upper() or "SHIP" in p.upper()), dp)
    mrp_w=float(cfg.get("mrp_width_mm") or 75.0)
    mrp_h=float(cfg.get("mrp_height_mm") or 50.0)
    label_size = str(data.get("label_size") or "").strip()
    if label_size:
        parts = label_size.lower().replace("mm", "").split("x")
        if len(parts) == 2:
            try:
                mrp_w = float(parts[0])
                mrp_h = float(parts[1])
            except Exception: pass
    if data.get("mrp_width_mm") and float(data["mrp_width_mm"]) >= 10:
        mrp_w = float(data["mrp_width_mm"])
    if data.get("mrp_height_mm") and float(data["mrp_height_mm"]) >= 10:
        mrp_h = float(data["mrp_height_mm"])

    ship_w=float(cfg.get("shipping_width_mm") or 100.0)
    ship_h=float(cfg.get("shipping_height_mm") or 150.0)
    raw,_=request(f"{server}/api/local-reprint-manifest/{oid}");manifest=json.loads(raw.decode())
    req_mrp = True  # MRP barcode to nikalvo j joye!
    req_ship = True  # Shipping slip to nikalvi j joye!
    with PRINT_LOCK:
        for kind,required,printer,w,h in (
            ("MRP",req_mrp,mrp_p,mrp_w,mrp_h),
            ("SHIPPING",req_ship,ship_p,ship_w,ship_h)
        ):
            if not required:continue
            try:
                qparams = {"width_mm": w, "height_mm": h}
                if kind == "MRP" and label_size:
                    qparams["label_size"] = label_size
                raw,_=request(f"{server}/api/local-reprint-asset/{oid}/{kind}?"+urllib.parse.urlencode(qparams))
                img=Image.open(io.BytesIO(raw));outputs.append(output_image(img,printer,f"REPRINT_{kind}_{manifest.get('order_id',oid)}",w,h))
            except Exception as ex_rep:
                print(f"[REPRINT {kind}] warning for {oid}: {ex_rep}")
    return {"ok":True,"local_outputs":outputs}

def save_bulk_files(data):
    server=str(data["server"]).rstrip("/");saved=[]
    for name in data.get("files",[]):
        filename=Path(str(name)).name;raw,_=request(f"{server}/api/output/"+urllib.parse.quote(filename));target=OUT/filename;target.write_bytes(raw);saved.append(filename)
    return {"ok":True,"local_outputs":saved,"output_folder":str(OUT)}

class Handler(BaseHTTPRequestHandler):
    def log_message(self,fmt,*args):pass
    def cors(self):
        self.send_header("Access-Control-Allow-Origin","*")
        self.send_header("Access-Control-Allow-Methods","GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers","*")
        self.send_header("Access-Control-Allow-Private-Network","true")
    def reply(self,status,obj):
        raw=json.dumps(obj).encode()
        self.send_response(status)
        self.cors()
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(raw)))
        self.close_connection = True
        self.end_headers()
        try:
            self.wfile.write(raw)
        except Exception:
            pass
    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()
    def do_GET(self):
        if self.path.startswith("/health"):
            dp = default_printer()
            self.reply(200,{"ok":True,"app":"OSLC_NATIVE_CS_AGENT","version":"V01.01.8","printers":printers(),"default_printer":dp,"config":config(),"output_folder":str(OUT)})
            return
        self.reply(404,{"detail":"Not found"})
    def do_POST(self):
        try:
            n=int(self.headers.get("Content-Length","0"));data=json.loads(self.rfile.read(n) or b"{}")
            if self.path.startswith("/settings"):self.reply(200,{"ok":True,"config":save_config(data)});return
            if self.path.startswith("/reprint"):self.reply(200,do_reprint(data));return
            if self.path.startswith("/save-files"):self.reply(200,save_bulk_files(data));return
            if self.path.startswith("/print"):self.reply(200,do_job(data));return
            self.reply(404,{"detail":"Not found"})
        except Exception as e:self.reply(400,{"detail":str(e)})

if __name__=="__main__":
    print("\nOSLC LOCAL PRINT AGENT IS READY")
    print("Default printer:", default_printer())
    print("Local PDF folder:", OUT, "\n")
    ThreadingHTTPServer(("127.0.0.1",8790),Handler).serve_forever()
