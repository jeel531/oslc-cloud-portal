/**
 * OSLC KARIGAR GATE PASS SYSTEM - MASTER FRONTEND JAVASCRIPT
 * 
 * Features:
 *  - Official OSLC HOUSE Vector Logo & Favicon Integration
 *  - 3-Language Switcher: Gujarati (ગુજરાતી), Hindi (हिंदी), English (EN)
 *  - Multi-PC Office Network Link & Real-Time Sync Polling
 *  - Multi-Worker Selection & Batch Gate Pass Printing with Sequential Int Nos
 *  - 3 Authorized Signatures: Permission By, Checking Done By, Gate Pass Issued By
 *  - Report 141 Mall Table with Lot No & Barcode No
 *  - Clean Initial State: Only loads photos & profiles when a number is entered
 *  - Half-A4 Page Print Formatting with Automated Jeel Vaghani Credit
 * 
 * Created By JEEL VAGHANI • OSLC HOUSE
 */

// Global State
let currentWorker = null;
let currentWorkersList = [];
let selectedWorkers = [];
let searchDebounceTimer = null;
let isReprintMode = false;
let activeReprintIntNo = null;
let currentLang = localStorage.getItem('oslc_lang') || 'gu';
let lastHistoryHash = '';
let networkInfo = { local_ip: '192.168.100.106', port: 8096 };

// ==========================================
// MULTI-LANGUAGE TRANSLATION DICTIONARY
// ==========================================
const I18N = {
    gu: {
        nav_entry: "ગેટ પાસ એન્ટ્રી (Gate Pass)",
        nav_reports: "રિપોર્ટ અને હિસ્ટ્રી (Reports)",
        net_label: "Other PC:",
        net_copy: "📋 Copy",
        half_a4_badge: "📄 HALF A4 PRINT READY",
        card1_title: "1. Gate Pass Details & Worker Search (કારીગર સર્ચ)",
        lbl_pass_date: "Date (તારીખ):",
        lbl_int_no: "Int No. (અંદર નં):",
        lbl_karigar_search: "Enter Number / Code (કોઈ પણ નંબર કે કોડ નાખો - e.g. 84, 101, 287, P571):",
        search_btn: "Search",
        search_placeholder: "Type number like 84, 101, 287 or P414...",
        quick_label: "Quick:",
        select_all_workers: "✓ Select All (બધા પસંદ કરો)",
        card2_title: "2. Selected Karigar (પસંદ કરેલ કારીગર)",
        no_photo: "કોઈ કારીગર પસંદ નથી",
        worker_initial: "કોઈ પણ નંબર નાખી સર્ચ કરો (e.g. 84, 101, 287)",
        lbl_floor_tag: "🏢 Floor:",
        lbl_dept_tag: "🏷️ Dept:",
        lbl_dept: "Department (વિભાગ):",
        lbl_floor: "Floor No (માળ નં):",
        lbl_out_time: "Out Time (જવાનો સમય):",
        lbl_in_time: "In Time (આવવાનો સમય):",
        lbl_reason: "Reason / Purpose (જવાનું કારણ):",
        sig_header: "Authorized Signatures (સહી / પરવાનગી કરનાર)",
        lbl_sig_perm: "1. Permission By (પરવાનગી):",
        lbl_sig_chk: "2. Checking Done (ચેકિંગ):",
        lbl_sig_iss: "3. Gate Pass Issued (પ્રિન્ટ):",
        card3_title: "3. સાધનો અને ID કાર્ડ જમા ચેકલિસ્ટ (Tools & ID Return - ફક્ત કારીગર માટે)",
        checklist_desc: "ℹ️ <strong>સાધનો જમા સ્થિતિ (ફક્ત કારીગર માટે):</strong> જે સાધન જમા થયું હોય તેને સિલેક્ટ રાખો (પ્રિન્ટમાં <strong>[DONE]</strong> આવશે). જો કાંઈ સિલેક્ટ નહિ હોય તો પ્રિન્ટમાંથી આખી લાઇન નીકળી જશે.",
        tool_1: "નાનું કટર",
        tool_2: "કાતર",
        tool_3: "સ્ટૂલ / ટેબલ",
        tool_4: "આઈડી કાર્ડ",
        btn_check_all: "✓ બધા સિલેક્ટ કરો (Select All)",
        btn_clear_all: "✕ અનચેક કરો (Clear)",
        card4_title: "4. Report 141 Pending Mall (STI & Alter Issue)",
        print_btn_single: "PRINT GATE PASS (HALF A4 PAGE - પ્રિન્ટ કાઢો)",
        print_btn_2up: "PRINT 2 ON 1 PAGE (૧ પેજમાં ૨ પાસ)",
        print_btn_batch: (n) => `PRINT BATCH GATE PASSES (${n} WORKERS - પ્રિન્ટ કાઢો)`,
        download_excel: "Download Excel (.xlsx)",
        save_pass: "Issue & Save Pass",
        preview_title: "Official Gate Pass Preview (Half A4 Sheet Format)",
        recent_passes_title: "Recent Issued Passes (તાજેતરના ગેટ પાસ)",
        rpt_page_title: "📊 OSLC KARIGAR GATE PASS REGISTER & MASTER REPORT",
        rpt_page_sub: "ગમે તે દિવસ કે તારીખ સર્ચ કરો • એક્સેલ ડાઉનલોડ • ફરી પ્રિન્ટ (Reprint) કરો",
        rpt_download_btn: "Download Excel Register (એક્સેલ ડાઉનલોડ)",
        rpt_print_btn: "Print Report (પ્રિન્ટ રિપોર્ટ)",
        kpi_total: "કુલ ઇશ્યુ થયેલા ગેટ પાસ",
        kpi_mall: "141 માલ બાકી હોય તેવા પાસ",
        kpi_clear: "ઓલ ક્લિયર (0 Pcs) પાસ",
        kpi_reprint: "ફરી પ્રિન્ટ થયેલા (Reprints)",
        rpt_date: "Filter By Date (તારીખ):",
        rpt_from_date: "From Date (થી તારીખ):",
        rpt_to_date: "To Date (સુધી તારીખ):",
        rpt_search: "Search Karigar / Int No (કારીગર / નં સર્ચ):",
        rpt_mall_filter: "141 Mall Filter:",
        quick_date_filters: "Quick Filters:",
        reprint_hint: "💡 \"REPRINT\" ક્લિક કરવાથી ઓરિજિનલ <strong>Int No. બદલાયા વગર</strong> નવો એન્ટ્રી લોગ થશે અને પ્રિન્ટ નીકળશે!",
    },
    hi: {
        nav_entry: "गेट पास एंट्री (Gate Pass)",
        nav_reports: "रिपोर्ट और हिस्ट्री (Reports)",
        net_label: "Other PC:",
        net_copy: "📋 Copy",
        half_a4_badge: "📄 HALF A4 PRINT READY",
        card1_title: "1. Gate Pass Details & Worker Search (कारीगर सर्च)",
        lbl_pass_date: "Date (तारीख):",
        lbl_int_no: "Int No. (अंदर नंबर):",
        lbl_karigar_search: "Enter Number / Code (कोई भी नंबर या कोड डालें - e.g. 84, 101, 287, P571):",
        search_btn: "Search",
        search_placeholder: "Type number like 84, 101, 287 or P414...",
        quick_label: "Quick:",
        select_all_workers: "✓ Select All (सभी चुनें)",
        card2_title: "2. Selected Karigar (चयनित कारीगर)",
        no_photo: "कोई कारीगर चुना नहीं गया",
        worker_initial: "कृपया कोई नंबर दर्ज कर सर्च करें (e.g. 84, 101, 287)",
        lbl_floor_tag: "🏢 Floor:",
        lbl_dept_tag: "🏷️ Dept:",
        lbl_dept: "Department (विभाग):",
        lbl_floor: "Floor No (मंजिल नंबर):",
        lbl_out_time: "Out Time (जाने का समय):",
        lbl_in_time: "In Time (आने का समय):",
        lbl_reason: "Reason / Purpose (जाने का कारण):",
        sig_header: "Authorized Signatures (हस्ताक्षर / अनुमति)",
        lbl_sig_perm: "1. Permission By (अनुमति):",
        lbl_sig_chk: "2. Checking Done (चेकिंग):",
        lbl_sig_iss: "3. Gate Pass Issued (प्रिंट कर्ता):",
        card3_title: "3. टूल्स और आईडी कार्ड वापसी चेकलिस्ट (Tools & ID Return - सिर्फ कारीगर के लिए)",
        checklist_desc: "ℹ️ <strong>टूल्स वापसी स्थिति (सिर्फ कारीगर के लिए):</strong> जो टूल जमा हुआ है उसे सेलेक्ट रखें (प्रिंट में <strong>[DONE]</strong> आएगा)। यदि कुछ भी सेलेक्ट नहीं होगा तो प्रिंट में से यह लाइन हट जाएगी।",
        tool_1: "छोटा कटर",
        tool_2: "कैंची",
        tool_3: "स्टूल / टेबल",
        tool_4: "आईडी कार्ड",
        btn_check_all: "✓ सभी चुनें (Select All)",
        btn_clear_all: "✕ अनचेक करें (Clear)",
        card4_title: "4. Report 141 Pending Mall (STI & Alter Issue)",
        print_btn_single: "PRINT GATE PASS (HALF A4 PAGE - प्रिंट निकालें)",
        print_btn_2up: "PRINT 2 ON 1 PAGE (1 पेज में 2 पास)",
        print_btn_batch: (n) => `PRINT BATCH GATE PASSES (${n} WORKERS - प्रिंट निकालें)`,
        download_excel: "Download Excel (.xlsx)",
        save_pass: "Issue & Save Pass",
        preview_title: "Official Gate Pass Preview (Half A4 Sheet Format)",
        recent_passes_title: "Recent Issued Passes (हाल ही के गेट पास)",
        rpt_page_title: "📊 OSLC KARIGAR GATE PASS REGISTER & MASTER REPORT",
        rpt_page_sub: "किसी भी दिन या तारीख को सर्च करें • एक्सेल डाउनलोड • पुनः प्रिंट (Reprint) करें",
        rpt_download_btn: "Download Excel Register (एक्सेल डाउनलोड)",
        rpt_print_btn: "Print Report (प्रिंट रिपोर्ट)",
        kpi_total: "कुल जारी किए गए गेट पास",
        kpi_mall: "141 माल बाकी वाले पास",
        kpi_clear: "ऑल क्लियर (0 Pcs) पास",
        kpi_reprint: "पुनः प्रिंट किए गए (Reprints)",
        rpt_date: "Filter By Date (तारीख):",
        rpt_from_date: "From Date (से तारीख):",
        rpt_to_date: "To Date (तक तारीख):",
        rpt_search: "Search Karigar / Int No (कारीगर / नंबर सर्च):",
        rpt_mall_filter: "141 Mall Filter:",
        quick_date_filters: "Quick Filters:",
        reprint_hint: "💡 \"REPRINT\" क्लिक करने से ओरिजिनल <strong>Int No. बदले बिना</strong> नई एंट्री रिकॉर्ड होगी और प्रिंट निकलेगा!",
    },
    en: {
        nav_entry: "Gate Pass Entry",
        nav_reports: "Reports & History",
        net_label: "Other PC:",
        net_copy: "📋 Copy",
        half_a4_badge: "📄 HALF A4 PRINT READY",
        card1_title: "1. Gate Pass Details & Worker Search",
        lbl_pass_date: "Date:",
        lbl_int_no: "Int No.:",
        lbl_karigar_search: "Enter Number / Code (e.g. 84, 101, 287, P571):",
        search_btn: "Search",
        search_placeholder: "Type number like 84, 101, 287 or P414...",
        quick_label: "Quick:",
        select_all_workers: "✓ Select All",
        card2_title: "2. Selected Karigar",
        no_photo: "No Worker Selected",
        worker_initial: "Please enter a number to search (e.g. 84, 101, 287)",
        lbl_floor_tag: "🏢 Floor:",
        lbl_dept_tag: "🏷️ Dept:",
        lbl_dept: "Department:",
        lbl_floor: "Floor No:",
        lbl_out_time: "Out Time:",
        lbl_in_time: "In Time:",
        lbl_reason: "Reason / Purpose:",
        sig_header: "Authorized Signatures",
        lbl_sig_perm: "1. Permission By:",
        lbl_sig_chk: "2. Checking Done By:",
        lbl_sig_iss: "3. Gate Pass Issued By:",
        card3_title: "3. Tools & ID Return Checklist (Karigar Only)",
        checklist_desc: "ℹ️ <strong>Asset Return Status (Karigar Only):</strong> Check returned items (prints <strong>[DONE]</strong>). If nothing is selected, this line will be omitted from the printed gate pass.",
        tool_1: "Small Cutter",
        tool_2: "Scissor",
        tool_3: "Stool / Table",
        tool_4: "ID Card",
        btn_check_all: "✓ Select All",
        btn_clear_all: "✕ Clear All",
        card4_title: "4. Report 141 Pending Mall (STI & Alter Issue)",
        print_btn_single: "PRINT GATE PASS (HALF A4 PAGE)",
        print_btn_2up: "PRINT 2 ON 1 PAGE",
        print_btn_batch: (n) => `PRINT BATCH GATE PASSES (${n} WORKERS)`,
        download_excel: "Download Excel (.xlsx)",
        save_pass: "Issue & Save Pass",
        preview_title: "Official Gate Pass Preview (Half A4 Sheet Format)",
        recent_passes_title: "Recent Issued Passes",
        rpt_page_title: "📊 OSLC KARIGAR GATE PASS REGISTER & MASTER REPORT",
        rpt_page_sub: "Search any date • Download Excel Register • Reprint Gate Passes",
        rpt_download_btn: "Download Excel Register (.xlsx)",
        rpt_print_btn: "Print Report Register",
        kpi_total: "Total Issued Passes",
        kpi_mall: "Passes with Pending Goods",
        kpi_clear: "All Clear (0 Pcs) Passes",
        kpi_reprint: "Reprinted Passes",
        rpt_date: "Filter By Date:",
        rpt_from_date: "From Date:",
        rpt_to_date: "To Date:",
        rpt_search: "Search Karigar / Int No:",
        rpt_mall_filter: "141 Mall Filter:",
        quick_date_filters: "Quick Filters:",
        reprint_hint: "💡 Clicking \"REPRINT\" records a new entry while strictly preserving the original Int No.!",
    }
};

