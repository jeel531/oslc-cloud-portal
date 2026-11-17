# -*- coding: utf-8 -*-
import subprocess
import sys
from pathlib import Path

def update_hub_surge(target_url: str):
    target_url = (target_url or "").strip()
    if not target_url or "api.trycloudflare.com" in target_url:
        print("Invalid target URL for Surge:", target_url)
        return False

    root = Path(__file__).resolve().parent
    surge_dir = root / "runtime" / "surge_hub"
    surge_dir.mkdir(parents=True, exist_ok=True)
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>OSLC CLOUD MASTER HUB & ALL APKS</title>
    <meta http-equiv="refresh" content="0; url={target_url}">
    <script>
        (function() {{
            var target = "{target_url}".replace(/\\/+$/, "");
            var path = window.location.pathname || "";
            if (path === "/" || path === "/index.html" || path === "/200.html" || path === "/404.html") {{
                path = "";
            }}
            var search = window.location.search || "";
            var hash = window.location.hash || "";
            var fullUrl = target + path + search + hash;
            try {{
                window.location.replace(fullUrl);
            }} catch(e) {{
                window.location.href = fullUrl;
            }}
        }})();
    </script>
    <style>
        * {{ box-sizing: border-box; }}
        body {{
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }}
        .card {{
            text-align: center;
            padding: 32px 24px;
            max-width: 440px;
            width: 90%;
            background: #1e293b;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }}
        .spinner {{
            width: 44px;
            height: 44px;
            border: 4px solid rgba(14, 165, 233, 0.2);
            border-top-color: #0ea5e9;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 20px auto;
        }}
        @keyframes spin {{
            to {{ transform: rotate(360deg); }}
        }}
        h2 {{
            margin: 0 0 8px;
            font-size: 20px;
            font-weight: 700;
            color: #38bdf8;
            letter-spacing: 0.5px;
        }}
        p {{
            color: #94a3b8;
            font-size: 14px;
            margin: 0 0 20px;
            line-height: 1.5;
        }}
        .btn {{
            display: block;
            width: 100%;
            padding: 12px;
            margin-bottom: 10px;
            background: #0284c7;
            color: #fff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            transition: opacity 0.2s;
        }}
        .btn-sub {{
            background: rgba(255,255,255,0.08);
            color: #94a3b8;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h2>OSLC CLOUD MASTER HUB</h2>
        <p>Opening Master Portal & APK Center...</p>
        <a class="btn" href="{target_url}">Click here to open directly</a>
        <a class="btn btn-sub" href="http://192.168.100.106:8080/">Office Wi-Fi Link</a>
    </div>
</body>
</html>"""

    (surge_dir / "index.html").write_text(html, encoding="utf-8")
    (surge_dir / "200.html").write_text(html, encoding="utf-8")
    (surge_dir / "404.html").write_text(html, encoding="utf-8")
    (surge_dir / "url.txt").write_text(target_url.strip() + "\n", encoding="utf-8")
    (surge_dir / "target.json").write_text(f'{{"url":"{target_url.strip()}"}}\n', encoding="utf-8")
    (surge_dir / "CNAME").write_text("oslchub-live.surge.sh\n", encoding="utf-8")

    domain = "oslchub-live.surge.sh"
    p = subprocess.run(
        f'npx surge --project "{surge_dir}" --domain {domain}',
        shell=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(root)
    )
    print(f"SURGE [{domain}]: exit code {p.returncode}")
    return p.returncode == 0

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    success = update_hub_surge(url)
    print("Success:", success)
