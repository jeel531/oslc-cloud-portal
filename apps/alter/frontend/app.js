// Om Sai Latest Creation - Karigar Alter & Stitching Report Engine
// Multilingual Frontend Controller (Gujarati, Hindi, English)

let currentData = null;
let currentFloor = "ALL";
let currentViewMode = "karigar";
let currentLang = localStorage.getItem("oslc_language") || "gu";
let currentTheme = localStorage.getItem("oslc_theme") || "dark";

// Internationalization Dictionary (Gujarati, Hindi, English)
const I18N = {
  gu: {
    brand_subtitle: "કારીગર ઓલ્ટર અને સ્ટીચિંગ રિસીવ રિપોર્ટ",
    refresh: "રિફ્રેશ",
    refresh_title: "ડેટા તાજો કરો",
    export_excel: "Excel ડાઉનલોડ",
    export_excel_title: "બધા શીટ સાથે Excel ફાઇલ ડાઉનલોડ કરો",
    exporting_excel: "Excel ડાઉનલોડ થઈ રહી છે...",
    lang_title: "ભાષા પસંદ કરો / भाषा चुनें / Select Language",
    period: "સમયગાળો:",
    label_days: "દિવસો (Days):",
    preset_today: "આજે (Today)",
    preset_yesterday: "ગઈકાલે (Yesterday)",
    preset_5days: "5 Days",
    preset_last7: "7 Days",
    preset_10days: "10 Days",
    preset_15days: "15 Days",
    preset_20days: "20 Days",
    preset_25days: "25 Days",
    preset_30days: "30 Days",
    label_months: "મહિના (Months):",
    preset_this_month: "આ મહિનો (This Month)",
    preset_last_month: "ગયો મહિનો (Last Month)",
    preset_next_month: "Next Month (આગામી મહિનો)",
    preset_next_2months: "Next 2 Months (૨ મહિના)",
    label_years: "વર્ષ (Years):",
    preset_year_2025: "2025",
    preset_year_2026: "2026",
    preset_all: "આખું વર્ષ (All Time)",
    from_date: "તારીખ થી:",
    to_date: "સુધી:",
    alter_mode: "ઓલ્ટર પ્રકાર:",
    opt_alter_issue: "Alter Issue (કારીગર ઇશ્યુ - સ્ટાન્ડર્ડ)",
    opt_alter_receive: "Alter Receive (રીસીવ)",
    opt_alter_both: "બંને (Issue + Receive)",
    apply_filter: "લાગુ કરો",

    // KPI Cards
    kpi_sti_title: "કુલ STR (Stitching Receive Pcs)",
    kpi_sti_sub: "ડિઝાઈન (Designs)",
    kpi_alt_title: "કુલ ઓલ્ટર (Alter Pcs)",
    kpi_alt_sub: "ઓલ્ટર ડિઝાઈન",
    kpi_pct_title: "ઓલ્ટર ટકાવારી (Alter %)",
    kpi_total_title: "કુલ પીસ (Total Pcs)",
    kpi_total_sub: "સ્ટીચિંગ + ઓલ્ટર એકંદર",
    kpi_karigars_title: "સક્રિય કારીગરો (Karigars)",
    kpi_karigars_sub: "કુલ કામદાર / દરજી",

    // Ratings & Badges
    rating_excellent: "● ઉત્કૃષ્ટ પરિણામ (< 4%)",
    rating_normal: "● સામાન્ય ઓલ્ટર (4-8%)",
    rating_high: "● ધ્યાન આપો - વધુ ઓલ્ટર (> 8%)",
    badge_excellent: "ઉત્કૃષ્ટ",
    badge_normal: "સામાન્ય",
    badge_high: "વધુ ઓલ્ટર",
    badge_ok: "ઓકે",

    // Views
    view_karigar: "કારીગર-વાઇઝ રિપોર્ટ (Karigar Report)",
    view_lineman: "લાઇનમેન ઓલ્ટર રેન્કિંગ (Lineman Alter Ranking)",
    view_comparison: "૨ સમયગાળા સરખામણી રિપોર્ટ (2-Period Comparison)",
    view_alter_checking: "ઓલ્ટર ચેકિંગ (Alter Checking)",
    opt_rep_alter_checking: "4. 🔍 ઓલ્ટર ચેકિંગ (Alter Checking - DB Alter)",
    alter_checking_title: "ઓલ્ટર ચેકિંગ સરખામણી રિપોર્ટ (Alter Checking Report)",
    top5_alter_checking_title: "🏆 પેજ ૪: ટોપ ૧ થી ૫ ઓલ્ટર ચેકિંગ કારીગરો (Top 1 to 5 Tailors Ranking)",
    btn_export_alter_checking_excel: "એક્સેલ ડાઉનલોડ (Export Excel)",
    chk_loading: "ઓલ્ટર ચેકિંગ ડેટા લોડ થઈ રહ્યો છે...",
    cmp_p1_title: "પિરિયડ ૧ (Period 1)",
    cmp_p1_sub: "જેમ કે ૬૦ કે ૩૦ દિવસ (e.g. Last 60 or 30 Days)",
    cmp_p2_title: "પિરિયડ ૨ (Period 2)",
    cmp_p2_sub: "જેમ કે ૧૫ કે ૭ દિવસ (e.g. Last 15 or 7 Days)",
    btn_compare: "સરખામણી લોડ કરો (Compare)",
    btn_export_comparison_excel: "એક્સેલ ડાઉનલોડ (Export Excel)",
    cmp_loading: "બે સમયગાળાનો સરખામણી ડેટા લોડ થઈ રહ્યો છે...",

    // Floor Tabs
    tab_all: "બધા (ALL)",
    tab_mix: "MIX / OTHER",

    // Table
    table_title: "કારીગર-વાઈઝ સમરી ટેબલ",
    search_placeholder: "કારીગર નામ, કોડ, ફ્લોર શોધો...",
    record_count_suffix: "કારીગરો",
    th_num: "#",
    th_employee: "EMPLOYEE (કોડ : નામ)",
    th_floor: "FLOOR / LINE MAN",
    th_str_group: "STR (STITCHING RECEIVE)",
    th_alter_group: "ALTER (ઓલ્ટર)",
    th_details: "વિગત",
    th_str_designs: "STR DESIGN COUNT",
    th_str_qty: "STR QTY (PCS.)",
    th_alt_designs: "ALTER DESIGN COUNT",
    th_alt_qty: "ALTER QTY (PCS.)",
    th_alt_pct: "ALTER %",
    btn_view: "જુઓ",
    total_label: "કુલ સરવાળો",
    all_floors: "બધા ફ્લોર",
    no_records: "કોઈ પરિણામ મળ્યું નથી.",
    loading_data: "DigiBizz માંથી કારીગર ડેટા લોડ થઈ રહ્યો છે... કૃપા કરી થોડી રાહ જુઓ.",
    connection_failed: "કનેક્શન નિષ્ફળ:",
    error_prefix: "ભૂલ:",

    // Lineman View
    alert_highest_alter: "સૌથી વધુ ઓલ્ટર:",
    alert_in_floor: "માં છે!",
    alert_lineman_desc: "આ લાઇનમેન પાસે કુલ <strong>{qty} પીસ ઓલ્ટર</strong> આવ્યા છે. સૌથી વધુ ઓલ્ટર વાળો દરજી: <strong>{karigar}</strong>",
    alert_rank_badge: "સૌથી વધુ ઓલ્ટર",
    lineman_perf_title: "લાઇનમેન પરફોર્મન્સ અને ઓલ્ટર રેન્કિંગ (Worst to Best)",
    lineman_table_title: "લાઇનમેન-વાઇઝ ઓલ્ટર કમ્પેરિઝન ટેબલ",
    th_rank: "રેન્ક",
    th_total_karigars: "કુલ કારીગરો",
    th_total_pieces: "TOTAL PIECES",
    th_high_alter_tailors: "હાઈ ઓલ્ટર દરજી (> 5%)",
    th_worst_karigar: "સૌથી વધુ ઓલ્ટર વાળો કારીગર",
    th_action: "એક્શન",
    btn_view_floor_tailors: "આ લાઇનમેનના કારીગરો જુઓ",
    btn_view_karigars: "કારીગરો જુઓ",
    top15_title: "⚠️ સમગ્ર ફેક્ટરીમાં સૌથી વધુ ઓલ્ટર વાળા ટોપ 15 કારીગરો (Top High Alter Tailors)",
    badge_attention: "ધ્યાન આપવા જેવું",
    active_workers_suffix: "કારીગરો કાર્યરત",
    tailor_unit: "દરજી",

    // Modal
    modal_title: "કારીગર વિગત",
    modal_fetching: "ડેટા મેળવી રહ્યાં છીએ...",
    modal_kpi_sti: "STR (Receive) Pcs",
    modal_kpi_alt: "Alter Pcs",
    modal_kpi_total: "Total Pieces",
    modal_kpi_pct: "Alter %",
    modal_designs_title: "ડિઝાઇન-વાઇઝ ઓલ્ટર બ્રેકડાઉન (Lots & Sizes)",
    th_design: "ડિઝાઇન (SKU / ITEM)",
    th_lots: "લોટ નંબર્સ (Lots)",
    th_sizes: "સાઇઝ (Sizes)",
    th_modal_total: "TOTAL",
    total_designs_prefix: "કુલ",
    total_designs_suffix: "ડિઝાઈન",
    no_designs: "કોઈ ડિઝાઈન મળી નથી."
  },

  hi: {
    brand_subtitle: "कारीगर अल्टर और सिलाई (STR) रिसीव रिपोर्ट",
    refresh: "रिफ्रेश",
    refresh_title: "डेटा ताज़ा करें",
    export_excel: "Excel डाउनलोड",
    export_excel_title: "सभी शीट के साथ Excel फ़ाइल डाउनलोड करें",
    exporting_excel: "Excel डाउनलोड हो रहा है...",
    lang_title: "ભાષા પસંદ કરો / भाषा चुनें / Select Language",
    period: "समयावधि:",
    label_days: "दिन (Days):",
    preset_today: "आज (Today)",
    preset_yesterday: "कल (Yesterday)",
    preset_5days: "5 Days",
    preset_last7: "7 Days",
    preset_10days: "10 Days",
    preset_15days: "15 Days",
    preset_20days: "20 Days",
    preset_25days: "25 Days",
    preset_30days: "30 Days",
    label_months: "महीने (Months):",
    preset_this_month: "इस महीने (This Month)",
    preset_last_month: "पिछला महीना (Last Month)",
    preset_next_month: "Next Month (अगला महीना)",
    preset_next_2months: "Next 2 Months (२ महीने)",
    label_years: "वर्ष (Years):",
    preset_year_2025: "2025",
    preset_year_2026: "2026",
    preset_all: "पूरा वर्ष (All Time)",
    from_date: "दिनांक से:",
    to_date: "तक:",
    alter_mode: "अल्टर प्रकार:",
    opt_alter_issue: "Alter Issue (कारीगर इश्यू - स्टैंडर्ड)",
    opt_alter_receive: "Alter Receive (रिसीव)",
    opt_alter_both: "दोनों (Issue + Receive)",
    apply_filter: "लागू करें",

    // KPI Cards
    kpi_sti_title: "कुल STR (Stitching Receive Pcs)",
    kpi_sti_sub: "डिज़ाइन (Designs)",
    kpi_alt_title: "कुल अल्टर (Alter Pcs)",
    kpi_alt_sub: "अल्टर डिज़ाइन",
    kpi_pct_title: "अल्टर प्रतिशत (Alter %)",
    kpi_total_title: "कुल पीस (Total Pcs)",
    kpi_total_sub: "सिलाई + अल्टर कुल",
    kpi_karigars_title: "सक्रिय कारीगर (Karigars)",
    kpi_karigars_sub: "कुल कामगार / दर्जी",

    // Ratings & Badges
    rating_excellent: "● उत्कृष्ट परिणाम (< 4%)",
    rating_normal: "● सामान्य अल्टर (4-8%)",
    rating_high: "● ध्यान दें - अधिक अल्टर (> 8%)",
    badge_excellent: "उत्कृष्ट",
    badge_normal: "सामान्य",
    badge_high: "अधिक अल्टर",
    badge_ok: "ठीक",

    // Views
    view_karigar: "कारीगर-वाइज़ रिपोर्ट (Karigar Report)",
    view_lineman: "लाइनमैन अल्टर रैंकिंग (Lineman Alter Ranking)",
    view_comparison: "२ अवधि तुलना रिपोर्ट (2-Period Comparison)",
    view_alter_checking: "ऑल्टर चेकिंग (Alter Checking)",
    opt_rep_alter_checking: "4. 🔍 ऑल्टर चेकिंग (Alter Checking - DB Alter)",
    alter_checking_title: "ऑल्टर चेकिंग तुलना रिपोर्ट (Alter Checking Report)",
    top5_alter_checking_title: "🏆 पेज ४: टॉप १ से ५ ऑल्टर चेकिंग कारीगर (Top 1 to 5 Tailors Ranking)",
    btn_export_alter_checking_excel: "एक्सेल डाउनलोड (Export Excel)",
    chk_loading: "ऑल्टर चेकिंग डेटा लोड हो रहा है...",
    cmp_p1_title: "अवधि १ (Period 1)",
    cmp_p1_sub: "जैसे ६० या ३० दिन (e.g. Last 60 or 30 Days)",
    cmp_p2_title: "अवधि २ (Period 2)",
    cmp_p2_sub: "जैसे १५ या ७ दिन (e.g. Last 15 or 7 Days)",
    btn_compare: "तुलना लोड करें (Compare)",
    btn_export_comparison_excel: "एक्सेल डाउनलोड (Export Excel)",
    cmp_loading: "दो अवधियों का तुलना डेटा लोड हो रहा है...",

    // Floor Tabs
    tab_all: "सभी (ALL)",
    tab_mix: "MIX / OTHER",

    // Table
    table_title: "कारीगर-वाइज़ समरी टेबल",
    search_placeholder: "कारीगर नाम, कोड, फ्लोर खोजें...",
    record_count_suffix: "कारीगर",
    th_num: "#",
    th_employee: "EMPLOYEE (कोड : नाम)",
    th_floor: "FLOOR / LINE MAN",
    th_str_group: "STR (STITCHING RECEIVE)",
    th_alter_group: "ALTER (अल्टर)",
    th_details: "विवरण",
    th_str_designs: "STR DESIGN COUNT",
    th_str_qty: "STR QTY (PCS.)",
    th_alt_designs: "ALTER DESIGN COUNT",
    th_alt_qty: "ALTER QTY (PCS.)",
    th_alt_pct: "ALTER %",
    btn_view: "देखें",
    total_label: "कुल योग",
    all_floors: "सभी फ्लोर",
    no_records: "कोई रिकॉर्ड नहीं मिला।",
    loading_data: "DigiBizz से कारीगर डेटा लोड हो रहा है... कृपया प्रतीक्षा करें।",
    connection_failed: "कनेक्शन विफल:",
    error_prefix: "त्रुटि:",

    // Lineman View
    alert_highest_alter: "सबसे अधिक अल्टर:",
    alert_in_floor: "में है!",
    alert_lineman_desc: "इस लाइनमैन के पास कुल <strong>{qty} पीस अल्टर</strong> आए हैं। सबसे अधिक अल्टर वाला दर्जी: <strong>{karigar}</strong>",
    alert_rank_badge: "सबसे अधिक अल्टर",
    lineman_perf_title: "लाइनमैन प्रदर्शन और अल्टर रैंकिंग (Worst to Best)",
    lineman_table_title: "लाइनमैन-वाइज़ अल्टर तुलना टेबल",
    th_rank: "रैंक",
    th_total_karigars: "कुल कारीगर",
    th_total_pieces: "TOTAL PIECES",
    th_high_alter_tailors: "हाई अल्टर दर्जी (> 5%)",
    th_worst_karigar: "सबसे अधिक अल्टर वाला कारीगर",
    th_action: "एक्शन",
    btn_view_floor_tailors: "इस लाइनमैन के कारीगर देखें",
    btn_view_karigars: "कारीगर देखें",
    top15_title: "⚠️ पूरे कारखाने में सबसे अधिक अल्टर वाले टॉप 15 कारीगर (Top High Alter Tailors)",
    badge_attention: "ध्यान देने योग्य",
    active_workers_suffix: "कारीगर कार्यरत",
    tailor_unit: "दर्जी",

    // Modal
    modal_title: "कारीगर विवरण",
    modal_fetching: "डेटा प्राप्त कर रहे हैं...",
    modal_kpi_sti: "STR (Receive) Pcs",
    modal_kpi_alt: "Alter Pcs",
    modal_kpi_total: "Total Pieces",
    modal_kpi_pct: "Alter %",
    modal_designs_title: "डिज़ाइन-वाइज़ अल्टर विवरण (Lots & Sizes)",
    th_design: "डिज़ाइन (SKU / ITEM)",
    th_lots: "लॉट नंबर्स (Lots)",
    th_sizes: "साइज़ (Sizes)",
    th_modal_total: "TOTAL",
    total_designs_prefix: "कुल",
    total_designs_suffix: "डिज़ाइन",
    no_designs: "कोई डिज़ाइन नहीं मिली।"
  },

  en: {
    brand_subtitle: "Karigar Alter & Stitching Receive Report",
    refresh: "Refresh",
    refresh_title: "Refresh Data",
    export_excel: "Export Excel",
    export_excel_title: "Download Excel file with all sheets",
    exporting_excel: "Exporting Excel...",
    lang_title: "Select Language / ભાષા પસંદ કરો / भाषा चुनें",
    period: "Period:",
    label_days: "Days:",
    preset_today: "Today",
    preset_yesterday: "Yesterday",
    preset_5days: "5 Days",
    preset_last7: "7 Days",
    preset_10days: "10 Days",
    preset_15days: "15 Days",
    preset_20days: "20 Days",
    preset_25days: "25 Days",
    preset_30days: "30 Days",
    label_months: "Months:",
    preset_this_month: "This Month",
    preset_last_month: "Last Month",
    preset_next_month: "Next Month",
    preset_next_2months: "Next 2 Months",
    label_years: "Years:",
    preset_year_2025: "2025",
    preset_year_2026: "2026",
    preset_all: "All Time",
    from_date: "From Date:",
    to_date: "To Date:",
    alter_mode: "Alter Mode:",
    opt_alter_issue: "Alter Issue (Karigar Issue - Standard)",
    opt_alter_receive: "Alter Receive (Received)",
    opt_alter_both: "Both (Issue + Receive)",
    apply_filter: "Apply Filter",

    // KPI Cards
    kpi_sti_title: "Total STR (Stitching Receive Pcs)",
    kpi_sti_sub: "Designs",
    kpi_alt_title: "Total Alter (Pcs)",
    kpi_alt_sub: "Alter Designs",
    kpi_pct_title: "Alter Percentage (Alter %)",
    kpi_total_title: "Total Pieces (Total Pcs)",
    kpi_total_sub: "Stitching + Alter Combined",
    kpi_karigars_title: "Active Karigars / Tailors",
    kpi_karigars_sub: "Total Workers / Tailors",

    // Ratings & Badges
    rating_excellent: "● Excellent Result (< 4%)",
    rating_normal: "● Normal Alter (4-8%)",
    rating_high: "● Attention - High Alter (> 8%)",
    badge_excellent: "Excellent",
    badge_normal: "Normal",
    badge_high: "High Alter",
    badge_ok: "OK",

    // Views
    view_karigar: "Karigar-wise Report",
    view_lineman: "Lineman Alter Ranking",
    view_comparison: "2-Period Comparison Report",
    view_alter_checking: "Alter Checking Report",
    opt_rep_alter_checking: "4. 🔍 Alter Checking Report (DB Alter)",
    alter_checking_title: "Alter Checking Comparison Report",
    top5_alter_checking_title: "🏆 Page 4: Top 1 to 5 Alter Checking Tailors Ranking",
    btn_export_alter_checking_excel: "Export Excel",
    chk_loading: "Loading alter checking comparison data...",
    cmp_p1_title: "Period 1",
    cmp_p1_sub: "e.g. Last 60 or 30 Days",
    cmp_p2_title: "Period 2",
    cmp_p2_sub: "e.g. Last 15 or 7 Days",
    btn_compare: "Load Comparison",
    btn_export_comparison_excel: "Export Excel",
    cmp_loading: "Loading 2-period comparison data...",

    // Floor Tabs
    tab_all: "ALL",
    tab_mix: "MIX / OTHER",

    // Table
    table_title: "Karigar-wise Summary Table",
    search_placeholder: "Search karigar name, code, floor...",
    record_count_suffix: "Karigars",
    th_num: "#",
    th_employee: "EMPLOYEE (Code : Name)",
    th_floor: "FLOOR / LINE MAN",
    th_str_group: "STR (STITCHING RECEIVE)",
    th_alter_group: "ALTER",
    th_details: "Details",
    th_str_designs: "STR DESIGN COUNT",
    th_str_qty: "STR QTY (PCS.)",
    th_alt_designs: "ALTER DESIGN COUNT",
    th_alt_qty: "ALTER QTY (PCS.)",
    th_alt_pct: "ALTER %",
    btn_view: "View",
    total_label: "Grand Total",
    all_floors: "All Floors",
    no_records: "No records found.",
    loading_data: "Loading Karigar data from DigiBizz... Please wait.",
    connection_failed: "Connection failed:",
    error_prefix: "Error:",

    // Lineman View
    alert_highest_alter: "Highest Alter:",
    alert_in_floor: "has the highest alter!",
    alert_lineman_desc: "This lineman received <strong>{qty} pcs alter</strong>. Top alter tailor: <strong>{karigar}</strong>",
    alert_rank_badge: "HIGHEST ALTER",
    lineman_perf_title: "Lineman Performance & Alter Ranking (Worst to Best)",
    lineman_table_title: "Lineman-wise Alter Comparison Table",
    th_rank: "Rank",
    th_total_karigars: "Total Karigars",
    th_total_pieces: "TOTAL PIECES",
    th_high_alter_tailors: "High Alter Tailors (> 5%)",
    th_worst_karigar: "Top Alter Tailor",
    th_action: "Action",
    btn_view_floor_tailors: "View Lineman's Tailors",
    btn_view_karigars: "View Tailors",
    top15_title: "⚠️ Top 15 High Alter Tailors in Factory",
    badge_attention: "Needs Attention",
    active_workers_suffix: "Karigars Active",
    tailor_unit: "Tailors",

    // Modal
    modal_title: "Karigar Details",
    modal_fetching: "Fetching details...",
    modal_kpi_sti: "STR (Receive) Pcs",
    modal_kpi_alt: "Alter Pcs",
    modal_kpi_total: "Total Pieces",
    modal_kpi_pct: "Alter %",
    modal_designs_title: "Design-wise Alter Breakdown (Lots & Sizes)",
    th_design: "Design (SKU / ITEM)",
    th_lots: "Lot Numbers (Lots)",
    th_sizes: "Sizes",
    th_modal_total: "TOTAL",
    total_designs_prefix: "Total",
    total_designs_suffix: "Designs",
    no_designs: "No designs found."
  }
};