// ==========================================
// DOM ELEMENTS
// ==========================================

// Tabs Navigation
const tabEntryBtn = document.getElementById('tabEntryBtn');
const tabReportBtn = document.getElementById('tabReportBtn');
const viewGatepassEntry = document.getElementById('viewGatepassEntry');
const viewReportsHistory = document.getElementById('viewReportsHistory');
const tabReportCountBadge = document.getElementById('tabReportCountBadge');

// Multi-PC Network Button
const btnNetworkShare = document.getElementById('btnNetworkShare');
const lanIpBadgeText = document.getElementById('lanIpBadgeText');

// Gate Pass Entry Form Inputs
const passDate = document.getElementById('passDate');
const intNo = document.getElementById('intNo');
const karigarInput = document.getElementById('karigarInput');
const searchBtn = document.getElementById('searchBtn');
const searchDropdown = document.getElementById('searchDropdown');
const workersResultsContainer = document.getElementById('workersResultsContainer');
const workersGrid = document.getElementById('workersGrid');
const workersCountText = document.getElementById('workersCountText');
const btnSelectAllWorkers = document.getElementById('btnSelectAllWorkers');
const selectedCountBadge = document.getElementById('selectedCountBadge');
const multiWorkerBanner = document.getElementById('multiWorkerBanner');
const multiWorkerBannerText = document.getElementById('multiWorkerBannerText');

const deptInput = document.getElementById('deptInput');
const floorSelect = document.getElementById('floorSelect');
const outTimeInput = document.getElementById('outTimeInput');
const inTimeInput = document.getElementById('inTimeInput');
const reasonInput = document.getElementById('reasonInput');

// 3 Signature Dropdowns & Manual "OTHER" Inputs
const signPermissionSelect = document.getElementById('signPermissionSelect');
const signPermissionOtherInput = document.getElementById('signPermissionOtherInput');
const signCheckingSelect = document.getElementById('signCheckingSelect');
const signCheckingOtherInput = document.getElementById('signCheckingOtherInput');
const signIssuedSelect = document.getElementById('signIssuedSelect');
const signIssuedOtherInput = document.getElementById('signIssuedOtherInput');

// Worker Profile
const workerPhotoImg = document.getElementById('workerPhotoImg');
const workerPhotoPlaceholder = document.getElementById('workerPhotoPlaceholder');
const workerFullName = document.getElementById('workerFullName');
const workerFloorDisplay = document.getElementById('workerFloorDisplay');
const workerDeptDisplay = document.getElementById('workerDeptDisplay');
const karigarStatusBadge = document.getElementById('karigarStatusBadge');

// 4 Tools Checklist
const checkSmallCutter = document.getElementById('checkSmallCutter');
const checkScissor = document.getElementById('checkScissor');
const checkStool = document.getElementById('checkStool');
const checkIdCard = document.getElementById('checkIdCard');
const selectAllChecklistBtn = document.getElementById('selectAllChecklistBtn');
const clearAllChecklistBtn = document.getElementById('clearAllChecklistBtn');
const checklistHeaderPill = document.getElementById('checklistHeaderPill');
const checklistValidationBanner = document.getElementById('checklistValidationBanner');
const checklistBannerIcon = document.getElementById('checklistBannerIcon');
const checklistBannerText = document.getElementById('checklistBannerText');

// 141 Mall Alert Box
const pendingAlertBox = document.getElementById('pendingAlertBox');
const alertTitle = document.getElementById('alertTitle');
const totalPendingBadge = document.getElementById('totalPendingBadge');
const stiPendingVal = document.getElementById('stiPendingVal');
const stiLotsVal = document.getElementById('stiLotsVal');
const alterPendingVal = document.getElementById('alterPendingVal');
const alterLotsVal = document.getElementById('alterLotsVal');
const pendingTableContainer = document.getElementById('pendingTableContainer');
const pendingTableBody = document.getElementById('pendingTableBody');

// Slip Preview
const mainGatepassSlip = document.getElementById('mainGatepassSlip');
const previewSrNo = document.getElementById('previewSrNo');
const previewIntNo = document.getElementById('previewIntNo');
const previewReprintBadge = document.getElementById('previewReprintBadge');
const previewDate = document.getElementById('previewDate');
const previewDept = document.getElementById('previewDept');
const previewName = document.getElementById('previewName');
const previewFloor = document.getElementById('previewFloor');
const previewOutTime = document.getElementById('previewOutTime');
const previewInTime = document.getElementById('previewInTime');
const previewPhotoImg = document.getElementById('previewPhotoImg');
const previewPhotoPlaceholder = document.getElementById('previewPhotoPlaceholder');
const previewChecklistRow = document.getElementById('previewChecklistRow');
const previewSignPerm = document.getElementById('previewSignPerm');
const previewSignChk = document.getElementById('previewSignChk');
const previewSignIss = document.getElementById('previewSignIss');
const preview141Stamp = document.getElementById('preview141Stamp');
const slipMallTableWrapper = document.getElementById('slipMallTableWrapper');
const slipMallTableBody = document.getElementById('slipMallTableBody');

