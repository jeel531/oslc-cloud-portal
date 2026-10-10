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
let isPassSaved = false;

// ==========================================
// MULTI-LANGUAGE TRANSLATION DICTIONARY (A TO Z COMPREHENSIVE)
// ==========================================
const I18N = {
    gu: {
        app_title: "OSLC Karigar Gate Pass System | Created By JEEL VAGHANI",
        nav_entry: "🎫 ગેટ પાસ એન્ટ્રી (Gate Pass)",
        nav_reports: "📊 રિપોર્ટ અને હિસ્ટ્રી (Reports)",
        net_label: "અન્ય PC:",
        net_copy: "📋 કોપી",
        net_copied_toast: "✅ લિંક કોપી થઈ ગઈ: બીજા PC કે મોબાઈલમાં ખોલો",
        half_a4_badge: "📄 હાફ A4 પ્રિન્ટ રેડી",
        db_live: "DigiBizz લાઈવ",
        apk_btn: "એન્ડ્રોઇડ APK",
        apk_install: "⬇️ ઇન્સ્ટોલ",
        new_entry_btn: "➕ નવી એન્ટ્રી",
        card1_title: "૧. ગેટ પાસ વિગત અને કારીગર સર્ચ (Karigar Search)",
        lbl_pass_date: "તારીખ (Date):",
        lbl_int_no: "અંદર નં. (Int No.):",
        lbl_karigar_search: "કારીગર નંબર કે કોડ નાખો (દા.ત. 84, 101, 287, P571):",
        search_btn: "શોધો",
        search_placeholder: "કોઈ પણ નંબર લખો જેમ કે 84, 101, 287 કે P414...",
        quick_label: "ઝડપી સર્ચ:",
        quick_84: "84 (M84 કારીગરો)",
        quick_178: "178 (M178 મહફુઝુલ)",
        quick_287: "287 (M287 કારીગરો)",
        quick_101: "101 (૧૪૧ માલ સાથે)",
        quick_135: "135 (M135 ઓલ ક્લિયર)",
        quick_p571: "P571 (કટિંગ ડિપાર્ટમેન્ટ)",
        quick_p414: "P414 (પ્રોડક્શન)",
        matching_workers_header: "સર્ચ પરિણામ (કારીગરો ફોટા સાથે):",
        select_all_workers: "✓ બધા પસંદ કરો (Select All)",
        clear_selected_workers: "✕ બધા હટાવો",
        basket_title: "👥 પસંદ કરેલ કારીગરો:",
        card2_title: "૨. પસંદ કરેલ કારીગરની પ્રોફાઇલ (Worker Details)",
        no_photo: "કોઈ કારીગર પસંદ નથી",
        worker_initial: "કોઈ પણ નંબર નાખી સર્ચ કરો (e.g. 84, 101, 287)",
        lbl_floor_tag: "🏢 માળ:",
        lbl_dept_tag: "🏷️ વિભાગ:",
        lbl_dept: "વિભાગ (Department):",
        lbl_floor: "માળ નં. (Floor No):",
        floor_ground: "ગ્રાઉન્ડ ફ્લોર (GROUND FLOOR)",
        floor_1: "૧ લો માળ (1ST FLOOR)",
        floor_2: "૨ જો માળ (2ND FLOOR)",
        floor_3: "૩ જો માળ (3RD FLOOR)",
        floor_4: "૪ થો માળ (4TH FLOOR)",
        floor_5: "૫ મો માળ (5TH FLOOR)",
        floor_base: "બેઝમેન્ટ (BASEMENT)",
        lbl_out_time: "જવાનો સમય (Out Time):",
        out_time_placeholder: "દા.ત. 11:30 AM",
        lbl_in_time: "આવવાનો સમય (In Time):",
        in_time_placeholder: "દા.ત. 01:00 PM (ખાલી રાખી શકો)",
        lbl_reason: "જવાનું કારણ (Reason / Purpose):",
        reason_placeholder: "દા.ત. અંગત કામ, જમવા, દવાખાને, માર્કેટ...",
        sig_header: "અધિકૃત સહી / પરવાનગી (Authorized Signatures)",
        lbl_sig_perm: "૧. પરવાનગી આપનાર (Permission By):",
        lbl_sig_chk: "૨. ચેકિંગ કરનાર (Checking Done):",
        lbl_sig_iss: "૩. ગેટ પાસ ઇશ્યુ કરનાર (Issued By):",
        sig_other_placeholder: "બીજું નામ લખો...",
        card3_title: "૩. સાધનો અને ID કાર્ડ જમા ચેકલિસ્ટ (Tools & ID Return)",
        checklist_desc: "ℹ️ <strong>સાધનો જમા સ્થિતિ (ફક્ત કારીગર માટે):</strong> જે સાધન જમા થયું હોય તેને સિલેક્ટ રાખો (પ્રિન્ટમાં <strong>[DONE]</strong> આવશે). જો કાંઈ સિલેક્ટ નહિ હોય તો પ્રિન્ટમાંથી આખી લાઇન નીકળી જશે.",
        tool_1: "નાનું કટર (Small Cutter)",
        tool_2: "કાતર (Scissor)",
        tool_3: "સ્ટૂલ / ટેબલ (Stool / Table)",
        tool_4: "આઈડી કાર્ડ (ID Card)",
        btn_check_all: "✓ બધા સિલેક્ટ કરો (Select All)",
        btn_clear_all: "✕ અનચેક કરો (Clear)",
        pill_4_returned: "✅ ૪ સાધનો જમા",
        pill_na: "⚪ લાગુ નથી (N/A)",
        pill_pending: (n) => `⚠️ ${n} સાધન બાકી`,
        banner_valid: "તમામ ૪ સાધનો જમા થયેલ છે [DONE] - પ્રિન્ટ મંજૂર છે.",
        banner_na: "કોઈ સાધન સિલેક્ટ નથી - પ્રિન્ટમાંથી ચેકલિસ્ટ લાઇન નીકળી જશે (Not Applicable).",
        banner_warn: (n) => `${n} સાધન જમા નથી - પ્રિન્ટમાં ખાલી [      ] રહેશે. પ્રિન્ટ ચાલુ રહેશે.`,
        card4_title: "૪. રિપોર્ટ ૧૪૧ પેન્ડિંગ માલ (Report 141 Pending Mall)",
        alert_has_mall: (pcs) => `⚠️ ધ્યાન આપો: કારીગર પાસે પેન્ડિંગ માલ છે (${pcs} Pcs)`,
        alert_clear: "✅ ઓલ ક્લિયર: કોઈ માલ બાકી નથી (STI અને ALTER ક્લિયર)",
        lbl_sti_pending: "Stitching Issue (STI):",
        lbl_alter_pending: "Alter Issue (Alter):",
        lots_text: (n) => `${n} લોટ`,
        th_process: "પ્રોસેસ (Process)",
        th_lot: "લોટ નં (Lot No)",
        th_barcode: "બારકોડ નં (Barcode No)",
        th_item: "આઇટમ / SKU",
        th_size: "સાઈઝ (Size)",
        th_bal: "બાકી પીસ (Bal Pcs)",
        th_issue_date: "તારીખ (Date)",
        status_banner_initial: "વિગતો ભરીને પહેલા <strong>[💾 ૧. SAVE PASS]</strong> દબાવી સેવ કરો, પછી <strong>[🖨️ ૨. PRINT]</strong> નીકળશે.",
        status_banner_saved: (no) => `ગેટ પાસ #${no} સફળતાપૂર્વક સેવ થઈ ગયો છે! હવે નીચેથી <strong>[🖨️ ૨. PRINT GATE PASS]</strong> દબાવો.`,
        status_banner_batch_saved: (n) => `તમામ ${n} કારીગરોના ગેટ પાસ સેવ થઈ ગયા છે! હવે નીચેથી <strong>[🖨️ ૨. PRINT ALL]</strong> દબાવો.`,
        status_banner_unsaved: "વિગતો બદલાઈ છે - પહેલા <strong>[💾 ૧. SAVE PASS]</strong> દબાવી સેવ કરો.",
        btn_save_single: "૧. SAVE GATE PASS (પહેલા સેવ કરો)",
        btn_save_batch: (n) => `૧. SAVE ALL (${n} કારીગરો સેવ કરો)`,
        btn_print_single: "૨. PRINT GATE PASS (ફક્ત ૧ જ પ્રિન્ટ)",
        btn_print_batch: (n) => `૨. PRINT ALL BATCH PASSES (${n} કારીગરો પ્રિન્ટ કાઢો)`,
        btn_print_2up: "PRINT 2 ON 1 (૧ પેજમાં ૨ પાસ / ૨ નકલ)",
        btn_excel: "Download Excel (.xlsx)",
        lbl_print_settings: "⚙️ પ્રિન્ટ સેટિંગ્સ (કાગળ &amp; દિશા):",
        btn_paper_a4: "A4 મોટું પેજ",
        btn_paper_a5: "A5 નાનું પેજ",
        flip_normal: "સીધું (Normal)",
        flip_inverted: "🔄 ૧૮૦° ફ્લિપ (Flip)",
        toast_paper_a4: "📄 મોટું પેજ (A4 Standard) સેટ થયું!",
        toast_paper_a5: "📑 નાનું પેજ (A5 / Half-Sheet) સેટ થયું! પ્રિન્ટ એકદમ ઉપરથી શરૂ થશે.",
        toast_flip_on: "🔄 ૧૮૦° ફ્લિપ ચાલુ! પ્રિન્ટ હવે ઊંધી નહિ આવે.",
        toast_flip_off: "⬆️ સામાન્ય દિશા (Normal) સેટ થઈ.",
        preview_title: "ગેટ પાસ લાઈવ પ્રિવ્યૂ (Half A4 Sheet Format)",
        btn_single_view: "૧ પાસ (હાફ A4)",
        btn_batch_view: "મલ્ટી-પાસ પ્રિવ્યૂ",
        slip_sr_no: "સીરીયલ નં. (Sr. No.) : ",
        slip_int_no: "અંદર નં. (Int No.) : ",
        slip_date: "તારીખ (Date) : ",
        slip_dept: "વિભાગ (Department) : ",
        slip_name: "નામ (Name) : ",
        slip_floor: "માળ નં. (Floor No) : ",
        slip_out_time: "જવાનો સમય (Out Time) : ",
        slip_in_time: "આવવાનો સમય (In Time) : ",
        slip_reason: "કારણ (Reason) : ",
        slip_tool_cutter: "કટર (CUTTER)",
        slip_tool_scissor: "કાતર (SCISSOR)",
        slip_tool_stool: "સ્ટૂલ / ટેબલ (STOOL)",
        slip_tool_id: "આઈડી કાર્ડ (ID CARD)",
        slip_tool_done: "DONE",
        slip_sig_perm: "૧. પરવાનગી આપનાર (Permission By)",
        slip_sig_chk: "૨. ચેકિંગ કરનાર (Checking Done)",
        slip_sig_iss: "૩. ગેટ પાસ ઇશ્યુ કરનાર (Issued By)",
        slip_sign_line: "સહી (Sign): ________________",
        slip_mall_alert: (sti, alter, tot) => `[રિપોર્ટ ૧૪૧ એલર્ટ] પેન્ડિંગ માલ: STI = ${sti} Pcs | ALTER = ${alter} Pcs (કુલ: ${tot} Pcs)`,
        slip_mall_clear: "[રિપોર્ટ ૧૪૧ ઓલ ક્લિયર] કોઈ માલ બાકી નથી (STI: ૦ | ALTER: ૦ Pcs) - ઓલ ક્લિયર",
        slip_th_process: "પ્રોસેસ (Process)",
        slip_th_lot: "લોટ નં (Lot No)",
        slip_th_barcode: "બારકોડ નં (Barcode No)",
        slip_th_item: "આઇટમ (Item / SKU)",
        slip_th_bal: "બાકી પીસ (Bal Pcs)",
        slip_th_date: "તારીખ (Date)",
        slip_photo_caption: "ડિજીબિઝ ફોટો ID",
        slip_reprint_tag: "[ફરી પ્રિન્ટ / REPRINT]",
        slip_footer: "CREATED BY JEEL VAGHANI • OSLC HOUSE",
        btn_clear_today: "🗑️ આજના પાસ ક્લિયર",
        btn_clear_data: "🗑️ ડેટા ક્લિયર કરો (Clear Data)",
        txt_update_btn: "Auto-Update ON",
        txt_btn_clear_input: "✕ ક્લિયર",
        tag_mall_clear: "✅ ઓલ ક્લિયર",
        badge_original: "ઓરિજિનલ (ORIGINAL)",
        badge_reprint: "ફરી પ્રિન્ટ (REPRINT)",
        tools_returned_text: (c) => `${c}/૪ સાધનો`,
        tag_active: "હાજર (Active)",
        tag_inactive: "ગેરહાજર (Inactive)",
        found_workers_text: (n, q) => `મળેલા ${n} કારીગરો (${q}):`,
        no_workers_found: (q) => `'${q}' માટે કોઈ કારીગર મળ્યા નથી`,
        print_orientation_text: "સીધું પ્રિન્ટ (Top)",
        recent_passes_title: "તાજેતરમાં ઇશ્યુ થયેલા ગેટ પાસ (Recent Issued Passes)",
        th_hist_int: "અંદર નં (Int No)",
        th_hist_time: "સમય (Time)",
        th_hist_code: "કોડ (Code)",
        th_hist_name: "નામ (Name)",
        th_hist_dept: "વિભાગ (Dept)",
        th_hist_tools: "સાધનો (Tools)",
        th_hist_mall: "૧૪૧ માલ (141 Mall)",
        th_hist_action: "એક્શન (Action)",
        empty_history: "આ તારીખ માટે કોઈ ગેટ પાસ નીકળેલ નથી.",
        btn_reprint_row: "🔁 ફરી પ્રિન્ટ",
        rpt_page_title: "📊 OSLC કારીગર ગેટ પાસ રજિસ્ટર અને માસ્ટર રિપોર્ટ",
        rpt_page_sub: "ગમે તે દિવસ કે તારીખ સર્ચ કરો • એક્સેલ રજિસ્ટર ડાઉનલોડ • ફરી પ્રિન્ટ (Reprint) કરો",
        rpt_download_btn: "એક્સેલ રજિસ્ટર ડાઉનલોડ (.xlsx)",
        rpt_print_btn: "રજિસ્ટર પ્રિન્ટ કરો (Print)",
        kpi_total: "કુલ ઇશ્યુ થયેલા ગેટ પાસ",
        kpi_mall: "141 માલ બાકી હોય તેવા પાસ",
        kpi_clear: "ઓલ ક્લિયર (0 Pcs) પાસ",
        kpi_reprint: "ફરી પ્રિન્ટ થયેલા (Reprints)",
        rpt_date: "તારીખ મુજબ ફિલ્ટર (Date):",
        rpt_from_date: "શરૂઆત તારીખ (From Date):",
        rpt_to_date: "અંતિમ તારીખ (To Date):",
        rpt_search: "કારીગર / અંદર નં સર્ચ કરો:",
        rpt_search_placeholder: "નામ, કોડ (M84, 101, 287) કે Int No લખો...",
        rpt_mall_filter: "૧૪૧ માલ ફિલ્ટર (141 Mall):",
        mall_opt_all: "બધા જ પાસ (All Passes)",
        mall_opt_with: "⚠️ ફક્ત માલ બાકી હોય તેવા (Pending Mall)",
        mall_opt_clear: "✅ ફક્ત ઓલ ક્લિયર (All Clear Only)",
        rpt_apply_btn: "🔍 શોધો (Search)",
        rpt_reset_btn: "🔄 રીસેટ (Reset)",
        quick_date_filters: "ઝડપી ફિલ્ટર્સ:",
        chip_today: "આજે (Today)",
        chip_yesterday: "ગઈકાલે (Yesterday)",
        chip_this_week: "આ અઠવાડિયે (This Week)",
        chip_this_month: "આ મહિને (This Month)",
        chip_all: "તમામ રેકોર્ડ (All Records)",
        reprint_hint: '💡 "REPRINT" ક્લિક કરવાથી ઓરિજિનલ <strong>Int No. બદલાયા વગર</strong> નવો એન્ટ્રી લોગ થશે અને પ્રિન્ટ નીકળશે!',
        th_rpt_sr: "ક્રમ (Sr)",
        th_rpt_int: "અંદર નં (Int No)",
        th_rpt_date: "તારીખ (Date)",
        th_rpt_time: "સમય (Time)",
        th_rpt_code: "કોડ (Code)",
        th_rpt_name: "નામ (Name)",
        th_rpt_dept: "વિભાગ (Dept)",
        th_rpt_floor: "માળ (Floor)",
        th_rpt_tools: "સાધનો (Tools)",
        th_rpt_mall: "૧૪૧ માલ (141 Mall)",
        th_rpt_type: "પ્રકાર (Type)",
        th_rpt_actions: "એક્શન (Actions)",
        toast_select_worker: "મહેરબાની કરીને પહેલા કારીગર સિલેક્ટ કરો!",
        toast_pass_saved: (no, code) => `✅ Gate Pass #${no} (${code}) સફળતાપૂર્વક સેવ થઈ ગયો!`,
        toast_batch_saved: (n) => `✅ તમામ ${n} કારીગરોના ગેટ પાસ સફળતાપૂર્વક સેવ થઈ ગયા!`,
        toast_tools_selected: "તમામ ૪ સાધનો સિલેક્ટ કરાયા",
        toast_tools_cleared: "સાધનો અનચેક કરાયા",
        toast_reprint_triggered: (no) => `🔁 Reprint Mode Active: Gate Pass #${no}`,
        toast_delete_confirm: "શું તમે ખરેખર આ ગેટ પાસ રેકોર્ડ ડિલીટ કરવા માંગો છો?",
        toast_delete_success: "ગેટ પાસ સફળતાપૂર્વક ડિલીટ થઈ ગયો!",
        basket_prefix: "👥 પસંદ કરેલ કારીગરો",
        basket_suffix: "કારીગરો બેચમાં",
        opt_sig_other: "➕ OTHER (મેન્યુઅલ નામ દાખલ કરો)",
        modal_title: "પ્રિન્ટ બ્લોક છે (Print Blocked)!",
        modal_msg: "કારીગર પાસેથી નીચે મુજબના તમામ ૪ સાધનો જમા લીધા બાદ જ ગેટ પાસની પ્રિન્ટ નીકળશે:",
        modal_tip: "મહેરબાની કરીને સાધનો જમા લઈ ઉપરના ચેકબોક્સમાં ટીક કરો અથવા \"બધા સિલેક્ટ કરો\" દબાવો.",
        modal_btn_select_all: "✓ બધા સાધનો જમા છે (Select All & Unlock)",
        modal_btn_close: "બંધ કરો (Close)",
        workers_selected_label: "કારીગરો પસંદ કર્યા",
        multi_worker_print_hint: "૧ પેજમાં ૨ પાસ મુજબ લાઇનસર Int No સાથે પ્રિન્ટ થશે.",
        no_history_records: "આ તારીખ માટે હજુ સુધી કોઈ ગેટ પાસ ઇશ્યુ થયેલ નથી.",
        no_report_records: "તમારા ફિલ્ટર મુજબ કોઈ રેકોર્ડ મળ્યા નથી.",
        rpt_showing_records: (n) => `કુલ ${n} રેકોર્ડ્સ બતાવે છે`,
    },
    hi: {
        app_title: "OSLC Karigar Gate Pass System | Created By JEEL VAGHANI",
        nav_entry: "🎫 गेट पास एंट्री (Gate Pass)",
        nav_reports: "📊 रिपोर्ट और हिस्ट्री (Reports)",
        net_label: "दूसरा PC:",
        net_copy: "📋 कॉपी",
        net_copied_toast: "✅ लिंक कॉपी हो गई: अन्य कंप्यूटर या मोबाइल में खोलें",
        half_a4_badge: "📄 हाफ A4 प्रिंट रेडी",
        db_live: "DigiBizz लाइव",
        apk_btn: "एंड्रॉइड APK",
        apk_install: "⬇️ इनस्टॉल",
        new_entry_btn: "➕ नई एंट्री",
        card1_title: "१. गेट पास विवरण और कारीगर सर्च (Karigar Search)",
        lbl_pass_date: "तारीख (Date):",
        lbl_int_no: "अंदर नं. (Int No.):",
        lbl_karigar_search: "कारीगर नंबर या कोड डालें (उदा. 84, 101, 287, P571):",
        search_btn: "खोजें",
        search_placeholder: "कोई भी नंबर लिखें जैसे 84, 101, 287 या P414...",
        quick_label: "त्वरित सर्च:",
        quick_84: "84 (M84 कारीगर)",
        quick_178: "178 (M178 महफुजुल)",
        quick_287: "287 (M287 कारीगर)",
        quick_101: "101 (१४१ माल सहित)",
        quick_135: "135 (M135 ऑल क्लियर)",
        quick_p571: "P571 (कटिंग विभाग)",
        quick_p414: "P414 (प्रोडक्शन)",
        matching_workers_header: "सर्च परिणाम (कारीगर फोटो सहित):",
        select_all_workers: "✓ सभी चुनें (Select All)",
        clear_selected_workers: "✕ सभी हटाएं",
        basket_title: "👥 चयनित कारीगर:",
        card2_title: "२. चयनित कारीगर प्रोफाइल (Worker Details)",
        no_photo: "कोई कारीगर चुना नहीं गया",
        worker_initial: "कृपया कोई नंबर दर्ज कर सर्च करें (e.g. 84, 101, 287)",
        lbl_floor_tag: "🏢 मंजिल:",
        lbl_dept_tag: "🏷️ विभाग:",
        lbl_dept: "विभाग (Department):",
        lbl_floor: "मंजिल नं. (Floor No):",
        floor_ground: "ग्राउंड फ्लोर (GROUND FLOOR)",
        floor_1: "१ ली मंजिल (1ST FLOOR)",
        floor_2: "२ री मंजिल (2ND FLOOR)",
        floor_3: "३ री मंजिल (3RD FLOOR)",
        floor_4: "४ थी मंजिल (4TH FLOOR)",
        floor_5: "५ वीं मंजिल (5TH FLOOR)",
        floor_base: "बेसमेंट (BASEMENT)",
        lbl_out_time: "जाने का समय (Out Time):",
        out_time_placeholder: "उदा. 11:30 AM",
        lbl_in_time: "आने का समय (In Time):",
        in_time_placeholder: "उदा. 01:00 PM (खाली छोड़ सकते हैं)",
        lbl_reason: "जाने का कारण (Reason / Purpose):",
        reason_placeholder: "उदा. व्यक्तिगत कार्य, भोजन, अस्पताल, बाजार...",
        sig_header: "अधिकृत हस्ताक्षर / अनुमति (Authorized Signatures)",
        lbl_sig_perm: "१. अनुमति देने वाले (Permission By):",
        lbl_sig_chk: "२. चेकिंग करने वाले (Checking Done):",
        lbl_sig_iss: "३. गेट पास जारीकर्ता (Issued By):",
        sig_other_placeholder: "अन्य नाम लिखें...",
        card3_title: "३. टूल्स और आईडी कार्ड वापसी चेकलिस्ट (Tools & ID Return)",
        checklist_desc: "ℹ️ <strong>टूल्स वापसी स्थिति (सिर्फ कारीगर के लिए):</strong> जो टूल जमा हुआ है उसे सेलेक्ट रखें (प्रिंट में <strong>[DONE]</strong> आएगा)। यदि कुछ भी सेलेक्ट नहीं होगा तो प्रिंट में से यह लाइन हट जाएगी।",
        tool_1: "छोटा कटर (Small Cutter)",
        tool_2: "कैंची (Scissor)",
        tool_3: "स्टूल / टेबल (Stool / Table)",
        tool_4: "आईडी कार्ड (ID Card)",
        btn_check_all: "✓ सभी चुनें (Select All)",
        btn_clear_all: "✕ अनचेक करें (Clear)",
        pill_4_returned: "✅ ४ टूल्स जमा",
        pill_na: "⚪ लागू नहीं (N/A)",
        pill_pending: (n) => `⚠️ ${n} टूल्स बाकी`,
        banner_valid: "सभी ४ टूल्स जमा हैं [DONE] - प्रिंट स्वीकृत है।",
        banner_na: "कोई टूल सेलेक्ट नहीं है - प्रिंट से चेकलिस्ट लाइन हट जाएगी (Not Applicable)।",
        banner_warn: (n) => `${n} टूल जमा नहीं हैं - प्रिंट में खाली [      ] रहेगा। प्रिंट जारी रहेगा।`,
        card4_title: "४. रिपोर्ट १४१ पेंडिंग माल (Report 141 Pending Mall)",
        alert_has_mall: (pcs) => `⚠️ ध्यान दें: कारीगर के पास पेंडिंग माल है (${pcs} Pcs)`,
        alert_clear: "✅ ऑल क्लियर: कोई माल बाकी नहीं है (STI और ALTER क्लियर)",
        lbl_sti_pending: "Stitching Issue (STI):",
        lbl_alter_pending: "Alter Issue (Alter):",
        lots_text: (n) => `${n} लॉट`,
        th_process: "प्रक्रिया (Process)",
        th_lot: "लॉट नं (Lot No)",
        th_barcode: "बारकोड नं (Barcode No)",
        th_item: "आइटम / SKU",
        th_size: "साइज (Size)",
        th_bal: "बाकी पीस (Bal Pcs)",
        th_issue_date: "तारीख (Date)",
        status_banner_initial: "विवरण भरकर पहले <strong>[💾 १. SAVE PASS]</strong> दबाकर सेव करें, फिर <strong>[🖨️ २. PRINT]</strong> निकलेगा।",
        status_banner_saved: (no) => `गेट पास #${no} सफलतापूर्वक सेव हो गया है! अब नीचे से <strong>[🖨️ २. PRINT GATE PASS]</strong> दबाएं।`,
        status_banner_batch_saved: (n) => `सभी ${n} कारीगरों के गेट पास सेव हो गए हैं! अब नीचे से <strong>[🖨️ २. PRINT ALL]</strong> दबाएं।`,
        status_banner_unsaved: "विवरण बदला गया है - पहले <strong>[💾 १. SAVE PASS]</strong> दबाकर सेव करें।",
        btn_save_single: "१. SAVE GATE PASS (पहले सेव करें)",
        btn_save_batch: (n) => `१. SAVE ALL (${n} कारीगर सेव करें)`,
        btn_print_single: "२. PRINT GATE PASS (सिर्फ १ पास प्रिंट करें)",
        btn_print_batch: (n) => `२. PRINT ALL BATCH PASSES (${n} कारीगर प्रिंट निकालें)`,
        btn_print_2up: "PRINT 2 ON 1 (1 पेज में 2 पास / २ कॉपी)",
        btn_excel: "Download Excel (.xlsx)",
        lbl_print_settings: "⚙️ प्रिंट सेटिंग्स (कागज व दिशा):",
        btn_paper_a4: "A4 बड़ा पेज",
        btn_paper_a5: "A5 छोटा पेज",
        flip_normal: "सीधा (Normal)",
        flip_inverted: "🔄 १८०° फ्लिप (Flip)",
        toast_paper_a4: "📄 बड़ा पेज (A4 Standard) सेट हुआ!",
        toast_paper_a5: "📑 छोटा पेज (A5 / Half-Sheet) सेट हुआ! प्रिंट एकदम ऊपर से शुरू होगा।",
        toast_flip_on: "🔄 १८०° फ्लिप चालू! प्रिंट अब उल्टा नहीं आएगा।",
        toast_flip_off: "⬆️ सामान्य दिशा (Normal) सेट हुई।",
        preview_title: "गेट पास लाइव प्रीव्यू (Half A4 Sheet Format)",
        btn_single_view: "1 पास (हाफ A4)",
        btn_batch_view: "मल्टी-पास प्रीव्यू",
        slip_sr_no: "क्रम संख्या (Sr. No.) : ",
        slip_int_no: "आंतरिक सं. (Int No.) : ",
        slip_date: "दिनांक (Date) : ",
        slip_dept: "विभाग (Department) : ",
        slip_name: "नाम (Name) : ",
        slip_floor: "मंजिल सं. (Floor No) : ",
        slip_out_time: "जाने का समय (Out Time) : ",
        slip_in_time: "आने का समय (In Time) : ",
        slip_reason: "कारण (Reason) : ",
        slip_tool_cutter: "कटर (CUTTER)",
        slip_tool_scissor: "कैंची (SCISSOR)",
        slip_tool_stool: "स्टूल / मेज (STOOL)",
        slip_tool_id: "आईडी कार्ड (ID CARD)",
        slip_tool_done: "DONE",
        slip_sig_perm: "१. अनुमति दाता (Permission By)",
        slip_sig_chk: "२. चेकिंग (Checking Done)",
        slip_sig_iss: "३. गेट पास जारीकर्ता (Issued By)",
        slip_sign_line: "हस्ताक्षर (Sign): ________________",
        slip_mall_alert: (sti, alter, tot) => `[रिपोर्ट १४૧ अलर्ट] लंबित माल: STI = ${sti} Pcs | ALTER = ${alter} Pcs (कुल: ${tot} Pcs)`,
        slip_mall_clear: "[रिपोर्ट १४૧ ऑल क्लियर] कोई माल बाकी नहीं (STI: ० | ALTER: ० Pcs) - ऑल क्लियर",
        slip_th_process: "प्रोसेस (Process)",
        slip_th_lot: "लॉट नं (Lot No)",
        slip_th_barcode: "बारकोड नं (Barcode No)",
        slip_th_item: "आइटम (Item / SKU)",
        slip_th_bal: "शेष पीस (Bal Pcs)",
        slip_th_date: "दिनांक (Date)",
        slip_photo_caption: "डिजीबिज फोटो ID",
        slip_reprint_tag: "[पुनः प्रिंट / REPRINT]",
        slip_footer: "CREATED BY JEEL VAGHANI • OSLC HOUSE",
        btn_clear_today: "🗑️ आज के पास हटाएं",
        btn_clear_data: "🗑️ डेटा हटाएं (Clear Data)",
        txt_update_btn: "Auto-Update ON",
        txt_btn_clear_input: "✕ हटाएं",
        tag_mall_clear: "✅ ऑल क्लियर",
        badge_original: "मूल (ORIGINAL)",
        badge_reprint: "पुनः प्रिंट (REPRINT)",
        tools_returned_text: (c) => `${c}/४ टूल्स`,
        tag_active: "सक्रिय (Active)",
        tag_inactive: "निष्क्रिय (Inactive)",
        found_workers_text: (n, q) => `मिले ${n} कारीगर (${q}):`,
        no_workers_found: (q) => `'${q}' के लिए कोई कारीगर नहीं मिला`,
        print_orientation_text: "सीधा प्रिंट (Top)",
        recent_passes_title: "हाल ही में जारी किए गए गेट पास (Recent Issued Passes)",
        th_hist_int: "अंदर नं (Int No)",
        th_hist_time: "समय (Time)",
        th_hist_code: "कोड (Code)",
        th_hist_name: "नाम (Name)",
        th_hist_dept: "विभाग (Dept)",
        th_hist_tools: "टूल्स (Tools)",
        th_hist_mall: "१४૧ माल (141 Mall)",
        th_hist_action: "कार्रवाई (Action)",
        empty_history: "इस तारीख के लिए कोई गेट पास जारी नहीं किया गया है।",
        btn_reprint_row: "🔁 पुनः प्रिंट",
        rpt_page_title: "📊 OSLC कारीगर गेट पास रजिस्टर और मास्टर रिपोर्ट",
        rpt_page_sub: "किसी भी तारीख को सर्च करें • एक्सेल रजिस्टर डाउनलोड • पुनः प्रिंट (Reprint) करें",
        rpt_download_btn: "एक्सेल रजिस्टर डाउनलोड (.xlsx)",
        rpt_print_btn: "रजिस्टर प्रिंट करें (Print)",
        kpi_total: "कुल जारी किए गए गेट पास",
        kpi_mall: "141 माल बाकी वाले पास",
        kpi_clear: "ऑल क्लियर (0 Pcs) पास",
        kpi_reprint: "पुनः प्रिंट किए गए (Reprints)",
        rpt_date: "तारीख अनुसार फ़िल्टर (Date):",
        rpt_from_date: "प्रारंभ तारीख (From Date):",
        rpt_to_date: "अंतिम तारीख (To Date):",
        rpt_search: "कारीगर / अंदर नं खोजें:",
        rpt_search_placeholder: "नाम, कोड (M84, 101, 287) या Int No लिखें...",
        rpt_mall_filter: "१४૧ माल फ़िल्टर (141 Mall):",
        mall_opt_all: "सभी पास (All Passes)",
        mall_opt_with: "⚠️ सिर्फ माल बाकी वाले (Pending Mall)",
        mall_opt_clear: "✅ सिर्फ ऑल क्लियर (All Clear Only)",
        rpt_apply_btn: "🔍 खोजें (Search)",
        rpt_reset_btn: "🔄 रीसेट (Reset)",
        quick_date_filters: "त्वरित फ़िल्टर्स:",
        chip_today: "आज (Today)",
        chip_yesterday: "कल (Yesterday)",
        chip_this_week: "इस हफ्ते (This Week)",
        chip_this_month: "इस महीने (This Month)",
        chip_all: "सभी रिकॉर्ड (All Records)",
        reprint_hint: '💡 "REPRINT" क्लिक करने से ओरिजिनल <strong>Int No. बदले बिना</strong> नई एंट्री रिकॉर्ड होगी और प्रिंट निकलेगा!',
        th_rpt_sr: "क्रम (Sr)",
        th_rpt_int: "अंदर नं (Int No)",
        th_rpt_date: "तारीख (Date)",
        th_rpt_time: "समय (Time)",
        th_rpt_code: "कोड (Code)",
        th_rpt_name: "नाम (Name)",
        th_rpt_dept: "विभाग (Dept)",
        th_rpt_floor: "मंजिल (Floor)",
        th_rpt_tools: "टूल्स (Tools)",
        th_rpt_mall: "१४૧ माल (141 Mall)",
        th_rpt_type: "प्रकार (Type)",
        th_rpt_actions: "कार्रवाई (Actions)",
        toast_select_worker: "कृपया पहले कारीगर चुनें!",
        toast_pass_saved: (no, code) => `✅ Gate Pass #${no} (${code}) सफलतापूर्वक सेव हो गया!`,
        toast_batch_saved: (n) => `✅ सभी ${n} कारीगरों के गेट पास सफलतापूर्वक सेव हो गए!`,
        toast_tools_selected: "सभी ४ टूल्स सेलेक्ट किए गए",
        toast_tools_cleared: "टूल्स अनचेक किए गए",
        toast_reprint_triggered: (no) => `🔁 Reprint Mode Active: Gate Pass #${no}`,
        toast_delete_confirm: "क्या आप वाकई यह गेट पास हटाना चाहते हैं?",
        toast_delete_success: "गेट पास सफलतापूर्वक हटा दिया गया!",
        basket_prefix: "👥 चयनित कारीगर",
        basket_suffix: "कारीगर बैच में",
        opt_sig_other: "➕ OTHER (मैन्युअल नाम दर्ज करें)",
        modal_title: "प्रिंट ब्लॉक है (Print Blocked)!",
        modal_msg: "कारीगर से नीचे दिए गए सभी ४ टूल्स जमा लेने के बाद ही गेट पास का प्रिंट निकलेगा:",
        modal_tip: "कृपया टूल्स जमा लेकर ऊपर चेकबॉक्स में टिक करें या \"सभी चुनें\" दबाएं।",
        modal_btn_select_all: "✓ सभी टूल्स जमा हैं (Select All & Unlock)",
        modal_btn_close: "बंद करें (Close)",
        workers_selected_label: "कारीगर चुने गए",
        multi_worker_print_hint: "1 पेज में 2 पास अनुसार क्रमानुसार Int No के साथ प्रिंट होगा।",
        no_history_records: "इस तारीख के लिए अभी तक कोई गेट पास जारी नहीं किया गया है।",
        no_report_records: "आपके फ़िल्टर के अनुसार कोई रिकॉर्ड नहीं मिला।",
        rpt_showing_records: (n) => `कुल ${n} रिकॉर्ड्स दिख रहे हैं`,
    },
    en: {
        app_title: "OSLC Karigar Gate Pass System | Created By JEEL VAGHANI",
        nav_entry: "🎫 Gate Pass Entry",
        nav_reports: "📊 Reports & History",
        net_label: "Other PC:",
        net_copy: "📋 Copy",
        net_copied_toast: "✅ Link copied to clipboard: Open on other PCs or Mobile",
        half_a4_badge: "📄 HALF A4 PRINT READY",
        db_live: "DigiBizz Live",
        apk_btn: "Android APK",
        apk_install: "⬇️ Install",
        new_entry_btn: "➕ New Entry",
        card1_title: "1. Gate Pass Details & Worker Search",
        lbl_pass_date: "Date:",
        lbl_int_no: "Int No.:",
        lbl_karigar_search: "Enter Number / Code (e.g. 84, 101, 287, P571):",
        search_btn: "Search",
        search_placeholder: "Type number like 84, 101, 287 or P414...",
        quick_label: "Quick Search:",
        quick_84: "84 (M84 Active Workers)",
        quick_178: "178 (M178 Mafujul)",
        quick_287: "287 (M287 Workers)",
        quick_101: "101 (With 141 Mall)",
        quick_135: "135 (M135 All Clear)",
        quick_p571: "P571 (Cutting Dept)",
        quick_p414: "P414 (Production)",
        matching_workers_header: "Matching Workers (with Photos):",
        select_all_workers: "✓ Select All",
        clear_selected_workers: "✕ Clear All",
        basket_title: "👥 Selected Karigars:",
        card2_title: "2. Selected Worker Details",
        no_photo: "No Worker Selected",
        worker_initial: "Please enter a number to search (e.g. 84, 101, 287)",
        lbl_floor_tag: "🏢 Floor:",
        lbl_dept_tag: "🏷️ Dept:",
        lbl_dept: "Department:",
        lbl_floor: "Floor No:",
        floor_ground: "GROUND FLOOR",
        floor_1: "1ST FLOOR",
        floor_2: "2ND FLOOR",
        floor_3: "3RD FLOOR",
        floor_4: "4TH FLOOR",
        floor_5: "5TH FLOOR",
        floor_base: "BASEMENT",
        lbl_out_time: "Out Time:",
        out_time_placeholder: "e.g. 11:30 AM",
        lbl_in_time: "In Time:",
        in_time_placeholder: "e.g. 01:00 PM (Optional)",
        lbl_reason: "Reason / Purpose:",
        reason_placeholder: "e.g. Personal work, Lunch, Medical, Market...",
        sig_header: "Authorized Signatures",
        lbl_sig_perm: "1. Permission By:",
        lbl_sig_chk: "2. Checking Done By:",
        lbl_sig_iss: "3. Gate Pass Issued By:",
        sig_other_placeholder: "Enter custom name...",
        card3_title: "3. Tools & ID Return Checklist (Karigar Only)",
        checklist_desc: "ℹ️ <strong>Asset Return Status (Karigar Only):</strong> Check returned items (prints <strong>[DONE]</strong>). If nothing is selected, this line will be omitted from the printed gate pass.",
        tool_1: "Small Cutter",
        tool_2: "Scissor",
        tool_3: "Stool / Table",
        tool_4: "ID Card",
        btn_check_all: "✓ Select All",
        btn_clear_all: "✕ Clear All",
        pill_4_returned: "✅ 4 Tools Returned",
        pill_na: "⚪ Not Applicable (N/A)",
        pill_pending: (n) => `⚠️ ${n} Tools Missing`,
        banner_valid: "All 4 items returned [DONE] - print authorized.",
        banner_na: "No items selected - checklist line will be omitted from print (Not Applicable).",
        banner_warn: (n) => `${n} items not returned - slip will show empty [      ]. Print can proceed.`,
        card4_title: "4. Report 141 Pending Mall (STI & Alter Issue)",
        alert_has_mall: (pcs) => `⚠️ ATTENTION: PENDING GOODS WITH KARIGAR (${pcs} Pcs)`,
        alert_clear: "✅ ALL CLEAR: NO PENDING GOODS (STI & ALTER CLEAR)",
        lbl_sti_pending: "Stitching Issue (STI):",
        lbl_alter_pending: "Alter Issue (Alter):",
        lots_text: (n) => `${n} Lots`,
        th_process: "Process",
        th_lot: "Lot No",
        th_barcode: "Barcode No",
        th_item: "Item / SKU",
        th_size: "Size",
        th_bal: "Bal Pcs",
        th_issue_date: "Issue Date",
        status_banner_initial: "Fill details, click <strong>[💾 1. SAVE PASS]</strong> first, then <strong>[🖨️ 2. PRINT]</strong> will be enabled.",
        status_banner_saved: (no) => `Gate Pass #${no} successfully saved! Now click <strong>[🖨️ 2. PRINT GATE PASS]</strong> below.`,
        status_banner_batch_saved: (n) => `All ${n} Gate Passes saved successfully! Now click <strong>[🖨️ 2. PRINT ALL]</strong> below.`,
        status_banner_unsaved: "Details modified - please click <strong>[💾 1. SAVE PASS]</strong> first.",
        btn_save_single: "1. SAVE GATE PASS (Save First)",
        btn_save_batch: (n) => `1. SAVE ALL (${n} Workers)`,
        btn_print_single: "2. PRINT GATE PASS (Print 1 Single Pass)",
        btn_print_batch: (n) => `2. PRINT ALL BATCH PASSES (${n} Workers)`,
        btn_print_2up: "PRINT 2 ON 1 (2 Passes on 1 Page)",
        btn_excel: "Download Excel (.xlsx)",
        lbl_print_settings: "⚙️ Print Settings (Paper &amp; Direction):",
        btn_paper_a4: "A4 Standard",
        btn_paper_a5: "A5 Small Page",
        flip_normal: "Normal Upright",
        flip_inverted: "🔄 Flip 180°",
        toast_paper_a4: "📄 Standard A4 Paper Mode Active",
        toast_paper_a5: "📑 Small Page (A5) Mode Active - Top-Pinned & Compact",
        toast_flip_on: "🔄 180° Print Inversion enabled! Fixes upside-down prints.",
        toast_flip_off: "⬆️ Normal upright print orientation restored.",
        preview_title: "Official Gate Pass Live Preview (Half A4 Sheet Format)",
        btn_single_view: "Single Pass (Half A4)",
        btn_batch_view: "Batch / Multi-Pass View",
        slip_sr_no: "Sr. No. : ",
        slip_int_no: "Int No. : ",
        slip_date: "Date : ",
        slip_dept: "Department : ",
        slip_name: "Name : ",
        slip_floor: "Floor No : ",
        slip_out_time: "Out Time : ",
        slip_in_time: "In Time : ",
        slip_reason: "Reason : ",
        slip_tool_cutter: "CUTTER",
        slip_tool_scissor: "SCISSOR",
        slip_tool_stool: "STOOL / TABLE",
        slip_tool_id: "ID CARD",
        slip_tool_done: "DONE",
        slip_sig_perm: "1. Permission By",
        slip_sig_chk: "2. Checking Done By",
        slip_sig_iss: "3. Gate Pass Issued By",
        slip_sign_line: "Sign: ________________",
        slip_mall_alert: (sti, alter, tot) => `[REPORT 141 ALERT] PENDING GOODS: STI = ${sti} Pcs | ALTER = ${alter} Pcs (TOTAL: ${tot} Pcs)`,
        slip_mall_clear: "[REPORT 141 CLEAR] NO PENDING GOODS (STI: 0 | ALTER: 0 PCS) - ALL CLEAR",
        slip_th_process: "Process",
        slip_th_lot: "Lot No",
        slip_th_barcode: "Barcode No",
        slip_th_item: "Item / SKU",
        slip_th_bal: "Bal Pcs",
        slip_th_date: "Issue Date",
        slip_photo_caption: "DIGIBIZZ ID",
        slip_reprint_tag: "[REPRINT]",
        slip_footer: "CREATED BY JEEL VAGHANI • OSLC HOUSE",
        btn_clear_today: "🗑️ Clear Today's Passes",
        btn_clear_data: "🗑️ Clear Data",
        txt_update_btn: "Auto-Update ON",
        txt_btn_clear_input: "✕ Clear",
        tag_mall_clear: "✅ Clear",
        badge_original: "ORIGINAL",
        badge_reprint: "REPRINT",
        tools_returned_text: (c) => `${c}/4 Tools`,
        tag_active: "Active",
        tag_inactive: "Inactive",
        found_workers_text: (n, q) => `Found ${n} Karigars (${q}):`,
        no_workers_found: (q) => `No workers found matching '${q}'`,
        print_orientation_text: "Normal Upright (Top)",
        recent_passes_title: "Recently Issued Passes",
        th_hist_int: "Int No",
        th_hist_time: "Time",
        th_hist_code: "Code",
        th_hist_name: "Name",
        th_hist_dept: "Dept",
        th_hist_tools: "Tools",
        th_hist_mall: "141 Mall",
        th_hist_action: "Action",
        empty_history: "No gate passes issued for this date yet.",
        btn_reprint_row: "🔁 Reprint",
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
        rpt_search_placeholder: "Search by name, code (M84, 101, 287), int no...",
        rpt_mall_filter: "141 Mall Filter:",
        mall_opt_all: "All Passes",
        mall_opt_with: "⚠️ With Pending Mall Only",
        mall_opt_clear: "✅ All Clear Only",
        rpt_apply_btn: "🔍 Search",
        rpt_reset_btn: "🔄 Reset",
        quick_date_filters: "Quick Filters:",
        chip_today: "Today",
        chip_yesterday: "Yesterday",
        chip_this_week: "This Week",
        chip_this_month: "This Month",
        chip_all: "All Records",
        reprint_hint: '💡 Clicking "REPRINT" records a new entry while strictly preserving the original Int No.!',
        th_rpt_sr: "Sr",
        th_rpt_int: "Int No",
        th_rpt_date: "Date",
        th_rpt_time: "Time",
        th_rpt_code: "Code",
        th_rpt_name: "Name",
        th_rpt_dept: "Dept",
        th_rpt_floor: "Floor",
        th_rpt_tools: "Tools",
        th_rpt_mall: "141 Mall",
        th_rpt_type: "Type",
        th_rpt_actions: "Actions",
        toast_select_worker: "Please select a Karigar first!",
        toast_pass_saved: (no, code) => `✅ Gate Pass #${no} (${code}) saved successfully!`,
        toast_batch_saved: (n) => `✅ All ${n} Gate Passes saved successfully!`,
        toast_tools_selected: "All 4 items selected",
        toast_tools_cleared: "Checklist cleared",
        toast_reprint_triggered: (no) => `🔁 Reprint Mode Active: Gate Pass #${no}`,
        toast_delete_confirm: "Are you sure you want to delete this Gate Pass?",
        toast_delete_success: "Gate Pass deleted successfully!",
        basket_prefix: "👥 Selected Karigars",
        basket_suffix: "Karigars in Batch",
        opt_sig_other: "➕ OTHER (Enter Manual Name)",
        modal_title: "Print Blocked!",
        modal_msg: "All 4 tools must be returned before gate pass can be printed:",
        modal_tip: "Please confirm tools returned by checking the boxes above or click \"Select All\".",
        modal_btn_select_all: "✓ All Tools Returned (Select All & Unlock)",
        modal_btn_close: "Close",
        workers_selected_label: "Karigars Selected",
        multi_worker_print_hint: "Gate passes will be printed 2 per page with sequential Int Nos.",
        no_history_records: "No gate passes issued yet for this date.",
        no_report_records: "No records found matching your filters.",
        rpt_showing_records: (n) => `Showing ${n} Records`,
    }
};// ==========================================
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

