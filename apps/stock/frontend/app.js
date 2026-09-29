/**
 * OSLC Stock Report - Frontend Logic & Instant Search Engine
 * Architected & Developed by Jeel Vaghani
 */

(function () {
  'use strict';

  // State Management
  const state = {
    allRows: [],
    filteredRows: [],
    metrics: null,
    searchQuery: '',
    groupBy: 'none', // 'none', 'DESIGN_NO', 'SHELF_NO', 'SIZE', 'PORTAL'
    sortColumn: 'SKU_CODE',
    sortAsc: true,
    page: 1,
    pageSize: 100,
    isNativeAndroid: typeof window.AndroidApp !== 'undefined' || typeof window.DigiBridge !== 'undefined',
    isLoading: false,
    collapsedGroups: new Set(),
  };

  // DOM Elements
  const el = {
    searchInput: document.getElementById('stockSearchInput'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    speedTimer: document.getElementById('speedTimer'),
    matchCount: document.getElementById('matchCount'),
    totalCount: document.getElementById('totalCount'),
    tableBody: document.getElementById('stockTableBody'),
    kpiFresh: document.getElementById('kpiFresh'),
    kpiBalance: document.getElementById('kpiBalance'),
    kpiSkus: document.getElementById('kpiSkus'),
    kpiDesigns: document.getElementById('kpiDesigns'),
    kpiShelves: document.getElementById('kpiShelves'),
    btnRefresh: document.getElementById('btnRefresh'),
    refreshIcon: document.getElementById('refreshIcon'),
    btnExcelExport: document.getElementById('btnExcelExport'),
    btnAppMode: document.getElementById('btnAppMode'),
    liveStatusText: document.getElementById('liveStatusText'),
    footerUpdateTime: document.getElementById('footerUpdateTime'),
    selectPageSize: document.getElementById('selectPageSize'),
    btnPrevPage: document.getElementById('btnPrevPage'),
    btnNextPage: document.getElementById('btnNextPage'),
    pageInfo: document.getElementById('pageInfo'),
    groupChips: document.getElementById('groupChipsContainer'),
  };

  // Initialize App
  function init() {
    setupEventListeners();
    setupAndroidBridge();

    // Check offline cached stock data first for instant 0.00s load
    loadLocalCache();

    // Fetch fresh live data
    fetchLiveData(false);
  }

  // Event Listeners
  function setupEventListeners() {
    // 0.01-Second Instant Search on Keystroke
    el.searchInput.addEventListener('input', handleSearchInput);

    // Clear Search Button
    el.btnClearSearch.addEventListener('click', () => {
      el.searchInput.value = '';
      el.btnClearSearch.classList.add('hidden');
      state.searchQuery = '';
      state.page = 1;
      applyFilterAndRender();
      el.searchInput.focus();
    });

    // Refresh Button
    el.btnRefresh.addEventListener('click', () => {
      fetchLiveData(true);
    });

    // Excel Export
    el.btnExcelExport.addEventListener('click', handleExcelExport);

    // Page Size Change
    el.selectPageSize.addEventListener('change', (e) => {
      state.pageSize = parseInt(e.target.value, 10);
      state.page = 1;
      renderTable();
    });

    // Pagination Buttons
    el.btnPrevPage.addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        renderTable();
      }
    });

    el.btnNextPage.addEventListener('click', () => {
      const maxPage = Math.ceil(state.filteredRows.length / state.pageSize) || 1;
      if (state.page < maxPage) {
        state.page++;
        renderTable();
      }
    });

    // Grouping Chips
    if (el.groupChips) {
      el.groupChips.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-btn');
        if (!btn) return;
        el.groupChips.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.groupBy = btn.dataset.group;
        state.collapsedGroups.clear();
        state.page = 1;
        renderTable();
      });
    }

    // Column Header Sorting
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (state.sortColumn === col) {
          state.sortAsc = !state.sortAsc;
        } else {
          state.sortColumn = col;
          state.sortAsc = true;
        }
        updateSortHeaders();
        sortRows(state.filteredRows);
        renderTable();
      });
    });

    // Android App Mode Settings Button
    if (state.isNativeAndroid && el.btnAppMode) {
      el.btnAppMode.classList.remove('hidden');
      el.btnAppMode.addEventListener('click', () => {
        if (window.AndroidApp && window.AndroidApp.showSettings) {
          window.AndroidApp.showSettings();
        }
      });
    }
  }

  // Load from local storage for instant 0.00s start
  function loadLocalCache() {
    try {
      const raw = localStorage.getItem('oslc_stock_cache');
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && Array.isArray(cached.rows) && cached.rows.length > 0) {
          state.allRows = cached.rows;
          state.metrics = cached.metrics;
          updateMetricsUi(state.metrics);
          applyFilterAndRender();
          if (cached.metrics && cached.metrics.refreshed_at) {
            el.footerUpdateTime.textContent = `Cached snapshot: ${cached.metrics.refreshed_at}`;
          }
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
  }

  // Save to local storage
  function saveLocalCache(rows, metrics) {
    try {
      localStorage.setItem('oslc_stock_cache', JSON.stringify({
        rows: rows,
        metrics: metrics,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore quota exceeded
    }
  }

  // Fetch Live Data (Dual: Android Native JDBC or Web API)
  function fetchLiveData(forceRefresh) {
    setLoading(true);

    if (state.isNativeAndroid && window.AndroidApp && window.AndroidApp.fetchStockReport) {
      // Android Native JDBC Direct Mode (PC বন্ধ હોય તો પણ ચાલશે)
      try {
        window.AndroidApp.fetchStockReport(forceRefresh);
      } catch (err) {
        console.error('Android bridge call failed:', err);
        fallbackWebFetch(forceRefresh);
      }
    } else {
      // Web / Browser Mode
      fallbackWebFetch(forceRefresh);
    }
  }

  // Standard Fetch over HTTP
  function fallbackWebFetch(forceRefresh) {
    const url = `/api/stock${forceRefresh ? '?refresh=true' : ''}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.success) {
          handleDataReceived(data);
        } else {
          showError('Database error receiving stock data');
        }
      })
      .catch(err => {
        console.error('Fetch error:', err);
        // If fetch fails and we already have cached rows, keep displaying
        if (state.allRows.length === 0) {
          showError('DigiCorp Database કનેક્ટ નથી થઈ શક્યું. કૃપા કરીને નેટવર્ક ચેક કરો.');
        } else {
          el.liveStatusText.textContent = 'Offline (Showing Cached)';
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }

  // Data Received Handler (Shared by Android Bridge and Web Fetch)
  function handleDataReceived(data) {
    const rows = data.rows || [];
    const metrics = data.metrics || calculateMetrics(rows);

    state.allRows = rows;
    state.metrics = metrics;

    saveLocalCache(rows, metrics);
    updateMetricsUi(metrics);
    applyFilterAndRender();

    el.liveStatusText.textContent = 'DigiBizz LIVE';
    el.footerUpdateTime.textContent = `Last updated: ${metrics.refreshed_at || new Date().toLocaleTimeString()}`;
    setLoading(false);
  }

  // Setup Android Native Bridge Callback
  function setupAndroidBridge() {
    window.onNativeStockDataReceived = function (jsonStrOrObj) {
      try {
        const data = typeof jsonStrOrObj === 'string' ? JSON.parse(jsonStrOrObj) : jsonStrOrObj;
        if (data && data.success) {
          handleDataReceived(data);
        } else {
          showError(data.error || 'Native DB error');
        }
      } catch (e) {
        console.error('Bridge parse error:', e);
      } finally {
        setLoading(false);
      }
    };
  }

  // Calculate Metrics if not provided
  function calculateMetrics(rows) {
    let fresh = 0, bal = 0, block = 0;
    const skus = new Set(), designs = new Set(), shelves = new Set();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      fresh += Number(r.FRESH_PCS) || 0;
      bal += Number(r.BALANCE_PIECES) || 0;
      block += Number(r.BLOCK_PCS) || 0;
      if (r.SKU_CODE) skus.add(r.SKU_CODE);
      if (r.DESIGN_NO) designs.add(r.DESIGN_NO);
      if (r.SHELF_NO) shelves.add(r.SHELF_NO);
    }

    return {
      total_fresh_pcs: fresh,
      total_balance_pcs: bal,
      total_block_pcs: block,
      unique_skus: skus.size,
      unique_designs: designs.size,
      unique_shelves: shelves.size,
      refreshed_at: new Date().toLocaleTimeString(),
    };
  }

  // Update Summary KPI Cards
  function updateMetricsUi(m) {
    if (!m) return;
    el.kpiFresh.textContent = Number(m.total_fresh_pcs || 0).toLocaleString('en-IN');
    el.kpiBalance.textContent = Number(m.total_balance_pcs || 0).toLocaleString('en-IN');
    el.kpiSkus.textContent = Number(m.unique_skus || 0).toLocaleString('en-IN');
    el.kpiDesigns.textContent = Number(m.unique_designs || 0).toLocaleString('en-IN');
    el.kpiShelves.textContent = Number(m.unique_shelves || 0).toLocaleString('en-IN');
    el.totalCount.textContent = Number(state.allRows.length).toLocaleString('en-IN');
  }

  // 0.01-Second Instant Search Handler
  function handleSearchInput() {
    const q = el.searchInput.value.trim();
    state.searchQuery = q;
    state.page = 1;
    el.btnClearSearch.classList.toggle('hidden', q.length === 0);

    applyFilterAndRender();
  }

  // Apply Filter and Render (Engineered for 0.01s Execution)
  function applyFilterAndRender() {
    const t0 = performance.now();

    const q = state.searchQuery.toLowerCase();
    const rows = state.allRows;

    if (!q) {
      state.filteredRows = rows.slice();
    } else {
      const terms = q.split(/\s+/).filter(Boolean);
      const filtered = [];
      const len = rows.length;

      for (let i = 0; i < len; i++) {
        const r = rows[i];
        // Fast string concatenation search
        const blob = `${r.SKU_CODE || ''} ${r.DESIGN_NO || ''} ${r.SIZE || ''} ${r.SHELF_NO || ''} ${r.PORTAL || ''}`.toLowerCase();
        
        let match = true;
        for (let j = 0; j < terms.length; j++) {
          if (blob.indexOf(terms[j]) === -1) {
            match = false;
            break;
          }
        }

        if (match) {
          filtered.push(r);
        }
      }
      state.filteredRows = filtered;
    }

    // Sort Rows
    sortRows(state.filteredRows);

    const t1 = performance.now();
    const durationMs = (t1 - t0);
    const durationSec = (durationMs / 1000).toFixed(3);

    // Update Speed Badge
    el.speedTimer.textContent = `${durationSec}s`;
    el.matchCount.textContent = state.filteredRows.length.toLocaleString('en-IN');

    // Render Table
    renderTable();
  }

  // Sort Array
  function sortRows(arr) {
    const col = state.sortColumn;
    const asc = state.sortAsc;
    const isNum = (col === 'FRESH_PCS' || col === 'BALANCE_PIECES' || col === 'BLOCK_PCS');

    arr.sort((a, b) => {
      let va = a[col];
      let vb = b[col];

      if (isNum) {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
        return asc ? va - vb : vb - va;
      } else {
        va = String(va || '').toLowerCase();
        vb = String(vb || '').toLowerCase();
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
      }
    });
  }

  // Update Sort Indicator Icons
  function updateSortHeaders() {
    document.querySelectorAll('th.sortable').forEach(th => {
      const col = th.dataset.sort;
      th.classList.remove('sorted-asc', 'sorted-desc');
      const arrow = th.querySelector('.sort-arrow');
      if (state.sortColumn === col) {
        th.classList.add(state.sortAsc ? 'sorted-asc' : 'sorted-desc');
        if (arrow) arrow.textContent = state.sortAsc ? '▲' : '▼';
      } else {
        if (arrow) arrow.textContent = '↕';
      }
    });
  }

  // Render Table (Supports Flat Table or Grouping by Column)
  function renderTable() {
    const rows = state.filteredRows;
    const tbody = el.tableBody;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <p class="empty-msg">કોઈ સ્ટોક મળ્યો નથી (No stock matched your search).</p>
          </td>
        </tr>
      `;
      updatePagination(0);
      return;
    }

    if (state.groupBy !== 'none') {
      renderGroupedTable(rows, state.groupBy);
    } else {
      renderFlatTable(rows);
    }
  }

  // Flat Table Rendering with Pagination
  function renderFlatTable(rows) {
    const total = rows.length;
    const pageSize = state.pageSize;
    const page = state.page;
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const slice = rows.slice(start, end);

    const html = [];
    for (let i = 0; i < slice.length; i++) {
      const r = slice[i];
      const portal = r.PORTAL || '-';
      const portalClass = portal.toLowerCase().indexOf('amazon') !== -1 ? 'portal-badge amazon' : 'portal-badge';

      html.push(`
        <tr>
          <td class="sku-cell">${escapeHtml(r.SKU_CODE)}</td>
          <td class="design-cell">${escapeHtml(r.DESIGN_NO)}</td>
          <td>${escapeHtml(r.SIZE)}</td>
          <td><span class="shelf-cell">${escapeHtml(r.SHELF_NO)}</span></td>
          <td class="num-col fresh-cell">${Number(r.FRESH_PCS || 0).toLocaleString('en-IN')}</td>
          <td class="num-col">${Number(r.BALANCE_PIECES || 0).toLocaleString('en-IN')}</td>
          <td class="num-col block-pcs-cell">${Number(r.BLOCK_PCS || 0).toLocaleString('en-IN')}</td>
          <td><span class="${portalClass}">${escapeHtml(portal)}</span></td>
        </tr>
      `);
    }

    el.tableBody.innerHTML = html.join('');
    updatePagination(total);
  }

  // Grouped Table Rendering (DigiCorp Drag-to-Group Feature)
  function renderGroupedTable(rows, groupCol) {
    const groups = new Map();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const key = r[groupCol] || '(Blanks)';
      if (!groups.has(key)) {
        groups.set(key, { key: key, rows: [], totalFresh: 0, totalBal: 0 });
      }
      const g = groups.get(key);
      g.rows.push(r);
      g.totalFresh += Number(r.FRESH_PCS || 0);
      g.totalBal += Number(r.BALANCE_PIECES || 0);
    }

    const html = [];
    groups.forEach((g, key) => {
      const isCollapsed = state.collapsedGroups.has(key);
      const toggleIcon = isCollapsed ? '▶' : '▼';

      html.push(`
        <tr class="group-header-row" data-group-key="${escapeHtml(key)}">
          <td colspan="8">
            <span class="group-toggle-btn">${toggleIcon}</span>
            <strong>${groupCol.replace('_', ' ')}: ${escapeHtml(key)}</strong>
            <span class="group-summary-badge">${g.rows.length} items | Fresh: ${g.totalFresh.toLocaleString('en-IN')} pcs</span>
          </td>
        </tr>
      `);

      if (!isCollapsed) {
        for (let j = 0; j < g.rows.length; j++) {
          const r = g.rows[j];
          const portal = r.PORTAL || '-';
          const portalClass = portal.toLowerCase().indexOf('amazon') !== -1 ? 'portal-badge amazon' : 'portal-badge';

          html.push(`
            <tr>
              <td class="sku-cell nested-sku">${escapeHtml(r.SKU_CODE)}</td>
              <td class="design-cell">${escapeHtml(r.DESIGN_NO)}</td>
              <td>${escapeHtml(r.SIZE)}</td>
              <td><span class="shelf-cell">${escapeHtml(r.SHELF_NO)}</span></td>
              <td class="num-col fresh-cell">${Number(r.FRESH_PCS || 0).toLocaleString('en-IN')}</td>
              <td class="num-col">${Number(r.BALANCE_PIECES || 0).toLocaleString('en-IN')}</td>
              <td class="num-col block-pcs-cell">${Number(r.BLOCK_PCS || 0).toLocaleString('en-IN')}</td>
              <td><span class="${portalClass}">${escapeHtml(portal)}</span></td>
            </tr>
          `);
        }
      }
    });

    el.tableBody.innerHTML = html.join('');

    // Attach group collapse click events
    el.tableBody.querySelectorAll('.group-header-row').forEach(row => {
      row.addEventListener('click', () => {
        const k = row.dataset.groupKey;
        if (state.collapsedGroups.has(k)) {
          state.collapsedGroups.delete(k);
        } else {
          state.collapsedGroups.add(k);
        }
        renderTable();
      });
    });

    // In grouped mode, pagination is disabled or displays total
    el.btnPrevPage.disabled = true;
    el.btnNextPage.disabled = true;
    el.pageInfo.textContent = `Grouped: ${groups.size} groups (${rows.length} items)`;
  }

  // Update Pagination Controls
  function updatePagination(total) {
    const pageSize = state.pageSize;
    const maxPage = Math.ceil(total / pageSize) || 1;
    state.page = Math.min(Math.max(1, state.page), maxPage);

    el.pageInfo.textContent = `Page ${state.page} of ${maxPage}`;
    el.btnPrevPage.disabled = (state.page <= 1);
    el.btnNextPage.disabled = (state.page >= maxPage);
  }

  // Handle Excel Export
  function handleExcelExport() {
    const rows = state.filteredRows.length > 0 ? state.filteredRows : state.allRows;
    if (rows.length === 0) {
      alert('ડાઉનલોડ કરવા માટે કોઈ ડેટા નથી.');
      return;
    }

    if (state.isNativeAndroid && window.AndroidApp && window.AndroidApp.saveExcelFile) {
      // Export via Android Native
      exportExcelAndroid(rows);
    } else {
      // Export via Web
      exportExcelWeb(rows);
    }
  }

  function exportExcelWeb(rows) {
    // If full dataset export and server available, trigger server export
    if (!state.searchQuery && rows.length === state.allRows.length) {
      window.location.href = '/api/stock/export';
      return;
    }

    // Client-side CSV generation (compatible with Excel)
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'SKU Code,Design No,Size,Shelf No,Fresh Pcs.,Balance Pcs.,Block Pcs.,Portal\r\n';

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      csv += `"${escapeCsv(r.SKU_CODE)}","${escapeCsv(r.DESIGN_NO)}","${escapeCsv(r.SIZE)}","${escapeCsv(r.SHELF_NO)}",${r.FRESH_PCS || 0},${r.BALANCE_PIECES || 0},${r.BLOCK_PCS || 0},"${escapeCsv(r.PORTAL)}"\r\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `OSLC_Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  function exportExcelAndroid(rows) {
    let csv = 'SKU Code,Design No,Size,Shelf No,Fresh Pcs.,Balance Pcs.,Block Pcs.,Portal\r\n';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      csv += `"${escapeCsv(r.SKU_CODE)}","${escapeCsv(r.DESIGN_NO)}","${escapeCsv(r.SIZE)}","${escapeCsv(r.SHELF_NO)}",${r.FRESH_PCS || 0},${r.BALANCE_PIECES || 0},${r.BLOCK_PCS || 0},"${escapeCsv(r.PORTAL)}"\r\n`;
    }
    const filename = `Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    window.AndroidApp.saveExcelFile(csv, filename);
  }

  function setLoading(loading) {
    state.isLoading = loading;
    if (el.refreshIcon) {
      if (loading) el.refreshIcon.classList.add('spinning');
      else el.refreshIcon.classList.remove('spinning');
    }
  }

  function showError(msg) {
    el.tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <p class="error-msg">⚠️ ${escapeHtml(msg)}</p>
          <button onclick="location.reload()" class="pag-btn retry-btn">ફરી પ્રયાસ કરો (Retry)</button>
        </td>
      </tr>
    `;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeCsv(str) {
    if (str == null) return '';
    return String(str).replace(/"/g, '""');
  }

  // Boot Application
  document.addEventListener('DOMContentLoaded', init);
})();
