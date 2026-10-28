# Lightweight RAM & Memory Optimizer for PC-106
# Keeps background memory trimmed so PC-106 runs fast and smooth

Add-Type @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

public class MemoryCleaner {
    [DllImport("psapi.dll")]
    public static extern int EmptyWorkingSet(IntPtr hwProc);

    public static void CleanAll() {
        foreach (Process p in Process.GetProcesses()) {
            try {
                if (p.Id <= 4) continue;
                EmptyWorkingSet(p.Handle);
            } catch {}
        }
    }
}
'@ -ErrorAction SilentlyContinue

try {
    [MemoryCleaner]::CleanAll()
    [System.GC]::Collect()
} catch {}