// Primary Buttons
const printPassBtn = document.getElementById('printPassBtn');
const printBtnText = document.getElementById('printBtnText');
const print2On1Btn = document.getElementById('print2On1Btn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const savePassBtn = document.getElementById('savePassBtn');
const toggleSingleView = document.getElementById('toggleSingleView');
const toggleMultiView = document.getElementById('toggleMultiView');
const passSheetContainer = document.getElementById('passSheetContainer');
const historyTableBody = document.getElementById('historyTableBody');
const historyCountBadge = document.getElementById('historyCountBadge');

// Dedicated Reports Tab Controls
const rptFilterDate = document.getElementById('rptFilterDate');
const rptFilterFrom = document.getElementById('rptFilterFrom');
const rptFilterTo = document.getElementById('rptFilterTo');
const rptFilterSearch = document.getElementById('rptFilterSearch');
const rptFilterMall = document.getElementById('rptFilterMall');
const rptBtnApplyFilter = document.getElementById('rptBtnApplyFilter');
const rptBtnResetFilter = document.getElementById('rptBtnResetFilter');
const exportReportExcelBtn = document.getElementById('exportReportExcelBtn');
const printReportRegisterBtn = document.getElementById('printReportRegisterBtn');
const rptTableBody = document.getElementById('rptTableBody');
const rptTableCountText = document.getElementById('rptTableCountText');

const rptStatTotalPasses = document.getElementById('rptStatTotalPasses');
const rptStatPendingMallPasses = document.getElementById('rptStatPendingMallPasses');
const rptStatClearPasses = document.getElementById('rptStatClearPasses');
const rptStatReprintCount = document.getElementById('rptStatReprintCount');

// Status & Clock
const liveClock = document.getElementById('liveClock');
const toast = document.getElementById('toast');
const toastIcon = document.getElementById('toastIcon');
const toastText = document.getElementById('toastText');

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initDateAndTime();
    initLanguage();
    initNetworkInfo();
    initChecklistListeners();
    initSignatures();
    bindEvents();
    loadHistory();
    loadMasterReport();

    // Register Service Worker for PWA Android App Installation
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/static/sw.js')
                .then(reg => console.log('[PWA] ServiceWorker registered:', reg.scope))
                .catch(err => console.log('[PWA] ServiceWorker failed:', err));
        });
    }

    // Start background sync polling (every 5 seconds)
    setInterval(pollHistoryUpdates, 5000);
});

function initClock() {
    function update() {
        const now = new Date();
        if (liveClock) liveClock.textContent = now.toLocaleTimeString('en-IN', { hour12: true });
    }
    update();
    setInterval(update, 1000);
}

function initDateAndTime() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    passDate.value = `${yyyy}-${mm}-${dd}`;
    if (rptFilterDate) rptFilterDate.value = `${yyyy}-${mm}-${dd}`;

    const hours = today.getHours();
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    outTimeInput.value = `${formattedHours}:${minutes} ${ampm}`;

    updatePreviewDate();
    updateNextIntNo();
}

function getFormattedDateDMY(dateInputVal = null) {
    const val = dateInputVal || passDate.value;
    if (!val) return '';
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
}

function updatePreviewDate() {
    if (previewDate) previewDate.textContent = getFormattedDateDMY();
}

function showToast(msg, type = 'info') {
    if (!toast) return;
    toastText.textContent = msg;
    toastIcon.textContent = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.className = `toast-msg show ${type}`;
    setTimeout(() => {
        toast.className = 'toast-msg';
    }, 3500);
}

// ==========================================
// MULTI-LANGUAGE SYSTEM
// ==========================================
function initLanguage() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            applyLanguage(lang);
        });
    });
    applyLanguage(currentLang);
}

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('oslc_lang', lang);
    document.documentElement.lang = lang;

    // Toggle active button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    const dict = I18N[lang] || I18N['gu'];

    // Update text elements
    safeSetText('txtNavEntry', dict.nav_entry);
    safeSetText('txtNavReports', dict.nav_reports);
    safeSetText('txtNetLabel', dict.net_label);
    safeSetText('txtNetCopy', dict.net_copy);
    safeSetText('txtHalfA4Badge', dict.half_a4_badge);
    safeSetText('txtCard1Title', dict.card1_title);
    safeSetText('lblPassDate', dict.lbl_pass_date);
    safeSetText('lblIntNo', dict.lbl_int_no);
    safeSetText('lblKarigarSearch', dict.lbl_karigar_search);
    safeSetText('txtSearchBtn', dict.search_btn);
    if (karigarInput) karigarInput.placeholder = dict.search_placeholder;
    safeSetText('txtQuickLabel', dict.quick_label);
    safeSetText('btnSelectAllWorkers', dict.select_all_workers);
    safeSetText('txtCard2Title', dict.card2_title);
    safeSetText('txtNoPhoto', dict.no_photo);
    if (!currentWorker && workerFullName) workerFullName.textContent = dict.worker_initial;
    safeSetText('lblFloorTag', dict.lbl_floor_tag);
    safeSetText('lblDeptTag', dict.lbl_dept_tag);
    safeSetText('lblDept', dict.lbl_dept);
    safeSetText('lblFloor', dict.lbl_floor);
    safeSetText('lblOutTime', dict.lbl_out_time);
    safeSetText('lblInTime', dict.lbl_in_time);
    safeSetText('lblReason', dict.lbl_reason);
    safeSetText('txtSigHeader', dict.sig_header);
    safeSetText('lblSigPerm', dict.lbl_sig_perm);
    safeSetText('lblSigChk', dict.lbl_sig_chk);
    safeSetText('lblSigIss', dict.lbl_sig_iss);
    safeSetText('txtCard3Title', dict.card3_title);
    if (document.getElementById('txtChecklistDesc')) document.getElementById('txtChecklistDesc').innerHTML = dict.checklist_desc;
    safeSetText('txtTool1Name', dict.tool_1);
    safeSetText('txtTool2Name', dict.tool_2);
    safeSetText('txtTool3Name', dict.tool_3);
    safeSetText('txtTool4Name', dict.tool_4);
    safeSetText('txtBtnCheckAll', dict.btn_check_all);
    safeSetText('txtBtnClearAll', dict.btn_clear_all);
    safeSetText('txtCard4Title', dict.card4_title);

    updatePrintButtonText();
    safeSetText('txtPrint2UpBtn', dict.print_btn_2up);
    safeSetText('txtDownloadExcel', dict.download_excel);
    safeSetText('txtSavePass', dict.save_pass);
    safeSetText('txtPreviewTitle', dict.preview_title);
    safeSetText('txtRecentPassesTitle', dict.recent_passes_title);

    safeSetText('txtRptPageTitle', dict.rpt_page_title);
    safeSetText('txtRptPageSub', dict.rpt_page_sub);
    safeSetText('txtRptDownloadBtn', dict.rpt_download_btn);
    safeSetText('txtRptPrintBtn', dict.rpt_print_btn);
    safeSetText('lblKpiTotal', dict.kpi_total);
    safeSetText('lblKpiMall', dict.kpi_mall);
    safeSetText('lblKpiClear', dict.kpi_clear);
    safeSetText('lblKpiReprint', dict.kpi_reprint);
    safeSetText('lblRptDate', dict.rpt_date);
    safeSetText('lblRptFromDate', dict.rpt_from_date);
    safeSetText('lblRptToDate', dict.rpt_to_date);
    safeSetText('lblRptSearch', dict.rpt_search);
    safeSetText('lblRptMallFilter', dict.rpt_mall_filter);
    safeSetText('txtQuickDateFilters', dict.quick_date_filters);
    if (document.getElementById('txtReprintHint')) document.getElementById('txtReprintHint').innerHTML = dict.reprint_hint;
}

function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el && text !== undefined) el.textContent = text;
}

function updatePrintButtonText() {
    const dict = I18N[currentLang] || I18N['gu'];
    if (selectedWorkers.length > 1) {
        printBtnText.textContent = typeof dict.print_btn_batch === 'function' 
            ? dict.print_btn_batch(selectedWorkers.length) 
            : `PRINT BATCH GATE PASSES (${selectedWorkers.length} WORKERS)`;
    } else {
        printBtnText.textContent = dict.print_btn_single;
    }
}

// ==========================================
// MULTI-PC NETWORK DISCOVERY & COPY LINK
// ==========================================
async function initNetworkInfo() {
    try {
        const res = await fetch('/api/network_info');
        if (res.ok) {
            networkInfo = await res.json();
            if (lanIpBadgeText) {
                lanIpBadgeText.textContent = `${networkInfo.local_ip}:${networkInfo.port}`;
            }
        }
    } catch (e) {
        console.warn('Network info unavailable:', e);
    }

    if (btnNetworkShare) {
        btnNetworkShare.addEventListener('click', () => {
            const url = networkInfo.network_url || `http://${networkInfo.local_ip || '192.168.100.106'}:8096`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(() => {
                    showToast(`✅ Link Copied: ${url} (Open on any office PC/Mobile)`, 'success');
                }).catch(() => fallbackCopy(url));
            } else {
                fallbackCopy(url);
            }
        });
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showToast(`✅ Link Copied: ${text}`, 'success');
    } catch (e) {
        prompt('Copy this link to open on other PCs:', text);
    }
    document.body.removeChild(ta);
}

// ==========================================
// BACKGROUND REAL-TIME SYNC POLLING
// ==========================================
async function pollHistoryUpdates() {
    try {
        const targetDate = getFormattedDateDMY();
        const res = await fetch(`/api/history?date=${encodeURIComponent(targetDate)}`);
        if (!res.ok) return;
        const data = await res.json();
        const records = data.records || [];
        const currentHash = `${records.length}-${records[0]?.pass_id || ''}-${records[0]?.reprint_count || 0}`;

        if (lastHistoryHash && lastHistoryHash !== currentHash) {
            // New pass or reprint was added from another PC! Silently refresh data
            console.log('[SYNC] Background update detected from network. Refreshing tables...');
            renderHistoryTable(records);
            loadMasterReport(false);
            updateNextIntNo();
        }
        lastHistoryHash = currentHash;
    } catch (err) {
        // Silent catch for background polling
    }
}

// ==========================================
// SIGNATURES SYNCHRONIZATION & MANUAL INPUT
// ==========================================
function getActiveSignature(selectEl, otherInputEl, fallback) {
    if (!selectEl) return fallback;
    if (selectEl.value === 'OTHER') {
        const custom = otherInputEl ? otherInputEl.value.trim() : '';
        return custom ? custom.toUpperCase() : 'OTHER';
    }
    return selectEl.value;
}

