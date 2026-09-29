# -*- coding: utf-8 -*-
"""
OSLC Godaun Shelf Barcode Print Software
Database Access Layer for DigiBizz SQL Server
"""
import re
import time
from typing import Dict, List, Optional, Any, Tuple
import pyodbc

from apps.barcode.backend.config import DB_CONFIG

_CACHE: Dict[str, Tuple[float, Any]] = {}
CACHE_TTL = 300  # 5 minutes


def natural_sort_key(s: str):
    """Sort strings with embedded numbers naturally (e.g. AAA1, AAA2, AAA10 instead of AAA1, AAA10, AAA2)."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', str(s))]


def get_connection():
    """Connect to DigiBizz SQL Server database."""
    driver = "SQL Server"
    installed = pyodbc.drivers()
    for d in ["ODBC Driver 18 for SQL Server", "ODBC Driver 17 for SQL Server", "SQL Server"]:
        if d in installed:
            driver = d
            break

    conn_str = (
        f"DRIVER={{{driver}}};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['master_database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        "TrustServerCertificate=yes;"
        "Connection Timeout=15;"
    )
    return pyodbc.connect(conn_str)


def get_shelf_prefixes() -> List[Dict[str, Any]]:
    """Returns distinct shelf code prefixes (e.g. AAA, BBB, ZA) with counts from DigiBizz."""
    cache_key = "shelf_prefixes"
    now = time.time()
    if cache_key in _CACHE and (now - _CACHE[cache_key][0] < CACHE_TTL):
        return _CACHE[cache_key][1]

    prefixes = []
    try:
        conn = get_connection()
        cur = conn.cursor()
        query = """
            SELECT 
                UPPER(SUBSTRING(LTRIM(RTRIM(s.GENERAL_SETTING_CODE)), 1, 
                    CASE 
                        WHEN PATINDEX('%[0-9]%', LTRIM(RTRIM(s.GENERAL_SETTING_CODE))) > 1 
                        THEN PATINDEX('%[0-9]%', LTRIM(RTRIM(s.GENERAL_SETTING_CODE))) - 1
                        ELSE 3 
                    END
                )) AS PREFIX,
                COUNT(*) AS CNT
            FROM MASTER_GENERAL_SETTING s WITH (NOLOCK)
            WHERE s.GENERAL_SETTING_TYPE_ID = 21 
              AND s.GENERAL_SETTING_CODE IS NOT NULL 
              AND LEN(LTRIM(RTRIM(s.GENERAL_SETTING_CODE))) >= 1
              AND PATINDEX('%[A-Z]%', SUBSTRING(LTRIM(RTRIM(s.GENERAL_SETTING_CODE)), 1, 1)) > 0
            GROUP BY 
                UPPER(SUBSTRING(LTRIM(RTRIM(s.GENERAL_SETTING_CODE)), 1, 
                    CASE 
                        WHEN PATINDEX('%[0-9]%', LTRIM(RTRIM(s.GENERAL_SETTING_CODE))) > 1 
                        THEN PATINDEX('%[0-9]%', LTRIM(RTRIM(s.GENERAL_SETTING_CODE))) - 1
                        ELSE 3 
                    END
                ))
            HAVING COUNT(*) >= 5
            ORDER BY CNT DESC
        """
        cur.execute(query)
        for r in cur.fetchall():
            prefix = (r[0] or "").strip()
            cnt = r[1] or 0
            if prefix and cnt > 0:
                prefixes.append({"prefix": prefix, "count": cnt})
        conn.close()
        _CACHE[cache_key] = (now, prefixes)
    except Exception as e:
        print(f"[!] Error fetching prefixes: {e}")
        # Default fallback
        prefixes = [
            {"prefix": "AAA", "count": 13269},
            {"prefix": "BBB", "count": 10000},
            {"prefix": "ZA", "count": 11000},
            {"prefix": "TRR", "count": 1085},
            {"prefix": "F", "count": 104}
        ]

    return prefixes


def get_shelves_from_db(
    prefix: Optional[str] = None,
    from_num: Optional[int] = None,
    to_num: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 5000
) -> List[Dict[str, Any]]:
    """
    Fetches shelf codes and associated rack codes from DigiBizz.
    Sorts strictly in natural sequential line order (1, 2, 3, 4, 5... AAA1, AAA2... AAA10, AAA11...).
    """
    results = []
    try:
        conn = get_connection()
        cur = conn.cursor()

        sql = """
            SELECT 
                s.GENERAL_SETTING_ID AS SHELF_ID,
                LTRIM(RTRIM(s.GENERAL_SETTING_CODE)) AS SHELF_CODE,
                LTRIM(RTRIM(ISNULL(r.GENERAL_SETTING_CODE, ''))) AS RACK_CODE
            FROM MASTER_GENERAL_SETTING s WITH (NOLOCK)
            LEFT JOIN MASTER_GENERAL_SETTING r WITH (NOLOCK) ON s.GENERAL_SETTING_ID1 = r.GENERAL_SETTING_ID
            WHERE s.GENERAL_SETTING_TYPE_ID = 21
              AND s.GENERAL_SETTING_CODE IS NOT NULL
        """
        params = []

        if prefix and prefix.strip():
            pref = prefix.strip()
            sql += " AND s.GENERAL_SETTING_CODE LIKE ?"
            params.append(f"{pref}%")

        if search and search.strip():
            s_term = search.strip()
            sql += " AND (s.GENERAL_SETTING_CODE LIKE ? OR r.GENERAL_SETTING_CODE LIKE ?)"
            params.extend([f"%{s_term}%", f"%{s_term}%"])

        cur.execute(sql, params)
        rows = cur.fetchall()
        conn.close()

        for r in rows:
            shelf_id = r[0]
            shelf_code = r[1] or ""
            rack_code = r[2] or ""

            # Extract numeric portion if range filtering is active
            m = re.search(r'(\d+)', shelf_code)
            item_num = int(m.group(1)) if m else None

            if from_num is not None or to_num is not None:
                if item_num is None:
                    continue
                if from_num is not None and item_num < from_num:
                    continue
                if to_num is not None and item_num > to_num:
                    continue

            results.append({
                "id": shelf_id,
                "shelf": shelf_code,
                "rack": rack_code,
                "num": item_num if item_num is not None else 0
            })

        # Natural sort strictly: first by alpha prefix, then by numeric value
        results.sort(key=lambda x: natural_sort_key(x["shelf"]))

        if limit and len(results) > limit:
            results = results[:limit]

    except Exception as e:
        print(f"[!] Error fetching shelves: {e}")

    return results


def get_racks_from_db() -> List[str]:
    """Fetches unique rack codes from DigiBizz."""
    cache_key = "racks_list"
    now = time.time()
    if cache_key in _CACHE and (now - _CACHE[cache_key][0] < CACHE_TTL):
        return _CACHE[cache_key][1]

    racks = []
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT LTRIM(RTRIM(GENERAL_SETTING_CODE)) AS RACK_CODE
            FROM MASTER_GENERAL_SETTING WITH (NOLOCK)
            WHERE GENERAL_SETTING_TYPE_ID = 23 AND GENERAL_SETTING_CODE IS NOT NULL
        """)
        for r in cur.fetchall():
            code = (r[0] or "").strip()
            if code:
                racks.append(code)
        conn.close()
        racks.sort(key=natural_sort_key)
        _CACHE[cache_key] = (now, racks)
    except Exception as e:
        print(f"[!] Error fetching racks: {e}")

    return racks
