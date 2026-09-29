/**
 * OSLC CHEKING - Detail Report (127) Application Logic
 * Supports Checking Receive & Live Alter (Reject / Damage) Tracking
 * Multilingual: Gujarati, Hindi, English • Created by Jeel Vaghani
 */

// Multilingual Translation Dictionary
const translations = {
  gu: {
    appTitle: "OSLC CHEKING",
    appSub: "ડિટેલ રિપોર્ટ (127) • ચેકિંગ રિસીવ લાઈવ",
    createdBy: "Created by Jeel Vaghani",
    createdBySub: "⚡ Created by Jeel Vaghani",
    liveStatus: "ડિજી લાઈવ",
    downloadExcel: "ચેકિંગ એક્સેલ ડાઉનલોડ",
    mobileApk: "📱 મોબાઈલ APK",
    refreshBtn: "રીફ્રેશ કરો",
    dateCriteria: "📅 તારીખ સિલેક્શન (Date Criteria - Report 127):",
    processBadge: "Process: Checking Receive [127]",
    rangeToday: "આજે (Today)",
    rangeYesterday: "ગઈકાલે (Yesterday)",
    range7days: "છેલ્લા ૭ દિવસ (7 Days)",
    rangeThisMonth: "આ મહિને (This Month)",
    fromDate: "From Date (ક્યાંથી):",
    toDate: "To Date (ક્યાં સુધી):",
    applyFilter: "Apply Date Filter",
    tabSummary: "📊 Cheking Summary (127 Format)",
    tabIdRanking: "🏆 ID વાઇઝ રેન્કિંગ (Top 1)",
    tabAlter: "⚠️ Alter (Reject) Report",
    tabCategory: "🏷️ Category Wise Summary",
    tabDetails: "📋 Detail Report (127) Vouchers",
    kpiTotal: "Checking Receive Total",
    kpiFresh: "Fresh (પાસ)",
    kpiAlt: "Alter / Reject (અલ્ટર)",
    kpiReturn: "Wastage (રીટર્ન)",
    loadingSummary: "Checking Receive સમરી લોડ થઈ રહી છે...",
    alterKpiTotal: "કુલ ઓલ્ટર (રિજેક્ટ) પીસ",
    alterKpiFresh: "ફ્રેશ મંજૂર પીસ",
    alterKpiTopChk: "સૌથી વધુ ઓલ્ટર ચેકર",
    alterKpiTopDes: "સૌથી વધુ ઓલ્ટર ડિઝાઇન",
    alterChkTitle: "👤 Checker Wise Alter (રીજેક્ટ) Breakdown",
    alterDesTitle: "👗 Design Wise Alter (રીજેક્ટ) Breakdown",
    alterVouchersTitle: "📋 Live Alter (Reject) Vouchers List",
    catCardTitle: "Category Wise Production (Sheet 3 Format)",
    totalCheckersLabel: "કુલ એક્ટિવ ચેકર્સ:",
    avgPerCheckerLabel: "સરેરાશ પીસ / ચેકર:",
    top3ShareLabel: "ટોપ ૩ પ્રોડક્શન હિસ્સો:",
    searchIdPlaceholder: "ચેકર ID (દા.ત. P643) અથવા નામ શોધો...",
    searchPlaceholder: "Search Lot No, Design, SKU, Checker...",
    allStatus: "બધા સ્ટેટસ (All Status)",
    freshApproved: "Fresh Approved (પાસ)",
    alterDefect: "Alter (Damage / Reject)",
    wastageReturn: "Wastage (Return)",
    allCheckers: "બધા ચેકર / કારીગર (All)",
    allDesigns: "બધી ડિઝાઇન (All)",
    rowsPerPage: "પેજ દીઠ રો:",
    thRank: "રેન્ક",
    thCheckerId: "ચેકર ID",
    thCheckerName: "ચેકરનું નામ",
    thDept: "ડિપાર્ટમેન્ટ",
    thTotalChecked: "કુલ ચેકિંગ (Top 1)",
    thShare: "હિસ્સો %",
    thVouchers: "વાઉચર્સ",
    thVoucher: "Voucher No",
    thTime: "Time",
    thStatus: "Status",
    thDesign: "Design",
    thCategory: "Category",
    thSize: "Size",
    thSKU: "SKU",
    thLot: "Lot No",
    thChecker: "Checker / Employee",
    thQty: "Qty (Pcs)",
    thRate: "Rate",
    thAmount: "Amount",
    thRemarks: "Remarks",
    thAltQty: "Alter Qty",
    colPNo: "P.NO (CHECKER)",
    colFresh: "FRESH",
    colAlt: "ALT",
    colReturn: "RETURN",
    colTotal: "TOTAL",
    colSubtotal: "SUBTOTAL",
    colGrandTotal: "GRAND TOTAL",
    colCategory: "CATEGORY",
    colQtyPcs: "QTY (PCS)",
    prevPage: "← Previous",
    nextPage: "Next →",
    noData: "આ તારીખ માટે કોઈ ડેટા મળ્યો નથી.",
    noAlterChk: "કોઈ અલ્ટર ડેટા મળ્યો નથી.",
    noAlterDes: "કોઈ ડિઝાઇન અલ્ટર નથી.",
    noAlterVoucher: "આ તારીખે કોઈ અલ્ટર/રીજેક્ટ વાઉચર નથી.",
    top5Kicker: "🏆 લાઈવ ડેશબોર્ડ રેન્કિંગ • LIVE TOP 5",
    top5Title: "સૌથી વધુ કામ કરતા શ્રેષ્ઠ ૫ ચેકર્સ (TOP 1 to TOP 5)",
    top5Subtitle: "જેમનું કામ સૌથી વધુ છે તે TOP 1 માં અને તે મુજબ TOP 5 ક્રમવાર દર્શાવેલ છે",
    top5LiveTag: "લાઈવ રેન્ક #1 to #5",
    deptSummaryTitle: "ડિપાર્ટમેન્ટ સમરી રિપોર્ટ (વધુ કામ પહેલાં • High to Low)",
    pcsChecked: "Pcs Checked",
    share: "હિસ્સો",
    footerText: "OSLC CHEKING • Detail Report (127) • Checking Receive • Om Sai Latest Creation"
  },
  hi: {
    appTitle: "OSLC CHEKING",
    appSub: "विस्तृत रिपोर्ट (127) • चेकिंग रिसीव लाइव",
    createdBy: "निर्मित: जील वघाणी (Jeel Vaghani)",
    createdBySub: "⚡ Created by Jeel Vaghani",
    liveStatus: "डिजी लाइव",
    downloadExcel: "चेकिंग एक्सेल डाउनलोड",
    mobileApk: "📱 मोबाइल APK",
    refreshBtn: "रीफ़्रेश करें",
    dateCriteria: "📅 दिनांक चयन (Date Criteria - Report 127):",
    processBadge: "Process: Checking Receive [127]",
    rangeToday: "आज (Today)",
    rangeYesterday: "कल (Yesterday)",
    range7days: "पिछले 7 दिन (7 Days)",
    rangeThisMonth: "इस महीने (This Month)",
    fromDate: "From Date (आरंभ):",
    toDate: "To Date (समाप्त):",
    applyFilter: "दिनांक फ़िल्टर लगाएं",
    tabSummary: "📊 Cheking Summary (127 Format)",
    tabIdRanking: "🏆 ID वाइज रैंकिंग (Top 1)",
    tabAlter: "⚠️ Alter (Reject) Report",
    tabCategory: "🏷️ Category Wise Summary",
    tabDetails: "📋 Detail Report (127) Vouchers",
    kpiTotal: "कुल चेकिंग रिसीव",
    kpiFresh: "Fresh (पास)",
    kpiAlt: "Alter / Reject (ऑल्टर)",
    kpiReturn: "Wastage (रिटर्न)",
    loadingSummary: "चेकिंग रिसीव सारांश लोड हो रहा है...",
    alterKpiTotal: "कुल ऑल्टर (रिजेक्ट) पीस",
    alterKpiFresh: "स्वीकृत फ्रेश पीस",
    alterKpiTopChk: "सर्वाधिक ऑल्टर चेकर",
    alterKpiTopDes: "सर्वाधिक ऑल्टर डिज़ाइन",
    alterChkTitle: "👤 Checker Wise Alter (रिजेक्ट) Breakdown",
    alterDesTitle: "👗 Design Wise Alter (रिजेक्ट) Breakdown",
    alterVouchersTitle: "📋 Live Alter (Reject) Vouchers List",
    catCardTitle: "Category Wise Production (Sheet 3 Format)",
    totalCheckersLabel: "कुल सक्रिय चेकर:",
    avgPerCheckerLabel: "औसत पीस / चेकर:",
    top3ShareLabel: "टॉप 3 उत्पादन हिस्सा:",
    searchIdPlaceholder: "चेकर ID (उदा. P643) या नाम खोजें...",
    searchPlaceholder: "Search Lot No, Design, SKU, Checker...",
    allStatus: "सभी स्टेटस (All Status)",
    freshApproved: "Fresh Approved (पास)",
    alterDefect: "Alter (Damage / Reject)",
    wastageReturn: "Wastage (Return)",
    allCheckers: "सभी चेकर / कारीगर (All)",
    allDesigns: "सभी डिज़ाइन (All)",
    rowsPerPage: "प्रति पृष्ठ पंक्तियां:",
    thRank: "रैंक",
    thCheckerId: "चेकर ID",
    thCheckerName: "चेकर का नाम",
    thDept: "विभाग",
    thTotalChecked: "कुल चेकिंग (Top 1)",
    thShare: "हिस्सा %",
    thVouchers: "वाउचर्स",
    thVoucher: "Voucher No",
    thTime: "Time",
    thStatus: "Status",
    thDesign: "Design",
    thCategory: "Category",
    thSize: "Size",
    thSKU: "SKU",
    thLot: "Lot No",
    thChecker: "Checker / Employee",
    thQty: "Qty (Pcs)",
    thRate: "Rate",
    thAmount: "Amount",
    thRemarks: "Remarks",
    thAltQty: "Alter Qty",
    colPNo: "P.NO (CHECKER)",
    colFresh: "FRESH",
    colAlt: "ALT",
    colReturn: "RETURN",
    colTotal: "TOTAL",
    colSubtotal: "SUBTOTAL",
    colGrandTotal: "GRAND TOTAL",
    colCategory: "CATEGORY",
    colQtyPcs: "QTY (PCS)",
    prevPage: "← Previous",
    nextPage: "Next →",
    noData: "इस तिथि सीमा के लिए कोई डेटा नहीं मिला।",
    noAlterChk: "कोई ऑल्टर डेटा नहीं मिला।",
    noAlterDes: "कोई डिज़ाइन ऑल्टर नहीं मिला।",
    noAlterVoucher: "इस तिथि पर कोई ऑल्टर/रिजेक्ट वाउचर नहीं है।",
    top5Kicker: "🏆 लाइव डैशबोर्ड रैंकिंग • LIVE TOP 5",
    top5Title: "सर्वाधिक कार्य करने वाले टॉप 5 चेकर (TOP 1 to TOP 5)",
    top5Subtitle: "जिनका काम सबसे अधिक है वे TOP 1 में और उसी क्रम में TOP 5 प्रदर्शित हैं",
    top5LiveTag: "लाइव रैंक #1 to #5",
    deptSummaryTitle: "विभाग वार सारांश रिपोर्ट (अधिक कार्य पहले • High to Low)",
    pcsChecked: "Pcs Checked",
    share: "हिस्सा",
    footerText: "OSLC CHEKING • Detail Report (127) • Checking Receive • Om Sai Latest Creation"
  },
  en: {
    appTitle: "OSLC CHEKING",
    appSub: "Detail Report (127) • Checking Receive Live",
    createdBy: "Created by Jeel Vaghani",
    createdBySub: "⚡ Created by Jeel Vaghani",
    liveStatus: "Digi Live",
    downloadExcel: "Download Cheking Excel",
    mobileApk: "📱 Mobile APK",
    refreshBtn: "Refresh",
    dateCriteria: "📅 Date Criteria (Report 127):",
    processBadge: "Process: Checking Receive [127]",
    rangeToday: "Today",
    rangeYesterday: "Yesterday",
    range7days: "Last 7 Days",
    rangeThisMonth: "This Month",
    fromDate: "From Date:",
    toDate: "To Date:",
    applyFilter: "Apply Date Filter",
    tabSummary: "📊 Cheking Summary (127 Format)",
    tabIdRanking: "🏆 ID-Wise Ranking (Top 1)",
    tabAlter: "⚠️ Alter (Reject) Report",
    tabCategory: "🏷️ Category Wise Summary",
    tabDetails: "📋 Detail Report (127) Vouchers",
    kpiTotal: "Checking Receive Total",
    kpiFresh: "Fresh (Pass)",
    kpiAlt: "Alter / Reject (Alter)",
    kpiReturn: "Wastage (Return)",
    loadingSummary: "Loading Checking Receive Summary...",
    alterKpiTotal: "Total Alter (Reject) Pcs",
    alterKpiFresh: "Fresh Approved Pcs",
    alterKpiTopChk: "Top Checker for Alter",
    alterKpiTopDes: "Top Design for Alter",
    alterChkTitle: "👤 Checker Wise Alter Breakdown",
    alterDesTitle: "👗 Design Wise Alter Breakdown",
    alterVouchersTitle: "📋 Live Alter (Reject) Vouchers List",
    catCardTitle: "Category Wise Production (Sheet 3 Format)",
    totalCheckersLabel: "Total Active Checkers:",
    avgPerCheckerLabel: "Average Pcs / Checker:",
    top3ShareLabel: "Top 3 Production Share:",
    searchIdPlaceholder: "Search Checker ID (e.g. P643) or Name...",
    searchPlaceholder: "Search Lot No, Design, SKU, Checker...",
    allStatus: "All Statuses",
    freshApproved: "Fresh Approved",
    alterDefect: "Alter (Damage / Reject)",
    wastageReturn: "Wastage (Return)",
    allCheckers: "All Checkers (All)",
    allDesigns: "All Designs (All)",
    rowsPerPage: "Rows per page:",
    thRank: "Rank",
    thCheckerId: "Checker ID",
    thCheckerName: "Checker Name",
    thDept: "Department",
    thTotalChecked: "Total Checked (Top 1)",
    thShare: "Share %",
    thVouchers: "Vouchers",
    thVoucher: "Voucher No",
    thTime: "Time",
    thStatus: "Status",
    thDesign: "Design",
    thCategory: "Category",
    thSize: "Size",
    thSKU: "SKU",
    thLot: "Lot No",
    thChecker: "Checker / Employee",
    thQty: "Qty (Pcs)",
    thRate: "Rate",
    thAmount: "Amount",
    thRemarks: "Remarks",
    thAltQty: "Alter Qty",
    colPNo: "P.NO (CHECKER)",
    colFresh: "FRESH",
    colAlt: "ALT",
    colReturn: "RETURN",
    colTotal: "TOTAL",
    colSubtotal: "SUBTOTAL",
    colGrandTotal: "GRAND TOTAL",
    colCategory: "CATEGORY",
    colQtyPcs: "QTY (PCS)",
    prevPage: "← Previous",
    nextPage: "Next →",
    noData: "No data found for this date range.",
    noAlterChk: "No alter records found.",
    noAlterDes: "No alter designs found.",
    noAlterVoucher: "No alter/reject vouchers for this date.",
    top5Kicker: "🏆 LIVE DASHBOARD RANKING • TOP 5",
    top5Title: "Top 5 Performers by Highest Work (TOP 1 to TOP 5)",
    top5Subtitle: "Checkers with the highest total pieces ranked from Top 1 to Top 5 live",
    top5LiveTag: "Live Rank #1 to #5",
    deptSummaryTitle: "Department Summary Report (Highest Work First • High to Low)",
    pcsChecked: "Pcs Checked",
    share: "Share",
    footerText: "OSLC CHEKING • Detail Report (127) • Checking Receive • Om Sai Latest Creation"
  }
};