function initSignatures() {
    setupSignatureControl(signPermissionSelect, signPermissionOtherInput);
    setupSignatureControl(signCheckingSelect, signCheckingOtherInput);
    setupSignatureControl(signIssuedSelect, signIssuedOtherInput);
    updateSlipSignatures();
}

function setupSignatureControl(selectEl, otherInputEl) {
    if (!selectEl) return;
    selectEl.addEventListener('change', () => {
        if (otherInputEl) {
            if (selectEl.value === 'OTHER') {
                otherInputEl.style.display = 'block';
                otherInputEl.focus();
            } else {
                otherInputEl.style.display = 'none';
            }
        }
        updateSlipSignatures();
    });
    if (otherInputEl) {
        otherInputEl.addEventListener('input', updateSlipSignatures);
    }
}

function updateSlipSignatures() {
    const perm = getActiveSignature(signPermissionSelect, signPermissionOtherInput, 'RAFIK');
    const chk = getActiveSignature(signCheckingSelect, signCheckingOtherInput, 'MADAN BHAI');
    const iss = getActiveSignature(signIssuedSelect, signIssuedOtherInput, 'JEEL BHAI');

    if (previewSignPerm) previewSignPerm.textContent = `(${perm})`;
    if (previewSignChk) previewSignChk.textContent = `(${chk})`;
    if (previewSignIss) previewSignIss.textContent = `(${iss})`;
}

// ==========================================
// TAB NAVIGATION (ENTRY vs REPORT)
// ==========================================
function switchTab(target) {
    if (target === 'entry') {
        tabEntryBtn.classList.add('active');
        tabReportBtn.classList.remove('active');
        viewGatepassEntry.style.display = 'grid';
        viewReportsHistory.style.display = 'none';
    } else {
        tabReportBtn.classList.add('active');
        tabEntryBtn.classList.remove('active');
        viewGatepassEntry.style.display = 'none';
        viewReportsHistory.style.display = 'flex';
        loadMasterReport();
    }
}

// ==========================================
// 4 TOOLS CHECKLIST LOGIC
// ==========================================
function initChecklistListeners() {
    [checkSmallCutter, checkScissor, checkStool, checkIdCard].forEach(chk => {
        if (chk) chk.addEventListener('change', updateChecklistStatus);
    });

    if (selectAllChecklistBtn) {
        selectAllChecklistBtn.addEventListener('click', () => {
            if (checkSmallCutter) checkSmallCutter.checked = true;
            if (checkScissor) checkScissor.checked = true;
            if (checkStool) checkStool.checked = true;
            if (checkIdCard) checkIdCard.checked = true;
            updateChecklistStatus();
            showToast('તમામ ૪ સાધનો સિલેક્ટ કરાયા (All Items Selected)', 'success');
        });
    }

    if (clearAllChecklistBtn) {
        clearAllChecklistBtn.addEventListener('click', () => {
            if (checkSmallCutter) checkSmallCutter.checked = false;
            if (checkScissor) checkScissor.checked = false;
            if (checkStool) checkStool.checked = false;
            if (checkIdCard) checkIdCard.checked = false;
            updateChecklistStatus();
            showToast('સાધનો અનચેક કરાયા (Checklist Cleared)', 'info');
        });
    }

    updateChecklistStatus();
}

function getChecklistVerification() {
    const missing = [];
    if (checkSmallCutter && !checkSmallCutter.checked) missing.push('નાનું કટર (Small Cutter)');
    if (checkScissor && !checkScissor.checked) missing.push('કાતર (Scissor)');
    if (checkStool && !checkStool.checked) missing.push('સ્ટૂલ / ટેબલ (Stool / Table)');
    if (checkIdCard && !checkIdCard.checked) missing.push('આઈડી કાર્ડ (ID Card)');

    return {
        allChecked: missing.length === 0,
        missing: missing,
        small_cutter: checkSmallCutter ? checkSmallCutter.checked : true,
        scissor: checkScissor ? checkScissor.checked : true,
        stool: checkStool ? checkStool.checked : true,
        id_card: checkIdCard ? checkIdCard.checked : true,
    };
}

function updateChecklistStatus() {
    const chk = getChecklistVerification();
    const hasAny = Boolean(chk.small_cutter || chk.scissor || chk.stool || chk.id_card);

    if (chk.allChecked) {
        if (checklistHeaderPill) {
            checklistHeaderPill.textContent = '✅ ૪ સાધનો જમા';
            checklistHeaderPill.className = 'checklist-status-pill ready';
        }
        if (checklistValidationBanner) {
            checklistValidationBanner.className = 'checklist-banner valid';
            if (checklistBannerIcon) checklistBannerIcon.textContent = '✅';
            if (checklistBannerText) checklistBannerText.textContent = 'તમામ ૪ સાધનો જમા થયેલ છે [DONE] - પ્રિન્ટ મંજૂર છે.';
        }
    } else if (!hasAny) {
        // Nothing is checked (e.g. Staff/Office worker or unassigned tools)
        if (checklistHeaderPill) {
            checklistHeaderPill.textContent = '⚪ લાગુ નથી (N/A)';
            checklistHeaderPill.className = 'checklist-status-pill na';
        }
        if (checklistValidationBanner) {
            checklistValidationBanner.className = 'checklist-banner na';
            if (checklistBannerIcon) checklistBannerIcon.textContent = 'ℹ️';
            if (checklistBannerText) checklistBannerText.textContent = 'કોઈ સાધન સિલેક્ટ નથી - પ્રિન્ટમાંથી ચેકલિસ્ટ લાઇન નીકળી જશે (Not Applicable).';
        }
    } else {
        if (checklistHeaderPill) {
            checklistHeaderPill.textContent = `⚠️ ${chk.missing.length} બાકી`;
            checklistHeaderPill.className = 'checklist-status-pill';
        }
        if (checklistValidationBanner) {
            checklistValidationBanner.className = 'checklist-banner warning';
            if (checklistBannerIcon) checklistBannerIcon.textContent = 'ℹ️';
            if (checklistBannerText) checklistBannerText.textContent = `${chk.missing.length} સાધન જમા નથી - પ્રિન્ટમાં ખાલી [      ] રહેશે. પ્રિન્ટ ચાલુ રહેશે.`;
        }
    }

    updateSlipChecklistDisplay(chk);
}

function updateSlipChecklistDisplay(chk) {
    if (!previewChecklistRow) return;
    const hasAnyChecked = Boolean(chk.small_cutter || chk.scissor || chk.stool || chk.id_card);
    if (!hasAnyChecked) {
        previewChecklistRow.classList.add('is-hidden');
        previewChecklistRow.style.display = 'none';
        return;
    }
    previewChecklistRow.classList.remove('is-hidden');
    previewChecklistRow.style.display = 'flex';

    const cCutter = chk.small_cutter ? 'DONE' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    const cScissor = chk.scissor ? 'DONE' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    const cStool = chk.stool ? 'DONE' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    const cIdCard = chk.id_card ? 'DONE' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';

    previewChecklistRow.innerHTML = `
        <span class="chk-item">CUTTER: <strong>[${cCutter}]</strong></span>
        <span class="chk-sep">•</span>
        <span class="chk-item">SCISSOR: <strong>[${cScissor}]</strong></span>
        <span class="chk-sep">•</span>
        <span class="chk-item">STOOL / TABLE: <strong>[${cStool}]</strong></span>
        <span class="chk-sep">•</span>
        <span class="chk-item">ID CARD: <strong>[${cIdCard}]</strong></span>
    `;
}

// ==========================================
// EVENT BINDINGS
// ==========================================
function bindEvents() {
    tabEntryBtn.addEventListener('click', () => switchTab('entry'));
    tabReportBtn.addEventListener('click', () => switchTab('report'));

    const btnNewEntry = document.getElementById('btnNewPassEntry');
    if (btnNewEntry) {
        btnNewEntry.addEventListener('click', async () => {
            isReprintMode = false;
            activeReprintIntNo = null;
            if (previewReprintBadge) previewReprintBadge.style.display = 'none';
            await updateNextIntNo();
            karigarInput.focus();
            showToast('New Gate Pass mode active! Next Serial No. loaded.', 'info');
        });
    }

    // Live search input
    karigarInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchDebounceTimer);
        if (!query) {
            // Clean initial state: clear everything if input is cleared
            clearSearchAndProfile();
            return;
        }
        searchDebounceTimer = setTimeout(() => {
            executeSearch(query);
        }, 180);
    });

    karigarInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = karigarInput.value.trim();
            if (val) executeSearch(val);
        }
    });

    searchBtn.addEventListener('click', () => {
        const val = karigarInput.value.trim();
        if (val) executeSearch(val);
    });

    // Multi-worker "Select All" button
    if (btnSelectAllWorkers) {
        btnSelectAllWorkers.addEventListener('click', toggleSelectAllWorkers);
    }

    // Quick chips
    document.querySelectorAll('.chip-btn:not(.rpt-chip)').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.getAttribute('data-code');
            karigarInput.value = code;
            isReprintMode = false;
            activeReprintIntNo = null;
            if (previewReprintBadge) previewReprintBadge.style.display = 'none';
            updateNextIntNo();
            executeSearch(code);
        });
    });

    // Date change
    passDate.addEventListener('change', () => {
        isReprintMode = false;
        if (previewReprintBadge) previewReprintBadge.style.display = 'none';
        updatePreviewDate();
        updateNextIntNo();
        loadHistory();
    });

    // Realtime field sync to preview
    intNo.addEventListener('input', () => {
        if (previewIntNo) previewIntNo.textContent = intNo.value || '01';
    });

    deptInput.addEventListener('input', () => {
        if (workerDeptDisplay) workerDeptDisplay.textContent = deptInput.value || 'KARIGAR';
        if (previewDept) previewDept.textContent = deptInput.value || 'KARIGAR';
    });

    floorSelect.addEventListener('change', () => {
        if (workerFloorDisplay) workerFloorDisplay.textContent = floorSelect.value;
        if (previewFloor) previewFloor.textContent = floorSelect.value;
    });

    outTimeInput.addEventListener('input', () => {
        if (previewOutTime) previewOutTime.textContent = outTimeInput.value || '--:--';
    });

    inTimeInput.addEventListener('input', () => {
        if (previewInTime) previewInTime.textContent = inTimeInput.value || '__________';
    });

    // Action buttons
    printPassBtn.addEventListener('click', handlePrintPass);
    if (print2On1Btn) print2On1Btn.addEventListener('click', handlePrint2On1);
    downloadExcelBtn.addEventListener('click', handleDownloadExcel);
    savePassBtn.addEventListener('click', () => handleSavePass(true));

    // View toggles
    toggleSingleView.addEventListener('click', () => {
        toggleSingleView.classList.add('active');
        toggleMultiView.classList.remove('active');
        renderSinglePassView();
    });

    toggleMultiView.addEventListener('click', () => {
        toggleMultiView.classList.add('active');
        toggleSingleView.classList.remove('active');
        renderMultiPassView();
    });

    // Report Tab Actions
    rptBtnApplyFilter.addEventListener('click', loadMasterReport);
    rptBtnResetFilter.addEventListener('click', resetReportFilters);
    exportReportExcelBtn.addEventListener('click', handleExportReportExcel);
    printReportRegisterBtn.addEventListener('click', handlePrintReportRegister);

    // Quick date chips in report
    document.querySelectorAll('.rpt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.rpt-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            handleQuickDateFilter(chip.getAttribute('data-filter'));
        });
    });
}

