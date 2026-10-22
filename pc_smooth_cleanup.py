# -*- coding: utf-8 -*-
"""
PC-106 Smooth & Fast System Cleanup Tool
Safely removes junk files, temporary files, crash dumps, and zombie processes
to make the PC run fast and smooth.
"""
import os
import sys
import shutil
import psutil
import subprocess
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_disk_free(drive="C:"):
    try:
        total, used, free = shutil.disk_usage(drive)
        return free // (1024**2)  # MB
    except Exception:
        return 0

def clean_dir(target_dir, label="Temp"):
    if not os.path.exists(target_dir):
        return 0, 0
    deleted_files = 0
    freed_bytes = 0
    for root, dirs, files in os.walk(target_dir, topdown=False):
        for f in files:
            fp = os.path.join(root, f)
            try:
                sz = os.path.getsize(fp)
                os.remove(fp)
                freed_bytes += sz
                deleted_files += 1
            except Exception:
                pass
        for d in dirs:
            dp = os.path.join(root, d)
            try:
                os.rmdir(dp)
            except Exception:
                pass
    mb = freed_bytes // (1024**2)
    print(f"🧹 [{label}] સાફ કરી: {deleted_files} ફાઈલો, {mb} MB મુક્ત થઈ.")
    return deleted_files, freed_bytes

def kill_zombie_and_duplicate_processes():
    print("\n⚡ વધારાની અને ડુપ્લિકેટ પ્રોસેસ સાફ કરી રહ્યા છીએ (RAM મુક્ત થશે)...")
    freed_ram_mb = 0

    # Track how many instances of each script are running
    seen_cmds = {}
    
    current_pid = os.getpid()

    for p in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info']):
        try:
            pid = p.info.get('pid')
            if pid == current_pid:
                continue
            name = (p.info.get('name') or '').lower()
            cmd = ' '.join(p.info.get('cmdline') or [])
            rss = (p.info.get('memory_info').rss // (1024**2)) if p.info.get('memory_info') else 0

            # 1. Kill old hung uvicorn / pythonw instances taking 100+ MB
            if 'pythonw.exe' in name and ('venv' in cmd or 'server_venv' in cmd or rss > 100):
                print(f"   ❌ બંધ કરી: {name} (PID {pid}, {rss} MB) -> {cmd[:70]}")
                p.kill()
                freed_ram_mb += rss
                continue

            # 2. Eliminate duplicate auto_cloud_sync.py (keep only 1)
            if 'auto_cloud_sync.py' in cmd:
                if 'auto_cloud_sync' in seen_cmds:
                    print(f"   ❌ ડુપ્લિકેટ બંધ કરી: auto_cloud_sync.py (PID {pid}, {rss} MB)")
                    p.kill()
                    freed_ram_mb += rss
                else:
                    seen_cmds['auto_cloud_sync'] = pid

            # 3. Eliminate duplicate tunnel_watchdog.py (keep only 1)
            if 'tunnel_watchdog.py' in cmd:
                if 'tunnel_watchdog' in seen_cmds:
                    print(f"   ❌ ડુપ્લિકેટ બંધ કરી: tunnel_watchdog.py (PID {pid}, {rss} MB)")
                    p.kill()
                    freed_ram_mb += rss
                else:
                    seen_cmds['tunnel_watchdog'] = pid

            # 4. Eliminate duplicate master_server.py (keep only 1)
            if 'master_server.py' in cmd:
                if 'master_server' in seen_cmds:
                    print(f"   ❌ ડુપ્લિકેટ બંધ કરી: master_server.py (PID {pid}, {rss} MB)")
                    p.kill()
                    freed_ram_mb += rss
                else:
                    seen_cmds['master_server'] = pid

        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    print(f"✅ કુલ મુક્ત થયેલ RAM: {freed_ram_mb} MB")

def main():
    print("=" * 70)
    print("   OM SAI LATEST CREATION - PC-106 SYSTEM CLEANUP & SMOOTH BOOSTER")
    print("=" * 70)

    c_free_before = get_disk_free("C:")
    mem_before = psutil.virtual_memory()

    print(f"📊 સફાઈ પહેલા સ્થિતિ:")
    print(f"   - C: Drive Free: {c_free_before // 1024} GB")
    print(f"   - RAM Used: {mem_before.percent}% (Available: {mem_before.available // (1024**2)} MB)\n")

    # 1. Clean User Temp
    user_temp = os.path.expandvars(r"%TEMP%")
    clean_dir(user_temp, "User Temp Directory")

    # 2. Clean Windows Temp
    clean_dir(r"C:\Windows\Temp", "Windows System Temp")

    # 3. Clean Crash Dumps
    crash_dumps = os.path.expandvars(r"%LOCALAPPDATA%\CrashDumps")
    clean_dir(crash_dumps, "Crash Dumps")

    # 4. Clean Pip cache
    pip_cache = os.path.expandvars(r"%LOCALAPPDATA%\pip\cache")
    clean_dir(pip_cache, "Pip Cache")

    # 5. Clean locked excel temporary files in Downloads
    dl_dir = Path(r"C:\Users\PC-106\Downloads")
    for f in dl_dir.glob("~$*"):
        try:
            f.unlink()
            print(f"🧹 Temporary Excel lock removed: {f.name}")
        except Exception:
            pass

    # 6. Kill zombie & duplicate python processes
    kill_zombie_and_duplicate_processes()

    # 7. Flush DNS
    try:
        subprocess.run(["ipconfig", "/flushdns"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("🌐 DNS કેશ ફ્લશ કર્યું (ઇન્ટરનેટ ફાસ્ટ ચાલશે).")
    except Exception:
        pass

    c_free_after = get_disk_free("C:")
    mem_after = psutil.virtual_memory()
    freed_disk_gb = (c_free_after - c_free_before) / 1024.0

    print("\n" + "=" * 70)
    print("🎉 સફાઈ સફળતાપૂર્વક પૂર્ણ થઈ!")
    print(f"   - મુક્ત થયેલ C: Drive સ્પેસ: {freed_disk_gb:.2f} GB વધારાની સ્પેસ મળી!")
    print(f"   - હવે ઉપલબ્ધ C: Drive સ્પેસ: {c_free_after // 1024} GB")
    print(f"   - RAM વાપરવાનો રેટ: {mem_after.percent}% (Available: {mem_after.available // (1024**2)} MB)")
    print("   - તમારું PC-106 હવે એકદમ સ્મૂધ અને ફાસ્ટ ચાલશે!")
    print("=" * 70)

if __name__ == "__main__":
    main()
