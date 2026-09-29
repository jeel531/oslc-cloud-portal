/**
 * OSLC Godaun Shelf Barcode Print Software - Frontend Application Logic
 */

// Application State
const state = {
  items: [],              // [{ shelf: 'AAA701', rack: 'AAA01', num: 701 }, ...]
  currentPage: 1,
  perPage: 20,            // 20 barcodes per A4 page by default
  layoutType: '2x10',     // '2x10' (20/page), '2x5' (10/page), or '1x10'
  orderDirection: 'row',  // 'row' (1,2/3,4) or 'col' (1-10/11-20)
  showBorder: true,
  showRack: true,
  barcodeHeight: 34,
  fontSize: 10.5,
  zoom: 0.85,
  previewMode: 'single',  // 'single' or 'all'
  digiFetchedItems: []
};

// Initialization on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  checkDbStatus();
  loadDigiPrefixes();
  setupEventListeners();

  // Automatically load DigiBizz original PDF on startup!
  loadSamplePdf(true);
});

// Setup Event Listeners
function setupEventListeners() {
  document.getElementById('btnGenerateRange').addEventListener('click', generateRangeFromInputs);
  document.getElementById('btnFetchDigi').addEventListener('click', fetchDigiShelves);
  document.getElementById('btnApplyDigiSelection').addEventListener('click', applyDigiSelection);
  const btnLoadPdf = document.getElementById('btnReloadSamplePdf') || document.getElementById('btnLoadSamplePdf');
  if (btnLoadPdf) {
    btnLoadPdf.addEventListener('click', () => loadSamplePdf(false));
  }
  document.getElementById('btnPrintA4')?.addEventListener('click', triggerA4Print);
  document.getElementById('btnDownloadPdf')?.addEventListener('click', triggerPdfDownload);

  // Checkbox select all in Digi table
  document.getElementById('checkSelectAllDigi').addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('.digi-row-chk').forEach(cb => cb.checked = checked);
    updateDigiSelectedCount();
  });

  // Dropzone setup
  const dropzone = document.getElementById('pdfDropzone');
  const fileInput = document.getElementById('pdfFileInput');
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadPdfFile(e.target.files[0]);
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '#cbd5e1';
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#cbd5e1';
    if (e.dataTransfer.files.length > 0) {
      uploadPdfFile(e.dataTransfer.files[0]);
    }
  });

  // Enter key listeners on inputs for instant generation
  ['rangePrefix', 'rangeFrom', 'rangeTo', 'rangeRack'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') generateRangeFromInputs();
      });
    }
  });

  // Keyboard shortcut: Ctrl + P for custom print
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      triggerA4Print();
    }
  });
}

// Quick Preset Helper (1-click instant fill & generate)
window.applyQuickPreset = function(prefix, from, to, rack) {
  document.getElementById('rangePrefix').value = prefix;
  document.getElementById('rangeFrom').value = from;
  document.getElementById('rangeTo').value = to;
  document.getElementById('rangeRack').value = rack;
  generateRangeFromInputs();
};

// Check DigiBizz DB Status
async function checkDbStatus() {
  const badge = document.getElementById('dbStatusBadge');
  const txt = document.getElementById('dbStatusText');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.db_connected) {
      badge.className = 'db-status-badge connected';
      txt.textContent = 'DigiBizz લાઈવ (કનેક્ટેડ)';
    } else {
      badge.className = 'db-status-badge';
      txt.textContent = 'DigiBizz ઓફલાઈન';
    }
  } catch (err) {
    badge.className = 'db-status-badge';
    txt.textContent = 'સર્વર ઓફલાઈન';
  }
}