// ==========================================
// CLEAN INITIAL STATE RESET
// ==========================================
function clearSearchAndProfile() {
    currentWorker = null;
    currentWorkersList = [];
    selectedWorkers = [];
    if (workersResultsContainer) workersResultsContainer.style.display = 'none';
    if (multiWorkerBanner) multiWorkerBanner.style.display = 'none';
    if (selectedCountBadge) selectedCountBadge.style.display = 'none';

    // Reset worker card
    if (workerPhotoImg) workerPhotoImg.style.display = 'none';
    if (workerPhotoPlaceholder) workerPhotoPlaceholder.style.display = 'flex';
    if (workerFullName) {
        const dict = I18N[currentLang] || I18N['gu'];
        workerFullName.textContent = dict.worker_initial;
    }
    if (workerFloorDisplay) workerFloorDisplay.textContent = '--';
    if (workerDeptDisplay) workerDeptDisplay.textContent = '--';
    if (karigarStatusBadge) {
        karigarStatusBadge.textContent = 'NO SELECTION';
        karigarStatusBadge.className = 'worker-code-badge';
    }

    // Reset 141 Mall
    if (pendingAlertBox) {
        pendingAlertBox.className = 'pending-alert-box no-mall';
        alertTitle.innerHTML = `<span>✅ NO SELECTION</span>`;
        stiPendingVal.textContent = '0 Pcs';
        stiLotsVal.textContent = '0 Lots';
        alterPendingVal.textContent = '0 Pcs';
        alterLotsVal.textContent = '0 Lots';
        totalPendingBadge.textContent = '0 Pcs';
        pendingTableContainer.style.display = 'none';
    }

    // Reset preview
    if (previewSrNo) previewSrNo.textContent = 'M---';
    if (previewName) previewName.textContent = 'SELECT KARIGAR';
    if (previewPhotoImg) previewPhotoImg.style.display = 'none';
    if (previewPhotoPlaceholder) previewPhotoPlaceholder.style.display = 'block';
    if (preview141Stamp) {
        preview141Stamp.className = 'slip-141-stamp clear';
        preview141Stamp.innerHTML = `[REPORT 141 CLEAR] NO PENDING GOODS (STI: 0 | ALTER: 0 PCS) - ALL CLEAR`;
    }
    if (slipMallTableWrapper) slipMallTableWrapper.style.display = 'none';

    updatePrintButtonText();
}