// Paper Size & 180° Flip Orientation Controls
const lblPrintSettings = document.getElementById('lblPrintSettings');
const btnPaperA4 = document.getElementById('btnPaperA4');
const txtPaperA4 = document.getElementById('txtPaperA4');
const btnPaperA5 = document.getElementById('btnPaperA5');
const txtPaperA5 = document.getElementById('txtPaperA5');
const previewPaperBadge = document.getElementById('previewPaperBadge');
let currentPaperSize = localStorage.getItem('oslc_paper_size') || 'A4';
localStorage.removeItem('oslc_print_flipped');
document.body.classList.remove('print-flipped');

// Primary Buttons
const printPassBtn = document.getElementById('printPassBtn');
const printBtnText = document.getElementById('printBtnText');
const print2On1Btn = document.getElementById('print2On1Btn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const savePassBtn = document.getElementById('savePassBtn');
const txtSavePass = document.getElementById('txtSavePass');
const passSaveStatusBanner = document.getElementById('passSaveStatusBanner');
const passSaveStatusIcon = document.getElementById('passSaveStatusIcon');
const passSaveStatusText = document.getElementById('passSaveStatusText');
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
    initPaperAndOrientation();
    initNetworkInfo();
    initChecklistListeners();
    initSignatures();
    bindEvents();
    loadHistory();
    loadMasterReport();

    // Auto-load live active workers from DigiBizz with photos on launch
    executeSearch('', true);

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

    document.title = dict.app_title || "OSLC Karigar Gate Pass System";

    // 1. Header & Top Bar
    safeSetText('txtNavEntry', dict.nav_entry);
    safeSetText('txtNavReports', dict.nav_reports);
    safeSetText('txtNetLabel', dict.net_label);
    safeSetText('txtNetCopy', dict.net_copy);
    safeSetText('txtHalfA4Badge', dict.half_a4_badge);
    safeSetText('txtApkBtn', dict.apk_btn);
    safeSetText('txtApkInstall', dict.apk_install);
    safeSetText('dbStatusText', dict.db_live);
    safeSetText('txtUpdateBtn', dict.txt_update_btn || 'Auto-Update ON');

    // 2. Card 1
    safeSetText('txtCard1Title', dict.card1_title);
    safeSetText('lblPassDate', dict.lbl_pass_date);
    safeSetText('lblIntNo', dict.lbl_int_no);
    safeSetText('txtBtnNewEntry', dict.new_entry_btn);
    safeSetText('lblKarigarSearch', dict.lbl_karigar_search);
    safeSetText('txtSearchBtn', dict.search_btn);
    safeSetText('btnClearFormInput', dict.txt_btn_clear_input || '✕ Clear');
    if (karigarInput) karigarInput.placeholder = dict.search_placeholder;
    safeSetText('txtQuickLabel', dict.quick_label);
    safeSetText('btnQuick84', dict.quick_84);
    safeSetText('btnQuick178', dict.quick_178);
    safeSetText('btnQuick287', dict.quick_287);
    safeSetText('btnQuick101', dict.quick_101);
    safeSetText('btnQuick135', dict.quick_135);
    safeSetText('btnQuickP571', dict.quick_p571);
    safeSetText('btnQuickP414', dict.quick_p414);
    safeSetText('workersCountText', dict.matching_workers_header);
    safeSetText('btnSelectAllWorkers', dict.select_all_workers);
    safeSetText('txtBtnClearBasket', dict.clear_selected_workers);

    // 3. Card 2
    safeSetText('txtCard2Title', dict.card2_title);
    safeSetText('txtNoPhoto', dict.no_photo);
    if (!currentWorker && workerFullName) workerFullName.textContent = dict.worker_initial;
    safeSetText('lblFloorTag', dict.lbl_floor_tag);
    safeSetText('lblDeptTag', dict.lbl_dept_tag);
    safeSetText('lblDept', dict.lbl_dept);
    safeSetText('lblFloor', dict.lbl_floor);
    safeSetText('optFloorGround', dict.floor_ground);
    safeSetText('optFloor1', dict.floor_1);
    safeSetText('optFloor2', dict.floor_2);
    safeSetText('optFloor3', dict.floor_3);
    safeSetText('optFloor4', dict.floor_4);
    safeSetText('optFloor5', dict.floor_5);
    safeSetText('optFloorBase', dict.floor_base);
    safeSetText('lblOutTime', dict.lbl_out_time);
    if (outTimeInput) outTimeInput.placeholder = dict.out_time_placeholder;
    safeSetText('lblInTime', dict.lbl_in_time);
    if (inTimeInput) inTimeInput.placeholder = dict.in_time_placeholder;
    safeSetText('lblReason', dict.lbl_reason);
    if (reasonInput) reasonInput.placeholder = dict.reason_placeholder;
    safeSetText('txtSigHeader', dict.sig_header);
    safeSetText('lblSigPerm', dict.lbl_sig_perm);
    safeSetText('lblSigChk', dict.lbl_sig_chk);
    safeSetText('lblSigIss', dict.lbl_sig_iss);
    if (signPermissionOtherInput) signPermissionOtherInput.placeholder = dict.sig_other_placeholder;
    if (signCheckingOtherInput) signCheckingOtherInput.placeholder = dict.sig_other_placeholder;
    if (signIssuedOtherInput) signIssuedOtherInput.placeholder = dict.sig_other_placeholder;

    // 4. Card 3
    safeSetText('txtCard3Title', dict.card3_title);
    if (document.getElementById('txtChecklistDesc')) document.getElementById('txtChecklistDesc').innerHTML = dict.checklist_desc;
    safeSetText('txtTool1Name', dict.tool_1);
    safeSetText('txtTool2Name', dict.tool_2);
    safeSetText('txtTool3Name', dict.tool_3);
    safeSetText('txtTool4Name', dict.tool_4);
    safeSetText('txtBtnCheckAll', dict.btn_check_all);
    safeSetText('txtBtnClearAll', dict.btn_clear_all);

    // 5. Card 4
    safeSetText('txtCard4Title', dict.card4_title);
    safeSetText('lblStiPendingTitle', dict.lbl_sti_pending);
    safeSetText('lblAlterPendingTitle', dict.lbl_alter_pending);
    safeSetText('thProcess', dict.th_process);
    safeSetText('thLot', dict.th_lot);
    safeSetText('thBarcode', dict.th_barcode);
    safeSetText('thItem', dict.th_item);
    safeSetText('thSize', dict.th_size);
    safeSetText('thBal', dict.th_bal);
    safeSetText('thDate', dict.th_issue_date);

    // 6. Action Buttons & Workflow
    updatePrintButtonText();
    safeSetText('txtPrint2UpBtn', dict.btn_print_2up);
    safeSetText('txtDownloadExcel', dict.btn_excel);
    safeSetText('lblPrintSettings', dict.lbl_print_settings);
    safeSetText('txtPaperA4', dict.btn_paper_a4);
    safeSetText('txtPaperA5', dict.btn_paper_a5);
    safeSetText('txtPrintOrientation', 'સીધું પ્રિન્ટ (Top)');
    if (previewPaperBadge) {
        previewPaperBadge.textContent = currentPaperSize === 'A5' ? (dict.btn_paper_a5 || '📑 A5 નાનું પેજ') : (dict.btn_paper_a4 || '📄 A4 મોટું પેજ');
    }
    updateSaveStatusBanner(isPassSaved ? 'saved' : 'initial');

    // 7. Preview
    safeSetText('txtPreviewTitle', dict.preview_title);
    safeSetText('toggleSingleView', dict.btn_single_view);
    safeSetText('toggleMultiView', dict.btn_batch_view);
    renderActiveGatepassPreview();

    // 8. History Section
    safeSetText('txtRecentPassesTitle', dict.recent_passes_title);
    safeSetText('btnClearTodayPasses', dict.btn_clear_today || '🗑️ આજના પાસ ક્લિયર');
    safeSetText('thHistInt', dict.th_hist_int);
    safeSetText('thHistTime', dict.th_hist_time);
    safeSetText('thHistCode', dict.th_hist_code);
    safeSetText('thHistName', dict.th_hist_name);
    safeSetText('thHistDept', dict.th_hist_dept);
    safeSetText('thHistTools', dict.th_hist_tools);
    safeSetText('thHistMall', dict.th_hist_mall);
    safeSetText('thHistAction', dict.th_hist_action);

    // 9. Reports Tab
    safeSetText('txtRptPageTitle', dict.rpt_page_title);
    safeSetText('txtRptPageSub', dict.rpt_page_sub);
    safeSetText('txtRptDownloadBtn', dict.rpt_download_btn);
    safeSetText('txtRptPrintBtn', dict.rpt_print_btn);
    safeSetText('btnClearAllHistoryPasses', dict.btn_clear_data || '🗑️ ડેટા ક્લિયર કરો (Clear Data)');
    safeSetText('lblKpiTotal', dict.kpi_total);
    safeSetText('lblKpiMall', dict.kpi_mall);
    safeSetText('lblKpiClear', dict.kpi_clear);
    safeSetText('lblKpiReprint', dict.kpi_reprint);
    safeSetText('lblRptDate', dict.rpt_date);
    safeSetText('lblRptFromDate', dict.rpt_from_date);
    safeSetText('lblRptToDate', dict.rpt_to_date);
    safeSetText('lblRptSearch', dict.rpt_search);
    if (rptFilterSearch) rptFilterSearch.placeholder = dict.rpt_search_placeholder;
    safeSetText('lblRptMallFilter', dict.rpt_mall_filter);
    safeSetText('optMallAll', dict.mall_opt_all);
    safeSetText('optMallWith', dict.mall_opt_with);
    safeSetText('optMallClear', dict.mall_opt_clear);
    safeSetText('txtRptApplyBtn', dict.rpt_apply_btn);
    safeSetText('txtRptResetBtn', dict.rpt_reset_btn);
    safeSetText('txtQuickDateFilters', dict.quick_date_filters);
    safeSetText('chipToday', dict.chip_today);
    safeSetText('chipYesterday', dict.chip_yesterday);
    safeSetText('chipThisWeek', dict.chip_this_week);
    safeSetText('chipThisMonth', dict.chip_this_month);
    safeSetText('chipAll', dict.chip_all);
    if (document.getElementById('txtReprintHint')) document.getElementById('txtReprintHint').innerHTML = dict.reprint_hint;

    safeSetText('thRptSr', dict.th_rpt_sr);
    safeSetText('thRptInt', dict.th_rpt_int);
    safeSetText('thRptDate', dict.th_rpt_date);
    safeSetText('thRptTime', dict.th_rpt_time);
    safeSetText('thRptCode', dict.th_rpt_code);
    safeSetText('thRptName', dict.th_rpt_name);
    safeSetText('thRptDept', dict.th_rpt_dept);
    safeSetText('thRptFloor', dict.th_rpt_floor);
    safeSetText('thRptTools', dict.th_rpt_tools);
    safeSetText('thRptMall', dict.th_rpt_mall);
    safeSetText('thRptType', dict.th_rpt_type);
    safeSetText('thRptActions', dict.th_rpt_actions);

    // Signature Other manual options
    safeSetText('optSigPermOther', dict.opt_sig_other);
    safeSetText('optSigChkOther', dict.opt_sig_other);
    safeSetText('optSigIssOther', dict.opt_sig_other);

    // Basket title
    safeSetText('lblBasketPrefix', dict.basket_prefix);
    safeSetText('lblBasketSuffix', dict.basket_suffix);

    // Modal dialog
    safeSetText('txtModalTitle', dict.modal_title);
    safeSetText('txtModalMsg', dict.modal_msg);
    safeSetText('txtModalTip', dict.modal_tip);
    safeSetText('modalSelectAllBtn', dict.modal_btn_select_all);
    safeSetText('modalCloseBtn', dict.modal_btn_close);

    updateChecklistStatus();
    updateSelectedWorkersUI();
    loadHistory();
    if (tabReportBtn && tabReportBtn.classList.contains('active')) {
        loadMasterReport(false);
    }
}
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el && text !== undefined) el.textContent = text;
}

