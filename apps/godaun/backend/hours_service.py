# pyrefly: ignore-errors
# type: ignore
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

HERE = Path(__file__).resolve().parent
HOURS_FILE = HERE / "daily_hours.json"
SETTINGS_FILE = HERE / "worker_settings.json"

DEFAULT_GLOBAL_HOURS = 12.0
DEFAULT_WORKER_TYPE = "fix"  # By default, workers are FIX unless explicitly chosen as PIECE RATE

def _ensure_files():
    if not HOURS_FILE.exists():
        HOURS_FILE.write_text("{}", encoding="utf-8")
    if not SETTINGS_FILE.exists():
        initial_settings = {
            "worker_types": {},
            "default_type": DEFAULT_WORKER_TYPE,
            "global_default_hours": DEFAULT_GLOBAL_HOURS,
            "worker_default_hours": {}
        }
        SETTINGS_FILE.write_text(json.dumps(initial_settings, indent=2, ensure_ascii=False), encoding="utf-8")

def load_worker_settings() -> Dict[str, Any]:
    _ensure_files()
    try:
        content = SETTINGS_FILE.read_text(encoding="utf-8").strip()
        if not content:
            return {
                "worker_types": {},
                "default_type": DEFAULT_WORKER_TYPE,
                "global_default_hours": DEFAULT_GLOBAL_HOURS,
                "worker_default_hours": {}
            }
        data = json.loads(content)
        if "worker_types" not in data or not isinstance(data["worker_types"], dict):
            data["worker_types"] = {}
        if "global_default_hours" not in data:
            data["global_default_hours"] = DEFAULT_GLOBAL_HOURS
        if "default_type" not in data:
            data["default_type"] = DEFAULT_WORKER_TYPE
        if "worker_default_hours" not in data or not isinstance(data["worker_default_hours"], dict):
            data["worker_default_hours"] = {}
        return data
    except Exception as e:
        print(f"Error loading worker settings: {e}")
        return {
            "worker_types": {},
            "default_type": DEFAULT_WORKER_TYPE,
            "global_default_hours": DEFAULT_GLOBAL_HOURS,
            "worker_default_hours": {}
        }