// Helper: Translation fetcher with Gujarati fallback
function t(key, fallback = "") {
  if (I18N[currentLang] && I18N[currentLang][key] !== undefined) {
    return I18N[currentLang][key];
  }
  if (I18N["gu"] && I18N["gu"][key] !== undefined) {
    return I18N["gu"][key];
  }
  return fallback || key;
}

// Function to switch and persist language
function setLanguage(lang) {
  if (!I18N[lang]) lang = "gu";
  currentLang = lang;
  try {
    localStorage.setItem("oslc_language", lang);
  } catch (e) {}

  document.documentElement.lang = lang;

  // Toggle active class on lang buttons
  document.querySelectorAll("#langSwitcher .lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // Apply to all elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const val = t(key);
    if (val) el.innerHTML = val;
  });

  // Apply to elements with data-i18n-placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    const val = t(key);
    if (val) el.placeholder = val;
  });

  // Apply to elements with data-i18n-title
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    const val = t(key);
    if (val) el.title = val;
  });

  // Re-render UI elements if data is loaded
  if (currentData) {
    updateKPIs(currentData);
    if (currentViewMode === "lineman") {
      renderLinemanView();
    } else {
      renderTable();
    }
  }
}

// Dark / Light Mode Switcher
function applyTheme(theme) {
  if (theme !== "light") theme = "dark";
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  if (theme === "light") {
    document.body.classList.remove("luxury-theme");
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
    document.body.classList.add("luxury-theme");
  }
  try {
    localStorage.setItem("oslc_theme", theme);
  } catch (e) {}

  const themeIcon = document.getElementById("themeIcon");
  const themeLabel = document.getElementById("themeLabel");
  if (themeIcon) themeIcon.innerText = theme === "light" ? "☀️" : "🌙";
  if (themeLabel) themeLabel.innerText = theme === "light" ? "Light" : "Dark";
}

function toggleTheme() {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(currentTheme);
  initDatePresets();
  initComparisonPresets();
  setupEventListeners();
  setLanguage(currentLang);
  init3DTilt();
  loadData();
});

function init3DTilt() {
  try {
    document.querySelectorAll(".tilt-card-3d, .lineman-card, .creator-signature-card").forEach(card => {
      if (card._tiltInitialized) return;
      card._tiltInitialized = true;

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02) translateY(-4px)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateY(0px)";
      });
    });
  } catch (err) {
    console.warn("Tilt error ignored:", err);
  }
}

function formatNumber(num) {
  if (num === null || num === undefined) return "0";
  return Number(num).toLocaleString("en-IN");
}

function formatPercent(pct) {
  if (pct === null || pct === undefined) return "0.00%";
  return Number(pct).toFixed(2) + "%";
}

function formatDmy(isoDateStr) {
  if (!isoDateStr) return "";
  const parts = String(isoDateStr).trim().split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoDateStr;
}