function updatePrintButtonText() {
    const dict = I18N[currentLang] || I18N['gu'];
    if (selectedWorkers.length > 1) {
        if (printBtnText) {
            printBtnText.textContent = typeof dict.btn_print_batch === 'function' ? dict.btn_print_batch(selectedWorkers.length) : `૨. PRINT ALL BATCH PASSES (${selectedWorkers.length})`;
        }
        if (txtSavePass) {
            txtSavePass.textContent = typeof dict.btn_save_batch === 'function' ? dict.btn_save_batch(selectedWorkers.length) : `૧. SAVE ALL (${selectedWorkers.length})`;
        }
    } else {
        if (printBtnText) {
            printBtnText.textContent = dict.btn_print_single || '૨. PRINT GATE PASS';
        }
        if (txtSavePass) {
            txtSavePass.textContent = dict.btn_save_single || '૧. SAVE GATE PASS';
        }
    }
}

function updateSaveStatusBanner(status, customMsg = '') {
    if (!passSaveStatusBanner) return;
    const dict = I18N[currentLang] || I18N['gu'];
    const currentNum = (isReprintMode && activeReprintIntNo) ? activeReprintIntNo : (intNo ? intNo.value : '01');

    if (status === 'saved') {
        passSaveStatusBanner.className = 'pass-save-status-banner saved';
        if (passSaveStatusIcon) passSaveStatusIcon.textContent = '✅';
        const defaultMsg = typeof dict.status_banner_saved === 'function' 
            ? dict.status_banner_saved(currentNum) 
            : 'ગેટ પાસ સફળતાપૂર્વક સેવ થઈ ગયો છે! હવે નીચેથી <strong>[🖨️ ૨. PRINT GATE PASS]</strong> દબાવો.';
        if (passSaveStatusText) passSaveStatusText.innerHTML = customMsg || defaultMsg;
        if (printPassBtn) printPassBtn.classList.add('pulse-ready');
    } else if (status === 'unsaved') {
        passSaveStatusBanner.className = 'pass-save-status-banner unsaved';
        if (passSaveStatusIcon) passSaveStatusIcon.textContent = '✏️';
        if (passSaveStatusText) passSaveStatusText.innerHTML = customMsg || (dict.status_banner_unsaved || 'વિગતો બદલાઈ છે - પહેલા <strong>[💾 ૧. SAVE PASS]</strong> દબાવી સેવ કરો.');
        if (printPassBtn) printPassBtn.classList.remove('pulse-ready');
    } else {
        passSaveStatusBanner.className = 'pass-save-status-banner';
        if (passSaveStatusIcon) passSaveStatusIcon.textContent = '📝';
        if (passSaveStatusText) passSaveStatusText.innerHTML = customMsg || (dict.status_banner_initial || 'વિગતો ભરીને પહેલા <strong>[💾 ૧. SAVE PASS]</strong> દબાવો, પછી <strong>[🖨️ ૨. PRINT]</strong> નીકળશે.');
        if (printPassBtn) printPassBtn.classList.remove('pulse-ready');
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

    renderActiveGatepassPreview();
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
    const dict = I18N[currentLang] || I18N['gu'];

    if (chk.allChecked) {
        if (checklistHeaderPill) {
            checklistHeaderPill.textContent = dict.pill_4_done || '✅ ૪ સાધનો જમા';
            checklistHeaderPill.className = 'checklist-status-pill ready';
        }
        if (checklistValidationBanner) {
            checklistValidationBanner.className = 'checklist-banner valid';
            if (checklistBannerIcon) checklistBannerIcon.textContent = '✅';
            if (checklistBannerText) checklistBannerText.textContent = dict.banner_valid || 'તમામ ૪ સાધનો જમા થયેલ છે [DONE] - પ્રિન્ટ મંજૂર છે.';
        }
    } else if (!hasAny) {
        // Nothing is checked (e.g. Staff/Office worker or unassigned tools)
        if (checklistHeaderPill) {
            checklistHeaderPill.textContent = dict.pill_na || '⚪ લાગુ નથી (N/A)';
            checklistHeaderPill.className = 'checklist-status-pill na';
        }
        if (checklistValidationBanner) {
            checklistValidationBanner.className = 'checklist-banner na';
            if (checklistBannerIcon) checklistBannerIcon.textContent = 'ℹ️';
            if (checklistBannerText) checklistBannerText.textContent = dict.banner_na || 'કોઈ સાધન સિલેક્ટ નથી - પ્રિન્ટમાંથી ચેકલિસ્ટ લાઇન નીકળી જશે (Not Applicable).';
        }
    } else {
        if (checklistHeaderPill) {
            checklistHeaderPill.textContent = typeof dict.pill_missing === 'function' ? dict.pill_missing(chk.missing.length) : `⚠️ ${chk.missing.length} બાકી`;
            checklistHeaderPill.className = 'checklist-status-pill';
        }
        if (checklistValidationBanner) {
            checklistValidationBanner.className = 'checklist-banner warning';
            if (checklistBannerIcon) checklistBannerIcon.textContent = 'ℹ️';
            if (checklistBannerText) checklistBannerText.textContent = typeof dict.banner_warn === 'function' ? dict.banner_warn(chk.missing.length) : `${chk.missing.length} સાધન જમા નથી - પ્રિન્ટમાં ખાલી [      ] રહેશે. પ્રિન્ટ ચાલુ રહેશે.`;
        }
    }

    updateSlipChecklistDisplay(chk);
    renderActiveGatepassPreview();
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

    const dict = I18N[currentLang] || I18N['gu'];
    const doneText = dict.slip_tool_done || 'DONE';
    const cCutter = chk.small_cutter ? doneText : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    const cScissor = chk.scissor ? doneText : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    const cStool = chk.stool ? doneText : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    const cIdCard = chk.id_card ? doneText : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';

    previewChecklistRow.innerHTML = `
        <span class="chk-item">${dict.slip_tool_cutter}: <strong>[${cCutter}]</strong></span>
        <span class="chk-sep">•</span>
        <span class="chk-item">${dict.slip_tool_scissor}: <strong>[${cScissor}]</strong></span>
        <span class="chk-sep">•</span>
        <span class="chk-item">${dict.slip_tool_stool}: <strong>[${cStool}]</strong></span>
        <span class="chk-sep">•</span>
        <span class="chk-item">${dict.slip_tool_id}: <strong>[${cIdCard}]</strong></span>
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
            clearSearchAndProfile(true);
            await updateNextIntNo();
            if (karigarInput) karigarInput.focus();
            showToast('✅ નવો ગેટ પાસ! તમામ ડેટા ક્લિયર થયો અને નવો નંબર લોડ થયો.', 'success');
        });
    }

    const btnClearFormInput = document.getElementById('btnClearFormInput');
    if (btnClearFormInput) {
        btnClearFormInput.addEventListener('click', () => {
            clearSearchAndProfile(false);
            if (karigarInput) karigarInput.focus();
            showToast('ડેટા ક્લિયર કર્યો (Selection Cleared)', 'info');
        });
    }

    // Live search input
    karigarInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchDebounceTimer);
        if (!query) {
            // When cleared, show the active live workers list from DigiBizz
            executeSearch('', false);
            return;
        }
        searchDebounceTimer = setTimeout(() => {
            executeSearch(query, true);
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
        renderActiveGatepassPreview();
    });

    // Realtime field sync to preview - updates preview instantly
    intNo.addEventListener('input', () => {
        renderActiveGatepassPreview();
    });

    deptInput.addEventListener('input', () => {
        if (workerDeptDisplay) workerDeptDisplay.textContent = deptInput.value || 'KARIGAR';
        renderActiveGatepassPreview();
    });

    floorSelect.addEventListener('change', () => {
        if (workerFloorDisplay) workerFloorDisplay.textContent = floorSelect.value;
        renderActiveGatepassPreview();
    });

    outTimeInput.addEventListener('input', () => {
        renderActiveGatepassPreview();
    });

    inTimeInput.addEventListener('input', () => {
        renderActiveGatepassPreview();
    });

    if (reasonInput) {
        reasonInput.addEventListener('input', () => {
            renderActiveGatepassPreview();
        });
    }

    const btnClearSelectedWorkers = document.getElementById('btnClearSelectedWorkers');
    if (btnClearSelectedWorkers) {
        btnClearSelectedWorkers.addEventListener('click', () => {
            clearSearchAndProfile(false);
            showToast('કારીગર પસંદગી ક્લિયર કરી (Selection Cleared)', 'info');
        });
    }

    const btnClearTodayPasses = document.getElementById('btnClearTodayPasses');
    if (btnClearTodayPasses) {
        btnClearTodayPasses.addEventListener('click', () => {
            clearGatePassHistory('today');
        });
    }

    const btnClearAllHistoryPasses = document.getElementById('btnClearAllHistoryPasses');
    if (btnClearAllHistoryPasses) {
        btnClearAllHistoryPasses.addEventListener('click', () => {
            clearGatePassHistory('all');
        });
    }


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
function clearSearchAndProfile(fullFormReset = false) {
    currentWorker = null;
    currentWorkersList = [];
    selectedWorkers = [];
    isPassSaved = false;

    if (karigarInput) {
        karigarInput.value = '';
    }
    if (workersResultsContainer) {
        workersResultsContainer.classList.add('u-hidden');
        workersResultsContainer.style.display = 'none';
    }
    if (multiWorkerBanner) {
        multiWorkerBanner.classList.add('u-hidden');
        multiWorkerBanner.style.display = 'none';
    }
    if (selectedCountBadge) {
        selectedCountBadge.classList.add('u-hidden');
        selectedCountBadge.style.display = 'none';
    }
    const selectedWorkersBasket = document.getElementById('selectedWorkersBasket');
    if (selectedWorkersBasket) {
        selectedWorkersBasket.classList.add('u-hidden');
        selectedWorkersBasket.style.display = 'none';
    }
    const selectedWorkersChips = document.getElementById('selectedWorkersChips');
    if (selectedWorkersChips) {
        selectedWorkersChips.innerHTML = '';
    }
    const searchDropdown = document.getElementById('searchDropdown');
    if (searchDropdown) {
        searchDropdown.innerHTML = '';
        searchDropdown.style.display = 'none';
    }

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
        if (stiPendingVal) stiPendingVal.textContent = '0 Pcs';
        if (stiLotsVal) stiLotsVal.textContent = '0 Lots';
        if (alterPendingVal) alterPendingVal.textContent = '0 Pcs';
        if (alterLotsVal) alterLotsVal.textContent = '0 Lots';
        if (totalPendingBadge) totalPendingBadge.textContent = '0 Pcs';
        if (pendingTableContainer) pendingTableContainer.style.display = 'none';
    }

    if (fullFormReset) {
        // Reset checklist to default (all checked)
        if (checkSmallCutter) checkSmallCutter.checked = true;
        if (checkScissor) checkScissor.checked = true;
        if (checkStool) checkStool.checked = true;
        if (checkIdCard) checkIdCard.checked = true;
        updateChecklistStatus();

        // Reset times and reason
        const now = new Date();
        if (outTimeInput) outTimeInput.value = formatTime12Hour(now);
        if (inTimeInput) inTimeInput.value = '';
        if (reasonInput) reasonInput.value = 'Personal Work';
    }

    // Crucial: RENDER THE BLANK PLACEHOLDER SLIP IMMEDIATELY SO PREVIEW CLEARS!
    renderActiveGatepassPreview();

    updatePrintButtonText();
    updateSaveStatusBanner('initial');
}

// ==========================================
// WORKER SEARCH & MULTI-WORKER SELECTION
// ==========================================
async function executeSearch(query = '', autoSelectFirst = false) {
    if (isReprintMode) {
        isReprintMode = false;
        activeReprintIntNo = null;
        if (previewReprintBadge) previewReprintBadge.style.display = 'none';
        await updateNextIntNo();
    }

    try {
        const res = await fetch(`/api/search_workers?q=${encodeURIComponent(query || '')}`);
        const data = await res.json();
        const workers = data.results || [];
        currentWorkersList = workers;

        renderWorkersGrid(workers, query);

        if (workers.length > 0) {
            // Auto-select first active worker if requested or if nothing selected yet
            if ((autoSelectFirst || selectedWorkers.length === 0)) {
                const activeWorkers = workers.filter(w => w.is_active);
                const target = activeWorkers.length ? activeWorkers[0] : workers[0];
                selectedWorkers = [target];
                currentWorker = target;
                ensureWorkerFullDetails(target).then(() => {
                    populateWorkerProfile(target);
                    updateSelectedWorkersUI();
                    renderActiveGatepassPreview();
                });
            } else {
                updateSelectedWorkersUI();
            }
        }
    } catch (err) {
        console.error('Search error:', err);
    }
}

function renderWorkersGrid(workers, query) {
    const dict = I18N[currentLang] || I18N['gu'];
    if (!workers.length) {
        const noMsg = typeof dict.no_workers_found === 'function' ? dict.no_workers_found(query) : `'${query}' માટે કોઈ કારીગર મળ્યા નથી`;
        workersCountText.textContent = noMsg;
        workersGrid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-dim); font-size: 13px;">
                ${noMsg}
            </div>
        `;
        workersResultsContainer.style.display = 'block';
        return;
    }

    if (!query) {
        if (currentLang === 'gu') {
            workersCountText.textContent = `ડિજીબિઝ લાઈવ કારીગરો (${workers.length} ઉપલબ્ધ - ફોટા સાથે):`;
        } else if (currentLang === 'hi') {
            workersCountText.textContent = `डिजीबिज लाइव कारीगर (${workers.length} उपलब्ध - फोटो सहित):`;
        } else {
            workersCountText.textContent = `DigiBizz Live Workers (${workers.length} Available with Photos):`;
        }
    } else {
        workersCountText.textContent = typeof dict.found_workers_text === 'function' ? dict.found_workers_text(workers.length, query) : `Found ${workers.length} Karigars (${query}):`;
    }
    workersGrid.innerHTML = workers.map(w => {
        const isSelected = selectedWorkers.some(sw => sw.id === w.id);
        const photoSrc = w.has_photo && w.photo_base64 
            ? `data:image/jpeg;base64,${w.photo_base64}` 
            : '';
        const photoHtml = photoSrc 
            ? `<img src="${photoSrc}" alt="${w.name}" class="worker-grid-img">`
            : `<div class="worker-grid-no-photo">👤</div>`;

        const dispFl = formatFloorDisplay(w.floor, currentLang);
        const actLabel = w.is_active ? (dict.tag_active || 'Active') : (dict.tag_inactive || 'Inactive');

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
                        <span class="tag-floor">${dispFl}</span>
                        ${w.is_active ? `<span class="tag-active">${actLabel}</span>` : `<span class="tag-inactive">${actLabel}</span>`}
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
    workersResultsContainer.classList.remove('u-hidden');
    updateSelectedWorkersUI();
}

async function ensureWorkerFullDetails(worker) {
    if (!worker || !worker.id) return worker;
    if (worker._fullyLoaded && worker.pending_items !== undefined) {
        return worker;
    }
    try {
        const res = await fetch(`/api/worker/${worker.id}`);
        if (res.ok) {
            const fullData = await res.json();
            Object.assign(worker, fullData, { _fullyLoaded: true });
        }
    } catch (e) {
        console.error('Error fetching full worker details:', e);
    }
    return worker;
}

async function toggleWorkerSelection(workerId, forcedState = null) {
    let worker = selectedWorkers.find(w => w.id === workerId);
    if (!worker) {
        worker = currentWorkersList.find(w => w.id === workerId);
    }
    if (!worker) return;

    const existingIdx = selectedWorkers.findIndex(w => w.id === workerId);
    const shouldSelect = forcedState !== null ? forcedState : (existingIdx === -1);

    if (shouldSelect) {
        if (existingIdx === -1) {
            selectedWorkers.push(worker);
        }
        currentWorker = worker;
        await ensureWorkerFullDetails(worker);
        populateWorkerProfile(worker);
    } else {
        if (existingIdx !== -1) {
            selectedWorkers.splice(existingIdx, 1);
        }
        if (selectedWorkers.length > 0) {
            currentWorker = selectedWorkers[selectedWorkers.length - 1];
            await ensureWorkerFullDetails(currentWorker);
            populateWorkerProfile(currentWorker);
        } else {
            currentWorker = null;
            clearSearchAndProfile();
            return;
        }
    }

    updateSelectedWorkersUI();
    renderActiveGatepassPreview();
}

async function toggleSelectAllWorkers() {
    if (!currentWorkersList.length) return;

    const allInResultsSelected = currentWorkersList.every(w => selectedWorkers.some(sw => sw.id === w.id));

    if (allInResultsSelected) {
        // Deselect only workers that are in current search results
        selectedWorkers = selectedWorkers.filter(sw => !currentWorkersList.some(cw => cw.id === sw.id));
        if (selectedWorkers.length > 0) {
            currentWorker = selectedWorkers[selectedWorkers.length - 1];
            populateWorkerProfile(currentWorker);
        } else {
            currentWorker = null;
            clearSearchAndProfile();
            return;
        }
    } else {
        const activeOnly = currentWorkersList.filter(w => w.is_active);
        const targets = activeOnly.length ? activeOnly : currentWorkersList;

        for (const w of targets) {
            if (!selectedWorkers.some(sw => sw.id === w.id)) {
                selectedWorkers.push(w);
            }
        }

        updateSelectedWorkersUI();
        renderActiveGatepassPreview();

        // Load 141 Mall details in parallel
        await Promise.all(selectedWorkers.map(w => ensureWorkerFullDetails(w)));

        if (selectedWorkers.length > 0) {
            currentWorker = selectedWorkers[0];
            populateWorkerProfile(selectedWorkers[0]);
        }
    }

    updateSelectedWorkersUI();
    renderActiveGatepassPreview();
}

function updateSelectedWorkersUI() {
    // 1. Grid card styles & checkboxes
    if (workersGrid) {
        workersGrid.querySelectorAll('.worker-card-item').forEach(card => {
            const id = parseInt(card.getAttribute('data-id'), 10);
            const isSel = selectedWorkers.some(w => w.id === id);
            card.classList.toggle('selected', isSel);
            const chk = card.querySelector('.worker-select-checkbox');
            if (chk) chk.checked = isSel;
        });
    }

    // 2. Count badge in grid header
    if (selectedCountBadge) {
        if (selectedWorkers.length > 0) {
            selectedCountBadge.textContent = `${selectedWorkers.length} Selected`;
            selectedCountBadge.style.display = 'inline-block';
        } else {
            selectedCountBadge.style.display = 'none';
        }
    }

    // 3. Basket container chips
    const selectedWorkersBasket = document.getElementById('selectedWorkersBasket');
    const selectedWorkersChips = document.getElementById('selectedWorkersChips');
    const basketCount = document.getElementById('basketCount');

    if (selectedWorkersBasket && selectedWorkersChips) {
        if (selectedWorkers.length > 0) {
            if (basketCount) basketCount.textContent = selectedWorkers.length;
            selectedWorkersBasket.style.display = 'block';

            selectedWorkersChips.innerHTML = selectedWorkers.map(w => {
                const hasMall = Boolean(w.has_pending_mall || (w.total_pending_pcs > 0));
                const mallLabel = hasMall 
                    ? `⚠️ ${w.total_pending_pcs} Pcs Mall` 
                    : (w._fullyLoaded ? `✅ Clear (0 Pcs)` : `...`);
                const isCurrent = currentWorker && currentWorker.id === w.id;

                return `
                    <div class="worker-chip ${hasMall ? 'has-mall' : 'clear'} ${isCurrent ? 'active-view' : ''}" data-id="${w.id}">
                        <span class="chip-code">${w.code}</span>
                        <span class="chip-name" title="${w.name}">${w.name}</span>
                        <span class="chip-mall-badge">${mallLabel}</span>
                        <button type="button" class="chip-remove-btn" data-id="${w.id}" title="Remove worker">&times;</button>
                    </div>
                `;
            }).join('');

            // Click chip to switch Card 2 & Card 4 view
            selectedWorkersChips.querySelectorAll('.worker-chip').forEach(chip => {
                chip.addEventListener('click', (e) => {
                    if (e.target.classList.contains('chip-remove-btn')) return;
                    const id = parseInt(chip.getAttribute('data-id'), 10);
                    const w = selectedWorkers.find(x => x.id === id);
                    if (w) {
                        currentWorker = w;
                        populateWorkerProfile(w);
                        updateSelectedWorkersUI();
                    }
                });
            });

            // Click remove button on chip
            selectedWorkersChips.querySelectorAll('.chip-remove-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.getAttribute('data-id'), 10);
                    toggleWorkerSelection(id, false);
                });
            });
        } else {
            selectedWorkersBasket.style.display = 'none';
        }
    }

    // 4. Multi-Worker Banner
    if (multiWorkerBanner) {
        if (selectedWorkers.length > 1) {
            const dict = I18N[currentLang] || I18N['gu'];
            const names = selectedWorkers.map(w => `${w.code} (${(w.has_pending_mall || w.total_pending_pcs > 0) ? '⚠️' + (w.total_pending_pcs || 'Mall') + ' Pcs' : '✅Clear'})`).join(', ');
            multiWorkerBannerText.innerHTML = `<strong>${selectedWorkers.length} ${dict.workers_selected_label || 'Karigars Selected'}:</strong> ${names}. <br>${dict.multi_worker_print_hint || '૧ પેજમાં ૨ પાસ મુજબ લાઇનસર Int No સાથે પ્રિન્ટ થશે.'}`;
            multiWorkerBanner.style.display = 'flex';
        } else {
            multiWorkerBanner.style.display = 'none';
        }
    }

    updatePrintButtonText();
}