// Load Distinct Prefixes from DigiBizz
async function loadDigiPrefixes() {
  const select = document.getElementById('digiPrefixSelect');
  try {
    const res = await fetch('/api/prefixes');
    const data = await res.json();
    if (data.success && data.prefixes.length > 0) {
      select.innerHTML = '<option value="">-- સિરીઝ પસંદ કરો (બધા) --</option>';
      data.prefixes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.prefix;
        opt.textContent = `${p.prefix} (${p.count.toLocaleString()} શેલ્ફ)`;
        if (p.prefix === 'AAA') opt.selected = true;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    select.innerHTML = '<option value="AAA">AAA</option><option value="BBB">BBB</option><option value="ZA">ZA</option><option value="F">F</option>';
  }
}

// Quick Chip helper
window.setQuickPrefix = function(prefix) {
  document.getElementById('rangePrefix').value = prefix;
  if (prefix === 'AAA') {
    document.getElementById('rangeRack').value = 'AAA01';
  } else if (prefix === 'F') {
    document.getElementById('rangeRack').value = 'F1';
  }
};

// Switch Sidebar Tabs
window.switchTab = function(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  if (tabName === 'range') {
    document.getElementById('tabBtnRange').classList.add('active');
    document.getElementById('tabContentRange').classList.add('active');
  } else if (tabName === 'digi') {
    document.getElementById('tabBtnDigi').classList.add('active');
    document.getElementById('tabContentDigi').classList.add('active');
  } else if (tabName === 'pdf') {
    document.getElementById('tabBtnPdf').classList.add('active');
    document.getElementById('tabContentPdf').classList.add('active');
  }
};

// TAB 1: Generate Linear Range from Inputs
async function generateRangeFromInputs() {
  const prefix = document.getElementById('rangePrefix').value.trim();
  const fromNum = parseInt(document.getElementById('rangeFrom').value, 10) || 1;
  const toNum = parseInt(document.getElementById('rangeTo').value, 10) || 10;
  const rack = document.getElementById('rangeRack').value.trim();
  const zeroPad = parseInt(document.getElementById('rangeZeroPad').value, 10) || 0;

  try {
    const res = await fetch('/api/generate-range', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefix: prefix,
        from_num: fromNum,
        to_num: toNum,
        zero_pad: zeroPad,
        rack_code: rack,
        step: 1
      })
    });
    const data = await res.json();
    if (data.success) {
      state.items = data.items;
      state.currentPage = 1;
      renderPreview();
    }
  } catch (err) {
    // Client-side fallback
    const items = [];
    const start = Math.min(fromNum, toNum);
    const end = Math.max(fromNum, toNum);
    for (let i = start; i <= end; i++) {
      const numStr = zeroPad > 0 ? String(i).padStart(zeroPad, '0') : String(i);
      items.append({
        shelf: `${prefix}${numStr}`,
        rack: rack,
        num: i
      });
    }
    state.items = items;
    state.currentPage = 1;
    renderPreview();
  }
}

// TAB 2: Fetch Shelves from DigiBizz
async function fetchDigiShelves() {
  const prefix = document.getElementById('digiPrefixSelect').value;
  const fromNum = document.getElementById('digiFromNum').value;
  const toNum = document.getElementById('digiToNum').value;
  const search = document.getElementById('digiSearchInput').value.trim();

  let url = `/api/shelves?`;
  if (prefix) url += `prefix=${encodeURIComponent(prefix)}&`;
  if (fromNum) url += `from_num=${encodeURIComponent(fromNum)}&`;
  if (toNum) url += `to_num=${encodeURIComponent(toNum)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  url += `limit=3000`;

  const btn = document.getElementById('btnFetchDigi');
  btn.textContent = '⏳ શોધી રહ્યું છે...';
  btn.disabled = true;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      state.digiFetchedItems = data.items;
      displayDigiTable(data.items);
    } else {
      alert('ભૂલ: ' + (data.error || 'Failed to fetch'));
    }
  } catch (err) {
    alert('સર્વર એરર: ' + err.message);
  } finally {
    btn.textContent = '🔍 DigiBizz માંથી શોધો';
    btn.disabled = false;
  }
}

function displayDigiTable(items) {
  const container = document.getElementById('digiTableContainer');
  const tbody = document.getElementById('digiTableBody');
  const countBadge = document.getElementById('digiResultCountBadge');
  const applyBtn = document.getElementById('btnApplyDigiSelection');

  tbody.innerHTML = '';
  countBadge.textContent = `${items.length} મળ્યા`;

  if (items.length === 0) {
    container.style.display = 'block';
    applyBtn.style.display = 'none';
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#94a3b8; padding:20px;">કોઈ રેકોર્ડ મળ્યો નથી</td></tr>';
    return;
  }

  container.style.display = 'block';
  applyBtn.style.display = 'block';

  items.slice(0, 500).forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="digi-row-chk" data-idx="${idx}" checked></td>
      <td><strong>${item.shelf}</strong></td>
      <td style="color:#64748b;">${item.rack || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  if (items.length > 500) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" style="text-align:center; color:#64748b; font-style:italic;">... પ્રથમ 500 રેકોર્ડ દર્શાવેલ છે (કુલ ${items.length})</td>`;
    tbody.appendChild(tr);
  }
}