function getDaysCount(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  try {
    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffTime / (24 * 60 * 60 * 1000)) + 1;
  } catch (e) {
    return 0;
  }
}

function getRatingBadge(alterPct) {
  if (alterPct <= 4.0) {
    return `<span class="pct-badge pct-green">${formatPercent(alterPct)} (${t("badge_excellent")})</span>`;
  } else if (alterPct <= 8.0) {
    return `<span class="pct-badge pct-yellow">${formatPercent(alterPct)} (${t("badge_normal")})</span>`;
  } else {
    return `<span class="pct-badge pct-red">${formatPercent(alterPct)} (${t("badge_high")})</span>`;
  }
}

function initDatePresets() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const todayStr = `${yyyy}-${mm}-${dd}`;
  const firstDayStr = `${yyyy}-${mm}-01`;

  document.getElementById("fromDate").value = firstDayStr;
  document.getElementById("toDate").value = todayStr;
}

function setPreset(presetName) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  let start = todayStr;
  let end = todayStr;

  if (presetName === "today") {
    start = todayStr;
    end = todayStr;
  } else if (presetName === "yesterday") {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const y_mm = String(yest.getMonth() + 1).padStart(2, "0");
    const y_dd = String(yest.getDate()).padStart(2, "0");
    start = `${yest.getFullYear()}-${y_mm}-${y_dd}`;
    end = start;
  } else if (presetName === "5days") {
    const d5 = new Date(today);
    d5.setDate(d5.getDate() - 5);
    start = `${d5.getFullYear()}-${String(d5.getMonth() + 1).padStart(2, "0")}-${String(d5.getDate()).padStart(2, "0")}`;
    end = todayStr;
  } else if (presetName === "last7") {
    const d7 = new Date(today);
    d7.setDate(d7.getDate() - 7);
    start = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, "0")}-${String(d7.getDate()).padStart(2, "0")}`;
    end = todayStr;
  } else if (presetName === "10days") {
    const d10 = new Date(today);
    d10.setDate(d10.getDate() - 10);
    start = `${d10.getFullYear()}-${String(d10.getMonth() + 1).padStart(2, "0")}-${String(d10.getDate()).padStart(2, "0")}`;
    end = todayStr;
  } else if (presetName === "15days") {
    const d15 = new Date(today);
    d15.setDate(d15.getDate() - 15);
    start = `${d15.getFullYear()}-${String(d15.getMonth() + 1).padStart(2, "0")}-${String(d15.getDate()).padStart(2, "0")}`;
    end = todayStr;
  } else if (presetName === "20days") {
    const d20 = new Date(today);
    d20.setDate(d20.getDate() - 20);
    start = `${d20.getFullYear()}-${String(d20.getMonth() + 1).padStart(2, "0")}-${String(d20.getDate()).padStart(2, "0")}`;
    end = todayStr;
  } else if (presetName === "25days") {
    const d25 = new Date(today);
    d25.setDate(d25.getDate() - 25);
    start = `${d25.getFullYear()}-${String(d25.getMonth() + 1).padStart(2, "0")}-${String(d25.getDate()).padStart(2, "0")}`;
    end = todayStr;
  } else if (presetName === "30days") {
    const d30 = new Date(today);
    d30.setDate(d30.getDate() - 30);
    start = `${d30.getFullYear()}-${String(d30.getMonth() + 1).padStart(2, "0")}-${String(d30.getDate()).padStart(2, "0")}`;
    end = todayStr;
  } else if (presetName === "thisMonth") {
    start = `${yyyy}-${mm}-01`;
    end = todayStr;
  } else if (presetName === "lastMonth") {
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    const prevMonthFirstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const pm_mm = String(prevMonthFirstDay.getMonth() + 1).padStart(2, "0");
    const pm_last_dd = String(prevMonthLastDay.getDate()).padStart(2, "0");
    start = `${prevMonthFirstDay.getFullYear()}-${pm_mm}-01`;
    end = `${prevMonthFirstDay.getFullYear()}-${pm_mm}-${pm_last_dd}`;
  } else if (presetName === "nextMonth") {
    const nextMonthFirstDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthLastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const nm_mm = String(nextMonthFirstDay.getMonth() + 1).padStart(2, "0");
    const nm_last_dd = String(nextMonthLastDay.getDate()).padStart(2, "0");
    start = `${nextMonthFirstDay.getFullYear()}-${nm_mm}-01`;
    end = `${nextMonthLastDay.getFullYear()}-${nm_mm}-${nm_last_dd}`;
  } else if (presetName === "next2Months") {
    const n2FirstDay = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const n2LastDay = new Date(today.getFullYear(), today.getMonth() + 3, 0);
    const n2_start_mm = String(n2FirstDay.getMonth() + 1).padStart(2, "0");
    const n2_end_mm = String(n2LastDay.getMonth() + 1).padStart(2, "0");
    const n2_last_dd = String(n2LastDay.getDate()).padStart(2, "0");
    start = `${n2FirstDay.getFullYear()}-${n2_start_mm}-01`;
    end = `${n2LastDay.getFullYear()}-${n2_end_mm}-${n2_last_dd}`;
  } else if (presetName === "year2025") {
    start = "2025-01-01";
    end = "2025-12-31";
  } else if (presetName === "year2026") {
    start = "2026-01-01";
    end = "2026-12-31";
  } else if (presetName === "all") {
    start = "2025-01-01";
    end = todayStr;
  }

  document.getElementById("fromDate").value = start;
  document.getElementById("toDate").value = end;

  // Toggle active class on pills
  document.querySelectorAll(".pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.preset === presetName);
  });

  loadData();
}

function setupEventListeners() {
  // 3-Language Switcher Buttons
  document.querySelectorAll("#langSwitcher .lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setLanguage(btn.dataset.lang);
    });
  });

  // Preset Pills
  document.querySelectorAll(".pill-btn").forEach(btn => {
    btn.addEventListener("click", () => setPreset(btn.dataset.preset));
  });

  // Apply Filter Button
  document.getElementById("applyFilterBtn").addEventListener("click", () => {
    document.querySelectorAll(".pill-btn").forEach(b => b.classList.remove("active"));
    loadData();
  });

  // Alter Mode change
  document.getElementById("alterMode").addEventListener("change", () => loadData());

  // Search Input - Ultra Fast Debounce (100ms)
  let searchTimer = null;
  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderTable();
    }, 100);
  });

  // Theme Toggle Button
  const themeToggle = document.getElementById("themeToggleBtn");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Floor Tabs
  document.querySelectorAll("#floorTabs .tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#floorTabs .tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFloor = btn.dataset.floor;
      renderTable();
    });
  });

  // View Switcher Buttons & Dropdown Selector (3 Distinct Pages)
  document.getElementById("viewModeKarigarBtn").addEventListener("click", () => switchViewMode("karigar"));
  document.getElementById("viewModeLinemanBtn").addEventListener("click", () => switchViewMode("lineman"));
  const cmpViewBtn = document.getElementById("viewModeComparisonBtn");
  if (cmpViewBtn) {
    cmpViewBtn.addEventListener("click", () => switchViewMode("comparison"));
  }
  const reportSelect = document.getElementById("reportPageSelect");
  if (reportSelect) {
    reportSelect.addEventListener("change", (e) => {
      switchViewMode(e.target.value);
    });
  }

  // Comparison Presets & Controls
  document.querySelectorAll(".cmp-pill-1").forEach(btn => {
    btn.addEventListener("click", () => setCmpPreset(1, btn.dataset.preset));
  });
  document.querySelectorAll(".cmp-pill-2").forEach(btn => {
    btn.addEventListener("click", () => setCmpPreset(2, btn.dataset.preset));
  });

  const cmpApplyBtn = document.getElementById("cmpApplyBtn");
  if (cmpApplyBtn) {
    cmpApplyBtn.addEventListener("click", () => loadComparisonData(true));
  }

  const cmpExportExcelBtn = document.getElementById("cmpExportExcelBtn");
  if (cmpExportExcelBtn) {
    cmpExportExcelBtn.addEventListener("click", () => exportComparisonExcel());
  }

  const cmpSearchInput = document.getElementById("cmpSearchInput");
  if (cmpSearchInput) {
    let cmpTimer = null;
    cmpSearchInput.addEventListener("input", () => {
      clearTimeout(cmpTimer);
      cmpTimer = setTimeout(() => renderComparisonTable(), 100);
    });
  }

  const cmpSortFilter = document.getElementById("cmpSortFilter");
  if (cmpSortFilter) {
    cmpSortFilter.addEventListener("change", () => renderComparisonTable());
  }

  // Alter Checking Switcher, Presets & Controls
  const chkViewBtn = document.getElementById("viewModeAlterCheckingBtn");
  if (chkViewBtn) {
    chkViewBtn.addEventListener("click", () => switchViewMode("alter_checking"));
  }

  document.querySelectorAll(".chk-pill-1").forEach(btn => {
    btn.addEventListener("click", () => setChkPreset(1, btn.dataset.preset));
  });
  document.querySelectorAll(".chk-pill-2").forEach(btn => {
    btn.addEventListener("click", () => setChkPreset(2, btn.dataset.preset));
  });

  const chkApplyBtn = document.getElementById("chkApplyBtn");
  if (chkApplyBtn) {
    chkApplyBtn.addEventListener("click", () => loadAlterCheckingData(true));
  }

  const chkExportExcelBtn = document.getElementById("chkExportExcelBtn");
  if (chkExportExcelBtn) {
    chkExportExcelBtn.addEventListener("click", () => exportAlterCheckingExcel());
  }

  const chkSearchInput = document.getElementById("chkSearchInput");
  if (chkSearchInput) {
    let chkTimer = null;
    chkSearchInput.addEventListener("input", () => {
      clearTimeout(chkTimer);
      chkTimer = setTimeout(() => renderAlterCheckingTable(), 100);
    });
  }

  const chkSortFilter = document.getElementById("chkSortFilter");
  if (chkSortFilter) {
    chkSortFilter.addEventListener("change", () => renderAlterCheckingTable());
  }

  // Refresh Button
  document.getElementById("refreshBtn").addEventListener("click", () => {
    loadData(true);
  });

  // Export Excel Button
  document.getElementById("exportExcelBtn").addEventListener("click", () => {
    exportExcel();
  });

  // Modal Close
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
  document.getElementById("detailModal").addEventListener("click", (e) => {
    if (e.target.id === "detailModal") closeModal();
  });
}

// Client-side instant memory caches
const clientReportCache = new Map();
const clientComparisonCache = new Map();
const clientDetailCache = new Map();

async function loadData(forceRefresh = false) {
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  const alterMode = document.getElementById("alterMode").value;

  const cacheKey = `${fromDate}_${toDate}_${alterMode}`;
  if (!forceRefresh && clientReportCache.has(cacheKey)) {
    currentData = clientReportCache.get(cacheKey);
    updateKPIs(currentData);
    updateFloorTabCounts(currentData);
    if (currentViewMode === "lineman") {
      renderLinemanView();
    } else {
      renderTable();
    }
    return;
  }

  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = `
    <tr>
      <td colspan="9" class="empty-box">
        <div class="spinner"></div>
        <div>${t("loading_data")}</div>
      </td>
    </tr>
  `;

  if (window.AndroidApp && typeof window.AndroidApp.fetchReportData === "function") {
    window.AndroidApp.fetchReportData(fromDate, toDate, alterMode);
    return;
  }

  try {
    const url = `/api/karigar-summary?from_date=${fromDate}&to_date=${toDate}&alter_mode=${alterMode}&floor=ALL&refresh=${forceRefresh}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-box" style="color: #e11d48;">${t("error_prefix")} ${data.error}</td></tr>`;
      return;
    }

    currentData = data;
    normalizeKarigarFloors(data);
    clientReportCache.set(cacheKey, data);
    updateKPIs(data);
    updateFloorTabCounts(data);
    if (currentViewMode === "lineman") {
      renderLinemanView();
    } else {
      renderTable();
    }

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="9" class="empty-box" style="color: #e11d48;">${t("connection_failed")} ${err.message}</td></tr>`;
  }
}

// Native Android Bridge Callbacks (Allows running 24/7 when PC is OFF)
window.onNativeDataReceived = function(data) {
  const tbody = document.getElementById("tableBody");
  if (!data.success) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-box" style="color: #e11d48;">${t("error_prefix")} ${data.error}</td></tr>`;
    return;
  }
  currentData = data;
  normalizeKarigarFloors(data);
  updateKPIs(data);
  updateFloorTabCounts(data);
  if (currentViewMode === "lineman") {
    renderLinemanView();
  } else {
    renderTable();
  }
};

