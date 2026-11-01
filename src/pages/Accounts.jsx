import React, { useState, useRef } from 'react';
import { Trash2, Edit3, Image as ImageIcon, Layers, Lock, Plus } from 'lucide-react';
import {
  CUTE_EMOJIS,
  CartoonEmojiBadge,
  formatCurrency,
} from '../components/CuteStickers.jsx';
import CuteSelect from '../components/CuteSelect.jsx';
import CuteColorPicker from '../components/CuteColorPicker.jsx';
import CuteNoteEditor, { FormattedNote } from '../components/CuteNoteEditor.jsx';
import CuteModal from '../components/CuteModal.jsx';
import { QrMobileUploadButton } from '../components/QrMobileUploadModal.jsx';
import { useI18n } from '../i18n.jsx';

function AccountFormFields({
  isEn,
  name,
  setName,
  accType,
  setAccType,
  balance,
  setBalance,
  color,
  setColor,
  emoji,
  setEmoji,
  note,
  setNote,
  hasSubAccounts,
  setHasSubAccounts,
  subAccounts,
  setSubAccounts,
  previewUrl,
  onFileChange,
  onClearCover,
  fileInputRef,
  accountTypeOptions,
  submitLabel,
  submitting,
}) {
  function addSubRow() {
    if (!hasSubAccounts) return;
    setSubAccounts([
      ...subAccounts,
      {
        id: `sub-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        name: '',
        emoji: '🏷️',
        balance: '',
      },
    ]);
  }

  function updateSubRow(idx, field, val) {
    const copy = [...subAccounts];
    copy[idx] = { ...copy[idx], [field]: val };
    setSubAccounts(copy);
  }

  function removeSubRow(idx) {
    setSubAccounts(subAccounts.filter((_, i) => i !== idx));
  }

  const mainBalanceNum = Number(balance) || 0;
  const subTotalBalance = hasSubAccounts
    ? subAccounts.reduce((sum, s) => sum + (Number(s.balance) || 0), 0)
    : 0;
  const isOverMainBalance = hasSubAccounts && subTotalBalance > mainBalanceNum;
  const unallocatedBalance = Math.max(0, mainBalanceNum - subTotalBalance);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1">
          {isEn ? 'Wallet / Account Name *' : 'ชื่อกระเป๋าเงิน / บัญชีเงินเก็บ *'}
        </label>
        <input
          type="text"
          required
          placeholder={
            isEn
              ? 'e.g. Daily Cash, Pink Piggy Savings'
              : 'เช่น กระเป๋าตังค์พกพา, บัญชีเงินออมหมูชมพู'
          }
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-pastel-pink"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn ? 'Account Type' : 'ประเภทบัญชี'}
          </label>
          <CuteSelect
            value={accType}
            onChange={(val) => setAccType(val)}
            options={accountTypeOptions}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn ? 'Current Balance (THB)' : 'ยอดเงินปัจจุบัน (บาท)'}
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pastel-pink"
          />
        </div>
      </div>

      {/* Account Sub-Categories Toggle + Builder */}
      <div className="bg-pastel-lavender/35 border-2 border-pastel-lavender rounded-2xl p-3.5 space-y-2.5">
        <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasSubAccounts}
              onChange={(e) => setHasSubAccounts(e.target.checked)}
              className="w-4 h-4 rounded accent-pink-400 cursor-pointer"
            />
            <span className="text-xs font-cute font-bold text-pastel-cocoa flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              {isEn
                ? 'Enable Sub-Categories / Pockets for this Account'
                : 'เลือกใช้บัญชีแบบมีหมวดย่อย (ตั้งกระเป๋าย่อยในบัญชีนี้)'}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              hasSubAccounts
                ? 'bg-pastel-mint text-emerald-800'
                : 'bg-cream-200 text-pastel-muted'
            }`}
          >
            {hasSubAccounts ? (isEn ? 'Enabled' : 'เปิดใช้งานแล้ว') : isEn ? 'Disabled' : 'ปิดอยู่'}
          </span>
        </label>

        {!hasSubAccounts ? (
          <div className="flex items-center gap-2 text-[11px] text-pastel-muted bg-white/70 px-3 py-2 rounded-xl border border-cream-200">
            <Lock className="w-3.5 h-3.5 shrink-0 text-pastel-muted" />
            <span>
              {isEn
                ? 'Must check the box above first to unlock and use sub-categories in this account.'
                : 'ต้องติ๊กเลือกเปิดใช้งานด้านบนก่อน ถึงจะสามารถตั้งและเลือกใช้หมวดย่อยของบัญชีนี้ได้'}
            </span>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-pastel-cocoa">
                {isEn
                  ? 'Sub-categories / Pockets inside this account:'
                  : 'รายการหมวดย่อยภายในบัญชีนี้:'}
              </span>
              <button
                type="button"
                onClick={addSubRow}
                className="inline-flex items-center gap-1 text-xs font-cute font-bold px-2.5 py-1 rounded-xl bg-pastel-butter hover:bg-amber-200 text-pastel-cocoa border border-white shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                {isEn ? 'Add Sub-Category' : 'เพิ่มหมวดย่อยบัญชี'}
              </button>
            </div>

            {subAccounts.length === 0 ? (
              <p className="text-[11px] text-pastel-muted">
                {isEn
                  ? 'Click "+ Add Sub-Category" to create pockets (e.g. Emergency Fund, Travel Pocket).'
                  : 'กดปุ่ม "+ เพิ่มหมวดย่อยบัญชี" เพื่อแบ่งหมวดย่อยในบัญชีนี้ (เช่น เงินสำรอง, เก็บเที่ยว, ค่าเทอม)'}
              </p>
            ) : (
              <div className="space-y-2">
                {subAccounts.map((sub, idx) => (
                  <div
                    key={sub.id || idx}
                    className="flex items-center gap-2 bg-white/90 p-2 rounded-2xl border border-cream-200"
                  >
                    <CuteSelect
                      size="sm"
                      value={sub.emoji || '🏷️'}
                      onChange={(val) => updateSubRow(idx, 'emoji', val)}
                      options={['🏷️', '🛡️', '✈️', '🐷', '🎓', '🏠', '🎁', '💖', '✨'].map(
                        (em) => ({ value: em, label: em })
                      )}
                      className="w-20 shrink-0"
                    />
                    <input
                      type="text"
                      placeholder={isEn ? 'Sub-account name' : 'ชื่อหมวดย่อยบัญชี'}
                      value={sub.name}
                      onChange={(e) => updateSubRow(idx, 'name', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-xl bg-cream-100 border border-cream-300 text-xs"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder={isEn ? 'Amount' : 'ยอดเงินย่อย'}
                      value={sub.balance}
                      onChange={(e) => updateSubRow(idx, 'balance', e.target.value)}
                      className={`w-24 px-2.5 py-1.5 rounded-xl bg-cream-100 border text-xs font-bold ${
                        isOverMainBalance ? 'border-rose-400 text-rose-600' : 'border-cream-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => removeSubRow(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Sub-accounts Balance Cap Summary & Validation */}
                <div
                  className={`p-2.5 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-2 ${
                    isOverMainBalance
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                      : 'bg-white/80 border-cream-200 text-pastel-cocoa'
                  }`}
                >
                  <span>
                    {isEn ? 'Sub-pockets Total:' : 'รวมหมวดย่อย:'}{' '}
                    <strong>฿{formatCurrency(subTotalBalance)}</strong> / ฿
                    {formatCurrency(mainBalanceNum)}
                  </span>
                  {isOverMainBalance ? (
                    <span>
                      ⚠️{' '}
                      {isEn
                        ? 'Sub-categories total cannot exceed main account balance!'
                        : 'ยอดรวมหมวดย่อยห้ามเกินยอดเงินของบัญชีหลัก!'}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">
                      {isEn ? 'Unallocated:' : 'คงเหลือในบัญชีหลัก:'} ฿
                      {formatCurrency(unallocatedBalance)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Pastel Color Picker UI */}
      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1.5">
          {isEn
            ? '🎨 Account Color (Pastel Studio UI)'
            : '🎨 กำหนดสีประจำบัญชี (เลือกสีพาสเทล หรือเปิดถาดผสมสี)'}
        </label>
        <CuteColorPicker value={color} onChange={setColor} />
      </div>

      {/* Cover Image Upload */}
      <div className="bg-cream-100/90 border-2 border-dashed border-pastel-pink rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-xs font-cute font-bold text-pastel-cocoa flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>
              {isEn
                ? 'Account Cover Image (GIF / Transparent PNG)'
                : 'รูปหน้าปกบัญชี (รองรับ GIF / PNG โปร่งใส)'}
            </span>
          </label>
          <QrMobileUploadButton
            target="account"
            isEn={isEn}
            label={isEn ? '📱 Scan QR from Phone' : '📱 สแกนอัปโหลดจากมือถือ'}
            onFileReceived={(fileObj) => onFileChange({ target: { files: [fileObj] } })}
          />
        </div>
        <p className="text-[11px] text-pastel-muted">
          {isEn
            ? '* Account images are exclusive to this wallet and not stored in the reusable gallery'
            : '* รูปของบัญชีจะใช้เฉพาะบัญชีนี้เท่านั้น ไม่ถูกจำเข้าคลังรูปใช้ซ้ำ'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.gif,.png,.webp,.svg,.jpg,.jpeg,.avif"
          onChange={onFileChange}
          className="block w-full text-xs text-pastel-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pastel-pink file:text-pastel-cocoa hover:file:bg-pastel-rose cursor-pointer"
        />

        {previewUrl && (
          <div className="mt-2 flex items-center gap-3 p-2.5 rounded-2xl bg-transparent-checker border border-cream-300">
            <img
              src={previewUrl}
              alt="Account Cover Preview"
              className="w-16 h-16 object-contain rounded-xl drop-shadow-md"
            />
            <div className="text-xs flex-1">
              <p className="font-semibold text-pastel-cocoa">
                {isEn ? 'Cover Preview' : 'ตัวอย่างหน้าปกบัญชี'}
              </p>
              <p className="text-[11px] text-pastel-muted">
                {isEn ? 'Supports transparency' : 'รองรับพื้นหลังโปร่งใส (Transparent)'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearCover}
              className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-700 text-xs font-medium hover:bg-rose-200"
            >
              {isEn ? 'Remove' : 'ลบรูปปก'}
            </button>
          </div>
        )}
      </div>

      {/* Cute Emoji Picker */}
      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1.5">
          {isEn
            ? 'Account Emoji (shown when no cover image is uploaded)'
            : 'อีโมจิประจำบัญชี (แสดงเมื่อไม่ได้ใส่รูปปก หรือแสดงคู่กับชื่อบัญชี)'}
        </label>
        <div className="flex flex-wrap gap-1.5 p-2.5 bg-cream-100 rounded-2xl border border-cream-200">
          {CUTE_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setEmoji(em)}
              className={`w-8 h-8 rounded-xl text-lg flex items-center justify-center transition-transform ${
                emoji === em
                  ? 'bg-pastel-pink border-2 border-white shadow-sm scale-110'
                  : 'hover:bg-cream-200'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-line & Bullet Note Editor */}
      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1">
          {isEn
            ? 'Note / Account Goal (Supports • bullets & new lines)'
            : 'คำอธิบาย / เป้าหมายของบัญชี (รองรับ • หัวข้อย่อย และขึ้นบรรทัดใหม่)'}
        </label>
        <CuteNoteEditor value={note} onChange={setNote} rows={3} />
      </div>

      <button
        type="submit"
        disabled={submitting || isOverMainBalance}
        className="w-full py-3 rounded-2xl bg-pastel-mint hover:bg-pastel-teal disabled:opacity-50 disabled:cursor-not-allowed text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white transition-transform hover:-translate-y-0.5"
      >
        {submitting ? (isEn ? 'Saving...' : 'กำลังบันทึก...') : submitLabel}
      </button>
    </div>
  );
}

export default function Accounts({ accounts, onRefresh }) {
  const { lang } = useI18n();
  const isEn = lang === 'en';

  // Create Form State
  const [name, setName] = useState('');
  const [accType, setAccType] = useState('bank');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#FFD6E0');
  const [emoji, setEmoji] = useState('👛');
  const [note, setNote] = useState('');
  const [hasSubAccounts, setHasSubAccounts] = useState(false);
  const [subAccounts, setSubAccounts] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Edit Pop-up Modal State
  const [editModalAcc, setEditModalAcc] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('bank');
  const [editBalance, setEditBalance] = useState('');
  const [editColor, setEditColor] = useState('#FFD6E0');
  const [editEmoji, setEditEmoji] = useState('👛');
  const [editNote, setEditNote] = useState('');
  const [editHasSubs, setEditHasSubs] = useState(false);
  const [editSubs, setEditSubs] = useState([]);
  const [editCoverFile, setEditCoverFile] = useState(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState(null);
  const [editRemoveCover, setEditRemoveCover] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editFileRef = useRef(null);

  function resetCreateForm() {
    setName('');
    setAccType('bank');
    setBalance('');
    setColor('#FFD6E0');
    setEmoji('👛');
    setNote('');
    setHasSubAccounts(false);
    setSubAccounts([]);
    setCoverFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function openEditModal(acc) {
    setEditModalAcc(acc);
    setEditName(acc.name);
    setEditType(acc.type || 'bank');
    setEditBalance(String(acc.balance ?? 0));
    setEditColor(acc.color || '#FFD6E0');
    setEditEmoji(acc.emoji || '👛');
    setEditNote(acc.note || '');
    setEditHasSubs(Boolean(acc.has_sub_accounts));
    setEditSubs(Array.isArray(acc.sub_accounts_list) ? acc.sub_accounts_list : []);
    setEditCoverFile(null);
    setEditPreviewUrl(acc.cover_image || null);
    setEditRemoveCover(false);
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    try {
      const cleanSubs = hasSubAccounts
        ? subAccounts
            .filter((s) => s.name && s.name.trim())
            .map((s) => ({
              id: s.id || `sub-${Date.now()}`,
              name: s.name.trim(),
              emoji: s.emoji || '🏷️',
              balance: Number(s.balance) || 0,
            }))
        : [];

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('type', accType);
      formData.append('balance', balance || '0');
      formData.append('color', color);
      formData.append('emoji', emoji);
      formData.append('note', note);
      formData.append('has_sub_accounts', hasSubAccounts ? 'true' : 'false');
      formData.append('sub_accounts', JSON.stringify(cleanSubs));
      if (coverFile) {
        formData.append('cover_image', coverFile);
      }

      const res = await fetch('/api/accounts', { method: 'POST', body: formData });
      if (res.ok) {
        resetCreateForm();
        await onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editModalAcc || !editName.trim()) return;
    setEditSubmitting(true);

    try {
      const cleanSubs = editHasSubs
        ? editSubs
            .filter((s) => s.name && s.name.trim())
            .map((s) => ({
              id: s.id || `sub-${Date.now()}`,
              name: s.name.trim(),
              emoji: s.emoji || '🏷️',
              balance: Number(s.balance) || 0,
            }))
        : [];

      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('type', editType);
      formData.append('balance', editBalance || '0');
      formData.append('color', editColor);
      formData.append('emoji', editEmoji);
      formData.append('note', editNote);
      formData.append('has_sub_accounts', editHasSubs ? 'true' : 'false');
      formData.append('sub_accounts', JSON.stringify(cleanSubs));
      if (editCoverFile) {
        formData.append('cover_image', editCoverFile);
      }
      if (editRemoveCover) {
        formData.append('remove_cover', 'true');
      }

      const res = await fetch(`/api/accounts/${editModalAcc.id}`, {
        method: 'PUT',
        body: formData,
      });
      if (res.ok) {
        setEditModalAcc(null);
        await onRefresh();
      }
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id) {
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (editModalAcc?.id === id) setEditModalAcc(null);
    await onRefresh();
  }

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const accountTypeOptions = [
    { value: 'cash', label: isEn ? '👛 Cash Wallet' : '👛 กระเป๋าเงินสด' },
    { value: 'bank', label: isEn ? '🏦 Bank Account' : '🏦 บัญชีธนาคาร' },
    { value: 'savings', label: isEn ? '🐷 Savings Account' : '🐷 บัญชีเงินเก็บ / เงินออม' },
    { value: 'ewallet', label: isEn ? '📱 E-Wallet / Card' : '📱 E-Wallet / บัตร' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <CartoonEmojiBadge emoji="👛" color="#D4F5E9" size="lg" />
          <div>
            <h1 className="font-cute font-bold text-2xl text-pastel-cocoa">
              {isEn ? 'Wallets & Savings Accounts' : 'กระเป๋าเงิน & บัญชีเงินเก็บ'}
            </h1>
            <p className="text-xs sm:text-sm text-pastel-muted">
              {isEn
                ? 'Customize colors, upload GIF/transparent covers, and enable optional sub-account pockets'
                : 'ปรับแต่งสีพาสเทล อัปโหลดรูปหน้าปก (GIF/PNG โปร่งใส) และเลือกเปิดใช้หมวดย่อยในบัญชีได้ตามต้องการ'}
            </p>
          </div>
        </div>
        <div className="bg-pastel-butter/80 px-4 py-2.5 rounded-2xl border-2 border-white shadow-sticker ml-auto">
          <span className="text-xs text-pastel-muted block">
            {isEn ? 'Total Balance Across Accounts' : 'ยอดเงินรวมทุกบัญชี'}
          </span>
          <span className="font-cute font-bold text-xl text-pastel-cocoa">
            ฿{formatCurrency(totalBalance)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Create New Account Form */}
        <div className="lg:col-span-5 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy h-fit">
          <h2 className="font-cute font-bold text-lg text-pastel-cocoa mb-4">
            {isEn ? '✨ Open New Wallet / Account' : '✨ เปิดกระเป๋าเงิน / บัญชีใหม่'}
          </h2>

          <form onSubmit={handleCreateSubmit}>
            <AccountFormFields
              isEn={isEn}
              name={name}
              setName={setName}
              accType={accType}
              setAccType={setAccType}
              balance={balance}
              setBalance={setBalance}
              color={color}
              setColor={setColor}
              emoji={emoji}
              setEmoji={setEmoji}
              note={note}
              setNote={setNote}
              hasSubAccounts={hasSubAccounts}
              setHasSubAccounts={setHasSubAccounts}
              subAccounts={subAccounts}
              setSubAccounts={setSubAccounts}
              previewUrl={previewUrl}
              onFileChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setCoverFile(f);
                  setPreviewUrl(URL.createObjectURL(f));
                }
              }}
              onClearCover={() => {
                setCoverFile(null);
                setPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              fileInputRef={fileInputRef}
              accountTypeOptions={accountTypeOptions}
              submitLabel={
                isEn
                  ? '✨ Open New Wallet (+1 GitHub Activity)'
                  : '✨ เปิดบัญชีใหม่ (+1 กิจกรรมในตาราง GitHub)'
              }
              submitting={submitting}
            />
          </form>
        </div>

        {/* Right: Accounts Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              style={{ backgroundColor: acc.color || '#FFD6E0' }}
              className="rounded-3xl p-5 border-2 border-white shadow-cozy relative overflow-hidden flex flex-col justify-between min-h-[205px] transition-transform hover:-translate-y-1"
            >
              <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/25 pointer-events-none" />

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-16 h-16 rounded-2xl bg-white/55 backdrop-blur-sm border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                    {acc.cover_image ? (
                      <img
                        src={acc.cover_image}
                        alt={acc.name}
                        className="w-full h-full object-contain p-1 drop-shadow"
                      />
                    ) : (
                      <span className="text-3xl">{acc.emoji || '👛'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/75 text-pastel-cocoa">
                        {acc.type === 'cash'
                          ? isEn
                            ? '👛 Cash'
                            : '👛 เงินสด'
                          : acc.type === 'savings'
                          ? isEn
                            ? '🐷 Savings'
                            : '🐷 เงินเก็บ/ออม'
                          : acc.type === 'ewallet'
                          ? '📱 E-Wallet'
                          : isEn
                          ? '🏦 Bank'
                          : '🏦 บัญชีธนาคาร'}
                      </span>
                      {acc.has_sub_accounts && (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-lavender/90 text-pastel-cocoa">
                          🗂️ {isEn ? 'Sub-pockets' : 'มีหมวดย่อย'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-cute font-bold text-lg text-pastel-cocoa mt-1 truncate">
                      {acc.name}
                    </h3>
                    <FormattedNote text={acc.note} className="mt-1 text-pastel-cocoa/80" />
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm p-1 rounded-2xl border border-white shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(acc)}
                    className="p-1.5 rounded-xl hover:bg-white text-pastel-cocoa transition-colors"
                    title={isEn ? 'Edit in Pop-up' : 'แก้ไขบัญชี (Pop-up)'}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(acc.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-600 transition-colors"
                    title={isEn ? 'Delete' : 'ลบบัญชี'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-accounts display if enabled */}
              {acc.has_sub_accounts && acc.sub_accounts_list?.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-white/50 relative z-10 space-y-1">
                  <p className="text-[11px] font-cute font-bold text-pastel-cocoa/80">
                    🗂️ {isEn ? 'Sub-Categories / Pockets:' : 'หมวดย่อยในบัญชีนี้:'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {acc.sub_accounts_list.map((sub) => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center gap-1 text-xs bg-white/80 px-2.5 py-1 rounded-xl border border-white font-medium text-pastel-cocoa shadow-sm"
                      >
                        <span>{sub.emoji || '🏷️'}</span>
                        <span>{sub.name}:</span>
                        <strong className="font-cute">฿{formatCurrency(sub.balance)}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-white/50 flex items-baseline justify-between relative z-10">
                <span className="text-xs font-semibold text-pastel-cocoa/80">
                  {isEn ? 'Total Balance' : 'ยอดคงเหลือรวม'}
                </span>
                <span className="font-cute font-bold text-2xl text-pastel-cocoa">
                  ฿{formatCurrency(acc.balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pop-up Modal for Editing Account */}
      <CuteModal
        open={Boolean(editModalAcc)}
        title={isEn ? `Edit Account: ${editModalAcc?.name}` : `แก้ไขบัญชี: ${editModalAcc?.name}`}
        emoji="👛"
        onClose={() => setEditModalAcc(null)}
      >
        <form onSubmit={handleEditSubmit}>
          <AccountFormFields
            isEn={isEn}
            name={editName}
            setName={setEditName}
            accType={editType}
            setAccType={setEditType}
            balance={editBalance}
            setBalance={setEditBalance}
            color={editColor}
            setColor={setEditColor}
            emoji={editEmoji}
            setEmoji={setEditEmoji}
            note={editNote}
            setNote={setEditNote}
            hasSubAccounts={editHasSubs}
            setHasSubAccounts={setEditHasSubs}
            subAccounts={editSubs}
            setSubAccounts={setEditSubs}
            previewUrl={editPreviewUrl}
            onFileChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setEditCoverFile(f);
                setEditRemoveCover(false);
                setEditPreviewUrl(URL.createObjectURL(f));
              }
            }}
            onClearCover={() => {
              setEditCoverFile(null);
              setEditPreviewUrl(null);
              setEditRemoveCover(true);
              if (editFileRef.current) editFileRef.current.value = '';
            }}
            fileInputRef={editFileRef}
            accountTypeOptions={accountTypeOptions}
            submitLabel={isEn ? '💾 Save Changes' : '💾 บันทึกการแก้ไขบัญชี'}
            submitting={editSubmitting}
          />
        </form>
      </CuteModal>
    </div>
  );
}