function updateDigiSelectedCount() {
  const total = document.querySelectorAll('.digi-row-chk:checked').length;
  document.getElementById('digiResultCountBadge').textContent = `${total} સિલેક્ટ`;
}

function applyDigiSelection() {
  const selected = [];
  document.querySelectorAll('.digi-row-chk:checked').forEach(cb => {
    const idx = parseInt(cb.dataset.idx, 10);
    if (!isNaN(idx) && state.digiFetchedItems[idx]) {
      selected.push(state.digiFetchedItems[idx]);
    }
  });

  if (selected.length === 0) {
    alert('કૃપા કરીને ઓછામાં ઓછો ૧ બારકોડ સિલેક્ટ કરો.');
    return;
  }

  state.items = selected;
  state.currentPage = 1;
  renderPreview();
}

state.allPdfItems = [];

// TAB 1: Load Sample PDF (vinay bhai fb godaun.pdf)
async function loadSamplePdf(silent = false) {
  const btn = document.getElementById('btnReloadSamplePdf');
  if (btn) btn.textContent = '⏳';

  try {
    const res = await fetch('/api/load-sample-pdf');
    const data = await res.json();
    if (data.success) {
      state.allPdfItems = data.items;
      state.items = data.items;
      state.currentPage = 1;

      const lblName = document.getElementById('lblLoadedPdfName');
      const lblStats = document.getElementById('lblLoadedPdfStats');
      if (lblName) lblName.textContent = data.filename;
      if (lblStats) lblStats.textContent = `${data.count} બારકોડ સળંગ લાઈનમાં ૨૦/પેજ સેટ`;

      renderPreview();
      if (!silent) {
        alert(`સફળતા! "${data.filename}" માંથી ${data.count} બારકોડ સળંગ લાઈનમાં ૨૦-પ્રતિ-પેજ સેટ થઈ ગયા છે.`);
      }
    } else {
      if (!silent) alert('ભૂલ: ' + (data.error || 'Failed'));
    }
  } catch (err) {
    if (!silent) alert('સર્વર એરર: ' + err.message);
  } finally {
    if (btn) btn.textContent = '🔄';
  }
}

// Range filter from loaded PDF
window.applyPdfRangeFilter = function() {
  const fromVal = (document.getElementById('pdfFilterFrom')?.value || '').trim().toUpperCase();
  const toVal = (document.getElementById('pdfFilterTo')?.value || '').trim().toUpperCase();

  if (!state.allPdfItems || state.allPdfItems.length === 0) {
    alert('પહેલાં PDF લોડ કરો.');
    return;
  }

  if (!fromVal && !toVal) {
    resetPdfFilter();
    return;
  }

  const fromNumM = fromVal.match(/\d+/);
  const toNumM = toVal.match(/\d+/);
  const fromNum = fromNumM ? parseInt(fromNumM[0], 10) : null;
  const toNum = toNumM ? parseInt(toNumM[0], 10) : null;

  const filtered = state.allPdfItems.filter(it => {
    const code = (it.shelf || '').toUpperCase();
    if (fromVal && toVal && !fromNum && !toNum) {
      return code >= fromVal && code <= toVal;
    }
    const num = it.num;
    if (fromNum !== null && num < fromNum) return false;
    if (toNum !== null && num > toNum) return false;
    return true;
  });

  if (filtered.length === 0) {
    alert('આ રેન્જમાં કોઈ બારકોડ મળ્યો નથી.');
    return;
  }

  state.items = filtered;
  state.currentPage = 1;
  const lblStats = document.getElementById('lblLoadedPdfStats');
  if (lblStats) lblStats.textContent = `${filtered.length} બારકોડ (રેન્જ ફિલ્ટર થયેલ) ૨૦/પેજ સેટ`;
  renderPreview();
};