function normalizeKarigarFloors(data) {
  if (!data || !data.karigars) return;

  const validFloors = [
    "E2 - MUSHID BHAI",
    "E3 - SADDAM BHAI",
    "O3 - RAFIK BHAI",
    "E5 - TOHIDUL BHAI",
    "MIX"
  ];

  const floorMap = {};
  validFloors.forEach(fl => {
    floorMap[fl] = {
      floor: fl,
      karigar_count: 0,
      sti_qty: 0,
      alter_qty: 0,
      total_pieces: 0,
      high_alter_count: 0,
      critical_alter_count: 0,
      karigars: []
    };
  });

  data.karigars.forEach(k => {
    // 1. Clean karigar name if it contains floor suffix (e.g. ABUJAFFAR E3-A -> ABUJAFFAR)
    if (k.karigar_name) {
      k.karigar_name = k.karigar_name.replace(/[\s\-_]+(E[0-9]|O[0-9]|G[0-9]|F[0-9]|M[0-9])(?:[\s\-_]+[A-Za-z0-9]+)*$/i, "").trim();
    }

    // 2. Identify floor with regex
    const text = `${k.employee_key || ""} ${k.employee_code || ""} ${k.raw_name || ""} ${k.karigar_name || ""}`.toUpperCase();
    const m = text.match(/(?:^|[\s\-_/(\[:,])(E|O)[-\s]?(2|3|5)(?:[\s\-_/)\]:,]|$)/i);
    if (m) {
      const key = (m[1] + m[2]).toUpperCase();
      if (key === "E2") k.floor = "E2 - MUSHID BHAI";
      else if (key === "E3") k.floor = "E3 - SADDAM BHAI";
      else if (key === "E5") k.floor = "E5 - TOHIDUL BHAI";
      else if (key === "O3") k.floor = "O3 - RAFIK BHAI";
    }

    const fl = floorMap[k.floor] ? k.floor : "MIX";
    k.floor = fl;

    const grp = floorMap[fl];
    grp.karigar_count++;
    grp.sti_qty += (k.sti_qty || 0);
    grp.alter_qty += (k.alter_qty || 0);
    grp.total_pieces += (k.total_pieces || ((k.sti_qty || 0) + (k.alter_qty || 0)));
    grp.karigars.push(k);

    // Alter percent for individual tailor: ALTER / STR * 100%
    const tailorAltPct = (k.sti_qty || 0) > 0 
      ? ((k.alter_qty || 0) / k.sti_qty) * 100 
      : ((k.alter_qty || 0) > 0 ? 100.0 : 0.0);
    k.alter_percent = Math.round(tailorAltPct * 100) / 100;

    if (k.alter_percent >= 5.0 && (k.alter_qty || 0) > 0) {
      grp.high_alter_count++;
    }
    if (k.alter_percent >= 8.0 && (k.alter_qty || 0) > 0) {
      grp.critical_alter_count++;
    }
  });

  // Rebuild floor summaries & lineman ranking
  const rankingList = [];
  validFloors.forEach(fl => {
    const grp = floorMap[fl];
    const flTotal = grp.sti_qty + grp.alter_qty;
    const flStiPct = flTotal > 0 ? Math.round((grp.sti_qty / flTotal) * 10000) / 100 : 0.0;
    const flAltPct = grp.sti_qty > 0 
      ? Math.round((grp.alter_qty / grp.sti_qty) * 10000) / 100 
      : (grp.alter_qty > 0 ? 100.0 : 0.0);

    // Sort tailors in this floor by alter_qty desc, then alter_percent desc
    grp.karigars.sort((a, b) => (b.alter_qty - a.alter_qty) || (b.alter_percent - a.alter_percent));
    const topWorst = grp.karigars.slice(0, 3);
    const worstTailor = grp.karigars.length > 0 && grp.karigars[0].alter_qty > 0
      ? `${grp.karigars[0].karigar_name} (${formatPercent(grp.karigars[0].alter_percent)})`
      : "None";

    rankingList.push({
      floor: fl,
      karigar_count: grp.karigar_count,
      sti_qty: grp.sti_qty,
      sti_percent: flStiPct,
      alter_qty: grp.alter_qty,
      alter_percent: flAltPct,
      total_pieces: grp.total_pieces,
      high_alter_count: grp.high_alter_count,
      critical_alter_count: grp.critical_alter_count,
      worst_karigar: worstTailor,
      top_worst_tailors: topWorst
    });
  });

  // Sort lineman ranking by Alter % descending (Worst alter first)
  rankingList.sort((a, b) => b.alter_percent - a.alter_percent);
  rankingList.forEach((lm, idx) => {
    lm.rank = idx + 1;
  });

  data.lineman_ranking = rankingList;
  data.floor_summaries = rankingList;

  // Factory top 15 worst tailors
  const factoryWorst = data.karigars.filter(k => (k.alter_qty || 0) > 0);
  factoryWorst.sort((a, b) => (b.alter_qty - a.alter_qty) || (b.alter_percent - a.alter_percent));
  data.factory_worst_tailors = factoryWorst.slice(0, 15);
}

window.onNativeDetailReceived = function(data) {
  renderModalData(data);
};

function updateKPIs(data) {
  if (!data || !data.overall) return;
  const o = data.overall;
  document.getElementById("kpiStiQty").innerText = formatNumber(o.sti_qty);
  document.getElementById("kpiStiDesigns").innerText = formatNumber(o.sti_design_count);

  document.getElementById("kpiAltQty").innerText = formatNumber(o.alter_qty);
  document.getElementById("kpiAltDesigns").innerText = formatNumber(o.alter_design_count);

  document.getElementById("kpiAltPercent").innerText = formatPercent(o.alter_percent);
  document.getElementById("kpiTotalQty").innerText = formatNumber(o.total_pieces);
  document.getElementById("kpiKarigarCount").innerText = formatNumber(data.total_karigars);

  const ratingEl = document.getElementById("kpiAltRating");
  if (o.alter_percent <= 4.0) {
    ratingEl.innerHTML = `<span style="color: #059669; font-weight: 700;">${t("rating_excellent")}</span>`;
  } else if (o.alter_percent <= 8.0) {
    ratingEl.innerHTML = `<span style="color: #d97706; font-weight: 700;">${t("rating_normal")}</span>`;
  } else {
    ratingEl.innerHTML = `<span style="color: #dc2626; font-weight: 700;">${t("rating_high")}</span>`;
  }
}

function updateFloorTabCounts(data) {
  if (!data) return;
  const counts = {
    ALL: data.total_karigars,
    "E2 - MUSHID BHAI": 0,
    "E3 - SADDAM BHAI": 0,
    "O3 - RAFIK BHAI": 0,
    "E5 - TOHIDUL BHAI": 0,
    MIX: 0
  };

  if (data.floor_summaries) {
    data.floor_summaries.forEach(f => {
      counts[f.floor] = f.karigar_count;
    });
  }

  document.getElementById("tabCountALL").innerText = counts.ALL || 0;
  document.getElementById("tabCountE2").innerText = counts["E2 - MUSHID BHAI"] || 0;
  document.getElementById("tabCountE3").innerText = counts["E3 - SADDAM BHAI"] || 0;
  document.getElementById("tabCountO3").innerText = counts["O3 - RAFIK BHAI"] || 0;
  document.getElementById("tabCountE5").innerText = counts["E5 - TOHIDUL BHAI"] || 0;
  document.getElementById("tabCountMIX").innerText = counts["MIX"] || 0;
}