async function selectWorkerById(workerId, updateGridHighlight = true) {
    try {
        let worker = selectedWorkers.find(w => w.id === workerId);
        if (!worker) {
            worker = currentWorkersList.find(w => w.id === workerId);
        }
        if (!worker) {
            const res = await fetch(`/api/worker/${workerId}`);
            if (res.ok) worker = await res.json();
        } else {
            await ensureWorkerFullDetails(worker);
        }
        if (worker) {
            currentWorker = worker;
            populateWorkerProfile(worker);
            updateSlipSignatures();
            renderActiveGatepassPreview();
        }
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

    const dict = I18N[currentLang] || I18N['gu'];
    if (data.has_pending_mall) {
        pendingAlertBox.className = 'pending-alert-box has-mall';
        const msg = typeof dict.alert_has_mall === 'function' ? dict.alert_has_mall(data.total_pending_pcs) : `⚠️ ધ્યાન આપો: કારીગર પાસે પેન્ડિંગ માલ છે (${data.total_pending_pcs} Pcs)`;
        alertTitle.innerHTML = `<span>${msg}</span>`;

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
        const slipAlert = typeof dict.slip_mall_alert === 'function'
            ? dict.slip_mall_alert(data.sti_pending_pcs, data.alter_pending_pcs, data.total_pending_pcs)
            : `[REPORT 141 ALERT] PENDING GOODS: STI = ${data.sti_pending_pcs} Pcs | ALTER = ${data.alter_pending_pcs} Pcs (TOTAL: ${data.total_pending_pcs} Pcs)`;
        preview141Stamp.innerHTML = slipAlert;

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
        alertTitle.innerHTML = `<span>${dict.alert_clear}</span>`;
        pendingTableContainer.style.display = 'none';

        preview141Stamp.className = 'slip-141-stamp clear';
        preview141Stamp.innerHTML = dict.slip_mall_clear;
        slipMallTableWrapper.style.display = 'none';
    }

    // Preview fields
    previewSrNo.textContent = data.code;
    previewName.textContent = data.name;
    previewDept.textContent = formatDeptDisplay(detectedDept, currentLang);
    previewFloor.textContent = formatFloorDisplay(floorSelect.value, currentLang);
    previewOutTime.textContent = outTimeInput.value;
    previewInTime.textContent = inTimeInput.value || '__________';
}

// ==========================================
// PASS PAYLOAD & PRINT LOGIC
// ==========================================
function getPassPayload(worker = null, overrideIntNo = null) {
    const w = worker || currentWorker;
    const code = w ? w.code : 'M---';
    const name = w ? w.name : 'SELECT KARIGAR';
    const dept = (w && w.department) ? w.department : (deptInput.value || 'KARIGAR');
    const floor = (w && w.floor ? w.floor : (floorSelect.value || '3RD FLOOR')).replace('3TH', '3RD');
    const dmy = getFormattedDateDMY();
    const int_num = overrideIntNo || (isReprintMode && activeReprintIntNo ? activeReprintIntNo : (intNo.value || '01'));
    const out_t = outTimeInput.value || '';
    const in_t = inTimeInput.value || '';
    const reason = reasonInput.value || 'Personal Work';
    const chk = getChecklistVerification();

    const perm = getActiveSignature(signPermissionSelect, signPermissionOtherInput, 'RAFIK');
    const chkSign = getActiveSignature(signCheckingSelect, signCheckingOtherInput, 'MADAN BHAI');
    const issSign = getActiveSignature(signIssuedSelect, signIssuedOtherInput, 'JEEL BHAI');

    const hasMall = w ? Boolean(w.has_pending_mall || (w.total_pending_pcs > 0)) : false;

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
        has_pending_mall: hasMall,
        total_pending_pcs: w ? (w.total_pending_pcs || 0) : 0,
        sti_pending_pcs: w ? (w.sti_pending_pcs || 0) : 0,
        alter_pending_pcs: w ? (w.alter_pending_pcs || 0) : 0,
        pending_items: w ? (w.pending_items || []) : [],
        photo_base64: w ? (w.photo_base64 || null) : null,
        is_reprint: isReprintMode,
    };
}

