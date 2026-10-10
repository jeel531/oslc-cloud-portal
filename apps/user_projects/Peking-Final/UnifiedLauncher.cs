using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Runtime.InteropServices;

namespace OSLCLauncher
{
    static class Program
    {
        private static readonly string HostLanUrl = "http://192.168.100.106:8787";
        private static readonly string LocalUrl = "http://127.0.0.1:8787";
        private static bool isPrintServerRunning = false;

        [STAThread]
        static void Main(string[] args)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;

            string targetUrl = "";
            string primaryDir = @"D:\KUMAR\New folder (15)";
            string currentDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');

            bool isHostPC = false;
            string appDir = "";

            if (Directory.Exists(primaryDir) && File.Exists(Path.Combine(primaryDir, "app.py")))
            {
                isHostPC = true;
                appDir = primaryDir;
            }
            else if (File.Exists(Path.Combine(currentDir, "app.py")))
            {
                isHostPC = true;
                appDir = currentDir;
            }

            // Always attempt to start the native C# Print Agent on port 8790
            // If port 8790 is already used (e.g. by Python agent), it will quietly ignore
            StartNativePrintAgent(currentDir);

            // 1. Check if a custom server URL or Cloud URL is configured in server_url.txt
            string configuredUrl = "";
            string urlFile = Path.Combine(currentDir, "server_url.txt");
            if (!File.Exists(urlFile) && !string.IsNullOrEmpty(appDir))
            {
                urlFile = Path.Combine(appDir, "server_url.txt");
            }
            if (File.Exists(urlFile))
            {
                try
                {
                    string txt = File.ReadAllText(urlFile).Trim();
                    if (!string.IsNullOrEmpty(txt) && txt.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                    {
                        configuredUrl = txt.TrimEnd('/');
                    }
                }
                catch { }
            }

            // Connect to server: Check local/LAN first, then configured/online links
            if (isHostPC)
            {
                // HOST PC LOCAL MODE (PC-106)
                bool ready = CheckHealth(LocalUrl + "/health", 700);
                if (!ready)
                {
                    string pythonw = Path.Combine(appDir, @".server_venv\Scripts\pythonw.exe");
                    if (!File.Exists(pythonw)) pythonw = Path.Combine(appDir, @".server_venv\Scripts\python.exe");
                    if (!File.Exists(pythonw)) pythonw = "python.exe";

                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = pythonw;
                        psi.Arguments = "\"" + Path.Combine(appDir, "app.py") + "\"";
                        psi.WorkingDirectory = appDir;
                        psi.WindowStyle = ProcessWindowStyle.Hidden;
                        psi.CreateNoWindow = true;
                        psi.UseShellExecute = true;
                        Process.Start(psi);
                    }
                    catch { }

                    for (int i = 0; i < 45; i++)
                    {
                        Thread.Sleep(300);
                        if (CheckHealth(LocalUrl + "/health", 600))
                        {
                            ready = true;
                            break;
                        }
                    }
                }
                targetUrl = LocalUrl;
            }
            else
            {
                // CLIENT MODE (ANY OTHER PC IN GODOWN / OFFICE, e.g. PC-101)
                // 1. Try LAN URL (fastest & works offline)
                if (CheckHealth(HostLanUrl + "/health", 1000))
                {
                    targetUrl = HostLanUrl;
                }
                // 2. Try configured URL from server_url.txt
                else if (!string.IsNullOrEmpty(configuredUrl) && CheckHealth(configuredUrl + "/health", 1500))
                {
                    targetUrl = configuredUrl;
                }
                // 3. Try online_link.txt if present
                else
                {
                    string onlineFile = Path.Combine(currentDir, "online_link.txt");
                    if (File.Exists(onlineFile))
                    {
                        try
                        {
                            string oUrl = File.ReadAllText(onlineFile).Trim();
                            if (!string.IsNullOrEmpty(oUrl) && oUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase) && CheckHealth(oUrl + "/health", 1800))
                            {
                                targetUrl = oUrl.TrimEnd('/');
                            }
                        }
                        catch { }
                    }
                }

                // 4. Try PC hostname
                if (string.IsNullOrEmpty(targetUrl) && CheckHealth("http://PC-106:8787/health", 1200))
                {
                    targetUrl = "http://PC-106:8787";
                }

                // Persistent Auto-Retry Loop: If network/Wi-Fi is down, continuously retry every 2 seconds
                // Net reconnect hote hi automatic connect ho jayega bina kisi manual error popup ke!
                int attempts = 0;
                while (string.IsNullOrEmpty(targetUrl))
                {
                    if (CheckHealth(HostLanUrl + "/health", 800)) { targetUrl = HostLanUrl; break; }
                    if (!string.IsNullOrEmpty(configuredUrl) && CheckHealth(configuredUrl + "/health", 1200)) { targetUrl = configuredUrl; break; }
                    
                    string onlineFile = Path.Combine(currentDir, "online_link.txt");
                    if (File.Exists(onlineFile))
                    {
                        try
                        {
                            string oUrl = File.ReadAllText(onlineFile).Trim();
                            if (!string.IsNullOrEmpty(oUrl) && oUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase) && CheckHealth(oUrl + "/health", 2000))
                            {
                                targetUrl = oUrl.TrimEnd('/');
                                break;
                            }
                        }
                        catch { }
                    }

                    if (CheckHealth("https://oslcerp-live.surge.sh/200.html", 2500))
                    {
                        targetUrl = "https://oslcerp-live.surge.sh";
                        break;
                    }

                    if (CheckHealth("http://PC-106:8787/health", 1200))
                    {
                        targetUrl = "http://PC-106:8787";
                        break;
                    }

