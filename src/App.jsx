import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { MochiMascot, formatCurrency } from './components/CuteStickers.jsx';
import { useI18n } from './i18n.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AnalyticsSummary from './pages/AnalyticsSummary.jsx';
import Transactions from './pages/Transactions.jsx';
import Accounts from './pages/Accounts.jsx';
import Budgets from './pages/Budgets.jsx';
import CategoriesShops from './pages/CategoriesShops.jsx';
import Memberships from './pages/Memberships.jsx';
import DiscordBotApi from './pages/DiscordBotApi.jsx';

export default function App() {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryImages, setCategoryImages] = useState([]);
  const [shops, setShops] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [heatmapData, setHeatmapData] = useState({ daily: [], recent: [] });
  const [loading, setLoading] = useState(true);

  const navItems = [
    { to: '/', emoji: '🏠', label: t('navOverview') },
    { to: '/analytics', emoji: '📈', label: t('navAnalytics') },
    { to: '/transactions', emoji: '💸', label: t('navTransactions') },
    { to: '/accounts', emoji: '👛', label: t('navAccounts') },
    { to: '/budgets', emoji: '🎯', label: t('navBudgets') },
    { to: '/categories', emoji: '🏷️', label: t('navCategories') },
    { to: '/memberships', emoji: '🎀', label: t('navMemberships') },
    { to: '/discord-api', emoji: '🤖', label: t('navDiscordBot') },
  ];

  const fetchAllData = useCallback(async () => {
    try {
      const [accRes, catRes, catImgRes, shopRes, txRes, budRes, memRes, heatRes] =
        await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/categories'),
          fetch('/api/category-images'),
          fetch('/api/shops'),
          fetch('/api/transactions'),
          fetch('/api/budgets'),
          fetch('/api/memberships'),
          fetch('/api/activity-heatmap'),
        ]);

      const [acc, cat, catImg, shp, tx, bud, mem, heat] = await Promise.all([
        accRes.json(),
        catRes.json(),
        catImgRes.json(),
        shopRes.json(),
        txRes.json(),
        budRes.json(),
        memRes.json(),
        heatRes.json(),
      ]);

      setAccounts(Array.isArray(acc) ? acc : []);
      setCategories(Array.isArray(cat) ? cat : []);
      setCategoryImages(Array.isArray(catImg) ? catImg : []);
      setShops(Array.isArray(shp) ? shp : []);
      setTransactions(Array.isArray(tx) ? tx : []);
      setBudgets(Array.isArray(bud) ? bud : []);
      setMemberships(Array.isArray(mem) ? mem : []);
      setHeatmapData(heat || { daily: [], recent: [] });
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const totalNetWorth = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-start">
      {/* Cute Pastel Sidebar Navigation - Grid on mobile/tablet so NO horizontal dragging/scrolling ever occurs */}
      <aside className="w-full lg:w-80 xl:w-[340px] bg-cream-50/95 backdrop-blur-md border-b-2 lg:border-b-0 lg:border-r-2 border-white shadow-cozy lg:h-screen p-4 lg:p-5 flex flex-col justify-between shrink-0 lg:sticky lg:top-0 z-30 select-none">
        <div>
          {/* Brand Logo + TH/EN Language Switcher */}
          <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-cream-200">
            <div className="flex items-center gap-2.5">
              <MochiMascot mood="wink" className="w-11 h-11 shrink-0" />
              <div>
                <h1 className="font-cute font-bold text-lg text-pastel-cocoa leading-tight whitespace-nowrap">
                  MochiWallet 🍡
                </h1>
                <p className="text-[11px] text-pastel-muted leading-snug">{t('appSubtitle')}</p>
              </div>
            </div>

            {/* TH / EN Pill Switcher */}
            <div className="flex items-center bg-cream-100 p-1 rounded-2xl border border-cream-300 shrink-0">
              <button
                type="button"
                onClick={() => setLang('th')}
                className={`px-2 py-1 rounded-xl text-[11px] font-cute font-bold transition-all ${
                  lang === 'th'
                    ? 'bg-pastel-pink text-pastel-cocoa shadow-sm border border-white'
                    : 'text-pastel-muted hover:text-pastel-cocoa'
                }`}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-xl text-[11px] font-cute font-bold transition-all ${
                  lang === 'en'
                    ? 'bg-pastel-pink text-pastel-cocoa shadow-sm border border-white'
                    : 'text-pastel-muted hover:text-pastel-cocoa'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Navigation Buttons: Grid on small screens (no horizontal scroll/drag), Vertical stack on desktop */}
          <nav className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl font-cute font-bold text-xs sm:text-sm text-left transition-colors ${
                    isActive
                      ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border-2 border-white'
                      : 'text-pastel-muted hover:bg-cream-100 hover:text-pastel-cocoa border-2 border-transparent'
                  }`}
                >
                  <span className="text-base sm:text-lg leading-none shrink-0">{item.emoji}</span>
                  <span className="leading-snug">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Summary Widget in Sidebar - always pinned at exact same bottom position */}
        <div className="hidden lg:block mt-auto p-4 rounded-3xl bg-gradient-to-br from-pastel-butter/70 via-pastel-pink/40 to-pastel-mint/50 border-2 border-white shadow-sticker">
          <p className="text-xs font-medium text-pastel-muted">✨ {t('totalAllWallets')}</p>
          <p className="font-cute font-bold text-xl text-pastel-cocoa mt-0.5">
            ฿{formatCurrency(totalNetWorth)}
          </p>
          <p className="text-[11px] text-pastel-muted mt-1">
            {t('walletsCount')} {accounts.length} {t('walletsUnit')} • {t('recordsCount')}{' '}
            {transactions.length} {t('recordsUnit')}
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <MochiMascot mood="happy" className="w-20 h-20" />
            <p className="font-cute font-bold text-pastel-cocoa">{t('loadingText')}</p>
          </div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  accounts={accounts}
                  transactions={transactions}
                  budgets={budgets}
                  memberships={memberships}
                  heatmapData={heatmapData}
                />
              }
            />
            <Route
              path="/analytics"
              element={
                <AnalyticsSummary
                  accounts={accounts}
                  categories={categories}
                  shops={shops}
                  memberships={memberships}
                  transactions={transactions}
                />
              }
            />
            <Route
              path="/transactions"
              element={
                <Transactions
                  accounts={accounts}
                  categories={categories}
                  shops={shops}
                  transactions={transactions}
                  onRefresh={fetchAllData}
                />
              }
            />
            <Route
              path="/accounts"
              element={<Accounts accounts={accounts} onRefresh={fetchAllData} />}
            />
            <Route
              path="/budgets"
              element={
                <Budgets
                  budgets={budgets}
                  categories={categories}
                  onRefresh={fetchAllData}
                />
              }
            />
            <Route
              path="/categories"
              element={
                <CategoriesShops
                  categories={categories}
                  categoryImages={categoryImages}
                  shops={shops}
                  onRefresh={fetchAllData}
                />
              }
            />
            <Route
              path="/memberships"
              element={
                <Memberships
                  memberships={memberships}
                  accounts={accounts}
                  categories={categories}
                  shops={shops}
                  onRefresh={fetchAllData}
                />
              }
            />
            <Route
              path="/discord-api"
              element={
                <DiscordBotApi
                  accounts={accounts}
                  categories={categories}
                  onRefresh={fetchAllData}
                />
              }
            />
          </Routes>
        )}
      </main>
    </div>
  );
}