window.resetPdfFilter = function() {
  const elFrom = document.getElementById('pdfFilterFrom');
  const elTo = document.getElementById('pdfFilterTo');
  if (elFrom) elFrom.value = '';
  if (elTo) elTo.value = '';

  if (state.allPdfItems && state.allPdfItems.length > 0) {
    state.items = state.allPdfItems;
    state.currentPage = 1;
    const lblStats = document.getElementById('lblLoadedPdfStats');
    if (lblStats) lblStats.textContent = `${state.allPdfItems.length} બારકોડ સળંગ લાઈનમાં ૨૦/પેજ સેટ`;
    renderPreview();
  }
};

// Upload Custom DigiBizz PDF
async function uploadPdfFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const dropzone = document.getElementById('pdfDropzone');
  dropzone.innerHTML = `<div class="dropzone-icon">⏳</div><strong>${file.name} પ્રોસેસ થઈ રહી છે...</strong>`;

  try {
    const res = await fetch('/api/upload-pdf', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      state.allPdfItems = data.items;
      state.items = data.items;
      state.currentPage = 1;
      const lblName = document.getElementById('lblLoadedPdfName');
      const lblStats = document.getElementById('lblLoadedPdfStats');
      if (lblName) lblName.textContent = data.filename;
      if (lblStats) lblStats.textContent = `${data.count} બારકોડ સળંગ લાઈનમાં ૨૦/પેજ સેટ`;
      renderPreview();
      dropzone.innerHTML = `<div class="dropzone-icon">✓</div><strong>${data.count} બારકોડ સફળતાપૂર્વક લોડ થયા!</strong><p style="font-size:11px;color:#059669;">1, 2, 3... લીટીમાં ૨૦/પેજ ગોઠવી દીધા</p>`;
    } else {
      alert('ભૂલ: ' + (data.error || 'Failed to process PDF'));
      resetDropzone();
    }
  } catch (err) {
    alert('સર્વર એરર: ' + err.message);
    resetDropzone();
  }
}

function resetDropzone() {
  const dropzone = document.getElementById('pdfDropzone');
  dropzone.innerHTML = `
    <div class="dropzone-icon" style="font-size: 22px;">📁</div>
    <strong style="font-size: 12px;">અન્ય કોઈ નવી DigiBizz PDF અપલોડ કરો</strong>
    <p style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">PDF પસંદ કરવા અહીં ક્લિક કરો</p>
    <input type="file" id="pdfFileInput" accept="application/pdf" style="display: none;">
  `;
}

// Settings Update
window.updateLayoutSetting = function() {
  const layout = document.querySelector('input[name="layoutType"]:checked').value;
  const order = document.querySelector('input[name="orderDirection"]:checked').value;
  state.layoutType = layout;
  state.orderDirection = order;

  if (layout === '2x10') {
    state.perPage = 20;
    state.barcodeHeight = 34;
    state.fontSize = 10.5;
    document.getElementById('sliderBarcodeHeight').value = 34;
    document.getElementById('sliderFontSize').value = 10.5;
    document.getElementById('lblBarcodeHeight').textContent = '34px';
    document.getElementById('lblFontSize').textContent = '10.5pt';
  } else if (layout === '2x5') {
    state.perPage = 10;
    state.barcodeHeight = 50;
    state.fontSize = 13.5;
    document.getElementById('sliderBarcodeHeight').value = 50;
    document.getElementById('sliderFontSize').value = 13.5;
    document.getElementById('lblBarcodeHeight').textContent = '50px';
    document.getElementById('lblFontSize').textContent = '13.5pt';
  } else {
    state.perPage = 10;
    state.barcodeHeight = 40;
    state.fontSize = 12.0;
  }

  const perPageEl = document.getElementById('perPageDisplay');
  if (perPageEl) perPageEl.textContent = state.perPage;

  renderPreview();
};

window.updateSizeSliders = function() {
  const h = document.getElementById('sliderBarcodeHeight').value;
  const f = document.getElementById('sliderFontSize').value;
  state.barcodeHeight = parseFloat(h);
  state.fontSize = parseFloat(f);
  document.getElementById('lblBarcodeHeight').textContent = `${h}px`;
  document.getElementById('lblFontSize').textContent = `${f}pt`;
  renderPreview();
};

