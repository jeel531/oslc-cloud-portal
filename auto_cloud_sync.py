# -*- coding: utf-8 -*-
r"""
OSLC Automated Cloud Sync Engine
Runs 24/7 in the background:
 - Monitors D:\OSLC_CLOUD_MASTER_PORTAL for any code changes, edits, or new projects
 - Automatically stages, commits, and pushes to GitHub (jeel531/oslc-cloud-portal)
 - Triggers instant automatic rebuild on Cloud Server (Render / Cloudflare)
 - Zero manual commands required from the user!
"""
import os
import sys
import time
import subprocess
import json
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent
GIT_EXE = r"C:\Users\PC-106\PortableGit-oslc-20260922094043\bin\git.exe"
STATUS_FILE = ROOT_DIR / "portal_ui" / "sync_status.json"

def update_status(status, message, details=None):
    try:
        data = {
            "status": status,
            "message": message,
            "last_sync": datetime.now().strftime("%d-%b-%Y %I:%M:%S %p"),
            "details": details or {}
        }
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[STATUS ERROR] {e}")

def run_git(args, cwd=ROOT_DIR):
    cmd = [GIT_EXE] + args
    res = subprocess.run(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="ignore"
    )
    return res.returncode, res.stdout.strip(), res.stderr.strip()

def check_for_changes():
    code, stdout, stderr = run_git(["status", "--porcelain"])
    if code != 0:
        return []
    lines = [line.strip() for line in stdout.splitlines() if line.strip()]
    # Filter out sync_status.json itself to prevent self-triggering loop
    meaningful = [
        l for l in lines 
        if "sync_status.json" not in l and "tunnel.log" not in l and "__pycache__" not in l
    ]
    return meaningful

def sync_now(changed_files):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Detected {len(changed_files)} changes. Debouncing 10s...")
    update_status("syncing", "નવા ફેરફારો સર્વર પર અપલોડ થઈ રહ્યા છે...", {"files": changed_files[:5]})
    time.sleep(10)

    # Re-check
    now_changed = check_for_changes()
    if not now_changed:
        update_status("idle", "બધા ફેરફારો અપ-ટુ-ડેટ છે.")
        return

    # 1. git add -A
    code, _, err = run_git(["add", "-A"])
    if code != 0:
        print(f"[GIT ADD ERROR] {err}")
        update_status("error", f"Git add error: {err}")
        return

    # 2. git commit
    now_str = datetime.now().strftime("%d-%b-%Y %H:%M:%S")
    commit_msg = f"Auto-Sync: Automated project upload ({now_str})"
    code, out, err = run_git(["commit", "-m", commit_msg])
    if code != 0 and "nothing to commit" not in (out + err):
        print(f"[GIT COMMIT ERROR] {err}")

    # 3. git push origin main
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Pushing to GitHub (origin main)...")
    code, out, err = run_git(["push", "origin", "main"])
    if code == 0:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Successfully synced to Cloud Server!")
        update_status(
            "synced",
            "તમામ પ્રોજેક્ટ્સ સર્વર (GitHub & Cloud) પર સફળતાપૂર્વક ચડી ગયા છે!",
            {"files_count": len(now_changed), "time": now_str}
        )
    else:
        print(f"[GIT PUSH ERROR] {err}")
        update_status(
            "pending",
            "લોકલ સેવ થઈ ગયું છે. નેટવર્ક કનેક્શન મળતા જ સર્વર પર ચડી જશે.",
            {"error": err}
        )

def main():
    print("=" * 65)
    print("   OSLC AUTOMATED CLOUD SYNC DAEMON ACTIVE")
    print("   Monitoring projects in: " + str(ROOT_DIR))
    print("   Target Repository: https://github.com/jeel531/oslc-cloud-portal")
    print("=" * 65)

    update_status("idle", "ઓટો-ક્લાઉડ સિન્ક ૨૪ કલાક સક્રિય છે. કોઈ નવા ફેરફાર નથી.")

    while True:
        try:
            changed = check_for_changes()
            if changed:
                sync_now(changed)
        except Exception as e:
            print(f"[LOOP ERROR] {e}")
        time.sleep(15)

if __name__ == "__main__":
    main()