// Helper functions for Floor & Department Multi-Language Translation
function formatFloorDisplay(floorRaw, lang) {
    if (!floorRaw) return '--';
    const fl = String(floorRaw).toUpperCase().trim();
    if (lang === 'gu') {
        if (fl.includes('GROUND')) return 'ગ્રાઉન્ડ ફ્લોર (GROUND FLOOR)';
        if (fl.includes('1ST') || fl.includes('1TH')) return '૧ લો માળ (1ST FLOOR)';
        if (fl.includes('2ND') || fl.includes('2TH')) return '૨ જો માળ (2ND FLOOR)';
        if (fl.includes('3RD') || fl.includes('3TH')) return '૩ જો માળ (3RD FLOOR)';
        if (fl.includes('4TH')) return '૪ થો માળ (4TH FLOOR)';
        if (fl.includes('5TH')) return '૫ મો માળ (5TH FLOOR)';
        if (fl.includes('BASEMENT')) return 'બેઝમેન્ટ (BASEMENT)';
        return floorRaw;
    } else if (lang === 'hi') {
        if (fl.includes('GROUND')) return 'ग्राउंड फ्लोर (GROUND FLOOR)';
        if (fl.includes('1ST') || fl.includes('1TH')) return '१ ली मंजिल (1ST FLOOR)';
        if (fl.includes('2ND') || fl.includes('2TH')) return '२ री मंजिल (2ND FLOOR)';
        if (fl.includes('3RD') || fl.includes('3TH')) return '३ री मंजिल (3RD FLOOR)';
        if (fl.includes('4TH')) return '४ थी मंजिल (4TH FLOOR)';
        if (fl.includes('5TH')) return '५ वीं मंजिल (5TH FLOOR)';
        if (fl.includes('BASEMENT')) return 'बेसमेंट (BASEMENT)';
        return floorRaw;
    } else {
        if (fl.includes('GROUND')) return 'GROUND FLOOR';
        if (fl.includes('1ST') || fl.includes('1TH')) return '1ST FLOOR';
        if (fl.includes('2ND') || fl.includes('2TH')) return '2ND FLOOR';
        if (fl.includes('3RD') || fl.includes('3TH')) return '3RD FLOOR';
        if (fl.includes('4TH')) return '4TH FLOOR';
        if (fl.includes('5TH')) return '5TH FLOOR';
        if (fl.includes('BASEMENT')) return 'BASEMENT';
        return floorRaw;
    }
}