// Zoom Controls
window.setZoom = function(val) {
  state.zoom = val;
  const sheets = document.querySelectorAll('.a4-paper-sheet');
  sheets.forEach(s => s.style.transform = `scale(${val})`);
};

// Preview Mode Switch (Single vs All Pages)
window.switchPreviewMode = function(mode) {
  state.previewMode = mode;
  renderPreview();
};

// Page Navigation
window.navigatePage = function(delta) {
  const totalPages = Math.max(1, Math.ceil(state.items.length / state.perPage));
  const newPage = state.currentPage + delta;
  if (newPage >= 1 && newPage <= totalPages) {
    state.currentPage = newPage;
    renderPreview();
  }
};

window.jumpToPage = function(pageStr) {
  const page = parseInt(pageStr, 10);
  if (!isNaN(page)) {
    state.currentPage = page;
    renderPreview();
  }
};

// ==========================================================================
// RENDER LIVE A4 PREVIEW CANVAS
// ==========================================================================
function renderPreview() {
  const wrap = document.getElementById('previewCanvasWrap');
  const countBadge = document.getElementById('totalBarcodesCount');
  const pagesBadge = document.getElementById('totalPagesCount');
  const pageInd = document.getElementById('pageIndicator');
  const jumpSel = document.getElementById('jumpPageSelect');
  const showCutLines = document.getElementById('toggleCutLines').checked;
  const showRack = document.getElementById('toggleShowRack').checked;

  const totalItems = state.items.length;
  countBadge.textContent = totalItems;

  const totalPages = Math.max(1, Math.ceil(totalItems / state.perPage));
  pagesBadge.textContent = totalPages;

  if (state.currentPage > totalPages) state.currentPage = totalPages;

  pageInd.textContent = `પેજ ${state.currentPage} of ${totalPages}`;

  // Populate Jump Select
  jumpSel.innerHTML = '';
  for (let p = 1; p <= totalPages; p++) {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = `પેજ ${p}`;
    if (p === state.currentPage) opt.selected = true;
    jumpSel.appendChild(opt);
  }

  // Update Prev/Next buttons
  document.getElementById('btnPrevPage').disabled = (state.currentPage <= 1);
  document.getElementById('btnNextPage').disabled = (state.currentPage >= totalPages);

  if (totalItems === 0) {
    wrap.innerHTML = `
      <div class="empty-preview-state">
        <div class="icon">📦</div>
        <h3>કોઈ બારકોડ લોડ થયેલ નથી</h3>
        <p>ડાબી બાજુથી રેન્જ આપો અથવા "vinay bhai fb godaun.pdf" લોડ કરો.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = '';

  // Determine pages to render
  let pagesToRender = [];
  if (state.previewMode === 'all') {
    for (let p = 1; p <= totalPages; p++) pagesToRender.push(p);
  } else {
    pagesToRender.push(state.currentPage);
  }

  // Barcodes generation queue for JsBarcode
  const barcodeQueue = [];

  pagesToRender.forEach(pageNum => {
    const pageSheet = document.createElement('div');
    pageSheet.className = 'a4-paper-sheet';
    pageSheet.style.transform = `scale(${state.zoom})`;

    const grid = document.createElement('div');
    if (state.layoutType === '2x10') {
      grid.className = 'labels-grid-2x10';
    } else if (state.layoutType === '1x10') {
      grid.className = 'labels-grid-1x10';
    } else {
      grid.className = 'labels-grid-2x5';
    }

    // Get items for this page
    const startIdx = (pageNum - 1) * state.perPage;
    const pageItems = state.items.slice(startIdx, startIdx + state.perPage);

    // Arrange items according to ordering direction
    let displayItems = [];
    const rows = Math.floor(state.perPage / 2); // 10 for 2x10, 5 for 2x5
    if (state.orderDirection === 'col' && (state.layoutType === '2x10' || state.layoutType === '2x5')) {
      // Column-wise arrangement (left col then right col)
      displayItems = new Array(state.perPage).fill(null);
      const leftCol = pageItems.slice(0, rows);
      const rightCol = pageItems.slice(rows, rows * 2);
      for (let r = 0; r < rows; r++) {
        if (r < leftCol.length) displayItems[r * 2 + 0] = leftCol[r];
        if (r < rightCol.length) displayItems[r * 2 + 1] = rightCol[r];
      }
    } else {
      // Row-wise linear (1, 2 / 3, 4 / 5, 6...)
      displayItems = pageItems;
    }

    displayItems.forEach((item, cellIdx) => {
      if (!item) {
        // Empty slot to maintain grid alignment
        const emptyCell = document.createElement('div');
        emptyCell.className = 'barcode-card no-border';
        grid.appendChild(emptyCell);
        return;
      }

      const card = document.createElement('div');
      card.className = `barcode-card ${showCutLines ? '' : 'no-border'}`;

      const seqGlobal = startIdx + cellIdx + 1;
      const svgId = `bc_${pageNum}_${cellIdx}`;

      // Text below barcode: SHELF_CODE-(Rack : RACK_CODE)
      const shelf = item.shelf || '';
      const rack = item.rack || '';
      let textContent = shelf;
      if (showRack && rack) {
        textContent = `${shelf}-(Rack : ${rack})`;
      }

      if (item.thumbnail_b64) {
        card.innerHTML = `
          <span class="card-seq-num no-print">#${seqGlobal}</span>
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img src="data:image/png;base64,${item.thumbnail_b64}" class="digibizz-label-img" alt="${shelf}" style="width: 95%; max-height: 23.5mm; object-fit: contain; display: block;" />
          </div>
        `;
      } else {
        card.innerHTML = `
          <span class="card-seq-num no-print">#${seqGlobal}</span>
          <div class="barcode-svg-container">
            <svg id="${svgId}" class="barcode-svg"></svg>
          </div>
          <div class="barcode-text-line" style="font-size: ${state.fontSize}pt;">
            <u>${textContent}</u>
          </div>
        `;
        barcodeQueue.push({ id: `#${svgId}`, text: shelf });
      }
    });

    pageSheet.appendChild(grid);
    wrap.appendChild(pageSheet);
  });

  // Render vector SVGs with JsBarcode
  setTimeout(() => {
    barcodeQueue.forEach(q => {
      try {
        JsBarcode(q.id, q.text, {
          format: "CODE128",
          width: 1.8,
          height: state.barcodeHeight,
          displayValue: false,  // We display the underlined text below
          margin: 0,
          background: "transparent",
          lineColor: "#000000"
        });
      } catch (err) {
        console.warn(`JsBarcode error for ${q.text}:`, err);
      }
    });
  }, 10);
}

