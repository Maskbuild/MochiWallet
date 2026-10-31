import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Wallet, Sparkles, Image as ImageIcon } from 'lucide-react';
import { CartoonEmojiBadge, MochiMascot, formatCurrency } from '../components/CuteStickers.jsx';
import CuteDatePicker from '../components/CuteDatePicker.jsx';
import { FormattedNote } from '../components/CuteNoteEditor.jsx';
import { useI18n } from '../i18n.jsx';
import GithubHeatmap from '../components/GithubHeatmap.jsx';
import SlipModal from '../components/SlipModal.jsx';

export function computeDateRange(periodMode, refDateStr, lang = 'th') {
  const base = refDateStr ? new Date(refDateStr + 'T00:00:00') : new Date();
  const yyyy = base.getFullYear();
  const mm = base.getMonth(); // 0..11
  const dd = base.getDate();

  const fmt = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();

  if (periodMode === 'day') {
    const s = fmt(yyyy, mm, dd);
    return {
      start: s,
      end: s,
      label: lang === 'en' ? `Daily (${s})` : `รายวัน (${s})`,
    };
  }
  if (periodMode === 'month') {
    const s = fmt(yyyy, mm, 1);
    const e = fmt(yyyy, mm, lastDay(yyyy, mm));
    const ym = `${yyyy}-${String(mm + 1).padStart(2, '0')}`;
    return {
      start: s,
      end: e,
      label: lang === 'en' ? `Monthly (${ym})` : `รายเดือน (${ym})`,
    };
  }
  if (periodMode === 'quarter') {
    const qIndex = Math.floor(mm / 3); // 0..3
    const startMonth = qIndex * 3;
    const endMonth = startMonth + 2;
    const s = fmt(yyyy, startMonth, 1);
    const e = fmt(yyyy, endMonth, lastDay(yyyy, endMonth));
    // Concise badge label so it stays exact same width/alignment as Monthly & Daily
    return {
      start: s,
      end: e,
      label:
        lang === 'en'
          ? `Quarterly (Q${qIndex + 1}/${yyyy})`
          : `รายไตรมาส (Q${qIndex + 1}/${yyyy})`,
    };
  }
  if (periodMode === 'half_year') {
    const halfIdx = mm < 6 ? 0 : 1;
    const startMonth = halfIdx === 0 ? 0 : 6;
    const endMonth = halfIdx === 0 ? 5 : 11;
    const s = fmt(yyyy, startMonth, 1);
    const e = fmt(yyyy, endMonth, lastDay(yyyy, endMonth));
    return {
      start: s,
      end: e,
      label:
        lang === 'en'
          ? `Half-Year (H${halfIdx + 1}/${yyyy})`
          : `ราย 6 เดือน (H${halfIdx + 1}/${yyyy})`,
    };
  }
  if (periodMode === 'year') {
    const s = `${yyyy}-01-01`;
    const e = `${yyyy}-12-31`;
    return {
      start: s,
      end: e,
      label: lang === 'en' ? `Yearly (${yyyy})` : `รายปี (${yyyy})`,
    };
  }
  return {
    start: '0000-01-01',
    end: '9999-12-31',
    label: lang === 'en' ? 'All Time' : 'ทั้งหมด',
  };
}

