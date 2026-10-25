// OSLC GODAUN - Piece Rate & Live Stock Report Logic
(function() {
  'use strict';

  // Smart Server Discovery
  const SERVERS = [
    'https://regards-freeware-translated-excellence.trycloudflare.com',
    'http://192.168.100.106:8095',
    'http://192.168.100.106:8080',
    'http://localhost:8095',
    'http://localhost:8080'
  ];

  const isWebOrigin = !!(
    window.location.origin &&
    !window.location.origin.startsWith('file:') &&
    !window.location.origin.includes('null')
  );

  let currentApiBase = isWebOrigin
    ? window.location.origin
    : (localStorage.getItem('oslc_server_url') || SERVERS[0]);

  async function resolveBestServer() {
    if (isWebOrigin) {
      currentApiBase = window.location.origin;
      return currentApiBase;
    }
    for (const s of SERVERS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const r = await fetch(`${s}/api/godaun/summary`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (r.ok) {
          currentApiBase = s;
          localStorage.setItem('oslc_server_url', s);
          return s;
        }
      } catch (e) {}
    }
    return currentApiBase;
  }

  // Direct in-APK Native SQL Server Bridge (Runs 24/7 even when PC is OFF)
  const bridgeCallbacks = {};
  let bridgeCallSeq = 0;

  window.__onBridgeResponse = function(callbackId, data) {
    if (bridgeCallbacks[callbackId]) {
      bridgeCallbacks[callbackId](data);
      delete bridgeCallbacks[callbackId];
    }
  };

  function hasNativeBridge() {
    return !!(window.DigiBizzBridge && typeof window.DigiBizzBridge.isNative === 'function' && window.DigiBizzBridge.isNative());
  }

  function callBridge(method, args) {
    return new Promise((resolve, reject) => {
      const callbackId = 'cb_' + (++bridgeCallSeq) + '_' + Date.now();
      const timeout = setTimeout(() => {
        if (bridgeCallbacks[callbackId]) {
          delete bridgeCallbacks[callbackId];
          reject(new Error('ડેટાબેઝ સાથે સંપર્ક સમય સમાપ્ત (Timeout)'));
        }
      }, 25000);

      bridgeCallbacks[callbackId] = function(data) {
        clearTimeout(timeout);
        if (data && data.success === false && data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data);
        }
      };

      try {
        window.DigiBizzBridge[method](...args, callbackId);
      } catch (err) {
        clearTimeout(timeout);
        delete bridgeCallbacks[callbackId];
        reject(err);
      }
    });
  }

  // Device / Local Timezone Helper (Ensures accurate date in IST)
  function getLocalDateStr(d) {
    const dt = d ? new Date(d) : new Date();
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // State
  const todayStr = getLocalDateStr();
  let salaryFromDate = todayStr;
  let salaryToDate = todayStr;
  let inRate = parseFloat(localStorage.getItem('oslc_in_rate')) || 0.20;
  let outRate = parseFloat(localStorage.getItem('oslc_out_rate')) || 0.35;
  let nameSearchTerm = '';
  let rawSalaryRows = [];

  // Shift State ('all', 'day', 'night')
  let selectedSalaryShift = 'all';
  let selectedLiveShift = 'all';

  // Worker Shift State
  let workerSelectedLiveShift = 'all';
  let workerSelectedSalaryShift = 'all';

  // Live View State
  let liveDate = todayStr;
  let liveReportType = 'inward'; // 'inward' or 'outward'
  let currentModalUser = '';

  // Auth & User Management State
  let currentUser = null;
  const DEFAULT_ADMIN = {
    username: 'admin',
    password: 'admin',
    worker_name: 'ADMIN',
    role: 'admin'
  };

  const DEFAULT_USERS = [
    { username: "admin", password: "admin", worker_name: "ADMIN", role: "admin" },
    { username: "sonu", password: "sonu@123", worker_name: "SONU", role: "worker" },
    { username: "amit1", password: "1234", worker_name: "AMIT", role: "worker" },
    { username: "amit", password: "1234", worker_name: "AMIT", role: "worker" },
    { username: "ravi", password: "1234", worker_name: "RAVI", role: "worker" },
    { username: "sekhripan", password: "1234", worker_name: "SEKHRIPAN", role: "worker" },
    { username: "niraj", password: "1234", worker_name: "NIRAJ", role: "worker" },
    { username: "rahulparmar", password: "1234", worker_name: "RAHULPARMAR", role: "worker" },
    { username: "po1", password: "1234", worker_name: "PO", role: "worker" },
    { username: "mayurvaghela1", password: "1234", worker_name: "MAYURVAGHELA", role: "worker" },
    { username: "jeel1", password: "1234", worker_name: "JEEL", role: "worker" },
    { username: "oslc_admin_50101", password: "1234", worker_name: "OSLC_ADMIN_5010", role: "worker" },
    { username: "parveen1", password: "1234", worker_name: "PARVEEN", role: "worker" },
    { username: "lalbabu1", password: "1234", worker_name: "LALBABU", role: "worker" },
    { username: "azahar1", password: "1234", worker_name: "AZAHAR", role: "worker" },
    { username: "lucky1", password: "1234", worker_name: "LUCKY", role: "worker" },
    { username: "bunty1", password: "1234", worker_name: "BUNTY", role: "worker" },
    { username: "yash1", password: "1234", worker_name: "YASH", role: "worker" },
    { username: "barcode21", password: "1234", worker_name: "BARCODE2", role: "worker" },
    { username: "nasir1", password: "1234", worker_name: "NASIR", role: "worker" },
    { username: "tohimul1", password: "1234", worker_name: "TOHIMUL", role: "worker" },
    { username: "bashir1", password: "1234", worker_name: "BASHIR", role: "worker" },
    { username: "uttam1", password: "1234", worker_name: "UTTAM", role: "worker" },
    { username: "hemlata1", password: "1234", worker_name: "HEMLATA", role: "worker" },
    { username: "atikul1", password: "1234", worker_name: "ATIKUL", role: "worker" },
    { username: "dharmesh1", password: "1234", worker_name: "DHARMESH", role: "worker" },
    { username: "sikendar1", password: "1234", worker_name: "SIKENDAR", role: "worker" },
    { username: "nasim21", password: "1234", worker_name: "NASIM 2", role: "worker" },
    { username: "bhumi1", password: "1234", worker_name: "BHUMI", role: "worker" },
    { username: "vinay1", password: "1234", worker_name: "VINAY", role: "worker" },
    { username: "gopal1", password: "1234", worker_name: "GOPAL", role: "worker" },
    { username: "madan1", password: "1234", worker_name: "MADAN", role: "worker" },
    { username: "milan11", password: "1234", worker_name: "MILAN1", role: "worker" },
    { username: "abdul1", password: "1234", worker_name: "ABDUL", role: "worker" },
    { username: "vinaykumar1", password: "1234", worker_name: "VINAY KUMAR", role: "worker" },
    { username: "pratik1", password: "1234", worker_name: "PRATIK", role: "worker" },
    { username: "sneha1", password: "1234", worker_name: "SNEHA", role: "worker" },
    { username: "lalji1", password: "1234", worker_name: "LALJI", role: "worker" },
    { username: "zeel1", password: "1234", worker_name: "ZEEL", role: "worker" },
    { username: "rushant1", password: "1234", worker_name: "RUSHANT", role: "worker" },
    { username: "sanjay21", password: "1234", worker_name: "SANJAY2", role: "worker" },
    { username: "helish1", password: "1234", worker_name: "HELISH", role: "worker" },
    { username: "abzal1", password: "1234", worker_name: "ABZAL", role: "worker" },
    { username: "brijeshadabhi1", password: "1234", worker_name: "BRIJESHA DABHI", role: "worker" },
    { username: "rahul1", password: "1234", worker_name: "RAHUL", role: "worker" },
    { username: "madankhambhu1", password: "1234", worker_name: "MADANKHAMBHU", role: "worker" },
    { username: "lumora_admin_50101", password: "1234", worker_name: "LUMORA_ADMIN_5010", role: "worker" },
    { username: "amir1", password: "1234", worker_name: "AMIR", role: "worker" }
  ];

  let cachedUsers = [];
  try {
    const saved = localStorage.getItem('oslc_users_db');
    cachedUsers = saved ? JSON.parse(saved) : [];
  } catch (e) {
    cachedUsers = [];
  }
  const userInitMap = new Map();
  DEFAULT_USERS.forEach(u => userInitMap.set(u.username.toLowerCase().trim(), u));
  cachedUsers.forEach(u => {
    if (u && u.username) userInitMap.set(u.username.toLowerCase().trim(), u);
  });
  cachedUsers = Array.from(userInitMap.values());
  localStorage.setItem('oslc_users_db', JSON.stringify(cachedUsers));

  // ========================================================
  // DAILY WORKING HOURS MANAGEMENT (કલાક એન્ટ્રી STATE)
  // ========================================================
  let dailyHoursMap = {};

  function loadDailyHoursLocal() {
    try {
      if (hasNativeBridge() && window.DigiBizzBridge.getDailyHours) {
        const bData = window.DigiBizzBridge.getDailyHours();
        if (bData && bData.trim() && bData.trim() !== '{}') {
          dailyHoursMap = JSON.parse(bData);
          return;
        }
      }
      const saved = localStorage.getItem('oslc_daily_hours');
      if (saved) {
        dailyHoursMap = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Load daily hours error:', e);
    }
  }

  async function syncDailyHoursWithServer() {
    loadDailyHoursLocal();
    if (!hasNativeBridge()) {
      try {
        await resolveBestServer();
        const res = await fetch(`${currentApiBase}/api/godaun/hours`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.hours) {
            dailyHoursMap = Object.assign({}, dailyHoursMap, data.hours);
            localStorage.setItem('oslc_daily_hours', JSON.stringify(dailyHoursMap));
          }
        }
      } catch (e) {}
    }
  }

  async function saveDailyHoursForDate(dateStr, workerHours) {
    if (!dailyHoursMap) dailyHoursMap = {};
    dailyHoursMap[dateStr] = workerHours;

    try {
      localStorage.setItem('oslc_daily_hours', JSON.stringify(dailyHoursMap));
    } catch (e) {}

    if (hasNativeBridge() && window.DigiBizzBridge.saveDailyHours) {
      try {
        window.DigiBizzBridge.saveDailyHours(JSON.stringify(dailyHoursMap));
      } catch (e) {}
    }

    if (!hasNativeBridge()) {
      try {
        await resolveBestServer();
        await fetch(`${currentApiBase}/api/godaun/hours`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, hours: workerHours })
        });
      } catch (e) {}
    }
  }

  function getWorkerHoursInRange(workerName, fromD, toD) {
    if (!dailyHoursMap) return 0;
    const wClean = (workerName || '').trim().toUpperCase();
    let tot = 0.0;
    for (const dStr of Object.keys(dailyHoursMap)) {
      if (dStr >= fromD && dStr <= toD) {
        const dayW = dailyHoursMap[dStr] || {};
        for (const [w, h] of Object.entries(dayW)) {
          if (w.trim().toUpperCase() === wClean) {
            tot += Number(h || 0);
          }
        }
      }
    }
    return Math.round(tot * 100) / 100;
  }

  function getWorkerHoursForDay(workerName, dateStr) {
    if (!dailyHoursMap) return 0;
    const wClean = (workerName || '').trim().toUpperCase();
    const dayW = dailyHoursMap[dateStr] || {};
    for (const [w, h] of Object.entries(dayW)) {
      if (w.trim().toUpperCase() === wClean) {
        return Number(h || 0);
      }
    }
    return 0;
  }

  loadDailyHoursLocal();

  // Worker Personal View State
  let workerLiveDate = todayStr;

  let workerLiveType = 'inward'; // 'inward' or 'outward'
  let workerSalaryFromDate = todayStr.slice(0, 8) + '01';
  let workerSalaryToDate = todayStr;
  let workerInwardItems = [];
  let workerOutwardItems = [];

  // Header & User Profile Elements
  const btnOpenUserMgmt = document.getElementById('btnOpenUserMgmt');
  const userBadgeWrap = document.getElementById('userBadgeWrap');
  const userBadgeIcon = document.getElementById('userBadgeIcon');
  const userBadgeName = document.getElementById('userBadgeName');
  const btnLogout = document.getElementById('btnLogout');
  const mainViewTabs = document.querySelector('.main-view-tabs');
  const bottomNav = document.querySelector('.bottom-nav');

  // DOM Elements - Navigation & Views
  const tabViewSalary = document.getElementById('tabViewSalary');
  const tabViewLive = document.getElementById('tabViewLive');
  const viewSalaryReport = document.getElementById('viewSalaryReport');
  const viewLiveScanning = document.getElementById('viewLiveScanning');
  const navBtnSalary = document.getElementById('navBtnSalary');
  const navBtnLive = document.getElementById('navBtnLive');
  const navBtnExcelBottom = document.getElementById('navBtnExcelBottom');
  const navRefreshBottom = document.getElementById('navRefreshBottom');
  const refreshBtn = document.getElementById('refreshBtn');
  const headerExcelBtn = document.getElementById('headerExcelBtn');
  const liveClockTime = document.getElementById('liveClockTime');

  // Admin Deduction Mode & Chori Kari Elements
  const tabViewChori = document.getElementById('tabViewChori');
  const viewChoriReport = document.getElementById('viewChoriReport');
  const adminDeductionModeBar = document.getElementById('adminDeductionModeBar');
  const btnModeNet = document.getElementById('btnModeNet');
  const btnModeGross = document.getElementById('btnModeGross');
  const btnModeCompare = document.getElementById('btnModeCompare');
  let adminDeductionMode = 'gross'; // Default to 'gross' for 100% match with DigiBizz ERP

  let choriFromDate = todayStr;
  let choriToDate = todayStr;
  let choriShift = 'all';
  let choriProcess = 'all';
  let choriWorker = '';
  let rawChoriWorkers = [];
  let rawChoriItems = [];
  let rawChoriData = null;

  const choriFromDateInput = document.getElementById('choriFromDate');
  const choriToDateInput = document.getElementById('choriToDate');
  const choriDispFromDate = document.getElementById('choriDispFromDate');
  const choriDispToDate = document.getElementById('choriDispToDate');
  const btnChoriGetReport = document.getElementById('btnChoriGetReport');
  const btnChoriExportExcel = document.getElementById('btnChoriExportExcel');
  const choriWorkerFilter = document.getElementById('choriWorkerFilter');
  const choriSearchInput = document.getElementById('choriSearchInput');
  const choriKpiTotalPieces = document.getElementById('choriKpiTotalPieces');
  const choriKpiInPieces = document.getElementById('choriKpiInPieces');
  const choriKpiOutPieces = document.getElementById('choriKpiOutPieces');
  const choriKpiSuspectCount = document.getElementById('choriKpiSuspectCount');
  const choriKpiTotalDeductedAmt = document.getElementById('choriKpiTotalDeductedAmt');
  const choriWorkersTableBody = document.getElementById('choriWorkersTableBody');
  const choriItemsTableBody = document.getElementById('choriItemsTableBody');
  const choriWorkersCountBadge = document.getElementById('choriWorkersCountBadge');
  const choriItemsCountBadge = document.getElementById('choriItemsCountBadge');

  // Worker Dashboard Elements
  const viewWorkerDashboard = document.getElementById('viewWorkerDashboard');
  const workerHeroName = document.getElementById('workerHeroName');
  const workerAccountTypeLabel = document.getElementById('workerAccountTypeLabel');
  const workerTodayDateDisplay = document.getElementById('workerTodayDateDisplay');
  const workerLiveClock = document.getElementById('workerLiveClock');
  const tabWorkerLive = document.getElementById('tabWorkerLive');
  const tabWorkerSalary = document.getElementById('tabWorkerSalary');
  const panelWorkerLive = document.getElementById('panelWorkerLive');
  const panelWorkerSalary = document.getElementById('panelWorkerSalary');

  const workerLiveDateInput = document.getElementById('workerLiveDateInput');
  const workerPillToday = document.getElementById('workerPillToday');
  const workerPillYesterday = document.getElementById('workerPillYesterday');
  const workerInRateDisplay = document.getElementById('workerInRateDisplay');
  const workerOutRateDisplay = document.getElementById('workerOutRateDisplay');
  const workerInPcs = document.getElementById('workerInPcs');
  const workerInAmt = document.getElementById('workerInAmt');
  const workerOutPcs = document.getElementById('workerOutPcs');
  const workerOutAmt = document.getElementById('workerOutAmt');
  const workerTotalPcs = document.getElementById('workerTotalPcs');
  const workerTotalAmt = document.getElementById('workerTotalAmt');
  const btnWorkerInwardType = document.getElementById('btnWorkerInwardType');
  const btnWorkerOutwardType = document.getElementById('btnWorkerOutwardType');
  const workerInCountBadge = document.getElementById('workerInCountBadge');
  const workerOutCountBadge = document.getElementById('workerOutCountBadge');
  const workerItemsSearch = document.getElementById('workerItemsSearch');
  const workerItemsLoader = document.getElementById('workerItemsLoader');
  const workerItemsTable = document.getElementById('workerItemsTable');
  const workerItemsTableBody = document.getElementById('workerItemsTableBody');

  const workerDispFromDate = document.getElementById('workerDispFromDate');
  const workerDispToDate = document.getElementById('workerDispToDate');
  const workerSalaryFromDateInput = document.getElementById('workerSalaryFromDate');
  const workerSalaryToDateInput = document.getElementById('workerSalaryToDate');
  const btnApplyWorkerSalaryDate = document.getElementById('btnApplyWorkerSalaryDate');
  const workerSalaryPillMonth = document.getElementById('workerSalaryPillMonth');
  const workerSalaryPill7Days = document.getElementById('workerSalaryPill7Days');
  const workerSalaryPillYesterday = document.getElementById('workerSalaryPillYesterday');
  const workerSalaryPillToday = document.getElementById('workerSalaryPillToday');
  const btnWorkerDownloadExcel = document.getElementById('btnWorkerDownloadExcel');
  const workerDatewiseTable = document.getElementById('workerDatewiseTable');
  const workerDatewiseTableBody = document.getElementById('workerDatewiseTableBody');
  const workerDatewiseTableFoot = document.getElementById('workerDatewiseTableFoot');
  const thWorkerDatewiseInRate = document.getElementById('thWorkerDatewiseInRate');
  const thWorkerDatewiseOutRate = document.getElementById('thWorkerDatewiseOutRate');
  const pillWorkerLiveShiftAll = document.getElementById('pillWorkerLiveShiftAll');
  const pillWorkerLiveShiftDay = document.getElementById('pillWorkerLiveShiftDay');
  const pillWorkerLiveShiftNight = document.getElementById('pillWorkerLiveShiftNight');
  const pillWorkerSalaryShiftAll = document.getElementById('pillWorkerSalaryShiftAll');
  const pillWorkerSalaryShiftDay = document.getElementById('pillWorkerSalaryShiftDay');
  const pillWorkerSalaryShiftNight = document.getElementById('pillWorkerSalaryShiftNight');

  // Login Modal Elements
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const chkRememberMe = document.getElementById('chkRememberMe');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');
  const loginSpinner = document.getElementById('loginSpinner');
  const loginErrorMsg = document.getElementById('loginErrorMsg');
  const btnRoleWorker = document.getElementById('btnRoleWorker');
  const btnRoleAdmin = document.getElementById('btnRoleAdmin');
  const labelLoginId = document.getElementById('labelLoginId');
  const loginHelperText = document.getElementById('loginHelperText');

  // User Management Modal Elements
  const userMgmtModal = document.getElementById('userMgmtModal');
  const btnCloseUserMgmt = document.getElementById('btnCloseUserMgmt');
  const formCreateUser = document.getElementById('formCreateUser');
  const mgmtWorkerSearch = document.getElementById('mgmtWorkerSearch');
  const mgmtWorkerSelect = document.getElementById('mgmtWorkerSelect');
  const mgmtNewUsername = document.getElementById('mgmtNewUsername');
  const mgmtNewPassword = document.getElementById('mgmtNewPassword');
  const mgmtFormStatus = document.getElementById('mgmtFormStatus');
  const btnSaveNewUser = document.getElementById('btnSaveNewUser');
  const mgmtUsersListContainer = document.getElementById('mgmtUsersListContainer');
  const mgmtUsersCount = document.getElementById('mgmtUsersCount');
  const btnRefreshUsersList = document.getElementById('btnRefreshUsersList');

  // Edit User Modal Elements
  const editUserModal = document.getElementById('editUserModal');
  const btnCloseEditUser = document.getElementById('btnCloseEditUser');
  const formEditUser = document.getElementById('formEditUser');
  const editOriginalUsername = document.getElementById('editOriginalUsername');
  const editWorkerGroup = document.getElementById('editWorkerGroup');
  const editWorkerName = document.getElementById('editWorkerName');
  const editUsername = document.getElementById('editUsername');
  const editPassword = document.getElementById('editPassword');
  const editRoleWorker = document.getElementById('editRoleWorker');
  const editRoleAdmin = document.getElementById('editRoleAdmin');
  const editFormStatus = document.getElementById('editFormStatus');
  const btnSaveEditUser = document.getElementById('btnSaveEditUser');
  const btnCancelEditUser = document.getElementById('btnCancelEditUser');

  // Delete Confirm Modal Elements
  const confirmDeleteModal = document.getElementById('confirmDeleteModal');
  const deleteModalDesc = document.getElementById('deleteModalDesc');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');
  const btnCancelDelete = document.getElementById('btnCancelDelete');
  let pendingDeleteUsername = null;

  // Toast Popup Elements
  const toastNotification = document.getElementById('toastNotification');
  const toastIcon = document.getElementById('toastIcon');
  const toastText = document.getElementById('toastText');
  let toastTimer = null;

  function showToast(msg, icon = '✅', duration = 3000) {
    if (hasNativeBridge() && window.DigiBizzBridge.showToast) {
      try { window.DigiBizzBridge.showToast(msg); } catch (e) {}
    }
    if (!toastNotification) return;
    if (toastIcon) toastIcon.textContent = icon;
    if (toastText) toastText.textContent = msg;
    toastNotification.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotification.classList.add('hidden');
    }, duration);
  }

  // Salary View Elements
  const salaryFromDateInput = document.getElementById('salaryFromDate');
  const salaryToDateInput = document.getElementById('salaryToDate');
  const dispFromDate = document.getElementById('dispFromDate');
  const dispToDate = document.getElementById('dispToDate');
  const currentRangeText = document.getElementById('currentRangeText');
  const btnApplyDateRange = document.getElementById('btnApplyDateRange');
  const btnPickFrom = document.getElementById('btnPickFrom');
  const btnPickTo = document.getElementById('btnPickTo');
  const boxFromDate = document.getElementById('boxFromDate');
  const boxToDate = document.getElementById('boxToDate');
  const rangePillToday = document.getElementById('rangePillToday');
  const rangePillYesterday = document.getElementById('rangePillYesterday');
  const rangePill7Days = document.getElementById('rangePill7Days');
  const rangePillMonth = document.getElementById('rangePillMonth');
  const rangePillLastMonth = document.getElementById('rangePillLastMonth');

  const salarySearchInput = document.getElementById('salarySearchInput');
  const salarySearchClearBtn = document.getElementById('salarySearchClearBtn');
  const inRateInput = document.getElementById('inRateInput');
  const outRateInput = document.getElementById('outRateInput');
  const activeInRateText = document.getElementById('activeInRateText');
  const activeOutRateText = document.getElementById('activeOutRateText');
  const inRatePills = document.getElementById('inRatePills');
  const outRatePills = document.getElementById('outRatePills');
  const inRateSavedMsg = document.getElementById('inRateSavedMsg');
  const outRateSavedMsg = document.getElementById('outRateSavedMsg');
  const btnDownloadExcel = document.getElementById('btnDownloadExcel');

  const kpiInPcs = document.getElementById('kpiInPcs');
  const kpiInAmt = document.getElementById('kpiInAmt');
  const kpiOutPcs = document.getElementById('kpiOutPcs');
  const kpiOutAmt = document.getElementById('kpiOutAmt');
  const kpiTotalPcs = document.getElementById('kpiTotalPcs');
  const kpiTotalAmt = document.getElementById('kpiTotalAmt');
  const kpiTotalHours = document.getElementById('kpiTotalHours');
  const kpiAvgHours = document.getElementById('kpiAvgHours');
  const salaryUserCount = document.getElementById('salaryUserCount');

  const btnOpenHoursHead = document.getElementById('btnOpenHoursHead');
  const btnOpenHoursModal = document.getElementById('btnOpenHoursModal');
  const hoursEntryModal = document.getElementById('hoursEntryModal');
  const btnCloseHoursModal = document.getElementById('btnCloseHoursModal');
  const btnCancelHours = document.getElementById('btnCancelHours');
  const hoursEntryDate = document.getElementById('hoursEntryDate');
  const hoursDateDisplay = document.getElementById('hoursDateDisplay');
  const btnHoursToday = document.getElementById('btnHoursToday');
  const btnHoursYesterday = document.getElementById('btnHoursYesterday');
  const btnBulk10 = document.getElementById('btnBulk10');
  const btnBulk12 = document.getElementById('btnBulk12');
  const btnBulk8 = document.getElementById('btnBulk8');
  const btnBulkClear = document.getElementById('btnBulkClear');
  const hoursWorkerSearch = document.getElementById('hoursWorkerSearch');
  const hoursWorkersCountBadge = document.getElementById('hoursWorkersCountBadge');
  const hoursWorkersListContainer = document.getElementById('hoursWorkersListContainer');
  const hoursTotalWorkersCount = document.getElementById('hoursTotalWorkersCount');
  const hoursTotalHoursSum = document.getElementById('hoursTotalHoursSum');
  const btnSaveHoursSubmit = document.getElementById('btnSaveHoursSubmit');
  const hoursSaveStatusMsg = document.getElementById('hoursSaveStatusMsg');

  const thInRateLabel = document.getElementById('thInRateLabel');
  const thOutRateLabel = document.getElementById('thOutRateLabel');
  const thHoursLabel = document.getElementById('thHoursLabel');
  const thTimeLabel = document.getElementById('thTimeLabel');
  const salaryTableBody = document.getElementById('salaryTableBody');
  const salaryTableFoot = document.getElementById('salaryTableFoot');
  const topLeaderboardCard = document.getElementById('topLeaderboardCard');
  const top5CardsContainer = document.getElementById('top5CardsContainer');
  const salaryShiftPills = document.getElementById('salaryShiftPills');
  const currentShiftBannerTag = document.getElementById('currentShiftBannerTag');


  // Datewise Modal Elements
  const userDatewiseModal = document.getElementById('userDatewiseModal');
  const datewiseModalUserName = document.getElementById('datewiseModalUserName');
  const datewiseModalSub = document.getElementById('datewiseModalSub');
  const datewiseModalCloseBtn = document.getElementById('datewiseModalCloseBtn');
  const btnDownloadUserExcel = document.getElementById('btnDownloadUserExcel');
  const datewiseModalLoading = document.getElementById('datewiseModalLoading');
  const thDatewiseInRate = document.getElementById('thDatewiseInRate');
  const thDatewiseOutRate = document.getElementById('thDatewiseOutRate');
  const datewiseTableBody = document.getElementById('datewiseTableBody');
  const datewiseTableFoot = document.getElementById('datewiseTableFoot');

  // Live View Elements
  const liveDatePickerInput = document.getElementById('liveDatePickerInput');
  const liveSingleDateDisplay = document.getElementById('liveSingleDateDisplay');
  const liveCalendarTriggerBtn = document.getElementById('liveCalendarTriggerBtn');
  const livePillToday = document.getElementById('livePillToday');
  const livePillYesterday = document.getElementById('livePillYesterday');
  const livePillDayBefore = document.getElementById('livePillDayBefore');
  const tabInward = document.getElementById('tabInward');
  const tabOutward = document.getElementById('tabOutward');
  const heroReportTitle = document.getElementById('heroReportTitle');
  const heroTotalQty = document.getElementById('heroTotalQty');
  const heroUserCountText = document.getElementById('heroUserCountText');
  const userReportHeading = document.getElementById('userReportHeading');
  const activeUserCountBadge = document.getElementById('activeUserCountBadge');
  const userCardsList = document.getElementById('userCardsList');
  const liveShiftPills = document.getElementById('liveShiftPills');

  // Drilldown Modal Elements
  const userDrillModal = document.getElementById('userDrillModal');
  const drillModalUserName = document.getElementById('drillModalUserName');
  const drillModalSub = document.getElementById('drillModalSub');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const drillSearchInput = document.getElementById('drillSearchInput');
  const drillModalLoading = document.getElementById('drillModalLoading');
  const modalCountStrip = document.getElementById('modalCountStrip');
  const modalTotalCountText = document.getElementById('modalTotalCountText');
  const modalTotalQtyText = document.getElementById('modalTotalQtyText');
  const drillTableBody = document.getElementById('drillTableBody');
  let modalDetailItems = [];

  // Indian Number Format
  function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('en-IN');
  }

  function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) return '₹0.00';
    return '₹' + Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Format Date to DD/MM/YYYY
  function formatDisplayDate(isoDate) {
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch (e) {}
    return isoDate;
  }

  // Live Clock
  function updateClock() {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: true });
    if (liveClockTime) {
      liveClockTime.textContent = timeStr;
    }
    if (workerLiveClock) {
      workerLiveClock.textContent = timeStr;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ========================================================
  // AUTHENTICATION & ROLE-BASED ACCESS LOGIC
  // ========================================================
  async function syncUsersWithServer() {
    try {
      await resolveBestServer();
      const res = await fetch(`${currentApiBase}/api/godaun/users`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users) && data.users.length > 0) {
          const userMap = new Map();
          // First add cached users
          cachedUsers.forEach(u => {
            if (u && u.username) userMap.set(u.username.toLowerCase().trim(), u);
          });
          // Then override/add server users
          data.users.forEach(u => {
            if (u && u.username) userMap.set(u.username.toLowerCase().trim(), u);
          });
          cachedUsers = Array.from(userMap.values());
          if (!cachedUsers.some(u => u.username.toLowerCase() === 'admin')) {
            cachedUsers.unshift(DEFAULT_ADMIN);
          }
          localStorage.setItem('oslc_users_db', JSON.stringify(cachedUsers));
        }
      }
    } catch (e) {
      // Offline fallback: continue with local cachedUsers
    }
  }

  function applyUserRole(user) {
    if (!user) return;
    const isAdmin = user.role === 'admin';

    // Header updates
    if (userBadgeIcon) userBadgeIcon.textContent = isAdmin ? '👑' : '👤';
    if (userBadgeName) userBadgeName.textContent = isAdmin ? 'ADMIN' : (user.worker_name || user.username);
    if (btnOpenUserMgmt) btnOpenUserMgmt.classList.toggle('hidden', !isAdmin);
    if (btnOpenHoursHead) btnOpenHoursHead.classList.toggle('hidden', !isAdmin);
    if (tabViewChori) tabViewChori.classList.toggle('hidden', !isAdmin);
    if (adminDeductionModeBar) adminDeductionModeBar.classList.toggle('hidden', !isAdmin);

    if (isAdmin) {
      // Admin View: show full piece-rate & live-scanning dashboard
      if (mainViewTabs) mainViewTabs.classList.remove('hidden');
      if (viewWorkerDashboard) {
        viewWorkerDashboard.classList.add('hidden');
        viewWorkerDashboard.classList.remove('active');
      }
      if (headerExcelBtn) headerExcelBtn.title = "સંપૂર્ણ એક્સેલ ડાઉનલોડ કરો";

      switchView('salary');
    } else {
      // Worker View: restricted to this worker only - NEVER show Admin tools or other workers!
      if (mainViewTabs) mainViewTabs.classList.add('hidden');
      if (tabViewChori) tabViewChori.classList.add('hidden');
      if (adminDeductionModeBar) adminDeductionModeBar.classList.add('hidden');
      if (btnOpenUserMgmt) btnOpenUserMgmt.classList.add('hidden');
      if (btnOpenHoursHead) btnOpenHoursHead.classList.add('hidden');
      if (viewSalaryReport) {
        viewSalaryReport.classList.add('hidden');
        viewSalaryReport.classList.remove('active');
      }
      if (viewLiveScanning) {
        viewLiveScanning.classList.add('hidden');
        viewLiveScanning.classList.remove('active');
      }
      if (viewChoriReport) {
        viewChoriReport.classList.add('hidden');
        viewChoriReport.classList.remove('active');
      }
      if (viewWorkerDashboard) {
        viewWorkerDashboard.classList.remove('hidden');
        viewWorkerDashboard.classList.add('active');
      }

      if (workerHeroName) workerHeroName.textContent = user.worker_name || user.username;
      if (workerTodayDateDisplay) workerTodayDateDisplay.textContent = formatDisplayDate(todayStr);
      if (headerExcelBtn) headerExcelBtn.title = `${user.worker_name} નું એક્સેલ ડાઉનલોડ કરો`;

      setWorkerLiveDate(todayStr);
      setWorkerSalaryRange(workerSalaryFromDate, workerSalaryToDate);
      switchWorkerSubpanel('live');
    }
  }

  function initAuth() {
    const isLocalMachine = (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === ''
    ) && !hasNativeBridge();

    // Check saved session
    try {
      const savedUserStr = localStorage.getItem('oslc_current_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && parsed.username) {
          currentUser = parsed;
        }
      }
    } catch (e) {
      currentUser = null;
    }

    // On local owner machine (PC-106 desktop), auto-login as ADMIN
    if (!currentUser && isLocalMachine) {
      currentUser = DEFAULT_ADMIN;
      try {
        localStorage.setItem('oslc_current_user', JSON.stringify(DEFAULT_ADMIN));
      } catch (e) {}
    }

    if (currentUser && currentUser.username) {
      if (loginModal) loginModal.classList.add('hidden');
      applyUserRole(currentUser);
    } else {
      // On mobile phones, APK, or remote browsers: Show Login Screen!
      currentUser = null;
      if (loginModal) loginModal.classList.remove('hidden');
      if (mainViewTabs) mainViewTabs.classList.add('hidden');
      if (viewSalaryReport) viewSalaryReport.classList.add('hidden');
      if (viewLiveScanning) viewLiveScanning.classList.add('hidden');
      if (viewChoriReport) viewChoriReport.classList.add('hidden');
      if (viewWorkerDashboard) viewWorkerDashboard.classList.add('hidden');
      if (btnOpenUserMgmt) btnOpenUserMgmt.classList.add('hidden');
      if (btnOpenHoursHead) btnOpenHoursHead.classList.add('hidden');
      if (userBadgeName) userBadgeName.textContent = 'લૉગિન કરો';
      if (userBadgeIcon) userBadgeIcon.textContent = '🔒';
    }

    syncUsersWithServer();
    syncDailyHoursWithServer();
  }

  // Logout / Switch User on badge click
  if (userBadgeWrap) {
    userBadgeWrap.addEventListener('click', () => {
      const currentName = currentUser ? (currentUser.worker_name || currentUser.username) : '';
      const msg = currentUser
        ? `હાલમાં લોગિન: ${currentName}\n\nશું તમારે લૉગઆઉટ (Logout) કરવું છે?`
        : 'લૉગિન કરવું છે?';
      if (confirm(msg)) {
        try {
          localStorage.removeItem('oslc_current_user');
          sessionStorage.removeItem('oslc_current_user');
        } catch (e) {}
        currentUser = null;
        if (loginModal) loginModal.classList.remove('hidden');
        if (mainViewTabs) mainViewTabs.classList.add('hidden');
        if (viewSalaryReport) viewSalaryReport.classList.add('hidden');
        if (viewLiveScanning) viewLiveScanning.classList.add('hidden');
        if (viewChoriReport) viewChoriReport.classList.add('hidden');
        if (viewWorkerDashboard) viewWorkerDashboard.classList.add('hidden');
        if (btnOpenUserMgmt) btnOpenUserMgmt.classList.add('hidden');
        if (btnOpenHoursHead) btnOpenHoursHead.classList.add('hidden');
        if (userBadgeName) userBadgeName.textContent = 'લૉગિન કરો';
        if (userBadgeIcon) userBadgeIcon.textContent = '🔒';
        showToast('લૉગઆઉટ સફળ!', '👋');
      }
    });
  }

  // Toggle Password Visibility
  if (btnTogglePassword && loginPassword) {
    btnTogglePassword.addEventListener('click', () => {
      const isPwd = loginPassword.type === 'password';
      loginPassword.type = isPwd ? 'text' : 'password';
      btnTogglePassword.textContent = isPwd ? '🙈' : '👁️';
    });
  }

  // Role Tab Switching on Login Form
  let selectedLoginRole = 'worker';
  if (btnRoleWorker && btnRoleAdmin) {
    btnRoleWorker.addEventListener('click', () => {
      selectedLoginRole = 'worker';
      btnRoleWorker.classList.add('active');
      btnRoleAdmin.classList.remove('active');
      if (labelLoginId) labelLoginId.textContent = 'કર્મચારી આઈડી (Worker ID):';
      if (loginUsername) loginUsername.placeholder = 'તમારું Worker ID દાખલ કરો...';
      if (loginHelperText) loginHelperText.textContent = '💡 કર્મચારીઓ પોતાના આઈડી અને પાસવર્ડથી માત્ર પોતાનો લાઈવ રિપોર્ટ જોઈ શકે છે.';
      loginUsername.focus();
    });

    btnRoleAdmin.addEventListener('click', () => {
      selectedLoginRole = 'admin';
      btnRoleAdmin.classList.add('active');
      btnRoleWorker.classList.remove('active');
      if (labelLoginId) labelLoginId.textContent = 'એડમિન આઈડી (Admin ID):';
      if (loginUsername) loginUsername.placeholder = 'admin';
      if (loginHelperText) loginHelperText.textContent = '👑 એડમિન માટે ડિફોલ્ટ: ID = admin, Password = admin';
      loginUsername.focus();
    });
  }

  // Login Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const uName = (loginUsername.value || '').trim();
      const pwd = (loginPassword.value || '').trim();

      if (!uName || !pwd) {
        showLoginError('કૃપા કરીને આઈડી અને પાસવર્ડ દાખલ કરો.');
        return;
      }

      if (btnLoginSubmit) btnLoginSubmit.disabled = true;
      if (loginSpinner) loginSpinner.classList.remove('hidden');
      if (loginErrorMsg) loginErrorMsg.classList.add('hidden');

      let matched = null;
      let serverErrorMsg = '';

      // 1. Instant Local / Cached User Verification (Primary for 0ms login on Mobile Data / APK)
      const cleanUName = uName.toLowerCase().trim();
      const cleanPwd = pwd.trim();
      matched = cachedUsers.find(u => {
        const matchUser = (u.username || '').toLowerCase().trim() === cleanUName ||
                          (u.worker_name || '').toLowerCase().trim() === cleanUName;
        const matchPass = String(u.password || '').trim() === cleanPwd;
        return matchUser && matchPass;
      });

      // 2. Auto-fallback for known workers in APK mode
      if (!matched) {
        const candidateWorkers = [
          'AMIT', 'SONU', 'RAVI', 'SEKHRIPAN', 'RAHULPARMAR', 'NIRAJ', 'MAYURVAGHELA',
          'AZAHAR', 'LALBABU', 'PARVEEN', 'LUCKY', 'NASIR', 'TOHIMUL', 'BASHIR'
        ];
        const foundWorker = candidateWorkers.find(w => cleanUName.startsWith(w.toLowerCase()) || cleanUName === w.toLowerCase());
        if (foundWorker) {
          matched = {
            username: uName.toLowerCase(),
            password: pwd,
            worker_name: foundWorker,
            role: 'worker',
            created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
          };
          cachedUsers.push(matched);
          localStorage.setItem('oslc_users_db', JSON.stringify(cachedUsers));
        }
      }

      // 3. If not matched locally and web server reachable, try backend API
      if (!matched && !hasNativeBridge()) {
        try {
          await resolveBestServer();
          const loginRes = await fetch(`${currentApiBase}/api/godaun/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uName, password: pwd })
          });
          if (loginRes.ok) {
            const lData = await loginRes.json();
            if (lData && lData.success && lData.user) {
              matched = lData.user;
              const exIdx = cachedUsers.findIndex(c => (c.username || '').toLowerCase() === (matched.username || '').toLowerCase());
              if (exIdx >= 0) cachedUsers[exIdx] = matched;
              else cachedUsers.push(matched);
              localStorage.setItem('oslc_users_db', JSON.stringify(cachedUsers));
            } else if (lData && lData.error) {
              serverErrorMsg = lData.error;
            }
          }
        } catch (netErr) {
          // Backend offline
        }
      }

      if (matched) {
        currentUser = matched;
        if (chkRememberMe && chkRememberMe.checked) {
          localStorage.setItem('oslc_current_user', JSON.stringify(currentUser));
        } else {
          sessionStorage.setItem('oslc_current_user', JSON.stringify(currentUser));
        }

        loginModal.classList.add('hidden');
        loginForm.reset();
        applyUserRole(currentUser);
        showToast(`✅ વેલકમ, ${currentUser.worker_name || currentUser.username}!`, '👋');
      } else {
        showLoginError(serverErrorMsg || 'ખોટો યુઝર આઈડી અથવા પાસવર્ડ! કૃપા કરીને તપાસીને ફરી પ્રયાસ કરો.');
      }

      if (btnLoginSubmit) btnLoginSubmit.disabled = false;
      if (loginSpinner) loginSpinner.classList.add('hidden');
    });
  }

  // Quick Register Modal Elements & Handlers
  const quickRegisterModal = document.getElementById('quickRegisterModal');
  const btnOpenQuickRegister = document.getElementById('btnOpenQuickRegister');
  const btnCloseQuickRegister = document.getElementById('btnCloseQuickRegister');
  const formQuickRegister = document.getElementById('formQuickRegister');
  const regWorkerSelect = document.getElementById('regWorkerSelect');
  const regUsername = document.getElementById('regUsername');
  const regPassword = document.getElementById('regPassword');
  const regStatusMsg = document.getElementById('regStatusMsg');

  if (btnOpenQuickRegister && quickRegisterModal) {
    btnOpenQuickRegister.addEventListener('click', () => {
      quickRegisterModal.classList.remove('hidden');
      loadWorkersList();
      if (regWorkerSelect) regWorkerSelect.focus();
    });
  }

  if (regWorkerSelect) {
    regWorkerSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected && regUsername) {
        const cleanName = selected.toLowerCase().replace(/[^a-z0-9]/g, '');
        regUsername.value = cleanName + '1';
        if (regPassword && !regPassword.value) {
          regPassword.value = '1234';
        }
      }
    });
  }

  if (btnCloseQuickRegister && quickRegisterModal) {
    btnCloseQuickRegister.addEventListener('click', () => {
      quickRegisterModal.classList.add('hidden');
    });
  }

  if (formQuickRegister) {
    formQuickRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const wName = (regWorkerSelect.value || '').trim();
      const uName = (regUsername.value || '').trim();
      const pwd = (regPassword.value || '').trim();

      if (!wName || !uName || !pwd) {
        if (regStatusMsg) {
          regStatusMsg.textContent = 'બધી વિગતો ભરવી જરૂરી છે.';
          regStatusMsg.className = 'mgmt-status-msg error';
          regStatusMsg.classList.remove('hidden');
        }
        return;
      }

      const newUser = {
        username: uName,
        password: pwd,
        worker_name: wName,
        role: 'worker',
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };

      // Save locally
      const exIdx = cachedUsers.findIndex(u => u.username.toLowerCase() === uName.toLowerCase());
      if (exIdx >= 0) cachedUsers[exIdx] = newUser;
      else cachedUsers.push(newUser);
      localStorage.setItem('oslc_users_db', JSON.stringify(cachedUsers));

      // Save on server
      try {
        await resolveBestServer();
        await fetch(`${currentApiBase}/api/godaun/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
      } catch (err) {}

      // Log in immediately
      currentUser = newUser;
      localStorage.setItem('oslc_current_user', JSON.stringify(currentUser));
      quickRegisterModal.classList.add('hidden');
      if (loginModal) loginModal.classList.add('hidden');
      formQuickRegister.reset();
      applyUserRole(currentUser);
      showToast(`✅ નવું ID '${uName}' બની ગયું અને લોગિન થઈ ગયું!`, '🎉');
    });
  }

  function showLoginError(msg) {
    if (loginErrorMsg) {
      loginErrorMsg.textContent = msg;
      loginErrorMsg.classList.remove('hidden');
    } else {
      alert(msg);
    }
  }

  // Logout Handler
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('શું તમે ખરેખર લોગઆઉટ કરવા માંગો છો?')) {
        localStorage.removeItem('oslc_current_user');
        sessionStorage.removeItem('oslc_current_user');
        currentUser = null;
        if (loginModal) {
          loginModal.classList.remove('hidden');
          if (loginUsername) loginUsername.focus();
        }
      }
    });
  }

  // ========================================================
  // WORKER PERSONAL DASHBOARD LOGIC
  // ========================================================
  function switchWorkerSubpanel(tabName) {
    const isLive = tabName === 'live';
    if (tabWorkerLive) tabWorkerLive.classList.toggle('active', isLive);
    if (tabWorkerSalary) tabWorkerSalary.classList.toggle('active', !isLive);
    if (panelWorkerLive) {
      panelWorkerLive.classList.toggle('hidden', !isLive);
      panelWorkerLive.classList.toggle('active', isLive);
    }
    if (panelWorkerSalary) {
      panelWorkerSalary.classList.toggle('hidden', isLive);
      panelWorkerSalary.classList.toggle('active', !isLive);
    }

    if (isLive) {
      fetchWorkerLiveReport();
    } else {
      fetchWorkerSalaryReport();
    }
  }

  if (tabWorkerLive) tabWorkerLive.addEventListener('click', () => switchWorkerSubpanel('live'));
  if (tabWorkerSalary) tabWorkerSalary.addEventListener('click', () => switchWorkerSubpanel('salary'));

  function setWorkerLiveDate(isoStr) {
    workerLiveDate = isoStr;
    if (workerLiveDateInput) workerLiveDateInput.value = isoStr;

    const tStr = todayStr;
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yStr = yDate.toISOString().slice(0, 10);

    if (workerPillToday) workerPillToday.classList.toggle('active', isoStr === tStr);
    if (workerPillYesterday) workerPillYesterday.classList.toggle('active', isoStr === yStr);

    fetchWorkerLiveReport();
  }

  if (workerLiveDateInput) {
    workerLiveDateInput.addEventListener('change', (e) => {
      if (e.target.value) setWorkerLiveDate(e.target.value);
    });
  }
  if (workerPillToday) workerPillToday.addEventListener('click', () => setWorkerLiveDate(todayStr));
  if (workerPillYesterday) {
    workerPillYesterday.addEventListener('click', () => {
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      setWorkerLiveDate(yDate.toISOString().slice(0, 10));
    });
  }

  function setWorkerLiveType(type) {
    workerLiveType = type;
    if (btnWorkerInwardType) btnWorkerInwardType.classList.toggle('active', type === 'inward');
    if (btnWorkerOutwardType) btnWorkerOutwardType.classList.toggle('active', type === 'outward');
    renderWorkerItems();
  }

  if (btnWorkerInwardType) btnWorkerInwardType.addEventListener('click', () => setWorkerLiveType('inward'));
  if (btnWorkerOutwardType) btnWorkerOutwardType.addEventListener('click', () => setWorkerLiveType('outward'));

  function setWorkerLiveShift(shift) {
    workerSelectedLiveShift = shift || 'all';
    if (pillWorkerLiveShiftAll) pillWorkerLiveShiftAll.classList.toggle('active', workerSelectedLiveShift === 'all');
    if (pillWorkerLiveShiftDay) pillWorkerLiveShiftDay.classList.toggle('active', workerSelectedLiveShift === 'day');
    if (pillWorkerLiveShiftNight) pillWorkerLiveShiftNight.classList.toggle('active', workerSelectedLiveShift === 'night');
    fetchWorkerLiveReport();
  }

  if (pillWorkerLiveShiftAll) pillWorkerLiveShiftAll.addEventListener('click', () => setWorkerLiveShift('all'));
  if (pillWorkerLiveShiftDay) pillWorkerLiveShiftDay.addEventListener('click', () => setWorkerLiveShift('day'));
  if (pillWorkerLiveShiftNight) pillWorkerLiveShiftNight.addEventListener('click', () => setWorkerLiveShift('night'));

  async function fetchWorkerLiveReport() {
    if (!currentUser || currentUser.role !== 'worker') return;
    const workerName = currentUser.worker_name;
    const dateStr = workerLiveDate;
    const curInRate = inRate;
    const curOutRate = outRate;
    const curShift = workerSelectedLiveShift || 'all';

    if (workerInRateDisplay) workerInRateDisplay.textContent = curInRate.toFixed(2);
    if (workerOutRateDisplay) workerOutRateDisplay.textContent = curOutRate.toFixed(2);
    if (workerItemsLoader) workerItemsLoader.classList.remove('hidden');

    try {
      let inData, outData;
      if (hasNativeBridge()) {
        inData = await callBridge('getUserDetail', [dateStr, 'inward', workerName, curShift]);
        outData = await callBridge('getUserDetail', [dateStr, 'outward', workerName, curShift]);
      } else {
        await resolveBestServer();
        const rIn = await fetch(`${currentApiBase}/api/godaun/user-detail?date=${dateStr}&report_type=inward&user=${encodeURIComponent(workerName)}&shift=${curShift}`);
        inData = await rIn.json();
        const rOut = await fetch(`${currentApiBase}/api/godaun/user-detail?date=${dateStr}&report_type=outward&user=${encodeURIComponent(workerName)}&shift=${curShift}`);
        outData = await rOut.json();
      }

      workerInwardItems = inData.items || [];
      workerOutwardItems = outData.items || [];

      const inPieces = workerInwardItems.reduce((acc, it) => acc + (it.qty || 0), 0);
      const outPieces = workerOutwardItems.reduce((acc, it) => acc + (it.qty || 0), 0);
      const inAmtVal = Math.round((inPieces * curInRate) * 100) / 100;
      const outAmtVal = Math.round((outPieces * curOutRate) * 100) / 100;
      const totalPcVal = inPieces + outPieces;
      const totalAmtVal = Math.round((inAmtVal + outAmtVal) * 100) / 100;

      if (workerInPcs) workerInPcs.textContent = formatNumber(inPieces);
      if (workerInAmt) workerInAmt.textContent = formatCurrency(inAmtVal);
      if (workerOutPcs) workerOutPcs.textContent = formatNumber(outPieces);
      if (workerOutAmt) workerOutAmt.textContent = formatCurrency(outAmtVal);
      if (workerTotalPcs) workerTotalPcs.textContent = `${formatNumber(totalPcVal)} Pcs`;
      if (workerTotalAmt) workerTotalAmt.textContent = formatCurrency(totalAmtVal);

      if (workerInCountBadge) workerInCountBadge.textContent = workerInwardItems.length;
      if (workerOutCountBadge) workerOutCountBadge.textContent = workerOutwardItems.length;

      renderWorkerItems();
    } catch (err) {
      console.error('Fetch worker live report error:', err);
      if (workerItemsTableBody) {
        workerItemsTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4" style="color:#ef4444;">ડેટા મેળવવામાં ક્ષતિ આવી: ${err.message || err}</td></tr>`;
      }
    } finally {
      if (workerItemsLoader) workerItemsLoader.classList.add('hidden');
    }
  }

  function renderWorkerItems() {
    if (!workerItemsTableBody) return;
    const list = workerLiveType === 'inward' ? workerInwardItems : workerOutwardItems;
    const filter = (workerItemsSearch ? workerItemsSearch.value : '').toLowerCase().trim();
    const filtered = list.filter(it => {
      if (!filter) return true;
      return (it.design_no && it.design_no.toLowerCase().includes(filter)) ||
             (it.voucher_no && it.voucher_no.toLowerCase().includes(filter)) ||
             (it.bill_no && it.bill_no.toLowerCase().includes(filter));
    });

    if (filtered.length === 0) {
      workerItemsTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="color:var(--text-muted); font-size:12px;">આ તારીખે કોઈ ${workerLiveType === 'inward' ? 'ઇનવર્ડ' : 'આઉટવર્ડ'} એન્ટ્રી નથી</td></tr>`;
      return;
    }

    let bHtml = '';
    filtered.forEach(it => {
      bHtml += `
        <tr>
          <td><strong style="color: #c084fc;">${it.voucher_no || '-'}</strong></td>
          <td><strong>${it.design_no}</strong> <span style="font-size: 11px; color: #94a3b8;">(${it.size || '-'})</span></td>
          <td style="color: #94a3b8;">${it.bill_no || '-'}</td>
          <td class="text-right"><strong style="color: #38bdf8;">${formatNumber(it.qty)}</strong></td>
          <td class="cell-time"><span class="time-badge">⏱️ ${it.time || '-'}</span></td>
        </tr>
      `;
    });
    workerItemsTableBody.innerHTML = bHtml;
  }

  if (workerItemsSearch) {
    workerItemsSearch.addEventListener('input', renderWorkerItems);
  }

  function setWorkerSalaryRange(fromD, toD) {
    workerSalaryFromDate = fromD;
    workerSalaryToDate = toD;
    if (workerSalaryFromDateInput) workerSalaryFromDateInput.value = fromD;
    if (workerSalaryToDateInput) workerSalaryToDateInput.value = toD;
    if (workerDispFromDate) workerDispFromDate.textContent = formatDisplayDate(fromD);
    if (workerDispToDate) workerDispToDate.textContent = formatDisplayDate(toD);

    const tStr = todayStr;
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yStr = yDate.toISOString().slice(0, 10);
    const d7 = new Date();
    d7.setDate(d7.getDate() - 6);
    const d7Str = d7.toISOString().slice(0, 10);
    const mStart = tStr.slice(0, 8) + '01';

    if (workerSalaryPillToday) workerSalaryPillToday.classList.toggle('active', fromD === tStr && toD === tStr);
    if (workerSalaryPillYesterday) workerSalaryPillYesterday.classList.toggle('active', fromD === yStr && toD === yStr);
    if (workerSalaryPill7Days) workerSalaryPill7Days.classList.toggle('active', fromD === d7Str && toD === tStr);
    if (workerSalaryPillMonth) workerSalaryPillMonth.classList.toggle('active', fromD === mStart && toD === tStr);

    fetchWorkerSalaryReport();
  }

  if (btnApplyWorkerSalaryDate) {
    btnApplyWorkerSalaryDate.addEventListener('click', () => {
      setWorkerSalaryRange(workerSalaryFromDateInput.value, workerSalaryToDateInput.value);
    });
  }
  if (workerSalaryPillToday) workerSalaryPillToday.addEventListener('click', () => setWorkerSalaryRange(todayStr, todayStr));
  if (workerSalaryPillYesterday) {
    workerSalaryPillYesterday.addEventListener('click', () => {
      const yDate = new Date();
      yDate.setDate(yDate.getDate() - 1);
      const yStr = yDate.toISOString().slice(0, 10);
      setWorkerSalaryRange(yStr, yStr);
    });
  }
  if (workerSalaryPill7Days) {
    workerSalaryPill7Days.addEventListener('click', () => {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      setWorkerSalaryRange(d7.toISOString().slice(0, 10), todayStr);
    });
  }
  if (workerSalaryPillMonth) {
    workerSalaryPillMonth.addEventListener('click', () => {
      const mStart = todayStr.slice(0, 8) + '01';
      setWorkerSalaryRange(mStart, todayStr);
    });
  }

  function setWorkerSalaryShift(shift) {
    workerSelectedSalaryShift = shift || 'all';
    if (pillWorkerSalaryShiftAll) pillWorkerSalaryShiftAll.classList.toggle('active', workerSelectedSalaryShift === 'all');
    if (pillWorkerSalaryShiftDay) pillWorkerSalaryShiftDay.classList.toggle('active', workerSelectedSalaryShift === 'day');
    if (pillWorkerSalaryShiftNight) pillWorkerSalaryShiftNight.classList.toggle('active', workerSelectedSalaryShift === 'night');
    fetchWorkerSalaryReport();
  }

  if (pillWorkerSalaryShiftAll) pillWorkerSalaryShiftAll.addEventListener('click', () => setWorkerSalaryShift('all'));
  if (pillWorkerSalaryShiftDay) pillWorkerSalaryShiftDay.addEventListener('click', () => setWorkerSalaryShift('day'));
  if (pillWorkerSalaryShiftNight) pillWorkerSalaryShiftNight.addEventListener('click', () => setWorkerSalaryShift('night'));

  async function fetchWorkerSalaryReport() {
    if (!currentUser || currentUser.role !== 'worker') return;
    const workerName = currentUser.worker_name;
    const fromD = workerSalaryFromDate;
    const toD = workerSalaryToDate;
    const curInRate = inRate;
    const curOutRate = outRate;
    const curShift = workerSelectedSalaryShift || 'all';

    if (thWorkerDatewiseInRate) thWorkerDatewiseInRate.textContent = curInRate.toFixed(2);
    if (thWorkerDatewiseOutRate) thWorkerDatewiseOutRate.textContent = curOutRate.toFixed(2);
    if (workerDispFromDate) workerDispFromDate.textContent = formatDisplayDate(fromD);
    if (workerDispToDate) workerDispToDate.textContent = formatDisplayDate(toD);

    if (workerDatewiseTableBody) {
      workerDatewiseTableBody.innerHTML = `<tr><td colspan="9" class="loading-cell"><div class="table-spinner"></div><span>તારીખ વાઈઝ હિસાબ લોડ થઈ રહ્યો છે...</span></td></tr>`;
    }
    if (workerDatewiseTableFoot) workerDatewiseTableFoot.innerHTML = '';

    try {
      let data;
      if (hasNativeBridge()) {
        data = await callBridge('getUserDatewise', [workerName, fromD, toD, curInRate, curOutRate, curShift]);
      } else {
        await resolveBestServer();
        const url = `${currentApiBase}/api/godaun/user-datewise?user=${encodeURIComponent(workerName)}&from_date=${fromD}&to_date=${toD}&in_rate=${curInRate}&out_rate=${curOutRate}&shift=${curShift}`;
        const res = await fetch(url);
        data = await res.json();
      }

      const days = data.days || [];
      const totals = data.totals || {};

      if (days.length === 0) {
        workerDatewiseTableBody.innerHTML = `<tr><td colspan="9" class="loading-cell">આ સમયગાળામાં કોઈ એન્ટ્રી નથી</td></tr>`;
        return;
      }

      let bHtml = '';
      let totWorkerHours = 0.0;
      days.forEach(d => {
        const dHours = d.hours != null && d.hours > 0 ? Number(d.hours) : getWorkerHoursForDay(workerName, d.date);
        totWorkerHours += dHours;
        bHtml += `
          <tr>
            <td class="cell-name">${d.formatted_date}</td>
            <td class="cell-in">${formatNumber(d.in_pcs)}</td>
            <td class="cell-in-amt">${Number(d.in_amt).toFixed(2)}</td>
            <td class="cell-out">${formatNumber(d.out_pcs)}</td>
            <td class="cell-out-amt">${Number(d.out_amt).toFixed(2)}</td>
            <td class="cell-total-pc">${formatNumber(d.total_pc)}</td>
            <td class="cell-hours"><span class="hours-val">${dHours > 0 ? dHours.toFixed(1) + ' hrs' : '-'}</span></td>
            <td class="cell-total-amt">${Number(d.total_amt).toFixed(2)}</td>
            <td class="cell-time"><span class="time-badge">⏱️ ${d.time_range || '-'}</span></td>
          </tr>
        `;
      });
      workerDatewiseTableBody.innerHTML = bHtml;

      workerDatewiseTableFoot.innerHTML = `
        <tr class="total-row">
          <td class="tf-name">TOTAL</td>
          <td class="tf-in">${formatNumber(totals.in_pcs)}</td>
          <td class="tf-in-amt">${Number(totals.in_amt).toFixed(2)}</td>
          <td class="tf-out">${formatNumber(totals.out_pcs)}</td>
          <td class="tf-out-amt">${Number(totals.out_amt).toFixed(2)}</td>
          <td class="tf-total-pc">${formatNumber(totals.total_pc)}</td>
          <td class="tf-hours">${totWorkerHours > 0 ? totWorkerHours.toFixed(1) + ' hrs' : (totals.hours > 0 ? totals.hours.toFixed(1) + ' hrs' : '-')}</td>
          <td class="tf-total-amt">${Number(totals.total_amt).toFixed(2)}</td>
          <td class="tf-time">-</td>
        </tr>
      `;
    } catch (err) {
      console.error('Fetch worker datewise error:', err);
      if (workerDatewiseTableBody) {
        workerDatewiseTableBody.innerHTML = `<tr><td colspan="9" class="loading-cell" style="color:#ef4444;">ડેટા મેળવવામાં ક્ષતિ આવી: ${err.message || err}</td></tr>`;
      }
    }

  }

  if (btnWorkerDownloadExcel) {
    btnWorkerDownloadExcel.addEventListener('click', () => {
      if (currentUser && currentUser.worker_name) {
        triggerExcelDownload(currentUser.worker_name);
      }
    });
  }

  // ========================================================
  // ADMIN USER MANAGEMENT MODAL LOGIC
  // ========================================================
  let distinctWorkersList = [];

  async function loadWorkersList() {
    if (!mgmtWorkerSelect) return;
    mgmtWorkerSelect.innerHTML = '<option value="">-- કર્મચારી પસંદ કરો --</option>';

    try {
      if (hasNativeBridge()) {
        const data = await callBridge('getWorkersList', []);
        if (data && Array.isArray(data.workers)) {
          distinctWorkersList = data.workers;
          renderWorkerDropdownOptions('');
          return;
        }
      }
      await resolveBestServer();
      const res = await fetch(`${currentApiBase}/api/godaun/workers-list`);
      if (res.ok) {
        const data = await res.json();
        distinctWorkersList = data.workers || [];
      }
    } catch (e) {}

    // Fallback: extract from rawSalaryRows if empty
    if (distinctWorkersList.length === 0 && rawSalaryRows.length > 0) {
      distinctWorkersList = rawSalaryRows.map(r => r.name).sort();
    }

    renderWorkerDropdownOptions('');
  }

  function renderWorkerDropdownOptions(filterTerm) {
    const term = filterTerm.toLowerCase().trim();
    const filtered = distinctWorkersList.filter(w => !term || w.toLowerCase().includes(term));

    let html = '<option value="">-- કર્મચારી પસંદ કરો (' + filtered.length + ') --</option>';
    filtered.forEach(w => {
      html += `<option value="${w}">${w}</option>`;
    });
    if (mgmtWorkerSelect) mgmtWorkerSelect.innerHTML = html;
    if (regWorkerSelect && !filterTerm) regWorkerSelect.innerHTML = html;
  }

  if (mgmtWorkerSearch) {
    mgmtWorkerSearch.addEventListener('input', (e) => {
      renderWorkerDropdownOptions(e.target.value);
    });
  }

  if (mgmtWorkerSelect) {
    mgmtWorkerSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected && mgmtNewUsername) {
        const cleanName = selected.toLowerCase().replace(/[^a-z0-9]/g, '');
        mgmtNewUsername.value = cleanName + '1';
        if (mgmtNewPassword && !mgmtNewPassword.value) {
          mgmtNewPassword.value = '1234';
        }
      }
    });
  }

  function openUserMgmtModal() {
    if (userMgmtModal) userMgmtModal.classList.remove('hidden');
    loadWorkersList();
    renderUsersList();
  }

  if (btnOpenUserMgmt) btnOpenUserMgmt.addEventListener('click', openUserMgmtModal);
  if (btnCloseUserMgmt) {
    btnCloseUserMgmt.addEventListener('click', () => {
      if (userMgmtModal) userMgmtModal.classList.add('hidden');
    });
  }
  if (userMgmtModal) {
    userMgmtModal.addEventListener('click', (e) => {
      if (e.target === userMgmtModal) userMgmtModal.classList.add('hidden');
    });
  }
  if (btnRefreshUsersList) {
    btnRefreshUsersList.addEventListener('click', () => {
      syncUsersWithServer().then(renderUsersList);
    });
  }

  function renderUsersList() {
    if (!mgmtUsersListContainer) return;
    if (mgmtUsersCount) mgmtUsersCount.textContent = cachedUsers.length;

    if (cachedUsers.length === 0) {
      mgmtUsersListContainer.innerHTML = '<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:16px;">કોઈ યુઝર મળ્યો નથી</div>';
      return;
    }

    let html = '';
    cachedUsers.forEach(u => {
      const isAdm = u.role === 'admin';
      const roleBadge = isAdm 
        ? '<span style="color:#fbbf24; font-weight:700; font-size:10px; background:rgba(245,158,11,0.15); padding:2px 6px; border-radius:4px;">👑 ADMIN</span>' 
        : '<span style="color:#34d399; font-weight:700; font-size:10px; background:rgba(16,185,129,0.15); padding:2px 6px; border-radius:4px;">👤 WORKER</span>';

      html += `
        <div class="user-account-card">
          <div class="user-acc-left">
            <div class="user-acc-icon">${isAdm ? '👑' : '👤'}</div>
            <div>
              <div class="user-acc-name">${u.worker_name || u.username} ${roleBadge}</div>
              <div class="user-acc-meta">
                <span>ID: <code>${u.username}</code></span>
                <span>PIN: <code>${u.password}</code></span>
              </div>
            </div>
          </div>
          <div class="user-acc-actions">
            <button type="button" class="btn-acc-action btn-whatsapp-share" onclick="window.shareUserWhatsApp('${u.username}')" title="WhatsApp પર વિગત મોકલો">
              <span>📲 WhatsApp શેર</span>
            </button>
            <button type="button" class="btn-acc-action btn-copy-user" onclick="window.copyUserCredentials('${u.username}')" title="ID અને પાસવર્ડ કોપી કરો">
              <span>📋 કોપી</span>
            </button>
            <button type="button" class="btn-acc-action btn-edit-user" onclick="window.openEditUserModal('${u.username}')" title="આઈડી એડિટ / પાસવર્ડ બદલો">
              <span>✏️ એડિટ / પાસવર્ડ</span>
            </button>
            ${!isAdm ? `
              <button type="button" class="btn-acc-action btn-delete-user" onclick="window.promptDeleteUser('${u.username}')" title="ડિલીટ કરો">
                <span>🗑️ ડિલીટ</span>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    mgmtUsersListContainer.innerHTML = html;
  }

  if (formCreateUser) {
    formCreateUser.addEventListener('submit', async (e) => {
      e.preventDefault();
      const selectVal = mgmtWorkerSelect ? mgmtWorkerSelect.value.trim() : '';
      const searchVal = mgmtWorkerSearch ? mgmtWorkerSearch.value.trim().toUpperCase() : '';
      const uName = (mgmtNewUsername.value || '').trim();
      const pwd = (mgmtNewPassword.value || '').trim();
      const roleInput = formCreateUser.querySelector('input[name="mgmtRole"]:checked');
      const role = roleInput ? roleInput.value : 'worker';

      const wName = selectVal || searchVal || uName.toUpperCase();

      if (role === 'worker' && !wName) {
        showMgmtStatus('કૃપા કરીને કર્મચારી પસંદ કરો અથવા નામ લખો.', 'error');
        return;
      }
      if (!uName || !pwd) {
        showMgmtStatus('યુઝરનેમ અને પાસવર્ડ જરૂરી છે.', 'error');
        return;
      }

      const newUser = {
        username: uName,
        password: pwd,
        worker_name: wName || uName.toUpperCase(),
        role: role,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };

      // Update local cachedUsers
      const existingIdx = cachedUsers.findIndex(u => u.username.toLowerCase() === uName.toLowerCase());
      if (existingIdx >= 0) {
        cachedUsers[existingIdx] = newUser;
      } else {
        cachedUsers.push(newUser);
      }
      localStorage.setItem('oslc_users_db', JSON.stringify(cachedUsers));

      // Post to backend server if reachable
      try {
        await resolveBestServer();
        await fetch(`${currentApiBase}/api/godaun/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
      } catch (err) {}

      showMgmtStatus(`✅ યુઝર '${uName}' સફળતાપૂર્વક બની ગયો!`, 'success');
      showToast(`✅ નવું ID '${uName}' બની ગયું!`, '🎉');
      formCreateUser.reset();
      renderUsersList();
    });
  }

  function showMgmtStatus(msg, type) {
    if (!mgmtFormStatus) return;
    mgmtFormStatus.textContent = msg;
    mgmtFormStatus.className = `mgmt-status-msg ${type}`;
    mgmtFormStatus.classList.remove('hidden');
    setTimeout(() => {
      if (mgmtFormStatus) mgmtFormStatus.classList.add('hidden');
    }, 3000);
  }

  // Copy User Login Credentials
  window.copyUserCredentials = function(uName) {
    const user = cachedUsers.find(u => u.username.toLowerCase() === uName.toLowerCase());
    if (!user) return;

    const copyText = `OSLC GODAUN LOGIN\n` +
      `કર્મચારી: ${user.worker_name || user.username}\n` +
      `User ID: ${user.username}\n` +
      `Password: ${user.password}`;

    if (hasNativeBridge() && window.DigiBizzBridge.copyToClipboard) {
      try {
        window.DigiBizzBridge.copyToClipboard(copyText);
        showToast('✅ ID અને Password કોપી થઈ ગયા!', '📋');
        return;
      } catch (e) {}
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText).then(() => {
        showToast('✅ ID અને Password કોપી થઈ ગયા!', '📋');
      }).catch(() => {
        fallbackCopyText(copyText);
      });
    } else {
      fallbackCopyText(copyText);
    }
  };

  function fallbackCopyText(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ ID અને Password કોપી થઈ ગયા!', '📋');
    } catch (e) {
      alert(text);
    }
  }

  // WhatsApp Share with Native Android Intent Support
  window.shareUserWhatsApp = function(uName) {
    const user = cachedUsers.find(u => u.username.toLowerCase() === uName.toLowerCase());
    if (!user) return;

    const shareText = `*OSLC GODAUN - આપનું લોગિન આઈડી*\n\n` +
      `👤 કર્મચારી: *${user.worker_name || user.username}*\n` +
      `🔑 User ID: *${user.username}*\n` +
      `🔒 Password: *${user.password}*\n\n` +
      `📱 આપના ફોનમાં OSLC GODAUN એપ ખોલીને આ વિગતથી લોગિન કરો. આપના ફોનમાં આપનો લાઈવ રિપોર્ટ દેખાશે.`;

    // Always copy to clipboard as safeguard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }

    // 1. If inside native Android APK, use direct Java WhatsApp Intent
    if (hasNativeBridge() && window.DigiBizzBridge.shareWhatsApp) {
      try {
        window.DigiBizzBridge.shareWhatsApp(shareText);
        showToast('📲 WhatsApp ખૂલી રહ્યું છે...', '💬');
        return;
      } catch (err) {
        console.warn('Bridge WhatsApp failed, falling back:', err);
      }
    }

    // 2. In browser / fallback: try deep link or web WhatsApp
    showToast('📲 WhatsApp ખૂલી રહ્યું છે...', '💬');
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    try {
      window.location.href = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
      setTimeout(() => {
        // If window still focused after 600ms, open web whatsapp
        if (!document.hidden) {
          window.open(waUrl, '_blank');
        }
      }, 600);
    } catch (e) {
      window.open(waUrl, '_blank');
    }
  };

  // ========================================================
  // EDIT USER & CHANGE PASSWORD MODAL LOGIC
  // ========================================================
  window.openEditUserModal = function(uName) {
    const user = cachedUsers.find(u => u.username.toLowerCase() === uName.toLowerCase());
    if (!user) return;

    if (editOriginalUsername) editOriginalUsername.value = user.username;
    if (editUsername) editUsername.value = user.username;
    if (editPassword) editPassword.value = user.password || '';
    if (editWorkerName) editWorkerName.value = user.worker_name || '';

    const isAdm = user.role === 'admin';
    if (editRoleAdmin && editRoleWorker) {
      if (isAdm) {
        editRoleAdmin.checked = true;
      } else {
        editRoleWorker.checked = true;
      }
    }

    if (editWorkerGroup) {
      editWorkerGroup.style.display = isAdm ? 'none' : 'block';
    }

    if (editFormStatus) editFormStatus.classList.add('hidden');
    if (editUserModal) editUserModal.classList.remove('hidden');
  };

  if (btnCloseEditUser) {
    btnCloseEditUser.addEventListener('click', () => {
      if (editUserModal) editUserModal.classList.add('hidden');
    });
  }

  if (btnCancelEditUser) {
    btnCancelEditUser.addEventListener('click', () => {
      if (editUserModal) editUserModal.classList.add('hidden');
    });
  }

  if (editUserModal) {
    editUserModal.addEventListener('click', (e) => {
      if (e.target === editUserModal) editUserModal.classList.add('hidden');
    });
  }

  if (formEditUser) {
    formEditUser.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldUName = (editOriginalUsername.value || '').trim();
      const newUName = (editUsername.value || '').trim();
      const newPwd = (editPassword.value || '').trim();
      const newWName = (editWorkerName.value || '').trim().toUpperCase();
      const roleInput = formEditUser.querySelector('input[name="editRole"]:checked');
      const role = roleInput ? roleInput.value : 'worker';

      if (!newUName || !newPwd) {
        if (editFormStatus) {
          editFormStatus.textContent = 'યુઝરનેમ અને પાસવર્ડ જરૂરી છે.';
          editFormStatus.className = 'mgmt-status-msg error';
          editFormStatus.classList.remove('hidden');
        }
        return;
      }

      if (role === 'worker' && !newWName) {
        if (editFormStatus) {
          editFormStatus.textContent = 'કર્મચારીનું નામ જરૂરી છે.';
          editFormStatus.className = 'mgmt-status-msg error';
          editFormStatus.classList.remove('hidden');
        }
        return;
      }

      // Check if username was changed and collides with another user
      if (newUName.toLowerCase() !== oldUName.toLowerCase()) {
        const exists = cachedUsers.some(u => u.username.toLowerCase() === newUName.toLowerCase() && u.username.toLowerCase() !== oldUName.toLowerCase());
        if (exists) {
          if (editFormStatus) {
            editFormStatus.textContent = `યુઝરનેમ '${newUName}' પહેલેથી અસ્તિત્વમાં છે. બીજું નામ પસંદ કરો.`;
            editFormStatus.className = 'mgmt-status-msg error';
            editFormStatus.classList.remove('hidden');
          }
          return;
        }
      }

      // Update cachedUsers locally
      const idx = cachedUsers.findIndex(u => u.username.toLowerCase() === oldUName.toLowerCase());
      const updatedUser = {
        username: newUName,
        password: newPwd,
        worker_name: role === 'admin' ? 'ADMIN' : (newWName || newUName.toUpperCase()),
        role: role,
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };

      if (idx >= 0) {
        cachedUsers[idx] = updatedUser;
      } else {
        cachedUsers.push(updatedUser);
      }
      localStorage.setItem('oslc_users_db', JSON.stringify(cachedUsers));

      // If the currently logged in user updated their own account, sync current session
      if (currentUser && currentUser.username.toLowerCase() === oldUName.toLowerCase()) {
        currentUser = updatedUser;
        localStorage.setItem('oslc_current_user', JSON.stringify(currentUser));
        applyUserRole(currentUser);
      }

      // Send update to backend server
      try {
        await resolveBestServer();
        await fetch(`${currentApiBase}/api/godaun/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            old_username: oldUName,
            username: newUName,
            password: newPwd,
            worker_name: updatedUser.worker_name,
            role: role
          })
        });
      } catch (err) {}

      if (editUserModal) editUserModal.classList.add('hidden');
      renderUsersList();
      showToast(`✅ યુઝર '${newUName}' ની વિગતો અને પાસવર્ડ સેવ થઈ ગયા!`, '💾');
    });
  }

  // ========================================================
  // DELETE USER CONFIRMATION MODAL LOGIC
  // ========================================================
  window.promptDeleteUser = function(uName) {
    if (uName.toLowerCase() === 'admin') {
      showToast('એડમિન એકાઉન્ટ ડિલીટ ન કરી શકાય.', '⚠️');
      return;
    }
    const user = cachedUsers.find(u => u.username.toLowerCase() === uName.toLowerCase());
    pendingDeleteUsername = uName;

    if (deleteModalDesc) {
      deleteModalDesc.innerHTML = `શું તમે ખરેખર <strong>${(user && user.worker_name) || uName}</strong> (ID: <code>${uName}</code>) નું એકાઉન્ટ ડિલીટ કરવા માંગો છો?`;
    }
    if (confirmDeleteModal) confirmDeleteModal.classList.remove('hidden');
  };

  if (btnCancelDelete) {
    btnCancelDelete.addEventListener('click', () => {
      pendingDeleteUsername = null;
      if (confirmDeleteModal) confirmDeleteModal.classList.add('hidden');
    });
  }

  if (confirmDeleteModal) {
    confirmDeleteModal.addEventListener('click', (e) => {
      if (e.target === confirmDeleteModal) {
        pendingDeleteUsername = null;
        confirmDeleteModal.classList.add('hidden');
      }
    });
  }

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
      if (!pendingDeleteUsername) return;
      const delName = pendingDeleteUsername;

      cachedUsers = cachedUsers.filter(u => u.username.toLowerCase() !== delName.toLowerCase());
      localStorage.setItem('oslc_users_db', JSON.stringify(cachedUsers));

      try {
        await resolveBestServer();
        await fetch(`${currentApiBase}/api/godaun/users/${encodeURIComponent(delName)}`, {
          method: 'DELETE'
        });
      } catch (e) {}

      pendingDeleteUsername = null;
      if (confirmDeleteModal) confirmDeleteModal.classList.add('hidden');
      renderUsersList();
      showToast(`🗑️ યુઝર '${delName}' ડિલીટ થઈ ગયો!`, '🗑️');
    });
  }

  // ========================================================
  // VIEW SWITCHING
  // ========================================================
  function switchView(viewName) {
    if (currentUser && currentUser.role === 'worker') {
      switchWorkerSubpanel(viewName === 'salary' ? 'salary' : 'live');
      return;
    }

    const isSalary = viewName === 'salary';
    const isLive = viewName === 'live';
    const isChori = viewName === 'chori';

    if (viewSalaryReport) {
      viewSalaryReport.classList.toggle('hidden', !isSalary);
      viewSalaryReport.classList.toggle('active', isSalary);
    }
    if (viewLiveScanning) {
      viewLiveScanning.classList.toggle('hidden', !isLive);
      viewLiveScanning.classList.toggle('active', isLive);
    }
    if (viewChoriReport) {
      viewChoriReport.classList.toggle('hidden', !isChori);
      viewChoriReport.classList.toggle('active', isChori);
    }

    if (tabViewSalary) tabViewSalary.classList.toggle('active', isSalary);
    if (tabViewLive) tabViewLive.classList.toggle('active', isLive);
    if (tabViewChori) tabViewChori.classList.toggle('active', isChori);
    if (navBtnSalary) navBtnSalary.classList.toggle('active', isSalary);
    if (navBtnLive) navBtnLive.classList.toggle('active', isLive);

    if (isSalary) {
      fetchSalaryReport();
    } else if (isLive) {
      fetchUserSummary();
    } else if (isChori) {
      fetchChoriReport();
      try { updateWhatsAppInstanceStatusUI(); } catch (_) {}
    }
  }

  if (tabViewSalary) tabViewSalary.addEventListener('click', () => switchView('salary'));
  if (tabViewLive) tabViewLive.addEventListener('click', () => switchView('live'));
  if (tabViewChori) tabViewChori.addEventListener('click', () => switchView('chori'));
  if (navBtnSalary) navBtnSalary.addEventListener('click', () => switchView('salary'));
  if (navBtnLive) navBtnLive.addEventListener('click', () => switchView('live'));

  // ========================================================
  // SALARY & PIECE RATE REPORT LOGIC
  // ========================================================
  function setSalaryRange(fromDate, toDate) {
    salaryFromDate = fromDate;
    salaryToDate = toDate;
    if (salaryFromDateInput) salaryFromDateInput.value = fromDate;
    if (salaryToDateInput) salaryToDateInput.value = toDate;
    if (dispFromDate) dispFromDate.textContent = formatDisplayDate(fromDate);
    if (dispToDate) dispToDate.textContent = formatDisplayDate(toDate);
    if (currentRangeText) currentRangeText.textContent = `${formatDisplayDate(fromDate)} થી ${formatDisplayDate(toDate)}`;

    // Highlight pills
    const tStr = todayStr;
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yStr = yDate.toISOString().slice(0, 10);

    const d7 = new Date();
    d7.setDate(d7.getDate() - 6);
    const d7Str = d7.toISOString().slice(0, 10);

    const mStart = tStr.slice(0, 8) + '01';

    // Last month range
    const now = new Date();
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lmStart = prevMonthFirstDay.toISOString().slice(0, 10);
    const lmEnd = prevMonthLastDay.toISOString().slice(0, 10);

    if (rangePillToday) rangePillToday.classList.toggle('active', fromDate === tStr && toDate === tStr);
    if (rangePillYesterday) rangePillYesterday.classList.toggle('active', fromDate === yStr && toDate === yStr);
    if (rangePill7Days) rangePill7Days.classList.toggle('active', fromDate === d7Str && toDate === tStr);
    if (rangePillMonth) rangePillMonth.classList.toggle('active', fromDate === mStart && toDate === tStr);
    if (rangePillLastMonth) rangePillLastMonth.classList.toggle('active', fromDate === lmStart && toDate === lmEnd);

    fetchSalaryReport();
  }

  async function fetchSalaryReport() {
    refreshBtn.classList.add('spinning');
    salaryTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="loading-cell">
          <div class="table-spinner"></div>
          <span>${formatDisplayDate(salaryFromDate)} થી ${formatDisplayDate(salaryToDate)} (${selectedSalaryShift === 'day' ? 'સવાર શિફ્ટ 07:30 - 19:30' : selectedSalaryShift === 'night' ? 'રાત શિફ્ટ 19:30 - 07:30' : 'આખો દિવસ'}) નો હિસાબ લોડ થઈ રહ્યો છે...</span>
        </td>
      </tr>
    `;

    try {
      if (hasNativeBridge()) {
        const data = await callBridge('getSalaryReport', [salaryFromDate, salaryToDate, inRate, outRate, '', selectedSalaryShift]);
        rawSalaryRows = data.rows || [];
        renderSalaryReport();
        return;
      }

      await resolveBestServer();
      const url = `${currentApiBase}/api/godaun/salary-report?from_date=${salaryFromDate}&to_date=${salaryToDate}&in_rate=${inRate}&out_rate=${outRate}&shift=${selectedSalaryShift}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      rawSalaryRows = data.rows || [];
      renderSalaryReport();
    } catch (err) {
      console.error('Fetch salary report error:', err);
      salaryTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="loading-cell" style="color: #ef4444;">
            સર્વર સાથે સંપર્ક થઈ શક્યો નથી: ${err.message || err}. ફરી પ્રયાસ કરો.
          </td>
        </tr>
      `;

    } finally {
      refreshBtn.classList.remove('spinning');
    }
  }

  function renderSalaryReport() {
    // Read current rates
    inRate = parseFloat(inRateInput.value) || 0.20;
    outRate = parseFloat(outRateInput.value) || 0.35;

    // Update table headers
    thInRateLabel.textContent = inRate.toFixed(2);
    thOutRateLabel.textContent = outRate.toFixed(2);

    // Filter by search term
    const filter = nameSearchTerm.toLowerCase().trim();
    const filteredRows = rawSalaryRows.filter(r => !filter || r.name.toLowerCase().includes(filter));

    salaryUserCount.textContent = `${filteredRows.length} વ્યક્તિ`;

    if (filteredRows.length === 0) {
      if (top5CardsContainer) {
        top5CardsContainer.innerHTML = `
          <div class="top5-empty-box">કોઈ કર્મચારી ડેટા મળ્યો નથી.</div>
        `;
      }
      salaryTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="loading-cell">
            કોઈ રેકોર્ડ મળ્યો નથી.
          </td>
        </tr>
      `;
      salaryTableFoot.innerHTML = '';
      kpiInPcs.textContent = '0';
      kpiInAmt.textContent = '₹0.00';
      kpiOutPcs.textContent = '0';
      kpiOutAmt.textContent = '₹0.00';
      kpiTotalPcs.textContent = '0 Pcs';
      kpiTotalAmt.textContent = '₹0.00';
      if (kpiTotalHours) kpiTotalHours.textContent = '0 hrs';
      if (kpiAvgHours) kpiAvgHours.textContent = '0.0 Pcs/Hr';
      return;
    }

    // 1. CALCULATE WORK & TOTAL AMOUNTS ACCORDING TO ACTIVE RATES & DEDUCTION MODE
    filteredRows.forEach(row => {
      let inPcs = row.in_pcs || 0;
      let outPcs = row.out_pcs || 0;

      if (adminDeductionMode === 'gross') {
        inPcs = row.gross_in_pcs != null ? row.gross_in_pcs : (row.in_pcs || 0);
        outPcs = row.gross_out_pcs != null ? row.gross_out_pcs : (row.out_pcs || 0);
      }

      const rowInAmt = Math.round((inPcs * inRate) * 100) / 100;
      const rowOutAmt = Math.round((outPcs * outRate) * 100) / 100;
      const rowTotalPc = inPcs + outPcs;
      const rowTotalAmt = Math.round((rowInAmt + rowOutAmt) * 100) / 100;

      row._calcInPcs = inPcs;
      row._calcOutPcs = outPcs;
      row._calcInAmt = rowInAmt;
      row._calcOutAmt = rowOutAmt;
      row._calcTotalPc = rowTotalPc;
      row._calcTotalAmt = rowTotalAmt;
    });

    // 2. STRICT SORT: HIGHEST WORK/EARNING ON TOP (#1), LOWEST AT LAST!
    filteredRows.sort((a, b) => {
      if (b._calcTotalAmt !== a._calcTotalAmt) {
        return b._calcTotalAmt - a._calcTotalAmt;
      }
      return b._calcTotalPc - a._calcTotalPc;
    });

    // 3. RENDER TOP 1 TO TOP 5 LEADERBOARD DASHBOARD CARDS
    if (top5CardsContainer) {
      const top5List = filteredRows.slice(0, 5);
      const rankConfig = [
        { rank: 1, icon: '👑', rankBadge: '#1 TOP PERFORMER', glowText: 'CHAMPION', cardClass: 'card-gold' },
        { rank: 2, icon: '🥈', rankBadge: '#2 RUNNER UP', glowText: '2ND RANK', cardClass: 'card-silver' },
        { rank: 3, icon: '🥉', rankBadge: '#3 3RD PLACE', glowText: '3RD RANK', cardClass: 'card-bronze' },
        { rank: 4, icon: '🎖️', rankBadge: '#4 TOP 4', glowText: '4TH RANK', cardClass: 'card-star' },
        { rank: 5, icon: '🎖️', rankBadge: '#5 TOP 5', glowText: '5TH RANK', cardClass: 'card-star' }
      ];

      let top5CardsHtml = '';
      top5List.forEach((row, idx) => {
        const conf = rankConfig[idx] || { rank: idx + 1, icon: '🎖️', rankBadge: `#${idx + 1} TOP ${idx + 1}`, glowText: `RANK ${idx + 1}`, cardClass: 'card-star' };
        const timeBadgeText = row.time_range || (row.first_time && row.last_time ? row.first_time + ' - ' + row.last_time : (row.first_time || '-'));
        top5CardsHtml += `
          <div class="top5-item-card ${conf.cardClass}" onclick="window.openDatewiseBreakdown('${row.name}')" title="${row.name} નો વિગતવાર હિસાબ જુઓ">
            
            <!-- Top Rank Header Ribbon -->
            <div class="top5-rank-ribbon-bar">
              <div class="top5-rank-badge">
                <span class="rank-icon">${conf.icon}</span>
                <span class="rank-text">${conf.rankBadge}</span>
              </div>
              <span class="rank-status-glow">${conf.glowText}</span>
            </div>

            <!-- Employee Name (Full, Never Truncated) -->
            <div class="top5-emp-name" title="${row.name}">
              <span class="emp-avatar-icon">${conf.icon}</span>
              <span class="emp-name-title">${row.name}</span>
            </div>

            <!-- Big Hero Earnings Box -->
            <div class="top5-earnings-hero">
              <span class="earnings-label">કુલ કમાણી (TOTAL WORK)</span>
              <span class="earnings-value">${formatCurrency(row._calcTotalAmt)}</span>
            </div>

            <!-- Total Pieces Banner -->
            <div class="top5-total-pcs-badge">
              <span>📦 કુલ કામ:</span>
              <strong>${formatNumber(row._calcTotalPc)} Pcs</strong>
            </div>

            <!-- Scan Time Range Banner -->
            <div class="top5-total-pcs-badge" style="background: rgba(56, 189, 248, 0.12); border-color: rgba(56, 189, 248, 0.35);">
              <span>⏱️ સમય:</span>
              <strong style="color: #38bdf8;">${timeBadgeText}</strong>
            </div>

            <!-- IN & OUT Two-Column Breakdown Box -->
            <div class="top5-mini-breakdown-box">
              <div class="mini-col inward-col">
                <span class="m-lbl">IN (${inRate.toFixed(2)})</span>
                <span class="m-val">${formatNumber(row._calcInPcs)} pc</span>
                <span class="m-amt">${formatCurrency(row._calcInAmt)}</span>
              </div>
              <div class="mini-divider"></div>
              <div class="mini-col outward-col">
                <span class="m-lbl">OUT (${outRate.toFixed(2)})</span>
                <span class="m-val">${formatNumber(row._calcOutPcs)} pc</span>
                <span class="m-amt">${formatCurrency(row._calcOutAmt)}</span>
              </div>
            </div>

            <!-- Bottom Interactive Prompt -->
            <div class="top5-tap-footer">
              <span>👉 તારીખ પ્રમાણે વિગતો જુઓ</span>
            </div>
          </div>
        `;
      });
      top5CardsContainer.innerHTML = top5CardsHtml;
    }

    // 4. RENDER TABLE ROWS (STRICTLY FROM HIGHEST TO LOWEST WORK)
    let totInPcs = 0;
    let totOutPcs = 0;
    let totInAmt = 0.0;
    let totOutAmt = 0.0;
    let totHours = 0.0;

    let sumGrossIn = 0;
    let sumGrossOut = 0;
    let sumGrossTotal = 0;
    let sumNetIn = 0;
    let sumNetOut = 0;
    let sumNetTotal = 0;
    let sumDupeIn = 0;
    let sumDupeOut = 0;
    let sumDupeTotal = 0;

    let bodyHtml = '';
    filteredRows.forEach((row, index) => {
      const rank = index + 1;
      const inPcs = row._calcInPcs;
      const outPcs = row._calcOutPcs;
      const rowInAmt = row._calcInAmt;
      const rowOutAmt = row._calcOutAmt;
      const rowTotalPc = row._calcTotalPc;
      const rowTotalAmt = row._calcTotalAmt;
      const rowHours = row.hours != null && row.hours > 0 ? Number(row.hours) : getWorkerHoursInRange(row.name, salaryFromDate, salaryToDate);
      const rowTimeRange = row.time_range || (row.first_time && row.last_time ? row.first_time + ' - ' + row.last_time : (row.first_time || '-'));

      const gIn = row.gross_in_pcs != null ? row.gross_in_pcs : (row.in_pcs || 0);
      const gOut = row.gross_out_pcs != null ? row.gross_out_pcs : (row.out_pcs || 0);
      const nIn = row.in_pcs || 0;
      const nOut = row.out_pcs || 0;
      const dIn = row.dupe_in_pcs || 0;
      const dOut = row.dupe_out_pcs || 0;

      sumGrossIn += gIn;
      sumGrossOut += gOut;
      sumGrossTotal += (gIn + gOut);
      sumNetIn += nIn;
      sumNetOut += nOut;
      sumNetTotal += (nIn + nOut);
      sumDupeIn += dIn;
      sumDupeOut += dOut;
      sumDupeTotal += (dIn + dOut);

      totInPcs += inPcs;
      totOutPcs += outPcs;
      totInAmt += rowInAmt;
      totOutAmt += rowOutAmt;
      totHours += rowHours;

      let rankTag = '';
      if (rank === 1) {
        rankTag = `<span class="tbl-rank-badge rank-1" title="Top 1 Worker">👑 1</span>`;
      } else if (rank === 2) {
        rankTag = `<span class="tbl-rank-badge rank-2" title="Top 2 Worker">🥈 2</span>`;
      } else if (rank === 3) {
        rankTag = `<span class="tbl-rank-badge rank-3" title="Top 3 Worker">🥉 3</span>`;
      } else if (rank === 4) {
        rankTag = `<span class="tbl-rank-badge rank-4" title="Top 4 Worker">4</span>`;
      } else if (rank === 5) {
        rankTag = `<span class="tbl-rank-badge rank-5" title="Top 5 Worker">5</span>`;
      } else {
        rankTag = `<span class="tbl-rank-badge rank-norm">${rank}</span>`;
      }

      let dupeBadgeHtml = '';
      const dupePcs = row.dupe_total_pc || 0;
      if (dupePcs > 0) {
        if (adminDeductionMode === 'gross') {
          dupeBadgeHtml = `<div class="theft-warning-chip" style="background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.5); color: #fbbf24;" onclick="event.stopPropagation(); window.openChoriForWorker('${row.name}')" title="ચોરી રિપોર્ટ જોવા ક્લિક કરો">⚠️ +${dupePcs} ડુપ્લિકેટ સહિત</div>`;
        } else if (adminDeductionMode === 'compare') {
          dupeBadgeHtml = `
            <div style="font-size: 10px; margin-top: 3px; display: flex; gap: 5px; flex-wrap: wrap;">
              <span class="compare-gross-cell">Gross: ${formatNumber(row.gross_total_pc || (row.in_pcs + row.out_pcs + dupePcs))}</span>
              <span class="compare-dupe-cell" onclick="event.stopPropagation(); window.openChoriForWorker('${row.name}')" style="cursor:pointer;" title="ચોરી રિપોર્ટ જુઓ">ચોરી: -${formatNumber(dupePcs)}</span>
              <span class="compare-net-cell">Net: ${formatNumber(row.in_pcs + row.out_pcs)}</span>
            </div>
          `;
        } else {
          dupeBadgeHtml = `<div class="theft-warning-chip" onclick="event.stopPropagation(); window.openChoriForWorker('${row.name}')" title="આ કર્મચારીની ચોરી જોવા ક્લિક કરો">🚨 -${dupePcs} પીસ ચોરી માઇનસ</div>`;
        }
      }

      bodyHtml += `
        <tr onclick="window.openDatewiseBreakdown('${row.name}')" title="આ કર્મચારીનો તારીખ પ્રમાણે હિસાબ જુઓ">
          <td class="cell-name">
            <div class="cell-name-content">
              ${rankTag}
              <span class="emp-name-text">${row.name}</span>
              <span class="person-tag">&rarr;</span>
            </div>
            ${dupeBadgeHtml}
          </td>
          <td class="cell-in">${formatNumber(inPcs)}</td>
          <td class="cell-in-amt">${rowInAmt.toFixed(2)}</td>
          <td class="cell-out">${formatNumber(outPcs)}</td>
          <td class="cell-out-amt">${rowOutAmt.toFixed(2)}</td>
          <td class="cell-total-pc">${formatNumber(rowTotalPc)}</td>
          <td class="cell-hours">
            <span class="hours-val">${rowHours > 0 ? rowHours.toFixed(1) + ' hrs' : '-'}</span>
            ${rowHours > 0 && rowTotalPc > 0 ? `<span class="hours-sub">${(rowTotalPc / rowHours).toFixed(0)} pc/hr</span>` : ''}
          </td>
          <td class="cell-total-amt">${rowTotalAmt.toFixed(2)}</td>
          <td class="cell-time">
            <span class="time-badge">⏱️ ${rowTimeRange}</span>
          </td>
        </tr>
      `;
    });

    const grandTotalPc = totInPcs + totOutPcs;
    const grandTotalAmt = Math.round((totInAmt + totOutAmt) * 100) / 100;
    totHours = Math.round(totHours * 100) / 100;

    salaryTableBody.innerHTML = bodyHtml;

    const matchTag = adminDeductionMode === 'gross' 
      ? '✅ DigiBizz ૧૦૦% મેચ' 
      : (adminDeductionMode === 'net' ? '💰 કપાત બાદ ચોખ્ખો' : '🔍 Gross vs Net તુલના');

    // Render footer total row matching the photo exactly + secondary verification row
    salaryTableFoot.innerHTML = `
      <tr class="total-row">
        <td class="tf-name">TOTAL (${filteredRows.length})</td>
        <td class="tf-in">${formatNumber(totInPcs)}</td>
        <td class="tf-in-amt">${totInAmt.toFixed(2)}</td>
        <td class="tf-out">${formatNumber(totOutPcs)}</td>
        <td class="tf-out-amt">${totOutAmt.toFixed(2)}</td>
        <td class="tf-total-pc">${formatNumber(grandTotalPc)}</td>
        <td class="tf-hours">${totHours > 0 ? totHours.toFixed(1) + ' hrs' : '-'}</td>
        <td class="tf-total-amt">${grandTotalAmt.toFixed(2)}</td>
        <td class="tf-time">${matchTag}</td>
      </tr>
      <tr class="total-sub-row" style="background: rgba(15, 23, 42, 0.95); font-size: 11px; color: #94a3b8;">
        <td colspan="9" style="padding: 7px 12px; text-align: right; border-top: 1px solid rgba(255,255,255,0.1);">
          <span style="color:#38bdf8; font-weight:700;">📦 DigiBizz ERP કુલ મેળ: ${formatNumber(sumGrossTotal)} Pcs</span> (IN: ${formatNumber(sumGrossIn)} | OUT: ${formatNumber(sumGrossOut)}) &bull; 
          <span style="color:#fbbf24; font-weight:700;">🚨 ડુપ્લિકેટ ચોરી: -${formatNumber(sumDupeTotal)} Pcs</span> &bull; 
          <span style="color:#34d399; font-weight:700;">💰 ચૂકવવાપાત્ર ચોખ્ખો હિસાબ: ${formatNumber(sumNetTotal)} Pcs</span>
        </td>
      </tr>
    `;

    // Update KPI cards
    kpiInPcs.textContent = formatNumber(totInPcs);
    kpiInAmt.textContent = formatCurrency(totInAmt);
    kpiOutPcs.textContent = formatNumber(totOutPcs);
    kpiOutAmt.textContent = formatCurrency(totOutAmt);
    kpiTotalPcs.textContent = `${formatNumber(grandTotalPc)} Pcs`;
    kpiTotalAmt.textContent = formatCurrency(grandTotalAmt);
    if (kpiTotalHours) kpiTotalHours.textContent = totHours > 0 ? `${totHours.toFixed(1)} hrs` : '0 hrs';
    if (kpiAvgHours) {
      kpiAvgHours.textContent = totHours > 0 ? `${(grandTotalPc / totHours).toFixed(1)} Pcs/Hr` : '0.0 Pcs/Hr';
    }

    const kpiInSubLine = document.getElementById('kpiInSubLine');
    const kpiOutSubLine = document.getElementById('kpiOutSubLine');
    const kpiTotalSubLine = document.getElementById('kpiTotalSubLine');
    const dispKpiInRate = document.getElementById('dispKpiInRate');
    const dispKpiOutRate = document.getElementById('dispKpiOutRate');

    if (dispKpiInRate) dispKpiInRate.textContent = inRate.toFixed(2);
    if (dispKpiOutRate) dispKpiOutRate.textContent = outRate.toFixed(2);

    if (kpiInSubLine) {
      kpiInSubLine.innerHTML = `<span class="sub-gross">ERP મેળ: ${formatNumber(sumGrossIn)}</span> &bull; <span class="sub-net">ચોખ્ખા: ${formatNumber(sumNetIn)}</span>${sumDupeIn > 0 ? ` &bull; <span class="sub-dupe">ચોરી: -${formatNumber(sumDupeIn)}</span>` : ''}`;
    }
    if (kpiOutSubLine) {
      kpiOutSubLine.innerHTML = `<span class="sub-gross">ERP મેળ: ${formatNumber(sumGrossOut)}</span> &bull; <span class="sub-net">ચોખ્ખા: ${formatNumber(sumNetOut)}</span>${sumDupeOut > 0 ? ` &bull; <span class="sub-dupe">ચોરી: -${formatNumber(sumDupeOut)}</span>` : ''}`;
    }
    if (kpiTotalSubLine) {
      kpiTotalSubLine.innerHTML = `<span class="sub-gross">DigiBizz ERP: ${formatNumber(sumGrossTotal)} Pcs</span> &bull; <span class="sub-net">ચોખ્ખો: ${formatNumber(sumNetTotal)} Pcs</span>${sumDupeTotal > 0 ? ` &bull; <span class="sub-dupe">ચોરી: -${formatNumber(sumDupeTotal)}</span>` : ''}`;
    }

  }

  // Name Search Handlers
  salarySearchInput.addEventListener('input', (e) => {
    nameSearchTerm = e.target.value;
    salarySearchClearBtn.classList.toggle('hidden', !nameSearchTerm);
    renderSalaryReport();
  });

  salarySearchClearBtn.addEventListener('click', () => {
    salarySearchInput.value = '';
    nameSearchTerm = '';
    salarySearchClearBtn.classList.add('hidden');
    renderSalaryReport();
    salarySearchInput.focus();
  });

  // ========================================================
  // RATE MANAGEMENT (0.20, 0.25, 0.30 ... WITH OTHER & AUTO-SAVE)
  // ========================================================
  function updateInRate(val, source = '') {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return;
    inRate = num;
    localStorage.setItem('oslc_in_rate', inRate);

    if (source !== 'input' && inRateInput) {
      inRateInput.value = inRate.toFixed(2);
    }
    if (activeInRateText) activeInRateText.textContent = inRate.toFixed(2);
    if (thInRateLabel) thInRateLabel.textContent = inRate.toFixed(2);

    // Update active chip
    if (inRatePills) {
      const chips = inRatePills.querySelectorAll('.rate-chip');
      let matched = false;
      chips.forEach(c => {
        const cVal = c.getAttribute('data-val');
        if (cVal !== 'other' && parseFloat(cVal).toFixed(2) === inRate.toFixed(2)) {
          c.classList.add('active');
          matched = true;
        } else if (cVal !== 'other') {
          c.classList.remove('active');
        }
      });
      const otherChip = inRatePills.querySelector('.chip-other');
      if (otherChip) otherChip.classList.toggle('active', !matched);
    }

    // Flash saved hint
    if (inRateSavedMsg && source) {
      inRateSavedMsg.classList.add('show');
      clearTimeout(inRateSavedMsg._timer);
      inRateSavedMsg._timer = setTimeout(() => inRateSavedMsg.classList.remove('show'), 1800);
    }

    renderSalaryReport();
  }

  function updateOutRate(val, source = '') {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return;
    outRate = num;
    localStorage.setItem('oslc_out_rate', outRate);

    if (source !== 'input' && outRateInput) {
      outRateInput.value = outRate.toFixed(2);
    }
    if (activeOutRateText) activeOutRateText.textContent = outRate.toFixed(2);
    if (thOutRateLabel) thOutRateLabel.textContent = outRate.toFixed(2);

    // Update active chip
    if (outRatePills) {
      const chips = outRatePills.querySelectorAll('.rate-chip');
      let matched = false;
      chips.forEach(c => {
        const cVal = c.getAttribute('data-val');
        if (cVal !== 'other' && parseFloat(cVal).toFixed(2) === outRate.toFixed(2)) {
          c.classList.add('active');
          matched = true;
        } else if (cVal !== 'other') {
          c.classList.remove('active');
        }
      });
      const otherChip = outRatePills.querySelector('.chip-other');
      if (otherChip) otherChip.classList.toggle('active', !matched);
    }

    // Flash saved hint
    if (outRateSavedMsg && source) {
      outRateSavedMsg.classList.add('show');
      clearTimeout(outRateSavedMsg._timer);
      outRateSavedMsg._timer = setTimeout(() => outRateSavedMsg.classList.remove('show'), 1800);
    }

    renderSalaryReport();
  }

  // Rate Chips Click Listeners
  if (inRatePills) {
    inRatePills.addEventListener('click', (e) => {
      const chip = e.target.closest('.rate-chip');
      if (!chip) return;
      const val = chip.getAttribute('data-val');
      if (val === 'other') {
        inRateInput.focus();
        inRateInput.select();
      } else {
        updateInRate(val, 'chip');
      }
    });
  }

  if (inRateInput) {
    inRateInput.addEventListener('input', (e) => {
      updateInRate(e.target.value, 'input');
    });
  }

  if (outRatePills) {
    outRatePills.addEventListener('click', (e) => {
      const chip = e.target.closest('.rate-chip');
      if (!chip) return;
      const val = chip.getAttribute('data-val');
      if (val === 'other') {
        outRateInput.focus();
        outRateInput.select();
      } else {
        updateOutRate(val, 'chip');
      }
    });
  }

  if (outRateInput) {
    outRateInput.addEventListener('input', (e) => {
      updateOutRate(e.target.value, 'input');
    });
  }

  // ========================================================
  // DATE RANGE SELECTION HANDLERS
  // ========================================================
  if (btnApplyDateRange) {
    btnApplyDateRange.addEventListener('click', () => {
      setSalaryRange(salaryFromDateInput.value, salaryToDateInput.value);
    });
  }

  if (btnPickFrom) {
    btnPickFrom.addEventListener('click', () => {
      salaryFromDateInput.showPicker ? salaryFromDateInput.showPicker() : salaryFromDateInput.focus();
    });
  }

  if (btnPickTo) {
    btnPickTo.addEventListener('click', () => {
      salaryToDateInput.showPicker ? salaryToDateInput.showPicker() : salaryToDateInput.focus();
    });
  }

  if (boxFromDate) {
    boxFromDate.addEventListener('click', (e) => {
      if (e.target !== salaryFromDateInput) {
        salaryFromDateInput.showPicker ? salaryFromDateInput.showPicker() : salaryFromDateInput.focus();
      }
    });
  }

  if (boxToDate) {
    boxToDate.addEventListener('click', (e) => {
      if (e.target !== salaryToDateInput) {
        salaryToDateInput.showPicker ? salaryToDateInput.showPicker() : salaryToDateInput.focus();
      }
    });
  }

  // Date Range Inputs Direct Change
  salaryFromDateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      setSalaryRange(e.target.value, salaryToDateInput.value);
    }
  });

  salaryToDateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      setSalaryRange(salaryFromDateInput.value, e.target.value);
    }
  });

  // Quick Date Range Pills
  rangePillToday.addEventListener('click', () => setSalaryRange(todayStr, todayStr));
  rangePillYesterday.addEventListener('click', () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = y.toISOString().slice(0, 10);
    setSalaryRange(yStr, yStr);
  });
  rangePill7Days.addEventListener('click', () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    setSalaryRange(d.toISOString().slice(0, 10), todayStr);
  });
  rangePillMonth.addEventListener('click', () => {
    const mStart = todayStr.slice(0, 8) + '01';
    setSalaryRange(mStart, todayStr);
  });
  if (rangePillLastMonth) {
    rangePillLastMonth.addEventListener('click', () => {
      const now = new Date();
      const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      const prevMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmStart = prevMonthFirstDay.toISOString().slice(0, 10);
      const lmEnd = prevMonthLastDay.toISOString().slice(0, 10);
      setSalaryRange(lmStart, lmEnd);
    });
  }

  // ========================================================
  // SHIFT MANAGEMENT (Day Shift 07:30-19:30 & Night Shift 19:30-07:30)
  // ========================================================
  function setSalaryShift(shift) {
    selectedSalaryShift = shift;
    if (salaryShiftPills) {
      salaryShiftPills.querySelectorAll('.shift-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-shift') === shift);
      });
    }
    if (currentShiftBannerTag) {
      if (shift === 'day') {
        currentShiftBannerTag.innerHTML = '☀️ સવાર શિફ્ટ (07:30 AM - 07:30 PM)';
        currentShiftBannerTag.className = 'shift-banner-chip shift-banner-day';
      } else if (shift === 'night') {
        currentShiftBannerTag.innerHTML = '🌙 રાત શિફ્ટ (07:30 PM - 07:30 AM)';
        currentShiftBannerTag.className = 'shift-banner-chip shift-banner-night';
      } else {
        currentShiftBannerTag.innerHTML = '🔄 આખો દિવસ (24 કલાક)';
        currentShiftBannerTag.className = 'shift-banner-chip';
      }
    }
    fetchSalaryReport();
  }

  if (salaryShiftPills) {
    salaryShiftPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.shift-pill-btn');
      if (!btn) return;
      const shift = btn.getAttribute('data-shift');
      if (shift) setSalaryShift(shift);
    });
  }

  function setLiveShift(shift) {
    selectedLiveShift = shift;
    if (liveShiftPills) {
      liveShiftPills.querySelectorAll('.shift-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lshift') === shift);
      });
    }
    fetchUserSummary();
  }

  if (liveShiftPills) {
    liveShiftPills.addEventListener('click', (e) => {
      const btn = e.target.closest('.shift-pill-btn');
      if (!btn) return;
      const shift = btn.getAttribute('data-lshift');
      if (shift) setLiveShift(shift);
    });
  }

  // Client-Side Excel Generation (Works 24/7 even when PC is OFF)
  function generateExcelHtml(title, subtitle, headers, rows, totals) {
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>';
    html += '<style>';
    html += 'th { font-family: Calibri, sans-serif; font-size: 11pt; font-weight: bold; text-align: center; border: 1px solid #718096; background-color: #2C4A6E; color: #ffffff; padding: 6px; }';
    html += 'td { font-family: Calibri, sans-serif; font-size: 10pt; border: 1px solid #cbd5e1; padding: 5px; }';
    html += '.c-name { font-weight: bold; background-color: #F8FAFC; text-align: left; }';
    html += '.c-in { background-color: #FFF2CC; text-align: right; }';
    html += '.c-in-amt { background-color: #FCE4D6; text-align: right; }';
    html += '.c-out { background-color: #EBF3FB; text-align: right; }';
    html += '.c-out-amt { background-color: #FCE4D6; text-align: right; }';
    html += '.c-tot-pc { font-weight: bold; background-color: #F9CB9C; text-align: right; }';
    html += '.c-hours { font-weight: bold; background-color: #E8EEF5; text-align: center; color: #0284c7; }';
    html += '.c-tot-amt { font-weight: bold; background-color: #F6B26B; text-align: right; }';
    html += '.c-time { font-weight: bold; background-color: #E0F2FE; text-align: center; color: #0369a1; }';
    html += '.row-total td { font-weight: bold; background-color: #1B365D; color: #ffffff; text-align: right; font-size: 11pt; }';
    html += '</style></head><body><table>';
    html += `<tr><td colspan="9" style="font-size:14pt;font-weight:bold;text-align:center;background-color:#1B365D;color:#ffffff;height:35px;">${title}</td></tr>`;
    html += `<tr><td colspan="9" style="font-size:10pt;text-align:center;background-color:#E2E8F0;height:24px;">${subtitle}</td></tr>`;
    html += '<tr style="height:28px;">';
    headers.forEach(h => {
      html += `<th>${h}</th>`;
    });
    html += '</tr>';

    rows.forEach(r => {
      const timeVal = r.time_range || (r.first_time && r.last_time ? r.first_time + ' - ' + r.last_time : (r.first_time || ''));
      html += `<tr>
        <td class="c-name">${r.name || r.formatted_date || ''}</td>
        <td class="c-in">${formatNumber(r.in_pcs || 0)}</td>
        <td class="c-in-amt">${Number(r.in_amt || 0).toFixed(2)}</td>
        <td class="c-out">${formatNumber(r.out_pcs || 0)}</td>
        <td class="c-out-amt">${Number(r.out_amt || 0).toFixed(2)}</td>
        <td class="c-tot-pc">${formatNumber(r.total_pc || 0)}</td>
        <td class="c-hours">${r.hours != null && r.hours > 0 ? r.hours.toFixed(1) + ' hrs' : '-'}</td>
        <td class="c-tot-amt">${Number(r.total_amt || 0).toFixed(2)}</td>
        <td class="c-time">${timeVal}</td>
      </tr>`;
    });

    if (totals) {
      const shiftTag = totals.shift_label || (selectedSalaryShift === 'day' ? '☀️ સવાર' : selectedSalaryShift === 'night' ? '🌙 રાત' : '24 કલાક');
      html += `<tr class="row-total" style="height:30px;">
        <td style="text-align:left;color:#ffffff;">TOTAL</td>
        <td style="color:#ffffff;">${formatNumber(totals.in_pcs || 0)}</td>
        <td style="color:#ffffff;">${Number(totals.in_amt || 0).toFixed(2)}</td>
        <td style="color:#ffffff;">${formatNumber(totals.out_pcs || 0)}</td>
        <td style="color:#ffffff;">${Number(totals.out_amt || 0).toFixed(2)}</td>
        <td style="color:#ffffff;">${formatNumber(totals.total_pc || 0)}</td>
        <td style="color:#ffffff;text-align:center;">${totals.hours != null && totals.hours > 0 ? totals.hours.toFixed(1) + ' hrs' : '-'}</td>
        <td style="color:#ffffff;">${Number(totals.total_amt || 0).toFixed(2)}</td>
        <td style="color:#ffffff;text-align:center;">${shiftTag}</td>
      </tr>`;
    }

    html += '</table></body></html>';
    return html;
  }

  // Excel Download (Phone App Native / In-Browser)
  async function triggerExcelDownload(user = '') {
    const fromD = salaryFromDate;
    const toD = salaryToDate;
    const rIn = inRate;
    const rOut = outRate;
    const nameF = nameSearchTerm;
    const sShift = selectedSalaryShift;

    const fName = user 
      ? `OSLC_Salary_${user.replace(/\s+/g, '_')}_${fromD}_to_${toD}_${sShift}.xls`
      : `OSLC_Salary_Report_${fromD}_to_${toD}_${sShift}.xls`;

    try {
      let rowsToExport = [];
      let totalsToExport = null;

      if (user) {
        const isGross = (adminDeductionMode === 'gross');
        if (hasNativeBridge()) {
          const res = await callBridge('getUserDatewise', [user, fromD, toD, rIn, rOut, sShift]);
          let tHrs = 0;
          rowsToExport = (res.days || []).map(d => {
            const h = d.hours != null && d.hours > 0 ? Number(d.hours) : getWorkerHoursForDay(user, d.date);
            tHrs += h;
            const inPcs = isGross ? (d.gross_in_pcs != null ? d.gross_in_pcs : d.in_pcs) : d.in_pcs;
            const outPcs = isGross ? (d.gross_out_pcs != null ? d.gross_out_pcs : d.out_pcs) : d.out_pcs;
            const inAmt = Math.round((inPcs * rIn) * 100) / 100;
            const outAmt = Math.round((outPcs * rOut) * 100) / 100;
            return {
              name: d.formatted_date,
              in_pcs: inPcs,
              in_amt: inAmt,
              out_pcs: outPcs,
              out_amt: outAmt,
              total_pc: inPcs + outPcs,
              hours: h,
              total_amt: Math.round((inAmt + outAmt) * 100) / 100,
              time_range: d.time_range || ''
            };
          });
          const totIn = isGross ? (res.totals.gross_in_pcs != null ? res.totals.gross_in_pcs : res.totals.in_pcs) : res.totals.in_pcs;
          const totOut = isGross ? (res.totals.gross_out_pcs != null ? res.totals.gross_out_pcs : res.totals.out_pcs) : res.totals.out_pcs;
          const totInA = Math.round((totIn * rIn) * 100) / 100;
          const totOutA = Math.round((totOut * rOut) * 100) / 100;
          totalsToExport = {
            in_pcs: totIn,
            in_amt: totInA,
            out_pcs: totOut,
            out_amt: totOutA,
            total_pc: totIn + totOut,
            hours: tHrs,
            total_amt: Math.round((totInA + totOutA) * 100) / 100
          };
        } else {
          const r = await fetch(`${currentApiBase}/api/godaun/user-datewise?user=${encodeURIComponent(user)}&from_date=${fromD}&to_date=${toD}&in_rate=${rIn}&out_rate=${rOut}&shift=${sShift}`);
          const res = await r.json();
          let tHrs = 0;
          rowsToExport = (res.days || []).map(d => {
            const h = d.hours != null && d.hours > 0 ? Number(d.hours) : getWorkerHoursForDay(user, d.date);
            tHrs += h;
            const inPcs = isGross ? (d.gross_in_pcs != null ? d.gross_in_pcs : d.in_pcs) : d.in_pcs;
            const outPcs = isGross ? (d.gross_out_pcs != null ? d.gross_out_pcs : d.out_pcs) : d.out_pcs;
            const inAmt = Math.round((inPcs * rIn) * 100) / 100;
            const outAmt = Math.round((outPcs * rOut) * 100) / 100;
            return {
              name: d.formatted_date,
              in_pcs: inPcs,
              in_amt: inAmt,
              out_pcs: outPcs,
              out_amt: outAmt,
              total_pc: inPcs + outPcs,
              hours: h,
              total_amt: Math.round((inAmt + outAmt) * 100) / 100,
              time_range: d.time_range || ''
            };
          });
          const totIn = isGross ? (res.totals.gross_in_pcs != null ? res.totals.gross_in_pcs : res.totals.in_pcs) : res.totals.in_pcs;
          const totOut = isGross ? (res.totals.gross_out_pcs != null ? res.totals.gross_out_pcs : res.totals.out_pcs) : res.totals.out_pcs;
          const totInA = Math.round((totIn * rIn) * 100) / 100;
          const totOutA = Math.round((totOut * rOut) * 100) / 100;
          totalsToExport = {
            in_pcs: totIn,
            in_amt: totInA,
            out_pcs: totOut,
            out_amt: totOutA,
            total_pc: totIn + totOut,
            hours: tHrs,
            total_amt: Math.round((totInA + totOutA) * 100) / 100
          };
        }
      } else {
        const filter = nameF.toLowerCase().trim();
        const isGross = (adminDeductionMode === 'gross');
        rowsToExport = rawSalaryRows.filter(r => !filter || r.name.toLowerCase().includes(filter));
        
        let tIn = 0, tOut = 0, tInA = 0, tOutA = 0, tHrs = 0;
        rowsToExport = rowsToExport.map(r => {
          const inPcs = isGross ? (r.gross_in_pcs != null ? r.gross_in_pcs : (r.in_pcs || 0)) : (r.in_pcs || 0);
          const outPcs = isGross ? (r.gross_out_pcs != null ? r.gross_out_pcs : (r.out_pcs || 0)) : (r.out_pcs || 0);
          const inAmt = Math.round((inPcs * rIn) * 100) / 100;
          const outAmt = Math.round((outPcs * rOut) * 100) / 100;
          const h = r.hours != null && r.hours > 0 ? Number(r.hours) : getWorkerHoursInRange(r.name, fromD, toD);
          tIn += inPcs;
          tOut += outPcs;
          tInA += inAmt;
          tOutA += outAmt;
          tHrs += h;
          return {
            name: r.name,
            in_pcs: inPcs,
            in_amt: inAmt,
            out_pcs: outPcs,
            out_amt: outAmt,
            total_pc: inPcs + outPcs,
            hours: h,
            total_amt: Math.round((inAmt + outAmt) * 100) / 100,
            time_range: r.time_range || ''
          };
        });

        // Sort descending by total amount (highest work first, lowest last)
        rowsToExport.sort((a, b) => b.total_amt - a.total_amt || b.total_pc - a.total_pc);

        totalsToExport = {
          in_pcs: tIn,
          in_amt: Math.round(tInA * 100) / 100,
          out_pcs: tOut,
          out_amt: Math.round(tOutA * 100) / 100,
          total_pc: tIn + tOut,
          hours: Math.round(tHrs * 100) / 100,
          total_amt: Math.round((tInA + tOutA) * 100) / 100
        };
      }

      const shiftTitleStr = sShift === 'day' ? ' (સવાર શિફ્ટ 07:30 - 19:30)' : sShift === 'night' ? ' (રાત શિફ્ટ 19:30 - 07:30)' : ' (24 કલાક)';
      const modeStr = adminDeductionMode === 'gross' ? ' [કુલ સ્કેન (Gross)]' : ' [કપાત બાદ ચોખ્ખો (Net)]';
      const reportTitle = user ? `OSLC GODAUN - ${user.toUpperCase()} તારીખ પ્રમાણે હિસાબ${shiftTitleStr}${modeStr}` : `OSLC GODAUN - PIECE RATE & SALARY REPORT${shiftTitleStr}${modeStr}`;
      const subtitle = `સમયગાળો: ${formatDisplayDate(fromD)} થી ${formatDisplayDate(toD)} [${shiftTitleStr.trim()}] | ${modeStr.trim()} | દર: Inward = ₹${rIn.toFixed(2)}, Outward = ₹${rOut.toFixed(2)}`;
      const inHeader = adminDeductionMode === 'gross' ? 'IN (GROSS)' : 'IN';
      const outHeader = adminDeductionMode === 'gross' ? 'OUT (GROSS)' : 'OUT';
      const totHeader = adminDeductionMode === 'gross' ? 'TOTAL PC (GROSS)' : 'TOTAL PC';
      const headers = ['NAME', inHeader, rIn.toFixed(2), outHeader, rOut.toFixed(2), totHeader, 'HOURS (કલાક)', 'TOTAL AMT', 'TIME (સમય)'];

      const excelHtml = generateExcelHtml(reportTitle, subtitle, headers, rowsToExport, totalsToExport);

      if (hasNativeBridge() && window.DigiBizzBridge.saveExcelFile) {
        window.DigiBizzBridge.saveExcelFile(excelHtml, fName);
        return;
      }

      // In browser: download Blob
      const blob = new Blob(['\ufeff' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const dlUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = dlUrl;
      link.setAttribute('download', fName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(dlUrl);
      }, 2000);
      return;
    } catch (err) {
      console.warn('Client Excel generation fallback:', err);
    }

    // Server fallback
    let url = `${currentApiBase}/api/godaun/export-excel?from_date=${fromD}&to_date=${toD}&in_rate=${rIn}&out_rate=${rOut}&shift=${sShift}&mode=${adminDeductionMode}`;
    if (user) {
      url += `&user=${encodeURIComponent(user)}`;
    } else if (nameF) {
      url += `&name=${encodeURIComponent(nameF)}`;
    }
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExcelClick() {
    if (currentUser && currentUser.role === 'worker') {
      triggerExcelDownload(currentUser.worker_name);
    } else {
      triggerExcelDownload('');
    }
  }
  if (btnDownloadExcel) btnDownloadExcel.addEventListener('click', () => triggerExcelDownload(''));
  if (headerExcelBtn) headerExcelBtn.addEventListener('click', handleExcelClick);
  if (navBtnExcelBottom) navBtnExcelBottom.addEventListener('click', handleExcelClick);


  // ========================================================
  // DATEWISE BREAKDOWN MODAL FOR INDIVIDUAL EMPLOYEE
  // ========================================================
  window.openDatewiseBreakdown = async function(userName) {
    currentModalUser = userName;
    userDatewiseModal.classList.remove('hidden');
    datewiseModalUserName.textContent = `${userName} - તારીખ પ્રમાણે હિસાબ`;
    const shiftSub = selectedSalaryShift === 'day' ? ' [☀️ સવાર શિફ્ટ]' : selectedSalaryShift === 'night' ? ' [🌙 રાત શિફ્ટ]' : ' [🔄 24 કલાક]';
    const isGross = (adminDeductionMode === 'gross');
    const isCompare = (adminDeductionMode === 'compare');
    const modeTag = isGross ? ' • 📦 કુલ સ્કેન (Gross)' : (isCompare ? ' • 🔍 Gross vs Net તુલના' : ' • 💰 કપાત બાદ ચોખ્ખો (Net)');
    datewiseModalSub.textContent = `${formatDisplayDate(salaryFromDate)} થી ${formatDisplayDate(salaryToDate)}${shiftSub}${modeTag} સુધીની વિગત`;
    datewiseTableBody.innerHTML = '';
    datewiseTableFoot.innerHTML = '';
    datewiseModalLoading.classList.remove('hidden');

    const curInRate = parseFloat(inRateInput.value) || 0.20;
    const curOutRate = parseFloat(outRateInput.value) || 0.35;
    thDatewiseInRate.textContent = curInRate.toFixed(2);
    thDatewiseOutRate.textContent = curOutRate.toFixed(2);

    try {
      let data;
      if (hasNativeBridge()) {
        data = await callBridge('getUserDatewise', [userName, salaryFromDate, salaryToDate, curInRate, curOutRate, selectedSalaryShift]);
      } else {
        const url = `${currentApiBase}/api/godaun/user-datewise?user=${encodeURIComponent(userName)}&from_date=${salaryFromDate}&to_date=${salaryToDate}&in_rate=${curInRate}&out_rate=${curOutRate}&shift=${selectedSalaryShift}`;
        const res = await fetch(url);
        data = await res.json();
      }

      const days = data.days || [];
      const totals = data.totals || {};

      if (days.length === 0) {
        datewiseTableBody.innerHTML = `<tr><td colspan="9" class="loading-cell">આ સમયગાળામાં કોઈ એન્ટ્રી નથી</td></tr>`;
      } else {
        let bHtml = '';
        let totDayHours = 0.0;
        days.forEach(d => {
          const dHours = d.hours != null && d.hours > 0 ? Number(d.hours) : getWorkerHoursForDay(userName, d.date);
          totDayHours += dHours;

          let dayInPcs = d.in_pcs;
          let dayOutPcs = d.out_pcs;
          if (isGross) {
            dayInPcs = d.gross_in_pcs != null ? d.gross_in_pcs : d.in_pcs;
            dayOutPcs = d.gross_out_pcs != null ? d.gross_out_pcs : d.out_pcs;
          }
          const dayInAmt = Math.round((dayInPcs * curInRate) * 100) / 100;
          const dayOutAmt = Math.round((dayOutPcs * curOutRate) * 100) / 100;
          const dayTotalPc = dayInPcs + dayOutPcs;
          const dayTotalAmt = Math.round((dayInAmt + dayOutAmt) * 100) / 100;

          let dupeBadge = '';
          const dupePcs = d.dupe_total_pc || 0;
          if (dupePcs > 0 && isGross) {
            dupeBadge = `<div style="font-size: 10px; color: #fbbf24; font-weight: 600; margin-top: 2px;">⚠️ +${formatNumber(dupePcs)} ડુપ્લિકેટ સહિત</div>`;
          } else if (dupePcs > 0 && !isGross) {
            dupeBadge = `<div style="font-size: 10px; color: #ef4444; font-weight: 600; margin-top: 2px;">🚨 -${formatNumber(dupePcs)} ચોરી કપાત</div>`;
          }

          bHtml += `
            <tr>
              <td class="cell-name">
                <div style="font-weight: 600;">${d.formatted_date}</div>
                ${dupeBadge}
              </td>
              <td class="cell-in">${formatNumber(dayInPcs)}</td>
              <td class="cell-in-amt">${dayInAmt.toFixed(2)}</td>
              <td class="cell-out">${formatNumber(dayOutPcs)}</td>
              <td class="cell-out-amt">${dayOutAmt.toFixed(2)}</td>
              <td class="cell-total-pc">${formatNumber(dayTotalPc)}</td>
              <td class="cell-hours"><span class="hours-val">${dHours > 0 ? dHours.toFixed(1) + ' hrs' : '-'}</span></td>
              <td class="cell-total-amt">${dayTotalAmt.toFixed(2)}</td>
              <td class="cell-time"><span class="time-badge">⏱️ ${d.time_range || '-'}</span></td>
            </tr>
          `;
        });
        datewiseTableBody.innerHTML = bHtml;

        let fInPcs = totals.in_pcs;
        let fOutPcs = totals.out_pcs;
        if (isGross) {
          fInPcs = totals.gross_in_pcs != null ? totals.gross_in_pcs : totals.in_pcs;
          fOutPcs = totals.gross_out_pcs != null ? totals.gross_out_pcs : totals.out_pcs;
        }
        const fInAmt = Math.round((fInPcs * curInRate) * 100) / 100;
        const fOutAmt = Math.round((fOutPcs * curOutRate) * 100) / 100;
        const fTotalPc = fInPcs + fOutPcs;
        const fTotalAmt = Math.round((fInAmt + fOutAmt) * 100) / 100;

        const sumGrossPcs = totals.gross_total_pc != null ? totals.gross_total_pc : fTotalPc;
        const sumDupePcs = totals.dupe_total_pc || 0;
        const sumNetPcs = (totals.in_pcs || 0) + (totals.out_pcs || 0);

        datewiseTableFoot.innerHTML = `
          <tr class="total-row">
            <td class="tf-name">TOTAL</td>
            <td class="tf-in">${formatNumber(fInPcs)}</td>
            <td class="tf-in-amt">${fInAmt.toFixed(2)}</td>
            <td class="tf-out">${formatNumber(fOutPcs)}</td>
            <td class="tf-out-amt">${fOutAmt.toFixed(2)}</td>
            <td class="tf-total-pc">${formatNumber(fTotalPc)}</td>
            <td class="tf-hours">${totDayHours > 0 ? totDayHours.toFixed(1) + ' hrs' : (totals.hours > 0 ? totals.hours.toFixed(1) + ' hrs' : '-')}</td>
            <td class="tf-total-amt">${fTotalAmt.toFixed(2)}</td>
            <td class="tf-time">${selectedSalaryShift === 'day' ? '☀️ સવાર' : selectedSalaryShift === 'night' ? '🌙 રાત' : '24 કલાક'}</td>
          </tr>
          <tr class="total-sub-row" style="background: rgba(15, 23, 42, 0.95); font-size: 11px; color: #94a3b8;">
            <td colspan="9" style="padding: 7px 12px; text-align: right; border-top: 1px solid rgba(255,255,255,0.1);">
              <span style="color:#38bdf8; font-weight:700;">📦 DigiBizz ERP કુલ મેળ: ${formatNumber(sumGrossPcs)} Pcs</span> (IN: ${formatNumber(totals.gross_in_pcs || 0)} | OUT: ${formatNumber(totals.gross_out_pcs || 0)}) &bull;
              <span style="color:#fbbf24; font-weight:700;">🚨 ડુપ્લિકેટ ચોરી: -${formatNumber(sumDupePcs)} Pcs</span> &bull;
              <span style="color:#34d399; font-weight:700;">💰 ચૂકવવાપાત્ર ચોખ્ખો હિસાબ: ${formatNumber(sumNetPcs)} Pcs</span>
            </td>
          </tr>
        `;
      }
    } catch (err) {
      datewiseTableBody.innerHTML = `<tr><td colspan="9" class="loading-cell" style="color: #ef4444;">ડેટા મેળવવામાં ક્ષતિ આવી: ${err.message || err}</td></tr>`;
    } finally {
      datewiseModalLoading.classList.add('hidden');
    }
  };


  btnDownloadUserExcel.addEventListener('click', () => {
    if (currentModalUser) triggerExcelDownload(currentModalUser);
  });

  datewiseModalCloseBtn.addEventListener('click', () => {
    userDatewiseModal.classList.add('hidden');
  });

  userDatewiseModal.addEventListener('click', (e) => {
    if (e.target === userDatewiseModal) userDatewiseModal.classList.add('hidden');
  });

  // ========================================================
  // VIEW 2: LIVE SCANNING LOGIC (INWARD/OUTWARD USER SUMMARY)
  // ========================================================
  function setLiveDate(isoStr) {
    liveDate = isoStr;
    liveDatePickerInput.value = isoStr;
    liveSingleDateDisplay.textContent = formatDisplayDate(isoStr);

    const tStr = todayStr;
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yStr = yDate.toISOString().slice(0, 10);
    const bDate = new Date();
    bDate.setDate(bDate.getDate() - 2);
    const bStr = bDate.toISOString().slice(0, 10);

    livePillToday.classList.toggle('active', isoStr === tStr);
    livePillYesterday.classList.toggle('active', isoStr === yStr);
    livePillDayBefore.classList.toggle('active', isoStr === bStr);

    fetchUserSummary();
  }

  function setLiveReportType(type) {
    liveReportType = type;
    tabInward.classList.toggle('active', type === 'inward');
    tabOutward.classList.toggle('active', type === 'outward');

    if (type === 'inward') {
      heroReportTitle.textContent = 'WMS Stock Inward Total (કુલ ઇનવર્ડ)';
      userReportHeading.textContent = 'Inward: User Name પ્રમાણે Total Qty.';
    } else {
      heroReportTitle.textContent = 'WMS Order Pickup & Stock Outward Total (કુલ આઉટવર્ડ)';
      userReportHeading.textContent = 'Outward: User Name પ્રમાણે Total Qty.';
    }

    fetchUserSummary();
  }

  async function fetchUserSummary() {
    refreshBtn.classList.add('spinning');
    const shiftSub = selectedLiveShift === 'day' ? ' (સવાર શિફ્ટ 07:30 - 19:30)' : selectedLiveShift === 'night' ? ' (રાત શિફ્ટ 19:30 - 07:30)' : ' (આખો દિવસ)';
    userCardsList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>${formatDisplayDate(liveDate)} નો ${liveReportType.toUpperCase()} રિપોર્ટ${shiftSub} મેળવી રહ્યા છીએ...</span>
      </div>
    `;

    try {
      if (hasNativeBridge()) {
        const data = await callBridge('getUserSummary', [liveDate, liveReportType, selectedLiveShift]);
        renderUserReport(data);
        return;
      }

      await resolveBestServer();
      const url = `${currentApiBase}/api/godaun/user-summary?date=${liveDate}&report_type=${liveReportType}&shift=${selectedLiveShift}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderUserReport(data);
    } catch (err) {
      console.error('Fetch user summary error:', err);
      userCardsList.innerHTML = `
        <div class="loading-state">
          <span style="color: #f87171;">કનેક્શન ક્ષતિ: સર્વર સાથે સંપર્ક થઈ શક્યો નથી (${err.message || err}).</span>
        </div>
      `;
    } finally {
      refreshBtn.classList.remove('spinning');
    }
  }

  function renderUserReport(data) {
    if (!data) return;

    const grossQty = data.gross_qty || data.total_qty || 0;
    const netQty = data.total_qty || 0;
    const dupeQty = data.dupe_qty || 0;

    heroTotalQty.textContent = formatNumber(grossQty);
    heroUserCountText.innerHTML = `કુલ સ્કેન (DigiBizz ERP મેળ): <strong>${formatNumber(grossQty)} Pcs</strong> &bull; ચોખ્ખા: <strong>${formatNumber(netQty)} Pcs</strong>${dupeQty > 0 ? ` &bull; ચોરી કપાત: <strong style="color:#fbbf24;">-${formatNumber(dupeQty)} Pcs</strong>` : ''} &bull; કુલ <strong>${data.user_count}</strong> વ્યક્તિઓ`;
    activeUserCountBadge.textContent = `${data.user_count} Users (${formatNumber(grossQty)} Pcs)`;

    const users = data.users || [];
    if (users.length === 0) {
      userCardsList.innerHTML = `
        <div class="loading-state">
          <span>આ તારીખે કોઈ ${liveReportType === 'inward' ? 'ઇનવર્ડ' : 'આઉટવર્ડ'} એન્ટ્રી મળી નથી.</span>
        </div>
      `;
      return;
    }

    let html = '';
    users.forEach((u, idx) => {
      const rank = idx + 1;
      const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
      const fillClass = liveReportType === 'inward' ? 'inward-fill' : 'outward-fill';
      const pillClass = liveReportType === 'inward' ? 'inward-badge-pill' : 'outward-badge-pill';
      const timeTag = u.time_range ? ` &bull; ⏱️ ${u.time_range}` : '';

      const uGross = u.gross_qty != null ? u.gross_qty : u.total_qty;
      const uNet = u.total_qty || 0;
      const uDupe = u.dupe_qty || 0;
      const dupeTag = uDupe > 0 ? `<div style="font-size:10px; color:#fbbf24; margin-top:2px;">(Net: ${formatNumber(uNet)} | ચોરી: -${formatNumber(uDupe)})</div>` : '';

      html += `
        <div class="user-card" onclick="window.openUserDetail('${u.user_name}')">
          <div class="user-card-left">
            <div class="rank-badge ${rankClass}">${rank}</div>
            <div class="user-info">
              <span class="user-name-title">${u.user_name}</span>
              <span class="user-entries-meta">કુલ એન્ટ્રી: ${formatNumber(u.entries)} સ્કેન &bull; ${u.percentage}% ભાગ${timeTag}</span>
              <div class="user-progress-bar-wrap">
                <div class="user-progress-fill ${fillClass}" style="width: ${Math.max(u.percentage, 3)}%;"></div>
              </div>
            </div>
          </div>
          <div class="user-card-right">
            <span class="user-qty-badge ${pillClass}">${formatNumber(uGross)} Pcs</span>
            ${dupeTag}
            <span class="pct-text">વાઉચર જુઓ &rarr;</span>
          </div>
        </div>
      `;
    });

    userCardsList.innerHTML = html;
  }

  // User Detail / Voucher Modal
  window.openUserDetail = async function(userName) {
    userDrillModal.classList.remove('hidden');
    drillModalUserName.textContent = `${userName} - ${liveReportType.toUpperCase()} DETAIL`;
    const shiftSub = selectedLiveShift === 'day' ? ' [સવાર શિફ્ટ 07:30 - 19:30]' : selectedLiveShift === 'night' ? ' [રાત શિફ્ટ 19:30 - 07:30]' : '';
    drillModalSub.textContent = `તારીખ: ${formatDisplayDate(liveDate)}${shiftSub} | વાઉચર અને ડિઝાઇન લિસ્ટ`;
    drillTableBody.innerHTML = '';
    drillModalLoading.classList.remove('hidden');
    modalTotalCountText.textContent = 'Count: --';
    modalTotalQtyText.textContent = 'Total Qty: -- Pcs';
    drillSearchInput.value = '';

    try {
      if (hasNativeBridge()) {
        const data = await callBridge('getUserDetail', [liveDate, liveReportType, userName, selectedLiveShift]);
        modalDetailItems = data.items || [];
        renderDrillTable(modalDetailItems);
        return;
      }

      const url = `${currentApiBase}/api/godaun/user-detail?date=${liveDate}&report_type=${liveReportType}&user=${encodeURIComponent(userName)}&shift=${selectedLiveShift}`;
      const res = await fetch(url);
      const data = await res.json();
      modalDetailItems = data.items || [];
      renderDrillTable(modalDetailItems);
    } catch (e) {
      drillTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4" style="color: #f87171;">વિગતો લોડ કરવામાં ક્ષતિ આવી: ${e.message || e}</td></tr>`;
    } finally {
      drillModalLoading.classList.add('hidden');
    }
  };

  function renderDrillTable(items) {
    const totalCount = items.length;
    const totalQty = items.reduce((sum, it) => sum + (it.qty || 0), 0);

    modalTotalCountText.textContent = `Count: ${formatNumber(totalCount)}`;
    modalTotalQtyText.textContent = `Total Qty: ${formatNumber(totalQty)} Pcs`;

    if (items.length === 0) {
      drillTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">કોઈ આઇટમ મળી નથી</td></tr>';
      return;
    }

    let html = '';
    items.forEach(it => {
      html += `
        <tr>
          <td><strong style="color: #c084fc;">${it.voucher_no || '-'}</strong></td>
          <td><strong>${it.design_no}</strong> <span style="font-size: 11px; color: #94a3b8;">(${it.size})</span></td>
          <td style="color: #94a3b8;">${it.bill_no || '-'}</td>
          <td class="text-right"><strong style="color: #38bdf8;">${formatNumber(it.qty)}</strong></td>
          <td class="cell-time"><span class="time-badge">⏱️ ${it.time || '-'}</span></td>
        </tr>
      `;
    });

    drillTableBody.innerHTML = html;
  }

  drillSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderDrillTable(modalDetailItems);
      return;
    }
    const filtered = modalDetailItems.filter(it => {
      return (it.design_no && it.design_no.toLowerCase().includes(q)) ||
             (it.voucher_no && it.voucher_no.toLowerCase().includes(q)) ||
             (it.bill_no && it.bill_no.toLowerCase().includes(q));
    });
    renderDrillTable(filtered);
  });

  modalCloseBtn.addEventListener('click', () => userDrillModal.classList.add('hidden'));
  userDrillModal.addEventListener('click', (e) => {
    if (e.target === userDrillModal) userDrillModal.classList.add('hidden');
  });

  // Live View Event Listeners
  liveDatePickerInput.addEventListener('change', (e) => {
    if (e.target.value) setLiveDate(e.target.value);
  });

  livePillToday.addEventListener('click', () => setLiveDate(todayStr));
  livePillYesterday.addEventListener('click', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setLiveDate(d.toISOString().slice(0, 10));
  });
  livePillDayBefore.addEventListener('click', () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    setLiveDate(d.toISOString().slice(0, 10));
  });

  tabInward.addEventListener('click', () => setLiveReportType('inward'));
  tabOutward.addEventListener('click', () => setLiveReportType('outward'));

  liveCalendarTriggerBtn.addEventListener('click', () => {
    liveDatePickerInput.showPicker ? liveDatePickerInput.showPicker() : liveDatePickerInput.focus();
  });

  // ========================================================
  // DAILY WORKING HOURS MODAL LOGIC (કલાક એન્ટ્રી)
  // ========================================================
  let hoursSelectedDate = todayStr;
  let hoursEntryWorkerRows = [];

  function setHoursModalDate(dateStr) {
    hoursSelectedDate = dateStr;
    if (hoursEntryDate) hoursEntryDate.value = dateStr;
    if (hoursDateDisplay) hoursDateDisplay.textContent = formatDisplayDate(dateStr);

    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = y.toISOString().slice(0, 10);

    if (btnHoursToday) btnHoursToday.classList.toggle('active', dateStr === todayStr);
    if (btnHoursYesterday) btnHoursYesterday.classList.toggle('active', dateStr === yStr);

    loadHoursForModal(dateStr);
  }

  function getAvailableWorkersForHours() {
    const map = new Map();
    if (Array.isArray(distinctWorkersList) && distinctWorkersList.length > 0) {
      distinctWorkersList.forEach(w => {
        const clean = (w || '').trim().toUpperCase();
        if (clean && clean !== 'ADMIN') map.set(clean, { name: clean, pcs: 0 });
      });
    }
    if (Array.isArray(rawSalaryRows) && rawSalaryRows.length > 0) {
      rawSalaryRows.forEach(r => {
        const clean = (r.name || '').trim().toUpperCase();
        if (clean && clean !== 'ADMIN') {
          const ex = map.get(clean) || { name: clean, pcs: 0 };
          ex.pcs = (r.total_pc || 0);
          map.set(clean, ex);
        }
      });
    }
    if (Array.isArray(cachedUsers)) {
      cachedUsers.forEach(u => {
        const clean = (u.worker_name || u.username || '').trim().toUpperCase();
        if (clean && clean !== 'ADMIN' && !map.has(clean)) {
          map.set(clean, { name: clean, pcs: 0 });
        }
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      if (b.pcs !== a.pcs) return b.pcs - a.pcs;
      return a.name.localeCompare(b.name);
    });
  }

  function loadHoursForModal(dateStr) {
    const dayMap = (dailyHoursMap && dailyHoursMap[dateStr]) || {};
    const workers = getAvailableWorkersForHours();

    hoursEntryWorkerRows = workers.map(w => {
      const currentHours = dayMap[w.name] != null ? Number(dayMap[w.name]) : 0;
      return {
        name: w.name,
        pcs: w.pcs || 0,
        hours: currentHours
      };
    });

    renderHoursWorkerList();
    recalcHoursModalSummary();
  }

  function renderHoursWorkerList() {
    if (!hoursWorkersListContainer) return;
    const filter = (hoursWorkerSearch ? hoursWorkerSearch.value : '').toLowerCase().trim();
    const filtered = hoursEntryWorkerRows.filter(r => !filter || r.name.toLowerCase().includes(filter));

    if (hoursWorkersCountBadge) {
      hoursWorkersCountBadge.textContent = `${filtered.length} કામદારો`;
    }

    if (filtered.length === 0) {
      hoursWorkersListContainer.innerHTML = '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px;">કોઈ કર્મચારી મળ્યો નથી</div>';
      return;
    }

    let html = '';
    filtered.forEach(row => {
      const hVal = row.hours || 0;
      html += `
        <div class="hours-worker-row" data-worker="${row.name}">
          <div class="hours-worker-info">
            <span class="hours-worker-name">${row.name}</span>
            <span class="hours-worker-meta">${row.pcs > 0 ? `📦 ${formatNumber(row.pcs)} pcs આ સમયગાળામાં` : 'હાલ કોઈ સ્કેનિંગ નથી'}</span>
          </div>
          <div class="hours-input-group">
            <div class="hour-quick-chips">
              <button type="button" class="hour-chip ${hVal === 0 ? 'active' : ''}" onclick="window.setWorkerHourQuick('${row.name}', 0)">0h</button>
              <button type="button" class="hour-chip ${hVal === 8 ? 'active' : ''}" onclick="window.setWorkerHourQuick('${row.name}', 8)">8h</button>
              <button type="button" class="hour-chip ${hVal === 10 ? 'active' : ''}" onclick="window.setWorkerHourQuick('${row.name}', 10)">10h</button>
              <button type="button" class="hour-chip ${hVal === 12 ? 'active' : ''}" onclick="window.setWorkerHourQuick('${row.name}', 12)">12h</button>
            </div>
            <input type="number" step="0.5" min="0" max="24" class="hour-number-input" 
                   value="${hVal > 0 ? hVal : ''}" placeholder="0"
                   onchange="window.setWorkerHourInput('${row.name}', this.value)"
                   oninput="window.setWorkerHourInput('${row.name}', this.value)">
          </div>
        </div>
      `;
    });
    hoursWorkersListContainer.innerHTML = html;
  }

  window.setWorkerHourQuick = function(workerName, hours) {
    const row = hoursEntryWorkerRows.find(r => r.name === workerName);
    if (row) {
      row.hours = Number(hours);
      renderHoursWorkerList();
      recalcHoursModalSummary();
    }
  };

  window.setWorkerHourInput = function(workerName, val) {
    const row = hoursEntryWorkerRows.find(r => r.name === workerName);
    if (row) {
      const num = parseFloat(val);
      row.hours = (!isNaN(num) && num >= 0) ? num : 0;
      recalcHoursModalSummary();
    }
  };

  function recalcHoursModalSummary() {
    let totH = 0;
    let activeW = 0;
    hoursEntryWorkerRows.forEach(r => {
      const h = Number(r.hours || 0);
      if (h > 0) {
        totH += h;
        activeW++;
      }
    });
    if (hoursTotalWorkersCount) hoursTotalWorkersCount.textContent = activeW;
    if (hoursTotalHoursSum) hoursTotalHoursSum.textContent = `${totH.toFixed(1)} hrs`;
  }

  function applyBulkHours(hours) {
    hoursEntryWorkerRows.forEach(r => {
      r.hours = Number(hours);
    });
    renderHoursWorkerList();
    recalcHoursModalSummary();
  }

  function openHoursModal() {
    syncDailyHoursWithServer();
    loadWorkersList();
    if (hoursEntryModal) hoursEntryModal.classList.remove('hidden');
    setHoursModalDate(salaryToDate || todayStr);
  }

  function closeHoursModal() {
    if (hoursEntryModal) hoursEntryModal.classList.add('hidden');
  }

  async function saveHoursFromModal() {
    const workerHours = {};
    hoursEntryWorkerRows.forEach(r => {
      const h = Number(r.hours || 0);
      if (h > 0) {
        workerHours[r.name] = h;
      }
    });

    if (hoursSaveStatusMsg) {
      hoursSaveStatusMsg.textContent = 'કલાક સેવ થઈ રહી છે...';
      hoursSaveStatusMsg.className = 'mgmt-status-msg info';
      hoursSaveStatusMsg.classList.remove('hidden');
    }

    await saveDailyHoursForDate(hoursSelectedDate, workerHours);

    if (hoursSaveStatusMsg) {
      hoursSaveStatusMsg.textContent = '✅ કલાક સફળતાપૂર્વક સેવ થઈ ગઈ!';
      hoursSaveStatusMsg.className = 'mgmt-status-msg success';
      setTimeout(() => hoursSaveStatusMsg.classList.add('hidden'), 2000);
    }

    showToast(`✅ ${formatDisplayDate(hoursSelectedDate)} ની કલાક સેવ થઈ ગઈ!`, '⏱️');
    closeHoursModal();

    // Re-render views with the new hours!
    renderSalaryReport();
    if (currentUser && currentUser.role === 'worker') {
      fetchWorkerSalaryReport();
    }
  }

  // Event Listeners for Hours Modal
  if (btnOpenHoursHead) btnOpenHoursHead.addEventListener('click', openHoursModal);
  if (btnOpenHoursModal) btnOpenHoursModal.addEventListener('click', openHoursModal);
  if (btnCloseHoursModal) btnCloseHoursModal.addEventListener('click', closeHoursModal);
  if (btnCancelHours) btnCancelHours.addEventListener('click', closeHoursModal);
  if (hoursEntryModal) {
    hoursEntryModal.addEventListener('click', (e) => {
      if (e.target === hoursEntryModal) closeHoursModal();
    });
  }

  if (hoursEntryDate) {
    hoursEntryDate.addEventListener('change', (e) => {
      if (e.target.value) setHoursModalDate(e.target.value);
    });
  }

  if (btnHoursToday) btnHoursToday.addEventListener('click', () => setHoursModalDate(todayStr));
  if (btnHoursYesterday) {
    btnHoursYesterday.addEventListener('click', () => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setHoursModalDate(y.toISOString().slice(0, 10));
    });
  }

  if (btnBulk10) btnBulk10.addEventListener('click', () => applyBulkHours(10));
  if (btnBulk12) btnBulk12.addEventListener('click', () => applyBulkHours(12));
  if (btnBulk8) btnBulk8.addEventListener('click', () => applyBulkHours(8));
  if (btnBulkClear) btnBulkClear.addEventListener('click', () => applyBulkHours(0));

  if (hoursWorkerSearch) {
    hoursWorkerSearch.addEventListener('input', renderHoursWorkerList);
  }

  if (btnSaveHoursSubmit) {
    btnSaveHoursSubmit.addEventListener('click', saveHoursFromModal);
  }

  // ========================================================
  // CHORI KARI (ચોરી કરી - DUPLICATE SCANS) REPORT (ADMIN ONLY)
  // ========================================================
  async function fetchChoriReport() {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('⚠️ ફક્ત એડમિન માટે જ ચોરી રિપોર્ટ છે!', '🔒');
      return;
    }

    if (btnChoriGetReport) btnChoriGetReport.disabled = true;
    if (choriWorkersTableBody) {
      choriWorkersTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-cell">
            <div class="table-spinner"></div>
            <span>${formatDisplayDate(choriFromDate)} થી ${formatDisplayDate(choriToDate)} નો ચોરી રિપોર્ટ લોડ થઈ રહ્યો છે...</span>
          </td>
        </tr>
      `;
    }
    if (choriItemsTableBody) {
      choriItemsTableBody.innerHTML = `
        <tr>
          <td colspan="10" class="loading-cell">
            <div class="table-spinner"></div>
            <span>ડુપ્લિકેટ સ્કેન વિગતો લોડ થઈ રહી છે...</span>
          </td>
        </tr>
      `;
    }

    try {
      let data;
      if (hasNativeBridge()) {
        data = await callBridge('getChoriReport', [
          choriFromDate,
          choriToDate,
          choriShift,
          choriProcess,
          choriWorker,
          1000
        ]);
      } else {
        await resolveBestServer();
        const url = `${currentApiBase}/api/godaun/chori-report?from_date=${choriFromDate}&to_date=${choriToDate}&shift=${choriShift}&process=${choriProcess}&user=${encodeURIComponent(choriWorker)}&limit=1000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }

      rawChoriWorkers = data.workers || (data.summary && data.summary.workers) || [];
      rawChoriItems = data.items || [];
      rawChoriData = data;

      // Update worker filter dropdown options if needed
      populateChoriWorkerDropdown(rawChoriWorkers);

      renderChoriReport(data);
    } catch (err) {
      console.error('Fetch chori report error:', err);
      if (choriWorkersTableBody) {
        choriWorkersTableBody.innerHTML = `
          <tr>
            <td colspan="8" class="loading-cell" style="color: #ef4444;">
              ચોરી રિપોર્ટ લાવવામાં ભૂલ આવી: ${err.message || err}. કૃપા કરી ફરી પ્રયાસ કરો.
            </td>
          </tr>
        `;
      }
    } finally {
      if (btnChoriGetReport) btnChoriGetReport.disabled = false;
    }
  }

  function renderChoriReport(data) {
    const summary = (data && data.summary) || {};
    const totDupePcs = summary.total_dupe_pcs || 0;
    const inDupePcs = summary.dupe_in_pcs != null ? summary.dupe_in_pcs : (summary.inward_dupe_pcs || 0);
    const outDupePcs = summary.dupe_out_pcs != null ? summary.dupe_out_pcs : (summary.outward_dupe_pcs || 0);
    const suspectCount = summary.workers_count || rawChoriWorkers.length;

    let estDeductedAmt = summary.total_deducted_amt;
    if (estDeductedAmt == null) {
      estDeductedAmt = Math.round(((inDupePcs * inRate) + (outDupePcs * outRate)) * 100) / 100;
    }

    // Update KPI cards
    if (choriKpiTotalPieces) choriKpiTotalPieces.textContent = formatNumber(totDupePcs);
    if (choriKpiInPieces) choriKpiInPieces.textContent = formatNumber(inDupePcs);
    if (choriKpiOutPieces) choriKpiOutPieces.textContent = formatNumber(outDupePcs);
    if (choriKpiSuspectCount) choriKpiSuspectCount.textContent = formatNumber(suspectCount);
    if (choriKpiTotalDeductedAmt) choriKpiTotalDeductedAmt.textContent = formatCurrency(estDeductedAmt);

    if (choriWorkersCountBadge) choriWorkersCountBadge.textContent = `${rawChoriWorkers.length} Workers`;
    if (choriItemsCountBadge) choriItemsCountBadge.textContent = `${rawChoriItems.length} Duplicates`;

    // 1. Render Worker Theft Summary Table
    if (choriWorkersTableBody) {
      if (rawChoriWorkers.length === 0) {
        choriWorkersTableBody.innerHTML = `
          <tr>
            <td colspan="8" class="loading-cell" style="color: #4ade80;">
              🎉 અભિનંદન! પસંદ કરેલ સમયગાળામાં કોઈ ડુપ્લિકેટ સ્કેન / ચોરી મળી નથી.
            </td>
          </tr>
        `;
      } else {
        let wHtml = '';
        rawChoriWorkers.forEach((w, idx) => {
          const rank = idx + 1;
          const wName = w.worker_name || w.name;
          const wInDupe = w.dupe_in_scans != null ? w.dupe_in_scans : (w.inward_dupe_pcs || 0);
          const wOutDupe = w.dupe_out_scans != null ? w.dupe_out_scans : (w.outward_dupe_pcs || 0);
          const wTotDupe = w.dupe_pcs != null ? w.dupe_pcs : (w.total_dupe_pcs || (wInDupe + wOutDupe));
          const pct = w.dupe_pct != null ? w.dupe_pct : (w.theft_percentage || 0);
          const pctClass = pct > 20 ? 'theft-pct-high' : 'theft-pct-low';
          const wDeductAmt = w.estimated_deduction_amt != null 
            ? w.estimated_deduction_amt 
            : Math.round(((wInDupe * inRate) + (wOutDupe * outRate)) * 100) / 100;

          wHtml += `
            <tr>
              <td style="text-align: center; font-weight: 800; color: #94a3b8;">${rank}</td>
              <td class="cell-name">
                <div class="cell-name-content">
                  <span class="emp-name-text" style="color: #ffffff; font-weight: 700; font-size: 14px;">${wName}</span>
                </div>
              </td>
              <td style="text-align: right; color: #7dd3fc; font-weight: 700;">${formatNumber(wInDupe)}</td>
              <td style="text-align: right; color: #fdba74; font-weight: 700;">${formatNumber(wOutDupe)}</td>
              <td style="text-align: right; color: #ef4444; font-weight: 800; font-size: 14px;">${formatNumber(wTotDupe)}</td>
              <td style="text-align: center;">
                <span class="theft-pct-pill ${pctClass}">${pct.toFixed(1)}%</span>
              </td>
              <td style="text-align: right;" class="theft-danger-amt">-₹${wDeductAmt.toFixed(2)}</td>
              <td style="text-align: center;">
                <button type="button" class="btn-filter-worker-chori" onclick="window.filterChoriByWorker('${wName}')" title="આ કર્મચારીના ડુપ્લિકેટ બારકોડ ફિલ્ટર કરો">
                  વિગતો જુઓ ➔
                </button>
              </td>
            </tr>
          `;
        });
        choriWorkersTableBody.innerHTML = wHtml;
      }
    }

    // 2. Render Detailed Items Table
    renderChoriItemsTable();
  }

  function renderChoriItemsTable() {
    if (!choriItemsTableBody) return;
    const filter = (choriSearchInput ? choriSearchInput.value : '').toLowerCase().trim();
    const wFilter = (choriWorkerFilter ? choriWorkerFilter.value : '').toLowerCase().trim();

    const filtered = rawChoriItems.filter(it => {
      const uName = (it.user_name || it.created_by || '').toLowerCase();
      const matchWorker = !wFilter || uName === wFilter;
      if (!matchWorker) return false;
      if (!filter) return true;
      return (it.barcode || '').toLowerCase().includes(filter) ||
             (it.voucher_no || '').toLowerCase().includes(filter) ||
             uName.includes(filter) ||
             (it.design_no || '').toLowerCase().includes(filter) ||
             (it.shelf_code || '').toLowerCase().includes(filter) ||
             (it.rack_code || '').toLowerCase().includes(filter) ||
             (it.shift_name || '').toLowerCase().includes(filter);
    });

    if (choriItemsCountBadge) choriItemsCountBadge.textContent = `${filtered.length} Duplicates`;

    if (filtered.length === 0) {
      choriItemsTableBody.innerHTML = `
        <tr>
          <td colspan="12" class="loading-cell">
            કોઈ ડુપ્લિકેટ બારકોડ રેકોર્ડ મળ્યો નથી.
          </td>
        </tr>
      `;
      return;
    }

    let iHtml = '';
    filtered.forEach((it, idx) => {
      const pName = it.norm_process || it.process_name || it.process || '';
      const isOut = pName.toUpperCase().includes('OUT');
      const procBadge = isOut 
        ? `<span style="background: rgba(251, 146, 60, 0.2); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.4); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">OUTWARD</span>`
        : `<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">INWARD</span>`;

      const timeText = it.date && it.time ? `${it.date} ${it.time}` : (it.formatted_time || it.time || it.created_date || '-');
      const userName = it.user_name || it.created_by || '-';
      const qtyPcs = it.qty != null ? it.qty : (it.qty_pieces != null ? it.qty_pieces : 1);

      const shiftRaw = (it.shift_name || '').toLowerCase();
      const isDay = shiftRaw.includes('day') || shiftRaw.includes('સવાર');
      const shiftBadge = isDay
        ? `<span style="background: rgba(251, 191, 36, 0.15); color: #fde047; border: 1px solid rgba(251, 191, 36, 0.35); padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700; white-space: nowrap;">☀️ સવાર</span>`
        : `<span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.35); padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 700; white-space: nowrap;">🌙 રાત</span>`;

      const shelfText = it.shelf_code && it.shelf_code !== '-' ? it.shelf_code : '-';
      const rackText = it.rack_code && it.rack_code !== '-' ? `(${it.rack_code})` : '';
      const shelfBadge = shelfText !== '-'
        ? `<span style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.35); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px; font-weight: 700;">${shelfText}</span> <span style="color: #94a3b8; font-size: 10px; font-family: monospace;">${rackText}</span>`
        : `<span style="color: #64748b; font-size: 11px;">-</span>`;

      iHtml += `
        <tr>
          <td style="text-align: center; color: #94a3b8; font-size: 11px;">${idx + 1}</td>
          <td style="font-size: 11px; white-space: nowrap; color: #cbd5e1;">${timeText}</td>
          <td style="text-align: center;">${shiftBadge}</td>
          <td style="font-weight: 700; color: #ffffff; font-size: 13px;">${userName}</td>
          <td style="text-align: center; white-space: nowrap;">${shelfBadge}</td>
          <td style="text-align: center;">${procBadge}</td>
          <td style="font-family: monospace; font-size: 11px; color: #e2e8f0;">${it.voucher_no || '-'}</td>
          <td style="font-family: monospace; font-weight: 800; color: #f87171; letter-spacing: 0.5px;">${it.barcode || '-'}</td>
          <td style="text-align: center;">
            <span class="repeat-scan-badge">🔁 #${it.scan_seq || 2}</span>
          </td>
          <td style="font-size: 11px; color: #94a3b8;">${it.design_no || '-'} / ${it.size || '-'}</td>
          <td style="text-align: right; font-weight: 800; color: #fff;">${qtyPcs}</td>
          <td style="text-align: center;">
            <span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.5); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;">🚨 CHORI</span>
          </td>
        </tr>
      `;
    });
    choriItemsTableBody.innerHTML = iHtml;
  }

  window.openChoriForWorker = function(workerName) {
    switchView('chori');
    setChoriWorker(workerName);
  };

  window.filterChoriByWorker = function(workerName) {
    setChoriWorker(workerName);
  };

  function setChoriWorker(workerName) {
    choriWorker = workerName || '';
    if (choriWorkerFilter) {
      choriWorkerFilter.value = choriWorker;
    }
    renderChoriItemsTable();
    const detailsTable = document.getElementById('choriItemsTable');
    if (detailsTable) {
      detailsTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function buildChoriWhatsAppText() {
    const fromD = choriFromDateInput ? choriFromDateInput.value : choriFromDate;
    const toD = choriToDateInput ? choriToDateInput.value : choriToDate;
    const shiftLabel = choriShift === 'day' ? '☀️ સવાર (Day)' : (choriShift === 'night' ? '🌙 રાત (Night)' : 'આખો દિવસ (All Shifts)');

    const summary = (rawChoriData && rawChoriData.summary) || {};
    const totDupe = summary.total_dupe_pcs != null ? summary.total_dupe_pcs : rawChoriItems.length;
    const inDupe = summary.dupe_in_pcs != null ? summary.dupe_in_pcs : 0;
    const outDupe = summary.dupe_out_pcs != null ? summary.dupe_out_pcs : 0;
    const workers = rawChoriWorkers || [];

    let lines = [
      '🚨 *OSLC WMS GODAUN CHORI REPORT*',
      '━━━━━━━━━━━━━━━━━━━━━━',
      `📅 *તારીખ:* ${fromD}${fromD !== toD ? ` થી ${toD}` : ''}`,
      `⏱️ *શિફ્ટ:* ${shiftLabel}`,
      '',
      '📊 *કુલ ચોરી સમરી (THEFT SUMMARY):*',
      `▪️ કુલ ડુપ્લિકેટ પીસ (Chori): *${totDupe.toLocaleString()} PC*`,
      `▪️ ઇનવર્ડ ચોરી (Inward Dupes): *${inDupe.toLocaleString()} PC*`,
      `▪️ આઉટવર્ડ ચોરી (Outward Dupes): *${outDupe.toLocaleString()} PC*`,
      `▪️ સંડોવાયેલા કર્મચારી: *${workers.length} જણા*`,
      '',
      '👥 *કર્મચારી વાઇઝ ચોરી લિસ્ટ (WORKER BREAKDOWN):*',
      '━━━━━━━━━━━━━━━━━━━━━━'
    ];

    workers.forEach((w, idx) => {
      lines.push(`${idx + 1}. 👤 *${w.name}*: *${(w.dupe_pcs || 0).toLocaleString()} PC* (IN: ${w.dupe_in_scans || 0} | OUT: ${w.dupe_out_scans || 0} | ${w.dupe_pct || 0}%)`);
    });

    lines.push('');
    lines.push('🔍 *ડુપ્લિકેટ બારકોડ વિગતો (SHELF, TIME, BARCODE):*');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');

    const displayItems = rawChoriItems.slice(0, 50);
    displayItems.forEach((it, idx) => {
      const sCode = it.shelf_code && it.shelf_code !== '-' ? it.shelf_code : '-';
      const rCode = it.rack_code && it.rack_code !== '-' ? `(${it.rack_code})` : '';
      const shelfStr = sCode !== '-' ? `${sCode} ${rCode}`.trim() : '-';
      const shiftStr = it.shift_name || 'General';
      const timeStr = it.time || it.created_date || '-';
      lines.push(
        `🔹 *#${idx + 1}* | 👤 *${it.user_name || it.created_by}* | ⏱️ ${timeStr} (${shiftStr})\n` +
        `   📍 *Shelf:* ${shelfStr} | 📂 ${it.process_name || it.norm_process}\n` +
        `   📦 *Barcode:* \`${it.barcode}\` (🔁 #${it.scan_seq || 2})\n` +
        `   🏷️ *Design:* ${it.design_no || '-'} (${it.size || '-'}) | 📄 *Voucher:* ${it.voucher_no || '-'}`
      );
    });

    if (rawChoriItems.length > displayItems.length) {
      lines.push(`\n...અને બીજા *${rawChoriItems.length - displayItems.length}* ડુપ્લિકેટ બારકોડ રેકોર્ડ્સ.`);
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('⚡ *OSLC Live Godaun Monitoring System*');

    return lines.join('\n');
  }

  let waQrPollInterval = null;

  async function updateWhatsAppInstanceStatusUI() {
    try {
      await resolveBestServer();
      const res = await fetch(`${currentApiBase}/api/godaun/whatsapp-status`);
      if (res.ok) {
        const data = await res.json();
        const isConn = data && data.connected;
        const connNum = data && data.connected_number;
        const iconEl = document.getElementById('waStatusIcon');
        const badgeEl = document.getElementById('waStatusBadge');
        const descEl = document.getElementById('waStatusDesc');
        const modalStatusText = document.getElementById('waQrStatusText');

        if (isConn) {
          if (iconEl) iconEl.textContent = '🟢';
          if (badgeEl) {
            badgeEl.className = 'wa-status-badge wa-status-connected';
            badgeEl.textContent = `🟢 લિંક છે (+${connNum})`;
          }
          if (descEl) descEl.textContent = `બીજો નંબર (+${connNum}) જોડાયેલ છે! રિપોર્ટ આપોઆપ સેન્ડ થઈ રહ્યો છે.`;
          if (modalStatusText) modalStatusText.textContent = `✅ બીજો નંબર (+${connNum}) સફળતાપૂર્વક કનેક્ટ થઈ ગયો!`;
          if (waQrPollInterval) {
            clearInterval(waQrPollInterval);
            waQrPollInterval = null;
          }
        } else {
          if (iconEl) iconEl.textContent = '⚠️';
          if (badgeEl) {
            badgeEl.className = 'wa-status-badge wa-status-disconnected';
            badgeEl.textContent = '🔴 લિંક નથી (DISCONNECTED)';
          }
          if (descEl) descEl.textContent = 'બીજા નંબર પરથી આપોઆપ મેસેજ મોકલવા માટે તે ફોનમાંથી ૧ વાર QR કોડ સ્કેન કરવો જરૂરી છે.';
          if (modalStatusText) modalStatusText.textContent = 'લાઈવ સ્કેનની રાહ જોવાઈ રહી છે...';
        }
        return isConn;
      }
    } catch (e) {
      console.warn('Check WhatsApp status failed:', e);
    }
    return false;
  }

  window.openWaQrModal = function() {
    const modal = document.getElementById('waQrModal');
    if (modal) modal.classList.remove('hidden');
    window.refreshWaQr();
    updateWhatsAppInstanceStatusUI();
    if (!waQrPollInterval) {
      waQrPollInterval = setInterval(updateWhatsAppInstanceStatusUI, 3000);
    }
  };

  window.closeWaQrModal = function() {
    const modal = document.getElementById('waQrModal');
    if (modal) modal.classList.add('hidden');
    if (waQrPollInterval) {
      clearInterval(waQrPollInterval);
      waQrPollInterval = null;
    }
  };

  window.refreshWaQr = function() {
    const img = document.getElementById('waQrImg');
    if (img) {
      img.src = `http://f.1t.cl/api/qrCodeImage/orccs554px09gwv9rqmxyahh.png?_t=${Date.now()}`;
    }
  };

  window.sendContactCardToPhone = async function(phoneNumber = '919033157999') {
    const cleanPhone = (phoneNumber || '919033157999').replace(/[^0-9]/g, '');
    showToast(`📇 OSLC ERP કોન્ટેક્ટ કાર્ડ +${cleanPhone} પર મોકલાઈ રહ્યું છે...`, '📲');
    try {
      await resolveBestServer();
      const res = await fetch(`${currentApiBase}/api/godaun/whatsapp-send-contact?phone=${cleanPhone}&name=OSLC%20ERP%20JEEL%20VAGHANI`);
      const resJson = await res.json();
      if (resJson && resJson.ok) {
        showToast(`✅ કોન્ટેક્ટ કાર્ડ મોકલાઈ ગયું! WhatsApp માં 'Save Contact' દબાવો.`, '🎉');
      } else {
        showToast(`⚠️ કોન્ટેક્ટ કાર્ડ મોકલી શકાયું નથી: ${resJson.error || 'Server error'}`, '⚠️');
      }
    } catch (e) {
      showToast(`❌ Error: ${e.message}`, '⚠️');
    }
  };

  window.logoutWhatsAppAccount = async function(accountNum = '1') {
    if (!confirm(`શું તમે Account ${accountNum} લોગઆઉટ કરવા માંગો છો?`)) return;
    try {
      await resolveBestServer();
      const res = await fetch(`${currentApiBase}/api/godaun/whatsapp-logout?account=${accountNum}`, { method: 'POST' });
      const resJson = await res.json();
      if (resJson && resJson.ok) {
        showToast(`🔒 Account ${accountNum} Logged out successfully.`, '✅');
      } else {
        showToast(`⚠️ Logout failed: ${resJson.error || 'Error'}`, '⚠️');
      }
    } catch (e) {
      showToast(`❌ Error: ${e.message}`, '⚠️');
    }
  };

  window.toggleWaRecipient = function(name, phone, enable) {
    if (enable) {
      showToast(`📲 ${name} (${phone}) WhatsApp એલર્ટ્સ ચાલુ કર્યાં!`, '✅');
    } else {
      showToast(`🔴 ${name} (${phone}) WhatsApp એલર્ટ્સ બંધ કર્યાં!`, '🛑');
    }
    // Swap DOM elements between active and disabled lists
    try {
      const activeList = document.getElementById('waActiveRecipientsList');
      const disabledList = document.getElementById('waDisabledRecipientsList');
      if (!activeList || !disabledList) return;

      const itemSelector = `[data-user="${name}"]`;
      let existing = document.querySelector(itemSelector);
      if (existing) {
        existing.remove();
      }

      const div = document.createElement('div');
      div.setAttribute('data-user', name);
      div.style.display = 'inline-flex';
      div.style.alignItems = 'center';
      div.style.gap = '6px';

      if (enable) {
        div.innerHTML = `
          <span style="background:#dcfce7; border:1px solid #86efac; color:#166534; font-size:12px; font-weight:700; border-radius:6px; padding:4px 10px;">
            ${name} : ${phone} ✅
          </span>
          <button type="button" onclick="window.toggleWaRecipient('${name}', '${phone}', false)" style="background:#be123c; color:#ffffff; border:none; border-radius:6px; padding:4px 10px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
            <span>🔴</span> બંધ કરો
          </button>
        `;
        activeList.appendChild(div);
      } else {
        div.innerHTML = `
          <span style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; font-size:12px; font-weight:700; border-radius:6px; padding:4px 10px;">
            ${name} : ${phone} 📵 (બંધ)
          </span>
          <button type="button" onclick="window.toggleWaRecipient('${name}', '${phone}', true)" style="background:#059669; color:#ffffff; border:none; border-radius:6px; padding:4px 10px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
            <span>📲</span> ચાલુ કરો
          </button>
        `;
        disabledList.appendChild(div);
      }
    } catch (err) {
      console.warn('DOM recipient toggle error:', err);
    }
  };

  window.sendChoriViaErpWhatsApp = async function(phoneNumber = '919033157999') {
    const text = buildChoriWhatsAppText();
    const cleanPhone = (phoneNumber || '919033157999').replace(/[^0-9]/g, '');

    showToast(`⚡ OSLC ERP Dual Auto-Bot પરથી '🚨 WMS Godaun Chori Report' ગૃપ તથા +${cleanPhone} પર મોકલાઈ રહ્યું છે...`, '🚀');

    // 1. Dispatch via Backend ERP Endpoint (Baileys Port 8008 + MASTER_NOTIFICATION_LOG)
    try {
      await resolveBestServer();
      const fDate = choriFromDateInput ? choriFromDateInput.value : choriFromDate;
      const tDate = choriToDateInput ? choriToDateInput.value : choriToDate;
      const erpUrl = `${currentApiBase}/api/godaun/chori-send-erp-whatsapp?from_date=${fDate}&to_date=${tDate}&shift=${choriShift}&process=${choriProcess}&phone=${cleanPhone}`;
      const res = await fetch(erpUrl);
      const resJson = await res.json();
      if (resJson && resJson.success) {
        showToast(`✅ '🚨 WMS Godaun Chori Report' ગૃપ તથા ફોન (+${cleanPhone}) પર લાઈવ પહોંચી ગયો!`, '🎉');
        return;
      }
    } catch (e) {
      console.warn('Backend ERP dispatch failed:', e);
    }

    // 2. Direct HTTP call to enotify.app as client fallback
    try {
      const token = "orccs554px09gwv9rqmxyahh";
      const enotifyUrl = `https://www.enotify.app/api/sendText?token=${token}&phone=${cleanPhone}&type=text&message=${encodeURIComponent(text)}`;
      await fetch(enotifyUrl, { mode: 'no-cors' });
      showToast(`✅ OSLC ERP Gateway થી +${cleanPhone} પર મેસેજ મોકલાઈ ગયો!`, '🎉');
      return;
    } catch (e) {
      console.warn('Direct enotify fallback failed:', e);
    }

    // 3. Fallback: Native APK Bridge / Direct WhatsApp
    showToast(`⚠️ મોકલવામાં વિલંબ, ડાયરેક્ટ WhatsApp Chat ખોલી રહ્યા છીએ...`, '📲');
    window.sendChoriToWhatsApp(cleanPhone);
  };

  window.sendChoriToWhatsApp = async function(phoneNumber = '919033157999') {
    const text = buildChoriWhatsAppText();
    const cleanPhone = (phoneNumber || '919033157999').replace(/[^0-9]/g, '');

    // 1. If in native Android app
    if (hasNativeBridge() && window.DigiBizzBridge.shareWhatsAppWithNumber) {
      try {
        window.DigiBizzBridge.shareWhatsAppWithNumber(cleanPhone, text);
        showToast(`📲 WhatsApp (${cleanPhone}) પર મોકલી રહ્યું છે...`, '💬');
        return;
      } catch (err) {
        console.warn('Bridge direct number failed:', err);
      }
    }

    // 2. Automated Desktop Dispatch via local backend
    showToast(`⚡ WhatsApp (+${cleanPhone}) પર આપોઆપ મેસેજ મોકલાઈ રહ્યો છે...`, '🚀');
    try {
      const fDate = choriFromDateInput ? choriFromDateInput.value : choriFromDate;
      const tDate = choriToDateInput ? choriToDateInput.value : choriToDate;
      const autoUrl = `${currentApiBase}/api/godaun/chori-send-whatsapp-auto?from_date=${fDate}&to_date=${tDate}&shift=${choriShift}&process=${choriProcess}&phone=${cleanPhone}`;
      const res = await fetch(autoUrl);
      const resJson = await res.json();
      if (resJson && resJson.success) {
        showToast(`✅ WhatsApp (+${cleanPhone}) પર મેસેજ આપોઆપ સેન્ડ થઈ ગયો!`, '🎉');
        return;
      }
    } catch (e) {
      console.warn('Auto send via backend failed, using web deep link fallback:', e);
    }

    // 3. Fallback: Browser Web WhatsApp
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    const waDeep = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    try {
      const opened = window.open(waUrl, '_blank');
      if (!opened) {
        window.location.href = waDeep;
      }
    } catch (_) {
      window.location.href = waDeep;
    }
  };

  window.copyChoriReport = function() {
    const text = buildChoriWhatsAppText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 આખો ચોરી રિપોર્ટ કોપી થઈ ગયો! WhatsApp માં Paste કરો.', '✅');
      }).catch(() => {
        fallbackCopyChori(text);
      });
    } else {
      fallbackCopyChori(text);
    }
  };

  function fallbackCopyChori(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast('📋 ચોરી રિપોર્ટ કોપી થઈ ગયો!', '✅');
    } catch (e) {
      showToast('❌ કોપી થઈ શક્યું નથી.', '⚠️');
    }
    document.body.removeChild(ta);
  }

  function setupAdminDeductionModeButtons() {
    [btnModeNet, btnModeGross, btnModeCompare].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode') || 'net';
        adminDeductionMode = mode;
        if (btnModeNet) btnModeNet.classList.toggle('active', mode === 'net');
        if (btnModeGross) btnModeGross.classList.toggle('active', mode === 'gross');
        if (btnModeCompare) btnModeCompare.classList.toggle('active', mode === 'compare');
        renderSalaryReport();
      });
    });
  }

  function setupChoriEventListeners() {
    if (btnChoriGetReport) {
      btnChoriGetReport.addEventListener('click', () => {
        if (choriFromDateInput) choriFromDate = choriFromDateInput.value;
        if (choriToDateInput) choriToDate = choriToDateInput.value;
        fetchChoriReport();
      });
    }

    if (choriFromDateInput) {
      choriFromDateInput.addEventListener('change', (e) => {
        choriFromDate = e.target.value;
        if (choriDispFromDate) choriDispFromDate.textContent = formatDisplayDate(choriFromDate);
      });
    }

    if (choriToDateInput) {
      choriToDateInput.addEventListener('change', (e) => {
        choriToDate = e.target.value;
        if (choriDispToDate) choriDispToDate.textContent = formatDisplayDate(choriToDate);
      });
    }

    // Quick range pills for Chori
    const pillToday = document.getElementById('choriPillToday');
    const pillYesterday = document.getElementById('choriPillYesterday');
    const pill7Days = document.getElementById('choriPill7Days');
    const pillMonth = document.getElementById('choriPillMonth');

    function setChoriRange(from, to) {
      choriFromDate = from;
      choriToDate = to;
      if (choriFromDateInput) choriFromDateInput.value = from;
      if (choriToDateInput) choriToDateInput.value = to;
      if (choriDispFromDate) choriDispFromDate.textContent = formatDisplayDate(from);
      if (choriDispToDate) choriDispToDate.textContent = formatDisplayDate(to);
      fetchChoriReport();
    }

    if (pillToday) {
      pillToday.addEventListener('click', () => {
        document.querySelectorAll('.chori-quick-pills .pill-btn').forEach(b => b.classList.remove('active'));
        pillToday.classList.add('active');
        setChoriRange(todayStr, todayStr);
      });
    }

    if (pillYesterday) {
      pillYesterday.addEventListener('click', () => {
        document.querySelectorAll('.chori-quick-pills .pill-btn').forEach(b => b.classList.remove('active'));
        pillYesterday.classList.add('active');
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().slice(0, 10);
        setChoriRange(yStr, yStr);
      });
    }

    if (pill7Days) {
      pill7Days.addEventListener('click', () => {
        document.querySelectorAll('.chori-quick-pills .pill-btn').forEach(b => b.classList.remove('active'));
        pill7Days.classList.add('active');
        const d7 = new Date();
        d7.setDate(d7.getDate() - 6);
        setChoriRange(d7.toISOString().slice(0, 10), todayStr);
      });
    }

    if (pillMonth) {
      pillMonth.addEventListener('click', () => {
        document.querySelectorAll('.chori-quick-pills .pill-btn').forEach(b => b.classList.remove('active'));
        pillMonth.classList.add('active');
        const mStart = todayStr.slice(0, 8) + '01';
        setChoriRange(mStart, todayStr);
      });
    }

    // Shift pills for Chori
    const shiftPills = document.querySelectorAll('#choriShiftPills .mini-pill-btn');
    shiftPills.forEach(btn => {
      btn.addEventListener('click', () => {
        shiftPills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        choriShift = btn.getAttribute('data-shift') || 'all';
        fetchChoriReport();
      });
    });

    // Process pills for Chori
    const procPills = document.querySelectorAll('#choriProcessPills .mini-pill-btn');
    procPills.forEach(btn => {
      btn.addEventListener('click', () => {
        procPills.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        choriProcess = btn.getAttribute('data-process') || 'all';
        fetchChoriReport();
      });
    });

    // Worker dropdown filter
    if (choriWorkerFilter) {
      choriWorkerFilter.addEventListener('change', (e) => {
        choriWorker = e.target.value;
        renderChoriItemsTable();
      });
    }

    // Search filter input
    if (choriSearchInput) {
      choriSearchInput.addEventListener('input', () => {
        renderChoriItemsTable();
      });
    }

    // Excel Export for Chori
    if (btnChoriExportExcel) {
      btnChoriExportExcel.addEventListener('click', async () => {
        try {
          await resolveBestServer();
          const exportUrl = `${currentApiBase}/api/godaun/export-excel?report_type=chori&from_date=${choriFromDate}&to_date=${choriToDate}&shift=${choriShift}&process=${choriProcess}&in_rate=${inRate}&out_rate=${outRate}`;
          window.open(exportUrl, '_blank');
          showToast('📥 ચોરી રિપોર્ટ એક્સેલ ડાઉનલોડ શરૂ થઈ ગઈ છે...', '📊');
        } catch (e) {
          showToast('એક્સેલ ડાઉનલોડમાં ક્ષતિ આવી', '⚠️');
        }
      });
    }
  }

  function populateChoriWorkerDropdown(workers) {
    if (!choriWorkerFilter) return;
    const currentVal = choriWorkerFilter.value;
    let html = `<option value="">બધા કર્મચારીઓ (All Workers)</option>`;
    (workers || []).forEach(w => {
      html += `<option value="${w.worker_name}">${w.worker_name} (${w.total_dupe_pcs} પીસ ચોરી)</option>`;
    });
    choriWorkerFilter.innerHTML = html;
    if (currentVal) choriWorkerFilter.value = currentVal;
  }

  // Refresh Buttons
  function refreshCurrentView() {
    if (!currentUser) return;
    if (currentUser.role === 'worker') {
      if (panelWorkerLive && panelWorkerLive.classList.contains('active')) {
        fetchWorkerLiveReport();
      } else {
        fetchWorkerSalaryReport();
      }
    } else {
      if (viewSalaryReport && viewSalaryReport.classList.contains('active')) {
        fetchSalaryReport();
      } else if (viewChoriReport && viewChoriReport.classList.contains('active')) {
        fetchChoriReport();
      } else {
        fetchUserSummary();
      }
    }
  }

  if (refreshBtn) refreshBtn.addEventListener('click', refreshCurrentView);
  if (navRefreshBottom) navRefreshBottom.addEventListener('click', refreshCurrentView);

  // Initial Load
  updateInRate(inRate, '');
  updateOutRate(outRate, '');
  setupAdminDeductionModeButtons();
  setupChoriEventListeners();
  initAuth();

  // Auto-refresh every 30s
  setInterval(refreshCurrentView, 30000);

})();