function renderTable() {
  if (!currentData) return;

  const tbody = document.getElementById("tableBody");
  const tfoot = document.getElementById("tableFoot");
  const searchTerm = (document.getElementById("searchInput").value || "").trim().toLowerCase();

  let list = currentData.karigars || [];

  // 1. Floor Filter
  if (currentFloor !== "ALL") {
    list = list.filter(k => k.floor === currentFloor);
  }

  // 2. Search Filter
  if (searchTerm) {
    list = list.filter(k => 
      k.employee_key.toLowerCase().includes(searchTerm) ||
      k.karigar_name.toLowerCase().includes(searchTerm) ||
      k.floor.toLowerCase().includes(searchTerm) ||
      k.employee_code.toLowerCase().includes(searchTerm)
    );
  }

  document.getElementById("tableRecordCount").innerText = `${list.length} ${t("record_count_suffix")}`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-box">${t("no_records")}</td></tr>`;
    tfoot.innerHTML = "";
    return;
  }

  let html = "";
  let sumStiDesigns = 0;
  let sumStiQty = 0;
  let sumAltDesigns = 0;
  let sumAltQty = 0;

  list.forEach((k, index) => {
    sumStiDesigns += k.sti_design_count;
    sumStiQty += k.sti_qty;
    sumAltDesigns += k.alter_design_count;
    sumAltQty += k.alter_qty;

    // Formula: ALTER / STR * 100%
    const alterRate = k.sti_qty > 0 
      ? (k.alter_qty / k.sti_qty) * 100 
      : (k.alter_qty > 0 ? 100.0 : 0.0);

    const altPctBadge = alterRate <= 4.0 
      ? `<span class="pct-badge pct-green">${formatPercent(alterRate)}</span>`
      : (alterRate <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(alterRate)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(alterRate)}</span>`);

    html += `
      <tr>
        <td style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">${index + 1}</td>
        <td>
          <div class="karigar-cell">
            <span class="karigar-primary">${k.employee_key}</span>
            ${k.doj ? `<span class="badge-tag" style="background: rgba(37,99,235,0.18); color: #60a5fa; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; margin-top: 3px;">📅 DOJ: ${k.doj}</span>` : ''}
          </div>
        </td>
        <td><span class="floor-badge">${k.floor}</span></td>
        <td class="numeric" style="border-left: 2px solid #cbd5e1;">${formatNumber(k.sti_design_count)}</td>
        <td class="numeric" style="font-weight: 700; color: #0284c7;">${formatNumber(k.sti_qty)}</td>
        <td class="numeric" style="border-left: 2px solid #cbd5e1;">${formatNumber(k.alter_design_count)}</td>
        <td class="numeric" style="font-weight: 700; color: #e11d48;">${formatNumber(k.alter_qty)}</td>
        <td class="numeric">${altPctBadge}</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.75rem;" onclick="viewDetail('${encodeURIComponent(k.employee_key)}')">
            ${t("btn_view")}
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Summary Totals Row: (Sum Alter / Sum STR) * 100%
  const totAlterRate = sumStiQty > 0 ? (sumAltQty / sumStiQty) * 100 : 0.0;

  tfoot.innerHTML = `
    <tr class="tfoot-total">
      <td style="text-align: center;">Σ</td>
      <td>${t("total_label")} (${list.length} ${t("record_count_suffix")})</td>
      <td>${currentFloor === "ALL" ? t("all_floors") : currentFloor}</td>
      <td class="numeric" style="border-left: 2px solid #1f4e78;">${formatNumber(sumStiDesigns)}</td>
      <td class="numeric">${formatNumber(sumStiQty)}</td>
      <td class="numeric" style="border-left: 2px solid #1f4e78;">${formatNumber(sumAltDesigns)}</td>
      <td class="numeric">${formatNumber(sumAltQty)}</td>
      <td class="numeric" style="font-weight: 700;">${formatPercent(totAlterRate)}</td>
      <td></td>
    </tr>
  `;

  // Render Page 1 Top 1 to 5 Tailors Ranking
  renderKarigarTop5();
}

function renderKarigarTop5() {
  const tbody = document.getElementById("karigarTop5TableBody");
  if (!tbody || !currentData || !currentData.karigars) return;

  // Clone tailors and sort by alter_qty descending, then alter_percent descending
  let list = [...currentData.karigars];
  list.sort((a, b) => (b.alter_qty - a.alter_qty) || (b.alter_percent - a.alter_percent));
  const top5 = list.slice(0, 5);

  if (top5.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-box">${t("no_records")}</td></tr>`;
    return;
  }

  let html = "";
  top5.forEach((k, idx) => {
    const rank = idx + 1;
    let rankBadge = "";
    if (rank === 1) {
      rankBadge = `<span class="rank-badge-top1">🥇 #1</span>`;
    } else if (rank === 2) {
      rankBadge = `<span class="rank-badge-top2">🥈 #2</span>`;
    } else if (rank === 3) {
      rankBadge = `<span class="rank-badge-top3">🥉 #3</span>`;
    } else {
      rankBadge = `<span class="rank-badge-top-other">#${rank}</span>`;
    }

    const altPctBadge = k.alter_percent <= 4.0 
      ? `<span class="pct-badge pct-green">${formatPercent(k.alter_percent)}</span>`
      : (k.alter_percent <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(k.alter_percent)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(k.alter_percent)}</span>`);

    html += `
      <tr style="${rank === 1 ? 'background: rgba(245, 158, 11, 0.08);' : ''}">
        <td style="text-align: center;">${rankBadge}</td>
        <td style="text-align: center; font-weight: 600; font-size: 0.8rem; color: #94a3b8; white-space: nowrap;">${k.doj || '-'}</td>
        <td><strong style="color: #60a5fa;">${k.employee_key}</strong></td>
        <td><strong>${k.karigar_name}</strong></td>
        <td><span class="floor-badge">${k.floor}</span></td>
        <td class="numeric" style="font-weight: 600; color: #0284c7;">${formatNumber(k.sti_qty)}</td>
        <td class="numeric" style="font-weight: 700; color: #e11d48;">${formatNumber(k.alter_qty)}</td>
        <td class="numeric">${altPctBadge}</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.75rem;" onclick="viewDetail('${encodeURIComponent(k.employee_key)}')">
            ${t("btn_view")}
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

async function viewDetail(encodedEmpKey) {
  const empKey = decodeURIComponent(encodedEmpKey);
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  const alterMode = document.getElementById("alterMode").value;

  const modal = document.getElementById("detailModal");
  modal.classList.add("open");

  const detailCacheKey = `${empKey}_${fromDate}_${toDate}_${alterMode}`;
  if (clientDetailCache.has(detailCacheKey)) {
    renderModalData(clientDetailCache.get(detailCacheKey));
    return;
  }

  document.getElementById("modalKarigarName").innerText = t("modal_fetching");
  document.getElementById("modalKarigarSub").innerText = empKey;
  document.getElementById("modalDesignsBody").innerHTML = `<tr><td colspan="7" class="empty-box"><div class="spinner"></div></td></tr>`;

  if (window.AndroidApp && typeof window.AndroidApp.fetchKarigarDetail === "function") {
    window.AndroidApp.fetchKarigarDetail(empKey, fromDate, toDate, alterMode);
    return;
  }

  try {
    const url = `/api/karigar-detail?employee_key=${encodeURIComponent(empKey)}&from_date=${fromDate}&to_date=${toDate}&alter_mode=${alterMode}`;
    const res = await fetch(url);
    const data = await res.json();
    clientDetailCache.set(detailCacheKey, data);
    renderModalData(data);
  } catch (err) {
    console.error(err);
    document.getElementById("modalDesignsBody").innerHTML = `<tr><td colspan="7" class="empty-box">${t("error_prefix")} ${err.message}</td></tr>`;
  }
}

function renderModalData(data) {
  if (!data.success) {
    document.getElementById("modalKarigarName").innerText = t("error_prefix");
    document.getElementById("modalDesignsBody").innerHTML = `<tr><td colspan="7" class="empty-box">${data.error}</td></tr>`;
    return;
  }

  document.getElementById("modalKarigarName").innerText = `${data.karigar_name} (${data.floor})`;
  document.getElementById("modalKarigarSub").innerText = `${data.employee_key} | ${t("total_designs_prefix")} ${data.total_designs} ${t("total_designs_suffix")}`;

  document.getElementById("modalStiQty").innerText = formatNumber(data.sti_qty);
  document.getElementById("modalAltQty").innerText = formatNumber(data.alter_qty);
  document.getElementById("modalTotalQty").innerText = formatNumber(data.total_pieces);
  document.getElementById("modalAltPercent").innerText = formatPercent(data.alter_percent);

  let html = "";
  data.designs.forEach(d => {
    const altBadge = d.alter_percent <= 4.0 
      ? `<span class="pct-badge pct-green">${formatPercent(d.alter_percent)}</span>`
      : (d.alter_percent <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(d.alter_percent)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(d.alter_percent)}</span>`);

    html += `
      <tr>
        <td><strong>${d.design}</strong></td>
        <td style="font-size: 0.75rem; color: #475569; max-width: 250px; word-break: break-all;">${d.lots || "-"}</td>
        <td><span class="floor-badge">${d.sizes || "-"}</span></td>
        <td class="numeric" style="font-weight: 600; color: #0284c7;">${formatNumber(d.sti_qty)}</td>
        <td class="numeric" style="font-weight: 600; color: #e11d48;">${formatNumber(d.alter_qty)}</td>
        <td class="numeric" style="font-weight: 700;">${formatNumber(d.total_qty)}</td>
        <td class="numeric">${altBadge}</td>
      </tr>
    `;
  });

  document.getElementById("modalDesignsBody").innerHTML = html || `<tr><td colspan="7" class="empty-box">${t("no_designs")}</td></tr>`;
}

function closeModal() {
  document.getElementById("detailModal").classList.remove("open");
}

function exportExcel() {
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  const alterMode = document.getElementById("alterMode").value;

  const btn = document.getElementById("exportExcelBtn");
  const origText = btn.innerHTML;
  btn.innerHTML = `<span>${t("exporting_excel")}</span>`;
  btn.style.pointerEvents = "none";

  if (window.AndroidApp && typeof window.AndroidApp.exportExcel === "function") {
    window.AndroidApp.exportExcel(fromDate, toDate, alterMode);
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.style.pointerEvents = "auto";
    }, 2500);
    return;
  }

  const url = `/api/export-excel?from_date=${fromDate}&to_date=${toDate}&alter_mode=${alterMode}`;
  window.location.href = url;

  setTimeout(() => {
    btn.innerHTML = origText;
    btn.style.pointerEvents = "auto";
  }, 3000);
}

function switchViewMode(mode) {
  currentViewMode = mode;
  const karigarSection = document.getElementById("karigarViewSection");
  const linemanSection = document.getElementById("linemanViewSection");
  const comparisonSection = document.getElementById("comparisonViewSection");
  const alterCheckingSection = document.getElementById("alterCheckingViewSection");

  const karigarBtn = document.getElementById("viewModeKarigarBtn");
  const linemanBtn = document.getElementById("viewModeLinemanBtn");
  const comparisonBtn = document.getElementById("viewModeComparisonBtn");
  const alterCheckingBtn = document.getElementById("viewModeAlterCheckingBtn");
  const reportSelect = document.getElementById("reportPageSelect");

  if (reportSelect && reportSelect.value !== mode) {
    reportSelect.value = mode;
  }

  karigarSection.style.display = "none";
  linemanSection.style.display = "none";
  if (comparisonSection) comparisonSection.style.display = "none";
  if (alterCheckingSection) alterCheckingSection.style.display = "none";

  karigarBtn.classList.remove("active");
  linemanBtn.classList.remove("active");
  if (comparisonBtn) comparisonBtn.classList.remove("active");
  if (alterCheckingBtn) alterCheckingBtn.classList.remove("active");

  if (mode === "lineman") {
    linemanSection.style.display = "block";
    linemanBtn.classList.add("active");
    renderLinemanView();
  } else if (mode === "comparison") {
    if (comparisonSection) comparisonSection.style.display = "block";
    if (comparisonBtn) comparisonBtn.classList.add("active");
    loadComparisonData();
  } else if (mode === "alter_checking") {
    if (alterCheckingSection) alterCheckingSection.style.display = "block";
    if (alterCheckingBtn) alterCheckingBtn.classList.add("active");
    loadAlterCheckingData();
  } else {
    karigarSection.style.display = "block";
    karigarBtn.classList.add("active");
    renderTable();
  }
}

function renderLinemanView() {
  if (!currentData || !currentData.lineman_ranking) return;

  const ranking = currentData.lineman_ranking;
  const factoryWorst = currentData.factory_worst_tailors || [];

  // 1. Alert Banner
  const worstLm = ranking[0];
  if (worstLm) {
    document.getElementById("alertLinemanTitle").innerHTML = `
      ${t("alert_highest_alter")} <strong>${worstLm.floor}</strong> ${t("alert_in_floor")} (${formatPercent(worstLm.alter_percent)})
    `;
    document.getElementById("alertLinemanDesc").innerHTML = t("alert_lineman_desc")
      .replace("{qty}", formatNumber(worstLm.alter_qty))
      .replace("{karigar}", worstLm.worst_karigar);
    document.getElementById("alertLinemanBadge").innerText = `#1 RANK (${formatPercent(worstLm.alter_percent)} ALTER)`;
  }

  // 2. Lineman Cards Grid
  const grid = document.getElementById("linemanGrid");
  let gridHtml = "";

  ranking.forEach((lm) => {
    const isWorst = lm.rank === 1;
    const progressClass = lm.alter_percent <= 4.0 ? "progress-green" : (lm.alter_percent <= 6.0 ? "progress-yellow" : "progress-red");
    const rankBadgeClass = lm.rank === 1 ? "rank-1" : (lm.rank === 2 ? "rank-2" : "rank-other");

    gridHtml += `
      <div class="lineman-card tilt-card-3d ${isWorst ? 'worst' : ''}">
        <div class="card-glass-sheen"></div>
        <div>
          <div class="lineman-card-header">
            <span class="lm-rank-badge ${rankBadgeClass}">#${lm.rank} RANK</span>
            <span class="pct-badge ${lm.alter_percent <= 4.0 ? 'pct-green' : (lm.alter_percent <= 6.0 ? 'pct-yellow' : 'pct-red')}">
              ${formatPercent(lm.alter_percent)}
            </span>
          </div>

          <div class="lm-name">${lm.floor}</div>
          <div class="lm-karigars">${lm.karigar_count} ${t("active_workers_suffix")}</div>

          <div class="progress-track">
            <div class="progress-fill ${progressClass}" style="width: ${Math.min(100, (lm.alter_percent / 10) * 100)}%;"></div>
          </div>

          <div class="lm-stats-row">
            <div class="lm-stat-col">
              <div class="lm-stat-val" style="color: #0284c7;">${formatNumber(lm.sti_qty)}</div>
              <div class="lm-stat-lbl">STR PCS</div>
            </div>
            <div class="lm-stat-col">
              <div class="lm-stat-val" style="color: #e11d48;">${formatNumber(lm.alter_qty)}</div>
              <div class="lm-stat-lbl">ALTER PCS</div>
            </div>
            <div class="lm-stat-col">
              <div class="lm-stat-val">${formatNumber(lm.total_pieces)}</div>
              <div class="lm-stat-lbl">TOTAL</div>
            </div>
          </div>

          <div class="lm-tailor-highlight">
            <div style="color: var(--text-muted); font-size: 0.7rem; font-weight: 700; margin-bottom: 2px;">
              ${t("th_high_alter_tailors")}: <strong style="color: #e11d48;">${lm.high_alter_count} ${t("tailor_unit")}</strong>
            </div>
            <div style="font-size: 0.75rem;">
              ${t("th_worst_karigar")}: <strong>${lm.worst_karigar}</strong>
            </div>
          </div>
        </div>

        <button class="btn btn-secondary" style="width: 100%; margin-top: 1rem; justify-content: center; font-size: 0.8rem;" 
          onclick="filterByLinemanAndSwitch('${encodeURIComponent(lm.floor)}')">
          ${t("btn_view_floor_tailors")}
        </button>
      </div>
    `;
  });
  grid.innerHTML = gridHtml;

  // 3. Lineman Comparison Table
  const tableBody = document.getElementById("linemanTableBody");
  let tableHtml = "";

  ranking.forEach((lm) => {
    const isWorst = lm.rank === 1;
    const badge = lm.alter_percent <= 4.0 
      ? `<span class="pct-badge pct-green">${formatPercent(lm.alter_percent)} (${t("badge_ok")})</span>`
      : (lm.alter_percent <= 6.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(lm.alter_percent)} (${t("badge_normal")})</span>`
          : `<span class="pct-badge pct-red">${formatPercent(lm.alter_percent)} (${t("badge_high")})</span>`);

    tableHtml += `
      <tr style="${isWorst ? 'background: rgba(225, 29, 72, 0.08);' : ''}">
        <td style="text-align: center; font-weight: 800;">
          <span class="lm-rank-badge ${lm.rank === 1 ? 'rank-1' : (lm.rank === 2 ? 'rank-2' : 'rank-other')}">
            #${lm.rank}
          </span>
        </td>
        <td><strong>${lm.floor}</strong></td>
        <td class="numeric">${lm.karigar_count}</td>
        <td class="numeric" style="color: #0284c7; font-weight: 600;">${formatNumber(lm.sti_qty)}</td>
        <td class="numeric" style="color: #e11d48; font-weight: 700;">${formatNumber(lm.alter_qty)}</td>
        <td class="numeric" style="font-weight: 700;">${formatNumber(lm.total_pieces)}</td>
        <td class="numeric">${badge}</td>
        <td class="numeric" style="font-weight: 700; color: #b91c1c;">${lm.high_alter_count} ${t("tailor_unit")}</td>
        <td><strong>${lm.worst_karigar}</strong></td>
        <td style="text-align: center;">
          <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.75rem;" 
            onclick="filterByLinemanAndSwitch('${encodeURIComponent(lm.floor)}')">
            ${t("btn_view_karigars")}
          </button>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = tableHtml;

  // 4. Factory Top 15 Worst Tailors Table
  const worstBody = document.getElementById("topWorstTableBody");
  let worstHtml = "";

  factoryWorst.forEach((k, idx) => {
    const altBadge = k.alter_percent <= 4.0 
      ? `<span class="pct-badge pct-green">${formatPercent(k.alter_percent)}</span>`
      : (k.alter_percent <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(k.alter_percent)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(k.alter_percent)}</span>`);

    worstHtml += `
      <tr>
        <td style="text-align: center; font-weight: 700; color: #b91c1c;">${idx + 1}</td>
        <td>${k.employee_key}</td>
        <td><strong>${k.karigar_name}</strong></td>
        <td><span class="floor-badge">${k.floor}</span></td>
        <td class="numeric" style="color: #0284c7;">${formatNumber(k.sti_qty)}</td>
        <td class="numeric" style="color: #e11d48; font-weight: 700;">${formatNumber(k.alter_qty)}</td>
        <td class="numeric">${formatNumber(k.total_pieces)}</td>
        <td class="numeric">${altBadge}</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary" style="padding: 3px 8px; font-size: 0.75rem;" onclick="viewDetail('${encodeURIComponent(k.employee_key)}')">
            ${t("btn_view")}
          </button>
        </td>
      </tr>
    `;
  });
  worstBody.innerHTML = worstHtml || `<tr><td colspan="9" class="empty-box">${t("no_records")}</td></tr>`;
  
  // Render Page 2 Top 1 to 5 Lineman Ranking
  renderLinemanTop5();
  init3DTilt();
}

function renderLinemanTop5() {
  const tbody = document.getElementById("linemanTop5TableBody");
  if (!tbody || !currentData || !currentData.lineman_ranking) return;

  const ranking = currentData.lineman_ranking;
  const top5 = ranking.slice(0, 5);

  if (top5.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-box">${t("no_records")}</td></tr>`;
    return;
  }

  let html = "";
  top5.forEach((lm, idx) => {
    const rank = idx + 1;
    let rankBadge = "";
    if (rank === 1) {
      rankBadge = `<span class="rank-badge-top1">🥇 #1</span>`;
    } else if (rank === 2) {
      rankBadge = `<span class="rank-badge-top2">🥈 #2</span>`;
    } else if (rank === 3) {
      rankBadge = `<span class="rank-badge-top3">🥉 #3</span>`;
    } else {
      rankBadge = `<span class="rank-badge-top-other">#${rank}</span>`;
    }

    const badge = lm.alter_percent <= 4.0 
      ? `<span class="pct-badge pct-green">${formatPercent(lm.alter_percent)} (${t("badge_ok")})</span>`
      : (lm.alter_percent <= 6.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(lm.alter_percent)} (${t("badge_normal")})</span>`
          : `<span class="pct-badge pct-red">${formatPercent(lm.alter_percent)} (${t("badge_high")})</span>`);

    html += `
      <tr style="${rank === 1 ? 'background: rgba(20, 184, 166, 0.08);' : ''}">
        <td style="text-align: center;">${rankBadge}</td>
        <td><strong>${lm.floor}</strong></td>
        <td class="numeric">${lm.karigar_count}</td>
        <td class="numeric" style="color: #0284c7; font-weight: 600;">${formatNumber(lm.sti_qty)}</td>
        <td class="numeric" style="color: #e11d48; font-weight: 700;">${formatNumber(lm.alter_qty)}</td>
        <td class="numeric" style="font-weight: 700;">${formatNumber(lm.total_pieces)}</td>
        <td class="numeric">${badge}</td>
        <td><strong style="color: #fb7185;">${lm.worst_karigar}</strong></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function filterByLinemanAndSwitch(encodedFloor) {
  const floor = decodeURIComponent(encodedFloor);
  currentFloor = floor;
  switchViewMode("karigar");

  // Set active tab
  document.querySelectorAll("#floorTabs .tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.floor === floor);
  });
  renderTable();
}

// -------------------------------------------------------------
// TWO-PERIOD COMPARISON REPORT LOGIC
// -------------------------------------------------------------
let comparisonData = null;

function initComparisonPresets() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Period 1 default: 60 days ago
  const d60 = new Date(today);
  d60.setDate(d60.getDate() - 60);
  const p1Start = `${d60.getFullYear()}-${String(d60.getMonth() + 1).padStart(2, "0")}-${String(d60.getDate()).padStart(2, "0")}`;

  // Period 2 default: 15 days ago
  const d15 = new Date(today);
  d15.setDate(d15.getDate() - 15);
  const p2Start = `${d15.getFullYear()}-${String(d15.getMonth() + 1).padStart(2, "0")}-${String(d15.getDate()).padStart(2, "0")}`;

  const elP1From = document.getElementById("cmpFromDate1");
  const elP1To = document.getElementById("cmpToDate1");
  const elP2From = document.getElementById("cmpFromDate2");
  const elP2To = document.getElementById("cmpToDate2");

  if (elP1From) elP1From.value = p1Start;
  if (elP1To) elP1To.value = todayStr;
  if (elP2From) elP2From.value = p2Start;
  if (elP2To) elP2To.value = todayStr;

  // Initialize Alter Checking default dates
  const elChkP1From = document.getElementById("chkFromDate1");
  const elChkP1To = document.getElementById("chkToDate1");
  const elChkP2From = document.getElementById("chkFromDate2");
  const elChkP2To = document.getElementById("chkToDate2");

  if (elChkP1From) elChkP1From.value = p1Start;
  if (elChkP1To) elChkP1To.value = todayStr;
  if (elChkP2From) elChkP2From.value = p2Start;
  if (elChkP2To) elChkP2To.value = todayStr;
}

function setCmpPreset(period, presetName) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  let start = todayStr;
  let end = todayStr;

  if (presetName === "today") {
    start = todayStr;
    end = todayStr;
  } else if (presetName === "7days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (presetName === "15days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 15);
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (presetName === "30days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (presetName === "60days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 60);
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (presetName === "thisMonth") {
    start = `${yyyy}-${mm}-01`;
  } else if (presetName === "lastMonth") {
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    const prevMonthFirstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const pm_mm = String(prevMonthFirstDay.getMonth() + 1).padStart(2, "0");
    const pm_last_dd = String(prevMonthLastDay.getDate()).padStart(2, "0");
    start = `${prevMonthFirstDay.getFullYear()}-${pm_mm}-01`;
    end = `${prevMonthFirstDay.getFullYear()}-${pm_mm}-${pm_last_dd}`;
  }

  if (period === 1) {
    document.getElementById("cmpFromDate1").value = start;
    document.getElementById("cmpToDate1").value = end;
    document.querySelectorAll(".cmp-pill-1").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === presetName);
    });
  } else {
    document.getElementById("cmpFromDate2").value = start;
    document.getElementById("cmpToDate2").value = end;
    document.querySelectorAll(".cmp-pill-2").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === presetName);
    });
  }

  loadComparisonData();
}

async function loadComparisonData(forceRefresh = false) {
  const fromDate1 = document.getElementById("cmpFromDate1").value;
  const toDate1 = document.getElementById("cmpToDate1").value;
  const fromDate2 = document.getElementById("cmpFromDate2").value;
  const toDate2 = document.getElementById("cmpToDate2").value;
  const alterMode = document.getElementById("cmpAlterMode").value;

  const cmpCacheKey = `${fromDate1}_${toDate1}_${fromDate2}_${toDate2}_${alterMode}`;
  if (!forceRefresh && clientComparisonCache.has(cmpCacheKey)) {
    comparisonData = clientComparisonCache.get(cmpCacheKey);
    renderComparisonTable();
    return;
  }

  const tbody = document.getElementById("comparisonTableBody");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="9" class="empty-box">
        <div class="spinner"></div>
        <div>${t("cmp_loading")}</div>
      </td>
    </tr>
  `;

  if (window.AndroidApp && typeof window.AndroidApp.fetchPeriodComparison === "function") {
    window.AndroidApp.fetchPeriodComparison(fromDate1, toDate1, fromDate2, toDate2, alterMode);
    return;
  }

  try {
    const url = `/api/period-comparison?from_date1=${fromDate1}&to_date1=${toDate1}&from_date2=${fromDate2}&to_date2=${toDate2}&alter_mode=${alterMode}&refresh=${forceRefresh}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-box" style="color: #e11d48;">${t("error_prefix")} ${data.error}</td></tr>`;
      return;
    }
    comparisonData = data;
    clientComparisonCache.set(cmpCacheKey, data);
    renderComparisonTable();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="9" class="empty-box" style="color: #e11d48;">${t("connection_failed")} ${err.message}</td></tr>`;
  }
}

window.onNativeComparisonReceived = function(data) {
  const tbody = document.getElementById("comparisonTableBody");
  if (!data.success) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="empty-box" style="color: #e11d48;">${t("error_prefix")} ${data.error}</td></tr>`;
    return;
  }
  comparisonData = data;
  renderComparisonTable();
};

