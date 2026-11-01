import React, { useState, useMemo, useRef } from 'react';
import { Receipt, Trash2, Edit3, Store, Image as ImageIcon, Lock } from 'lucide-react';
import { CartoonEmojiBadge, formatCurrency } from '../components/CuteStickers.jsx';
import CuteSelect from '../components/CuteSelect.jsx';
import CuteDatePicker from '../components/CuteDatePicker.jsx';
import CuteNoteEditor, { FormattedNote } from '../components/CuteNoteEditor.jsx';
import CuteModal from '../components/CuteModal.jsx';
import SlipModal from '../components/SlipModal.jsx';
import { QrMobileUploadButton } from '../components/QrMobileUploadModal.jsx';
import { computeDateRange } from './Dashboard.jsx';
import { useI18n } from '../i18n.jsx';

export default function Transactions({
  accounts,
  categories,
  shops,
  transactions,
  onRefresh,
}) {
  const { lang } = useI18n();
  const isEn = lang === 'en';
  const todayStr = new Date().toISOString().slice(0, 10);

  // Create Form states
  const [txType, setTxType] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [subAccountId, setSubAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [toSubAccountId, setToSubAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shopId, setShopId] = useState('');
  const [txDate, setTxDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const [slipFile, setSlipFile] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const slipInputRef = useRef(null);
  const attachInputRef = useRef(null);

  // Filter & Pagination states (Max 10 per page)
  const [periodMode, setPeriodMode] = useState('all');
  const [refDate, setRefDate] = useState(todayStr);
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterShop, setFilterShop] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Slip / Photo Viewer Modal
  const [activeSlip, setActiveSlip] = useState(null);

  // Edit Transaction Pop-up Modal state
  const [editTx, setEditTx] = useState(null);
  const [editType, setEditType] = useState('expense');
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editSubAccountId, setEditSubAccountId] = useState('');
  const [editToAccountId, setEditToAccountId] = useState('');
  const [editToSubAccountId, setEditToSubAccountId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editShopId, setEditShopId] = useState('');
  const [editDate, setEditDate] = useState(todayStr);
  const [editNote, setEditNote] = useState('');
  const [editSlipFile, setEditSlipFile] = useState(null);
  const [editAttachFile, setEditAttachFile] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const selectedAccountObj = useMemo(
    () => accounts.find((a) => String(a.id) === String(accountId || accounts[0]?.id)),
    [accounts, accountId]
  );

  const selectedToAccountObj = useMemo(
    () => accounts.find((a) => String(a.id) === String(toAccountId || accounts[1]?.id || accounts[0]?.id)),
    [accounts, toAccountId]
  );

  const editAccountObj = useMemo(
    () => accounts.find((a) => String(a.id) === String(editAccountId)),
    [accounts, editAccountId]
  );

  const editToAccountObj = useMemo(
    () => accounts.find((a) => String(a.id) === String(editToAccountId)),
    [accounts, editToAccountId]
  );

  const matchingCategories = useMemo(
    () => categories.filter((c) => c.type === (txType === 'income' ? 'income' : 'expense')),
    [categories, txType]
  );

  const editMatchingCategories = useMemo(
    () => categories.filter((c) => c.type === (editType === 'income' ? 'income' : 'expense')),
    [categories, editType]
  );

  function handleSelectShop(shop) {
    if (String(shopId) === String(shop.id)) {
      setShopId('');
      return;
    }
    setShopId(shop.id);
    if (shop.default_category_id && txType === 'expense') {
      setCategoryId(shop.default_category_id);
    }
    if (!title) {
      setTitle(shop.name);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    const chosenAcc = accountId || accounts[0]?.id;
    if (!chosenAcc) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', txType);
      formData.append(
        'title',
        title || (txType === 'transfer' ? 'โอนเงินระหว่างบัญชี' : 'รายการบันทึก')
      );
      formData.append('amount', amount);
      formData.append('account_id', chosenAcc);
      if (selectedAccountObj?.has_sub_accounts && subAccountId) {
        formData.append('sub_account_id', subAccountId);
      }
      if (txType === 'transfer') {
        const chosenToAcc = toAccountId || accounts[1]?.id || chosenAcc;
        formData.append('to_account_id', chosenToAcc);
        if (selectedToAccountObj?.has_sub_accounts && toSubAccountId) {
          formData.append('to_sub_account_id', toSubAccountId);
        }
      }
      if (txType !== 'transfer' && categoryId) {
        formData.append('category_id', categoryId);
      }
      if (shopId) {
        formData.append('shop_id', shopId);
      }
      formData.append('transaction_date', txDate);
      formData.append('note', note);
      if (slipFile) {
        formData.append('slip_image', slipFile);
      }
      if (attachmentFile) {
        formData.append('attachment_image', attachmentFile);
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setTitle('');
        setAmount('');
        setSubAccountId('');
        setToSubAccountId('');
        setNote('');
        setSlipFile(null);
        setAttachmentFile(null);
        if (slipInputRef.current) slipInputRef.current.value = '';
        if (attachInputRef.current) attachInputRef.current.value = '';
        await onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(tx) {
    setEditTx(tx);
    setEditType(tx.type || 'expense');
    setEditTitle(tx.title || '');
    setEditAmount(String(tx.amount ?? ''));
    setEditAccountId(String(tx.account_id || ''));
    setEditSubAccountId(tx.sub_account_id || '');
    setEditToAccountId(tx.to_account_id ? String(tx.to_account_id) : '');
    setEditToSubAccountId(tx.to_sub_account_id || '');
    setEditCategoryId(tx.category_id ? String(tx.category_id) : '');
    setEditShopId(tx.shop_id ? String(tx.shop_id) : '');
    setEditDate(tx.transaction_date || todayStr);
    setEditNote(tx.note || '');
    setEditSlipFile(null);
    setEditAttachFile(null);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editTx || !editAmount) return;
    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', editType);
      formData.append('title', editTitle);
      formData.append('amount', editAmount);
      formData.append('account_id', editAccountId);
      formData.append(
        'sub_account_id',
        editAccountObj?.has_sub_accounts ? editSubAccountId || '' : ''
      );
      formData.append('to_account_id', editType === 'transfer' ? editToAccountId : '');
      formData.append(
        'to_sub_account_id',
        editType === 'transfer' && editToAccountObj?.has_sub_accounts ? editToSubAccountId || '' : ''
      );
      formData.append('category_id', editType !== 'transfer' ? editCategoryId : '');
      formData.append('shop_id', editShopId || '');
      formData.append('transaction_date', editDate);
      formData.append('note', editNote);
      if (editSlipFile) formData.append('slip_image', editSlipFile);
      if (editAttachFile) formData.append('attachment_image', editAttachFile);

      const res = await fetch(`/api/transactions/${editTx.id}`, {
        method: 'PUT',
        body: formData,
      });
      if (res.ok) {
        setEditTx(null);
        await onRefresh();
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id) {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    await onRefresh();
  }

  const range = useMemo(
    () => computeDateRange(periodMode, refDate, lang),
    [periodMode, refDate, lang]
  );

  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      if (periodMode !== 'all') {
        if (t.transaction_date < range.start || t.transaction_date > range.end) return false;
      }
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (
        filterAccount !== 'all' &&
        String(t.account_id) !== String(filterAccount) &&
        String(t.to_account_id) !== String(filterAccount)
      ) {
        return false;
      }
      if (
        filterCategory !== 'all' &&
        String(t.category_id) !== String(filterCategory) &&
        String(t.category_parent_id) !== String(filterCategory)
      ) {
        return false;
      }
      if (filterShop !== 'all' && String(t.shop_id) !== String(filterShop)) {
        return false;
      }
      return true;
    });
  }, [
    transactions,
    periodMode,
    range,
    filterType,
    filterAccount,
    filterCategory,
    filterShop,
  ]);

  // Pagination: strictly <= 10 items per page
  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredList.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredList, safeCurrentPage]);

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.emoji} ${a.name} (฿${formatCurrency(a.balance)})`,
  }));

  const categoryOptions = [
    { value: '', label: isEn ? '-- Select Category --' : '-- เลือกหมวดหมู่ --' },
    ...matchingCategories.map((c) => ({
      value: c.id,
      label: `${c.parent_id ? '↳ ' : ''}${c.icon_emoji} ${c.name}`,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <CartoonEmojiBadge emoji="💸" color="#FFD6E0" size="lg" />
          <div>
            <h1 className="font-cute font-bold text-2xl text-pastel-cocoa">
              {isEn
                ? 'Income, Expense & Account Transfers'
                : 'บันทึกรายรับ-รายจ่าย & โอนย้ายบัญชี'}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Create Transaction Form */}
        <div className="lg:col-span-5 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy h-fit">
          <h2 className="font-cute font-bold text-lg text-pastel-cocoa mb-3">
            {isEn ? '✨ Add New Record' : '✨ เพิ่มรายการใหม่'}
          </h2>

          {/* Type Switcher */}
          <div className="grid grid-cols-3 gap-2 mb-4 bg-cream-100 p-1.5 rounded-2xl border border-cream-200">
            {[
              { id: 'expense', label: isEn ? '🧁 Expense' : '🧁 รายจ่าย', bg: 'bg-pastel-pink' },
              { id: 'income', label: isEn ? '💰 Income' : '💰 รายรับ', bg: 'bg-pastel-mint' },
              {
                id: 'transfer',
                label: isEn ? '🔄 Transfer' : '🔄 โอน/แลกเปลี่ยน',
                bg: 'bg-pastel-sky',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setTxType(tab.id);
                  setCategoryId('');
                }}
                className={`py-2 rounded-xl font-cute font-bold text-xs sm:text-sm transition-all ${
                  txType === tab.id
                    ? `${tab.bg} text-pastel-cocoa shadow-sticker border border-white`
                    : 'text-pastel-muted hover:text-pastel-cocoa'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                {isEn ? 'Title / Short Description *' : 'ชื่อรายการ / รายละเอียดสั้นๆ *'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  txType === 'transfer'
                    ? isEn
                      ? 'e.g. Transfer to Pink Piggy Savings'
                      : 'เช่น โอนเงินเข้ากระปุกออมหมู'
                    : isEn
                    ? 'e.g. Matcha Latte, Lunch, Monthly Salary'
                    : 'เช่น มัทฉะลาเต้, ข้าวผัดกะเพรา, เงินเดือน'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-pastel-pink"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn ? 'Amount (THB) *' : 'จำนวนเงิน (บาท) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-pink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn ? 'Date (Auto-set to Today) *' : 'วันที่ทำรายการ (ตั้งอัตโนมัติ) *'}
                </label>
                <CuteDatePicker value={txDate} onChange={setTxDate} />
              </div>
            </div>

            {/* Account & Category Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {txType === 'transfer'
                    ? isEn
                      ? 'From Wallet *'
                      : 'โอนจากบัญชีต้นทาง *'
                    : isEn
                    ? 'Wallet / Account *'
                    : 'กระเป๋าเงิน / บัญชี *'}
                </label>
                <CuteSelect
                  value={accountId || accounts[0]?.id || ''}
                  onChange={(val) => {
                    setAccountId(val);
                    setSubAccountId('');
                  }}
                  options={accountOptions}
                />
              </div>

              {txType === 'transfer' ? (
                <div>
                  <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                    {isEn ? 'To Destination Wallet *' : 'ไปยังบัญชีปลายทาง *'}
                  </label>
                  <CuteSelect
                    value={toAccountId || accounts[1]?.id || ''}
                    onChange={(val) => {
                      setToAccountId(val);
                      setToSubAccountId('');
                    }}
                    options={accountOptions}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                    {isEn ? 'Category' : 'ประเภท / หมวดหมู่'}
                  </label>
                  <CuteSelect
                    value={categoryId}
                    onChange={(val) => setCategoryId(val)}
                    options={categoryOptions}
                  />
                </div>
              )}
            </div>

            {/* Sub-Category Selectors */}
            {txType === 'transfer' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Source sub-pocket */}
                <div className="bg-pastel-lavender/30 border border-pastel-lavender rounded-2xl p-3">
                  <label className="block text-xs font-cute font-bold text-pastel-cocoa mb-1">
                    🗂️ {isEn ? 'Source Sub-Category / Pocket' : 'หมวดย่อยบัญชีต้นทาง (ถ้ามี)'}
                  </label>
                  {selectedAccountObj?.has_sub_accounts &&
                  selectedAccountObj?.sub_accounts_list?.length > 0 ? (
                    <CuteSelect
                      size="sm"
                      value={subAccountId}
                      onChange={setSubAccountId}
                      options={[
                        {
                          value: '',
                          label: isEn ? '-- Main Balance (Unspecified) --' : '-- ไม่ระบุหมวดย่อย (ตัดยอดรวม) --',
                        },
                        ...selectedAccountObj.sub_accounts_list.map((s) => ({
                          value: s.id,
                          label: `${s.emoji || '🏷️'} ${s.name} (฿${formatCurrency(s.balance)})`,
                        })),
                      ]}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-pastel-muted">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isEn
                          ? 'Source wallet has no sub-categories.'
                          : 'บัญชีต้นทางนี้ไม่ได้เปิดหมวดย่อย'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Destination sub-pocket */}
                <div className="bg-pastel-mint/35 border border-pastel-mint rounded-2xl p-3">
                  <label className="block text-xs font-cute font-bold text-pastel-cocoa mb-1">
                    📥 {isEn ? 'Destination Sub-Category / Pocket' : 'หมวดย่อยบัญชีปลายทาง (ถ้ามี)'}
                  </label>
                  {selectedToAccountObj?.has_sub_accounts &&
                  selectedToAccountObj?.sub_accounts_list?.length > 0 ? (
                    <CuteSelect
                      size="sm"
                      value={toSubAccountId}
                      onChange={setToSubAccountId}
                      options={[
                        {
                          value: '',
                          label: isEn ? '-- Main Balance (Unspecified) --' : '-- ไม่ระบุหมวดย่อย (เข้ายอดรวม) --',
                        },
                        ...selectedToAccountObj.sub_accounts_list.map((s) => ({
                          value: s.id,
                          label: `${s.emoji || '🏷️'} ${s.name} (฿${formatCurrency(s.balance)})`,
                        })),
                      ]}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-pastel-muted">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isEn
                          ? 'Destination wallet has no sub-categories.'
                          : 'บัญชีปลายทางนี้ไม่ได้เปิดหมวดย่อย'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-pastel-lavender/30 border border-pastel-lavender rounded-2xl p-3">
                <label className="block text-xs font-cute font-bold text-pastel-cocoa mb-1">
                  🗂️ {isEn ? 'Account Sub-Category / Pocket' : 'หมวดย่อยของบัญชี (ถ้าเปิดใช้งาน)'}
                </label>
                {selectedAccountObj?.has_sub_accounts &&
                selectedAccountObj?.sub_accounts_list?.length > 0 ? (
                  <CuteSelect
                    size="sm"
                    value={subAccountId}
                    onChange={setSubAccountId}
                    options={[
                      {
                        value: '',
                        label: isEn ? '-- Main Account Balance --' : '-- ไม่ระบุหมวดย่อย (ใช้ยอดรวม) --',
                      },
                      ...selectedAccountObj.sub_accounts_list.map((s) => ({
                        value: s.id,
                        label: `${s.emoji || '🏷️'} ${s.name} (฿${formatCurrency(s.balance)})`,
                      })),
                    ]}
                  />
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-pastel-muted">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isEn
                        ? 'This wallet does not have sub-categories enabled (enable in Wallets page first).'
                        : 'บัญชีนี้ไม่ได้เลือกเปิดใช้งานหมวดย่อย (ต้องเปิดใช้หมวดย่อยที่หน้าบัญชีก่อนจึงจะเลือกได้)'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Shop Selector Pills */}
            {txType !== 'transfer' && shops.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1.5 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  <span>
                    {isEn
                      ? 'Select Shop / Merchant (1-click)'
                      : 'กดเลือกร้านค้าที่ใช้บริการ (คลิกเลือกได้เลย)'}
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {shops.map((s) => {
                    const selected = String(shopId) === String(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectShop(s)}
                        style={{ backgroundColor: selected ? s.color : '#FFFDF9' }}
                        className={`px-3 py-1.5 rounded-2xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          selected
                            ? 'border-pastel-cocoa font-bold shadow-sm scale-105'
                            : 'border-cream-300 text-pastel-muted hover:border-pastel-pink'
                        }`}
                      >
                        <span>{s.icon_emoji}</span>
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra Photo Upload (Separate from Slip!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-pastel-pink/30 border-2 border-dashed border-pastel-pink rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <label className="text-xs font-cute font-bold text-pastel-cocoa flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Photo Attachment' : 'รูปภาพประกอบบันทึก'}</span>
                  </label>
                  <QrMobileUploadButton
                    target="attachment"
                    isEn={isEn}
                    label={isEn ? '📱 Scan QR' : '📱 สแกนจากมือถือ'}
                    onFileReceived={(fileObj) => setAttachmentFile(fileObj)}
                  />
                </div>
                <input
                  ref={attachInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                  className="block w-full text-[11px] text-pastel-muted file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-pastel-pink file:text-pastel-cocoa cursor-pointer"
                />
                {attachmentFile && (
                  <p className="text-[10px] text-emerald-700 font-medium mt-1 truncate">
                    🖼️ {attachmentFile.name}
                  </p>
                )}
              </div>

              <div className="bg-pastel-butter/40 border-2 border-dashed border-amber-300/80 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <label className="text-xs font-cute font-bold text-pastel-cocoa flex items-center gap-1">
                    🧾 <span>{isEn ? 'Transfer Slip' : 'แนบสลิป (ซ่อนไว้กดดู)'}</span>
                  </label>
                  <QrMobileUploadButton
                    target="slip"
                    isEn={isEn}
                    label={isEn ? '📱 Scan QR' : '📱 สแกนสลิป'}
                    onFileReceived={(fileObj) => setSlipFile(fileObj)}
                  />
                </div>
                <input
                  ref={slipInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                  className="block w-full text-[11px] text-pastel-muted file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-pastel-butter file:text-pastel-cocoa cursor-pointer"
                />
                {slipFile && (
                  <p className="text-[10px] text-emerald-700 font-medium mt-1 truncate">
                    ✅ {slipFile.name}
                  </p>
                )}
              </div>
            </div>

            {/* Multi-line & Bullet Note Editor */}
            <div>
              <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                {isEn
                  ? 'Note / Memo (Supports • Bullets & New Lines)'
                  : 'โน้ตบันทึก (รองรับ • หัวข้อย่อย และขึ้นบรรทัดใหม่)'}
              </label>
              <CuteNoteEditor value={note} onChange={setNote} rows={3} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {submitting
                ? isEn
                  ? 'Saving...'
                  : 'กำลังบันทึก...'
                : isEn
                ? '🍡 Save Transaction'
                : '🍡 บันทึกรายการ'}
            </button>
          </form>
        </div>

        {/* Right: Transactions List & Filters (Max 10 per page) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar */}
          <div className="bg-cream-50 border-2 border-white rounded-3xl p-4 shadow-cozy space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: isEn ? '🌟 All' : '🌟 ทั้งหมด' },
                  { id: 'day', label: isEn ? 'Daily' : 'รายวัน' },
                  { id: 'month', label: isEn ? 'Monthly' : 'รายเดือน' },
                  { id: 'quarter', label: isEn ? 'Quarterly' : 'ไตรมาส' },
                  { id: 'half_year', label: isEn ? '6 Months' : '6 เดือน' },
                  { id: 'year', label: isEn ? 'Yearly' : 'รายปี' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPeriodMode(p.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-cute font-bold transition-all ${
                      periodMode === p.id
                        ? 'bg-pastel-pink text-pastel-cocoa border border-white shadow-sm'
                        : 'bg-cream-100 text-pastel-muted hover:bg-cream-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {periodMode !== 'all' && (
                <CuteDatePicker
                  size="sm"
                  align="right"
                  value={refDate}
                  onChange={(val) => {
                    setRefDate(val);
                    setCurrentPage(1);
                  }}
                  className="w-40"
                />
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-cream-200">
              <CuteSelect
                size="sm"
                value={filterType}
                onChange={(val) => {
                  setFilterType(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: isEn ? 'All Types' : 'ทุกประเภท' },
                  { value: 'expense', label: isEn ? '🧁 Expenses' : '🧁 รายจ่าย' },
                  { value: 'income', label: isEn ? '💰 Income' : '💰 รายรับ' },
                  { value: 'transfer', label: isEn ? '🔄 Transfers' : '🔄 โอนเงิน' },
                ]}
              />

              <CuteSelect
                size="sm"
                value={filterAccount}
                onChange={(val) => {
                  setFilterAccount(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: isEn ? 'All Wallets' : 'ทุกบัญชี' },
                  ...accounts.map((a) => ({ value: a.id, label: `${a.emoji} ${a.name}` })),
                ]}
              />

              <CuteSelect
                size="sm"
                value={filterCategory}
                onChange={(val) => {
                  setFilterCategory(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: isEn ? 'All Categories' : 'ทุกหมวดหมู่' },
                  ...categories.map((c) => ({ value: c.id, label: `${c.icon_emoji} ${c.name}` })),
                ]}
              />

              <CuteSelect
                size="sm"
                value={filterShop}
                onChange={(val) => {
                  setFilterShop(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: isEn ? 'All Shops' : 'ทุกร้านค้า' },
                  ...shops.map((s) => ({ value: s.id, label: `${s.icon_emoji} ${s.name}` })),
                ]}
              />
            </div>
          </div>

          {/* List of Transactions (Strictly max 10 items per page) */}
          <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-cute font-bold text-base text-pastel-cocoa">
                📋{' '}
                {isEn
                  ? `Transactions (${filteredList.length} total • Page ${safeCurrentPage}/${totalPages})`
                  : `รายการบันทึก (ทั้งหมด ${filteredList.length} รายการ • หน้า ${safeCurrentPage}/${totalPages})`}
              </h3>
              <span className="text-xs bg-pastel-butter/60 px-2.5 py-1 rounded-xl font-medium text-pastel-cocoa">
                📌 {range.label} ({isEn ? 'Max 10/page' : 'แสดงไม่เกิน 10 รายการ/หน้า'})
              </span>
            </div>

            {paginatedList.length === 0 ? (
              <div className="text-center py-12 text-pastel-muted text-sm">
                {isEn ? 'No matching transactions found 🌸' : 'ไม่พบรายการที่ตรงกับตัวกรองจ้า 🌸'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {paginatedList.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 p-3.5 rounded-2xl bg-cream-100/80 hover:bg-cream-100 border border-cream-200 transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-cute font-bold text-sm text-pastel-cocoa">
                            {tx.title}
                          </span>
                          {tx.category_name && (
                            <span className="text-[11px] bg-white px-2 py-0.5 rounded-full text-pastel-muted border border-cream-200">
                              {tx.category_emoji} {tx.category_name}
                            </span>
                          )}
                          {tx.shop_name && (
                            <span
                              style={{ backgroundColor: tx.shop_color || '#D6ECFF' }}
                              className="text-[11px] px-2 py-0.5 rounded-full font-medium border border-white"
                            >
                              {tx.shop_emoji} {tx.shop_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-pastel-muted mt-0.5">
                          📅 {tx.transaction_date} • {tx.account_emoji} {tx.account_name}
                          {tx.sub_account_label ? ` [${tx.sub_account_label}]` : ''}
                          {tx.type === 'transfer' && tx.to_account_name
                            ? ` ➔ ${tx.to_account_emoji} ${tx.to_account_name}${tx.to_sub_account_label ? ` [${tx.to_sub_account_label}]` : ''}`
                            : ''}
                        </p>

                        {/* Bullet & Multi-line Note */}
                        <FormattedNote text={tx.note} className="mt-1.5" />

                        {/* Extra Attachment Image Preview */}
                        {tx.attachment_image && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveSlip({
                                  url: tx.attachment_image,
                                  title: `${tx.title} (${isEn ? 'Photo Attachment' : 'รูปภาพประกอบ'})`,
                                  amount: tx.amount,
                                  date: tx.transaction_date,
                                })
                              }
                              className="inline-flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-white border border-cream-300 hover:border-pastel-pink shadow-sm transition-transform hover:scale-[1.02]"
                            >
                              <img
                                src={tx.attachment_image}
                                alt="attachment"
                                className="w-11 h-11 object-cover rounded-xl"
                              />
                              <span className="text-[11px] font-cute font-bold text-pastel-cocoa">
                                🖼️ {isEn ? 'View Photo' : 'ดูรูปภาพประกอบ'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pastel-butter hover:bg-amber-200 text-pastel-cocoa text-xs font-cute font-bold border border-white shadow-sm transition-transform hover:scale-105"
                        >
                          <Receipt className="w-3.5 h-3.5" /> {isEn ? 'View Slip' : 'กดดูสลิป'}
                        </button>
                      )}

                      <span
                        className={`font-cute font-bold text-base px-1 ${
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

                      <button
                        type="button"
                        onClick={() => openEditModal(tx)}
                        className="p-1.5 rounded-xl text-pastel-muted hover:text-pastel-cocoa hover:bg-pastel-pink/50 transition-colors"
                        title={isEn ? 'Edit in Pop-up' : 'แก้ไขรายการ (Pop-up)'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 rounded-xl text-pastel-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={isEn ? 'Delete' : 'ลบรายการ'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pagination Bar */}
                {totalPages > 1 && (
                  <div className="pt-4 mt-3 border-t border-cream-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-pastel-muted">
                      {isEn
                        ? `Showing ${(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(
                            safeCurrentPage * ITEMS_PER_PAGE,
                            filteredList.length
                          )} of ${filteredList.length}`
                        : `แสดงรายการที่ ${(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} - ${Math.min(
                            safeCurrentPage * ITEMS_PER_PAGE,
                            filteredList.length
                          )} จากทั้งหมด ${filteredList.length} รายการ`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-xl bg-cream-100 hover:bg-pastel-pink/60 disabled:opacity-40 text-xs font-cute font-bold text-pastel-cocoa"
                      >
                        ← {isEn ? 'Prev' : 'หน้าก่อนหน้า'}
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-cute font-bold transition-all ${
                            safeCurrentPage === pageNum
                              ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border border-white'
                              : 'bg-cream-100 text-pastel-muted hover:bg-cream-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1.5 rounded-xl bg-pastel-pink hover:bg-pastel-rose disabled:opacity-40 text-xs font-cute font-bold text-pastel-cocoa"
                      >
                        {isEn ? 'Next Page' : 'หน้าถัดไป'} →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Transaction Pop-up Modal */}
      <CuteModal
        open={Boolean(editTx)}
        title={isEn ? 'Edit Transaction' : 'แก้ไขรายการบันทึก'}
        emoji="💸"
        onClose={() => setEditTx(null)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'Title *' : 'ชื่อรายการ *'}
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                {isEn ? 'Amount (THB) *' : 'จำนวนเงิน (บาท) *'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                {isEn ? 'Date *' : 'วันที่ทำรายการ *'}
              </label>
              <CuteDatePicker value={editDate} onChange={setEditDate} align="right" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                {isEn ? 'Wallet' : 'กระเป๋าเงิน'}
              </label>
              <CuteSelect
                value={editAccountId}
                onChange={(val) => {
                  setEditAccountId(val);
                  setEditSubAccountId('');
                }}
                options={accountOptions}
              />
            </div>

            {editType === 'transfer' ? (
              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn ? 'To Wallet' : 'ไปยังบัญชี'}
                </label>
                <CuteSelect
                  value={editToAccountId}
                  onChange={(val) => {
                    setEditToAccountId(val);
                    setEditToSubAccountId('');
                  }}
                  options={accountOptions}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  {isEn ? 'Category' : 'หมวดหมู่'}
                </label>
                <CuteSelect
                  value={editCategoryId}
                  onChange={setEditCategoryId}
                  options={[
                    { value: '', label: isEn ? '-- Select --' : '-- เลือก --' },
                    ...editMatchingCategories.map((c) => ({
                      value: c.id,
                      label: `${c.icon_emoji} ${c.name}`,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          {editType === 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {editAccountObj?.has_sub_accounts && editAccountObj?.sub_accounts_list?.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                    🗂️ {isEn ? 'Source Sub-Category' : 'หมวดย่อยบัญชีต้นทาง'}
                  </label>
                  <CuteSelect
                    size="sm"
                    value={editSubAccountId}
                    onChange={setEditSubAccountId}
                    options={[
                      { value: '', label: isEn ? '-- None --' : '-- ไม่ระบุหมวดย่อย --' },
                      ...editAccountObj.sub_accounts_list.map((s) => ({
                        value: s.id,
                        label: `${s.emoji || '🏷️'} ${s.name}`,
                      })),
                    ]}
                  />
                </div>
              )}
              {editToAccountObj?.has_sub_accounts && editToAccountObj?.sub_accounts_list?.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                    📥 {isEn ? 'Destination Sub-Category' : 'หมวดย่อยบัญชีปลายทาง'}
                  </label>
                  <CuteSelect
                    size="sm"
                    value={editToSubAccountId}
                    onChange={setEditToSubAccountId}
                    options={[
                      { value: '', label: isEn ? '-- None --' : '-- ไม่ระบุหมวดย่อย --' },
                      ...editToAccountObj.sub_accounts_list.map((s) => ({
                        value: s.id,
                        label: `${s.emoji || '🏷️'} ${s.name}`,
                      })),
                    ]}
                  />
                </div>
              )}
            </div>
          ) : (
            editAccountObj?.has_sub_accounts && editAccountObj?.sub_accounts_list?.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-pastel-cocoa mb-1">
                  🗂️ {isEn ? 'Account Sub-Category' : 'หมวดย่อยของบัญชี'}
                </label>
                <CuteSelect
                  size="sm"
                  value={editSubAccountId}
                  onChange={setEditSubAccountId}
                  options={[
                    { value: '', label: isEn ? '-- None --' : '-- ไม่ระบุหมวดย่อย --' },
                    ...editAccountObj.sub_accounts_list.map((s) => ({
                      value: s.id,
                      label: `${s.emoji || '🏷️'} ${s.name}`,
                    })),
                  ]}
                />
              </div>
            )
          )}

          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'Note (Supports • bullets)' : 'โน้ตบันทึก (รองรับ • หัวข้อย่อย)'}
            </label>
            <CuteNoteEditor value={editNote} onChange={setEditNote} rows={3} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-pastel-pink/30 border border-pastel-pink rounded-2xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <label className="block text-[11px] font-bold text-pastel-cocoa">
                  🖼️ {isEn ? 'Replace Photo Attachment' : 'อัปเดตรูปภาพประกอบ'}
                </label>
                <QrMobileUploadButton
                  target="attachment"
                  isEn={isEn}
                  label={isEn ? '📱 Scan QR' : '📱 สแกน QR'}
                  onFileReceived={(fileObj) => setEditAttachFile(fileObj)}
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditAttachFile(e.target.files?.[0] || null)}
                className="block w-full text-[11px]"
              />
              {editAttachFile && (
                <p className="text-[10px] text-emerald-700 font-medium truncate">
                  ✅ {editAttachFile.name}
                </p>
              )}
            </div>
            <div className="bg-pastel-butter/40 border border-amber-300 rounded-2xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <label className="block text-[11px] font-bold text-pastel-cocoa">
                  🧾 {isEn ? 'Replace Slip Image' : 'อัปเดตรูปสลิป'}
                </label>
                <QrMobileUploadButton
                  target="slip"
                  isEn={isEn}
                  label={isEn ? '📱 Scan QR' : '📱 สแกนสลิป'}
                  onFileReceived={(fileObj) => setEditSlipFile(fileObj)}
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditSlipFile(e.target.files?.[0] || null)}
                className="block w-full text-[11px]"
              />
              {editSlipFile && (
                <p className="text-[10px] text-emerald-700 font-medium truncate">
                  ✅ {editSlipFile.name}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={editSubmitting}
            className="w-full py-3 rounded-2xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white"
          >
            {editSubmitting
              ? isEn
                ? 'Saving...'
                : 'กำลังบันทึก...'
              : isEn
              ? '💾 Save Changes'
              : '💾 บันทึกการแก้ไขรายการ'}
          </button>
        </form>
      </CuteModal>

      {/* Slip / Attachment Viewer Modal */}
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