let currentLang = localStorage.getItem("oslc_language") || "gu";

function t(key) {
  if (translations[currentLang] && translations[currentLang][key]) {
    return translations[currentLang][key];
  }
  if (translations["en"] && translations["en"][key]) {
    return translations["en"][key];
  }
  return key;
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("oslc_language", lang);

  // Update button active state
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
  });

  // Update all [data-i18n] elements
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const val = t(key);
    if (val) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.placeholder = val;
      } else {
        el.textContent = val;
      }
    }
  });

  // Re-render UI components
  if (departmentSummary && departmentSummary.length > 0) {
    renderDepartmentSummary();
  }
  if (alterSummary && Object.keys(alterSummary).length > 0) {
    renderAlterSummary();
  }
  if (categorySummary && categorySummary.length > 0) {
    renderCategorySummary();
  }
  if (allRecords.length > 0) {
    applyClientFilters();
  }
}

let allRecords = [];
let filteredRecords = [];
let departmentSummary = [];
let categorySummary = [];
let alterSummary = {};
let overallTotal = 0;
let overallFresh = 0;
let overallAlt = 0;
let overallReturn = 0;

let currentPage = 1;
let pageSize = 100;

// DOM Elements
const fromDateInput = document.getElementById("fromDateInput");
const toDateInput = document.getElementById("toDateInput");
const btnApplyDate = document.getElementById("btnApplyDate");
const btnRefresh = document.getElementById("btnRefresh");
const btnExportTop = document.getElementById("btnExportTop");

