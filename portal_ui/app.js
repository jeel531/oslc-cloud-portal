// OSLC Cloud Master Hub - Dynamic Frontend Script
document.addEventListener("DOMContentLoaded", () => {
  const btnCopyShare = document.getElementById("btnCopyShare");
  const btnShareWhatsApp = document.getElementById("btnShareWhatsApp");
  const dbStatusBadge = document.getElementById("dbStatusBadge");
  const syncStatusBadge = document.getElementById("syncStatusBadge");
  const syncStatusText = document.getElementById("syncStatusText");
  const userProjectsGrid = document.getElementById("userProjectsGrid");
  const btnRefreshProjects = document.getElementById("btnRefreshProjects");

  // Copy Main URL
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

  // Share on WhatsApp
  if (btnShareWhatsApp) {
    btnShareWhatsApp.addEventListener("click", () => {
      const url = window.location.origin;
      const text = encodeURIComponent(
        `🏭 *OM SAI LATEST CREATION - Cloud Master Hub*\n\nતમામ રિપોર્ટ્સ અને પ્રોજેક્ટ્સ લાઈવ જોવા માટે નીચેની લિંક ખોલો:\n👉 ${url}\n\n(૨૪ કલાક મોબાઈલ અને કમ્પ્યુટરમાં ચાલુ રહેશે)`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    });
  }

  // Refresh Projects Button
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

  // Check Backend Status
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

  // Check Auto-Sync Status
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

  // Load and Render Auto-Discovered User Projects
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

  // Initial runs
  checkHubHealth();
  checkSyncStatus();
  loadUserProjects();

  // Periodic polls
  setInterval(checkHubHealth, 30000);
  setInterval(checkSyncStatus, 10000);
  setInterval(loadUserProjects, 15000);
});