export default function Dashboard({
  accounts,
  transactions,
  budgets,
  memberships,
  heatmapData,
}) {
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const [periodMode, setPeriodMode] = useState('month');
  const [refDate, setRefDate] = useState(todayStr);
  const [activeSlip, setActiveSlip] = useState(null);
  const [dashPage, setDashPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const range = useMemo(
    () => computeDateRange(periodMode, refDate, lang),
    [periodMode, refDate, lang]
  );

  const filteredTx = useMemo(() => {
    return transactions.filter(
      (tItem) => tItem.transaction_date >= range.start && tItem.transaction_date <= range.end
    );
  }, [transactions, range]);

  const totalDashPages = Math.max(1, Math.ceil(filteredTx.length / ITEMS_PER_PAGE));
  const paginatedDashTx = useMemo(() => {
    const safePage = Math.min(dashPage, totalDashPages);
    const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredTx.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredTx, dashPage, totalDashPages]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let transfer = 0;
    const byCategory = {};

    for (const tx of filteredTx) {
      if (tx.type === 'income') income += Number(tx.amount);
      else if (tx.type === 'expense') {
        expense += Number(tx.amount);
        const key = tx.category_id || 'uncat';
        if (!byCategory[key]) {
          byCategory[key] = {
            name: tx.category_name || (lang === 'en' ? 'Uncategorized' : 'ไม่ระบุหมวดหมู่'),
            emoji: tx.category_emoji || '🏷️',
            color: tx.category_color || '#FFE0C8',
            image: tx.category_image || null,
            total: 0,
          };
        }
        byCategory[key].total += Number(tx.amount);
      } else if (tx.type === 'transfer') {
        transfer += Number(tx.amount);
      }
    }

    const catList = Object.values(byCategory).sort((a, b) => b.total - a.total);
    return { income, expense, transfer, net: income - expense, catList };
  }, [filteredTx, lang]);

  const totalAssets = useMemo(
    () => accounts.reduce((acc, a) => acc + Number(a.balance || 0), 0),
    [accounts]
  );

  const activeMemberships = useMemo(
    () => memberships.filter((m) => m.status === 'active'),
    [memberships]
  );

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner - Buttons flush to the right edge */}
      <div className="bg-gradient-to-r from-[#FFF5F8] via-[#FFFDF9] to-[#F2FBF7] border-2 border-white rounded-3xl p-5 sm:p-6 shadow-cozy flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <MochiMascot mood="happy" className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" />
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pastel-pink/70 text-xs font-semibold text-pastel-cocoa mb-1">
              <Sparkles className="w-3.5 h-3.5" /> {t('badgeSub')}
            </div>
            <h1 className="font-cute font-bold text-xl sm:text-2xl text-pastel-cocoa">
              {t('welcomeTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-pastel-muted mt-1">
              {t('totalAssetsNow')}{' '}
              <span className="font-bold text-pastel-cocoa bg-pastel-butter px-2.5 py-0.5 rounded-xl">
                ฿{formatCurrency(totalAssets)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 xl:ml-auto shrink-0 w-full xl:w-auto">
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa font-cute font-bold text-xs sm:text-sm shadow-sticker border-2 border-white transition-transform hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" /> {t('btnAddTx')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-pastel-mint hover:bg-pastel-teal text-pastel-cocoa font-cute font-bold text-xs sm:text-sm shadow-sticker border-2 border-white transition-transform hover:-translate-y-0.5 whitespace-nowrap"
          >
            <Wallet className="w-4 h-4 shrink-0" /> {t('btnAddWallet')}
          </button>
        </div>
      </div>

      {/* Period Filter Control Bar: Always aligned on one line on desktop (Quarterly matches Monthly/Daily) + Custom Date Picker UI */}
      <div className="bg-cream-50 border-2 border-white rounded-3xl p-4 shadow-cozy flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
          {[
            { id: 'day', label: t('periodDay') },
            { id: 'month', label: t('periodMonth') },
            { id: 'quarter', label: t('periodQuarter') },
            { id: 'half_year', label: t('periodHalfYear') },
            { id: 'year', label: t('periodYear') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setPeriodMode(tab.id);
                setDashPage(1);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-cute font-bold transition-all whitespace-nowrap ${
                periodMode === tab.id
                  ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border-2 border-white'
                  : 'bg-cream-100 text-pastel-muted hover:bg-cream-200 border-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs sm:text-sm xl:ml-auto shrink-0">
          <span className="text-pastel-muted font-medium whitespace-nowrap">
            {t('refDateLabel')}
          </span>
          <CuteDatePicker
            size="sm"
            align="right"
            value={refDate}
            onChange={(val) => {
              setRefDate(val);
              setDashPage(1);
            }}
            className="w-40"
          />
          <span className="bg-pastel-butter/70 px-3 py-1.5 rounded-2xl font-semibold text-xs whitespace-nowrap">
            📌 {range.label}
          </span>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex items-center gap-4">
          <CartoonEmojiBadge emoji="💰" color="#D4F5E9" size="lg" />
          <div>
            <p className="text-xs text-pastel-muted font-medium">{t('incomeInPeriod')}</p>
            <p className="font-cute font-bold text-2xl text-emerald-700">
              +฿{formatCurrency(summary.income)}
            </p>
            <p className="text-[11px] text-pastel-muted">{range.label}</p>
          </div>
        </div>

        <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex items-center gap-4">
          <CartoonEmojiBadge emoji="🧁" color="#FFD6E0" size="lg" />
          <div>
            <p className="text-xs text-pastel-muted font-medium">{t('expenseInPeriod')}</p>
            <p className="font-cute font-bold text-2xl text-rose-600">
              -฿{formatCurrency(summary.expense)}
            </p>
            <p className="text-[11px] text-pastel-muted">{range.label}</p>
          </div>
        </div>

        <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex items-center gap-4">
          <CartoonEmojiBadge emoji="🔄" color="#D6ECFF" size="lg" />
          <div>
            <p className="text-xs text-pastel-muted font-medium">{t('transferInPeriod')}</p>
            <p className="font-cute font-bold text-2xl text-sky-700">
              ฿{formatCurrency(summary.transfer)}
            </p>
            <p className="text-[11px] text-pastel-muted">{t('moveBetweenWallets')}</p>
          </div>
        </div>

        <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex items-center gap-4">
          <CartoonEmojiBadge emoji={summary.net >= 0 ? '🌸' : '🌧️'} color="#FFF2B2" size="lg" />
          <div>
            <p className="text-xs text-pastel-muted font-medium">{t('netBalance')}</p>
            <p
              className={`font-cute font-bold text-2xl ${
                summary.net >= 0 ? 'text-pastel-cocoa' : 'text-rose-600'
              }`}
            >
              {summary.net >= 0 ? '+' : ''}฿{formatCurrency(summary.net)}
            </p>
            <p className="text-[11px] text-pastel-muted">
              {t('fromItems', { n: filteredTx.length })}
            </p>
          </div>
        </div>
      </div>

      {/* GitHub Contribution Heatmap */}
      <GithubHeatmap dailyData={heatmapData?.daily || []} />

      {/* Wallets Preview + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-cute font-bold text-lg text-pastel-cocoa flex items-center gap-2">
              {t('walletsTitle')} ({accounts.length})
            </h3>
            <button
              type="button"
              onClick={() => navigate('/accounts')}
              className="text-xs font-semibold text-pastel-cocoa bg-pastel-pink/60 hover:bg-pastel-pink px-3 py-1.5 rounded-xl transition-colors"
            >
              {t('manageAllAccounts')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                style={{ backgroundColor: acc.color || '#FFD6E0' }}
                className="rounded-3xl p-4 border-2 border-white shadow-sticker relative overflow-hidden flex flex-col justify-between gap-2 transition-transform hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-sm border border-white flex items-center justify-center shrink-0 overflow-hidden">
                    {acc.cover_image ? (
                      <img
                        src={acc.cover_image}
                        alt={acc.name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-3xl">{acc.emoji || '👛'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/60 px-2 py-0.5 rounded-full text-pastel-cocoa">
                      {acc.type === 'cash'
                        ? t('accTypeCash')
                        : acc.type === 'savings'
                        ? t('accTypeSavings')
                        : acc.type === 'ewallet'
                        ? t('accTypeEwallet')
                        : t('accTypeBank')}
                    </span>
                    <h4 className="font-cute font-bold text-base text-pastel-cocoa truncate mt-0.5">
                      {acc.name}
                    </h4>
                    <p className="font-cute font-bold text-lg text-pastel-cocoa">
                      ฿{formatCurrency(acc.balance)}
                    </p>
                  </div>
                </div>

                {acc.has_sub_accounts && acc.sub_accounts_list?.length > 0 && (
                  <div className="pt-2 border-t border-white/50 flex flex-wrap gap-1.5">
                    {acc.sub_accounts_list.map((sub) => (
                      <span
                        key={sub.id}
                        className="text-[11px] bg-white/75 px-2 py-0.5 rounded-xl font-medium text-pastel-cocoa"
                      >
                        {sub.emoji || '🏷️'} {sub.name}: ฿{formatCurrency(sub.balance)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Category Expense Breakdown */}
        <div className="lg:col-span-5 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-cute font-bold text-lg text-pastel-cocoa flex items-center gap-2">
              {t('expenseByCategory')}
            </h3>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="text-xs font-semibold text-pastel-cocoa bg-pastel-butter hover:bg-pastel-peach px-3 py-1.5 rounded-xl transition-colors"
            >
              {t('configCategories')}
            </button>
          </div>

          {summary.catList.length === 0 ? (
            <div className="text-center py-8 text-pastel-muted text-sm">
              {t('noExpenseInPeriod')}
            </div>
          ) : (
            <div className="space-y-3">
              {summary.catList.map((cat, idx) => {
                const pct = summary.expense > 0 ? Math.round((cat.total / summary.expense) * 100) : 0;
                return (
                  <div key={idx} className="bg-cream-100/80 rounded-2xl p-3 border border-cream-200">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <CartoonEmojiBadge
                          emoji={cat.emoji}
                          color={cat.color}
                          image={cat.image}
                          size="sm"
                        />
                        <span className="font-cute font-bold text-pastel-cocoa">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-pastel-cocoa">
                          ฿{formatCurrency(cat.total)}
                        </span>
                        <span className="text-xs text-pastel-muted ml-1.5">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-cream-200">
                      <div
                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: cat.color }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Budgets & Recent Transactions (Paginated max 10 items) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-cute font-bold text-lg text-pastel-cocoa">
              {t('budgetsAndTrips')} ({budgets.length})
            </h3>
            <button
              type="button"
              onClick={() => navigate('/budgets')}
              className="text-xs font-semibold text-pastel-cocoa bg-pastel-lavender hover:bg-pastel-purple px-3 py-1.5 rounded-xl transition-colors"
            >
              {t('viewAllBudgets')}
            </button>
          </div>

          <div className="space-y-3">
            {budgets.slice(0, 3).map((b) => {
              const pct = b.total_limit > 0 ? Math.round((b.spent / b.total_limit) * 100) : 0;
              const isOver = b.spent > b.total_limit;
              return (
                <div
                  key={b.id}
                  className="rounded-2xl p-3.5 bg-cream-100/90 border border-cream-200 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CartoonEmojiBadge emoji={b.icon_emoji} color={b.color} size="sm" />
                      <div>
                        <p className="font-cute font-bold text-sm text-pastel-cocoa">{b.name}</p>
                        <p className="text-[11px] text-pastel-muted">
                          {b.period_type === 'monthly'
                            ? `${lang === 'en' ? 'Monthly' : 'รายเดือน'} (${b.month_str})`
                            : b.period_type === 'yearly'
                            ? `${lang === 'en' ? 'Yearly' : 'รายปี'} (${b.year_str})`
                            : `${lang === 'en' ? 'Trip' : 'ทริป'} (${b.start_date} - ${b.end_date})`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isOver ? 'bg-rose-100 text-rose-700' : 'bg-pastel-mint text-pastel-cocoa'
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-cream-200">
                    <div
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: isOver ? '#FB7185' : b.color,
                      }}
                      className="h-full rounded-full"
                    />
                  </div>

                  <div className="flex justify-between text-xs text-pastel-muted">
                    <span>
                      {t('spentLabel')} ฿{formatCurrency(b.spent)}
                    </span>
                    <span>
                      {t('budgetLabel')} ฿{formatCurrency(b.total_limit)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {activeMemberships.length > 0 && (
            <div className="mt-5 pt-4 border-t border-cream-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-cute font-bold text-sm text-pastel-cocoa">
                  {t('activeMembershipsTitle')} ({activeMemberships.length})
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/memberships')}
                  className="text-xs text-pink-600 hover:underline font-semibold"
                >
                  {t('manageBtn')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeMemberships.map((m) => (
                  <span
                    key={m.id}
                    style={{ backgroundColor: m.color }}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-white shadow-sm font-medium"
                  >
                    <span>{m.icon_emoji}</span>
                    <span>{m.name}</span>
                    <span className="font-bold">฿{formatCurrency(m.amount)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Transactions in Period - Max 10 per page */}
        <div className="lg:col-span-7 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-cute font-bold text-lg text-pastel-cocoa">
              {t('recentTxTitle')} ({filteredTx.length})
            </h3>
            <button
              type="button"
              onClick={() => navigate('/transactions')}
              className="text-xs font-semibold text-pastel-cocoa bg-pastel-sky hover:bg-pastel-blue px-3 py-1.5 rounded-xl transition-colors"
            >
              {t('viewAndAddTx')}
            </button>
          </div>

          {paginatedDashTx.length === 0 ? (
            <div className="text-center py-10 text-pastel-muted text-sm">
              {t('noTxInPeriod')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginatedDashTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 p-3 rounded-2xl bg-cream-100/80 hover:bg-cream-100 border border-cream-200 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <CartoonEmojiBadge
                      emoji={
                        tx.type === 'transfer'
                          ? '🔄'
                          : tx.category_emoji || (tx.type === 'income' ? '💰' : '🍱')
                      }
                      color={
                        tx.type === 'transfer'
                          ? '#D6ECFF'
                          : tx.category_color || '#FFD6E0'
                      }
                      image={tx.category_image}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-cute font-bold text-sm text-pastel-cocoa truncate">
                          {tx.title}
                        </p>
                        {tx.shop_name && (
                          <span
                            style={{ backgroundColor: tx.shop_color || '#D6ECFF' }}
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium border border-white"
                          >
                            {tx.shop_emoji} {tx.shop_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-pastel-muted">
                        📅 {tx.transaction_date} • {tx.account_emoji} {tx.account_name}
                        {tx.sub_account_label ? ` (${tx.sub_account_label})` : ''}
                        {tx.type === 'transfer' && tx.to_account_name
                          ? ` ➔ ${tx.to_account_emoji} ${tx.to_account_name}`
                          : ''}
                      </p>
                      <FormattedNote text={tx.note} className="mt-1" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    {tx.attachment_image && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSlip({
                            url: tx.attachment_image,
                            title: `${tx.title} (ภาพประกอบ)`,
                            amount: tx.amount,
                            date: tx.transaction_date,
                          })
                        }
                        className="p-1 rounded-xl bg-white border border-cream-300 hover:scale-105 transition-transform"
                        title="ดูรูปประกอบ"
                      >
                        <img
                          src={tx.attachment_image}
                          alt="attachment"
                          className="w-8 h-8 object-cover rounded-lg"
                        />
                      </button>
                    )}

                    {tx.slip_image && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSlip({
                            url: tx.slip_image,
                            title: tx.title,
                            amount: tx.amount,
                            date: tx.transaction_date,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-pastel-butter hover:bg-amber-200 text-pastel-cocoa text-xs font-cute font-bold border border-white shadow-sm transition-transform hover:scale-105"
                      >
                        <Receipt className="w-3.5 h-3.5" /> {t('viewSlipBtn')}
                      </button>
                    )}

                    <span
                      className={`font-cute font-bold text-base whitespace-nowrap ${
                        tx.type === 'income'
                          ? 'text-emerald-700'
                          : tx.type === 'expense'
                          ? 'text-rose-600'
                          : 'text-sky-700'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '⇄ '}฿
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Pagination when > 10 items */}
              {totalDashPages > 1 && (
                <div className="pt-3 border-t border-cream-200 flex items-center justify-between text-xs">
                  <span className="text-pastel-muted">
                    {lang === 'en'
                      ? `Page ${dashPage} of ${totalDashPages} (Max 10 per page)`
                      : `หน้า ${dashPage} จาก ${totalDashPages} (แสดงหน้าละไม่เกิน 10 รายการ)`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={dashPage <= 1}
                      onClick={() => setDashPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl bg-cream-100 hover:bg-pastel-pink/60 disabled:opacity-40 font-cute font-bold text-pastel-cocoa"
                    >
                      ← {lang === 'en' ? 'Prev' : 'ก่อนหน้า'}
                    </button>
                    <button
                      type="button"
                      disabled={dashPage >= totalDashPages}
                      onClick={() => setDashPage((p) => Math.min(totalDashPages, p + 1))}
                      className="px-3 py-1.5 rounded-xl bg-pastel-pink hover:bg-pastel-rose disabled:opacity-40 font-cute font-bold text-pastel-cocoa"
                    >
                      {lang === 'en' ? 'Next' : 'หน้าถัดไป'} →
                    </button>
                  </div>
                </div>
              )}
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