function applyComparisonSortingAndFiltering(rows, sortFilterVal) {
  let list = [...rows];
  if (sortFilterVal === "inc_only") {
    list = list.filter(r => {
      const d = (r.diff_percent !== undefined) ? r.diff_percent : (r.p2_alter_percent - r.p1_alter_percent);
      return d > 0;
    });
    list.sort((a, b) => {
      const da = (a.diff_percent !== undefined) ? a.diff_percent : (a.p2_alter_percent - a.p1_alter_percent);
      const db = (b.diff_percent !== undefined) ? b.diff_percent : (b.p2_alter_percent - b.p1_alter_percent);
      return db - da;
    });
  } else if (sortFilterVal === "dec_only") {
    list = list.filter(r => {
      const d = (r.diff_percent !== undefined) ? r.diff_percent : (r.p2_alter_percent - r.p1_alter_percent);
      return d < 0;
    });
    list.sort((a, b) => {
      const da = (a.diff_percent !== undefined) ? a.diff_percent : (a.p2_alter_percent - a.p1_alter_percent);
      const db = (b.diff_percent !== undefined) ? b.diff_percent : (b.p2_alter_percent - b.p1_alter_percent);
      return da - db;
    });
  } else if (sortFilterVal === "diff_asc") {
    list.sort((a, b) => {
      const da = (a.diff_percent !== undefined) ? a.diff_percent : (a.p2_alter_percent - a.p1_alter_percent);
      const db = (b.diff_percent !== undefined) ? b.diff_percent : (b.p2_alter_percent - b.p1_alter_percent);
      return da - db;
    });
  } else if (sortFilterVal === "p2_qty_desc") {
    list.sort((a, b) => (b.p2_alter_qty - a.p2_alter_qty) || (b.p2_alter_percent - a.p2_alter_percent));
  } else if (sortFilterVal === "mno_asc") {
    list.sort((a, b) => {
      const na = parseInt((a.employee_key.match(/\d+/) || [99999])[0]);
      const nb = parseInt((b.employee_key.match(/\d+/) || [99999])[0]);
      return na - nb || a.employee_key.localeCompare(b.employee_key);
    });
  } else {
    // Default: diff_desc (Highest diff % on top, descending downwards)
    list.sort((a, b) => {
      const da = (a.diff_percent !== undefined) ? a.diff_percent : (a.p2_alter_percent - a.p1_alter_percent);
      const db = (b.diff_percent !== undefined) ? b.diff_percent : (b.p2_alter_percent - b.p1_alter_percent);
      return (db - da) || (b.p2_alter_qty - a.p2_alter_qty) || (b.p1_alter_qty - a.p1_alter_qty);
    });
  }
  return list;
}