                    attempts++;
                    Thread.Sleep(2000);
                }
            }

            LaunchApp(targetUrl);

            // If this instance started the background print agent, keep running in background to serve prints
            if (isPrintServerRunning)
            {
                while (true)
                {
                    Thread.Sleep(60000);
                }
            }
        }

        static bool CheckHealth(string url, int timeoutMs = 800)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = timeoutMs;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return ((int)resp.StatusCode >= 200 && (int)resp.StatusCode < 400);
                }
            }
            catch
            {
                return false;
            }
        }

        static void LaunchApp(string url)
        {
            string chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe");
            if (!File.Exists(chrome)) chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe");
            if (!File.Exists(chrome)) chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe");

            string brave = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"BraveSoftware\Brave-Browser\Application\brave.exe");
            if (!File.Exists(brave)) brave = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"BraveSoftware\Brave-Browser\Application\brave.exe");

            string edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            if (!File.Exists(edge)) edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");

            string launchUrl = url;
            if (launchUrl.Contains("?")) launchUrl += "&_t=" + DateTime.UtcNow.Ticks;
            else launchUrl += "?_t=" + DateTime.UtcNow.Ticks;

            try
            {
                if (File.Exists(chrome)) Process.Start(chrome, "--app=" + launchUrl);
                else if (File.Exists(brave)) Process.Start(brave, "--app=" + launchUrl);
                else if (File.Exists(edge)) Process.Start(edge, "--app=" + launchUrl);
                else Process.Start(launchUrl);
            }
            catch
            {
                try { Process.Start(new ProcessStartInfo("cmd.exe", "/c start \"\" \"" + launchUrl + "\"") { CreateNoWindow = true, UseShellExecute = false }); }
                catch { Process.Start(launchUrl); }
            }
        }

        // ====================================================================
        // BUILT-IN NATIVE C# PRINT AGENT (PORT 8790) FOR ANY PC (PC-101 / PC-106)
        // ====================================================================
        static void KillPort8790Process()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c for /f \"tokens=5\" %P in ('netstat -ano ^| findstr /R /C:\":8790 .*LISTENING\"') do taskkill /PID %P /F";
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(1500);
                }
            }
            catch { }

            if (!Environment.MachineName.Equals("PC-106", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    ProcessStartInfo psi2 = new ProcessStartInfo();
                    psi2.FileName = "taskkill.exe";
                    psi2.Arguments = "/F /IM python.exe /IM pythonw.exe";
                    psi2.WindowStyle = ProcessWindowStyle.Hidden;
                    psi2.CreateNoWindow = true;
                    psi2.UseShellExecute = false;
                    using (Process p = Process.Start(psi2))
                    {
                        p.WaitForExit(1000);
                    }
                }
                catch { }
            }
        }

        static void StartNativePrintAgent(string baseDir)
        {
            for (int attempt = 0; attempt < 3; attempt++)
            {
                try
                {
                    KillPort8790Process();
                    Thread.Sleep(200);

                    HttpListener listener = new HttpListener();
                    listener.Prefixes.Add("http://127.0.0.1:8790/");
                    listener.Start();
                    isPrintServerRunning = true;

                    Thread listenerThread = new Thread(() =>
                    {
                        while (isPrintServerRunning)
                        {
                            try
                            {
                                HttpListenerContext ctx = listener.GetContext();
                                ThreadPool.QueueUserWorkItem(ProcessAgentRequest, new object[] { ctx, baseDir });
                            }
                            catch
                            {
                                break;
                            }
                        }
                    });
                    listenerThread.IsBackground = true;
                    listenerThread.Start();
                    return;
                }
                catch
                {
                    isPrintServerRunning = false;
                    Thread.Sleep(300);
                }
            }
        }

        static void ProcessAgentRequest(object state)
        {
            object[] args = (object[])state;
            HttpListenerContext ctx = (HttpListenerContext)args[0];
            string baseDir = (string)args[1];

            HttpListenerRequest req = ctx.Request;
            HttpListenerResponse resp = ctx.Response;

            // CORS headers
            resp.AddHeader("Access-Control-Allow-Origin", "*");
            resp.AddHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
            resp.AddHeader("Access-Control-Allow-Headers", "*");
            resp.AddHeader("Access-Control-Allow-Private-Network", "true");

            if (req.HttpMethod == "OPTIONS")
            {
                resp.StatusCode = 204;
                resp.Close();
                return;
            }

            JavaScriptSerializer js = new JavaScriptSerializer();
            string path = req.Url.AbsolutePath.ToLowerInvariant();

            try
            {
                if (req.HttpMethod == "GET" && path.StartsWith("/health"))
                {
                    List<string> pList = GetInstalledPrinters();
                    string defP = GetDefaultPrinter(pList);
                    Dictionary<string, object> cfg = LoadStationConfig(baseDir, defP);

                    string mrpP = Convert.ToString(cfg["mrp_printer"]);
                    string shipP = Convert.ToString(cfg["shipping_printer"]);
                    var mrpDims = GetPrinterDimensionsMm(mrpP);
                    var shipDims = GetPrinterDimensionsMm(shipP);
                    if (!cfg.ContainsKey("mrp_width_mm") && mrpDims.ContainsKey("width_mm") && mrpDims["width_mm"] > 10)
                    {
                        cfg["mrp_width_mm"] = mrpDims["width_mm"];
                        cfg["mrp_height_mm"] = mrpDims["height_mm"];
                    }
                    if (!cfg.ContainsKey("shipping_width_mm") && shipDims.ContainsKey("width_mm") && shipDims["width_mm"] > 10)
                    {
                        cfg["shipping_width_mm"] = shipDims["width_mm"];
                        cfg["shipping_height_mm"] = shipDims["height_mm"];
                    }

                    Dictionary<string, object> result = new Dictionary<string, object>();
                    result["ok"] = true;
                    result["app"] = "OSLC_NATIVE_CS_AGENT";
                    result["version"] = "V01.01.8";
                    result["printers"] = pList;
                    result["default_printer"] = defP;
                    result["config"] = cfg;

                    ReplyJson(resp, 200, js.Serialize(result));
                    return;
                }

                if (req.HttpMethod == "POST")
                {
                    string body = "";
                    using (StreamReader reader = new StreamReader(req.InputStream, req.ContentEncoding))
                    {
                        body = reader.ReadToEnd();
                    }

                    Dictionary<string, object> data = new Dictionary<string, object>();
                    if (!string.IsNullOrEmpty(body))
                    {
                        try { data = js.Deserialize<Dictionary<string, object>>(body) ?? new Dictionary<string, object>(); }
                        catch { }
                    }

                    if (path.StartsWith("/settings"))
                    {
                        SaveStationConfig(baseDir, data);
                        Dictionary<string, object> res = new Dictionary<string, object>();
                        res["ok"] = true;
                        res["config"] = data;
                        ReplyJson(resp, 200, js.Serialize(res));
                        return;
                    }

                    if (path.StartsWith("/print"))
                    {
                        Dictionary<string, object> res = ExecutePrintJob(data, baseDir);
                        ReplyJson(resp, 200, js.Serialize(res));
                        return;
                    }

                    if (path.StartsWith("/reprint"))
                    {
                        Dictionary<string, object> res = ExecuteReprintJob(data, baseDir);
                        ReplyJson(resp, 200, js.Serialize(res));
                        return;
                    }

                    if (path.StartsWith("/save-files"))
                    {
                        Dictionary<string, object> res = new Dictionary<string, object>();
                        res["ok"] = true;
                        ReplyJson(resp, 200, js.Serialize(res));
                        return;
                    }
                }

                resp.StatusCode = 404;
                resp.Close();
            }
            catch (Exception ex)
            {
                try
                {
                    Dictionary<string, object> err = new Dictionary<string, object>();
                    err["detail"] = ex.Message;
                    ReplyJson(resp, 400, js.Serialize(err));
                }
                catch { }
            }
        }

        static void ReplyJson(HttpListenerResponse resp, int status, string json)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            resp.StatusCode = status;
            resp.ContentType = "application/json";
            resp.ContentLength64 = bytes.Length;
            resp.OutputStream.Write(bytes, 0, bytes.Length);
            resp.OutputStream.Close();
        }

        static List<string> GetInstalledPrinters()
        {
            List<string> list = new List<string>();
            try
            {
                foreach (string p in PrinterSettings.InstalledPrinters)
                {
                    list.Add(p);
                }
                list.Sort();
            }
            catch { }
            return list;
        }

        static string GetDefaultPrinter(List<string> pList)
        {
            string defP = "";
            try
            {
                PrinterSettings ps = new PrinterSettings();
                defP = ps.PrinterName;
            }
            catch { }

            // If default printer is empty or not in installed list, check for TSC printer
            if (string.IsNullOrEmpty(defP) && pList != null)
            {
                foreach (string p in pList)
                {
                    if (p.ToUpperInvariant().Contains("TSC"))
                    {
                        return p;
                    }
                }
                if (pList.Count > 0) return pList[0];
            }
            return defP;
        }

        static string FindSmartPrinter(List<string> pList, string target, string preferred = "")
        {
            if (pList == null || pList.Count == 0) return "";
            if (!string.IsNullOrEmpty(preferred) && pList.Contains(preferred)) return preferred;

            // Filter out non-thermal / virtual / office laser printers
            List<string> thermal = new List<string>();
            foreach (string p in pList)
            {
                string u = p.ToUpperInvariant();
                if (!u.Contains("PDF") && !u.Contains("FAX") && !u.Contains("XPS") && !u.Contains("ONENOTE") && !u.Contains("CANON LBP") && !u.Contains("HP LASER"))
                {
                    thermal.Add(p);
                }
            }
            if (thermal.Count == 0) thermal = pList;

            if (target == "MRP")
            {
                string m = thermal.Find(p => p.ToUpperInvariant().Contains("244"));
                if (!string.IsNullOrEmpty(m)) return m;
                m = thermal.Find(p => p.ToUpperInvariant().Contains("TE"));
                if (!string.IsNullOrEmpty(m)) return m;
                m = thermal.Find(p => p.ToUpperInvariant().Contains("TA"));
                if (!string.IsNullOrEmpty(m)) return m;
                m = thermal.Find(p => p.ToUpperInvariant().Contains("TSC") && !p.ToUpperInvariant().Contains("310") && !p.ToUpperInvariant().Contains("DA"));
                if (!string.IsNullOrEmpty(m)) return m;
                m = thermal.Find(p => p.ToUpperInvariant().Contains("TSC"));
                if (!string.IsNullOrEmpty(m)) return m;
                m = thermal.Find(p => p.ToUpperInvariant().Contains("BARCODE") || p.ToUpperInvariant().Contains("LABEL") || p.ToUpperInvariant().Contains("THERMAL") || p.ToUpperInvariant().Contains("4BARCODE") || p.ToUpperInvariant().Contains("XPRINTER") || p.ToUpperInvariant().Contains("GPRINTER"));
                if (!string.IsNullOrEmpty(m)) return m;
                return thermal[0];
            }
            else // SHIPPING
            {
                string s = thermal.Find(p => p.ToUpperInvariant().Contains("310"));
                if (!string.IsNullOrEmpty(s)) return s;
                s = thermal.Find(p => p.ToUpperInvariant().Contains("DA"));
                if (!string.IsNullOrEmpty(s)) return s;
                s = thermal.Find(p => p.ToUpperInvariant().Contains("SHIP"));
                if (!string.IsNullOrEmpty(s)) return s;
                if (thermal.Count > 1)
                {
                    s = thermal.Find(p => !p.ToUpperInvariant().Contains("244") && !p.ToUpperInvariant().Contains("TE") && !p.ToUpperInvariant().Contains("TA"));
                    if (!string.IsNullOrEmpty(s)) return s;
                    return thermal[1];
                }
                // Single thermal printer on this station: use same printer for both!
                return thermal[0];
            }
        }

        static Dictionary<string, object> LoadStationConfig(string baseDir, string defP)
        {
            string cfgFile = Path.Combine(baseDir, "pack_station_config.json");
            Dictionary<string, object> cfg = new Dictionary<string, object>();
            List<string> pList = GetInstalledPrinters();
            string autoMrp = FindSmartPrinter(pList, "MRP");
            string autoShip = FindSmartPrinter(pList, "SHIPPING");

            cfg["mrp_printer"] = !string.IsNullOrEmpty(autoMrp) ? autoMrp : "TSC TE244";
            cfg["shipping_printer"] = !string.IsNullOrEmpty(autoShip) ? autoShip : "TSC DA310";
            cfg["retail_printer"] = cfg["mrp_printer"];
            cfg["mrp_width_mm"] = 75.0;
            cfg["mrp_height_mm"] = 50.0;
            cfg["shipping_width_mm"] = 100.0;
            cfg["shipping_height_mm"] = 150.0;

            if (File.Exists(cfgFile))
            {
                try
                {
                    JavaScriptSerializer js = new JavaScriptSerializer();
                    var loaded = js.Deserialize<Dictionary<string, object>>(File.ReadAllText(cfgFile));
                    if (loaded != null)
                    {
                        foreach (var kvp in loaded)
                        {
                            cfg[kvp.Key] = kvp.Value;
                        }
                    }
                }
                catch { }
            }

            // Verify configured printers exist on this PC
            string curMrp = Convert.ToString(cfg["mrp_printer"]).Trim();
            if (string.IsNullOrEmpty(curMrp) || (pList.Count > 0 && !pList.Contains(curMrp)))
            {
                cfg["mrp_printer"] = !string.IsNullOrEmpty(autoMrp) ? autoMrp : defP;
            }
            string curShip = Convert.ToString(cfg["shipping_printer"]).Trim();
            if (string.IsNullOrEmpty(curShip) || (pList.Count > 0 && !pList.Contains(curShip)))
            {
                cfg["shipping_printer"] = !string.IsNullOrEmpty(autoShip) ? autoShip : defP;
            }
            cfg["retail_printer"] = cfg["mrp_printer"];

            return cfg;
        }

        static void SaveStationConfig(string baseDir, Dictionary<string, object> data)
        {
            try
            {
                List<string> pList = GetInstalledPrinters();
                string defP = GetDefaultPrinter(pList);
                Dictionary<string, object> cfg = LoadStationConfig(baseDir, defP);

                if (data != null)
                {
                    foreach (var key in new string[] { "mrp_printer", "shipping_printer", "retail_printer" })
                    {
                        if (data.ContainsKey(key))
                        {
                            string val = Convert.ToString(data[key]).Trim();
                            if (!string.IsNullOrEmpty(val) && !val.Equals("SELECT PRINTER", StringComparison.OrdinalIgnoreCase))
                            {
                                cfg[key] = val;
                            }
                        }
                    }
                    if (data.ContainsKey("label_size"))
                    {
                        string lsz = Convert.ToString(data["label_size"]).ToLowerInvariant().Replace("mm", "");
                        string[] p = lsz.Split('x');
                        if (p.Length == 2)
                        {
                            float fw, fh;
                            if (float.TryParse(p[0], out fw) && float.TryParse(p[1], out fh) && fw >= 10 && fh >= 10)
                            {
                                cfg["mrp_width_mm"] = fw;
                                cfg["mrp_height_mm"] = fh;
                            }
                        }
                    }
                    foreach (var key in new string[] { "mrp_width_mm", "mrp_height_mm", "shipping_width_mm", "shipping_height_mm" })
                    {
                        if (data.ContainsKey(key))
                        {
                            float fv;
                            if (float.TryParse(Convert.ToString(data[key]), out fv) && fv >= 10)
                            {
                                cfg[key] = fv;
                            }
                        }
                    }
                }

                string cfgFile = Path.Combine(baseDir, "pack_station_config.json");
                JavaScriptSerializer js = new JavaScriptSerializer();
                File.WriteAllText(cfgFile, js.Serialize(cfg));
            }
            catch { }
        }

        static Dictionary<string, object> ExecutePrintJob(Dictionary<string, object> data, string baseDir)
        {
            string server = Convert.ToString(data["server"]).TrimEnd('/');
            string oid = Convert.ToString(data["oid"]);
            string station = Convert.ToString(data["station"]);
            string scanMode = data.ContainsKey("scan_mode") ? Convert.ToString(data["scan_mode"]).ToUpperInvariant() : "";
            string scanToken = data.ContainsKey("scan_token") ? Convert.ToString(data["scan_token"]) : "";

            bool doMrp = (scanMode != "SHIPPING_ONLY");
            bool doShipping = (scanMode != "AWB_MRP");
            if (data.ContainsKey("print_mrp") && data["print_mrp"] != null)
            {
                try { doMrp = Convert.ToBoolean(data["print_mrp"]); } catch { }
            }
            if (data.ContainsKey("print_shipping") && data["print_shipping"] != null)
            {
                try { doShipping = Convert.ToBoolean(data["print_shipping"]); } catch { }
            }

            List<string> pList = GetInstalledPrinters();
            string defP = GetDefaultPrinter(pList);
            Dictionary<string, object> cfg = LoadStationConfig(baseDir, defP);

            string mrpPrinter = "";
            string shipPrinter = "";

            if (data.ContainsKey("mrp_printer"))
            {
                string mp = Convert.ToString(data["mrp_printer"]).Trim();
                if (!string.IsNullOrEmpty(mp) && pList.Contains(mp)) mrpPrinter = mp;
            }
            if (data.ContainsKey("shipping_printer"))
            {
                string sp = Convert.ToString(data["shipping_printer"]).Trim();
                if (!string.IsNullOrEmpty(sp) && pList.Contains(sp)) shipPrinter = sp;
            }

            if (string.IsNullOrEmpty(mrpPrinter))
            {
                string cfgMrp = Convert.ToString(cfg["mrp_printer"]).Trim();
                mrpPrinter = FindSmartPrinter(pList, "MRP", cfgMrp);
            }
            if (string.IsNullOrEmpty(shipPrinter))
            {
                string cfgShip = Convert.ToString(cfg["shipping_printer"]).Trim();
                shipPrinter = FindSmartPrinter(pList, "SHIPPING", cfgShip);
            }

            float mrpW = 75.0f;
            float mrpH = 50.0f;
            if (cfg.ContainsKey("mrp_width_mm") && Convert.ToSingle(cfg["mrp_width_mm"]) >= 10)
            {
                mrpW = Convert.ToSingle(cfg["mrp_width_mm"]);
                mrpH = Convert.ToSingle(cfg["mrp_height_mm"]);
            }
            string labelSize = data.ContainsKey("label_size") ? Convert.ToString(data["label_size"]).Trim() : "";
            if (!string.IsNullOrEmpty(labelSize))
            {
                string[] parts = labelSize.ToLowerInvariant().Replace("mm", "").Split('x');
                if (parts.Length == 2)
                {
                    float pw, ph;
                    if (float.TryParse(parts[0], out pw) && float.TryParse(parts[1], out ph) && pw >= 10 && ph >= 10)
                    {
                        mrpW = pw;
                        mrpH = ph;
                    }
                }
            }
            if (data.ContainsKey("mrp_width_mm") && Convert.ToSingle(data["mrp_width_mm"]) >= 10)
                mrpW = Convert.ToSingle(data["mrp_width_mm"]);
            if (data.ContainsKey("mrp_height_mm") && Convert.ToSingle(data["mrp_height_mm"]) >= 10)
                mrpH = Convert.ToSingle(data["mrp_height_mm"]);

            float shipW = cfg.ContainsKey("shipping_width_mm") ? Convert.ToSingle(cfg["shipping_width_mm"]) : 100.0f;
            float shipH = cfg.ContainsKey("shipping_height_mm") ? Convert.ToSingle(cfg["shipping_height_mm"]) : 150.0f;
            if (data.ContainsKey("shipping_width_mm") && Convert.ToSingle(data["shipping_width_mm"]) >= 10)
                shipW = Convert.ToSingle(data["shipping_width_mm"]);
            if (data.ContainsKey("shipping_height_mm") && Convert.ToSingle(data["shipping_height_mm"]) >= 10)
                shipH = Convert.ToSingle(data["shipping_height_mm"]);

            List<string> outputs = new List<string>();

            // 1. Nano Barcode / MRP (75x50 mm) on MRP Printer (MRP BARCODE MUST ALWAYS PRINT)
            if (doMrp)
            {
                try
                {
                    string url = string.Format("{0}/api/local-print-asset/{1}/mrp?station={2}&width_mm={3}&height_mm={4}&label_size={5}",
                        server, oid, Uri.EscapeDataString(station), mrpW, mrpH, Uri.EscapeDataString(labelSize));
                    byte[] imgBytes = DownloadBytes(url);
                    using (MemoryStream ms = new MemoryStream(imgBytes))
                    using (Image img = Image.FromStream(ms))
                    {
                        SilentPrintImage(img, mrpPrinter, mrpW, mrpH);
                        outputs.Add(mrpPrinter);
                    }
                }
                catch
                {
                    try
                    {
                        if (!string.IsNullOrEmpty(defP) && defP != mrpPrinter)
                        {
                            string url = string.Format("{0}/api/local-print-asset/{1}/mrp?station={2}&width_mm={3}&height_mm={4}&label_size={5}",
                                server, oid, Uri.EscapeDataString(station), mrpW, mrpH, Uri.EscapeDataString(labelSize));
                            byte[] imgBytes = DownloadBytes(url);
                            using (MemoryStream ms = new MemoryStream(imgBytes))
                            using (Image img = Image.FromStream(ms))
                            {
                                SilentPrintImage(img, defP, mrpW, mrpH);
                                outputs.Add(defP);
                            }
                        }
                    }
                    catch { }
                }
            }

            // 2. Shipping label (100x150 mm) on Shipping Printer
            if (doShipping)
            {
                try
                {
                    string url = string.Format("{0}/api/local-print-asset/{1}/shipping?station={2}&width_mm={3}&height_mm={4}", server, oid, Uri.EscapeDataString(station), shipW, shipH);
                    byte[] imgBytes = DownloadBytes(url);
                    using (MemoryStream ms = new MemoryStream(imgBytes))
                    using (Image img = Image.FromStream(ms))
                    {
                        SilentPrintImage(img, shipPrinter, shipW, shipH);
                        outputs.Add(shipPrinter);
                    }
                }
                catch
                {
                    try
                    {
                        if (!string.IsNullOrEmpty(defP) && defP != shipPrinter)
                        {
                            string url = string.Format("{0}/api/local-print-asset/{1}/shipping?station={2}&width_mm={3}&height_mm={4}", server, oid, Uri.EscapeDataString(station), shipW, shipH);
                            byte[] imgBytes = DownloadBytes(url);
                            using (MemoryStream ms = new MemoryStream(imgBytes))
                            using (Image img = Image.FromStream(ms))
                            {
                                SilentPrintImage(img, defP, shipW, shipH);
                                outputs.Add(defP);
                            }
                        }
                    }
                    catch { }
                }
            }

            // Confirm packing on server
            try
            {
                string confirmUrl = string.Format("{0}/api/confirm-local-print/{1}", server, oid);
                string postParams = string.Format("station={0}&files={1}&printed_mrp={2}&printed_shipping={3}&scan_token={4}",
                    Uri.EscapeDataString(station),
                    Uri.EscapeDataString(string.Join("|", outputs.ToArray())),
                    doMrp ? "YES" : "NO",
                    doShipping ? "YES" : "NO",
                    Uri.EscapeDataString(scanToken));

                byte[] formBytes = Encoding.UTF8.GetBytes(postParams);
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(confirmUrl);
                req.Method = "POST";
                req.ContentType = "application/x-www-form-urlencoded";
                req.ContentLength = formBytes.Length;
                using (Stream st = req.GetRequestStream())
                {
                    st.Write(formBytes, 0, formBytes.Length);
                }
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    // Confirmed
                }
            }
            catch { }

            Dictionary<string, object> ret = new Dictionary<string, object>();
            ret["ok"] = true;
            ret["local_outputs"] = outputs;
            ret["printed_retail"] = doMrp;
            ret["printed_mrp"] = doMrp;
            ret["printed_shipping"] = doShipping;
            return ret;
        }

        static Dictionary<string, object> ExecuteReprintJob(Dictionary<string, object> data, string baseDir)
        {
            string server = Convert.ToString(data["server"]).TrimEnd('/');
            string oid = Convert.ToString(data["oid"]);
            List<string> outputs = new List<string>();

            List<string> pList = GetInstalledPrinters();
            string defP = GetDefaultPrinter(pList);
            Dictionary<string, object> cfg = LoadStationConfig(baseDir, defP);

            string mrpPrinter = "";
            string shipPrinter = "";

            if (data.ContainsKey("mrp_printer"))
            {
                string mp = Convert.ToString(data["mrp_printer"]).Trim();
                if (!string.IsNullOrEmpty(mp) && pList.Contains(mp)) mrpPrinter = mp;
            }
            if (data.ContainsKey("shipping_printer"))
            {
                string sp = Convert.ToString(data["shipping_printer"]).Trim();
                if (!string.IsNullOrEmpty(sp) && pList.Contains(sp)) shipPrinter = sp;
            }

            if (string.IsNullOrEmpty(mrpPrinter))
            {
                string cfgMrp = Convert.ToString(cfg["mrp_printer"]).Trim();
                mrpPrinter = FindSmartPrinter(pList, "MRP", cfgMrp);
            }
            if (string.IsNullOrEmpty(shipPrinter))
            {
                string cfgShip = Convert.ToString(cfg["shipping_printer"]).Trim();
                shipPrinter = FindSmartPrinter(pList, "SHIPPING", cfgShip);
            }

            float mrpW = 75.0f;
            float mrpH = 50.0f;
            if (cfg.ContainsKey("mrp_width_mm") && Convert.ToSingle(cfg["mrp_width_mm"]) >= 10)
            {
                mrpW = Convert.ToSingle(cfg["mrp_width_mm"]);
                mrpH = Convert.ToSingle(cfg["mrp_height_mm"]);
            }
            string labelSize = data.ContainsKey("label_size") ? Convert.ToString(data["label_size"]).Trim() : "";
            if (!string.IsNullOrEmpty(labelSize))
            {
                string[] parts = labelSize.ToLowerInvariant().Replace("mm", "").Split('x');
                if (parts.Length == 2)
                {
                    float pw, ph;
                    if (float.TryParse(parts[0], out pw) && float.TryParse(parts[1], out ph) && pw >= 10 && ph >= 10)
                    {
                        mrpW = pw;
                        mrpH = ph;
                    }
                }
            }
            if (data.ContainsKey("mrp_width_mm") && Convert.ToSingle(data["mrp_width_mm"]) >= 10)
                mrpW = Convert.ToSingle(data["mrp_width_mm"]);
            if (data.ContainsKey("mrp_height_mm") && Convert.ToSingle(data["mrp_height_mm"]) >= 10)
                mrpH = Convert.ToSingle(data["mrp_height_mm"]);

            float shipW = cfg.ContainsKey("shipping_width_mm") ? Convert.ToSingle(cfg["shipping_width_mm"]) : 100.0f;
            float shipH = cfg.ContainsKey("shipping_height_mm") ? Convert.ToSingle(cfg["shipping_height_mm"]) : 150.0f;
            if (data.ContainsKey("shipping_width_mm") && Convert.ToSingle(data["shipping_width_mm"]) >= 10)
                shipW = Convert.ToSingle(data["shipping_width_mm"]);
            if (data.ContainsKey("shipping_height_mm") && Convert.ToSingle(data["shipping_height_mm"]) >= 10)
                shipH = Convert.ToSingle(data["shipping_height_mm"]);

            // Fetch reprint manifest
            string manifestUrl = string.Format("{0}/api/local-reprint-manifest/{1}", server, oid);
            string mJson = Encoding.UTF8.GetString(DownloadBytes(manifestUrl));
            JavaScriptSerializer js = new JavaScriptSerializer();
            var manifest = js.Deserialize<Dictionary<string, object>>(mJson);

            if (manifest != null)
            {
                // MRP barcode to nikalvo j joye!
                bool hasMrp = true;
                bool hasShip = !manifest.ContainsKey("print_shipping") || Convert.ToBoolean(manifest["print_shipping"]);

                if (hasMrp)
                {
                    try
                    {
                        string mrpUrl = string.Format("{0}/api/local-reprint-asset/{1}/mrp?width_mm={2}&height_mm={3}&label_size={4}", server, oid, mrpW, mrpH, Uri.EscapeDataString(labelSize));
                        byte[] imgBytes = DownloadBytes(mrpUrl);
                        using (MemoryStream ms = new MemoryStream(imgBytes))
                        using (Image img = Image.FromStream(ms))
                        {
                            SilentPrintImage(img, mrpPrinter, mrpW, mrpH);
                            outputs.Add(mrpPrinter);
                        }
                    }
                    catch
                    {
                        try
                        {
                            if (!string.IsNullOrEmpty(defP) && defP != mrpPrinter)
                            {
                                string mrpUrl = string.Format("{0}/api/local-reprint-asset/{1}/mrp?width_mm={2}&height_mm={3}&label_size={4}", server, oid, mrpW, mrpH, Uri.EscapeDataString(labelSize));
                                byte[] imgBytes = DownloadBytes(mrpUrl);
                                using (MemoryStream ms = new MemoryStream(imgBytes))
                                using (Image img = Image.FromStream(ms))
                                {
                                    SilentPrintImage(img, defP, mrpW, mrpH);
                                    outputs.Add(defP);
                                }
                            }
                        }
                        catch { }
                    }
                }

                if (hasShip)
                {
                    try
                    {
                        string shipUrl = string.Format("{0}/api/local-reprint-asset/{1}/shipping?width_mm={2}&height_mm={3}", server, oid, shipW, shipH);
                        byte[] imgBytes = DownloadBytes(shipUrl);
                        using (MemoryStream ms = new MemoryStream(imgBytes))
                        using (Image img = Image.FromStream(ms))
                        {
                            SilentPrintImage(img, shipPrinter, shipW, shipH);
                            outputs.Add(shipPrinter);
                        }
                    }
                    catch
                    {
                        try
                        {
                            if (!string.IsNullOrEmpty(defP) && defP != shipPrinter)
                            {
                                string shipUrl = string.Format("{0}/api/local-reprint-asset/{1}/shipping?width_mm={2}&height_mm={3}", server, oid, shipW, shipH);
                                byte[] imgBytes = DownloadBytes(shipUrl);
                                using (MemoryStream ms = new MemoryStream(imgBytes))
                                using (Image img = Image.FromStream(ms))
                                {
                                    SilentPrintImage(img, defP, shipW, shipH);
                                    outputs.Add(defP);
                                }
                            }
                        }
                        catch { }
                    }
                }
            }

            Dictionary<string, object> ret = new Dictionary<string, object>();
            ret["ok"] = true;
            ret["local_outputs"] = outputs;
            return ret;
        }

        static byte[] DownloadBytes(string url)
        {
            using (WebClient wc = new WebClient())
            {
                wc.Headers.Add("X-Agent-Version", "V01.01.8");
                return wc.DownloadData(url);
            }
        }

        static Dictionary<string, float> GetPrinterDimensionsMm(string printerName)
        {
            Dictionary<string, float> dims = new Dictionary<string, float>();
            try
            {
                if (!string.IsNullOrEmpty(printerName))
                {
                    PrinterSettings ps = new PrinterSettings();
                    ps.PrinterName = printerName;
                    PaperSize psz = ps.DefaultPageSettings.PaperSize;
                    if (psz != null && psz.Width > 0 && psz.Height > 0)
                    {
                        dims["width_mm"] = (float)Math.Round(psz.Width * 0.254f, 1);
                        dims["height_mm"] = (float)Math.Round(psz.Height * 0.254f, 1);
                    }
                }
            }
            catch { }
            return dims;
        }

        static byte[] ImageToTspl(Image img, float wMm, float hMm, int dpi)
        {
            int wDots = (int)Math.Round(wMm * dpi / 25.4f);
            int hDots = (int)Math.Round(hMm * dpi / 25.4f);
            int wBytes = (wDots + 7) / 8;
            wDots = wBytes * 8;

            using (Bitmap bmp = new Bitmap(wDots, hDots))
            {
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.Clear(Color.White);
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.DrawImage(img, 0, 0, wDots, hDots);
                }

                byte[] rawBytes = new byte[wBytes * hDots];
                int blackDotCount = 0;
                int totalDots = wDots * hDots;
                for (int y = 0; y < hDots; y++)
                {
                    for (int byteIdx = 0; byteIdx < wBytes; byteIdx++)
                    {
                        // In TSC TSPL BITMAP protocol:
                        // bit 1 = UNHEATED WHITE PAPER (1 = clean white paper, unheated)
                        // bit 0 = HEATED BLACK DOT (0 = thermal pin fired, black ink / barcode / text)
                        byte b = 0xFF; // Start with clean white paper (11111111)
                        for (int bit = 0; bit < 8; bit++)
                        {
                            int x = byteIdx * 8 + bit;
                            if (x < wDots)
                            {
                                Color c = bmp.GetPixel(x, y);
                                // If dark pixel (ink / barcode / text), clear bit to 0 (heats thermal pin in TSPL)
                                if (c.R < 160 && c.G < 160 && c.B < 160)
                                {
                                    b &= (byte)(~(0x80 >> bit));
                                    blackDotCount++;
                                }
                            }
                        }
                        rawBytes[y * wBytes + byteIdx] = b;
                    }
                }

                // CRITICAL POLARITY GUARD: A valid shipping/MRP label is 70%-90% white paper background.
                // If black dots exceed 50% of the entire label, something was inverted,
                // so invert all bits so the background is 100% guaranteed pure white paper!
                if (blackDotCount > totalDots * 0.5)
                {
                    for (int i = 0; i < rawBytes.Length; i++)
                    {
                        rawBytes[i] = (byte)(~rawBytes[i]);
                    }
                }

                string header = string.Format(System.Globalization.CultureInfo.InvariantCulture,
                    "SIZE {0:0.#} mm, {1:0.#} mm\r\nGAP 3 mm, 0 mm\r\nDIRECTION 1\r\nCLS\r\nBITMAP 0,0,{2},{3},0,",
                    wMm, hMm, wBytes, hDots);
                byte[] headerBytes = Encoding.GetEncoding("iso-8859-1").GetBytes(header);
                byte[] footerBytes = Encoding.GetEncoding("iso-8859-1").GetBytes("\r\nPRINT 1,1\r\n");

                byte[] payload = new byte[headerBytes.Length + rawBytes.Length + footerBytes.Length];
                Buffer.BlockCopy(headerBytes, 0, payload, 0, headerBytes.Length);
                Buffer.BlockCopy(rawBytes, 0, payload, headerBytes.Length, rawBytes.Length);
                Buffer.BlockCopy(footerBytes, 0, payload, headerBytes.Length + rawBytes.Length, footerBytes.Length);
                return payload;
            }
        }

        static int GetPrinterDpi(string printerName)
        {
            string u = (printerName ?? "").ToUpperInvariant();
            if (u.Contains("310") || u.Contains("320") || u.Contains("344") || u.Contains("300") || 
                u.Contains("342") || u.Contains("345") || u.Contains("343") || u.Contains("DA3") || 
                u.Contains("TE3") || u.Contains("TA3") || u.Contains("TX3") || u.Contains("MB3") || 
                u.Contains("MH3") || u.Contains("MX3") || u.Contains("TDP-3") || u.Contains("TTP-3") || 
                u.Contains("300DPI") || u.Contains("300 DPI"))
            {
                return 300;
            }
            return 203;
        }

        static void SilentPrintImage(Image img, string printerName, float fallbackWidthMm, float fallbackHeightMm)
        {
            if (string.IsNullOrEmpty(printerName)) return;
            RawPrinterHelper.EnsurePrinterOnline(printerName);

            // 1. Direct TSPL RAW hardware printing for all Thermal / TSC label printers (Zero GDI, Zero Black Burns)
            string uName = (printerName ?? "").ToUpperInvariant();
            bool isThermal = uName.Contains("TSC") || uName.Contains("TE") || uName.Contains("TA") || uName.Contains("DA") || 
                             uName.Contains("BARCODE") || uName.Contains("LABEL") || uName.Contains("THERMAL") || 
                             uName.Contains("4BARCODE") || uName.Contains("XPRINTER") || uName.Contains("GPRINTER") ||
                             uName.Contains("GENERIC") || uName.Contains("TEXT");

            if (isThermal)
            {
                try
                {
                    int dpi = GetPrinterDpi(printerName);
                    byte[] tspl = ImageToTspl(img, fallbackWidthMm, fallbackHeightMm, dpi);
                    if (RawPrinterHelper.SendBytesToPrinter(printerName, tspl))
                    {
                        return; // Successfully printed via native TSPL with 100% white background!
                    }
                }
                catch { }
            }

            // 2. GDI PrintDocument fallback for regular office / PDF virtual printers
            try
            {
                using (PrintDocument pd = new PrintDocument())
                {
                    pd.PrinterSettings.PrinterName = printerName;
                    pd.DefaultPageSettings.PrinterSettings = pd.PrinterSettings;
                    try
                    {
                        PaperSize ps = pd.PrinterSettings.DefaultPageSettings.PaperSize;
                        if (ps != null)
                        {
                            pd.DefaultPageSettings.PaperSize = ps;
                        }
                    }
                    catch { }
                    pd.PrintController = new StandardPrintController();
                    pd.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
                    pd.OriginAtMargins = false;

                    pd.PrintPage += (s, e) =>
                    {
                        float targetW = (fallbackWidthMm / 25.4f) * 100.0f;
                        float targetH = (fallbackHeightMm / 25.4f) * 100.0f;

                        e.Graphics.Clear(Color.White);
                        e.Graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        e.Graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        e.Graphics.DrawImage(img, 0, 0, targetW, targetH);
                        e.HasMorePages = false;
                    };

                    pd.Print();
                }
            }
            catch { }
        }
    }

    public static class RawPrinterHelper
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public class DOCINFOA
        {
            [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
            [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
            [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
        }

        [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

        [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        [DllImport("winspool.Drv", EntryPoint = "SetPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool SetPrinter(IntPtr hPrinter, int level, IntPtr pPrinter, int command);

        public static void EnsurePrinterOnline(string printerName)
        {
            try
            {
                IntPtr hPrinter = IntPtr.Zero;
                if (OpenPrinter((printerName ?? "").Trim(), out hPrinter, IntPtr.Zero))
                {
                    // PRINTER_CONTROL_RESUME = 3
                    SetPrinter(hPrinter, 0, IntPtr.Zero, 3);
                    ClosePrinter(hPrinter);
                }
            }
            catch { }
        }

        public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes)
        {
            IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
            Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
            IntPtr hPrinter = IntPtr.Zero;
            DOCINFOA di = new DOCINFOA();
            di.pDocName = "RAW_TSPL_PRINT";
            di.pDataType = "RAW";
            bool success = false;

            string pName = (szPrinterName ?? "").Trim();
            if (OpenPrinter(pName, out hPrinter, IntPtr.Zero))
            {
                if (StartDocPrinter(hPrinter, 1, di))
                {
                    if (StartPagePrinter(hPrinter))
                    {
                        int dwWritten = 0;
                        success = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);
                        EndPagePrinter(hPrinter);
                    }
                    EndDocPrinter(hPrinter);
                }
                ClosePrinter(hPrinter);
            }
            Marshal.FreeCoTaskMem(pUnmanagedBytes);
            return success;
        }

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern IntPtr CreateFile(string lpFileName, uint dwDesiredAccess, uint dwShareMode, IntPtr lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, IntPtr hTemplateFile);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool WriteFile(IntPtr hFile, byte[] lpBuffer, uint nNumberOfBytesToWrite, out uint lpNumberOfBytesWritten, IntPtr lpOverlapped);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool CloseHandle(IntPtr hObject);

        public static bool SendBytesToUsb(string devicePath, byte[] pBytes)
        {
            try
            {
                IntPtr h = CreateFile(devicePath, 0xC0000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
                if (h.ToInt64() != -1 && h != IntPtr.Zero)
                {
                    uint written = 0;
                    bool ok = WriteFile(h, pBytes, (uint)pBytes.Length, out written, IntPtr.Zero);
                    CloseHandle(h);
                    return ok;
                }
            }
            catch { }
            return false;
        }
    }
}