function formatDeptDisplay(deptRaw, lang) {
    if (!deptRaw) return 'KARIGAR';
    const d = String(deptRaw).toUpperCase().trim();
    if (lang === 'gu') {
        if (d.includes('STITCH')) return 'કારીગર (STITCHING)';
        if (d.includes('CUTTING')) return 'કટિંગ (CUTTING)';
        if (d.includes('CHECKING')) return 'ચેકિંગ (CHECKING)';
        if (d.includes('PRESS')) return 'પ્રેસ (PRESS)';
        if (d.includes('PRODUCTION')) return 'પ્રોડક્શન (PRODUCTION)';
        if (d.includes('PACKING')) return 'પેકિંગ (PACKING)';
        return d;
    } else if (lang === 'hi') {
        if (d.includes('STITCH')) return 'कारीगर (STITCHING)';
        if (d.includes('CUTTING')) return 'कटिंग (CUTTING)';
        if (d.includes('CHECKING')) return 'चेकिंग (CHECKING)';
        if (d.includes('PRESS')) return 'प्रेस (PRESS)';
        if (d.includes('PRODUCTION')) return 'प्रोडक्शन (PRODUCTION)';
        if (d.includes('PACKING')) return 'पैकिंग (PACKING)';
        return d;
    }
    return d;
}

