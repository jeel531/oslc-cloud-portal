// OSLC Cloud Master Hub - Frontend Script
document.addEventListener("DOMContentLoaded", () => {
  const btnCopyShare = document.getElementById("btnCopyShare");
  const btnShareWhatsApp = document.getElementById("btnShareWhatsApp");
  const dbStatusBadge = document.getElementById("dbStatusBadge");

  // Copy URL
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
        `🏭 *OM SAI LATEST CREATION - Cloud Master Hub*\n\nતમામ રિપોર્ટ્સ અને ડેશબોર્ડ્સ લાઈવ જોવા માટે નીચેની લિંક ખોલો:\n👉 ${url}\n\n(૨૪ કલાક મોબાઈલ અને કમ્પ્યુટરમાં ચાલુ રહેશે)`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
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

  checkHubHealth();
  setInterval(checkHubHealth, 30000);
});