// Hero Elements
const heroTotalPcs = document.getElementById("heroTotalPcs");
const heroFreshPcs = document.getElementById("heroFreshPcs");
const heroAltPcs = document.getElementById("heroAltPcs");
const heroReturnPcs = document.getElementById("heroReturnPcs");
const heroDateLabel = document.getElementById("heroDateLabel");
const heroVoucherCount = document.getElementById("heroVoucherCount");

// View Sections & Tabs
const viewTabs = document.querySelectorAll(".view-tab-btn");
const viewSummary = document.getElementById("viewSummary");
const viewIdRanking = document.getElementById("viewIdRanking");
const viewAlter = document.getElementById("viewAlter");
const viewCategory = document.getElementById("viewCategory");
const viewDetails = document.getElementById("viewDetails");

// View ID-Ranking Elements
const podiumTop1Code = document.getElementById("podiumTop1Code");
const podiumTop1Name = document.getElementById("podiumTop1Name");
const podiumTop1Dept = document.getElementById("podiumTop1Dept");
const podiumTop1Pcs = document.getElementById("podiumTop1Pcs");
const podiumTop1Share = document.getElementById("podiumTop1Share");
const podiumTop1Fresh = document.getElementById("podiumTop1Fresh");
const podiumTop1Alt = document.getElementById("podiumTop1Alt");

const podiumTop2Code = document.getElementById("podiumTop2Code");
const podiumTop2Name = document.getElementById("podiumTop2Name");
const podiumTop2Dept = document.getElementById("podiumTop2Dept");
const podiumTop2Pcs = document.getElementById("podiumTop2Pcs");
const podiumTop2Share = document.getElementById("podiumTop2Share");
const podiumTop2Fresh = document.getElementById("podiumTop2Fresh");

const podiumTop3Code = document.getElementById("podiumTop3Code");
const podiumTop3Name = document.getElementById("podiumTop3Name");
const podiumTop3Dept = document.getElementById("podiumTop3Dept");
const podiumTop3Pcs = document.getElementById("podiumTop3Pcs");
const podiumTop3Share = document.getElementById("podiumTop3Share");
const podiumTop3Fresh = document.getElementById("podiumTop3Fresh");

const podiumTop4Code = document.getElementById("podiumTop4Code");
const podiumTop4Name = document.getElementById("podiumTop4Name");
const podiumTop4Dept = document.getElementById("podiumTop4Dept");
const podiumTop4Pcs = document.getElementById("podiumTop4Pcs");
const podiumTop4Share = document.getElementById("podiumTop4Share");
const podiumTop4Fresh = document.getElementById("podiumTop4Fresh");

const podiumTop5Code = document.getElementById("podiumTop5Code");
const podiumTop5Name = document.getElementById("podiumTop5Name");
const podiumTop5Dept = document.getElementById("podiumTop5Dept");
const podiumTop5Pcs = document.getElementById("podiumTop5Pcs");
const podiumTop5Share = document.getElementById("podiumTop5Share");
const podiumTop5Fresh = document.getElementById("podiumTop5Fresh");

const idRankingTotalCheckers = document.getElementById("idRankingTotalCheckers");
const idRankingAvgPcs = document.getElementById("idRankingAvgPcs");
const idRankingTop3Share = document.getElementById("idRankingTop3Share");

const idRankingSearch = document.getElementById("idRankingSearch");
const idRankingDeptFilter = document.getElementById("idRankingDeptFilter");
const idRankingSortSelect = document.getElementById("idRankingSortSelect");
const idRankingCount = document.getElementById("idRankingCount");
const idRankingTableBody = document.getElementById("idRankingTableBody");
const idRankingTableFoot = document.getElementById("idRankingTableFoot");

let idWiseRanking = [];
let idRankingSummary = {};

// View 1 Elements
const dashTop5CardsContainer = document.getElementById("dashTop5CardsContainer");
const deptCardsContainer = document.getElementById("deptCardsContainer");

// View 2 (Alter Report) Elements
const alterKpiTotal = document.getElementById("alterKpiTotal");
const alterKpiPct = document.getElementById("alterKpiPct");
const alterKpiFresh = document.getElementById("alterKpiFresh");
const alterKpiFreshPct = document.getElementById("alterKpiFreshPct");
const alterKpiTopChecker = document.getElementById("alterKpiTopChecker");
const alterKpiTopCheckerSub = document.getElementById("alterKpiTopCheckerSub");
const alterKpiTopDesign = document.getElementById("alterKpiTopDesign");
const alterKpiTopDesignSub = document.getElementById("alterKpiTopDesignSub");
const alterCheckerCount = document.getElementById("alterCheckerCount");
const alterCheckerTableBody = document.getElementById("alterCheckerTableBody");
const alterDesignCount = document.getElementById("alterDesignCount");
const alterDesignTableBody = document.getElementById("alterDesignTableBody");
const alterVoucherCount = document.getElementById("alterVoucherCount");
const alterVouchersTableBody = document.getElementById("alterVouchersTableBody");

// View 3 (Category) Elements
const categoryTableBody = document.getElementById("categoryTableBody");
const catDateBadge = document.getElementById("catDateBadge");