// Generate HTML string for single slip (100% Multi-Language Dynamic from A to Z)
function renderSlipHTML(payload) {
    const dict = I18N[currentLang] || I18N['gu'];
    const chk = payload.checklist || {};
    const hasAnyChecked = Boolean(chk.small_cutter || chk.scissor || chk.stool || chk.id_card);
    const doneText = dict.slip_tool_done || 'DONE';
    const checklistHtml = hasAnyChecked ? `
            <div class="slip-checklist-row">
                <span class="chk-item">${dict.slip_tool_cutter}: <strong>[${chk.small_cutter ? doneText : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}]</strong></span>
                <span class="chk-sep">•</span>
                <span class="chk-item">${dict.slip_tool_scissor}: <strong>[${chk.scissor ? doneText : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}]</strong></span>
                <span class="chk-sep">•</span>
                <span class="chk-item">${dict.slip_tool_stool}: <strong>[${chk.stool ? doneText : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}]</strong></span>
                <span class="chk-sep">•</span>
                <span class="chk-item">${dict.slip_tool_id}: <strong>[${chk.id_card ? doneText : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}]</strong></span>
            </div>
    ` : '';

    const photoHtml = payload.photo_base64
        ? `<img src="data:image/jpeg;base64,${payload.photo_base64}" alt="${payload.name}">`
        : `<span style="font-size: 11px; color: #64748b; font-weight: 700; text-align: center;">${dict.slip_photo_caption || 'PHOTO'}</span>`;

    const mallItems = payload.pending_items || [];
    let mallHtml = '';
    if (payload.has_pending_mall) {
        const alertText = typeof dict.slip_mall_alert === 'function'
            ? dict.slip_mall_alert(payload.sti_pending_pcs, payload.alter_pending_pcs, payload.total_pending_pcs)
            : `[REPORT 141 ALERT] PENDING GOODS: STI = ${payload.sti_pending_pcs} Pcs | ALTER = ${payload.alter_pending_pcs} Pcs (TOTAL: ${payload.total_pending_pcs} Pcs)`;
        mallHtml = `
            <div class="slip-141-stamp warn">
                ${alertText}
            </div>
            <div style="margin-top: 4px;">
                <table class="slip-mall-table">
                    <thead>
                        <tr>
                            <th>${dict.slip_th_process}</th>
                            <th>${dict.slip_th_lot}</th>
                            <th>${dict.slip_th_barcode}</th>
                            <th>${dict.slip_th_item}</th>
                            <th>${dict.slip_th_bal}</th>
                            <th>${dict.slip_th_date}</th>
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
                ${dict.slip_mall_clear}
            </div>
        `;
    }

    const dispFloor = formatFloorDisplay(payload.floor, currentLang);
    const dispDept = formatDeptDisplay(payload.department, currentLang);

    return `
        <div class="gatepass-slip">
            <div class="slip-header">
                <img src="/static/img/oslc_logo_print.svg" alt="OSLC HOUSE" class="slip-brand-logo">
            </div>

            <div class="slip-body">
                <div class="slip-info-col">
                    <div class="slip-row-split">
                        <div class="slip-field"><span class="lbl">${dict.slip_sr_no}</span><span class="val">${payload.code}</span></div>
                        <div class="slip-field"><span class="lbl">${dict.slip_int_no}</span><span class="val">${payload.int_no}</span>${payload.is_reprint ? ` <span class="slip-reprint-tag">${dict.slip_reprint_tag}</span>` : ''}</div>
                    </div>
                    <div class="slip-row"><div class="slip-field"><span class="lbl">${dict.slip_date}</span><span class="val">${payload.date}</span></div></div>
                    <div class="slip-row"><div class="slip-field"><span class="lbl">${dict.slip_dept}</span><span class="val">${dispDept}</span></div></div>
                    <div class="slip-name-row"><div class="slip-field"><span class="lbl">${dict.slip_name}</span><span class="val">${payload.name}</span></div></div>
                    <div class="slip-row"><div class="slip-field"><span class="lbl">${dict.slip_floor}</span><span class="val">${dispFloor}</span></div></div>
                    <div class="slip-time-split">
                        <div class="slip-field"><span class="lbl">${dict.slip_out_time}</span><span class="val">${payload.out_time}</span></div>
                        <div class="slip-field"><span class="lbl">${dict.slip_in_time}</span><span class="val">${payload.in_time || '__________'}</span></div>
                    </div>
                </div>

                <div class="slip-photo-col">
                    <div class="slip-photo-frame">
                        ${photoHtml}
                    </div>
                    <div class="slip-photo-caption">${dict.slip_photo_caption}</div>
                </div>
            </div>

${checklistHtml}

            <div class="slip-signatures">
                <div class="slip-sign-box">
                    <div class="sign-box-role">${dict.slip_sig_perm}</div>
                    <div class="sign-box-name">(${payload.sign_permission})</div>
                    <div class="sign-box-line">${dict.slip_sign_line}</div>
                </div>
                <div class="slip-sign-box">
                    <div class="sign-box-role">${dict.slip_sig_chk}</div>
                    <div class="sign-box-name">(${payload.sign_checking})</div>
                    <div class="sign-box-line">${dict.slip_sign_line}</div>
                </div>
                <div class="slip-sign-box">
                    <div class="sign-box-role">${dict.slip_sig_iss}</div>
                    <div class="sign-box-name">(${payload.sign_issued})</div>
                    <div class="sign-box-line">${dict.slip_sign_line}</div>
                </div>
            </div>

            <div class="slip-141-container">
                ${mallHtml}
            </div>

            <div class="slip-credit-footer">
                ${dict.slip_footer}
            </div>
        </div>
    `;
}

// ==========================================
// PAPER SIZE SWITCHER & NATIVE PRINT BRIDGE
// ==========================================
function initPaperAndOrientation() {
    // Clear any obsolete flip setting
    localStorage.removeItem('oslc_print_flipped');
    document.body.classList.remove('print-flipped');

    // Restore saved paper size (defaults to A4, or restored from localStorage)
    setPaperSize(currentPaperSize, false);

    if (btnPaperA4) {
        btnPaperA4.addEventListener('click', () => setPaperSize('A4', true));
    }
    if (btnPaperA5) {
        btnPaperA5.addEventListener('click', () => setPaperSize('A5', true));
    }
}

function applyDynamicPrintPageSize(size) {
    let styleEl = document.getElementById('dynamicPrintPageStyle');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamicPrintPageStyle';
        document.head.appendChild(styleEl);
    }
    if (size === 'A5') {
        styleEl.innerHTML = `@page { size: A5 portrait !important; margin: 4mm !important; }`;
    } else {
        styleEl.innerHTML = `@page { size: A4 portrait !important; margin: 4mm !important; }`;
    }
}

function setPaperSize(size, showNotification = true) {
    currentPaperSize = size;
    localStorage.setItem('oslc_paper_size', size);
    const dict = I18N[currentLang] || I18N['gu'];

    applyDynamicPrintPageSize(size);

    if (size === 'A5') {
        document.body.classList.add('print-small-page');
        if (btnPaperA5) {
            btnPaperA5.classList.add('active', 'a5');
        }
        if (btnPaperA4) {
            btnPaperA4.classList.remove('active');
        }
        if (previewPaperBadge) {
            previewPaperBadge.textContent = dict.btn_paper_a5 || '📑 A5 નાનું પેજ';
            previewPaperBadge.className = 'preview-paper-pill a5';
        }
        if (showNotification) {
            showToast(dict.toast_paper_a5 || '📑 નાનું પેજ (A5) સેટ થયું! પ્રિન્ટ ૧ પેજમાં સંપૂર્ણ સમાઈ જશે.', 'info');
        }
    } else {
        document.body.classList.remove('print-small-page');
        if (btnPaperA4) {
            btnPaperA4.classList.add('active');
        }
        if (btnPaperA5) {
            btnPaperA5.classList.remove('active', 'a5');
        }
        if (previewPaperBadge) {
            previewPaperBadge.textContent = dict.btn_paper_a4 || '📄 A4 મોટું પેજ';
            previewPaperBadge.className = 'preview-paper-pill a4';
        }
        if (showNotification) {
            showToast(dict.toast_paper_a4 || '📄 મોટું પેજ (A4 Standard) સેટ થયું!', 'info');
        }
    }

    renderActiveGatepassPreview();
}