// ==========================================================================
// PRINT & PDF DOWNLOAD ACTIONS
// ==========================================================================

// Trigger A4 Print
function triggerA4Print() {
  if (state.items.length === 0) {
    alert('પ્રિન્ટ કરવા માટે કોઈ બારકોડ નથી.');
    return;
  }

  // Switch to 'all' pages mode momentarily so all pages are in DOM for printing
  const origMode = state.previewMode;
  const origZoom = state.zoom;

  state.previewMode = 'all';
  state.zoom = 1.0;
  renderPreview();

  setTimeout(() => {
    window.print();
    // Restore previous view mode
    state.previewMode = origMode;
    state.zoom = origZoom;
    renderPreview();
  }, 350);
}

// Trigger Vector PDF Download
async function triggerPdfDownload() {
  if (state.items.length === 0) {
    alert('ડાઉનલોડ કરવા માટે કોઈ બારકોડ નથી.');
    return;
  }

  const btn = document.getElementById('btnDownloadPdf');
  btn.textContent = '⏳ PDF તૈયાર થઈ રહી છે...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: state.items,
        layout_type: state.layoutType,
        order_direction: state.orderDirection,
        show_border: document.getElementById('toggleCutLines').checked,
        show_rack: document.getElementById('toggleShowRack').checked,
        barcode_height: state.barcodeHeight,
        barcode_scale: 1.15,
        font_size: state.fontSize
      })
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OSLC_Shelf_Barcodes_A4_${state.items.length}_labels.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } else {
      const err = await res.json();
      alert('PDF એરર: ' + (err.error || 'Failed to generate PDF'));
    }
  } catch (err) {
    alert('ડાઉનલોડ એરર: ' + err.message);
  } finally {
    btn.textContent = '📥 PDF ડાઉનલોડ';
    btn.disabled = false;
  }
}
