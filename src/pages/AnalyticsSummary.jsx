import React, { useState, useMemo } from 'react';
import {
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { CartoonEmojiBadge, formatCurrency } from '../components/CuteStickers.jsx';
import CuteDatePicker from '../components/CuteDatePicker.jsx';
import CuteSelect from '../components/CuteSelect.jsx';
import SlipModal from '../components/SlipModal.jsx';
import { computeDateRange } from './Dashboard.jsx';
import { useI18n } from '../i18n.jsx';

const TH_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];
const EN_SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function shiftReferenceDate(refDateStr, periodMode, delta) {
  const base = refDateStr ? new Date(refDateStr + 'T00:00:00') : new Date();
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();

  let next;
  if (periodMode === 'day') {
    next = new Date(y, m, d + delta);
  } else if (periodMode === 'month') {
    next = new Date(y, m + delta, 1);
  } else if (periodMode === 'quarter') {
    next = new Date(y, m + delta * 3, 1);
  } else if (periodMode === 'half_year') {
    next = new Date(y, m + delta * 6, 1);
  } else if (periodMode === 'year') {
    next = new Date(y + delta, m, 1);
  } else {
    next = new Date(y, m + delta, 1);
  }

  const ny = next.getFullYear();
  const nm = String(next.getMonth() + 1).padStart(2, '0');
  const nd = String(next.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

function getDaysBetween(startStr, endStr) {
  const s = new Date(startStr + 'T00:00:00');
  const e = new Date(endStr + 'T00:00:00');
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

export default function AnalyticsSummary({
  accounts = [],
  categories = [],
  shops = [],
  memberships = [],
  transactions = [],
}) {
  const { lang, t } = useI18n();
  const isEn = lang === 'en';
  const todayStr = new Date().toISOString().slice(0, 10);

  const [periodMode, setPeriodMode] = useState('month');
  const [refDate, setRefDate] = useState(todayStr);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [catTab, setCatTab] = useState('expense');

  // Line Chart display toggles
  const [showExpenseLine, setShowExpenseLine] = useState(true);
  const [showIncomeLine, setShowIncomeLine] = useState(true);
  const [showCumulativeLine, setShowCumulativeLine] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [activeSlip, setActiveSlip] = useState(null);

  // Maps to always resolve the exact Emoji, Image, and Color configured by the user in the app
  const accountMap = useMemo(() => {
    const m = new Map();
    for (const acc of accounts) m.set(String(acc.id), acc);
    return m;
  }, [accounts]);

  const categoryMap = useMemo(() => {
    const m = new Map();
    for (const cat of categories) m.set(String(cat.id), cat);
    return m;
  }, [categories]);

  const shopMap = useMemo(() => {
    const m = new Map();
    for (const shp of shops) m.set(String(shp.id), shp);
    return m;
  }, [shops]);

  const selectedAccountObj =
    selectedAccountId !== 'all' ? accountMap.get(String(selectedAccountId)) : null;

  // Current & Previous Period Date Ranges
  const range = useMemo(
    () => computeDateRange(periodMode, refDate, lang),
    [periodMode, refDate, lang]
  );

  const prevRange = useMemo(() => {
    if (periodMode === 'all') return null;
    const prevRef = shiftReferenceDate(refDate, periodMode, -1);
    return computeDateRange(periodMode, prevRef, lang);
  }, [periodMode, refDate, lang]);

  // Filter transactions by wallet if selected
  const walletFilteredTxs = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    return transactions.filter(
      (tx) =>
        String(tx.account_id) === String(selectedAccountId) ||
        String(tx.to_account_id) === String(selectedAccountId)
    );
  }, [transactions, selectedAccountId]);

  const periodTxs = useMemo(() => {
    return walletFilteredTxs.filter(
      (tx) => tx.transaction_date >= range.start && tx.transaction_date <= range.end
    );
  }, [walletFilteredTxs, range]);

  const prevPeriodTxs = useMemo(() => {
    if (!prevRange) return [];
    return walletFilteredTxs.filter(
      (tx) => tx.transaction_date >= prevRange.start && tx.transaction_date <= prevRange.end
    );
  }, [walletFilteredTxs, prevRange]);

  // Core KPI Calculations
  const kpis = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    let transferCount = 0;
    let maxExpenseTx = null;
    const dailyExpenseMap = new Map();
    const activeDaySet = new Set();

    for (const tx of periodTxs) {
      const amt = Number(tx.amount || 0);
      activeDaySet.add(tx.transaction_date);
      if (tx.type === 'income') {
        totalIncome += amt;
        incomeCount += 1;
      } else if (tx.type === 'expense') {
        totalExpense += amt;
        expenseCount += 1;
        dailyExpenseMap.set(
          tx.transaction_date,
          (dailyExpenseMap.get(tx.transaction_date) || 0) + amt
        );
        if (!maxExpenseTx || amt > Number(maxExpenseTx.amount || 0)) {
          maxExpenseTx = tx;
        }
      } else if (tx.type === 'transfer') {
        totalTransfer += amt;
        transferCount += 1;
      }
    }

    let prevIncome = 0;
    let prevExpense = 0;
    for (const tx of prevPeriodTxs) {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'income') prevIncome += amt;
      else if (tx.type === 'expense') prevExpense += amt;
    }

    const expenseDiffPct =
      prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : null;
    const incomeDiffPct =
      prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : null;

    let peakDate = null;
    let peakAmount = 0;
    for (const [dateStr, sumAmt] of dailyExpenseMap.entries()) {
      if (sumAmt > peakAmount) {
        peakAmount = sumAmt;
        peakDate = dateStr;
      }
    }

    let totalDaysInPeriod = 1;
    if (periodMode === 'all') {
      if (periodTxs.length > 0) {
        const dates = periodTxs.map((t) => t.transaction_date).sort();
        totalDaysInPeriod = getDaysBetween(dates[0], dates[dates.length - 1]);
      }
    } else {
      const effectiveEnd = range.end > todayStr && range.start <= todayStr ? todayStr : range.end;
      totalDaysInPeriod = getDaysBetween(range.start, effectiveEnd);
    }

    const avgExpensePerDay = totalExpense / Math.max(1, totalDaysInPeriod);
    const avgExpensePerTx = expenseCount > 0 ? totalExpense / expenseCount : 0;
    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : null;

    return {
      totalIncome,
      totalExpense,
      totalTransfer,
      incomeCount,
      expenseCount,
      transferCount,
      prevIncome,
      prevExpense,
      expenseDiffPct,
      incomeDiffPct,
      peakDate,
      peakAmount,
      maxExpenseTx,
      totalDaysInPeriod,
      activeDaysCount: activeDaySet.size,
      avgExpensePerDay,
      avgExpensePerTx,
      netBalance,
      savingsRate,
    };
  }, [periodTxs, prevPeriodTxs, periodMode, range, todayStr]);

  // Build Time-Series Buckets for Line Chart
  const chartData = useMemo(() => {
    const monthsShort = isEn ? EN_SHORT_MONTHS : TH_SHORT_MONTHS;
    const buckets = [];

    if (periodMode === 'day') {
      const sorted = [...periodTxs].sort((a, b) => a.id - b.id);
      if (sorted.length === 0) {
        buckets.push({
          key: range.start,
          label: range.start.slice(5),
          fullLabel: range.start,
          expense: 0,
          income: 0,
          txCount: 0,
        });
      } else {
        sorted.forEach((tx, idx) => {
          const amt = Number(tx.amount || 0);
          buckets.push({
            key: `tx-${tx.id}`,
            label: `#${idx + 1}`,
            fullLabel: `${tx.title} (${tx.transaction_date})`,
            expense: tx.type === 'expense' ? amt : 0,
            income: tx.type === 'income' ? amt : 0,
            txCount: 1,
          });
        });
      }
    } else if (periodMode === 'month') {
      const startObj = new Date(range.start + 'T00:00:00');
      const endObj = new Date(range.end + 'T00:00:00');
      const yyyy = startObj.getFullYear();
      const mm = startObj.getMonth();
      const lastD = endObj.getDate();

      const map = new Map();
      for (let d = 1; d <= lastD; d++) {
        const key = `${yyyy}-${String(mm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        map.set(key, {
          key,
          label: String(d),
          fullLabel: `${d} ${monthsShort[mm]} ${yyyy}`,
          expense: 0,
          income: 0,
          txCount: 0,
        });
      }

      for (const tx of periodTxs) {
        const b = map.get(tx.transaction_date);
        if (b) {
          const amt = Number(tx.amount || 0);
          if (tx.type === 'expense') b.expense += amt;
          else if (tx.type === 'income') b.income += amt;
          b.txCount += 1;
        }
      }
      buckets.push(...map.values());
    } else if (periodMode === 'quarter' || periodMode === 'half_year') {
      const startObj = new Date(range.start + 'T00:00:00');
      const endObj = new Date(range.end + 'T00:00:00');
      let cur = new Date(startObj);

      while (cur <= endObj) {
        const wStart = new Date(cur);
        const wEnd = new Date(cur);
        wEnd.setDate(wEnd.getDate() + 6);
        if (wEnd > endObj) wEnd.setTime(endObj.getTime());

        const fmt = (dt) =>
          `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
            dt.getDate()
          ).padStart(2, '0')}`;
        const sKey = fmt(wStart);
        const eKey = fmt(wEnd);
        const shortLabel = `${wStart.getDate()} ${monthsShort[wStart.getMonth()]}`;
        const fullLabel = `${wStart.getDate()} ${monthsShort[wStart.getMonth()]} - ${wEnd.getDate()} ${
          monthsShort[wEnd.getMonth()]
        } ${wEnd.getFullYear()}`;

        buckets.push({
          key: `${sKey}_${eKey}`,
          start: sKey,
          end: eKey,
          label: shortLabel,
          fullLabel,
          expense: 0,
          income: 0,
          txCount: 0,
        });

        cur.setDate(cur.getDate() + 7);
      }

      for (const tx of periodTxs) {
        const b = buckets.find(
          (item) => tx.transaction_date >= item.start && tx.transaction_date <= item.end
        );
        if (b) {
          const amt = Number(tx.amount || 0);
          if (tx.type === 'expense') b.expense += amt;
          else if (tx.type === 'income') b.income += amt;
          b.txCount += 1;
        }
      }
    } else if (periodMode === 'year') {
      const yyyy = range.start.slice(0, 4);
      const map = new Map();
      for (let m = 0; m < 12; m++) {
        const ym = `${yyyy}-${String(m + 1).padStart(2, '0')}`;
        map.set(ym, {
          key: ym,
          label: monthsShort[m],
          fullLabel: `${monthsShort[m]} ${yyyy}`,
          expense: 0,
          income: 0,
          txCount: 0,
        });
      }
      for (const tx of periodTxs) {
        const ym = (tx.transaction_date || '').slice(0, 7);
        const b = map.get(ym);
        if (b) {
          const amt = Number(tx.amount || 0);
          if (tx.type === 'expense') b.expense += amt;
          else if (tx.type === 'income') b.income += amt;
          b.txCount += 1;
        }
      }
      buckets.push(...map.values());
    } else {
      const map = new Map();
      const sorted = [...periodTxs].sort((a, b) =>
        (a.transaction_date || '').localeCompare(b.transaction_date || '')
      );
      for (const tx of sorted) {
        const ym = (tx.transaction_date || '').slice(0, 7);
        if (!ym) continue;
        if (!map.has(ym)) {
          const [y, m] = ym.split('-');
          const mIdx = Math.max(0, Math.min(11, Number(m) - 1));
          map.set(ym, {
            key: ym,
            label: `${monthsShort[mIdx]} ${y.slice(2)}`,
            fullLabel: `${monthsShort[mIdx]} ${y}`,
            expense: 0,
            income: 0,
            txCount: 0,
          });
        }
        const b = map.get(ym);
        const amt = Number(tx.amount || 0);
        if (tx.type === 'expense') b.expense += amt;
        else if (tx.type === 'income') b.income += amt;
        b.txCount += 1;
      }
      if (map.size === 0) {
        const ym = todayStr.slice(0, 7);
        map.set(ym, {
          key: ym,
          label: ym,
          fullLabel: ym,
          expense: 0,
          income: 0,
          txCount: 0,
        });
      }
      buckets.push(...map.values());
    }

    let cumExpense = 0;
    let cumIncome = 0;
    return buckets.map((b) => {
      cumExpense += b.expense;
      cumIncome += b.income;
      return {
        ...b,
        net: b.income - b.expense,
        cumExpense,
        cumIncome,
      };
    });
  }, [periodTxs, periodMode, range, isEn, todayStr]);

  // Detailed Category Breakdown using exact Emojis, Images, and Colors configured in the app
  const categoryBreakdown = useMemo(() => {
    const map = new Map();
    let grandTotal = 0;

    // Seed with categories configured by the user so their custom emojis/images always show
    for (const c of categories) {
      if (c.type !== catTab) continue;
      map.set(String(c.id), {
        id: String(c.id),
        name: c.name,
        emoji: c.icon_emoji || (catTab === 'income' ? '💰' : '🍱'),
        color: c.color || (catTab === 'income' ? '#D4F5E9' : '#FFD6E0'),
        image: c.image_path || null,
        total: 0,
        count: 0,
        max: 0,
        min: Infinity,
      });
    }

    for (const tx of periodTxs) {
      if (tx.type !== catTab) continue;
      const amt = Number(tx.amount || 0);
      grandTotal += amt;
      const key = tx.category_id ? String(tx.category_id) : 'uncategorized';
      const catCfg = tx.category_id ? categoryMap.get(String(tx.category_id)) : null;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: catCfg?.name || tx.category_name || (isEn ? 'Uncategorized' : 'ไม่ระบุหมวดหมู่'),
          emoji:
            catCfg?.icon_emoji ||
            tx.category_emoji ||
            (catTab === 'income' ? '💰' : '🍱'),
          color:
            catCfg?.color ||
            tx.category_color ||
            (catTab === 'income' ? '#D4F5E9' : '#FFD6E0'),
          image: catCfg?.image_path || tx.category_image || null,
          total: 0,
          count: 0,
          max: 0,
          min: Infinity,
        });
      }
      const item = map.get(key);
      item.total += amt;
      item.count += 1;
      if (amt > item.max) item.max = amt;
      if (amt < item.min) item.min = amt;
    }

    const allItems = Array.from(map.values());
    const withTx = allItems.filter((item) => item.count > 0);
    const targetList = withTx.length > 0 ? withTx : allItems;

    return targetList
      .sort((a, b) => b.total - a.total)
      .map((item) => ({
        ...item,
        min: item.min === Infinity ? 0 : item.min,
        avg: item.count > 0 ? item.total / item.count : 0,
        pct: grandTotal > 0 ? (item.total / grandTotal) * 100 : 0,
      }));
  }, [periodTxs, categories, categoryMap, catTab, isEn]);

  // Detailed Wallet Cashflow Breakdown using exact Wallet Emoji & Cover Image
  const walletBreakdown = useMemo(() => {
    const map = new Map();
    for (const acc of accounts) {
      map.set(String(acc.id), {
        id: acc.id,
        name: acc.name,
        emoji: acc.emoji || '👛',
        color: acc.color || '#FFD6E0',
        cover_image: acc.cover_image || null,
        currentBalance: Number(acc.balance || 0),
        income: 0,
        expense: 0,
        transferIn: 0,
        transferOut: 0,
        txCount: 0,
      });
    }

    for (const tx of periodTxs) {
      const amt = Number(tx.amount || 0);
      const fromAcc = map.get(String(tx.account_id));
      if (fromAcc) {
        if (tx.type === 'income') {
          fromAcc.income += amt;
          fromAcc.txCount += 1;
        } else if (tx.type === 'expense') {
          fromAcc.expense += amt;
          fromAcc.txCount += 1;
        } else if (tx.type === 'transfer') {
          fromAcc.transferOut += amt;
          fromAcc.txCount += 1;
        }
      }
      if (tx.type === 'transfer' && tx.to_account_id) {
        const toAcc = map.get(String(tx.to_account_id));
        if (toAcc) {
          toAcc.transferIn += amt;
          toAcc.txCount += 1;
        }
      }
    }

    return Array.from(map.values()).map((w) => ({
      ...w,
      netPeriod: w.income + w.transferIn - w.expense - w.transferOut,
    }));
  }, [accounts, periodTxs]);

  // Top Shops using exact Shop Emoji & Color configured in the app
  const topShops = useMemo(() => {
    const map = new Map();
    for (const tx of periodTxs) {
      if (tx.type !== 'expense' || !tx.shop_id) continue;
      const amt = Number(tx.amount || 0);
      const key = String(tx.shop_id);
      const shopCfg = shopMap.get(key);
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: shopCfg?.name || tx.shop_name || 'Shop',
          emoji: shopCfg?.icon_emoji || tx.shop_emoji || '🏪',
          color: shopCfg?.color || tx.shop_color || '#D6ECFF',
          total: 0,
          count: 0,
        });
      }
      const s = map.get(key);
      s.total += amt;
      s.count += 1;
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [periodTxs, shopMap]);

  const topExpenses = useMemo(() => {
    return periodTxs
      .filter((tx) => tx.type === 'expense')
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 5);
  }, [periodTxs]);

  // SVG Line Chart Geometry
  const svgWidth = 860;
  const svgHeight = 300;
  const padLeft = 64;
  const padRight = 24;
  const padTop = 26;
  const padBottom = 42;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const maxChartVal = useMemo(() => {
    let m = 0;
    for (const d of chartData) {
      if (showExpenseLine && d.expense > m) m = d.expense;
      if (showIncomeLine && d.income > m) m = d.income;
      if (showCumulativeLine && d.cumExpense > m) m = d.cumExpense;
    }
    return m > 0 ? m * 1.12 : 1000;
  }, [chartData, showExpenseLine, showIncomeLine, showCumulativeLine]);

  const getX = (idx) => {
    if (chartData.length <= 1) return padLeft + plotW / 2;
    return padLeft + (idx / (chartData.length - 1)) * plotW;
  };

  const getY = (val) => {
    const ratio = Math.max(0, Math.min(1, val / maxChartVal));
    return padTop + plotH - ratio * plotH;
  };

  const buildPolyline = (key) =>
    chartData.map((d, i) => `${getX(i).toFixed(1)},${getY(d[key]).toFixed(1)}`).join(' ');

  const buildAreaPath = (key) => {
    if (chartData.length === 0) return '';
    const pts = chartData.map((d, i) => `${getX(i).toFixed(1)},${getY(d[key]).toFixed(1)}`);
    const firstX = getX(0).toFixed(1);
    const lastX = getX(chartData.length - 1).toFixed(1);
    const baseY = (padTop + plotH).toFixed(1);
    return `M ${firstX},${baseY} L ${pts.join(' L ')} L ${lastX},${baseY} Z`;
  };

  const activePoint =
    hoverIndex !== null && chartData[hoverIndex] ? chartData[hoverIndex] : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-pastel-pink/70 via-cream-50 to-pastel-sky/60 border-2 border-white rounded-3xl p-5 sm:p-6 shadow-cozy flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <CartoonEmojiBadge
            emoji={selectedAccountObj?.emoji || categories[0]?.icon_emoji || '📈'}
            color={selectedAccountObj?.color || categories[0]?.color || '#FFD6E0'}
            image={selectedAccountObj?.cover_image || categories[0]?.image_path || null}
            size="lg"
          />
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/80 text-pastel-cocoa border border-cream-200 mb-1">
              {isEn ? 'Deep-Dive Financial Analytics' : 'วิเคราะห์การเงินและกราฟแนวโน้มเชิงลึก'}
            </span>
            <h1 className="font-cute font-bold text-xl sm:text-2xl text-pastel-cocoa">
              {isEn
                ? 'Financial Summary & Spending Line Chart'
                : 'สรุปยอดใช้จ่ายย้อนหลัง & กราฟเส้นแนวโน้ม'}
            </h1>
          </div>
        </div>

        {/* Wallet Filter */}
        <div className="w-full sm:w-60">
          <label className="block text-[11px] font-bold text-pastel-cocoa mb-1">
            {selectedAccountObj?.emoji || accounts[0]?.emoji || '👛'}{' '}
            {isEn ? 'Filter by Wallet / Account:' : 'กรองตามกระเป๋าเงิน / บัญชี:'}
          </label>
          <CuteSelect
            size="sm"
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            options={[
              { value: 'all', label: isEn ? '🌟 All Wallets Combined' : '🌟 รวมทุกกระเป๋าเงิน' },
              ...accounts.map((a) => ({
                value: String(a.id),
                label: `${a.emoji || '👛'} ${a.name}`,
              })),
            ]}
          />
        </div>
      </div>

      {/* Period Filter Control Bar: Single horizontal line on desktop (no Today button, matches Overview) */}
      <div className="bg-cream-50 border-2 border-white rounded-3xl p-4 shadow-cozy flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 lg:flex-nowrap">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap items-center gap-1.5 shrink-0">
          {[
            { id: 'day', label: t('periodDay') },
            { id: 'month', label: t('periodMonth') },
            { id: 'quarter', label: t('periodQuarter') },
            { id: 'half_year', label: t('periodHalfYear') },
            { id: 'year', label: t('periodYear') },
            { id: 'all', label: t('periodAll') },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPeriodMode(p.id);
                setHoverIndex(null);
              }}
              className={`px-3 py-2 rounded-2xl font-cute font-bold text-xs transition-all whitespace-nowrap ${
                periodMode === p.id
                  ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border-2 border-white'
                  : 'bg-cream-100 text-pastel-muted hover:bg-cream-200 border-2 border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs lg:ml-auto shrink-0">
          {periodMode !== 'all' && (
            <>
              <span className="text-pastel-muted font-medium whitespace-nowrap">
                {t('refDateLabel')}
              </span>
              <CuteDatePicker
                size="sm"
                align="right"
                value={refDate}
                onChange={setRefDate}
                className="w-36 sm:w-40"
              />
            </>
          )}

          <span className="bg-pastel-butter/80 px-3 py-1.5 rounded-2xl font-cute font-bold text-xs text-pastel-cocoa border border-white shadow-sm whitespace-nowrap">
            📌 {range.label}
          </span>
        </div>
      </div>

      {/* 6 Deep-Dive Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total Expense + vs Previous Period */}
        <div className="bg-pastel-pink/65 border-2 border-white rounded-3xl p-4 shadow-sticker flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-pastel-cocoa/80">
                🧁 {isEn ? 'Total Expense in Period' : 'ยอดใช้จ่ายรวมในช่วงนี้'}
              </p>
              <p className="font-cute font-bold text-2xl text-rose-700 mt-1">
                -฿{formatCurrency(kpis.totalExpense)}
              </p>
            </div>
            {kpis.expenseDiffPct !== null && (
              <span
                className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[11px] font-cute font-bold border border-white shadow-sm ${
                  kpis.expenseDiffPct <= 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {kpis.expenseDiffPct > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {Math.abs(kpis.expenseDiffPct).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/60 flex items-center justify-between text-[11px] text-pastel-cocoa/80">
            <span>
              {isEn ? `${kpis.expenseCount} expense records` : `จาก ${kpis.expenseCount} รายการจ่าย`}
            </span>
            {prevRange && (
              <span>
                {isEn ? 'Prev:' : 'งวดก่อน:'} ฿{formatCurrency(kpis.prevExpense)}
              </span>
            )}
          </div>
        </div>

        {/* 2. Total Income + vs Previous Period */}
        <div className="bg-pastel-mint/75 border-2 border-white rounded-3xl p-4 shadow-sticker flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-pastel-cocoa/80">
                💰 {isEn ? 'Total Income in Period' : 'ยอดรายรับรวมในช่วงนี้'}
              </p>
              <p className="font-cute font-bold text-2xl text-emerald-800 mt-1">
                +฿{formatCurrency(kpis.totalIncome)}
              </p>
            </div>
            {kpis.incomeDiffPct !== null && (
              <span
                className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-[11px] font-cute font-bold border border-white shadow-sm ${
                  kpis.incomeDiffPct >= 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {kpis.incomeDiffPct >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {Math.abs(kpis.incomeDiffPct).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/60 flex items-center justify-between text-[11px] text-pastel-cocoa/80">
            <span>
              {isEn ? `${kpis.incomeCount} income records` : `จาก ${kpis.incomeCount} รายการรับ`}
            </span>
            {prevRange && (
              <span>
                {isEn ? 'Prev:' : 'งวดก่อน:'} ฿{formatCurrency(kpis.prevIncome)}
              </span>
            )}
          </div>
        </div>

        {/* 3. Net Cashflow & Savings Rate */}
        <div className="bg-pastel-butter/85 border-2 border-white rounded-3xl p-4 shadow-sticker flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-pastel-cocoa/80">
                ✨ {isEn ? 'Net Cashflow (Income - Expense)' : 'คงเหลือสุทธิ (รายรับ - รายจ่าย)'}
              </p>
              <p
                className={`font-cute font-bold text-2xl mt-1 ${
                  kpis.netBalance >= 0 ? 'text-emerald-800' : 'text-rose-700'
                }`}
              >
                {kpis.netBalance >= 0 ? '+' : ''}฿{formatCurrency(kpis.netBalance)}
              </p>
            </div>
            {kpis.savingsRate !== null && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-cute font-bold bg-white/80 text-pastel-cocoa border border-white">
                {isEn ? 'Saved' : 'ออมได้'} {kpis.savingsRate.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/60 flex items-center justify-between text-[11px] text-pastel-cocoa/80">
            <span>
              {kpis.netBalance >= 0
                ? isEn
                  ? '🌸 Positive cashflow!'
                  : '🌸 เงินเหลือเก็บในงวดนี้!'
                : isEn
                ? '⚠️ Expenses exceeded income'
                : '⚠️ รายจ่ายสูงกว่ารายรับในงวดนี้'}
            </span>
          </div>
        </div>

        {/* 4. Daily Average & Per-Transaction Average */}
        <div className="bg-pastel-lavender/75 border-2 border-white rounded-3xl p-4 shadow-sticker flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-pastel-cocoa/80">
              📅 {isEn ? 'Average Daily Spend' : 'ค่าเฉลี่ยการใช้จ่ายต่อวัน'}
            </p>
            <p className="font-cute font-bold text-2xl text-pastel-cocoa mt-1">
              ฿{formatCurrency(kpis.avgExpensePerDay)}
              <span className="text-xs font-normal text-pastel-muted">
                {' '}
                / {isEn ? 'day' : 'วัน'}
              </span>
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/60 flex items-center justify-between text-[11px] text-pastel-cocoa/80">
            <span>
              {isEn ? 'Avg / item:' : 'เฉลี่ยต่อบิล:'} ฿{formatCurrency(kpis.avgExpensePerTx)}
            </span>
            <span>
              {isEn
                ? `Active ${kpis.activeDaysCount}/${kpis.totalDaysInPeriod} days`
                : `มีการใช้จ่าย ${kpis.activeDaysCount}/${kpis.totalDaysInPeriod} วัน`}
            </span>
          </div>
        </div>

        {/* 5. Peak Spending Day & Single Largest Expense */}
        <div className="bg-pastel-peach/80 border-2 border-white rounded-3xl p-4 shadow-sticker flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-pastel-cocoa/80">
              🔥 {isEn ? 'Peak Spending Day' : 'วันที่ใช้จ่ายสูงสุดในงวดนี้'}
            </p>
            {kpis.peakDate ? (
              <p className="font-cute font-bold text-xl text-rose-700 mt-1">
                ฿{formatCurrency(kpis.peakAmount)}{' '}
                <span className="text-xs font-bold text-pastel-cocoa">({kpis.peakDate})</span>
              </p>
            ) : (
              <p className="font-cute font-bold text-base text-pastel-muted mt-1">
                {isEn ? 'No expenses yet' : 'ยังไม่มีรายจ่าย'}
              </p>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/60 text-[11px] text-pastel-cocoa/80 truncate">
            {kpis.maxExpenseTx ? (
              <span>
                {categoryMap.get(String(kpis.maxExpenseTx.category_id))?.icon_emoji ||
                  kpis.maxExpenseTx.category_emoji ||
                  '🏆'}{' '}
                {isEn ? 'Max Bill:' : 'บิลใหญ่สุด:'} <b>{kpis.maxExpenseTx.title}</b> (฿
                {formatCurrency(kpis.maxExpenseTx.amount)})
              </span>
            ) : (
              <span>{isEn ? 'No bills recorded' : 'ยังไม่มีบิลในงวดนี้'}</span>
            )}
          </div>
        </div>

        {/* 6. Transfers & Total Activity */}
        <div className="bg-pastel-sky/75 border-2 border-white rounded-3xl p-4 shadow-sticker flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-pastel-cocoa/80">
              🔄 {isEn ? 'Transfers Between Wallets' : 'ยอดโอนย้ายระหว่างกระเป๋า'}
            </p>
            <p className="font-cute font-bold text-2xl text-sky-800 mt-1">
              ⇄ ฿{formatCurrency(kpis.totalTransfer)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/60 flex items-center justify-between text-[11px] text-pastel-cocoa/80">
            <span>
              {isEn
                ? `${kpis.transferCount} transfers`
                : `โอนย้าย ${kpis.transferCount} รายการ`}
            </span>
            <span>
              {isEn
                ? `Total ${periodTxs.length} records`
                : `รวมทั้งหมด ${periodTxs.length} รายการ`}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Line Chart Card */}
      <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 sm:p-6 shadow-cozy space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-cute font-bold text-lg sm:text-xl text-pastel-cocoa flex items-center gap-2">
              <span>📈</span>
              <span>
                {isEn
                  ? `Spending & Income Trend Line Chart (${range.label})`
                  : `กราฟเส้นแนวโน้มการใช้จ่าย & รายรับ (${range.label})`}
              </span>
            </h2>
            <p className="text-xs text-pastel-muted">
              {isEn
                ? 'Hover or tap on any data point to inspect exact figures for that day/period'
                : 'เลื่อนเมาส์หรือแตะที่จุดบนกราฟเพื่อดูยอดรายจ่าย รายรับ และยอดสะสมในแต่ละช่วงเวลา'}
            </p>
          </div>

          {/* Series Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExpenseLine((v) => !v)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-cute font-bold border transition-all flex items-center gap-1.5 ${
                showExpenseLine
                  ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-sm'
                  : 'bg-cream-100 border-cream-200 text-pastel-muted opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5D8F] inline-block" />
              {isEn ? 'Expense Line' : 'เส้นรายจ่าย'}
            </button>

            <button
              type="button"
              onClick={() => setShowIncomeLine((v) => !v)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-cute font-bold border transition-all flex items-center gap-1.5 ${
                showIncomeLine
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-sm'
                  : 'bg-cream-100 border-cream-200 text-pastel-muted opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#2DC653] inline-block" />
              {isEn ? 'Income Line' : 'เส้นรายรับ'}
            </button>

            <button
              type="button"
              onClick={() => setShowCumulativeLine((v) => !v)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-cute font-bold border transition-all flex items-center gap-1.5 ${
                showCumulativeLine
                  ? 'bg-purple-100 border-purple-300 text-purple-800 shadow-sm'
                  : 'bg-cream-100 border-cream-200 text-pastel-muted opacity-60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] inline-block" />
              {isEn ? 'Cumulative Expense' : 'เส้นรายจ่ายสะสม'}
            </button>
          </div>
        </div>

        {/* Active Hover Banner */}
        <div className="bg-white/90 border border-cream-200 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {activePoint ? (
            <>
              <div className="font-cute font-bold text-pastel-cocoa flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-xl bg-pastel-butter text-pastel-cocoa">
                  📅 {activePoint.fullLabel}
                </span>
                <span className="text-pastel-muted">
                  ({activePoint.txCount} {isEn ? 'items' : 'รายการ'})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 font-cute font-bold">
                <span className="text-rose-600">
                  🧁 {isEn ? 'Expense:' : 'จ่าย:'} ฿{formatCurrency(activePoint.expense)}
                </span>
                <span className="text-emerald-700">
                  💰 {isEn ? 'Income:' : 'รับ:'} ฿{formatCurrency(activePoint.income)}
                </span>
                <span className="text-purple-700">
                  📈 {isEn ? 'Cumulative Expense:' : 'จ่ายสะสม:'} ฿
                  {formatCurrency(activePoint.cumExpense)}
                </span>
              </div>
            </>
          ) : (
            <span className="text-pastel-muted">
              💡{' '}
              {isEn
                ? 'Move your cursor over the line chart below to see detailed numbers for each point.'
                : 'ชี้เมาส์ที่จุดบนกราฟด้านล่างเพื่อดูตัวเลขรายจ่าย-รายรับแบบละเอียดของแต่ละวัน/ช่วงเวลาจ้า'}
            </span>
          )}
        </div>

        {/* Responsive SVG Line Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full min-w-[600px] h-auto select-none bg-gradient-to-b from-white/90 to-cream-100/60 rounded-2xl border border-cream-200 p-2"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="expAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF5D8F" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#FF5D8F" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="incAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2DC653" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2DC653" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((step) => {
              const val = maxChartVal * step;
              const y = getY(val);
              return (
                <g key={step}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#EFE5DC"
                    strokeDasharray={step === 0 ? undefined : '4 4'}
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#8D7B74"
                    fontWeight="600"
                  >
                    {val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k` : Math.round(val)}
                  </text>
                </g>
              );
            })}

            {/* Area Fills */}
            {showIncomeLine && chartData.length > 1 && (
              <path d={buildAreaPath('income')} fill="url(#incAreaGrad)" />
            )}
            {showExpenseLine && chartData.length > 1 && (
              <path d={buildAreaPath('expense')} fill="url(#expAreaGrad)" />
            )}

            {/* Cumulative Expense Dashed Line */}
            {showCumulativeLine && chartData.length > 1 && (
              <polyline
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildPolyline('cumExpense')}
              />
            )}

            {/* Income Line */}
            {showIncomeLine && chartData.length > 1 && (
              <polyline
                fill="none"
                stroke="#2DC653"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildPolyline('income')}
              />
            )}

            {/* Expense Line */}
            {showExpenseLine && chartData.length > 1 && (
              <polyline
                fill="none"
                stroke="#FF5D8F"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildPolyline('expense')}
              />
            )}

            {/* Active Vertical Guide Line */}
            {hoverIndex !== null && chartData[hoverIndex] && (
              <line
                x1={getX(hoverIndex)}
                y1={padTop}
                x2={getX(hoverIndex)}
                y2={padTop + plotH}
                stroke="#C9B6AD"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            )}

            {/* Data Points & X-Axis Labels */}
            {chartData.map((d, i) => {
              const x = getX(i);
              const showLabel =
                chartData.length <= 16 ||
                i === 0 ||
                i === chartData.length - 1 ||
                i % Math.ceil(chartData.length / 12) === 0;
              const isHovered = hoverIndex === i;

              return (
                <g key={d.key}>
                  {showLabel && (
                    <text
                      x={x}
                      y={svgHeight - 14}
                      textAnchor="middle"
                      fontSize="10"
                      fill={isHovered ? '#4A3B36' : '#8D7B74'}
                      fontWeight={isHovered ? '700' : '500'}
                    >
                      {d.label}
                    </text>
                  )}

                  {showCumulativeLine && (
                    <circle
                      cx={x}
                      cy={getY(d.cumExpense)}
                      r={isHovered ? 5.5 : 3}
                      fill="#8B5CF6"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  )}

                  {showIncomeLine && (
                    <circle
                      cx={x}
                      cy={getY(d.income)}
                      r={isHovered ? 6 : 3.5}
                      fill="#2DC653"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  )}

                  {showExpenseLine && (
                    <circle
                      cx={x}
                      cy={getY(d.expense)}
                      r={isHovered ? 6.5 : 4}
                      fill="#FF5D8F"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )}

                  {/* Invisible Hit Column for Easy Hover */}
                  <rect
                    x={x - Math.max(8, plotW / Math.max(2, chartData.length * 2))}
                    y={padTop}
                    width={Math.max(16, plotW / Math.max(1, chartData.length))}
                    height={plotH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(i)}
                    onClick={() => setHoverIndex(i)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Detailed Category Breakdown + Wallet Cashflow Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Deep Category Breakdown */}
        <div className="lg:col-span-7 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-cute font-bold text-lg text-pastel-cocoa">
                🏷️{' '}
                {isEn
                  ? 'Detailed Breakdown by Category'
                  : 'สรุปยอดเงินเจาะลึกแยกตามหมวดหมู่'}
              </h3>
              <p className="text-xs text-pastel-muted">
                {isEn
                  ? 'Uses the custom emojis, images, and colors you configured for each category'
                  : 'อ้างอิงอีโมจิ รูปภาพ และสีประจำหมวดหมู่ที่คุณตั้งค่าไว้ในแอป'}
              </p>
            </div>

            <div className="flex items-center bg-cream-100 p-1 rounded-2xl border border-cream-300">
              <button
                type="button"
                onClick={() => setCatTab('expense')}
                className={`px-3 py-1.5 rounded-xl text-xs font-cute font-bold transition-all ${
                  catTab === 'expense'
                    ? 'bg-pastel-pink text-pastel-cocoa shadow-sm border border-white'
                    : 'text-pastel-muted'
                }`}
              >
                🧁 {isEn ? 'Expenses' : 'รายจ่าย'}
              </button>
              <button
                type="button"
                onClick={() => setCatTab('income')}
                className={`px-3 py-1.5 rounded-xl text-xs font-cute font-bold transition-all ${
                  catTab === 'income'
                    ? 'bg-pastel-mint text-pastel-cocoa shadow-sm border border-white'
                    : 'text-pastel-muted'
                }`}
              >
                💰 {isEn ? 'Income' : 'รายรับ'}
              </button>
            </div>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-12 text-pastel-muted text-sm">
              {isEn
                ? 'No categories or transactions found for the selected period 🌸'
                : 'ยังไม่มีรายการของหมวดหมู่นี้ในช่วงเวลาที่เลือกจ้า 🌸'}
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl bg-cream-100/80 border border-cream-200 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CartoonEmojiBadge
                        emoji={cat.emoji}
                        color={cat.color}
                        image={cat.image}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="font-cute font-bold text-sm text-pastel-cocoa truncate">
                          {cat.name}
                        </p>
                        <p className="text-[11px] text-pastel-muted">
                          {cat.count} {isEn ? 'items' : 'ครั้ง'} • {isEn ? 'Avg' : 'เฉลี่ย'} ฿
                          {formatCurrency(cat.avg)}/{isEn ? 'item' : 'ครั้ง'} •{' '}
                          {isEn ? 'Max' : 'สูงสุด'} ฿{formatCurrency(cat.max)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`font-cute font-bold text-base ${
                          catTab === 'expense' ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        ฿{formatCurrency(cat.total)}
                      </p>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-pastel-cocoa border border-cream-200">
                        {cat.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar colored with the Category's configured color */}
                  <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-cream-200">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.total > 0 ? Math.max(4, cat.pct) : 0}%`,
                        backgroundColor:
                          cat.color || (catTab === 'expense' ? '#FF758F' : '#52B788'),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 cols: Wallet Cashflow + Top 5 Bills + Top Shops + Active Memberships */}
        <div className="lg:col-span-5 space-y-6">
          {/* Wallet Cashflow Breakdown */}
          <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy space-y-3">
            <h3 className="font-cute font-bold text-lg text-pastel-cocoa">
              {accounts[0]?.emoji || '👛'}{' '}
              {isEn
                ? 'Cashflow by Wallet / Account'
                : 'สรุปเงินเข้า-ออกแยกตามกระเป๋าเงิน'}
            </h3>
            <div className="space-y-2.5">
              {walletBreakdown.map((w) => (
                <div
                  key={w.id}
                  style={{ backgroundColor: `${w.color}40` }}
                  className="p-3 rounded-2xl border border-white shadow-sm space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CartoonEmojiBadge
                        emoji={w.emoji}
                        color={w.color}
                        image={w.cover_image}
                        size="sm"
                      />
                      <span className="font-cute font-bold text-sm text-pastel-cocoa truncate">
                        {w.name}
                      </span>
                    </div>
                    <span className="text-xs font-cute font-bold bg-white/80 px-2.5 py-0.5 rounded-xl text-pastel-cocoa">
                      {isEn ? 'Bal:' : 'คงเหลือ:'} ฿{formatCurrency(w.currentBalance)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="bg-white/75 rounded-xl p-1.5 text-center">
                      <span className="text-pastel-muted block">
                        {isEn ? 'Inflow' : 'เงินเข้า'}
                      </span>
                      <span className="font-bold text-emerald-700">
                        +฿{formatCurrency(w.income + w.transferIn)}
                      </span>
                    </div>
                    <div className="bg-white/75 rounded-xl p-1.5 text-center">
                      <span className="text-pastel-muted block">
                        {isEn ? 'Outflow' : 'เงินออก'}
                      </span>
                      <span className="font-bold text-rose-600">
                        -฿{formatCurrency(w.expense + w.transferOut)}
                      </span>
                    </div>
                    <div className="bg-white/75 rounded-xl p-1.5 text-center">
                      <span className="text-pastel-muted block">
                        {isEn ? 'Net Period' : 'สุทธิงวดนี้'}
                      </span>
                      <span
                        className={`font-bold ${
                          w.netPeriod >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {w.netPeriod >= 0 ? '+' : ''}฿{formatCurrency(w.netPeriod)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Largest Expenses in Period (Using User's Category/Wallet Emoji & Image) */}
          <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy space-y-3">
            <h3 className="font-cute font-bold text-lg text-pastel-cocoa">
              🏆{' '}
              {isEn
                ? 'Top 5 Largest Expenses in Period'
                : '5 อันดับรายจ่ายสูงสุดในช่วงเวลานี้'}
            </h3>
            {topExpenses.length === 0 ? (
              <p className="text-xs text-pastel-muted py-4 text-center">
                {isEn ? 'No expenses in this period' : 'ไม่มีรายการรายจ่ายในช่วงเวลานี้'}
              </p>
            ) : (
              <div className="space-y-2">
                {topExpenses.map((tx) => {
                  const catCfg = tx.category_id ? categoryMap.get(String(tx.category_id)) : null;
                  const accCfg = tx.account_id ? accountMap.get(String(tx.account_id)) : null;
                  const shpCfg = tx.shop_id ? shopMap.get(String(tx.shop_id)) : null;

                  const catEmoji = catCfg?.icon_emoji || tx.category_emoji || '🍱';
                  const catColor = catCfg?.color || tx.category_color || '#FFD6E0';
                  const catImage = catCfg?.image_path || tx.category_image || null;
                  const catName = catCfg?.name || tx.category_name || '-';
                  const accEmoji = accCfg?.emoji || tx.account_emoji || '👛';
                  const accName = accCfg?.name || tx.account_name || '';

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-cream-100/90 border border-cream-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CartoonEmojiBadge
                          emoji={catEmoji}
                          color={catColor}
                          image={catImage}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="font-cute font-bold text-xs text-pastel-cocoa truncate">
                            {tx.title}
                          </p>
                          <p className="text-[10px] text-pastel-muted truncate">
                            📅 {tx.transaction_date} • {catEmoji} {catName}
                            {accName ? ` • ${accEmoji} ${accName}` : ''}
                            {shpCfg ? ` • ${shpCfg.icon_emoji} ${shpCfg.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(tx.slip_image || tx.attachment_image) && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveSlip({
                                url: tx.slip_image || tx.attachment_image,
                                title: tx.title,
                                amount: tx.amount,
                                date: tx.transaction_date,
                              })
                            }
                            className="p-1.5 rounded-xl bg-pastel-butter text-pastel-cocoa hover:bg-amber-200"
                            title={isEn ? 'View Slip/Photo' : 'ดูรูป/สลิป'}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="font-cute font-bold text-sm text-rose-600">
                          -฿{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Shops using User's Shop Emoji & Color */}
          {topShops.length > 0 && (
            <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy space-y-3">
              <h3 className="font-cute font-bold text-lg text-pastel-cocoa">
                {shops[0]?.icon_emoji || '🏪'}{' '}
                {isEn ? 'Top Shops / Merchants' : 'ร้านค้าที่ใช้จ่ายสูงสุดในช่วงนี้'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {topShops.map((s) => (
                  <div
                    key={s.id}
                    style={{ backgroundColor: s.color || '#D6ECFF' }}
                    className="p-3 rounded-2xl border border-white shadow-sm flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CartoonEmojiBadge emoji={s.emoji} color={s.color} size="sm" />
                      <div className="min-w-0">
                        <p className="font-cute font-bold text-xs text-pastel-cocoa truncate">
                          {s.name}
                        </p>
                        <p className="text-[10px] text-pastel-cocoa/80">
                          {s.count} {isEn ? 'visits' : 'ครั้ง'}
                        </p>
                      </div>
                    </div>
                    <span className="font-cute font-bold text-xs text-pastel-cocoa shrink-0">
                      ฿{formatCurrency(s.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Apps / Memberships using User's Configured App Emoji & Color */}
          {memberships.length > 0 && (
            <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy space-y-3">
              <h3 className="font-cute font-bold text-lg text-pastel-cocoa">
                {memberships[0]?.icon_emoji || '🎀'}{' '}
                {isEn ? 'Configured Apps & Memberships' : 'แอปและบริการสมาชิกที่ตั้งค่าไว้'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {memberships.map((m) => {
                  const catCfg = m.category_id ? categoryMap.get(String(m.category_id)) : null;
                  const appEmoji = m.icon_emoji || catCfg?.icon_emoji || '🎀';
                  const appColor = m.color || catCfg?.color || '#FFD6E0';
                  return (
                    <div
                      key={m.id}
                      style={{ backgroundColor: appColor }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-white shadow-sm text-xs text-pastel-cocoa"
                    >
                      <span className="text-base">{appEmoji}</span>
                      <span className="font-cute font-bold">{m.name}</span>
                      <span className="font-bold">฿{formatCurrency(m.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeSlip && (
        <SlipModal
          slipUrl={activeSlip.url}
          title={activeSlip.title}
          amount={activeSlip.amount}
          date={activeSlip.date}
          onClose={() => setActiveSlip(null)}
        />
      )}
    </div>
  );
}