def save_worker_settings(settings: Dict[str, Any]) -> bool:
    _ensure_files()
    try:
        clean_types = {}
        if isinstance(settings.get("worker_types"), dict):
            for k, v in settings["worker_types"].items():
                w = str(k).strip().upper()
                t = str(v).strip().lower()
                clean_types[w] = "piece" if t in ("piece", "piece_rate", "piecerate") else "fix"

        clean_w_hours = {}
        if isinstance(settings.get("worker_default_hours"), dict):
            for k, v in settings["worker_default_hours"].items():
                try:
                    val = round(float(v), 2)
                    if val > 0:
                        clean_w_hours[str(k).strip().upper()] = val
                except (ValueError, TypeError):
                    pass

        try:
            g_hours = round(float(settings.get("global_default_hours", DEFAULT_GLOBAL_HOURS)), 2)
        except (ValueError, TypeError):
            g_hours = DEFAULT_GLOBAL_HOURS

        data_to_save = {
            "worker_types": clean_types,
            "default_type": str(settings.get("default_type", DEFAULT_WORKER_TYPE)).strip().lower(),
            "global_default_hours": g_hours,
            "worker_default_hours": clean_w_hours,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        temp_file = HERE / "worker_settings.json.tmp"
        temp_file.write_text(json.dumps(data_to_save, indent=2, ensure_ascii=False), encoding="utf-8")
        temp_file.replace(SETTINGS_FILE)
        return True
    except Exception as e:
        print(f"Error saving worker settings: {e}")
        return False

def get_worker_type(worker_name: str) -> str:
    """
    Returns 'piece' or 'fix'.
    Rule: Admin selects who is on piece rate. Everyone else is 'fix'.
    """
    if not worker_name:
        return DEFAULT_WORKER_TYPE
    w_clean = str(worker_name).strip().upper()
    settings = load_worker_settings()
    w_types = settings.get("worker_types", {})
    if w_clean in w_types:
        return w_types[w_clean]
    return settings.get("default_type", DEFAULT_WORKER_TYPE)

def is_worker_piece_rate(worker_name: str) -> bool:
    return get_worker_type(worker_name) == "piece"

def load_all_hours() -> Dict[str, Dict[str, float]]:
    _ensure_files()
    try:
        content = HOURS_FILE.read_text(encoding="utf-8").strip()
        if not content:
            return {}
        data = json.loads(content)
        clean: Dict[str, Dict[str, float]] = {}
        for d_str, w_dict in data.items():
            if not isinstance(w_dict, dict):
                continue
            clean[d_str] = {}
            for w, h in w_dict.items():
                try:
                    clean[d_str][str(w).strip().upper()] = round(float(h), 2)
                except (ValueError, TypeError):
                    pass
        return clean
    except Exception:
        return {}

def save_all_hours(data: Dict[str, Dict[str, float]]) -> bool:
    _ensure_files()
    try:
        temp_file = HERE / "daily_hours.json.tmp"
        temp_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        temp_file.replace(HOURS_FILE)
        return True
    except Exception as e:
        print(f"Error saving hours: {e}")
        return False

def get_hours_for_date(date_str: str) -> Dict[str, float]:
    all_hours = load_all_hours()
    return all_hours.get(date_str, {})

def set_hours_for_date(date_str: str, worker_hours: Dict[str, Any]) -> bool:
    all_hours = load_all_hours()
    clean_hours: Dict[str, float] = {}
    for w, h in worker_hours.items():
        try:
            val = round(float(h), 2)
            if val > 0:
                clean_hours[str(w).strip().upper()] = val
        except (ValueError, TypeError):
            continue

    all_hours[date_str] = clean_hours
    return save_all_hours(all_hours)

def apply_bulk_hours_range(from_date: str, to_date: str, worker_hours: Dict[str, Any]) -> bool:
    """
    Sets the specified worker hours for every single day in the date range (inclusive).
    Fulfills user requirement: '1 var teim nakhu to te roj ma avu pade'.
    """
    try:
        d_start = datetime.strptime(from_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(to_date, "%Y-%m-%d").date()
    except Exception:
        return False

    all_hours = load_all_hours()
    clean_hours: Dict[str, float] = {}
    for w, h in worker_hours.items():
        try:
            val = round(float(h), 2)
            if val > 0:
                clean_hours[str(w).strip().upper()] = val
        except (ValueError, TypeError):
            continue

    cur = d_start
    while cur <= d_end:
        d_str = cur.strftime("%Y-%m-%d")
        existing = all_hours.get(d_str, {})
        existing.update(clean_hours)
        all_hours[d_str] = existing
        cur += timedelta(days=1)

    return save_all_hours(all_hours)

def get_worker_hours_in_range(from_date: str, to_date: str, active_worker_days: Optional[Dict[str, int]] = None) -> Dict[str, float]:
    """
    Returns a dictionary of worker_name (uppercase) -> total hours worked between from_date and to_date (inclusive).
    If a worker worked on active days but daily_hours.json has no explicit entry for that date,
    it falls back to the configured default hours so '1 var teim nakhu to te roj ma avu pade' works seamlessly.
    """
    all_hours = load_all_hours()
    settings = load_worker_settings()
    global_def = float(settings.get("global_default_hours", DEFAULT_GLOBAL_HOURS))
    w_defs = settings.get("worker_default_hours", {})

    worker_totals: Dict[str, float] = {}

    try:
        d_start = datetime.strptime(from_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(to_date, "%Y-%m-%d").date()
    except Exception:
        for d_str, w_map in all_hours.items():
            if from_date <= d_str <= to_date:
                for w, h in w_map.items():
                    worker_totals[w] = round(worker_totals.get(w, 0.0) + h, 2)
        return worker_totals

    cur = d_start
    while cur <= d_end:
        d_str = cur.strftime("%Y-%m-%d")
        w_map = all_hours.get(d_str, {})
        for w, h in w_map.items():
            worker_totals[w] = round(worker_totals.get(w, 0.0) + h, 2)
        cur += timedelta(days=1)

    # If active_worker_days is provided (worker -> number of days active with scans):
    # Any worker with active days who lacks hours in all_hours gets active_days * default_hours
    if active_worker_days:
        for w, days_count in active_worker_days.items():
            w_clean = str(w).strip().upper()
            if w_clean not in worker_totals or worker_totals[w_clean] <= 0:
                def_h = float(w_defs.get(w_clean, global_def))
                if def_h > 0 and days_count > 0:
                    worker_totals[w_clean] = round(days_count * def_h, 2)

    return worker_totals

def get_worker_daily_hours(worker_name: str, from_date: str, to_date: str, active_dates: Optional[List[str]] = None) -> Dict[str, float]:
    """
    Returns a dictionary of date_str -> hours worked for a specific worker.
    If a date has no explicit entry in daily_hours.json:
    - If active_dates is given and date_str is in active_dates: applies the default hours!
    - Otherwise applies default hours if configured.
    """
    all_hours = load_all_hours()
    settings = load_worker_settings()
    global_def = float(settings.get("global_default_hours", DEFAULT_GLOBAL_HOURS))
    w_defs = settings.get("worker_default_hours", {})

    w_clean = str(worker_name).strip().upper()
    default_h = float(w_defs.get(w_clean, global_def))
    daily_map: Dict[str, float] = {}

    active_set = set(active_dates) if active_dates is not None else None

    try:
        d_start = datetime.strptime(from_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(to_date, "%Y-%m-%d").date()
    except Exception:
        for d_str, w_map in all_hours.items():
            if from_date <= d_str <= to_date:
                if w_clean in w_map:
                    daily_map[d_str] = w_map[w_clean]
                elif active_set is None or d_str in active_set:
                    daily_map[d_str] = default_h
        return daily_map

    cur = d_start
    while cur <= d_end:
        d_str = cur.strftime("%Y-%m-%d")
        w_map = all_hours.get(d_str, {})
        if w_clean in w_map and w_map[w_clean] > 0:
            daily_map[d_str] = w_map[w_clean]
        elif active_set is None or d_str in active_set:
            # Auto-apply default hours for active scanning days!
            daily_map[d_str] = default_h
        else:
            daily_map[d_str] = 0.0
        cur += timedelta(days=1)

    return daily_map
