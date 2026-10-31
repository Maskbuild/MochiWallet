import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Bot,
  Sparkles,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { CartoonEmojiBadge, formatCurrency } from '../components/CuteStickers.jsx';
import CuteSelect from '../components/CuteSelect.jsx';
import CuteModal from '../components/CuteModal.jsx';
import { useI18n } from '../i18n.jsx';

export default function DiscordBotApi({ accounts = [], categories = [], onRefresh }) {
  const { lang } = useI18n();
  const isEn = lang === 'en';

  const [settings, setSettings] = useState({
    api_key: 'mochi_bot_secret_key_2026',
    bot_token: '',
    channel_id: '',
    panel_message_id: '',
    reset_mode: 'recreate',
    auto_sync: 1,
  });
  const [botStatus, setBotStatus] = useState({
    connected: false,
    botUser: null,
    lastError: null,
    lastSyncedAt: null,
  });
  const [panelData, setPanelData] = useState(null);
  const [discovery, setDiscovery] = useState({ inviteUrl: null, guilds: [], channels: [] });
  const [apiLogs, setApiLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // External Web API Tester state (POST /api/v1/send)
  const [extTitle, setExtTitle] = useState('');
  const [extMsg, setExtMsg] = useState('');
  const [extAmount, setExtAmount] = useState('');
  const [extType, setExtType] = useState('');
  const [extSending, setExtSending] = useState(false);

  // Interactive Modal state when clicking one of the 3 buttons (รายจ่าย / รายรับ / โอนเงิน)
  const [activeModalType, setActiveModalType] = useState(null); // 'expense' | 'income' | 'transfer' | null
  const [modalTitle, setModalTitle] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalBankAccount, setModalBankAccount] = useState('');
  const [modalCategoryOrTarget, setModalCategoryOrTarget] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [resetFlash, setResetFlash] = useState(false);

  const loadBotPanelState = useCallback(async () => {
    try {
      const res = await fetch('/api/bot-settings');
      const data = await res.json();
      if (data?.settings) setSettings(data.settings);
      if (data?.status) setBotStatus(data.status);
      if (data?.panel) setPanelData(data.panel);
      if (data?.discovery) setDiscovery(data.discovery);
      if (data?.apiLogs) setApiLogs(data.apiLogs);
    } catch {}
  }, []);

  useEffect(() => {
    loadBotPanelState();
  }, [loadBotPanelState, accounts]);

  function openActionModal(type) {
    setActiveModalType(type);
    setModalTitle('');
    setModalAmount('');
    setModalBankAccount(accounts[0]?.name || '');
    if (type === 'transfer') {
      setModalCategoryOrTarget(accounts[1]?.name || accounts[0]?.name || '');
    } else {
      const matchCats = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));
      setModalCategoryOrTarget(matchCats[0]?.name || '');
    }
  }

  async function handleModalSubmit(e) {
    e.preventDefault();
    if (!activeModalType || !modalTitle.trim() || !modalAmount) return;
    setModalSubmitting(true);
    try {
      const res = await fetch('/api/bot/panel-modal-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeModalType,
          title: modalTitle.trim(),
          amount: modalAmount,
          bank_account: modalBankAccount,
          category_or_target: modalCategoryOrTarget,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveModalType(null);
        setResetFlash(true);
        setTimeout(() => setResetFlash(false), 900);
        if (data.panel) setPanelData(data.panel);
        if (onRefresh) await onRefresh();
        await loadBotPanelState();
        setStatusMsg({
          ok: true,
          text: isEn
            ? '✅ Saved & Reset Discord Panel with latest GitHub Heatmap and balances!'
            : '✅ บันทึกรายการและ Reset หน้าจอ Panel (ตาราง GitHub + ยอดเงินทั้งหมด + รายรับรายจ่าย) เรียบร้อยแล้ว!',
        });
      } else {
        setStatusMsg({ ok: false, text: `⚠️ ${data.error}` });
      }
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/bot-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.settings) setSettings(data.settings);
        if (data.status) setBotStatus(data.status);
        if (data.panel) setPanelData(data.panel);
        if (data.discovery) setDiscovery(data.discovery);

        if (data.syncResult && !data.syncResult.success && !data.syncResult.skipped) {
          setStatusMsg({
            ok: false,
            text: isEn
              ? `⚠️ Saved settings, but failed to send to Discord: ${data.syncResult.error}`
              : `⚠️ บันทึกค่าแล้ว แต่ส่งเข้า Discord ไม่สำเร็จ: ${data.syncResult.error}`,
          });
        } else {
          setStatusMsg({
            ok: true,
            text: isEn
              ? '✅ Connected & Reset Panel in Discord channel!'
              : '✅ บันทึกการตั้งค่าบอทและส่งหน้าจอ Panel ไปยังห้อง Discord เรียบร้อยแล้ว!',
          });
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleForceResetDiscordPanel() {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/bot-settings/sync-panel', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResetFlash(true);
        setTimeout(() => setResetFlash(false), 900);
        if (data.panel) setPanelData(data.panel);
        if (data.status) setBotStatus(data.status);
        setStatusMsg({
          ok: true,
          text: isEn
            ? '🔄 Panel Reset & Updated in Discord!'
            : '🔄 รีเซ็ตและอัปเดตหน้าจอ Panel ในห้อง Discord เรียบร้อยแล้ว!',
        });
      } else {
        setStatusMsg({
          ok: false,
          text: `⚠️ ${
            data.error ||
            (isEn ? 'Unable to reset panel in Discord' : 'ไม่สามารถรีเซ็ตหน้าจอใน Discord ได้')
          }`,
        });
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleRegenerateApiKey() {
    try {
      const res = await fetch('/api/bot-settings/regenerate-key', { method: 'POST' });
      const data = await res.json();
      if (data?.api_key) {
        setSettings((prev) => ({ ...prev, api_key: data.api_key }));
        setStatusMsg({
          ok: true,
          text: isEn
            ? `🔑 Generated new API Key: ${data.api_key}`
            : `🔑 สุ่ม API Key ใหม่เรียบร้อยแล้ว: ${data.api_key}`,
        });
      }
    } catch {}
  }

  async function handleClearAllData() {
    setResettingData(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/system/reset-data', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (data.settings) setSettings(data.settings);
        if (data.status) setBotStatus(data.status);
        if (data.panel) setPanelData(data.panel);
        setDiscovery({ inviteUrl: null, guilds: [], channels: [] });
        setApiLogs([]);
        if (onRefresh) await onRefresh();
        setStatusMsg({
          ok: true,
          text: isEn
            ? '✨ All wallet data, transactions, and bot tokens have been wiped clean (Ready for ZimaOS Docker)!'
            : '✨ ล้างข้อมูลทั้งหมดในระบบ (กระเป๋าเงิน, รายการบันทึก, ตั้งค่าบอท) เป็นค่าเริ่มต้นสะอาดเรียบร้อยแล้ว พร้อมนำเข้า Docker บน ZimaOS!',
        });
      }
    } finally {
      setResettingData(false);
    }
  }

  async function handleTestExternalApiSend(e) {
    e.preventDefault();
    setExtSending(true);
    setStatusMsg(null);
    try {
      const defaultTitle = isEn
        ? '🛍️ Notification from External Website'
        : '🛍️ แจ้งเตือนจากเว็บภายนอก (External Web)';
      const defaultMsg = isEn
        ? 'New message or order received via MochiWallet External API!'
        : 'มีรายการสั่งซื้อหรือข้อความส่งเข้ามาผ่านระบบ API เรียบร้อยแล้ว!';

      const payload = {
        title: (extTitle || defaultTitle).trim(),
        message: (extMsg || defaultMsg).trim(),
      };
      if (extAmount && Number(extAmount) > 0) {
        payload.amount = Number(extAmount);
        payload.type = extType || 'expense';
        payload.bank_account = accounts[0]?.name || '';
      }
      const res = await fetch('/api/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': settings.api_key,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        if (onRefresh) await onRefresh();
        await loadBotPanelState();
        setStatusMsg({
          ok: true,
          text: isEn
            ? '🌐 API Test (/api/v1/send) succeeded! Sent message to Discord and logged request.'
            : '🌐 ทดสอบยิง API (/api/v1/send) สำเร็จ! ส่งข้อความเข้า Discord และบันทึก Log เรียบร้อยแล้ว',
        });
      } else {
        setStatusMsg({
          ok: false,
          text: isEn
            ? `⚠️ API request failed: ${data.error || 'Unknown error'}`
            : `⚠️ ยิง API ไม่สำเร็จ: ${data.error || 'Unknown error'}`,
        });
      }
    } finally {
      setExtSending(false);
    }
  }

  const summary = panelData?.summaryData;
  const matchingCategories = categories.filter(
    (c) => c.type === (activeModalType === 'income' ? 'income' : 'expense')
  );

  const bankAccountOptions = [
    ...accounts.map((a) => ({
      value: a.name,
      label: `${a.emoji} ${a.name} (${
        a.type === 'cash'
          ? isEn
            ? 'Cash'
            : 'เงินสด'
          : a.type === 'savings'
          ? isEn
            ? 'Savings'
            : 'บัญชีเงินออม'
          : a.type === 'ewallet'
          ? 'E-Wallet'
          : isEn
          ? 'Bank Account'
          : 'บัญชีธนาคาร'
      })`,
    })),
  ];

  const categorySelectOptions =
    activeModalType === 'transfer'
      ? bankAccountOptions
      : matchingCategories.map((c) => ({
          value: c.name,
          label: `${c.icon_emoji} ${c.name}`,
        }));

  const standaloneBotCode = isEn
    ? `// 🌐 Example code for External Websites / Webhooks to send messages or transactions to MochiWallet & Discord:

const MOCHI_API_URL = 'http://localhost:3001/api/v1';
const API_KEY = '${settings.api_key}';

// 1️⃣ Send message to Discord and/or record transaction (POST /api/v1/send)
async function sendMessageFromOtherWebsite() {
  const res = await fetch(\`\${MOCHI_API_URL}/send\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY // or Authorization: 'Bearer ' + API_KEY
    },
    body: JSON.stringify({
      title: '🛍️ Alert from External Web',
      message: 'A new order or notification was sent via API!',
      // (Optional) Also deduct/add wallet balance & auto-reset Discord Panel:
      type: 'expense',          // 'expense' | 'income' | 'transfer'
      amount: 150,              // Amount (THB)
      bank_account: 'Main Wallet',
      category: 'Shopping'
    })
  });
  return await res.json();
}

// 2️⃣ Record transaction directly from another website (POST /api/v1/transactions)
async function recordTransactionFromOtherWeb({ type, title, amount, bankAccount, category }) {
  const res = await fetch(\`\${MOCHI_API_URL}/transactions\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ type, title, amount: Number(amount), bank_account: bankAccount, category })
  });
  return await res.json();
}

// 3️⃣ Fetch total balances & GitHub heatmap summary (GET /api/v1/summary)
async function getWalletSummaryForOtherWeb() {
  const res = await fetch(\`\${MOCHI_API_URL}/summary\`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return await res.json();
}`
    : `// 🌐 ตัวอย่างโค้ดสำหรับให้ "เว็บอื่นๆ" (External Website / Webhook / Backend) ยิง API ส่งข้อความหรือรายการเงินเข้ามาหา MochiWallet & Discord:

const MOCHI_API_URL = 'http://localhost:3001/api/v1';
const API_KEY = '${settings.api_key}';

// 1️⃣ ส่งข้อความแจ้งเตือน หรือส่งพร้อมบันทึกรายรับ/รายจ่ายจากเว็บอื่น (POST /api/v1/send)
async function sendMessageFromOtherWebsite() {
  const res = await fetch(\`\${MOCHI_API_URL}/send\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY // หรือส่ง Authorization: 'Bearer ' + API_KEY
    },
    body: JSON.stringify({
      title: '🛍️ แจ้งเตือนจากเว็บอื่น (External Web)',
      message: 'มีคำสั่งซื้อใหม่ หรือข้อความจากเว็บภายนอกส่งเข้ามา!',
      // (Optional) ถ้าต้องการให้หัก/เพิ่มเงินในกระเป๋าพร้อม Reset หน้าจอ Discord ทันที:
      type: 'expense',                  // 'expense' | 'income' | 'transfer'
      amount: 150,                      // จำนวนเงิน (บาท)
      bank_account: 'กระเป๋าตังค์พกพา', // ชื่อบัญชีธนาคาร/กระเป๋าเงิน
      category: 'ช้อปปิ้งเสื้อผ้าและของใช้' // หมวดหมู่
    })
  });
  return await res.json();
}

// 2️⃣ บันทึกรายการการเงินจากเว็บอื่นโดยตรง (POST /api/v1/transactions)
async function recordTransactionFromOtherWeb({ type, title, amount, bankAccount, category }) {
  const res = await fetch(\`\${MOCHI_API_URL}/transactions\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ type, title, amount: Number(amount), bank_account: bankAccount, category })
  });
  return await res.json();
}

// 3️⃣ ดึงข้อมูลสรุปยอดเงินทั้งหมด + ตาราง GitHub ไปแสดงบนเว็บอื่น (GET /api/v1/summary)
async function getWalletSummaryForOtherWeb() {
  const res = await fetch(\`\${MOCHI_API_URL}/summary\`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return await res.json();
}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <CartoonEmojiBadge emoji="🤖" color="#D6ECFF" size="lg" />
          <div>
            <h1 className="font-cute font-bold text-2xl text-pastel-cocoa">
              {isEn
                ? 'Discord Interactive Panel Bot & External Web API'
                : 'ระบบบอท Discord แบบหน้าจอ Panel & ระบบ API เชื่อมต่อเว็บอื่น'}
            </h1>
            <p className="text-xs sm:text-sm text-pastel-muted">
              {isEn
                ? 'Displays a single live panel in Discord with GitHub Heatmap, Total Balance, Income/Expense, 3 action buttons, and External REST API for other websites.'
                : 'แสดงหน้าจอกระดานสรุปใน Discord (ตาราง GitHub + ยอดเงินทั้งหมด + รายรับรายจ่าย) ที่รีเซ็ตตัวเองอัตโนมัติทุกครั้งที่มีการอัปเดต พร้อมปุ่มกด 3 ตัว และระบบ API ให้เว็บอื่นส่งข้อความเข้ามาได้'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={resettingData}
          onClick={handleClearAllData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-cute font-bold text-xs border-2 border-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>
            {resettingData
              ? isEn
                ? 'Clearing...'
                : 'กำลังล้างข้อมูล...'
              : isEn
              ? 'Clear All Data (Fresh Start)'
              : 'ล้างข้อมูลทั้งหมด (เริ่มใหม่)'}
          </span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-2xl border-2 text-xs font-cute font-bold ${
            statusMsg.ok
              ? 'bg-pastel-mint/70 border-white text-emerald-900'
              : 'bg-rose-100 border-rose-200 text-rose-700'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Bot Token & Channel Configuration */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-cute font-bold text-lg text-pastel-cocoa flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                <span>
                  {isEn ? 'Connect Discord Bot Panel' : 'ตั้งค่าบอทเพื่อแสดงหน้าจอ Panel ใน Discord'}
                </span>
              </h2>
              <span
                className={`text-[11px] font-cute font-bold px-2.5 py-0.5 rounded-full ${
                  botStatus.connected
                    ? 'bg-pastel-mint text-emerald-800'
                    : 'bg-cream-200 text-pastel-muted'
                }`}
              >
                {botStatus.connected
                  ? isEn
                    ? `🟢 Connected (${botStatus.botUser || 'Bot'})`
                    : `🟢 เชื่อมต่อแล้ว (${botStatus.botUser || 'Bot'})`
                  : isEn
                  ? '⚪ Waiting for Bot Token'
                  : '⚪ รอใส่ Bot Token'}
              </span>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn
                    ? '1. Discord Bot Token (from Discord Developer Portal)'
                    : '1. Discord Bot Token (นำมาจาก Discord Developer Portal)'}
                </label>
                <input
                  type="password"
                  placeholder={
                    isEn ? 'Paste your Bot Token here...' : 'วาง Bot Token ของคุณที่นี่...'
                  }
                  value={settings.bot_token || ''}
                  onChange={(e) => setSettings({ ...settings, bot_token: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-pastel-pink"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-pastel-cocoa">
                    {isEn
                      ? '2. Select Discord Text Channel (or paste Channel ID)'
                      : '2. เลือกห้องแชท Discord (หรือวาง Channel ID)'}
                  </label>
                  {discovery.inviteUrl && (
                    <a
                      href={discovery.inviteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-cute font-bold px-2.5 py-0.5 rounded-full bg-pastel-sky hover:bg-pastel-blue text-pastel-cocoa border border-white shadow-sm"
                    >
                      {isEn ? '➕ Invite Bot to Server' : '➕ เชิญบอทเข้าเซิร์ฟเวอร์'}
                    </a>
                  )}
                </div>

                {discovery.channels?.length > 0 ? (
                  <CuteSelect
                    value={settings.channel_id || ''}
                    onChange={(val) => setSettings({ ...settings, channel_id: val })}
                    placeholder={
                      isEn
                        ? '-- Select a text channel visible to your bot --'
                        : '-- กดเลือกห้องแชทที่บอทมองเห็นได้เลย --'
                    }
                    options={[
                      {
                        value: '',
                        label: isEn
                          ? '-- Select a text channel from your server --'
                          : '-- กดเลือกห้องแชทจากเซิร์ฟเวอร์ของคุณ --',
                      },
                      ...discovery.channels.map((ch) => ({
                        value: ch.id,
                        label: `🏠 ${ch.guild_name} ➔ 💬 #${ch.name} (${ch.id})`,
                      })),
                    ]}
                  />
                ) : (
                  <div className="text-[11px] text-amber-800 bg-pastel-butter/60 px-3 py-2 rounded-xl border border-amber-200">
                    {isEn ? (
                      <>
                        ⚠️ No text channels visible yet. If you just pasted a token, click{' '}
                        <strong>Save</strong> once or click{' '}
                        <strong>➕ Invite Bot to Server</strong> above and grant channel permissions.
                      </>
                    ) : (
                      <>
                        ⚠️ ตอนนี้บอทยังมองไม่เห็นห้องแชทใดๆ (หากเพิ่งใส่ Token ให้กดปุ่ม{' '}
                        <strong>บันทึก</strong> 1 ครั้ง หรือกดปุ่ม{' '}
                        <strong>➕ เชิญบอทเข้าเซิร์ฟเวอร์</strong> ด้านบน แล้วให้สิทธิ์บอทดูห้องแชทครับ)
                      </>
                    )}
                  </div>
                )}

                <input
                  type="text"
                  placeholder={
                    isEn
                      ? 'Or paste Text Channel ID here, e.g. 1234567890123456789'
                      : 'หรือวางเลข Text Channel ID ที่นี่ เช่น 1234567890123456789'
                  }
                  value={settings.channel_id || ''}
                  onChange={(e) => setSettings({ ...settings, channel_id: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-2xl bg-cream-100 border border-cream-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pastel-pink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn
                    ? '3. Panel Reset Mode on Every Update'
                    : '3. รูปแบบการ Reset หน้าจอเมื่อมีการอัปเดตข้อมูล'}
                </label>
                <CuteSelect
                  value={settings.reset_mode || 'recreate'}
                  onChange={(val) => setSettings({ ...settings, reset_mode: val })}
                  options={[
                    {
                      value: 'recreate',
                      label: isEn
                        ? '🔄 Delete old message & send fresh Panel on every update'
                        : '🔄 ลบข้อความเก่าแล้วส่งหน้าจอใหม่ทุกครั้งที่มีการอัปเดต (Reset สดใหม่เสมอ)',
                    },
                    {
                      value: 'edit',
                      label: isEn
                        ? '✏️ Edit existing Panel message in-place'
                        : '✏️ แก้ไขอัปเดตข้อมูลในข้อความหน้าจอเดิม',
                    },
                  ]}
                />
              </div>

              <div className="bg-pastel-butter/40 border border-amber-200 rounded-2xl p-3 text-[11px] text-pastel-cocoa space-y-1">
                {isEn ? (
                  <>
                    <p className="font-cute font-bold">💡 How this Discord Bot works:</p>
                    <p>
                      • Does <strong>not spam notification messages</strong> in your chat channel.
                    </p>
                    <p>
                      • Maintains <strong>1 live summary Panel message</strong> with a Pastel GitHub
                      Heatmap, Total Net Worth, and Income/Expense that{' '}
                      <strong>auto-resets on every update</strong>.
                    </p>
                    <p>
                      • Includes 3 action buttons below the panel: <strong>🧁 Expense</strong>,{' '}
                      <strong>💰 Income</strong>, <strong>🔄 Transfer</strong> that pop up a form for{' '}
                      <strong>Title, Amount, Bank Account, and Category</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-cute font-bold">💡 วิธีการทำงานของบอทตัวนี้:</p>
                    <p>
                      • บอทจะ<strong>ไม่ส่งข้อความแจ้งเตือนรบกวน</strong>ในแชท
                    </p>
                    <p>
                      • บอทจะแสดงเฉพาะ <strong>หน้าจอกระดานสรุป 1 ข้อความ</strong> ที่มีตารางแบบ
                      GitHub, ยอดเงินทั้งหมด, รายรับ-รายจ่าย และ{' '}
                      <strong>รีเซ็ตใหม่ทุกครั้งที่มีการอัปเดต</strong>
                    </p>
                    <p>
                      • ด้านล่างหน้าจอมีปุ่มกด 3 ตัว: <strong>🧁 รายจ่าย</strong>,{' '}
                      <strong>💰 รายรับ</strong>, <strong>🔄 โอนเงิน</strong> พอกดแล้วจะเด้งหน้าจอให้กรอก{' '}
                      <strong>ชื่อรายการ, จำนวนเงิน, ประเภทธนาคาร, และประเภทของ</strong>
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa font-cute font-bold text-xs shadow-sticker border-2 border-white transition-transform hover:-translate-y-0.5"
                >
                  {saving
                    ? isEn
                      ? 'Connecting...'
                      : 'กำลังเชื่อมต่อ...'
                    : isEn
                    ? '💾 Save & Deploy Panel to Discord'
                    : '💾 บันทึก & ส่งหน้าจอเข้า Discord'}
                </button>

                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleForceResetDiscordPanel}
                  className="py-2.5 px-3.5 rounded-2xl bg-pastel-mint hover:bg-pastel-teal text-pastel-cocoa font-cute font-bold text-xs shadow-sticker border-2 border-white inline-flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{isEn ? 'Reset Panel Now' : 'Reset หน้าจอทันที'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* External Web API Center & Code Reference Box */}
          <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-cute font-bold text-base text-pastel-cocoa">
                  {isEn
                    ? '🌐 External Web API (Allow other websites to send messages/data)'
                    : '🌐 ระบบ External API (ให้เว็บอื่นๆ ส่งข้อความ/ข้อมูลเข้ามาหาได้)'}
                </h3>
                <p className="text-[11px] text-pastel-muted">
                  {isEn ? (
                    <>
                      Any external website can call the endpoints below with{' '}
                      <code className="font-mono font-bold text-pastel-cocoa">X-API-Key</code> (CORS
                      enabled for all origins).
                    </>
                  ) : (
                    <>
                      เว็บภายนอกทุกเว็บสามารถเรียกใช้ API ด้านล่างโดยแนบ{' '}
                      <code className="font-mono font-bold text-pastel-cocoa">X-API-Key</code> (เปิด
                      CORS ให้ทุกโดเมนเรียบร้อยแล้ว)
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* API Key Display + Copy + Regenerate */}
            <div className="bg-cream-100 border border-cream-300 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pastel-cocoa">
                  {isEn ? '🔑 X-API-Key for External Websites:' : '🔑 X-API-Key สำหรับเว็บภายนอก:'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(settings.api_key || '');
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pastel-butter hover:bg-amber-200 text-pastel-cocoa text-[11px] font-cute font-bold border border-white"
                  >
                    {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>
                      {copiedKey
                        ? isEn
                          ? 'Copied Key'
                          : 'คัดลอก Key แล้ว'
                        : isEn
                        ? 'Copy Key'
                        : 'คัดลอก Key'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateApiKey}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pastel-lavender hover:bg-purple-200 text-pastel-cocoa text-[11px] font-cute font-bold border border-white"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isEn ? 'Regenerate Key' : 'สุ่ม Key ใหม่'}</span>
                  </button>
                </div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white border border-cream-200 font-mono text-xs text-pastel-cocoa select-all break-all">
                {settings.api_key}
              </div>
            </div>

            {/* Endpoints List */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 bg-pastel-mint/40 px-3 py-1.5 rounded-xl border border-white">
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold text-[10px]">
                  POST
                </span>
                <code className="font-mono font-bold text-pastel-cocoa">/api/v1/send</code>
                <span className="text-pastel-muted">
                  {isEn
                    ? '— Send message/embed to Discord and/or record transaction'
                    : '— ส่งข้อความแจ้งเตือนเข้า Discord และ/หรือบันทึกรายการเงิน'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-pastel-sky/40 px-3 py-1.5 rounded-xl border border-white">
                <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono font-bold text-[10px]">
                  POST
                </span>
                <code className="font-mono font-bold text-pastel-cocoa">/api/v1/transactions</code>
                <span className="text-pastel-muted">
                  {isEn
                    ? '— Record Expense/Income/Transfer from external web & reset Panel'
                    : '— บันทึกรายจ่าย/รายรับ/โอนเงินจากเว็บอื่น & Reset Panel'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-pastel-butter/50 px-3 py-1.5 rounded-xl border border-white">
                <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono font-bold text-[10px]">
                  GET
                </span>
                <code className="font-mono font-bold text-pastel-cocoa">/api/v1/summary</code>
                <span className="text-pastel-muted">
                  {isEn
                    ? '— Fetch total net worth, monthly summary, and GitHub Heatmap'
                    : '— ดึงยอดเงินรวม, รายรับ-รายจ่าย และตาราง GitHub'}
                </span>
              </div>
            </div>

            {/* Quick Interactive Tester for POST /api/v1/send */}
            <form
              onSubmit={handleTestExternalApiSend}
              className="bg-pastel-pink/25 border border-pink-200 rounded-2xl p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-cute font-bold text-xs text-pastel-cocoa">
                  {isEn
                    ? '🧪 Test External Web API Call (POST /api/v1/send)'
                    : '🧪 ทดสอบยิง API ส่งข้อความเสมือนมาจากเว็บอื่น (POST /api/v1/send)'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={
                    isEn
                      ? '🛍️ Notification from External Website'
                      : '🛍️ แจ้งเตือนจากเว็บภายนอก (External Web)'
                  }
                  value={extTitle}
                  onChange={(e) => setExtTitle(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-cream-300 text-xs focus:outline-none"
                />
                <div className="flex gap-1.5">
                  <select
                    value={extType}
                    onChange={(e) => setExtType(e.target.value)}
                    className="px-2 py-1.5 rounded-xl bg-white border border-cream-300 text-xs focus:outline-none"
                  >
                    <option value="">
                      {isEn ? 'Message Only' : 'ข้อความอย่างเดียว'}
                    </option>
                    <option value="expense">
                      {isEn ? '🧁 +Deduct Expense' : '🧁 +หักรายจ่าย'}
                    </option>
                    <option value="income">
                      {isEn ? '💰 +Add Income' : '💰 +เพิ่มรายรับ'}
                    </option>
                  </select>
                  {extType && (
                    <input
                      type="number"
                      step="0.01"
                      placeholder={isEn ? 'Amount (฿)' : 'จำนวนเงิน (฿)'}
                      value={extAmount}
                      onChange={(e) => setExtAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-cream-300 text-xs focus:outline-none"
                    />
                  )}
                </div>
              </div>
              <input
                type="text"
                placeholder={
                  isEn
                    ? 'New message or order received via MochiWallet External API!'
                    : 'มีรายการสั่งซื้อหรือข้อความส่งเข้ามาผ่านระบบ API เรียบร้อยแล้ว!'
                }
                value={extMsg}
                onChange={(e) => setExtMsg(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-cream-300 text-xs focus:outline-none"
              />
              <button
                type="submit"
                disabled={extSending}
                className="w-full py-2 rounded-xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa font-cute font-bold text-xs shadow-sm border border-white"
              >
                {extSending
                  ? isEn
                    ? 'Sending API request...'
                    : 'กำลังยิง API...'
                  : isEn
                  ? '🚀 Send Test Message via /api/v1/send Now'
                  : '🚀 ทดสอบส่งข้อความผ่าน /api/v1/send ทันที'}
              </button>
            </form>

            {/* Copyable Code Example */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-cute font-bold text-xs text-pastel-cocoa">
                  {isEn
                    ? '📋 Example Code for External Websites (JavaScript / Fetch)'
                    : '📋 โค้ดตัวอย่างสำหรับนำไปวางในเว็บอื่น (JavaScript / Fetch)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(standaloneBotCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 1800);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pastel-butter text-pastel-cocoa text-[11px] font-cute font-bold border border-white"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>
                    {copiedCode
                      ? isEn
                        ? 'Copied'
                        : 'คัดลอกแล้ว'
                      : isEn
                      ? 'Copy Code'
                      : 'คัดลอกโค้ด'}
                  </span>
                </button>
              </div>
              <pre className="p-3 rounded-2xl bg-[#2B2420] text-cream-100 text-[10px] font-mono overflow-x-auto leading-relaxed">
                {standaloneBotCode}
              </pre>
            </div>

            {/* Live Incoming API Request Logs */}
            {apiLogs.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="font-cute font-bold text-xs text-pastel-cocoa">
                  {isEn
                    ? `📡 Recent External API Requests (${apiLogs.length})`
                    : `📡 ประวัติการเรียกใช้ API ล่าสุดจากเว็บภายนอก (${apiLogs.length} รายการ)`}
                </span>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {apiLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-cream-200 text-[11px]"
                    >
                      <div className="truncate">
                        <span className="font-mono font-bold text-indigo-600">{log.endpoint}</span>{' '}
                        <span className="text-pastel-cocoa font-bold">{log.summary}</span>
                      </div>
                      <span className="text-[10px] text-pastel-muted shrink-0">
                        {new Date(log.time).toLocaleTimeString(isEn ? 'en-US' : 'th-TH')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Discord Embed Panel Preview + 3 Interactive Buttons */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <h2 className="font-cute font-bold text-base text-pastel-cocoa">
                  {isEn
                    ? 'Live Discord Panel Preview (Click the 3 buttons below to test!)'
                    : 'ตัวอย่างหน้าจอที่แสดงใน Discord (ทดลองกดปุ่ม 3 ตัวด้านล่างได้เลย!)'}
                </h2>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-pastel-lavender font-cute font-bold text-pastel-cocoa">
                {isEn ? '🔄 Auto-reset on every update' : '🔄 รีเซ็ตอัตโนมัติทุกครั้งที่อัปเดต'}
              </span>
            </div>

            {/* Discord Dark Theme Message Container */}
            <div
              className={`rounded-3xl bg-[#313338] text-[#DBDEE1] p-4 sm:p-5 shadow-lg border border-[#232428] transition-all duration-300 ${
                resetFlash ? 'ring-4 ring-pastel-pink scale-[0.99]' : ''
              }`}
            >
              {/* Bot Header */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-9 h-9 rounded-full bg-[#FFD6E0] flex items-center justify-center text-lg shadow">
                  🐰
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm">MochiWallet</span>
                    <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                      APP
                    </span>
                    <span className="text-[11px] text-[#949BA4]">
                      {isEn ? 'Today at ' : 'วันนี้ เวลา '}
                      {new Date().toLocaleTimeString(isEn ? 'en-US' : 'th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discord Embed Box with Left Accent Border */}
              <div className="ml-11 bg-[#2B2D31] border-l-4 border-[#FFCAD4] rounded-md p-4 space-y-3.5 max-w-2xl">
                <div>
                  <h3 className="text-white font-bold text-base">
                    {isEn
                      ? '🍡 MochiWallet • Live Finance Summary & Activity Grid'
                      : '🍡 MochiWallet • กระดานสรุปการเงิน & ตารางบันทึก'}
                  </h3>
                  <p className="text-xs text-[#B5BAC1] mt-1">
                    。. ݁₊ ⊹ . ݁˖ . ݁{' '}
                    <strong className="text-white">
                      {isEn
                        ? 'Pastel Finance Book (Live Auto-Sync)'
                        : 'สมุดการเงินพาสเทล (อัปเดตสดอัตโนมัติ)'}
                    </strong>{' '}
                    ݁ . ˖ ݁ . ⊹ ₊ ݁.。
                  </p>
                  <p className="text-xs text-[#B5BAC1] mt-0.5">
                    {isEn ? (
                      <>
                        Click <strong className="text-white">🧁 Expense</strong>,{' '}
                        <strong className="text-white">💰 Income</strong>, or{' '}
                        <strong className="text-white">🔄 Transfer</strong> below to record a
                        transaction!
                      </>
                    ) : (
                      <>
                        กดปุ่ม <strong className="text-white">🧁 รายจ่าย</strong>,{' '}
                        <strong className="text-white">💰 รายรับ</strong>, หรือ{' '}
                        <strong className="text-white">🔄 โอนเงิน</strong> ด้านล่างเพื่อกรอกข้อมูลได้เลย!
                      </>
                    )}
                  </p>
                </div>

                {/* Total Balance */}
                <div className="bg-[#1E1F22] rounded-lg p-3 border border-[#3F4147]/50">
                  <p className="text-[11px] font-bold text-[#B5BAC1]">
                    {isEn
                      ? '💎 Total Balance (All Wallets Combined)'
                      : '💎 จำนวนเงินทั้งหมด (ยอดรวมทุกกระเป๋า)'}
                  </p>
                  <p className="text-xl font-bold text-[#95D5B2] font-mono mt-0.5">
                    ฿{formatCurrency(summary?.totalNetWorth || 0)}
                  </p>
                </div>

                {/* Income & Expense Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-[#1E1F22] rounded-lg p-2.5 border border-[#3F4147]/40">
                    <p className="text-[11px] font-bold text-[#B5BAC1]">
                      {isEn ? '💰 Monthly Income' : '💰 รายรับเดือนนี้'}
                    </p>
                    <p className="text-sm font-bold text-[#95D5B2] mt-0.5">
                      +฿{formatCurrency(summary?.monthIncome || 0)}
                    </p>
                    <p className="text-[10px] text-[#949BA4]">
                      {isEn ? 'All-time:' : 'รวมทั้งหมด:'} ฿
                      {formatCurrency(summary?.totalAllIncome || 0)}
                    </p>
                  </div>

                  <div className="bg-[#1E1F22] rounded-lg p-2.5 border border-[#3F4147]/40">
                    <p className="text-[11px] font-bold text-[#B5BAC1]">
                      {isEn ? '🧁 Monthly Expense' : '🧁 รายจ่ายเดือนนี้'}
                    </p>
                    <p className="text-sm font-bold text-[#FF8FA3] mt-0.5">
                      -฿{formatCurrency(summary?.monthExpense || 0)}
                    </p>
                    <p className="text-[10px] text-[#949BA4]">
                      {isEn ? 'All-time:' : 'รวมทั้งหมด:'} ฿
                      {formatCurrency(summary?.totalAllExpense || 0)}
                    </p>
                  </div>

                  <div className="bg-[#1E1F22] rounded-lg p-2.5 border border-[#3F4147]/40">
                    <p className="text-[11px] font-bold text-[#B5BAC1]">
                      {isEn ? '✨ Monthly Net Balance' : '✨ คงเหลือสุทธิเดือนนี้'}
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      ฿{formatCurrency((summary?.monthIncome || 0) - (summary?.monthExpense || 0))}
                    </p>
                  </div>
                </div>

                {/* Wallets & Bank Types */}
                <div>
                  <p className="text-xs font-bold text-white mb-1">
                    {isEn ? '👛 Wallets & Bank Accounts' : '👛 กระเป๋าเงิน & ประเภทธนาคาร'}
                  </p>
                  <div className="space-y-1 text-xs text-[#DBDEE1]">
                    {(summary?.accounts || accounts).length === 0 ? (
                      <div className="text-[11px] text-[#949BA4] bg-[#1E1F22]/70 px-2.5 py-1.5 rounded">
                        {isEn ? 'No wallets created yet' : 'ยังไม่มีบัญชีในระบบ'}
                      </div>
                    ) : (
                      (summary?.accounts || accounts).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between bg-[#1E1F22]/70 px-2.5 py-1 rounded"
                        >
                          <span>
                            {a.emoji || '👛'} <strong>{a.name}</strong>{' '}
                            <span className="text-[11px] text-[#949BA4]">
                              (
                              {a.type === 'cash'
                                ? isEn
                                  ? 'Cash'
                                  : 'เงินสด'
                                : a.type === 'savings'
                                ? isEn
                                  ? 'Savings'
                                  : 'เงินออม'
                                : a.type === 'ewallet'
                                ? 'E-Wallet'
                                : isEn
                                ? 'Bank'
                                : 'ธนาคาร'}
                              )
                            </span>
                          </span>
                          <code className="font-mono font-bold text-[#FFCAD4]">
                            ฿{formatCurrency(a.balance)}
                          </code>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* GitHub Activity Heatmap Card Image inside the Discord Embed */}
                <div>
                  <p className="text-xs font-bold text-white mb-1.5">
                    {isEn
                      ? `🌱 GitHub Consistency Grid (Max/Day: ${summary?.heatmap?.maxCount || 1} • Total: ${
                          summary?.heatmap?.totalActions || 0
                        } actions • Active: ${summary?.heatmap?.activeDays || 0} days)`
                      : `🌱 ตารางบันทึกแบบ GitHub (สูงสุด/วัน: ${
                          summary?.heatmap?.maxCount || 1
                        } ครั้ง • รวม ${summary?.heatmap?.totalActions || 0} กิจกรรม • ใช้งาน ${
                          summary?.heatmap?.activeDays || 0
                        } วัน)`}
                  </p>
                  <div className="rounded-xl overflow-hidden border border-[#3F4147]/60 bg-[#FFFBF5] p-1">
                    <img
                      src={`/api/bot/heatmap.png?t=${Date.now()}-${summary?.heatmap?.totalActions || 0}`}
                      alt="MochiWallet GitHub Heatmap"
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                </div>

                {/* Footer inside Embed */}
                <div className="pt-2 border-t border-[#3F4147] flex items-center gap-2 text-[11px] text-[#949BA4]">
                  <span>
                    {isEn
                      ? '🍡 MochiWallet • Auto-resets and updates live'
                      : '🍡 MochiWallet • รีเซ็ตและอัปเดตสดอัตโนมัติ'}
                  </span>
                </div>
              </div>

              {/* Discord Select Menus (Dropdown เลือกบัญชี & หมวดหมู่ล่วงหน้า) */}
              <div className="ml-11 mt-2.5 space-y-2 max-w-2xl">
                <div className="bg-[#1E1F22] border border-[#3F4147] rounded-[6px] px-3 py-2 text-xs text-[#B5BAC1] flex items-center justify-between">
                  <span>
                    {isEn
                      ? '👛 Pre-select Bank Account / Wallet (Discord Dropdown)'
                      : '👛 เลือกประเภทธนาคาร / กระเป๋าเงินที่จะใช้ (Dropdown ใน Discord)'}
                  </span>
                  <span>▼</span>
                </div>
                <div className="bg-[#1E1F22] border border-[#3F4147] rounded-[6px] px-3 py-2 text-xs text-[#B5BAC1] flex items-center justify-between">
                  <span>
                    {isEn
                      ? '🏷️ Pre-select Category (Discord Dropdown)'
                      : '🏷️ เลือกประเภทของ / หมวดหมู่ล่วงหน้า (Dropdown ใน Discord)'}
                  </span>
                  <span>▼</span>
                </div>
              </div>

              {/* 3 Interactive Discord Action Buttons Below the Embed */}
              <div className="ml-11 mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openActionModal('expense')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] bg-[#DA373C] hover:bg-[#A1282C] text-white font-semibold text-xs shadow transition-transform active:scale-95"
                >
                  <span>🧁</span>
                  <span>{isEn ? 'Expense' : 'รายจ่าย (Expense)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openActionModal('income')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] bg-[#248046] hover:bg-[#1A6334] text-white font-semibold text-xs shadow transition-transform active:scale-95"
                >
                  <span>💰</span>
                  <span>{isEn ? 'Income' : 'รายรับ (Income)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openActionModal('transfer')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-xs shadow transition-transform active:scale-95"
                >
                  <span>🔄</span>
                  <span>{isEn ? 'Transfer' : 'โอนเงิน (Transfer)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pop-up Screen (Modal) when clicking one of the 3 buttons */}
      <CuteModal
        open={Boolean(activeModalType)}
        title={
          activeModalType === 'income'
            ? isEn
              ? '💰 Record Income (Discord Button Modal)'
              : '💰 บันทึกรายรับ (หน้าจอ Pop-up จากปุ่มกด)'
            : activeModalType === 'transfer'
            ? isEn
              ? '🔄 Record Transfer (Discord Button Modal)'
              : '🔄 บันทึกการโอนเงิน (หน้าจอ Pop-up จากปุ่มกด)'
            : isEn
            ? '🧁 Record Expense (Discord Button Modal)'
            : '🧁 บันทึกรายจ่าย (หน้าจอ Pop-up จากปุ่มกด)'
        }
        emoji={activeModalType === 'income' ? '💰' : activeModalType === 'transfer' ? '🔄' : '🧁'}
        onClose={() => setActiveModalType(null)}
      >
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? '1. Transaction Title *' : '1. ชื่อรายการ *'}
            </label>
            <input
              type="text"
              required
              placeholder={
                activeModalType === 'income'
                  ? isEn
                    ? 'e.g. Monthly Salary, Freelance'
                    : 'เช่น เงินเดือน, รายได้เสริม'
                  : activeModalType === 'transfer'
                  ? isEn
                    ? 'e.g. Transfer to Piggy Savings'
                    : 'เช่น โอนเงินออมเข้ากระปุกหมู'
                  : isEn
                  ? 'e.g. Matcha Latte, Lunch'
                  : 'เช่น มัทฉะลาเต้, ข้าวผัดกะเพรา'
              }
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-pastel-pink"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? '2. Amount (THB) *' : '2. จำนวนเงิน (บาท) *'}
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={modalAmount}
              onChange={(e) => setModalAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-pink"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {activeModalType === 'transfer'
                ? isEn
                  ? '3. From Bank Account / Wallet *'
                  : '3. ประเภทธนาคาร / บัญชีต้นทาง *'
                : isEn
                ? '3. Bank Account / Wallet *'
                : '3. ประเภทธนาคาร / บัญชีที่ใช้ *'}
            </label>
            <CuteSelect
              value={modalBankAccount}
              onChange={setModalBankAccount}
              options={bankAccountOptions}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {activeModalType === 'transfer'
                ? isEn
                  ? '4. To Destination Bank Account / Wallet *'
                  : '4. ไปยังประเภทธนาคาร / บัญชีปลายทาง *'
                : isEn
                ? '4. Category *'
                : '4. ประเภทของ / หมวดหมู่ *'}
            </label>
            <CuteSelect
              value={modalCategoryOrTarget}
              onChange={setModalCategoryOrTarget}
              options={categorySelectOptions}
            />
          </div>

          <button
            type="submit"
            disabled={modalSubmitting}
            className="w-full py-3 rounded-2xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white transition-transform hover:-translate-y-0.5"
          >
            {modalSubmitting
              ? isEn
                ? 'Saving & Resetting Panel...'
                : 'กำลังบันทึกและ Reset หน้าจอ...'
              : isEn
              ? '✨ Save & Reset Panel Now'
              : '✨ ยืนยันบันทึก & Reset หน้าจอทันที'}
          </button>
        </form>
      </CuteModal>
    </div>
  );
}
