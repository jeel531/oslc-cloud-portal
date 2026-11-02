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
            data = {
                "worker_types": {},
                "default_type": DEFAULT_WORKER_TYPE,
                "global_default_hours": DEFAULT_GLOBAL_HOURS,
                "worker_default_hours": {}
            }
        else:
            data = json.loads(content)
        if "worker_types" not in data or not isinstance(data["worker_types"], dict):
            data["worker_types"] = {}
        if "global_default_hours" not in data:
            data["global_default_hours"] = DEFAULT_GLOBAL_HOURS
        if "default_type" not in data:
            data["default_type"] = DEFAULT_WORKER_TYPE
        if "worker_default_hours" not in data or not isinstance(data["worker_default_hours"], dict):
            data["worker_default_hours"] = {}

        # Seamless support for both list and dict formats
        data["piece_rate_workers"] = [w for w, t in data["worker_types"].items() if str(t).lower() == "piece"]
        data["fix_workers"] = [w for w, t in data["worker_types"].items() if str(t).lower() == "fix"]
        data["default_daily_hours"] = float(data.get("global_default_hours", DEFAULT_GLOBAL_HOURS))
        return data
    except Exception as e:
        print(f"Error loading worker settings: {e}")
        return {
            "worker_types": {},
            "piece_rate_workers": [],
            "fix_workers": [],
            "default_type": DEFAULT_WORKER_TYPE,
            "global_default_hours": DEFAULT_GLOBAL_HOURS,
            "default_daily_hours": DEFAULT_GLOBAL_HOURS,
            "worker_default_hours": {}
        }

def save_worker_settings(settings: Dict[str, Any]) -> bool:
    _ensure_files()
    try:
        clean_types = {}
        # 1. From piece_rate_workers list
        if isinstance(settings.get("piece_rate_workers"), list):
            for w in settings["piece_rate_workers"]:
                w_str = str(w).strip().upper()
                if w_str:
                    clean_types[w_str] = "piece"

        # 2. From fix_workers list
        if isinstance(settings.get("fix_workers"), list):
            for w in settings["fix_workers"]:
                w_str = str(w).strip().upper()
                if w_str:
                    clean_types[w_str] = "fix"

        # 3. From worker_types dict
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
            g_hours = round(float(settings.get("default_daily_hours") or settings.get("global_default_hours", DEFAULT_GLOBAL_HOURS)), 2)
        except (ValueError, TypeError):
            g_hours = DEFAULT_GLOBAL_HOURS

        data_to_save = {
            "worker_types": clean_types,
            "piece_rate_workers": [w for w, t in clean_types.items() if t == "piece"],
            "fix_workers": [w for w, t in clean_types.items() if t == "fix"],
            "default_type": str(settings.get("default_type", DEFAULT_WORKER_TYPE)).strip().lower(),
            "global_default_hours": g_hours,
            "default_daily_hours": g_hours,
            "worker_default_hours": clean_w_hours,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        temp_file = HERE / "worker_settings.json.tmp"
        temp_file.write_text(json.dumps(data_to_save, indent=2, ensure_ascii=False), encoding="utf-8")
        temp_file.replace(SETTINGS_FILE)

        # Cross-sync to both project locations
        other_dir = Path("D:/OSLC_CLOUD_MASTER_PORTAL/apps/godaun/backend") if "NOTA" in str(HERE) else Path("D:/NOTA/OSLC IN OUT/backend")
        try:
            if other_dir.exists():
                (other_dir / "worker_settings.json").write_text(json.dumps(data_to_save, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

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

def calc_worker_range_hours(
    worker_name: str, 
    active_days: int, 
    from_date: str, 
    to_date: str, 
    all_hours: Optional[Dict[str, Dict[str, float]]] = None, 
    w_settings: Optional[Dict[str, Any]] = None
) -> float:
    """
    Calculates total hours for a worker over a date range.
    - If single day (from_date == to_date): returns the day's hours (custom or default 12.0).
    - If date range: sums custom hours for any days entered in daily_hours.json, and fills
      all remaining active days with the worker's default daily hours (12.0 hrs).
    """
    if all_hours is None:
        all_hours = load_all_hours()
    if w_settings is None:
        w_settings = load_worker_settings()

    w_clean = str(worker_name).strip().upper()
    global_def = float(w_settings.get("global_default_hours", DEFAULT_GLOBAL_HOURS))
    w_defs = w_settings.get("worker_default_hours", {})
    w_def = float(w_defs.get(w_clean, global_def))

    if active_days <= 0:
        if from_date == to_date:
            active_days = 1
        else:
            try:
                d1 = datetime.strptime(from_date, "%Y-%m-%d").date()
                d2 = datetime.strptime(to_date, "%Y-%m-%d").date()
                active_days = max(1, (d2 - d1).days + 1)
            except Exception:
                active_days = 1

    if from_date == to_date:
        d_map = all_hours.get(from_date, {})
        return float(d_map.get(w_clean, w_def))

    custom_hours = 0.0
    custom_days = 0
    for d_str, d_map in all_hours.items():
        if from_date <= d_str <= to_date and w_clean in d_map:
            try:
                val = float(d_map[w_clean])
                if val > 0:
                    custom_hours += val
                    custom_days += 1
            except (ValueError, TypeError):
                pass

    remaining_days = max(0, active_days - custom_days)
    total_h = custom_hours + (remaining_days * w_def)
    return round(total_h, 1)

def get_worker_hours_in_range(
    from_date: str, 
    to_date: str, 
    active_worker_days: Optional[Dict[str, int]] = None,
    active_worker_dates: Optional[Dict[str, Any]] = None
) -> Dict[str, float]:
    """
    Returns a dictionary of worker_name (uppercase) -> total hours worked between from_date and to_date (inclusive).
    Properly sums hours across all active days in the range (e.g. 31 days * 12 hrs = 372 hrs).
    """
    all_hours = load_all_hours()
    settings = load_worker_settings()
    global_def = float(settings.get("global_default_hours", DEFAULT_GLOBAL_HOURS))
    w_defs = settings.get("worker_default_hours", {})

    worker_totals: Dict[str, float] = {}

    # If active_worker_dates is provided (worker_name -> set/list of date strings):
    if active_worker_dates:
        for w, dates in active_worker_dates.items():
            w_clean = str(w).strip().upper()
            w_def = float(w_defs.get(w_clean, global_def))
            tot_h = 0.0
            for d_str in dates:
                d_map = all_hours.get(d_str, {})
                tot_h += float(d_map.get(w_clean, w_def))
            worker_totals[w_clean] = round(tot_h, 1)
        return worker_totals

    # If active_worker_days is provided (worker_name -> count of active days):
    if active_worker_days:
        for w, days_count in active_worker_days.items():
            w_clean = str(w).strip().upper()
            worker_totals[w_clean] = calc_worker_range_hours(w_clean, days_count, from_date, to_date, all_hours, settings)
        return worker_totals

    # Default fallback when neither active_worker_dates nor active_worker_days is provided:
    try:
        d_start = datetime.strptime(from_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(to_date, "%Y-%m-%d").date()
        total_days = max(1, (d_end - d_start).days + 1)
    except Exception:
        total_days = 1

    known_workers = set(w_defs.keys())
    for d_str, w_map in all_hours.items():
        if from_date <= d_str <= to_date:
            for w in w_map.keys():
                known_workers.add(str(w).strip().upper())

    for w_clean in known_workers:
        worker_totals[w_clean] = calc_worker_range_hours(w_clean, total_days, from_date, to_date, all_hours, settings)

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
            daily_map[d_str] = default_h
        cur += timedelta(days=1)

    return daily_map