function renderComparisonTable() {
  if (!comparisonData || !comparisonData.rows) return;

  const p1 = comparisonData.period1;
  const p2 = comparisonData.period2;

  // Update merged header titles matching Image 1
  const diffDays1 = getDaysCount(p1.from_date, p1.to_date);
  const diffDays2 = getDaysCount(p2.from_date, p2.to_date);

  const p1HeaderStr = `${diffDays1} DAYS (${formatDmy(p1.from_date)} TO ${formatDmy(p1.to_date)})`;
  const p2HeaderStr = `${diffDays2} DAYS (${formatDmy(p2.from_date)} TO ${formatDmy(p2.to_date)})`;

  const th1 = document.getElementById("cmpThP1Merged");
  const th2 = document.getElementById("cmpThP2Merged");
  if (th1) th1.innerText = p1HeaderStr;
  if (th2) th2.innerText = p2HeaderStr;

  const top5Th1 = document.getElementById("cmpTop5ThP1");
  const top5Th2 = document.getElementById("cmpTop5ThP2");
  if (top5Th1) top5Th1.innerText = `P1: ${p1HeaderStr}`;
  if (top5Th2) top5Th2.innerText = `P2: ${p2HeaderStr}`;

  const tbody = document.getElementById("comparisonTableBody");
  const tfoot = document.getElementById("comparisonTableFoot");
  if (!tbody) return;

  const searchEl = document.getElementById("cmpSearchInput");
  const searchTerm = (searchEl ? searchEl.value : "").trim().toLowerCase();

  let rows = comparisonData.rows;
  if (searchTerm) {
    rows = rows.filter(r => 
      (r.employee_key || "").toLowerCase().includes(searchTerm) ||
      (r.karigar_name || "").toLowerCase().includes(searchTerm) ||
      (r.floor || "").toLowerCase().includes(searchTerm)
    );
  }

  // Render Page 3 Top 1 to 5 Comparison Tailors Ranking
  renderComparisonTop5(rows);

  // Apply user sort & filter (Default: highest DIFF % on top, descending downwards)
  const cmpSortEl = document.getElementById("cmpSortFilter");
  const sortVal = cmpSortEl ? cmpSortEl.value : "diff_desc";
  rows = applyComparisonSortingAndFiltering(rows, sortVal);

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-box">${t("no_records")}</td></tr>`;
    if (tfoot) tfoot.innerHTML = "";
    return;
  }

  let html = "";
  rows.forEach((r, idx) => {
    const badgeP1 = r.p1_alter_percent <= 4.0
      ? `<span class="pct-badge pct-green">${formatPercent(r.p1_alter_percent)}</span>`
      : (r.p1_alter_percent <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(r.p1_alter_percent)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(r.p1_alter_percent)}</span>`);

    const badgeP2 = r.p2_alter_percent <= 4.0
      ? `<span class="pct-badge pct-green">${formatPercent(r.p2_alter_percent)}</span>`
      : (r.p2_alter_percent <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(r.p2_alter_percent)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(r.p2_alter_percent)}</span>`);

    const diffVal = (r.diff_percent !== undefined) ? r.diff_percent : Math.round((r.p2_alter_percent - r.p1_alter_percent) * 100) / 100;
    let diffBadge = "";
    if (diffVal > 0) {
      diffBadge = `<span class="badge-tag" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-weight: 800; font-size: 0.82rem; padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(239, 68, 68, 0.3);">▲ +${diffVal.toFixed(2)}%</span>`;
    } else if (diffVal < 0) {
      diffBadge = `<span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 800; font-size: 0.82rem; padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(16, 185, 129, 0.3);">▼ ${diffVal.toFixed(2)}%</span>`;
    } else {
      diffBadge = `<span class="badge-tag" style="background: rgba(148, 163, 184, 0.2); color: #cbd5e1; font-weight: 600; font-size: 0.82rem; padding: 2px 7px; border-radius: 5px;">0.00%</span>`;
    }

    html += `
      <tr>
        <td style="text-align: center; font-weight: 600; font-size: 0.8rem; color: #94a3b8; white-space: nowrap; border-right: 2px solid rgba(255,255,255,0.15);">${r.doj || '-'}</td>
        
        <!-- Period 1 -->
        <td class="cmp-p1-col"><strong style="color: #60a5fa;">${r.employee_key}</strong></td>
        <td class="numeric cmp-p1-col">${formatNumber(r.p1_sti_qty)}</td>
        <td class="numeric cmp-p1-col" style="font-weight: 700; color: ${r.p1_alter_qty > 0 ? '#e11d48' : 'inherit'};">${formatNumber(r.p1_alter_qty)}</td>
        <td class="numeric cmp-p1-col" style="border-right: 2px solid rgba(255,255,255,0.2) !important;">${badgeP1}</td>

        <!-- Period 2 -->
        <td class="cmp-p2-col"><strong style="color: #38bdf8;">${r.employee_key}</strong></td>
        <td class="numeric cmp-p2-col">${formatNumber(r.p2_sti_qty)}</td>
        <td class="numeric cmp-p2-col" style="font-weight: 700; color: ${r.p2_alter_qty > 0 ? '#e11d48' : 'inherit'};">${formatNumber(r.p2_alter_qty)}</td>
        <td class="numeric cmp-p2-col" style="border-right: 2px solid rgba(255,255,255,0.2) !important;">${badgeP2}</td>

        <!-- Column 10: DIFF % -->
        <td class="numeric cmp-diff-col" style="text-align: center; vertical-align: middle; background: rgba(225, 29, 72, 0.05); border-left: 2px solid rgba(255,255,255,0.15);">${diffBadge}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;

  // Total Summary Row
  if (tfoot) {
    const totDiffVal = Math.round((p2.total_alter_percent - p1.total_alter_percent) * 100) / 100;
    let totDiffBadge = "";
    if (totDiffVal > 0) {
      totDiffBadge = `<span style="color: #fca5a5; font-weight: 800;">▲ +${totDiffVal.toFixed(2)}%</span>`;
    } else if (totDiffVal < 0) {
      totDiffBadge = `<span style="color: #6ee7b7; font-weight: 800;">▼ ${totDiffVal.toFixed(2)}%</span>`;
    } else {
      totDiffBadge = `<span style="color: #cbd5e1; font-weight: 800;">0.00%</span>`;
    }

    tfoot.innerHTML = `
      <tr class="tfoot-total" style="background: rgba(30, 58, 138, 0.4); font-weight: 800;">
        <td style="text-align: center;">Σ</td>
        <td>TOTAL (${rows.length} ${t("record_count_suffix")})</td>
        <td class="numeric">${formatNumber(p1.total_sti_qty)}</td>
        <td class="numeric" style="color: #e11d48;">${formatNumber(p1.total_alter_qty)}</td>
        <td class="numeric" style="border-right: 2px solid rgba(255,255,255,0.2) !important;">${formatPercent(p1.total_alter_percent)}</td>
        <td>TOTAL</td>
        <td class="numeric">${formatNumber(p2.total_sti_qty)}</td>
        <td class="numeric" style="color: #e11d48;">${formatNumber(p2.total_alter_qty)}</td>
        <td class="numeric" style="border-right: 2px solid rgba(255,255,255,0.2) !important;">${formatPercent(p2.total_alter_percent)}</td>
        <td class="numeric" style="text-align: center; vertical-align: middle; background: rgba(225, 29, 72, 0.25); border-left: 2px solid rgba(255,255,255,0.2);">${totDiffBadge}</td>
      </tr>
    `;
  }
}

function renderComparisonTop5(rows) {
  const tbody = document.getElementById("comparisonTop5TableBody");
  if (!tbody || !rows) return;

  // Sort rows by Period 2 alter_qty descending, then Period 2 alter_percent descending
  let list = [...rows];
  list.sort((a, b) => (b.p2_alter_qty - a.p2_alter_qty) || (b.p2_alter_percent - a.p2_alter_percent));
  const top5 = list.slice(0, 5);

  if (top5.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-box">${t("no_records")}</td></tr>`;
    return;
  }

  let html = "";
  top5.forEach((r, idx) => {
    const rank = idx + 1;
    let rankBadge = "";
    if (rank === 1) {
      rankBadge = `<span class="rank-badge-top1">🥇 #1</span>`;
    } else if (rank === 2) {
      rankBadge = `<span class="rank-badge-top2">🥈 #2</span>`;
    } else if (rank === 3) {
      rankBadge = `<span class="rank-badge-top3">🥉 #3</span>`;
    } else {
      rankBadge = `<span class="rank-badge-top-other">#${rank}</span>`;
    }

    const badgeP2 = r.p2_alter_percent <= 4.0
      ? `<span class="pct-badge pct-green">${formatPercent(r.p2_alter_percent)}</span>`
      : (r.p2_alter_percent <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(r.p2_alter_percent)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(r.p2_alter_percent)}</span>`);

    const p1Summary = `${formatNumber(r.p1_sti_qty)} / ${formatPercent(r.p1_alter_percent)}`;
    const p2Summary = `${formatNumber(r.p2_sti_qty)} / ${formatPercent(r.p2_alter_percent)}`;

    const statusBadge = r.p2_alter_percent > r.p1_alter_percent
      ? `<span class="badge-tag" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 0.72rem; padding: 2px 7px;">▲ વધ્યો (+${formatPercent(r.p2_alter_percent - r.p1_alter_percent)})</span>`
      : (r.p2_alter_percent < r.p1_alter_percent
          ? `<span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-size: 0.72rem; padding: 2px 7px;">▼ ઘટ્યો (-${formatPercent(r.p1_alter_percent - r.p2_alter_percent)})</span>`
          : `<span class="badge-tag" style="background: rgba(148, 163, 184, 0.2); color: #cbd5e1; font-size: 0.72rem; padding: 2px 7px;">= સમાન</span>`);

    html += `
      <tr style="${rank === 1 ? 'background: rgba(99, 102, 241, 0.1);' : ''}">
        <td style="text-align: center;">${rankBadge}</td>
        <td style="text-align: center; font-weight: 600; font-size: 0.8rem; color: #94a3b8; white-space: nowrap;">${r.doj || '-'}</td>
        <td><strong style="color: #a5b4fc;">${r.employee_key}</strong></td>
        <td><span class="floor-badge">${r.floor}</span></td>
        <td class="numeric" style="color: #60a5fa; font-weight: 600;">${p1Summary}</td>
        <td class="numeric" style="color: #38bdf8; font-weight: 600;">${p2Summary}</td>
        <td class="numeric" style="font-weight: 800; color: #f43f5e;">${formatNumber(r.p2_alter_qty)}</td>
        <td class="numeric">${badgeP2}</td>
        <td style="text-align: center;">${statusBadge}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function exportComparisonExcel() {
  const fromDate1 = document.getElementById("cmpFromDate1").value;
  const toDate1 = document.getElementById("cmpToDate1").value;
  const fromDate2 = document.getElementById("cmpFromDate2").value;
  const toDate2 = document.getElementById("cmpToDate2").value;
  const alterMode = document.getElementById("cmpAlterMode").value;

  const btn = document.getElementById("cmpExportExcelBtn");
  const origText = btn.innerHTML;
  btn.innerHTML = `<span>${t("exporting_excel")}</span>`;
  btn.style.pointerEvents = "none";

  const days1 = getDaysCount(fromDate1, toDate1);
  const days2 = getDaysCount(fromDate2, toDate2);
  const p1Header = `${days1} DAYS (${formatDmy(fromDate1)} TO ${formatDmy(toDate1)})`;
  const p2Header = `${days2} DAYS (${formatDmy(fromDate2)} TO ${formatDmy(toDate2)})`;

  if (window.AndroidApp && typeof window.AndroidApp.exportComparisonExcel === "function") {
    window.AndroidApp.exportComparisonExcel(fromDate1, toDate1, fromDate2, toDate2, alterMode, p1Header, p2Header);
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.style.pointerEvents = "auto";
    }, 1500);
    return;
  }

  const url = `/api/export-comparison-excel?from_date1=${fromDate1}&to_date1=${toDate1}&from_date2=${fromDate2}&to_date2=${toDate2}&alter_mode=${alterMode}&p1_label=${encodeURIComponent(p1Header)}&p2_label=${encodeURIComponent(p2Header)}`;
  window.location.href = url;

  setTimeout(() => {
    btn.innerHTML = origText;
    btn.style.pointerEvents = "auto";
  }, 3000);
}

// ============================================================================
// 4. ALTER CHECKING REPORT CONTROLLER (PAGE 4 - STR: ALL LOTS | ALTER: DB LOTS ONLY)
// ============================================================================

let alterCheckingData = null;
const clientAlterCheckingCache = new Map();

function setChkPreset(period, presetName) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  let start = todayStr;
  let end = todayStr;

  if (presetName === "today") {
    start = todayStr;
    end = todayStr;
  } else if (presetName === "7days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (presetName === "15days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 15);
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (presetName === "30days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (presetName === "60days") {
    const d = new Date(today);
    d.setDate(d.getDate() - 60);
    start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } else if (presetName === "thisMonth") {
    start = `${yyyy}-${mm}-01`;
  } else if (presetName === "lastMonth") {
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    const prevMonthFirstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const pm_mm = String(prevMonthFirstDay.getMonth() + 1).padStart(2, "0");
    const pm_last_dd = String(prevMonthLastDay.getDate()).padStart(2, "0");
    start = `${prevMonthFirstDay.getFullYear()}-${pm_mm}-01`;
    end = `${prevMonthFirstDay.getFullYear()}-${pm_mm}-${pm_last_dd}`;
  }

  if (period === 1) {
    document.getElementById("chkFromDate1").value = start;
    document.getElementById("chkToDate1").value = end;
    document.querySelectorAll(".chk-pill-1").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === presetName);
    });
  } else {
    document.getElementById("chkFromDate2").value = start;
    document.getElementById("chkToDate2").value = end;
    document.querySelectorAll(".chk-pill-2").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === presetName);
    });
  }

  loadAlterCheckingData();
}

async function loadAlterCheckingData(forceRefresh = false) {
  const fromDate1 = document.getElementById("chkFromDate1").value;
  const toDate1 = document.getElementById("chkToDate1").value;
  const fromDate2 = document.getElementById("chkFromDate2").value;
  const toDate2 = document.getElementById("chkToDate2").value;
  const alterMode = document.getElementById("chkAlterMode").value;

  const chkCacheKey = `${fromDate1}_${toDate1}_${fromDate2}_${toDate2}_${alterMode}`;
  if (!forceRefresh && clientAlterCheckingCache.has(chkCacheKey)) {
    alterCheckingData = clientAlterCheckingCache.get(chkCacheKey);
    renderAlterCheckingTable();
    return;
  }

  const tbody = document.getElementById("alterCheckingTableBody");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="9" class="empty-box">
        <div class="spinner"></div>
        <div>${t("chk_loading")}</div>
      </td>
    </tr>
  `;

  if (window.AndroidApp && typeof window.AndroidApp.fetchAlterChecking === "function") {
    window.AndroidApp.fetchAlterChecking(fromDate1, toDate1, fromDate2, toDate2, alterMode);
    return;
  }

  try {
    const url = `/api/alter-checking?from_date1=${fromDate1}&to_date1=${toDate1}&from_date2=${fromDate2}&to_date2=${toDate2}&alter_mode=${alterMode}&refresh=${forceRefresh}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-box" style="color: #e11d48;">${t("error_prefix")} ${data.error}</td></tr>`;
      return;
    }
    alterCheckingData = data;
    clientAlterCheckingCache.set(chkCacheKey, data);
    renderAlterCheckingTable();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="9" class="empty-box" style="color: #e11d48;">${t("connection_failed")} ${err.message}</td></tr>`;
  }
}

window.onNativeAlterCheckingReceived = function(data) {
  const tbody = document.getElementById("alterCheckingTableBody");
  if (!data.success) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="empty-box" style="color: #e11d48;">${t("error_prefix")} ${data.error}</td></tr>`;
    return;
  }
  alterCheckingData = data;
  renderAlterCheckingTable();
};

