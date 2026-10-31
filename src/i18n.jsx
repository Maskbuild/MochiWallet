import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  th: {
    appSubtitle: 'สมุดการเงินพาสเทลแสนอบอุ่น',
    navOverview: 'หน้าภาพรวม (Overview)',
    navTransactions: 'รายรับ-รายจ่าย & โอนเงิน',
    navAccounts: 'กระเป๋าเงิน & บัญชี',
    navBudgets: 'ตั้งงบ Budget & ทริป',
    navCategories: 'หมวดหมู่ & ร้านค้า',
    navMemberships: 'ระบบ Membership',
    navDiscordBot: 'เชื่อมต่อบอท Discord (API)',
    totalAllWallets: 'ยอดรวมทุกกระเป๋า',
    walletsCount: 'กระเป๋า',
    walletsUnit: 'ใบ',
    recordsCount: 'บันทึก',
    recordsUnit: 'รายการ',
    loadingText: 'กำลังเปิดสมุดบันทึกการเงินพาสเทล... 🌸',

    // Dashboard
    badgeSub: 'สมุดบันทึกการเงินพาสเทล',
    welcomeTitle: 'สวัสดีจ้า! วันนี้มาจดรายรับ-รายจ่ายกันนะ 🍡',
    totalAssetsNow: 'ยอดทรัพย์สินรวมทุกกระเป๋าตอนนี้:',
    btnAddTx: 'จดรายรับ-รายจ่าย / โอนเงิน',
    btnAddWallet: 'เพิ่มกระเป๋าเงิน',
    periodDay: '☀️ รายวัน',
    periodMonth: '🌙 รายเดือน',
    periodQuarter: '🍂 รายไตรมาส (3 เดือน)',
    periodHalfYear: '🌈 ราย 6 เดือน',
    periodYear: '🎉 รายปี',
    periodAll: '🌟 ทั้งหมด',
    refDateLabel: 'อ้างอิงวันที่:',
    incomeInPeriod: 'รายรับในช่วงนี้',
    expenseInPeriod: 'รายจ่ายในช่วงนี้',
    transferInPeriod: 'โอนย้าย/แลกเปลี่ยนบัญชี',
    moveBetweenWallets: 'ย้ายระหว่างกระเป๋า',
    netBalance: 'คงเหลือสุทธิ (รับ - จ่าย)',
    fromItems: 'จาก {n} รายการ',
    walletsTitle: '👛 กระเป๋าเงินและบัญชีเงินเก็บ',
    manageAllAccounts: 'จัดการบัญชีทั้งหมด →',
    accTypeCash: 'เงินสด',
    accTypeSavings: 'เงินออม',
    accTypeBank: 'บัญชีธนาคาร',
    accTypeEwallet: 'E-Wallet',
    expenseByCategory: '🍩 สัดส่วนรายจ่ายตามประเภท',
    configCategories: 'ตั้งค่าหมวดหมู่ →',
    noExpenseInPeriod: 'ยังไม่มีรายการรายจ่ายในช่วงเวลานี้จ้า 🌸',
    budgetsAndTrips: '🎯 งบประมาณ & ทริป',
    viewAllBudgets: 'ดูงบทั้งหมด →',
    spentLabel: 'ใช้ไป',
    budgetLabel: 'งบ',
    activeMembershipsTitle: '🔄 Membership ที่ใช้งานอยู่',
    manageBtn: 'จัดการ →',
    recentTxTitle: '📝 รายการล่าสุดในช่วงเวลานี้',
    viewAndAddTx: 'ดูและเพิ่มรายการ →',
    noTxInPeriod: 'ยังไม่มีรายการในช่วงเวลานี้ กดปุ่มเพิ่มรายการด้านบนได้เลย! 🍡',
    viewSlipBtn: 'ดูสลิป',
    clickViewSlipBtn: 'กดดูสลิป',

    // Heatmap
    heatmapTitle: 'ตารางบันทึกความสม่ำเสมอ (Activity Garden)',
    heatmapDesc: 'นับจากการสร้างรายรับ-รายจ่าย, การโอนแลกเปลี่ยนระหว่างบัญชี และการเปิดบัญชีใหม่',
    heatmapTotal: 'รวมทั้งหมด',
    heatmapActivities: 'กิจกรรม',
    heatmapActiveDays: 'ใช้งาน',
    heatmapDays: 'วัน',
    heatmapStreak: 'ต่อเนื่อง',
    heatmapHoverHint: '💡 เลื่อนเมาส์ไปวางบนช่องสี่เหลี่ยมเพื่อดูรายละเอียดกิจกรรมของแต่ละวัน',
    heatmapNoActivity: 'ยังไม่มีกิจกรรมในวันนี้',
    heatmapLess: 'น้อย',
    heatmapMore: 'มาก 🌸',
  },
  en: {
    appSubtitle: 'Cozy Pastel Finance Tracker',
    navOverview: 'Overview Dashboard',
    navTransactions: 'Income, Expense & Transfer',
    navAccounts: 'Wallets & Accounts',
    navBudgets: 'Budgets & Trips',
    navCategories: 'Categories & Shops',
    navMemberships: 'Memberships',
    navDiscordBot: 'Discord Bot & API',
    totalAllWallets: 'Total Net Worth',
    walletsCount: 'Wallets',
    walletsUnit: '',
    recordsCount: 'Records',
    recordsUnit: '',
    loadingText: 'Opening your pastel finance journal... 🌸',

    // Dashboard
    badgeSub: 'Pastel Finance Journal',
    welcomeTitle: "Hello! Let's track your finances today 🍡",
    totalAssetsNow: 'Total balance across all wallets:',
    btnAddTx: 'Add Income / Expense / Transfer',
    btnAddWallet: 'Add Wallet',
    periodDay: '☀️ Daily',
    periodMonth: '🌙 Monthly',
    periodQuarter: '🍂 Quarterly (3M)',
    periodHalfYear: '🌈 Half-Year (6M)',
    periodYear: '🎉 Yearly',
    periodAll: '🌟 All Time',
    refDateLabel: 'Reference Date:',
    incomeInPeriod: 'Income in Period',
    expenseInPeriod: 'Expense in Period',
    transferInPeriod: 'Account Transfers',
    moveBetweenWallets: 'Between wallets',
    netBalance: 'Net Balance (In - Out)',
    fromItems: 'From {n} records',
    walletsTitle: '👛 Wallets & Savings Accounts',
    manageAllAccounts: 'Manage Accounts →',
    accTypeCash: 'Cash',
    accTypeSavings: 'Savings',
    accTypeBank: 'Bank Account',
    accTypeEwallet: 'E-Wallet',
    expenseByCategory: '🍩 Expense by Category',
    configCategories: 'Manage Categories →',
    noExpenseInPeriod: 'No expenses recorded in this period 🌸',
    budgetsAndTrips: '🎯 Budgets & Trips',
    viewAllBudgets: 'View All Budgets →',
    spentLabel: 'Spent',
    budgetLabel: 'Budget',
    activeMembershipsTitle: '🔄 Active Memberships',
    manageBtn: 'Manage →',
    recentTxTitle: '📝 Recent Transactions in Period',
    viewAndAddTx: 'View & Add →',
    noTxInPeriod: 'No transactions in this period yet. Click Add above! 🍡',
    viewSlipBtn: 'View Slip',
    clickViewSlipBtn: 'View Slip',

    // Heatmap
    heatmapTitle: 'Activity Contribution Garden (GitHub Style)',
    heatmapDesc: 'Counts every income/expense record, account transfer, and new wallet created',
    heatmapTotal: 'Total',
    heatmapActivities: 'actions',
    heatmapActiveDays: 'Active',
    heatmapDays: 'days',
    heatmapStreak: 'Streak',
    heatmapHoverHint: '💡 Hover over any square to inspect daily activity breakdown',
    heatmapNoActivity: 'No activity on this day',
    heatmapLess: 'Less',
    heatmapMore: 'More 🌸',
  },
};

const I18nContext = createContext({
  lang: 'th',
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('mochi_lang') || 'th');

  useEffect(() => {
    localStorage.setItem('mochi_lang', lang);
  }, [lang]);

  function t(key, vars = {}) {
    let str = translations[lang]?.[key] ?? translations.th[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
    return str;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