// Native Android Print Bridge & Standard Browser Print with Paper Size & Upright Orientation
function triggerSystemPrint(jobTitle = 'OSLC_GatePass') {
    // Reset window scroll position so WebView viewport does NOT shift print content
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    if (document.documentElement) document.documentElement.scrollTop = 0;

    const isSmall = document.body.classList.contains('print-small-page') || currentPaperSize === 'A5';
    const paperSize = isSmall ? 'A5' : 'A4';
    if (isSmall) {
        document.body.classList.add('print-small-page');
    } else {
        document.body.classList.remove('print-small-page');
    }
    applyDynamicPrintPageSize(paperSize);

    setTimeout(() => {
        if (window.AndroidPrinter && typeof window.AndroidPrinter.printSlipWithSize === 'function') {
            window.AndroidPrinter.printSlipWithSize(jobTitle, paperSize);
        } else if (window.AndroidPrinter && typeof window.AndroidPrinter.printSlip === 'function') {
            window.AndroidPrinter.printSlip(jobTitle);
        } else {
            window.print();
        }
    }, 80);
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

    // Step 1: Ensure it is saved first!
    if (!isPassSaved) {
        await handleSavePass(false);
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

    // Case 2: Single worker - render fresh slip to ensure it is in container
    const payload = getPassPayload();
    passSheetContainer.innerHTML = renderSlipHTML(payload);

    triggerSystemPrint('OSLC_GatePass_' + (currentWorker ? currentWorker.code : 'Slip'));
    setTimeout(() => {
        isPassSaved = false;
        updateSaveStatusBanner('initial');
    }, 500);
}

// Helper: Build page pairs for print & preview (2 passes per A4 page, vertically stacked, or 1 pass per A5 sheet)
function buildPagePairsHTML(slipsArray) {
    if (currentPaperSize === 'A5') {
        // In A5 Small Page mode: 1 pass per A5 sheet, cleanly separated without trailing page-break!
        return slipsArray.map((slip, idx) => {
            const isLast = (idx === slipsArray.length - 1);
            const breakStyle = isLast ? 'page-break-after: auto; break-after: auto;' : 'page-break-after: always; break-after: page;';
            return `
                <div class="print-page-pair" style="${breakStyle}">
                    ${slipsArray.length > 1 ? `<div class="preview-page-label">📑 A5 PASS ${idx + 1} OF ${slipsArray.length}</div>` : ''}
                    ${slip}
                </div>
            `;
        }).join('');
    }

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

    // Ensure 141 Mall data is loaded for all selected workers
    await Promise.all(selectedWorkers.map(w => ensureWorkerFullDetails(w)));

    // Fetch next starting Int No or use user-entered value
    const targetDate = getFormattedDateDMY();
    let startNo = parseInt(intNo.value || '1', 10);
    try {
        const res = await fetch(`/api/next_int_no?date=${encodeURIComponent(targetDate)}`);
        const nextData = await res.json();
        if (!intNo.value) {
            startNo = parseInt(nextData.next_int_no || '1', 10);
        }
    } catch (e) {}

    const slipsHtmlArray = [];

    // Loop through selected workers and issue sequential passes
    for (let i = 0; i < selectedWorkers.length; i++) {
        const w = selectedWorkers[i];
        const currentIntNo = String(startNo + i).padStart(2, '0');
        const payload = getPassPayload(w, currentIntNo);

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

    // Trigger Print cleanly
    setTimeout(() => {
        triggerSystemPrint('OSLC_Batch_GatePass');
        loadHistory();
        updateNextIntNo();
        showToast(`✅ ${selectedWorkers.length} કારીગરોના ગેટ પાસ સફળતાપૂર્વક પ્રિન્ટ થયા!`, 'success');
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
        triggerSystemPrint('OSLC_GatePass_2on1');
        loadHistory();
        updateNextIntNo();
        showToast('✅ ૧ પેજમાં ૨ પાસ સફળતાપૂર્વક પ્રિન્ટ થયા!', 'success');
    }, 250);
}

// Unified Real-Time Live Preview Renderer
// Immediately updates all preview slips when ANY form input or worker selection changes!
function renderActiveGatepassPreview(isUserInput = false) {
    if (!passSheetContainer) return;

    if (isUserInput && isPassSaved) {
        isPassSaved = false;
        updateSaveStatusBanner('unsaved');
    }

    const startNo = parseInt(intNo.value || '1', 10);

    if (selectedWorkers.length > 1) {
        // Multi-pass batch preview: each worker gets their own slip and 141 mall table if goods exist
        const slips = [];
        for (let i = 0; i < selectedWorkers.length; i++) {
            const w = selectedWorkers[i];
            const currentIntNo = String(startNo + i).padStart(2, '0');
            const payload = getPassPayload(w, currentIntNo);
            slips.push(renderSlipHTML(payload));
        }
        passSheetContainer.innerHTML = buildPagePairsHTML(slips);
    } else if (selectedWorkers.length === 1 || currentWorker) {
        const w = selectedWorkers[0] || currentWorker;
        const currentIntNo = (isReprintMode && activeReprintIntNo) ? activeReprintIntNo : String(startNo).padStart(2, '0');
        const payload = getPassPayload(w, currentIntNo);

        if (toggleMultiView && toggleMultiView.classList.contains('active')) {
            // User selected 2-on-1 duplicate mode
            const slip = renderSlipHTML(payload);
            passSheetContainer.innerHTML = buildPagePairsHTML([slip, slip]);
        } else {
            // Normal Single Pass mode
            passSheetContainer.innerHTML = renderSlipHTML(payload);
        }
    } else {
        // Default blank placeholder slip with live form fields
        const payload = getPassPayload(null, String(startNo).padStart(2, '0'));
        passSheetContainer.innerHTML = renderSlipHTML(payload);
    }

    updatePrintButtonText();
}

function renderSinglePassView() {
    renderActiveGatepassPreview();
}

async function renderMultiPassView() {
    renderActiveGatepassPreview();
}

async function handleSavePass(showNotification = true) {
    if (!currentWorker && selectedWorkers.length === 0) {
        if (showNotification) showToast('મહેરબાની કરીને પહેલા કારીગર સિલેક્ટ કરો (Select Karigar First)!', 'error');
        return false;
    }

    // Case 1: Multiple workers batch save
    if (selectedWorkers.length > 1) {
        await Promise.all(selectedWorkers.map(w => ensureWorkerFullDetails(w)));
        const targetDate = getFormattedDateDMY();
        let startNo = parseInt(intNo.value || '1', 10);
        try {
            const res = await fetch(`/api/next_int_no?date=${encodeURIComponent(targetDate)}`);
            const nextData = await res.json();
            if (!intNo.value) startNo = parseInt(nextData.next_int_no || '1', 10);
        } catch (e) {}

        let savedCount = 0;
        for (let i = 0; i < selectedWorkers.length; i++) {
            const w = selectedWorkers[i];
            const currentIntNo = String(startNo + i).padStart(2, '0');
            const payload = getPassPayload(w, currentIntNo);
            try {
                const res = await fetch('/api/issue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) savedCount++;
            } catch (e) {
                console.error('Failed saving batch pass item:', e);
            }
        }

        isPassSaved = true;
        if (showNotification) {
            showToast(`✅ તમામ ${savedCount} કારીગરોના ગેટ પાસ સફળતાપૂર્વક સેવ થઈ ગયા! હવે ૨. પ્રિન્ટ કાઢો.`, 'success');
        }
        updateSaveStatusBanner('saved', `✅ તમામ ${savedCount} કારીગરોના ગેટ પાસ સેવ થઈ ગયા છે! હવે નીચેથી <strong>[🖨️ ૨. PRINT ALL]</strong> દબાવી પ્રિન્ટ કાઢો.`);
        loadHistory();
        loadMasterReport(false);
        return true;
    }

    // Case 2: Single worker save
    const w = selectedWorkers[0] || currentWorker;
    if (!w) {
        if (showNotification) showToast('મહેરબાની કરીને પહેલા કારીગર સિલેક્ટ કરો!', 'error');
        return false;
    }

    const payload = getPassPayload(w);
    try {
        const res = await fetch('/api/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            isPassSaved = true;
            if (showNotification) {
                showToast(`✅ Gate Pass #${payload.int_no} (${payload.code}) સફળતાપૂર્વક સેવ થઈ ગયો! હવે ૨. પ્રિન્ટ કાઢો.`, 'success');
            }
            updateSaveStatusBanner('saved', `✅ Gate Pass #${payload.int_no} સફળતાપૂર્વક સેવ થઈ ગયો છે! હવે નીચેથી <strong>[🖨️ ૨. PRINT GATE PASS]</strong> દબાવી પ્રિન્ટ કાઢો.`);
            loadHistory();
            loadMasterReport(false);
            if (!isReprintMode) {
                await updateNextIntNo();
            }
            return true;
        }
    } catch (err) {
        console.error('Save error:', err);
        if (showNotification) showToast('Error saving gate pass to database!', 'error');
    }
    return false;
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
    const dict = I18N[currentLang] || I18N['gu'];

    if (!records.length) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-dim); padding: 18px;">
                    ${dict.no_history_records || 'No gate passes issued yet for this date.'}
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
            : `<span class="tag-mall-clear">${dict.tag_mall_clear || '✅ Clear'}</span>`;
        const toolsText = typeof dict.tools_returned_text === 'function' ? dict.tools_returned_text(returnedCount) : `${returnedCount}/4 Tools`;
        const dispDept = formatDeptDisplay(r.department, currentLang);

        return `
            <tr>
                <td><strong>#${r.int_no}</strong></td>
                <td>${r.out_time || '--:--'}</td>
                <td><span class="tag-code">${r.code}</span></td>
                <td>${r.name}</td>
                <td>${dispDept}</td>
                <td><span class="tag-tools ${returnedCount === 4 ? 'full' : 'partial'}">${toolsText}</span></td>
                <td>${mallTag}</td>
                <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button class="btn-reprint-row" onclick="triggerReprint('${r.pass_id}', '${r.int_no}', '${r.code}')" title="Reprint without changing Int No.">
                            <span>${dict.btn_reprint_row || '🔁 Reprint'}</span>
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
                triggerSystemPrint('OSLC_Reprint_GatePass_' + originalIntNo);
            }, 500);
        }
    } catch (err) {
        showToast('Reprint failed: ' + err.message, 'error');
    }
};

window.deleteGatePass = async function(passId) {
    if (!confirm('શું તમે આ ગેટ પાસ રેકોર્ડ ડિલીટ કરવા માંગો છો?\nAre you sure you want to delete this gate pass?')) return;
    try {
        const res = await fetch(`/api/delete/${encodeURIComponent(passId)}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('✅ ગેટ પાસ ડિલીટ થઈ ગયો! (Gate pass deleted)', 'success');
            loadHistory();
            loadMasterReport(false);
            updateNextIntNo();
        } else {
            showToast('Failed to delete pass: ' + (data.message || 'Error'), 'error');
        }
    } catch (err) {
        showToast('Failed to delete pass: ' + err.message, 'error');
    }
};

window.clearGatePassHistory = async function(scope = 'today') {
    const isToday = scope === 'today';
    const msg = isToday 
        ? 'શું તમે આજના તમામ ગેટ પાસ રેકોર્ડ ક્લિયર / ડિલીટ કરવા માંગો છો?\nAre you sure you want to clear ALL passes issued TODAY?' 
        : '⚠️ ચેતવણી: શું તમે તમામ હિસ્ટ્રીનો બધો ડેટા ડિલીટ કરવા માંગો છો?\nWARNING: Are you sure you want to clear ALL historical records?';
    
    if (!confirm(msg)) return;

    try {
        const res = await fetch('/api/clear_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope: scope, date: getFormattedDateDMY() })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ ${data.deleted_count} ગેટ પાસ સફળતાપૂર્વક ક્લિયર થયા!`, 'success');
            loadHistory();
            loadMasterReport(false);
            await updateNextIntNo();
            clearSearchAndProfile(true);
        } else {
            showToast('ડેટા ક્લિયર કરવામાં ભૂલ: ' + (data.message || 'Error'), 'error');
        }
    } catch (err) {
        showToast('Error clearing data: ' + err.message, 'error');
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
    const dict = I18N[currentLang] || I18N['gu'];
    if (rptTableCountText) {
        rptTableCountText.textContent = typeof dict.rpt_showing_records === 'function' 
            ? dict.rpt_showing_records(records.length) 
            : `Showing ${records.length} Records`;
    }

    if (!records.length) {
        rptTableBody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align: center; color: var(--text-dim); padding: 30px;">
                    ${dict.no_report_records || 'No records found matching your filters.'}
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
                <td>${formatDeptDisplay(r.department, currentLang)}</td>
                <td>${formatFloorDisplay(r.floor, currentLang)}</td>
                <td><span class="tag-tools ${returnedCount === 4 ? 'full' : 'partial'}">${typeof dict.tools_returned_text === 'function' ? dict.tools_returned_text(returnedCount) : `${returnedCount}/4 Tools`}</span></td>
                <td>
                    ${r.has_pending_mall 
                        ? `<span class="tag-mall-warning">⚠️ ${r.total_pending_pcs} Pcs (${r.pending_items_count || 0} Lots)</span>` 
                        : `<span class="tag-mall-clear">${dict.tag_mall_clear || '✅ Clear'} (0 Pcs)</span>`}
                </td>
                <td>
                    ${isRep ? `<span class="badge-reprint">🔁 ${dict.badge_reprint || 'REPRINT'} (${r.reprint_count || 1})</span>` : `<span class="badge-original">${dict.badge_original || 'ORIGINAL'}</span>`}
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn-reprint-row" onclick="triggerReprint('${r.pass_id}', '${r.int_no}', '${r.code}')">
                            <span>${dict.btn_reprint_row || '🔁 Reprint'}</span>
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
    triggerSystemPrint('OSLC_Report_Register');
    setTimeout(() => {
        document.body.classList.remove('print-report-mode');
    }, 500);
}

// =========================================================================
// AUTO-UPDATE SYSTEM FOR "MARA PC" AND "BIJA PC" (ALL DEVICES)
// Automatically detects server restarts or code changes and refreshes seamlessly
// =========================================================================

function forceAppUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for (let r of regs) r.unregister();
        }).catch(() => {});
    }
    if (window.caches) {
        caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).finally(() => {
            window.location.replace(window.location.pathname + '?_v=' + Date.now());
        });
    } else {
        window.location.replace(window.location.pathname + '?_v=' + Date.now());
    }
}

function initAutoUpdateChecker() {
    let checkBusy = false;
    setInterval(async () => {
        if (checkBusy) return;
        checkBusy = true;
        try {
            const res = await fetch('/api/health?_t=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.build_id && window.SERVER_BUILD_ID && data.build_id !== window.SERVER_BUILD_ID) {
                console.log('⚡ New build detected! Current:', window.SERVER_BUILD_ID, 'New:', data.build_id);
                showToast('⚡ નવું અપડેટ મળ્યું છે! પેજ આપોઆપ રિફ્રેશ થઈ રહ્યું છે...', 'success', 3000);
                setTimeout(() => {
                    forceAppUpdate();
                }, 1200);
            }
        } catch (e) {
            // Ignore brief network drops
        } finally {
            checkBusy = false;
        }
    }, 3500);
}

// Automatically start background update polling on page load
initAutoUpdateChecker();



