# -*- coding: utf-8 -*-
"""
OSLC Morning Report Manager - Backend Service
Om Sai Latest Creation | Jeel Vaghani
Provides APIs for Android APK & Web App to:
  - Check if today's morning report was sent or pending
  - View live metrics & table screenshot image
  - Change scheduled dispatch time (updates Windows Task Scheduler)
  - Manage recipient phone numbers
  - Trigger "Send Now" on demand
  - View past report history
"""
import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional

REPORT_DIR = Path(r"d:\MY PC-106\MY REPORT SHORTCUT")
STATUS_FILE = REPORT_DIR / "report_status.json"
SETTINGS_FILE = REPORT_DIR / "report_settings.json"
PHONE_FILE = REPORT_DIR / "phone_numbers.json"
HISTORY_FILE = REPORT_DIR / "report_history.json"
IMAGE_FILE = REPORT_DIR / "daily_report_ss.png"
SCRIPT_FILE = REPORT_DIR / "digi_daily_morning_report.py"
UPDATE_SCHEDULE_PS1 = REPORT_DIR / "update_schedule.ps1"

app = FastAPI(title="OSLC Morning Report API", version="1.0.0")


class ScheduleRequest(BaseModel):
    time: str  # Format: "07:00" or "07:30" or "07:00am"


class NumbersRequest(BaseModel):
    action: str  # "add", "remove", or "set"
    number: Optional[str] = None
    numbers: Optional[List[str]] = None


class SendNowRequest(BaseModel):
    target_date: Optional[str] = None


def get_current_settings():
    default_settings = {
        "scheduled_time": "07:00",
        "whatsapp_numbers": ["917041181117"],
        "send_whatsapp": True,
        "google_sheet_id": "1f34DjieNFmH1Wulj4M1iTiUcUsJBOYgFNkzoKNXC5bc",
        "sheet_url": "https://docs.google.com/spreadsheets/d/1f34DjieNFmH1Wulj4M1iTiUcUsJBOYgFNkzoKNXC5bc/edit?gid=0#gid=0"
    }
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_settings.update(data)
        except Exception:
            pass
    return default_settings


def save_settings(settings):
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
        # Also sync phone_numbers.json
        phone_data = {
            "whatsapp_numbers": settings.get("whatsapp_numbers", []),
            "send_whatsapp": settings.get("send_whatsapp", True)
        }
        with open(PHONE_FILE, "w", encoding="utf-8") as f:
            json.dump(phone_data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving settings: {e}")
        return False


@app.get("/api/morning-report/status")
async def get_status():
    """Returns today's dispatch status, metrics, time schedule, and numbers."""
    settings = get_current_settings()
    now = datetime.now()
    today_str = now.strftime("%d-%m-%Y")

    status_data = {
        "today_date": today_str,
        "report_date": "",
        "sent_today": False,
        "sent_at": None,
        "scheduled_time": settings.get("scheduled_time", "07:00"),
        "whatsapp_numbers": settings.get("whatsapp_numbers", []),
        "sheet_url": settings.get("sheet_url"),
        "has_image": IMAGE_FILE.exists(),
        "latest_data": {
            "date": "",
            "TOTAL": 0,
            "INWARD": 0,
            "OUTWARD": 0,
            "AUDIT": 0,
            "BLOCK": 0
        }
    }

    if STATUS_FILE.exists():
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                raw_st = json.load(f)
                if raw_st.get("today_date") == today_str:
                    status_data["sent_today"] = raw_st.get("sent_today", False)
                    status_data["sent_at"] = raw_st.get("sent_at")
                status_data["report_date"] = raw_st.get("report_date", "")
                if "latest_data" in raw_st:
                    status_data["latest_data"] = raw_st["latest_data"]
        except Exception as e:
            print(f"Error reading status: {e}")

    # Fallback to history if latest_data is empty
    if not status_data["latest_data"].get("date") and HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
                if history:
                    last_item = history[-1]
                    status_data["latest_data"] = {
                        "date": last_item.get("date", ""),
                        "TOTAL": last_item.get("TOTAL", 0),
                        "INWARD": last_item.get("INWARD", 0),
                        "OUTWARD": last_item.get("OUTWARD", 0),
                        "AUDIT": last_item.get("AUDIT", 0),
                        "BLOCK": last_item.get("BLOCK", 0)
                    }
                    if not status_data["report_date"]:
                        status_data["report_date"] = last_item.get("date", "")
        except Exception:
            pass

    return status_data


@app.get("/api/morning-report/image")
async def get_report_image():
    """Serves the generated yellow-header table screenshot."""
    if not IMAGE_FILE.exists():
        raise HTTPException(status_code=404, detail="Report image not found")
    return FileResponse(
        str(IMAGE_FILE),
        media_type="image/png",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.post("/api/morning-report/schedule")
async def update_schedule(req: ScheduleRequest):
    """Updates morning dispatch time in settings and Windows Task Scheduler."""
    raw_time = req.time.strip().lower()
    # Normalize to 24-hr or 12-hr for scheduled task
    # e.g., "07:00", "07:30", "7:00am", "19:00"
    clean_time = raw_time
    if not clean_time.endswith("am") and not clean_time.endswith("pm"):
        # Parse "HH:MM"
        try:
            parts = clean_time.split(":")
            hr = int(parts[0])
            mn = int(parts[1])
            # Format as "HH:MMam" or "HH:MMpm"
            if hr == 0:
                clean_time = f"12:{mn:02d}am"
            elif hr < 12:
                clean_time = f"{hr:02d}:{mn:02d}am"
            elif hr == 12:
                clean_time = f"12:{mn:02d}pm"
            else:
                clean_time = f"{hr-12:02d}:{mn:02d}pm"
        except Exception:
            clean_time = raw_time + "am"

    settings = get_current_settings()
    settings["scheduled_time"] = req.time.strip()
    save_settings(settings)

    # Call update_schedule.ps1 to update Windows Task Scheduler
    try:
        ps_res = subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(UPDATE_SCHEDULE_PS1), "-Time", clean_time],
            capture_output=True,
            text=True,
            timeout=15
        )
        task_output = ps_res.stdout.strip()
        print(f"Schedule update output: {task_output}")
    except Exception as e:
        print(f"Error calling update_schedule.ps1: {e}")
        task_output = str(e)

    return {
        "success": True,
        "scheduled_time": settings["scheduled_time"],
        "message": f"સમય સફળતાપૂર્વક {settings['scheduled_time']} વાગ્યે સેટ થઈ ગયો!",
        "system_result": task_output
    }