// View 4 (Detail Report) Elements
const searchInput = document.getElementById("searchInput");
const statusSelect = document.getElementById("statusSelect");
const checkerSelect = document.getElementById("checkerSelect");
const designSelect = document.getElementById("designSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const tableBody = document.getElementById("tableBody");
const mobileCardsList = document.getElementById("mobileCardsList");
const recordCountInfo = document.getElementById("recordCountInfo");
const pageInfo = document.getElementById("pageInfo");
const btnPrevPage = document.getElementById("btnPrevPage");
const btnNextPage = document.getElementById("btnNextPage");
const livePill = document.getElementById("livePill");
const liveStatusText = document.getElementById("liveStatusText");

// Helper: Format Date as YYYY-MM-DD
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Initialize Dates to Today
function initDates() {
  const today = new Date();
  const todayStr = formatDate(today);
  fromDateInput.value = todayStr;
  toDateInput.value = todayStr;
}

// Date Range Shortcuts
function setDateRange(rangeType) {
  const today = new Date();
  let start = new Date(today);
  let end = new Date(today);

  if (rangeType === "today") {
    // today
  } else if (rangeType === "yesterday") {
    start.setDate(today.getDate() - 1);
    end.setDate(today.getDate() - 1);
  } else if (rangeType === "7days") {
    start.setDate(today.getDate() - 6);
  } else if (rangeType === "this_month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  fromDateInput.value = formatDate(start);
  toDateInput.value = formatDate(end);
  loadData();
}

// Update Top KPI Hero Bar
function updateHeroBar(fromDate, toDate) {
  if (heroTotalPcs) heroTotalPcs.textContent = `${overallTotal.toLocaleString()} Pcs`;
  if (heroFreshPcs) heroFreshPcs.textContent = `${overallFresh.toLocaleString()} Pcs`;
  if (heroAltPcs) heroAltPcs.textContent = `${overallAlt.toLocaleString()} Pcs`;
  if (heroReturnPcs) heroReturnPcs.textContent = `${overallReturn.toLocaleString()} Pcs`;

  const dateLabel = fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`;
  if (heroDateLabel) heroDateLabel.textContent = `Date: ${dateLabel}`;
  if (heroVoucherCount) heroVoucherCount.textContent = `${allRecords.length.toLocaleString()} Checking Vouchers`;
  if (catDateBadge) catDateBadge.textContent = `Date: ${dateLabel}`;
}

// Fetch Data from Server API
async function loadData() {
  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;

  deptCardsContainer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading Checking Receive data from Digi Server...</p>
    </div>
  `;

  tableBody.innerHTML = `
    <tr>
      <td colspan="14" class="loading-state">
        <div class="spinner"></div>
        <p>Loading Checking Receive vouchers...</p>
      </td>
    </tr>
  `;

  // If running inside Android APK with Direct DB Bridge
  if (window.AndroidApp && typeof window.AndroidApp.fetchReportData === "function") {
    try {
      window.AndroidApp.fetchReportData(fromDate, toDate, "");
      return;
    } catch (e) {
      console.error("Native fetch failed, using fallback:", e);
    }
  }

  try {
    const params = new URLSearchParams({
      from_date: fromDate,
      to_date: toDate,
    });

    const res = await fetch(`/api/data?${params.toString()}`);
    const data = await res.json();

    handleDataResponse(data);
  } catch (err) {
    deptCardsContainer.innerHTML = `
      <div class="loading-state" style="color:#ef4444;">
        <p>⚠️ Connection Error: ${err.message}</p>
        <button class="btn-page" style="margin-top:10px;" onclick="loadData()">Retry</button>
      </div>
    `;
    tableBody.innerHTML = `
      <tr>
        <td colspan="14" class="loading-state" style="color:#ef4444;">
          <p>⚠️ Connection Error: ${err.message}</p>
        </td>
      </tr>
    `;
  }
}

// Process Server or Native Android Data
function handleDataResponse(data) {
  if (!data || !data.success) {
    throw new Error((data && data.error) || "Failed to fetch data");
  }

  allRecords = data.records || [];
  departmentSummary = data.department_summary || [];
  categorySummary = data.category_summary || [];
  alterSummary = data.alter_summary || {};
  idWiseRanking = data.id_wise_ranking || [];
  idRankingSummary = data.id_ranking_summary || {};
  overallTotal = data.overall_total || 0;
  overallFresh = data.overall_fresh || 0;
  overallAlt = data.overall_alt || 0;
  overallReturn = data.overall_return || 0;

  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;
  updateHeroBar(fromDate, toDate);

  // Render Views (High to Low)
  renderDepartmentSummary();
  renderIdWiseRanking();
  renderAlterSummary();
  renderCategorySummary();
  populateFilters(data.filter_options);
  applyClientFilters();
  updateLiveHealth();
}

// Android Native Direct Bridge Callback
window.onNativeDataReceived = function(data) {
  try {
    handleDataResponse(data);
  } catch (e) {
    console.error("Native data handling failed:", e);
    if (deptCardsContainer) {
      deptCardsContainer.innerHTML = `<div class="loading-state" style="color:#ef4444;"><p>⚠️ Native Bridge Error: ${e.message}</p></div>`;
    }
  }
};

// ----------------------------------------------------
// VIEW 1: Render Department Cards (Sorted: Highest Work First)
// ----------------------------------------------------
function renderDepartmentSummary() {
  // Always update Dashboard Top 5 first
  renderDashboardTop5();

  if (!departmentSummary || departmentSummary.length === 0) {
    deptCardsContainer.innerHTML = `<div class="loading-state">${t("noData")}</div>`;
    return;
  }

  // 1. Sort Departments strictly descending by subtotal pieces (Highest department first)
  const sortedDepts = [...departmentSummary].sort((a, b) => (b.subtotal - a.subtotal));

  let html = "";
  sortedDepts.forEach(dept => {
    // 2. Sort Checkers within this department strictly descending by Total pieces
    const sortedCheckers = [...(dept.checkers || [])].sort((a, b) => (b.total - a.total) || (b.fresh - a.fresh));

    let rowsHtml = "";
    sortedCheckers.forEach((chk, idx) => {
      const isZero = chk.total === 0;
      const rowStyle = isZero ? "opacity:0.4;" : "";
      const hasAltClass = chk.alt > 0 ? "has-alt" : "";

      // Rank Medal inside Department: #1 Gold, #2 Silver, #3 Bronze, #4+ Regular
      let rankPill = "";
      if (chk.total > 0) {
        if (idx === 0) {
          rankPill = `<span class="dept-rank-pill gold" title="Department Rank #1">🥇</span>`;
        } else if (idx === 1) {
          rankPill = `<span class="dept-rank-pill silver" title="Department Rank #2">🥈</span>`;
        } else if (idx === 2) {
          rankPill = `<span class="dept-rank-pill bronze" title="Department Rank #3">🥉</span>`;
        } else {
          rankPill = `<span class="dept-rank-pill regular">#${idx + 1}</span>`;
        }
      }

      rowsHtml += `
        <tr style="${rowStyle}">
          <td class="chk-name" title="${escapeHtml(chk.name)}">${rankPill}${escapeHtml(chk.name)}</td>
          <td class="text-right">${chk.fresh.toLocaleString()}</td>
          <td class="text-right chk-alt ${hasAltClass}">${chk.alt ? chk.alt.toLocaleString() : "0"}</td>
          <td class="text-right">${chk.return_qty ? chk.return_qty.toLocaleString() : "0"}</td>
          <td class="text-right chk-total">${chk.total.toLocaleString()}</td>
        </tr>
      `;
    });

    const subFresh = dept.subtotal_fresh != null ? dept.subtotal_fresh : dept.checkers.reduce((s, c) => s + c.fresh, 0);
    const subAlt = dept.subtotal_alt != null ? dept.subtotal_alt : dept.checkers.reduce((s, c) => s + c.alt, 0);
    const subReturn = dept.subtotal_return != null ? dept.subtotal_return : dept.checkers.reduce((s, c) => s + c.return_qty, 0);

    html += `
      <div class="dept-card">
        <div class="dept-header">
          <div class="dept-title-box">
            <span class="dept-name">${escapeHtml(dept.department)}</span>
            <span class="dept-supervisor">Supervisor: ${escapeHtml(dept.supervisor)}</span>
          </div>
          <span class="dept-badge">${dept.subtotal.toLocaleString()} Pcs</span>
        </div>
        <div class="dept-table-wrapper">
          <table class="dept-table">
            <thead>
              <tr>
                <th>${t("colPNo")}</th>
                <th class="text-right">${t("colFresh")}</th>
                <th class="text-right">${t("colAlt")}</th>
                <th class="text-right">${t("colReturn")}</th>
                <th class="text-right">${t("colTotal")}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="dept-total-row">
                <td>${t("colSubtotal")}</td>
                <td class="text-right">${subFresh.toLocaleString()}</td>
                <td class="text-right" style="color:#fbbf24;">${subAlt.toLocaleString()}</td>
                <td class="text-right">${subReturn.toLocaleString()}</td>
                <td class="text-right" style="padding-right:12px; color:#34d399;">${dept.subtotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  deptCardsContainer.innerHTML = html;
}

// ----------------------------------------------------
// DASHBOARD TOP 5 LEADERBOARD: Highest Checking Performers (TOP 1 to TOP 5)
// ----------------------------------------------------
function renderDashboardTop5() {
  if (!dashTop5CardsContainer) return;
  if (!idWiseRanking || idWiseRanking.length === 0) {
    dashTop5CardsContainer.innerHTML = `
      <div class="loading-state" style="grid-column: 1/-1; padding: 20px;">
        <p>${t("noData")}</p>
      </div>
    `;
    return;
  }

  // Get Top 5 sorted strictly descending by total checked pieces
  const top5 = [...idWiseRanking].sort((a, b) => (b.total - a.total) || (b.fresh - a.fresh)).slice(0, 5);

  const metaList = [
    { rank: 1, class: "rank-1", badge: "👑 1ST • TOP 1", crown: "🥇" },
    { rank: 2, class: "rank-2", badge: "🥈 2ND • TOP 2", crown: "🥈" },
    { rank: 3, class: "rank-3", badge: "🥉 3RD • TOP 3", crown: "🥉" },
    { rank: 4, class: "rank-4", badge: "🎖️ 4TH • TOP 4", crown: "🎖️" },
    { rank: 5, class: "rank-5", badge: "🎖️ 5TH • TOP 5", crown: "🎖️" }
  ];

  let cardsHtml = "";
  top5.forEach((chk, idx) => {
    const meta = metaList[idx] || { rank: idx + 1, class: `rank-${idx + 1}`, badge: `#${idx + 1} • TOP ${idx + 1}`, crown: "🎖️" };
    const hasWork = (chk.total || 0) > 0;
    const cardStyle = hasWork ? "" : "opacity:0.4;";

    cardsHtml += `
      <div class="dash-top-card ${meta.class}" style="${cardStyle}" onclick="filterByCheckerFromDash('${escapeHtml(chk.code)}', '${escapeHtml(chk.name)}')" title="Click to view details for ${escapeHtml(chk.name)}">
        <div class="dash-top-badge">${meta.badge}</div>
        <div class="dash-top-avatar">${meta.crown}</div>
        <div class="dash-top-code">${escapeHtml(chk.code || "-")}</div>
        <div class="dash-top-name" title="${escapeHtml(chk.name)}">${escapeHtml(chk.name || "-")}</div>
        <div class="dash-top-dept">${escapeHtml(chk.department || "")} (${escapeHtml(chk.supervisor || "")})</div>
        <div class="dash-top-qty-box">
          <span class="dash-top-qty-num">${Number(chk.total || 0).toLocaleString()}</span>
          <span class="dash-top-qty-unit">${t("pcsChecked") || "Pcs Checked"}</span>
        </div>
        <div class="dash-top-stats">
          <span class="fresh" title="Fresh Pass">✓ ${Number(chk.fresh || 0).toLocaleString()}</span>
          <span class="alt" title="Alter Defect">⚠️ ${Number(chk.alt || 0).toLocaleString()}</span>
          <span class="share" title="Share of Total">${chk.share_pct || 0}%</span>
        </div>
      </div>
    `;
  });

  dashTop5CardsContainer.innerHTML = cardsHtml;
}

// Click on Top 5 card jumps to ranking/details filtered by that checker
function filterByCheckerFromDash(code, name) {
  const rankingTab = document.querySelector('.view-tab-btn[data-view="idranking"]');
  if (rankingTab) {
    rankingTab.click();
    if (idRankingSearch) {
      idRankingSearch.value = code || name;
      idRankingSearch.dispatchEvent(new Event("input"));
    }
  }
}

// ----------------------------------------------------
// VIEW: Render ID-Wise Checker Performance & Top 5 Ranking
// ----------------------------------------------------
function renderIdWiseRanking() {
  if (!idWiseRanking || idWiseRanking.length === 0) {
    if (idRankingTableBody) {
      idRankingTableBody.innerHTML = `<tr><td colspan="10" class="loading-state">${t("noData")}</td></tr>`;
    }
    return;
  }

  // 1. Update Top 5 Champion Podium Cards
  const top1 = idWiseRanking[0];
  const top2 = idWiseRanking.length > 1 ? idWiseRanking[1] : null;
  const top3 = idWiseRanking.length > 2 ? idWiseRanking[2] : null;
  const top4 = idWiseRanking.length > 3 ? idWiseRanking[3] : null;
  const top5 = idWiseRanking.length > 4 ? idWiseRanking[4] : null;

  if (top1 && podiumTop1Name) {
    if (podiumTop1Code) podiumTop1Code.textContent = top1.code || "-";
    if (podiumTop1Name) podiumTop1Name.textContent = top1.name || "-";
    if (podiumTop1Dept) podiumTop1Dept.textContent = `${top1.department} (${top1.supervisor})`;
    if (podiumTop1Pcs) podiumTop1Pcs.textContent = Number(top1.total || 0).toLocaleString();
    if (podiumTop1Share) podiumTop1Share.textContent = `${top1.share_pct}% Share`;
    if (podiumTop1Fresh) podiumTop1Fresh.textContent = `${Number(top1.fresh || 0).toLocaleString()} Fresh`;
    if (podiumTop1Alt) podiumTop1Alt.textContent = `${Number(top1.alt || 0).toLocaleString()} Alt`;
  }

  if (top2 && podiumTop2Name) {
    if (podiumTop2Code) podiumTop2Code.textContent = top2.code || "-";
    if (podiumTop2Name) podiumTop2Name.textContent = top2.name || "-";
    if (podiumTop2Dept) podiumTop2Dept.textContent = `${top2.department} (${top2.supervisor})`;
    if (podiumTop2Pcs) podiumTop2Pcs.textContent = Number(top2.total || 0).toLocaleString();
    if (podiumTop2Share) podiumTop2Share.textContent = `${top2.share_pct}% Share`;
    if (podiumTop2Fresh) podiumTop2Fresh.textContent = `${Number(top2.fresh || 0).toLocaleString()} Fresh`;
  }

  if (top3 && podiumTop3Name) {
    if (podiumTop3Code) podiumTop3Code.textContent = top3.code || "-";
    if (podiumTop3Name) podiumTop3Name.textContent = top3.name || "-";
    if (podiumTop3Dept) podiumTop3Dept.textContent = `${top3.department} (${top3.supervisor})`;
    if (podiumTop3Pcs) podiumTop3Pcs.textContent = Number(top3.total || 0).toLocaleString();
    if (podiumTop3Share) podiumTop3Share.textContent = `${top3.share_pct}% Share`;
    if (podiumTop3Fresh) podiumTop3Fresh.textContent = `${Number(top3.fresh || 0).toLocaleString()} Fresh`;
  }

  if (top4 && podiumTop4Name) {
    if (podiumTop4Code) podiumTop4Code.textContent = top4.code || "-";
    if (podiumTop4Name) podiumTop4Name.textContent = top4.name || "-";
    if (podiumTop4Dept) podiumTop4Dept.textContent = `${top4.department} (${top4.supervisor})`;
    if (podiumTop4Pcs) podiumTop4Pcs.textContent = Number(top4.total || 0).toLocaleString();
    if (podiumTop4Share) podiumTop4Share.textContent = `${top4.share_pct}% Share`;
    if (podiumTop4Fresh) podiumTop4Fresh.textContent = `${Number(top4.fresh || 0).toLocaleString()} Fresh`;
  }

  if (top5 && podiumTop5Name) {
    if (podiumTop5Code) podiumTop5Code.textContent = top5.code || "-";
    if (podiumTop5Name) podiumTop5Name.textContent = top5.name || "-";
    if (podiumTop5Dept) podiumTop5Dept.textContent = `${top5.department} (${top5.supervisor})`;
    if (podiumTop5Pcs) podiumTop5Pcs.textContent = Number(top5.total || 0).toLocaleString();
    if (podiumTop5Share) podiumTop5Share.textContent = `${top5.share_pct}% Share`;
    if (podiumTop5Fresh) podiumTop5Fresh.textContent = `${Number(top5.fresh || 0).toLocaleString()} Fresh`;
  }

  // Team summary metrics
  const activeCheckers = idWiseRanking.filter(c => (c.total || 0) > 0);
  if (idRankingTotalCheckers) {
    idRankingTotalCheckers.textContent = `${activeCheckers.length} Checkers`;
  }
  if (idRankingAvgPcs) {
    const avg = activeCheckers.length > 0 ? (overallTotal / activeCheckers.length) : 0;
    idRankingAvgPcs.textContent = `${Math.round(avg).toLocaleString()} Pcs`;
  }
  if (idRankingTop3Share) {
    const top3Sum = (top1 ? top1.total : 0) + (top2 ? top2.total : 0) + (top3 ? top3.total : 0);
    const top3Pct = overallTotal > 0 ? ((top3Sum / overallTotal) * 100).toFixed(1) : "0.0";
    idRankingTop3Share.textContent = `${top3Pct}%`;
  }

  // 2. Filter & Sort Table Records
  const q = idRankingSearch ? idRankingSearch.value.trim().toLowerCase() : "";
  const selectedDept = idRankingDeptFilter ? idRankingDeptFilter.value : "";
  const sortBy = idRankingSortSelect ? idRankingSortSelect.value : "total_desc";

  let list = [...idWiseRanking];

  if (selectedDept) {
    list = list.filter(item => item.department === selectedDept);
  }

  if (q) {
    list = list.filter(item => {
      const blob = `${item.code} ${item.name} ${item.department} ${item.supervisor}`.toLowerCase();
      return blob.includes(q);
    });
  }

  // Sort
  if (sortBy === "fresh_desc") {
    list.sort((a, b) => (b.fresh - a.fresh) || (b.total - a.total));
  } else if (sortBy === "alt_desc") {
    list.sort((a, b) => (b.alt - a.alt) || (b.total - a.total));
  } else if (sortBy === "code_asc") {
    list.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  } else {
    // default: total_desc (Top 1)
    list.sort((a, b) => (b.total - a.total) || (b.fresh - a.fresh));
  }

  if (idRankingCount) {
    idRankingCount.textContent = `${list.length} Checkers`;
  }

  if (!idRankingTableBody) return;

  if (list.length === 0) {
    idRankingTableBody.innerHTML = `<tr><td colspan="10" class="loading-state">કોઈ ચેકર મળ્યા નથી.</td></tr>`;
    if (idRankingTableFoot) idRankingTableFoot.innerHTML = "";
    return;
  }

  const maxTotal = top1 && top1.total > 0 ? top1.total : 1;
  let rowsHtml = "";
  let totFresh = 0, totAlt = 0, totReturn = 0, totChecked = 0, totVouchers = 0;

  list.forEach((item) => {
    totFresh += item.fresh;
    totAlt += item.alt;
    totReturn += item.return_qty;
    totChecked += item.total;
    totVouchers += (item.vouchers_count || 0);

    const rk = item.rank;
    let rankBadge = "";
    let rowClass = "";
    let isTop1Bar = false;

    if (rk === 1) {
      rankBadge = `<span class="rank-badge-1">🥇 1</span>`;
      rowClass = "row-top1";
      isTop1Bar = true;
    } else if (rk === 2) {
      rankBadge = `<span class="rank-badge-2">🥈 2</span>`;
      rowClass = "row-top2";
    } else if (rk === 3) {
      rankBadge = `<span class="rank-badge-3">🥉 3</span>`;
      rowClass = "row-top3";
    } else {
      rankBadge = `<span class="rank-badge-normal">#${rk}</span>`;
    }

    const relPct = Math.min(100, Math.round((item.total / maxTotal) * 100));
    const altColor = item.alt > 0 ? "color:#fbbf24; font-weight:700;" : "color:var(--text-muted);";

    rowsHtml += `
      <tr class="${rowClass}">
        <td class="text-center">${rankBadge}</td>
        <td><strong style="font-family:var(--font-mono); color:#94a3b8;">${escapeHtml(item.code)}</strong></td>
        <td><strong style="color:#f8fafc;">${escapeHtml(item.name)}</strong></td>
        <td><span class="podium-dept-pill">${escapeHtml(item.department)}</span></td>
        <td class="text-right">${item.fresh.toLocaleString()}</td>
        <td class="text-right" style="${altColor}">${item.alt.toLocaleString()}</td>
        <td class="text-right" style="color:var(--text-muted);">${item.return_qty.toLocaleString()}</td>
        <td class="text-right" style="font-size:0.96rem; font-weight:800; color:#34d399;">
          ${item.total.toLocaleString()}
        </td>
        <td>
          <div class="share-bar-container">
            <div class="share-bar-track">
              <div class="share-bar-fill ${isTop1Bar ? 'top1-bar' : ''}" style="width:${relPct}%;"></div>
            </div>
            <span class="share-bar-text">${item.share_pct}%</span>
          </div>
        </td>
        <td class="text-right" style="color:var(--text-secondary); font-weight:600;">${(item.vouchers_count || 0).toLocaleString()}</td>
      </tr>
    `;
  });

  idRankingTableBody.innerHTML = rowsHtml;

  // Footer Row with Grand Totals
  if (idRankingTableFoot) {
    idRankingTableFoot.innerHTML = `
      <tr class="dept-total-row" style="background:rgba(30, 41, 59, 0.9);">
        <td colspan="4" class="text-center"><strong>${t("colGrandTotal")} (${list.length} Checkers)</strong></td>
        <td class="text-right"><strong>${totFresh.toLocaleString()}</strong></td>
        <td class="text-right" style="color:#fbbf24;"><strong>${totAlt.toLocaleString()}</strong></td>
        <td class="text-right"><strong>${totReturn.toLocaleString()}</strong></td>
        <td class="text-right" style="font-size:1.05rem; color:#34d399;"><strong>${totChecked.toLocaleString()} Pcs</strong></td>
        <td class="text-right"><strong>100.0%</strong></td>
        <td class="text-right"><strong>${totVouchers.toLocaleString()}</strong></td>
      </tr>
    `;
  }
}

// ----------------------------------------------------
// VIEW 2: Render Dedicated Alter (Reject) Report
// ----------------------------------------------------
function renderAlterSummary() {
  const info = alterSummary || {};
  const totalAlt = info.total_alt_pcs || overallAlt || 0;
  const altRate = info.alt_rate_pct != null ? info.alt_rate_pct : (overallTotal > 0 ? ((totalAlt / overallTotal) * 100).toFixed(1) : 0);
  const checkerRanking = info.checker_alt_ranking || [];
  const designRanking = info.design_alt_ranking || [];

  if (alterKpiTotal) alterKpiTotal.textContent = `${totalAlt.toLocaleString()} Pcs`;
  if (alterKpiPct) alterKpiPct.textContent = `${altRate}% of total checked`;
  if (alterKpiFresh) alterKpiFresh.textContent = `${overallFresh.toLocaleString()} Pcs`;
  if (alterKpiFreshPct) alterKpiFreshPct.textContent = `${overallTotal > 0 ? ((overallFresh / overallTotal) * 100).toFixed(1) : 100}% pass rate`;

  // Top Checker for Alter
  const topChk = checkerRanking.find(c => c.alt > 0) || checkerRanking[0];
  if (topChk && topChk.alt > 0) {
    if (alterKpiTopChecker) alterKpiTopChecker.textContent = topChk.name;
    if (alterKpiTopCheckerSub) alterKpiTopCheckerSub.textContent = `${topChk.alt.toLocaleString()} Pcs alter (${topChk.alt_pct}%)`;
  } else {
    if (alterKpiTopChecker) alterKpiTopChecker.textContent = "None";
    if (alterKpiTopCheckerSub) alterKpiTopCheckerSub.textContent = "0 Pcs alter";
  }

  // Top Design for Alter
  const topDsg = designRanking.find(d => d.alt > 0) || designRanking[0];
  if (topDsg && topDsg.alt > 0) {
    if (alterKpiTopDesign) alterKpiTopDesign.textContent = topDsg.item_name;
    if (alterKpiTopDesignSub) alterKpiTopDesignSub.textContent = `${topDsg.alt.toLocaleString()} Pcs alter (${topDsg.alt_pct}%)`;
  } else {
    if (alterKpiTopDesign) alterKpiTopDesign.textContent = "None";
    if (alterKpiTopDesignSub) alterKpiTopDesignSub.textContent = "0 Pcs alter";
  }

  // 1. Checker Alter Table
  const activeCheckers = checkerRanking.filter(c => c.alt > 0 || c.total > 0);
  if (alterCheckerCount) alterCheckerCount.textContent = `${activeCheckers.length} Checkers`;

  if (alterCheckerTableBody) {
    if (activeCheckers.length === 0) {
      alterCheckerTableBody.innerHTML = `<tr><td colspan="7" class="loading-state">${t("noAlterChk")}</td></tr>`;
    } else {
      let chkHtml = "";
      activeCheckers.forEach((c, idx) => {
        const altClass = c.alt > 0 ? "style='color:#fbbf24; font-weight:700;'" : "";
        chkHtml += `
          <tr>
            <td style="color:var(--text-muted);">${idx + 1}</td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td class="text-right">${c.fresh.toLocaleString()}</td>
            <td class="text-right" ${altClass}>${c.alt.toLocaleString()}</td>
            <td class="text-right">${(c.return_qty || 0).toLocaleString()}</td>
            <td class="text-right"><strong>${c.total.toLocaleString()}</strong></td>
            <td class="text-right" style="color:${c.alt > 0 ? '#fbbf24' : 'var(--text-muted)'}; font-weight:600;">${c.alt_pct}%</td>
          </tr>
        `;
      });
      alterCheckerTableBody.innerHTML = chkHtml;
    }
  }

  // 2. Design Alter Table
  const activeDesigns = designRanking.filter(d => d.alt > 0);
  if (alterDesignCount) alterDesignCount.textContent = `${activeDesigns.length} Designs`;

  if (alterDesignTableBody) {
    if (activeDesigns.length === 0) {
      alterDesignTableBody.innerHTML = `<tr><td colspan="7" class="loading-state">${t("noAlterDes")}</td></tr>`;
    } else {
      let dsgHtml = "";
      activeDesigns.slice(0, 100).forEach((d, idx) => {
        dsgHtml += `
          <tr>
            <td style="color:var(--text-muted);">${idx + 1}</td>
            <td><strong>${escapeHtml(d.item_name)}</strong></td>
            <td><span class="tag-cat">${escapeHtml(d.category || "")}</span></td>
            <td class="text-right">${d.fresh.toLocaleString()}</td>
            <td class="text-right" style="color:#fbbf24; font-weight:700;">${d.alt.toLocaleString()}</td>
            <td class="text-right"><strong>${d.total.toLocaleString()}</strong></td>
            <td class="text-right" style="color:#fbbf24; font-weight:600;">${d.alt_pct}%</td>
          </tr>
        `;
      });
      alterDesignTableBody.innerHTML = dsgHtml;
    }
  }

  // 3. Alter Vouchers List
  const alterVouchers = allRecords.filter(r => r.STATUS_TYPE === "ALT" || r.STATUS_TYPE === "RETURN");
  if (alterVoucherCount) alterVoucherCount.textContent = `${alterVouchers.length} Vouchers`;

  if (alterVouchersTableBody) {
    if (alterVouchers.length === 0) {
      alterVouchersTableBody.innerHTML = `<tr><td colspan="12" class="loading-state">${t("noAlterVoucher")}</td></tr>`;
    } else {
      let vHtml = "";
      alterVouchers.slice(0, 200).forEach((r, idx) => {
        const badgeClass = r.STATUS_TYPE === "RETURN" ? "badge-status-return" : "badge-status-alt";
        const label = r.STATUS_LABEL || (r.STATUS_TYPE === "RETURN" ? "WASTAGE" : "ALTER");
        const remark = r.TRANS_REMARK || r.DET_REMARK || "";

        vHtml += `
          <tr>
            <td style="color:var(--text-muted);">${idx + 1}</td>
            <td><strong>${escapeHtml(r.VOUCHER_NO)}</strong></td>
            <td>${escapeHtml(r.TIME || "")}</td>
            <td><span class="${badgeClass}">${escapeHtml(label)}</span></td>
            <td><strong>${escapeHtml(r.ITEM_NAME)}</strong></td>
            <td><span class="tag-cat">${escapeHtml(r.CATEGORY || "")}</span></td>
            <td>${escapeHtml(r.SIZE)}</td>
            <td><span class="tag-sku">${escapeHtml(r.SKU_CODE)}</span></td>
            <td><span class="tag-lot">${escapeHtml(r.LOT_NO)}</span></td>
            <td><span class="tag-emp">${escapeHtml(r.EMPLOYEE_NAME)}</span></td>
            <td class="text-right tag-pcs" style="color:#fbbf24;">${(Number(r.QTY_PIECES) || 0).toLocaleString()}</td>
            <td style="color:var(--text-secondary); max-width:180px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(remark)}</td>
          </tr>
        `;
      });
      alterVouchersTableBody.innerHTML = vHtml;
    }
  }
}

// ----------------------------------------------------
// VIEW 3: Render Category Wise Summary (Sheet 3 Format)
// ----------------------------------------------------
function renderCategorySummary() {
  if (!categorySummary || categorySummary.length === 0) {
    categoryTableBody.innerHTML = `<tr><td colspan="2" class="loading-state">${t("noData")}</td></tr>`;
    return;
  }

  let rowsHtml = "";
  let catTotal = 0;

  categorySummary.forEach(c => {
    catTotal += c.qty;
    rowsHtml += `
      <tr>
        <td><strong>${escapeHtml(c.category)}</strong></td>
        <td class="text-right" style="color:#34d399; font-weight:700;">${c.qty.toLocaleString()}</td>
      </tr>
    `;
  });

  rowsHtml += `
    <tr class="category-total-row">
      <td>${t("colGrandTotal")}</td>
      <td class="text-right">${catTotal.toLocaleString()}</td>
    </tr>
  `;

  categoryTableBody.innerHTML = rowsHtml;
}

// ----------------------------------------------------
// VIEW 4: Detail Report 127 Vouchers
// ----------------------------------------------------
function populateFilters(options) {
  if (!options) return;

  const currentChecker = checkerSelect.value;
  const currentDesign = designSelect.value;

  checkerSelect.innerHTML = `<option value="">${t("allCheckers")}</option>`;
  (options.checkers || []).forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    if (c === currentChecker) opt.selected = true;
    checkerSelect.appendChild(opt);
  });

  designSelect.innerHTML = `<option value="">${t("allDesigns")}</option>`;
  (options.designs || []).forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    if (d === currentDesign) opt.selected = true;
    designSelect.appendChild(opt);
  });
}

function applyClientFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusSelect ? statusSelect.value : "";
  const selectedChecker = checkerSelect.value;
  const selectedDesign = designSelect.value;

  filteredRecords = allRecords.filter(r => {
    if (selectedStatus && r.STATUS_TYPE !== selectedStatus) return false;
    if (selectedChecker && r.EMPLOYEE_NAME !== selectedChecker) return false;
    if (selectedDesign && r.ITEM_NAME !== selectedDesign) return false;
    if (q) {
      const matchLot = (r.LOT_NO || "").toLowerCase().includes(q);
      const matchDesign = (r.ITEM_NAME || "").toLowerCase().includes(q);
      const matchSku = (r.SKU_CODE || "").toLowerCase().includes(q);
      const matchEmp = (r.EMPLOYEE_NAME || "").toLowerCase().includes(q);
      const matchVoucher = (r.VOUCHER_NO || "").toLowerCase().includes(q);
      const matchStatus = (r.STATUS_LABEL || "").toLowerCase().includes(q);
      if (!matchLot && !matchDesign && !matchSku && !matchEmp && !matchVoucher && !matchStatus) return false;
    }
    return true;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const total = filteredRecords.length;
  recordCountInfo.textContent = `Total Records: ${total.toLocaleString()}`;

  if (total === 0) {
    tableBody.innerHTML = `<tr><td colspan="14" class="loading-state">કોઈ વાઉચર મળ્યા નથી.</td></tr>`;
    mobileCardsList.innerHTML = `<div class="loading-state">કોઈ વાઉચર મળ્યા નથી.</div>`;
    pageInfo.textContent = "Page 0 of 0";
    btnPrevPage.disabled = true;
    btnNextPage.disabled = true;
    return;
  }

  const effectivePageSize = pageSize === "all" ? total : Number(pageSize);
  const totalPages = Math.ceil(total / effectivePageSize);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * effectivePageSize;
  const endIdx = Math.min(startIdx + effectivePageSize, total);
  const slice = filteredRecords.slice(startIdx, endIdx);

  let rowsHtml = "";
  let cardsHtml = "";

  slice.forEach((r, idx) => {
    const rowNum = startIdx + idx + 1;
    const pcs = Number(r.QTY_PIECES) || 0;
    const rate = Number(r.RATE) || 0;
    const amt = Number(r.AMOUNT) || 0;
    const timeStr = r.TIME || "";
    const remark = r.TRANS_REMARK || r.DET_REMARK || "";

    let badgeClass = "badge-status-fresh";
    if (r.STATUS_TYPE === "ALT") badgeClass = "badge-status-alt";
    else if (r.STATUS_TYPE === "RETURN") badgeClass = "badge-status-return";

    const statusLabel = r.STATUS_LABEL || (r.STATUS_TYPE === "ALT" ? "ALTER" : (r.STATUS_TYPE === "RETURN" ? "WASTAGE" : "FRESH"));

    rowsHtml += `
      <tr>
        <td style="color:var(--text-muted);">${rowNum}</td>
        <td><strong>${escapeHtml(r.VOUCHER_NO)}</strong></td>
        <td>${escapeHtml(timeStr)}</td>
        <td><span class="${badgeClass}">${escapeHtml(statusLabel)}</span></td>
        <td><strong>${escapeHtml(r.ITEM_NAME)}</strong></td>
        <td><span class="tag-cat">${escapeHtml(r.CATEGORY || "")}</span></td>
        <td>${escapeHtml(r.SIZE)}</td>
        <td><span class="tag-sku">${escapeHtml(r.SKU_CODE)}</span></td>
        <td><span class="tag-lot">${escapeHtml(r.LOT_NO)}</span></td>
        <td><span class="tag-emp">${escapeHtml(r.EMPLOYEE_NAME)}</span></td>
        <td class="text-right tag-pcs" style="color:${r.STATUS_TYPE === 'ALT' ? '#fbbf24' : '#34d399'};">${pcs.toLocaleString()}</td>
        <td class="text-right">${rate ? rate.toFixed(2) : "-"}</td>
        <td class="text-right" style="color:#34d399; font-weight:600;">${amt ? "₹" + amt.toFixed(2) : "-"}</td>
        <td style="color:var(--text-secondary); max-width:200px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(remark)}</td>
      </tr>
    `;

    cardsHtml += `
      <div class="m-card">
        <div class="m-card-top">
          <span class="m-card-voucher">${escapeHtml(r.VOUCHER_NO)}</span>
          <span class="${badgeClass}">${escapeHtml(statusLabel)}</span>
          <span class="tag-pcs">${pcs.toLocaleString()} Pcs</span>
        </div>
        <div class="m-card-body">
          <div class="m-card-row">
            <span class="m-card-label">Design & Size</span>
            <span class="m-card-val">${escapeHtml(r.ITEM_NAME)} (${escapeHtml(r.SIZE)}) [${escapeHtml(r.CATEGORY || "")}]</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">Checker / Karigar</span>
            <span class="m-card-val tag-emp">${escapeHtml(r.EMPLOYEE_NAME || "-")}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">Lot No</span>
            <span class="m-card-val tag-lot">${escapeHtml(r.LOT_NO || "-")}</span>
          </div>
          <div class="m-card-row">
            <span class="m-card-label">Time</span>
            <span class="m-card-val" style="color:var(--text-muted);">${escapeHtml(timeStr)}</span>
          </div>
        </div>
      </div>
    `;
  });

  tableBody.innerHTML = rowsHtml;
  mobileCardsList.innerHTML = cardsHtml;

  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  btnPrevPage.disabled = currentPage <= 1;
  btnNextPage.disabled = currentPage >= totalPages;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Native Android Data Callback
window.onNativeDataReceived = function(dataOrJsonString) {
  try {
    const data = typeof dataOrJsonString === "string" ? JSON.parse(dataOrJsonString) : dataOrJsonString;
    if (!data.success) {
      throw new Error(data.error || "Failed to query database directly");
    }

    allRecords = data.records || [];
    departmentSummary = data.department_summary || [];
    categorySummary = data.category_summary || [];
    alterSummary = data.alter_summary || {};
    idWiseRanking = data.id_wise_ranking || [];
    idRankingSummary = data.id_ranking_summary || {};
    overallTotal = data.overall_total || 0;
    overallFresh = data.overall_fresh || 0;
    overallAlt = data.overall_alt || 0;
    overallReturn = data.overall_return || 0;

    const fromDate = fromDateInput.value;
    const toDate = toDateInput.value;
    updateHeroBar(fromDate, toDate);

    renderDepartmentSummary();
    renderIdWiseRanking();
    renderAlterSummary();
    renderCategorySummary();
    populateFilters(data.filter_options);
    applyClientFilters();

    livePill.style.display = "inline-flex";
    liveStatusText.textContent = "Direct SQL Live (4G/5G)";
  } catch (err) {
    deptCardsContainer.innerHTML = `
      <div class="loading-state" style="color:#ef4444;">
        <p>⚠️ Direct Database Connection Error: ${err.message}</p>
        <button class="btn-page" style="margin-top:10px;" onclick="loadData()">Retry</button>
      </div>
    `;
  }
};

// Download Excel Report
function downloadExcel() {
  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;

  if (window.AndroidApp && typeof window.AndroidApp.exportExcel === "function") {
    btnExportTop.innerHTML = `<span>⏳ Downloading Excel...</span>`;
    window.AndroidApp.exportExcel(fromDate, toDate);
    setTimeout(() => {
      btnExportTop.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        <span>Download Cheking Excel</span>
      `;
    }, 3500);
    return;
  }

  const params = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
  });

  const origHtml = btnExportTop.innerHTML;
  btnExportTop.innerHTML = `<span>⏳ Preparing Excel...</span>`;

  const downloadUrl = `/api/export?${params.toString()}`;
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `CHEKING REPORT ${fromDate}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    btnExportTop.innerHTML = origHtml;
  }, 2500);
}

// Server Health Check
async function updateLiveHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.database_connected) {
      livePill.style.display = "inline-flex";
      liveStatusText.textContent = "Digi Live";
    } else {
      liveStatusText.textContent = "DB Offline";
    }
  } catch {
    liveStatusText.textContent = "Server Offline";
  }
}

