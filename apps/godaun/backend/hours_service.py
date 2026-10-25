# pyrefly: ignore-errors
# type: ignore
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict

HERE = Path(__file__).resolve().parent
HOURS_FILE = HERE / "daily_hours.json"

def _ensure_hours_file():
    if not HOURS_FILE.exists():
        HOURS_FILE.write_text("{}", encoding="utf-8")

def load_all_hours() -> Dict[str, Dict[str, float]]:
    _ensure_hours_file()
    try:
        content = HOURS_FILE.read_text(encoding="utf-8").strip()
        if not content:
            return {}
        data = json.loads(content)
        # normalize keys and values
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

def get_worker_hours_in_range(from_date: str, to_date: str) -> Dict[str, float]:
    """
    Returns a dictionary of worker_name (uppercase) -> total hours worked between from_date and to_date (inclusive).
    """
    all_hours = load_all_hours()
    worker_totals: Dict[str, float] = {}

    try:
        d_start = datetime.strptime(from_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(to_date, "%Y-%m-%d").date()
    except Exception:
        # Fallback to single date or string comparison
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

    return worker_totals

def get_worker_daily_hours(worker_name: str, from_date: str, to_date: str) -> Dict[str, float]:
    """
    Returns a dictionary of date_str -> hours worked for a specific worker.
    """
    all_hours = load_all_hours()
    w_clean = worker_name.strip().upper()
    daily_map: Dict[str, float] = {}

    try:
        d_start = datetime.strptime(from_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(to_date, "%Y-%m-%d").date()
    except Exception:
        for d_str, w_map in all_hours.items():
            if from_date <= d_str <= to_date:
                if w_clean in w_map:
                    daily_map[d_str] = w_map[w_clean]
        return daily_map

    cur = d_start
    while cur <= d_end:
        d_str = cur.strftime("%Y-%m-%d")
        w_map = all_hours.get(d_str, {})
        if w_clean in w_map:
            daily_map[d_str] = w_map[w_clean]
        else:
            daily_map[d_str] = 0.0
        cur += timedelta(days=1)

    return daily_map