function renderAlterCheckingTable() {
  if (!alterCheckingData || !alterCheckingData.rows) return;

  const p1 = alterCheckingData.period1;
  const p2 = alterCheckingData.period2;

  const diffDays1 = getDaysCount(p1.from_date, p1.to_date);
  const diffDays2 = getDaysCount(p2.from_date, p2.to_date);

  const p1HeaderStr = `${diffDays1} DAYS (${formatDmy(p1.from_date)} TO ${formatDmy(p1.to_date)})`;
  const p2HeaderStr = `${diffDays2} DAYS (${formatDmy(p2.from_date)} TO ${formatDmy(p2.to_date)})`;

  const th1 = document.getElementById("chkThP1Merged");
  const th2 = document.getElementById("chkThP2Merged");
  if (th1) th1.innerText = p1HeaderStr;
  if (th2) th2.innerText = p2HeaderStr;

  const top5Th1 = document.getElementById("chkTop5ThP1");
  const top5Th2 = document.getElementById("chkTop5ThP2");
  if (top5Th1) top5Th1.innerText = `P1: ${p1HeaderStr}`;
  if (top5Th2) top5Th2.innerText = `P2: ${p2HeaderStr}`;

  const tbody = document.getElementById("alterCheckingTableBody");
  const tfoot = document.getElementById("alterCheckingTableFoot");
  if (!tbody) return;

  const searchEl = document.getElementById("chkSearchInput");
  const searchTerm = (searchEl ? searchEl.value : "").trim().toLowerCase();

  let rows = alterCheckingData.rows;
  if (searchTerm) {
    rows = rows.filter(r => 
      (r.employee_key || "").toLowerCase().includes(searchTerm) ||
      (r.karigar_name || "").toLowerCase().includes(searchTerm) ||
      (r.floor || "").toLowerCase().includes(searchTerm)
    );
  }

  // Render Page 4 Top 1 to 5 Alter Checking Tailors Ranking
  renderAlterCheckingTop5(rows);

  // Apply user sort & filter (Default: highest DIFF % on top, descending downwards)
  const chkSortEl = document.getElementById("chkSortFilter");
  const sortVal = chkSortEl ? chkSortEl.value : "diff_desc";
  rows = applyComparisonSortingAndFiltering(rows, sortVal);

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-box">${t("no_records")}</td></tr>`;
    if (tfoot) tfoot.innerHTML = "";
    return;
  }

  let html = "";
  rows.forEach((r, idx) => {
    const badgeP1 = r.p1_alter_percent <= 4.0
      ? `<span class="pct-badge pct-green">${formatPercent(r.p1_alter_percent)}</span>`
      : (r.p1_alter_percent <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(r.p1_alter_percent)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(r.p1_alter_percent)}</span>`);

    const badgeP2 = r.p2_alter_percent <= 4.0
      ? `<span class="pct-badge pct-green">${formatPercent(r.p2_alter_percent)}</span>`
      : (r.p2_alter_percent <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(r.p2_alter_percent)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(r.p2_alter_percent)}</span>`);

    const diffVal = (r.diff_percent !== undefined) ? r.diff_percent : Math.round((r.p2_alter_percent - r.p1_alter_percent) * 100) / 100;
    let diffBadge = "";
    if (diffVal > 0) {
      diffBadge = `<span class="badge-tag" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-weight: 800; font-size: 0.82rem; padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(239, 68, 68, 0.3);">▲ +${diffVal.toFixed(2)}%</span>`;
    } else if (diffVal < 0) {
      diffBadge = `<span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-weight: 800; font-size: 0.82rem; padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(16, 185, 129, 0.3);">▼ ${diffVal.toFixed(2)}%</span>`;
    } else {
      diffBadge = `<span class="badge-tag" style="background: rgba(148, 163, 184, 0.2); color: #cbd5e1; font-weight: 600; font-size: 0.82rem; padding: 2px 7px; border-radius: 5px;">0.00%</span>`;
    }

    html += `
      <tr>
        <td style="text-align: center; font-weight: 600; font-size: 0.8rem; color: #94a3b8; white-space: nowrap; border-right: 2px solid rgba(255,255,255,0.15);">${r.doj || '-'}</td>
        
        <!-- Period 1 -->
        <td class="cmp-p1-col"><strong style="color: #60a5fa;">${r.employee_key}</strong></td>
        <td class="numeric cmp-p1-col">${formatNumber(r.p1_sti_qty)}</td>
        <td class="numeric cmp-p1-col" style="font-weight: 700; color: ${r.p1_alter_qty > 0 ? '#e11d48' : 'inherit'};">${formatNumber(r.p1_alter_qty)}</td>
        <td class="numeric cmp-p1-col" style="border-right: 2px solid rgba(255,255,255,0.2) !important;">${badgeP1}</td>

        <!-- Period 2 -->
        <td class="cmp-p2-col"><strong style="color: #38bdf8;">${r.employee_key}</strong></td>
        <td class="numeric cmp-p2-col">${formatNumber(r.p2_sti_qty)}</td>
        <td class="numeric cmp-p2-col" style="font-weight: 700; color: ${r.p2_alter_qty > 0 ? '#e11d48' : 'inherit'};">${formatNumber(r.p2_alter_qty)}</td>
        <td class="numeric cmp-p2-col">${badgeP2}</td>

        <!-- Column 10: DIFF % -->
        <td class="numeric cmp-diff-col" style="text-align: center; vertical-align: middle; background: rgba(225, 29, 72, 0.05); border-left: 2px solid rgba(255,255,255,0.15);">${diffBadge}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;

  if (tfoot) {
    const totDiffVal = Math.round((p2.total_alter_percent - p1.total_alter_percent) * 100) / 100;
    let totDiffBadge = "";
    if (totDiffVal > 0) {
      totDiffBadge = `<span style="color: #fca5a5; font-weight: 800;">▲ +${totDiffVal.toFixed(2)}%</span>`;
    } else if (totDiffVal < 0) {
      totDiffBadge = `<span style="color: #6ee7b7; font-weight: 800;">▼ ${totDiffVal.toFixed(2)}%</span>`;
    } else {
      totDiffBadge = `<span style="color: #cbd5e1; font-weight: 800;">0.00%</span>`;
    }

    tfoot.innerHTML = `
      <tr class="tfoot-total" style="background: rgba(6, 95, 70, 0.4); font-weight: 800;">
        <td style="text-align: center;">Σ</td>
        <td>TOTAL (${rows.length} ${t("record_count_suffix")})</td>
        <td class="numeric">${formatNumber(p1.total_sti_qty)}</td>
        <td class="numeric" style="color: #e11d48;">${formatNumber(p1.total_alter_qty)}</td>
        <td class="numeric" style="border-right: 2px solid rgba(255,255,255,0.2) !important;">${formatPercent(p1.total_alter_percent)}</td>
        <td>TOTAL</td>
        <td class="numeric">${formatNumber(p2.total_sti_qty)}</td>
        <td class="numeric" style="color: #e11d48;">${formatNumber(p2.total_alter_qty)}</td>
        <td class="numeric" style="border-right: 2px solid rgba(255,255,255,0.2) !important;">${formatPercent(p2.total_alter_percent)}</td>
        <td class="numeric" style="text-align: center; vertical-align: middle; background: rgba(225, 29, 72, 0.25); border-left: 2px solid rgba(255,255,255,0.2);">${totDiffBadge}</td>
      </tr>
    `;
  }
}

function renderAlterCheckingTop5(rows) {
  const tbody = document.getElementById("alterCheckingTop5TableBody");
  if (!tbody || !rows) return;

  let list = [...rows];
  list.sort((a, b) => (b.p2_alter_qty - a.p2_alter_qty) || (b.p2_alter_percent - a.p2_alter_percent));
  const top5 = list.slice(0, 5);

  if (top5.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-box">${t("no_records")}</td></tr>`;
    return;
  }

  let html = "";
  top5.forEach((r, idx) => {
    const rank = idx + 1;
    let rankBadge = "";
    if (rank === 1) {
      rankBadge = `<span class="rank-badge-top1">🥇 #1</span>`;
    } else if (rank === 2) {
      rankBadge = `<span class="rank-badge-top2">🥈 #2</span>`;
    } else if (rank === 3) {
      rankBadge = `<span class="rank-badge-top3">🥉 #3</span>`;
    } else {
      rankBadge = `<span class="rank-badge-top-other">#${rank}</span>`;
    }

    const badgeP2 = r.p2_alter_percent <= 4.0
      ? `<span class="pct-badge pct-green">${formatPercent(r.p2_alter_percent)}</span>`
      : (r.p2_alter_percent <= 8.0 
          ? `<span class="pct-badge pct-yellow">${formatPercent(r.p2_alter_percent)}</span>`
          : `<span class="pct-badge pct-red">${formatPercent(r.p2_alter_percent)}</span>`);

    const p1Summary = `${formatNumber(r.p1_sti_qty)} / ${formatPercent(r.p1_alter_percent)}`;
    const p2Summary = `${formatNumber(r.p2_sti_qty)} / ${formatPercent(r.p2_alter_percent)}`;

    const statusBadge = r.p2_alter_percent > r.p1_alter_percent
      ? `<span class="badge-tag" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 0.72rem; padding: 2px 7px;">▲ વધ્યો (+${formatPercent(r.p2_alter_percent - r.p1_alter_percent)})</span>`
      : (r.p2_alter_percent < r.p1_alter_percent
          ? `<span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; font-size: 0.72rem; padding: 2px 7px;">▼ ઘટ્યો (-${formatPercent(r.p1_alter_percent - r.p2_alter_percent)})</span>`
          : `<span class="badge-tag" style="background: rgba(148, 163, 184, 0.2); color: #cbd5e1; font-size: 0.72rem; padding: 2px 7px;">= સમાન</span>`);

    html += `
      <tr style="${rank === 1 ? 'background: rgba(16, 185, 129, 0.1);' : ''}">
        <td style="text-align: center;">${rankBadge}</td>
        <td style="text-align: center; font-weight: 600; font-size: 0.8rem; color: #94a3b8; white-space: nowrap;">${r.doj || '-'}</td>
        <td><strong style="color: #6ee7b7;">${r.employee_key}</strong></td>
        <td><span class="floor-badge">${r.floor}</span></td>
        <td class="numeric" style="color: #60a5fa; font-weight: 600;">${p1Summary}</td>
        <td class="numeric" style="color: #38bdf8; font-weight: 600;">${p2Summary}</td>
        <td class="numeric" style="font-weight: 800; color: #f43f5e;">${formatNumber(r.p2_alter_qty)}</td>
        <td class="numeric">${badgeP2}</td>
        <td style="text-align: center;">${statusBadge}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function exportAlterCheckingExcel() {
  const fromDate1 = document.getElementById("chkFromDate1").value;
  const toDate1 = document.getElementById("chkToDate1").value;
  const fromDate2 = document.getElementById("chkFromDate2").value;
  const toDate2 = document.getElementById("chkToDate2").value;
  const alterMode = document.getElementById("chkAlterMode").value;

  const btn = document.getElementById("chkExportExcelBtn");
  const origText = btn.innerHTML;
  btn.innerHTML = `<span>${t("exporting_excel")}</span>`;
  btn.style.pointerEvents = "none";

  const days1 = getDaysCount(fromDate1, toDate1);
  const days2 = getDaysCount(fromDate2, toDate2);
  const p1Header = `${days1} DAYS (${formatDmy(fromDate1)} TO ${formatDmy(toDate1)})`;
  const p2Header = `${days2} DAYS (${formatDmy(fromDate2)} TO ${formatDmy(toDate2)})`;

  if (window.AndroidApp && typeof window.AndroidApp.exportAlterCheckingExcel === "function") {
    window.AndroidApp.exportAlterCheckingExcel(fromDate1, toDate1, fromDate2, toDate2, alterMode, p1Header, p2Header);
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.style.pointerEvents = "auto";
    }, 1500);
    return;
  }

  const url = `/api/export-alter-checking-excel?from_date1=${fromDate1}&to_date1=${toDate1}&from_date2=${fromDate2}&to_date2=${toDate2}&alter_mode=${alterMode}&p1_label=${encodeURIComponent(p1Header)}&p2_label=${encodeURIComponent(p2Header)}`;
  window.location.href = url;

  setTimeout(() => {
    btn.innerHTML = origText;
    btn.style.pointerEvents = "auto";
  }, 3000);
}