// ==========================================
// WORKER SEARCH & MULTI-WORKER SELECTION
// ==========================================
async function executeSearch(query) {
    if (!query) return;

    if (isReprintMode) {
        isReprintMode = false;
        activeReprintIntNo = null;
        if (previewReprintBadge) previewReprintBadge.style.display = 'none';
        await updateNextIntNo();
    }

    try {
        const res = await fetch(`/api/search_workers?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const workers = data.results || [];
        currentWorkersList = workers;

        renderWorkersGrid(workers, query);

        if (workers.length > 0) {
            // Select active worker or first worker by default
            const activeWorkers = workers.filter(w => w.is_active);
            const target = activeWorkers.length ? activeWorkers[0] : workers[0];
            selectedWorkers = [target];
            selectWorkerById(target.id, false);
            updateSelectedWorkersUI();
        } else {
            clearSearchAndProfile();
        }
    } catch (err) {
        console.error('Search error:', err);
    }
}

function renderWorkersGrid(workers, query) {
    if (!workers.length) {
        workersCountText.textContent = `No Karigars found matching '${query}'`;
        workersGrid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-dim); font-size: 13px;">
                No workers found for '${query}'.
            </div>
        `;
        workersResultsContainer.style.display = 'block';
        return;
    }

    workersCountText.textContent = `Found ${workers.length} Karigars (${query}):`;
    workersGrid.innerHTML = workers.map(w => {
        const isSelected = selectedWorkers.some(sw => sw.id === w.id);
        const photoSrc = w.has_photo && w.photo_base64 
            ? `data:image/jpeg;base64,${w.photo_base64}` 
            : '';
        const photoHtml = photoSrc 
            ? `<img src="${photoSrc}" alt="${w.name}" class="worker-grid-img">`
            : `<div class="worker-grid-no-photo">👤</div>`;

        return `
            <div class="worker-card-item ${isSelected ? 'selected' : ''}" data-id="${w.id}">
                <input type="checkbox" class="worker-select-checkbox" data-id="${w.id}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();">
                <div class="worker-grid-photo-wrap">
                    ${photoHtml}
                </div>
                <div class="worker-grid-info">
                    <div class="worker-grid-code">${w.code}</div>
                    <div class="worker-grid-name" title="${w.name}">${w.name}</div>
                    <div class="worker-grid-tags">
                        <span class="tag-floor">${w.floor}</span>
                        ${w.is_active ? '<span class="tag-active">Active</span>' : '<span class="tag-inactive">Inactive</span>'}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach card click handlers
    workersGrid.querySelectorAll('.worker-card-item').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.getAttribute('data-id'), 10);
            toggleWorkerSelection(id);
        });
    });

    // Attach checkbox handlers
    workersGrid.querySelectorAll('.worker-select-checkbox').forEach(chk => {
        chk.addEventListener('change', () => {
            const id = parseInt(chk.getAttribute('data-id'), 10);
            toggleWorkerSelection(id, chk.checked);
        });
    });

    workersResultsContainer.style.display = 'block';
    updateSelectedWorkersUI();
}

function toggleWorkerSelection(workerId, forcedState = null) {
    const worker = currentWorkersList.find(w => w.id === workerId);
    if (!worker) return;

    const existingIdx = selectedWorkers.findIndex(w => w.id === workerId);
    const shouldSelect = forcedState !== null ? forcedState : (existingIdx === -1);

    if (shouldSelect) {
        if (existingIdx === -1) selectedWorkers.push(worker);
    } else {
        if (existingIdx !== -1) selectedWorkers.splice(existingIdx, 1);
    }

    if (selectedWorkers.length === 1) {
        selectWorkerById(selectedWorkers[0].id, false);
    } else if (selectedWorkers.length > 1) {
        selectWorkerById(selectedWorkers[0].id, false);
    }

    updateSelectedWorkersUI();
}

function toggleSelectAllWorkers() {
    if (!currentWorkersList.length) return;

    if (selectedWorkers.length === currentWorkersList.length) {
        // Deselect all
        selectedWorkers = [];
        clearSearchAndProfile();
    } else {
        // Select all active workers (or all if none active)
        const activeOnly = currentWorkersList.filter(w => w.is_active);
        selectedWorkers = [...(activeOnly.length ? activeOnly : currentWorkersList)];
        if (selectedWorkers.length > 0) {
            selectWorkerById(selectedWorkers[0].id, false);
        }
    }

    updateSelectedWorkersUI();
}

function updateSelectedWorkersUI() {
    // Update grid card styles & checkboxes
    workersGrid.querySelectorAll('.worker-card-item').forEach(card => {
        const id = parseInt(card.getAttribute('data-id'), 10);
        const isSel = selectedWorkers.some(w => w.id === id);
        card.classList.toggle('selected', isSel);
        const chk = card.querySelector('.worker-select-checkbox');
        if (chk) chk.checked = isSel;
    });

    // Update count badge & banner
    if (selectedCountBadge) {
        if (selectedWorkers.length > 0) {
            selectedCountBadge.textContent = `${selectedWorkers.length} Selected`;
            selectedCountBadge.style.display = 'inline-block';
        } else {
            selectedCountBadge.style.display = 'none';
        }
    }

    if (multiWorkerBanner) {
        if (selectedWorkers.length > 1) {
            const names = selectedWorkers.map(w => w.code).join(', ');
            multiWorkerBannerText.textContent = `${selectedWorkers.length} Karigars Selected (${names}). Sequential gate passes will be printed (2 per page).`;
            multiWorkerBanner.style.display = 'flex';
            if (toggleMultiView && toggleSingleView) {
                toggleMultiView.classList.add('active');
                toggleSingleView.classList.remove('active');
            }
            renderMultiPassView();
        } else {
            multiWorkerBanner.style.display = 'none';
            if (toggleMultiView && toggleSingleView) {
                toggleSingleView.classList.add('active');
                toggleMultiView.classList.remove('active');
            }
            renderSinglePassView();
        }
    }

    updatePrintButtonText();
}

async function selectWorkerById(workerId, updateGridHighlight = true) {
    try {
        const res = await fetch(`/api/worker/${workerId}`);
        if (!res.ok) {
            showToast('Failed to load full worker details', 'error');
            return;
        }
        const workerData = await res.json();
        currentWorker = workerData;

        populateWorkerProfile(workerData);
        updateSlipSignatures();
    } catch (err) {
        console.error('Error fetching worker by ID:', err);
    }
}

function populateWorkerProfile(data) {
    if (!data) return;

    // Badge
    karigarStatusBadge.textContent = `${data.code} • ${data.floor}`;
    karigarStatusBadge.className = 'worker-code-badge';

    // Full name
    workerFullName.textContent = data.name;

    // Detected department & floor
    let detectedDept = data.department || 'KARIGAR';
    if (!detectedDept || detectedDept === 'NULL' || detectedDept === 'NONE') {
        detectedDept = data.code.startsWith('M') ? 'KARIGAR (STITCHING)' : 'KARIGAR';
    }
    deptInput.value = detectedDept;
    workerDeptDisplay.textContent = detectedDept;

    const detectedFloor = (data.floor || '3RD FLOOR').replace('3TH', '3RD');
    floorSelect.value = detectedFloor;
    workerFloorDisplay.textContent = detectedFloor;

    // Check if worker is Karigar or Staff/Office (Checklist is Karigar only)
    const deptUpper = detectedDept.toUpperCase();
    const codeUpper = (data.code || '').toUpperCase();
    const isKarigar = deptUpper.includes('KARIGAR') || codeUpper.startsWith('M') || codeUpper.startsWith('P');

    if (!isKarigar) {
        // Staff/Office worker: uncheck tools by default so line is omitted from slip
        [checkSmallCutter, checkScissor, checkStool, checkIdCard].forEach(c => { if (c) c.checked = false; });
    }
    updateChecklistStatus();

    // Photos
    if (data.has_photo && data.photo_base64) {
        const src = `data:image/jpeg;base64,${data.photo_base64}`;
        workerPhotoImg.src = src;
        workerPhotoImg.style.display = 'block';
        workerPhotoPlaceholder.style.display = 'none';

        previewPhotoImg.src = src;
        previewPhotoImg.style.display = 'block';
        previewPhotoPlaceholder.style.display = 'none';
    } else {
        workerPhotoImg.style.display = 'none';
        workerPhotoPlaceholder.style.display = 'flex';

        previewPhotoImg.style.display = 'none';
        previewPhotoPlaceholder.style.display = 'block';
    }

    // 141 Mall Data
    stiPendingVal.textContent = `${data.sti_pending_pcs} Pcs`;
    stiLotsVal.textContent = `${data.sti_lots_count} Lots`;
    alterPendingVal.textContent = `${data.alter_pending_pcs} Pcs`;
    alterLotsVal.textContent = `${data.alter_lots_count} Lots`;
    totalPendingBadge.textContent = `${data.total_pending_pcs} Pcs`;

    const pendingItems = data.pending_items || [];

    if (data.has_pending_mall) {
        pendingAlertBox.className = 'pending-alert-box has-mall';
        alertTitle.innerHTML = `<span>⚠️ ATTENTION: PENDING MALL WITH KARIGAR (${data.total_pending_pcs} Pcs)</span>`;

        // UI Table with Barcode No column
        pendingTableBody.innerHTML = pendingItems.map(it => `
            <tr>
                <td><span class="tag-process ${it.process_short.toLowerCase()}">${it.process_short}</span></td>
                <td><strong>${it.lot_no}</strong></td>
                <td><code style="font-family: monospace; font-weight: 700; color: #38bdf8;">${it.barcode_no || it.voucher_no || '-'}</code></td>
                <td>${it.item_name}</td>
                <td>${it.size || '-'}</td>
                <td><strong style="color: #fca5a5;">${it.bal_qty}</strong></td>
                <td>${it.date}</td>
            </tr>
        `).join('');
        pendingTableContainer.style.display = 'block';

        // Slip Table with Barcode No column
        preview141Stamp.className = 'slip-141-stamp warn';
        preview141Stamp.innerHTML = `[REPORT 141 ALERT] PENDING GOODS: STI = ${data.sti_pending_pcs} Pcs | ALTER = ${data.alter_pending_pcs} Pcs (TOTAL: ${data.total_pending_pcs} Pcs)`;

        slipMallTableBody.innerHTML = pendingItems.map(it => `
            <tr>
                <td><strong>${it.process_short}</strong></td>
                <td><strong>${it.lot_no}</strong></td>
                <td><span style="font-family: monospace; font-size: 8px;">${it.barcode_no || it.voucher_no || '-'}</span></td>
                <td>${it.item_name}</td>
                <td><strong style="color: #991b1b;">${it.bal_qty}</strong></td>
                <td>${it.date}</td>
            </tr>
        `).join('');
        slipMallTableWrapper.style.display = 'block';
    } else {
        pendingAlertBox.className = 'pending-alert-box no-mall';
        alertTitle.innerHTML = `<span>✅ ALL CLEAR: NO PENDING GOODS (STI & ALTER CLEAR)</span>`;
        pendingTableContainer.style.display = 'none';

        preview141Stamp.className = 'slip-141-stamp clear';
        preview141Stamp.innerHTML = `[REPORT 141 CLEAR] NO PENDING GOODS (STI: 0 | ALTER: 0 PCS) - ALL CLEAR`;
        slipMallTableWrapper.style.display = 'none';
    }

    // Preview fields
    previewSrNo.textContent = data.code;
    previewName.textContent = data.name;
    previewDept.textContent = detectedDept;
    previewFloor.textContent = floorSelect.value;
    previewOutTime.textContent = outTimeInput.value;
    previewInTime.textContent = inTimeInput.value || '__________';
}

// ==========================================
// PASS PAYLOAD & PRINT LOGIC
// ==========================================
function getPassPayload(worker = null, overrideIntNo = null) {
    const w = worker || currentWorker;
    const code = w ? w.code : previewSrNo.textContent;
    const name = w ? w.name : previewName.textContent;
    const dept = deptInput.value || (w ? w.department : 'KARIGAR');
    const floor = (floorSelect.value || '3RD FLOOR').replace('3TH', '3RD');
    const dmy = getFormattedDateDMY();
    const int_num = overrideIntNo || (isReprintMode && activeReprintIntNo ? activeReprintIntNo : (intNo.value || '01'));
    const out_t = outTimeInput.value || '';
    const in_t = inTimeInput.value || '';
    const reason = reasonInput.value || 'Personal Work';
    const chk = getChecklistVerification();

    const perm = getActiveSignature(signPermissionSelect, signPermissionOtherInput, 'RAFIK');
    const chkSign = getActiveSignature(signCheckingSelect, signCheckingOtherInput, 'MADAN BHAI');
    const issSign = getActiveSignature(signIssuedSelect, signIssuedOtherInput, 'JEEL BHAI');

    return {
        code: code,
        name: name,
        floor: floor,
        department: dept,
        date: dmy,
        int_no: int_num,
        out_time: out_t,
        in_time: in_t,
        reason: reason,
        checklist: {
            small_cutter: chk.small_cutter,
            scissor: chk.scissor,
            stool: chk.stool,
            id_card: chk.id_card,
        },
        sign_permission: perm,
        sign_checking: chkSign,
        sign_issued: issSign,
        sign_rafik: perm,
        sign_ghanshyam: chkSign,
        sign_jeel: issSign,
        created_by: 'JEEL VAGHANI',
        has_pending_mall: w ? w.has_pending_mall : false,
        total_pending_pcs: w ? w.total_pending_pcs : 0,
        sti_pending_pcs: w ? w.sti_pending_pcs : 0,
        alter_pending_pcs: w ? w.alter_pending_pcs : 0,
        pending_items: w ? w.pending_items : [],
        photo_base64: w ? w.photo_base64 : null,
        is_reprint: isReprintMode,
    };
}

// Generate HTML string for single slip
function renderSlipHTML(payload) {
    const chk = payload.checklist || {};
    const hasAnyChecked = Boolean(chk.small_cutter || chk.scissor || chk.stool || chk.id_card);
    const checklistHtml = hasAnyChecked ? `
            <div class="slip-checklist-row">
                <span class="chk-item">CUTTER: <strong>[${chk.small_cutter ? 'DONE' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}]</strong></span>
                <span class="chk-sep">•</span>
                <span class="chk-item">SCISSOR: <strong>[${chk.scissor ? 'DONE' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}]</strong></span>
                <span class="chk-sep">•</span>
                <span class="chk-item">STOOL / TABLE: <strong>[${chk.stool ? 'DONE' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}]</strong></span>
                <span class="chk-sep">•</span>
                <span class="chk-item">ID CARD: <strong>[${chk.id_card ? 'DONE' : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}]</strong></span>
            </div>
    ` : '';

    const photoHtml = payload.photo_base64
        ? `<img src="data:image/jpeg;base64,${payload.photo_base64}" alt="${payload.name}">`
        : `<span style="font-size: 11px; color: #64748b; font-weight: 700; text-align: center;">PHOTO</span>`;

    const mallItems = payload.pending_items || [];
    let mallHtml = '';
    if (payload.has_pending_mall) {
        mallHtml = `
            <div class="slip-141-stamp warn">
                [REPORT 141 ALERT] PENDING GOODS: STI = ${payload.sti_pending_pcs} Pcs | ALTER = ${payload.alter_pending_pcs} Pcs (TOTAL: ${payload.total_pending_pcs} Pcs)
            </div>
            <div style="margin-top: 4px;">
                <table class="slip-mall-table">
                    <thead>
                        <tr>
                            <th>Process</th>
                            <th>Lot No</th>
                            <th>Barcode No</th>
                            <th>Item / SKU</th>
                            <th>Bal Pcs</th>
                            <th>Issue Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mallItems.map(it => `
                            <tr>
                                <td><strong>${it.process_short}</strong></td>
                                <td><strong>${it.lot_no}</strong></td>
                                <td><span style="font-family: monospace; font-size: 8px;">${it.barcode_no || it.voucher_no || '-'}</span></td>
                                <td>${it.item_name}</td>
                                <td><strong style="color: #991b1b;">${it.bal_qty}</strong></td>
                                <td>${it.date}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        mallHtml = `
            <div class="slip-141-stamp clear">
                [REPORT 141 CLEAR] NO PENDING GOODS (STI: 0 | ALTER: 0 PCS) - ALL CLEAR
            </div>
        `;
    }

    return `
        <div class="gatepass-slip">
            <div class="slip-header">
                <img src="/static/img/oslc_logo_print.svg" alt="OSLC HOUSE" class="slip-brand-logo">
            </div>

            <div class="slip-body">
                <div class="slip-info-col">
                    <div class="slip-row-split">
                        <div class="slip-field"><span class="lbl">Sr. No. : </span><span class="val">${payload.code}</span></div>
                        <div class="slip-field"><span class="lbl">Int No. : </span><span class="val">${payload.int_no}</span>${payload.is_reprint ? ' <span class="slip-reprint-tag">[REPRINT]</span>' : ''}</div>
                    </div>
                    <div class="slip-row"><div class="slip-field"><span class="lbl">Date : </span><span class="val">${payload.date}</span></div></div>
                    <div class="slip-row"><div class="slip-field"><span class="lbl">Department : </span><span class="val">${payload.department}</span></div></div>
                    <div class="slip-name-row"><div class="slip-field"><span class="lbl">Name : </span><span class="val">${payload.name}</span></div></div>
                    <div class="slip-row"><div class="slip-field"><span class="lbl">Floor No : </span><span class="val">${payload.floor}</span></div></div>
                    <div class="slip-time-split">
                        <div class="slip-field"><span class="lbl">Out Time : </span><span class="val">${payload.out_time}</span></div>
                        <div class="slip-field"><span class="lbl">In Time : </span><span class="val">${payload.in_time || '__________'}</span></div>
                    </div>
                </div>

                <div class="slip-photo-col">
                    <div class="slip-photo-frame">
                        ${photoHtml}
                    </div>
                    <div class="slip-photo-caption">DIGIBIZZ ID</div>
                </div>
            </div>

${checklistHtml}

            <div class="slip-signatures">
                <div class="slip-sign-box">
                    <div class="sign-box-role">1. Permission By</div>
                    <div class="sign-box-name">(${payload.sign_permission})</div>
                    <div class="sign-box-line">Sign: ________________</div>
                </div>
                <div class="slip-sign-box">
                    <div class="sign-box-role">2. Checking Done By</div>
                    <div class="sign-box-name">(${payload.sign_checking})</div>
                    <div class="sign-box-line">Sign: ________________</div>
                </div>
                <div class="slip-sign-box">
                    <div class="sign-box-role">3. Gate Pass Issued By</div>
                    <div class="sign-box-name">(${payload.sign_issued})</div>
                    <div class="sign-box-line">Sign: ________________</div>
                </div>
            </div>

            <div class="slip-141-container">
                ${mallHtml}
            </div>

            <div class="slip-credit-footer">
                CREATED BY JEEL VAGHANI • OSLC HOUSE
            </div>
        </div>
    `;
}

// Print Handler: Supports both single pass & multi-worker batch pass
async function handlePrintPass() {
    if (!currentWorker && selectedWorkers.length === 0) {
        const query = karigarInput.value.trim();
        if (query) {
            await executeSearch(query);
        }
    }

    if (!currentWorker && selectedWorkers.length === 0) {
        showToast('Please enter or select a Karigar before printing!', 'error');
        karigarInput.focus();
        return;
    }

    const chk = getChecklistVerification();
    const hasAnyTools = Boolean(chk.small_cutter || chk.scissor || chk.stool || chk.id_card);
    if (hasAnyTools && !chk.allChecked) {
        showToast(`ℹ️ ${chk.missing.length} સાધન જમા નથી - પ્રિન્ટમાં ખાલી [      ] રહેશે`, 'info');
    }

    document.body.classList.remove('print-report-mode');

    // Case 1: Multiple workers selected (Batch Gate Pass - pairs 2 per page)
    if (selectedWorkers.length > 1) {
        await handleBatchPrintPass();
        return;
    }

    // Case 2: Single worker
    await handleSavePass(false);
    window.print();
}



// Helper: Build page pairs for print & preview (2 passes per A4 page, vertically stacked)
function buildPagePairsHTML(slipsArray) {
    const pagePairs = [];
    const cutDivider = `
        <div class="print-cut-divider">
            <span>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
        </div>
    `;

    for (let i = 0; i < slipsArray.length; i += 2) {
        const pageNum = Math.floor(i / 2) + 1;
        const totalPages = Math.ceil(slipsArray.length / 2);
        const pageBadge = totalPages > 1 
            ? `<div class="preview-page-label">📄 PAGE ${pageNum} OF ${totalPages} (A4 SHEET - ૧ પેજમાં ૨ પાસ)</div>` 
            : '';

        if (i + 1 < slipsArray.length) {
            pagePairs.push(`
                <div class="print-page-pair">
                    ${pageBadge}
                    ${slipsArray[i]}
                    ${cutDivider}
                    ${slipsArray[i + 1]}
                </div>
            `);
        } else {
            pagePairs.push(`
                <div class="print-page-pair">
                    ${pageBadge}
                    ${slipsArray[i]}
                </div>
            `);
        }
    }
    return pagePairs.join('');
}

// Pair 2 slips per A4 sheet with cut line divider and print!
async function handleBatchPrintPass() {
    showToast(`Generating ${selectedWorkers.length} Gate Passes (2 passes per A4 page)...`, 'info');

    // Fetch next starting Int No.
    const targetDate = getFormattedDateDMY();
    const res = await fetch(`/api/next_int_no?date=${encodeURIComponent(targetDate)}`);
    const nextData = await res.json();
    let startNo = parseInt(nextData.next_int_no || '1', 10);

    const slipsHtmlArray = [];

    // Loop through selected workers and issue sequential passes
    for (let i = 0; i < selectedWorkers.length; i++) {
        const wSummary = selectedWorkers[i];
        let fullWorker = wSummary;
        try {
            const fullRes = await fetch(`/api/worker/${wSummary.id}`);
            if (fullRes.ok) fullWorker = await fullRes.json();
        } catch (e) {
            console.error('Worker fetch error:', e);
        }

        const currentIntNo = String(startNo + i).padStart(2, '0');
        const payload = getPassPayload(fullWorker, currentIntNo);

        // Save pass to DB/records
        try {
            await fetch('/api/issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error('Failed saving batch pass:', e);
        }

        slipsHtmlArray.push(renderSlipHTML(payload));
    }

    // Inject paired slips into passSheetContainer
    passSheetContainer.innerHTML = buildPagePairsHTML(slipsHtmlArray);

    // Trigger Print cleanly without destructive timeout
    setTimeout(() => {
        window.print();
        loadHistory();
        updateNextIntNo();
        showToast(`✅ ${selectedWorkers.length} ગેટ પાસ ૧ પેજમાં ૨ મુજબ પ્રિન્ટ થયા!`, 'success');
    }, 250);
}

// Print 2 Passes on 1 Single A4 Page (top half + bottom half)
async function handlePrint2On1() {
    if (!currentWorker && selectedWorkers.length === 0) {
        const query = karigarInput.value.trim();
        if (query) {
            await executeSearch(query);
        }
    }

    if (!currentWorker && selectedWorkers.length === 0) {
        showToast('Please enter or select a Karigar before printing!', 'error');
        karigarInput.focus();
        return;
    }

    // If 2 or more workers selected, batch print them (pairs 2 per page)
    if (selectedWorkers.length >= 2) {
        await handleBatchPrintPass();
        return;
    }

    // Single worker: duplicate pass to print 2 on 1 A4 sheet
    document.body.classList.remove('print-report-mode');
    await handleSavePass(false);

    const payload = getPassPayload();
    const slip1 = renderSlipHTML(payload);
    const slip2 = renderSlipHTML(payload);

    passSheetContainer.innerHTML = buildPagePairsHTML([slip1, slip2]);

    setTimeout(() => {
        window.print();
        loadHistory();
        updateNextIntNo();
        showToast('✅ ૧ પેજમાં ૨ પાસ સફળતાપૂર્વક પ્રિન્ટ થયા!', 'success');
    }, 250);
}

function renderSinglePassView() {
    if (!currentWorker) return;
    const payload = getPassPayload();
    passSheetContainer.innerHTML = renderSlipHTML(payload);
}

async function renderMultiPassView() {
    if (!passSheetContainer) return;

    if (selectedWorkers.length > 1) {
        const startNo = parseInt(intNo.value || '1', 10);
        const slips = [];

        for (let i = 0; i < selectedWorkers.length; i++) {
            const wSummary = selectedWorkers[i];
            let fullWorker = wSummary;
            if (!wSummary.photo_base64 && wSummary.id) {
                try {
                    const r = await fetch(`/api/worker/${wSummary.id}`);
                    if (r.ok) fullWorker = await r.json();
                } catch (e) {}
            }
            const currentIntNo = String(startNo + i).padStart(2, '0');
            const payload = getPassPayload(fullWorker, currentIntNo);
            slips.push(renderSlipHTML(payload));
        }

        passSheetContainer.innerHTML = buildPagePairsHTML(slips);
    } else if (currentWorker) {
        const payload = getPassPayload();
        const slip = renderSlipHTML(payload);
        passSheetContainer.innerHTML = buildPagePairsHTML([slip, slip]);
    }
}

async function handleSavePass(showNotification = true) {
    if (!currentWorker) {
        if (showNotification) showToast('Please select a Karigar first!', 'error');
        return;
    }

    const payload = getPassPayload();

    try {
        const res = await fetch('/api/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            if (showNotification) {
                showToast(`Gate Pass #${payload.int_no} for ${payload.code} saved!`, 'success');
            }
            loadHistory();
            loadMasterReport(false);
            if (!isReprintMode) {
                await updateNextIntNo();
            }
        }
    } catch (err) {
        console.error('Save error:', err);
    }
}

async function handleDownloadExcel() {
    if (!currentWorker) {
        showToast('Please select a Karigar first!', 'error');
        return;
    }

    const payload = getPassPayload();
    showToast('Generating official Excel Gate Pass...', 'info');

    try {
        const res = await fetch('/api/excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Excel download failed');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OSLC_GATEPASS_${payload.code}_${payload.date.replace(/\//g, '-')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('Excel Gate Pass downloaded!', 'success');
    } catch (err) {
        console.error('Download error:', err);
        showToast('Failed to download Excel file', 'error');
    }
}

// ==========================================
// HISTORY & RECENT PASSES
// ==========================================
async function updateNextIntNo() {
    try {
        const targetDate = getFormattedDateDMY();
        const res = await fetch(`/api/next_int_no?date=${encodeURIComponent(targetDate)}`);
        const data = await res.json();
        if (data && data.next_int_no) {
            intNo.value = data.next_int_no;
            if (previewIntNo) previewIntNo.textContent = data.next_int_no;
        }
    } catch (err) {
        console.warn('Could not fetch next Int No:', err);
    }
}

async function loadHistory() {
    try {
        const targetDate = getFormattedDateDMY();
        const res = await fetch(`/api/history?date=${encodeURIComponent(targetDate)}`);
        const data = await res.json();
        const records = data.records || [];
        renderHistoryTable(records);
    } catch (err) {
        console.error('Error loading history:', err);
    }
}

function renderHistoryTable(records) {
    if (historyCountBadge) historyCountBadge.textContent = `${records.length} Passes`;
    if (tabReportCountBadge) tabReportCountBadge.textContent = records.length;

    if (!records.length) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-dim); padding: 18px;">
                    No gate passes issued yet for this date.
                </td>
            </tr>
        `;
        return;
    }

    historyTableBody.innerHTML = records.map(r => {
        const chk = r.checklist || {};
        const returnedCount = [chk.small_cutter, chk.scissor, chk.stool, chk.id_card].filter(Boolean).length;
        const mallTag = r.has_pending_mall
            ? `<span class="tag-mall-warning">⚠️ ${r.total_pending_pcs} Pcs</span>`
            : `<span class="tag-mall-clear">✅ Clear</span>`;

        return `
            <tr>
                <td><strong>#${r.int_no}</strong></td>
                <td>${r.out_time || '--:--'}</td>
                <td><span class="tag-code">${r.code}</span></td>
                <td>${r.name}</td>
                <td>${r.department || 'KARIGAR'}</td>
                <td><span class="tag-tools ${returnedCount === 4 ? 'full' : 'partial'}">${returnedCount}/4 Tools</span></td>
                <td>${mallTag}</td>
                <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn-reprint-row" onclick="triggerReprint('${r.pass_id}', '${r.int_no}', '${r.code}')" title="Reprint without changing Int No.">
                            <span>🔁 Reprint</span>
                        </button>
                        <button class="btn-delete-row" onclick="deleteGatePass('${r.pass_id}')" title="Delete pass to allow fresh reprint">
                            <span>🗑️</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Global functions for inline actions
window.triggerReprint = async function(passId, originalIntNo, workerCode) {
    try {
        const res = await fetch('/api/reprint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pass_id: passId, int_no: originalIntNo, code: workerCode })
        });
        const data = await res.json();
        if (data.success) {
            isReprintMode = true;
            activeReprintIntNo = originalIntNo;
            intNo.value = originalIntNo;
            if (previewIntNo) previewIntNo.textContent = originalIntNo;
            if (previewReprintBadge) previewReprintBadge.style.display = 'inline-block';

            showToast(`Reprinting Gate Pass #${originalIntNo}! Original Int No preserved.`, 'info');
            switchTab('entry');
            await executeSearch(workerCode);
            setTimeout(() => {
                window.print();
            }, 500);
        }
    } catch (err) {
        showToast('Reprint failed: ' + err.message, 'error');
    }
};

window.deleteGatePass = async function(passId) {
    if (!confirm('Are you sure you want to delete this gate pass?')) return;
    try {
        const res = await fetch(`/api/delete/${encodeURIComponent(passId)}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('Gate pass deleted! You can now issue a new entry.', 'success');
            loadHistory();
            loadMasterReport(false);
            updateNextIntNo();
        }
    } catch (err) {
        showToast('Failed to delete pass: ' + err.message, 'error');
    }
};

// ==========================================
// MASTER REPORT TAB FUNCTIONS
// ==========================================
async function loadMasterReport(showLoadingToast = false) {
    if (showLoadingToast) showToast('Searching records...', 'info');

    const params = new URLSearchParams();
    if (rptFilterDate && rptFilterDate.value) params.append('date', getFormattedDateDMY(rptFilterDate.value));
    if (rptFilterFrom && rptFilterFrom.value) params.append('from_date', getFormattedDateDMY(rptFilterFrom.value));
    if (rptFilterTo && rptFilterTo.value) params.append('to_date', getFormattedDateDMY(rptFilterTo.value));
    if (rptFilterSearch && rptFilterSearch.value.trim()) params.append('search', rptFilterSearch.value.trim());

    try {
        const res = await fetch(`/api/history?${params.toString()}`);
        const data = await res.json();
        let records = data.records || [];

        // Apply mall filter in memory
        const mallFilter = rptFilterMall ? rptFilterMall.value : 'ALL';
        if (mallFilter === 'WITH_MALL') {
            records = records.filter(r => r.has_pending_mall);
        } else if (mallFilter === 'CLEAR') {
            records = records.filter(r => !r.has_pending_mall);
        }

        renderMasterReportTable(records);
        updateReportKPIs(records);
    } catch (err) {
        console.error('Master report error:', err);
    }
}

function renderMasterReportTable(records) {
    if (rptTableCountText) rptTableCountText.textContent = `Showing ${records.length} Records`;

    if (!records.length) {
        rptTableBody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; color: var(--text-dim); padding: 30px;">
                    No records found matching your filters.
                </td>
            </tr>
        `;
        return;
    }

    rptTableBody.innerHTML = records.map((r, idx) => {
        const chk = r.checklist || {};
        const returnedCount = [chk.small_cutter, chk.scissor, chk.stool, chk.id_card].filter(Boolean).length;
        const isRep = r.is_reprint || (r.reprint_count && r.reprint_count > 0);

        return `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>#${r.int_no}</strong></td>
                <td>${r.date}</td>
                <td>${r.out_time || '--:--'}</td>
                <td><span class="tag-code">${r.code}</span></td>
                <td><strong>${r.name}</strong></td>
                <td>${r.department || 'KARIGAR'}</td>
                <td>${r.floor || '3RD FLOOR'}</td>
                <td><span class="tag-tools ${returnedCount === 4 ? 'full' : 'partial'}">${returnedCount}/4 Tools</span></td>
                <td>
                    ${r.has_pending_mall 
                        ? `<span class="tag-mall-warning">⚠️ ${r.total_pending_pcs} Pcs (${r.pending_items_count || 0} Lots)</span>` 
                        : `<span class="tag-mall-clear">✅ Clear (0 Pcs)</span>`}
                </td>
                <td>
                    ${isRep ? `<span class="badge-reprint">🔁 REPRINT (${r.reprint_count || 1})</span>` : '<span class="badge-original">ORIGINAL</span>'}
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn-reprint-row" onclick="triggerReprint('${r.pass_id}', '${r.int_no}', '${r.code}')">
                            <span>🔁 Reprint</span>
                        </button>
                        <button class="btn-delete-row" onclick="deleteGatePass('${r.pass_id}')">
                            <span>🗑️</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateReportKPIs(records) {
    const total = records.length;
    const withMall = records.filter(r => r.has_pending_mall).length;
    const clear = records.filter(r => !r.has_pending_mall).length;
    const reprints = records.filter(r => r.is_reprint || (r.reprint_count && r.reprint_count > 0)).length;

    if (rptStatTotalPasses) rptStatTotalPasses.textContent = total;
    if (rptStatPendingMallPasses) rptStatPendingMallPasses.textContent = withMall;
    if (rptStatClearPasses) rptStatClearPasses.textContent = clear;
    if (rptStatReprintCount) rptStatReprintCount.textContent = reprints;
}

function resetReportFilters() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    rptFilterDate.value = `${yyyy}-${mm}-${dd}`;
    rptFilterFrom.value = '';
    rptFilterTo.value = '';
    rptFilterSearch.value = '';
    rptFilterMall.value = 'ALL';
    document.querySelectorAll('.rpt-chip').forEach(c => c.classList.remove('active'));
    loadMasterReport();
    showToast('Filters reset to today!', 'info');
}

function handleQuickDateFilter(filterType) {
    const today = new Date();
    const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    rptFilterFrom.value = '';
    rptFilterTo.value = '';

    if (filterType === 'today') {
        rptFilterDate.value = formatDate(today);
    } else if (filterType === 'yesterday') {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        rptFilterDate.value = formatDate(yest);
    } else if (filterType === 'this_week') {
        rptFilterDate.value = '';
        const dayOfWeek = today.getDay();
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        rptFilterFrom.value = formatDate(firstDay);
        rptFilterTo.value = formatDate(today);
    } else if (filterType === 'this_month') {
        rptFilterDate.value = '';
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        rptFilterFrom.value = formatDate(firstDay);
        rptFilterTo.value = formatDate(today);
    } else if (filterType === 'all') {
        rptFilterDate.value = '';
        rptFilterFrom.value = '';
        rptFilterTo.value = '';
    }

    loadMasterReport();
}

function handleExportReportExcel() {
    const params = new URLSearchParams();
    if (rptFilterDate.value) params.append('date', getFormattedDateDMY(rptFilterDate.value));
    if (rptFilterFrom.value) params.append('from_date', getFormattedDateDMY(rptFilterFrom.value));
    if (rptFilterTo.value) params.append('to_date', getFormattedDateDMY(rptFilterTo.value));
    if (rptFilterSearch.value.trim()) params.append('search', rptFilterSearch.value.trim());

    showToast('Exporting Gate Pass Register Excel...', 'info');
    window.location.href = `/api/export_register?${params.toString()}`;
}

function handlePrintReportRegister() {
    document.body.classList.add('print-report-mode');
    window.print();
    setTimeout(() => {
        document.body.classList.remove('print-report-mode');
    }, 500);
}