// Setup Event Handlers
function setupEvents() {
  // View Tabs (Summary / IdRanking / Alter / Category / Details)
  viewTabs.forEach(btn => {
    btn.addEventListener("click", () => {
      viewTabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.view;

      viewSummary.classList.toggle("active", target === "summary");
      if (viewIdRanking) viewIdRanking.classList.toggle("active", target === "idranking");
      if (viewAlter) viewAlter.classList.toggle("active", target === "alter");
      viewCategory.classList.toggle("active", target === "category");
      viewDetails.classList.toggle("active", target === "details");
    });
  });

  // ID-Wise Top Ranking Controls
  if (idRankingSearch) idRankingSearch.addEventListener("input", renderIdWiseRanking);
  if (idRankingDeptFilter) idRankingDeptFilter.addEventListener("change", renderIdWiseRanking);
  if (idRankingSortSelect) idRankingSortSelect.addEventListener("change", renderIdWiseRanking);

  // Quick Date Range Buttons
  document.querySelectorAll(".date-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".date-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setDateRange(btn.dataset.range);
    });
  });

  // Apply Date Filter Button
  btnApplyDate.addEventListener("click", () => {
    document.querySelectorAll(".date-btn").forEach(b => b.classList.remove("active"));
    loadData();
  });

  btnRefresh.addEventListener("click", loadData);

  // Search & Filter Events
  searchInput.addEventListener("input", applyClientFilters);
  if (statusSelect) statusSelect.addEventListener("change", applyClientFilters);
  checkerSelect.addEventListener("change", applyClientFilters);
  designSelect.addEventListener("change", applyClientFilters);

  pageSizeSelect.addEventListener("change", () => {
    pageSize = pageSizeSelect.value;
    currentPage = 1;
    renderTable();
  });

  btnPrevPage.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  btnNextPage.addEventListener("click", () => {
    currentPage++;
    renderTable();
  });

  // Multilingual Language Switcher Events
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setLanguage(btn.getAttribute("data-lang"));
    });
  });

  btnExportTop.addEventListener("click", downloadExcel);
}

document.addEventListener("DOMContentLoaded", () => {
  initDates();
  setLanguage(currentLang);
  setupEvents();
  loadData();
  setInterval(loadData, 60000);
});
