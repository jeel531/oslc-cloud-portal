// OSLC Cloud Master Hub - Dynamic Frontend Script with PWA & Auto-Update
document.addEventListener("DOMContentLoaded", () => {
  const btnCopyShare = document.getElementById("btnCopyShare");
  const btnShareWhatsApp = document.getElementById("btnShareWhatsApp");
  const dbStatusBadge = document.getElementById("dbStatusBadge");
  const syncStatusBadge = document.getElementById("syncStatusBadge");
  const syncStatusText = document.getElementById("syncStatusText");
  const userProjectsGrid = document.getElementById("userProjectsGrid");
  const btnRefreshProjects = document.getElementById("btnRefreshProjects");
  const pwaInstallBanner = document.getElementById("pwaInstallBanner");
  const btnInstallPwa = document.getElementById("btnInstallPwa");
  const apkDownloadsGrid = document.getElementById("apkDownloadsGrid");

  // ==========================================
  // 1. PWA REGISTRATION & AUTO-UPDATE ENGINE
  // ==========================================
  let deferredPrompt = null;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New update available! Auto-updating...');
            // New version installed: notify user
            const updateToast = document.createElement('div');
            updateToast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#22c55e;color:#fff;padding:12px 20px;border-radius:10px;font-weight:700;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.5);';
            updateToast.innerText = '⚡ નવું અપડેટ આવી ગયું છે! પેજ રિફ્રેશ થઈ રહ્યું છે...';
            document.body.appendChild(updateToast);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        });
      });
    }).catch((err) => {
      console.log('[PWA] Service Worker registration failed:', err);
    });
  }

  // Handle Chrome / Mobile Install Prompt (Play Store experience)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBanner) {
      pwaInstallBanner.style.display = 'flex';
    }
  });

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
          if (pwaInstallBanner) pwaInstallBanner.style.display = 'none';
        }
        deferredPrompt = null;
      } else {
        alert("Chrome બ્રાઉઝરમાં ઉપર જમણી બાજુ ૩ ટપકાં (Three Dots) પર ક્લિક કરીને 'Add to Home screen' અથવા 'Install app' સિલેક્ટ કરો.");
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App successfully installed on device!');
    if (pwaInstallBanner) pwaInstallBanner.style.display = 'none';
  });

  // ==========================================
  // 2. SHARING & COPY SHORTCUTS
  // ==========================================
  if (btnCopyShare) {
    btnCopyShare.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.origin);
        btnCopyShare.innerText = "✅ લિંક કોપી થઈ ગઈ!";
        setTimeout(() => {
          btnCopyShare.innerText = "📋 લિંક કોપી કરો";
        }, 2500);
      } catch (e) {
        prompt("લિંક કોપી કરો:", window.location.origin);
      }
    });
  }

  if (btnShareWhatsApp) {
    btnShareWhatsApp.addEventListener("click", () => {
      const url = window.location.origin;
      const text = encodeURIComponent(
        `🏭 *OM SAI LATEST CREATION - Cloud Master Hub*\n\nતમામ રિપોર્ટ્સ અને પ્રોજેક્ટ્સ લાઈવ જોવા માટે નીચેની લિંક ખોલો:\n👉 ${url}\n\n(૨૪ કલાક મોબાઈલ અને કમ્પ્યુટરમાં ચાલુ રહેશે - કોઈ પણ APK વગર સીધું ચાલશે!)`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    });
  }

  if (btnRefreshProjects) {
    btnRefreshProjects.addEventListener("click", () => {
      btnRefreshProjects.innerText = "⏳ લોડિંગ...";
      loadUserProjects().finally(() => {
        setTimeout(() => {
          btnRefreshProjects.innerText = "🔄 રિફ્રેશ કરો";
        }, 800);
      });
    });
  }

  // ==========================================
  // 3. HEALTH & STATUS ENGINE
  // ==========================================
  async function checkHubHealth() {
    try {
      const res = await fetch("/api/hub-status");
      if (res.ok) {
        const data = await res.json();
        if (dbStatusBadge) {
          dbStatusBadge.innerHTML = '<span class="dot"></span><span>DigiCorp SQL: Connected</span>';
          dbStatusBadge.className = "badge badge-success";
        }
      }
    } catch (err) {
      if (dbStatusBadge) {
        dbStatusBadge.innerHTML = '<span class="dot"></span><span>Connecting...</span>';
        dbStatusBadge.className = "badge badge-info";
      }
    }
  }

  async function checkSyncStatus() {
    try {
      const res = await fetch("/api/sync-status");
      if (res.ok) {
        const data = await res.json();
        if (syncStatusBadge && syncStatusText) {
          if (data.status === "syncing") {
            syncStatusBadge.className = "badge badge-warning";
            syncStatusText.innerText = "Auto-Cloud: Uploading...";
          } else if (data.status === "synced") {
            syncStatusBadge.className = "badge badge-success";
            syncStatusText.innerText = `Auto-Cloud: Synced (${data.last_sync || "Just now"})`;
          } else {
            syncStatusBadge.className = "badge badge-success";
            syncStatusText.innerText = "Auto-Cloud: 24x7 Active";
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // ==========================================
  // 4. USER PROJECTS (AUTO-DISCOVERED)
  // ==========================================
  async function loadUserProjects() {
    if (!userProjectsGrid) return;
    try {
      const res = await fetch("/api/user-projects");
      if (!res.ok) throw new Error("Failed to fetch user projects");
      const data = await res.json();
      const projects = data.projects || [];

      if (projects.length === 0) {
        userProjectsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; background: rgba(30, 41, 59, 0.4); border: 2px dashed rgba(255, 255, 255, 0.15); border-radius: 16px; padding: 32px; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">📁</div>
            <h3 style="font-size: 18px; color: #f1f5f9; margin-bottom: 8px;">હજુ સુધી કોઈ નવો પ્રોજેક્ટ મૂકેલ નથી</h3>
            <p style="color: #94a3b8; font-size: 14px; max-width: 500px; margin: 0 auto 16px auto; line-height: 1.5;">
              તમારા Desktop પરના <strong>'📁_NAVA_PROJECT_AHI_BANAVO'</strong> ફોલ્ડરમાં કોઈપણ પ્રોજેક્ટ અથવા HTML ફાઈલ મૂકો – તે તરત જ અહીં આપોઆપ લાઈવ થઈ જશે અને સર્વર પર ચડી જશે!
            </p>
          </div>
        `;
        return;
      }

      const colors = ["card-emerald", "card-blue", "card-purple", "card-amber"];
      const icons = ["⚡", "🚀", "💡", "🛠️", "🎯", "🌐"];

      let html = "";
      projects.forEach((proj, idx) => {
        const colorClass = colors[idx % colors.length];
        const icon = icons[idx % icons.length];
        html += `
          <a href="${proj.url}" class="card ${colorClass}" style="text-decoration:none;">
            <div class="card-icon">${icon}</div>
            <div class="card-body">
              <div class="card-tag">નવો કસ્ટમ પ્રોજેક્ટ</div>
              <h3 class="card-title">${proj.title}</h3>
              <p class="card-desc">ફોલ્ડર: <code>${proj.folder}</code> • અપડેટ: ${proj.updated_at}</p>
              <div class="card-footer" style="margin-top: 16px;">
                <span class="btn-open">પ્રોજેક્ટ ખોલો →</span>
                <span class="status-indicator">Auto-Live</span>
              </div>
            </div>
          </a>
        `;
      });

      userProjectsGrid.innerHTML = html;
    } catch (err) {
      console.error(err);
      userProjectsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; color: #ef4444; padding: 16px; text-align: center;">
          પ્રોજેક્ટ્સ લોડ કરવામાં સમસ્યા આવી.
        </div>
      `;
    }
  }

  // ==========================================
  // 5. ANDROID APK DOWNLOADS ENGINE
  // ==========================================
  async function loadApks() {
    if (!apkDownloadsGrid) return;
    try {
      const res = await fetch("/api/apks");
      if (!res.ok) return;
      const data = await res.json();
      const apks = data.apks || [];

      if (apks.length === 0) {
        apkDownloadsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; color: #94a3b8; padding: 16px; text-align: center;">
            કોઈ APK ફાઈલ મળી નથી.
          </div>
        `;
        return;
      }

      let html = "";
      apks.forEach((apk) => {
        html += `
          <a href="${apk.url}" download class="card card-emerald" style="text-decoration:none;">
            <div class="card-icon">🤖</div>
            <div class="card-body">
              <div class="card-tag">Android APK (${apk.size_mb} MB)</div>
              <h3 class="card-title">${apk.title}</h3>
              <p class="card-desc">મોબાઈલ માટે ડાયરેક્ટ ઇન્સ્ટોલેશન ફાઈલ (${apk.name}).</p>
              <div class="card-footer" style="margin-top: 16px;">
                <span class="btn-open">📥 ડાઉનલોડ કરો (${apk.size_mb} MB)</span>
                <span class="status-indicator">Direct APK</span>
              </div>
            </div>
          </a>
        `;
      });
      apkDownloadsGrid.innerHTML = html;
    } catch (e) {
      console.error(e);
    }
  }

  // Initial runs
  checkHubHealth();
  checkSyncStatus();
  loadUserProjects();
  loadApks();

  // Periodic polls
  setInterval(checkHubHealth, 30000);
  setInterval(checkSyncStatus, 10000);
  setInterval(loadUserProjects, 15000);
});