@app.post("/api/morning-report/numbers")
async def manage_numbers(req: NumbersRequest):
    """Adds, removes, or sets recipient phone numbers."""
    settings = get_current_settings()
    current_numbers = settings.get("whatsapp_numbers", [])

    if req.action == "add" and req.number:
        clean = "".join(filter(str.isdigit, str(req.number)))
        if len(clean) == 10:
            clean = "91" + clean
        elif clean.startswith("0"):
            clean = "91" + clean[1:]
        if clean and clean not in current_numbers:
            current_numbers.append(clean)
    elif req.action == "remove" and req.number:
        clean = "".join(filter(str.isdigit, str(req.number)))
        current_numbers = [n for n in current_numbers if clean not in n]
    elif req.action == "set" and req.numbers is not None:
        new_list = []
        for n in req.numbers:
            c = "".join(filter(str.isdigit, str(n)))
            if len(c) == 10:
                c = "91" + c
            elif c.startswith("0"):
                c = "91" + c[1:]
            if c and c not in new_list:
                new_list.append(c)
        current_numbers = new_list

    settings["whatsapp_numbers"] = current_numbers
    save_settings(settings)

    return {
        "success": True,
        "whatsapp_numbers": current_numbers,
        "message": "ફોન નંબર સફળતાપૂર્વક અપડેટ થયા!"
    }


@app.post("/api/morning-report/send-now")
async def send_now(req: Optional[SendNowRequest] = None):
    """
    Triggers immediate report fetch from DigiBizz SQL,
    Google Sheet update, table screenshot image generation,
    and zero-touch WhatsApp dispatch!
    """
    cmd = [sys.executable, str(SCRIPT_FILE)]
    if req and req.target_date:
        cmd.append(req.target_date)

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=str(REPORT_DIR)
        )
        print("Send Now Output:", proc.stdout)
        if proc.returncode != 0:
            print("Send Now Error:", proc.stderr)
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": proc.stderr, "stdout": proc.stdout}
            )

        # Reload status
        status = await get_status()
        return {
            "success": True,
            "message": "રિપોર્ટ સફળતાપૂર્વક જનરેટ થઈ ગયો અને વોટ્સએપ પર મોકલાઈ ગયો!",
            "status": status
        }
    except subprocess.TimeoutExpired:
        return JSONResponse(status_code=504, content={"success": False, "error": "Operation timed out"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/api/morning-report/history")
async def get_history():
    """Returns past reports from report_history.json."""
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
                return {"success": True, "history": list(reversed(history))}
        except Exception as e:
            return {"success": False, "error": str(e), "history": []}
    return {"success": True, "history": []}
