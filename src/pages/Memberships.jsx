import React, { useState } from 'react';
import { Zap, PauseCircle, XCircle, PlayCircle, Trash2, Edit3 } from 'lucide-react';
import {
  CUTE_EMOJIS,
  CartoonEmojiBadge,
  formatCurrency,
} from '../components/CuteStickers.jsx';
import CuteSelect from '../components/CuteSelect.jsx';
import CuteDatePicker from '../components/CuteDatePicker.jsx';
import CuteColorPicker from '../components/CuteColorPicker.jsx';
import CuteNoteEditor, { FormattedNote } from '../components/CuteNoteEditor.jsx';
import CuteModal from '../components/CuteModal.jsx';
import { useI18n } from '../i18n.jsx';

function MembershipFormFields({
  isEn,
  name,
  setName,
  amount,
  setAmount,
  cycleUnit,
  setCycleUnit,
  cycleInterval,
  setCycleInterval,
  accountId,
  setAccountId,
  categoryId,
  setCategoryId,
  shopId,
  setShopId,
  iconEmoji,
  setIconEmoji,
  color,
  setColor,
  nextBillingAt,
  setNextBillingAt,
  note,
  setNote,
  cycleUnitLabels,
  accountOptions,
  categoryOptions,
  shopOptions,
  submitLabel,
}) {
  return (
    <div className="space-y-3.5">
      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1">
          {isEn ? 'Service / Membership Name *' : 'ชื่อบริการ / Membership *'}
        </label>
        <input
          type="text"
          required
          placeholder={
            isEn
              ? 'e.g. YouTube Premium, Hourly Co-Working, Gym'
              : 'เช่น YouTube Premium, Co-Working รายชั่วโมง, ฟิตเนส'
          }
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1">
          {isEn
            ? 'Billing Cycle Unit (Hour / Day / Month / Year) *'
            : 'หน่วยรอบการหักเงิน (ชั่วโมง / วัน / เดือน / ปี) *'}
        </label>
        <div className="grid grid-cols-4 gap-1.5 bg-cream-100 p-1.5 rounded-2xl border border-cream-200">
          {[
            { id: 'hour', label: isEn ? '⏱️ Hour' : '⏱️ ชั่วโมง' },
            { id: 'day', label: isEn ? '☀️ Day' : '☀️ วัน' },
            { id: 'month', label: isEn ? '🌙 Month' : '🌙 เดือน' },
            { id: 'year', label: isEn ? '🎉 Year' : '🎉 ปี' },
          ].map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setCycleUnit(u.id)}
              className={`py-2 rounded-xl font-cute font-bold text-xs transition-all ${
                cycleUnit === u.id
                  ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border border-white'
                  : 'text-pastel-muted'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn ? 'Amount per Cycle (THB) *' : 'ยอดเงินที่หักต่อรอบ (บาท) *'}
          </label>
          <input
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn
              ? `Every how many ${cycleUnitLabels[cycleUnit]}`
              : `หักทุกๆ กี่${cycleUnitLabels[cycleUnit]}`}
          </label>
          <input
            type="number"
            min="1"
            value={cycleInterval}
            onChange={(e) => setCycleInterval(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn ? 'Charge Wallet' : 'ตัดเงินจากบัญชี'}
          </label>
          <CuteSelect
            value={accountId}
            onChange={(val) => setAccountId(val)}
            options={accountOptions}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn ? 'Category' : 'ประเภทหมวดหมู่'}
          </label>
          <CuteSelect
            value={categoryId}
            onChange={(val) => setCategoryId(val)}
            options={categoryOptions}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn ? 'Shop (Optional)' : 'ร้านค้า (ถ้ามี)'}
          </label>
          <CuteSelect value={shopId} onChange={(val) => setShopId(val)} options={shopOptions} />
        </div>

        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn ? 'Next Billing Date' : 'วันที่ตัดรอบถัดไป'}
          </label>
          <CuteDatePicker align="right" value={nextBillingAt} onChange={setNextBillingAt} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-pastel-cocoa">
          🎨 {isEn ? 'Color & App Emoji' : 'สีการ์ด & อีโมจิประจำแอป'}
        </label>
        <CuteColorPicker value={color} onChange={setColor} />
        <div className="flex flex-wrap gap-1.5 p-2 bg-cream-100 rounded-2xl border border-cream-200">
          {CUTE_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setIconEmoji(em)}
              className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-transform ${
                iconEmoji === em
                  ? 'bg-pastel-pink border-2 border-white shadow-sm scale-110'
                  : 'hover:bg-cream-200'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1">
          {isEn ? 'Note (Supports • bullets)' : 'โน้ตเพิ่มเติม (รองรับ • หัวข้อย่อย)'}
        </label>
        <CuteNoteEditor value={note} onChange={setNote} rows={2} />
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-2xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white"
      >
        {submitLabel}
      </button>
    </div>
  );
}

export default function Memberships({
  memberships,
  accounts,
  categories,
  shops,
  onRefresh,
}) {
  const { lang } = useI18n();
  const isEn = lang === 'en';
  const todayStr = new Date().toISOString().slice(0, 10);

  const cycleUnitLabels = {
    hour: isEn ? 'Hour(s)' : 'ชั่วโมง',
    day: isEn ? 'Day(s)' : 'วัน',
    month: isEn ? 'Month(s)' : 'เดือน',
    year: isEn ? 'Year(s)' : 'ปี',
  };

  // Create Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycleUnit, setCycleUnit] = useState('month');
  const [cycleInterval, setCycleInterval] = useState('1');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState('');
  const [shopId, setShopId] = useState('');
  const [iconEmoji, setIconEmoji] = useState('🎀');
  const [color, setColor] = useState('#FFD6E0');
  const [nextBillingAt, setNextBillingAt] = useState(todayStr);
  const [note, setNote] = useState('');
  const [hourUnitsMap, setHourUnitsMap] = useState({});

  // Edit Pop-up Modal State
  const [editModalMem, setEditModalMem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCycleUnit, setEditCycleUnit] = useState('month');
  const [editCycleInterval, setEditCycleInterval] = useState('1');
  const [editAccountId, setEditAccountId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editShopId, setEditShopId] = useState('');
  const [editEmoji, setEditEmoji] = useState('🎀');
  const [editColor, setEditColor] = useState('#FFD6E0');
  const [editNextBilling, setEditNextBilling] = useState(todayStr);
  const [editNote, setEditNote] = useState('');

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  function resetCreateForm() {
    setName('');
    setAmount('');
    setCycleUnit('month');
    setCycleInterval('1');
    setAccountId(accounts[0]?.id || '');
    setCategoryId('');
    setShopId('');
    setIconEmoji('🎀');
    setColor('#FFD6E0');
    setNextBillingAt(todayStr);
    setNote('');
  }

  function openEditModal(m) {
    setEditModalMem(m);
    setEditName(m.name);
    setEditAmount(String(m.amount || ''));
    setEditCycleUnit(m.cycle_unit || 'month');
    setEditCycleInterval(String(m.cycle_interval || 1));
    setEditAccountId(m.account_id ? String(m.account_id) : String(accounts[0]?.id || ''));
    setEditCategoryId(m.category_id ? String(m.category_id) : '');
    setEditShopId(m.shop_id ? String(m.shop_id) : '');
    setEditEmoji(m.icon_emoji || '🎀');
    setEditColor(m.color || '#FFD6E0');
    setEditNextBilling(m.next_billing_at || todayStr);
    setEditNote(m.note || '');
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    const payload = {
      name: name.trim(),
      amount: Number(amount),
      cycle_unit: cycleUnit,
      cycle_interval: Number(cycleInterval) || 1,
      account_id: accountId ? Number(accountId) : accounts[0]?.id,
      category_id: categoryId ? Number(categoryId) : null,
      shop_id: shopId ? Number(shopId) : null,
      icon_emoji: iconEmoji,
      color,
      next_billing_at: nextBillingAt,
      note,
    };

    const res = await fetch('/api/memberships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      resetCreateForm();
      await onRefresh();
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editModalMem || !editName.trim() || !editAmount) return;

    const payload = {
      name: editName.trim(),
      amount: Number(editAmount),
      cycle_unit: editCycleUnit,
      cycle_interval: Number(editCycleInterval) || 1,
      account_id: editAccountId ? Number(editAccountId) : accounts[0]?.id,
      category_id: editCategoryId ? Number(editCategoryId) : null,
      shop_id: editShopId ? Number(editShopId) : null,
      icon_emoji: editEmoji,
      color: editColor,
      next_billing_at: editNextBilling,
      note: editNote,
    };

    const res = await fetch(`/api/memberships/${editModalMem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setEditModalMem(null);
      await onRefresh();
    }
  }

  async function handleStatusChange(m, newStatus) {
    await fetch(`/api/memberships/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    await onRefresh();
  }

  async function handleChargeNow(m) {
    const mult = m.cycle_unit === 'hour' ? Number(hourUnitsMap[m.id] || 1) : 1;
    await fetch(`/api/memberships/${m.id}/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ units_multiplier: mult }),
    });
    await onRefresh();
  }

  async function handleDelete(id) {
    await fetch(`/api/memberships/${id}`, { method: 'DELETE' });
    if (editModalMem?.id === id) setEditModalMem(null);
    await onRefresh();
  }

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.emoji} ${a.name}`,
  }));

  const categoryOptions = [
    { value: '', label: isEn ? '-- Select Category --' : '-- เลือกหมวดหมู่ --' },
    ...expenseCategories.map((c) => ({
      value: c.id,
      label: `${c.icon_emoji} ${c.name}`,
    })),
  ];

  const shopOptions = [
    { value: '', label: isEn ? '-- No Shop --' : '-- ไม่ระบุร้านค้า --' },
    ...shops.map((s) => ({
      value: s.id,
      label: `${s.icon_emoji} ${s.name}`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <CartoonEmojiBadge emoji="🎀" color="#FFD6E0" size="lg" />
          <div>
            <h1 className="font-cute font-bold text-2xl text-pastel-cocoa">
              {isEn
                ? 'Memberships & Recurring Billing'
                : 'ระบบ Membership & บริการตัดเงินตามรอบ'}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Create Membership Form */}
        <div className="lg:col-span-5 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy h-fit">
          <h2 className="font-cute font-bold text-lg text-pastel-cocoa mb-4">
            {isEn ? '✨ Add New Membership' : '✨ เพิ่มรายการ Membership ใหม่'}
          </h2>

          <form onSubmit={handleCreateSubmit}>
            <MembershipFormFields
              isEn={isEn}
              name={name}
              setName={setName}
              amount={amount}
              setAmount={setAmount}
              cycleUnit={cycleUnit}
              setCycleUnit={setCycleUnit}
              cycleInterval={cycleInterval}
              setCycleInterval={setCycleInterval}
              accountId={accountId || accounts[0]?.id || ''}
              setAccountId={setAccountId}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              shopId={shopId}
              setShopId={setShopId}
              iconEmoji={iconEmoji}
              setIconEmoji={setIconEmoji}
              color={color}
              setColor={setColor}
              nextBillingAt={nextBillingAt}
              setNextBillingAt={setNextBillingAt}
              note={note}
              setNote={setNote}
              cycleUnitLabels={cycleUnitLabels}
              accountOptions={accountOptions}
              categoryOptions={categoryOptions}
              shopOptions={shopOptions}
              submitLabel={isEn ? '🎀 Add Membership' : '🎀 เพิ่มรายการ Membership'}
            />
          </form>
        </div>

        {/* Right: Memberships Cards */}
        <div className="lg:col-span-7 space-y-4">
          {memberships.map((m) => {
            const isActive = m.status === 'active';
            const isInactive = m.status === 'inactive';
            const isCancelled = m.status === 'cancelled';

            return (
              <div
                key={m.id}
                className={`bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy transition-opacity ${
                  !isActive ? 'opacity-75' : ''
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <CartoonEmojiBadge emoji={m.icon_emoji} color={m.color} size="lg" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-pastel-mint text-emerald-800'
                              : isInactive
                              ? 'bg-pastel-butter text-amber-800'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isActive
                            ? isEn
                              ? '✨ Active'
                              : '✨ ใช้งานอยู่ (Active)'
                            : isInactive
                            ? isEn
                              ? '⏸️ Unused / Paused'
                              : '⏸️ ไม่ได้ใช้แล้ว (พักไว้)'
                            : isEn
                            ? '🚫 Cancelled'
                            : '🚫 ยกเลิกแล้ว (Cancelled)'}
                        </span>
                        <span className="text-xs text-pastel-muted font-medium">
                          {isEn ? 'Every' : 'รอบการหัก: ทุกๆ'} {m.cycle_interval}{' '}
                          {cycleUnitLabels[m.cycle_unit] || m.cycle_unit}
                        </span>
                      </div>

                      <h3
                        className={`font-cute font-bold text-xl text-pastel-cocoa mt-1 ${
                          isCancelled ? 'line-through' : ''
                        }`}
                      >
                        {m.name}
                      </h3>

                      <p className="text-xs text-pastel-muted mt-0.5">
                        {isEn ? 'From:' : 'ตัดจาก:'} {m.account_emoji || '👛'}{' '}
                        {m.account_name || (isEn ? 'Unspecified' : 'ไม่ระบุ')}
                        {m.next_billing_at && isActive
                          ? ` • ${isEn ? 'Next:' : 'รอบถัดไป:'} ${m.next_billing_at}`
                          : ''}
                      </p>
                      <FormattedNote text={m.note} className="mt-1" />
                    </div>
                  </div>

                  <div className="text-right ml-auto">
                    <p className="font-cute font-bold text-2xl text-pastel-cocoa">
                      ฿{formatCurrency(m.amount)}
                      <span className="text-xs font-normal text-pastel-muted">
                        /{m.cycle_interval > 1 ? `${m.cycle_interval} ` : ''}
                        {cycleUnitLabels[m.cycle_unit] || m.cycle_unit}
                      </span>
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(m)}
                        className="p-1.5 rounded-xl bg-cream-100 hover:bg-pastel-pink/50 text-pastel-cocoa"
                        title={isEn ? 'Edit in Pop-up' : 'แก้ไขใน Pop-up'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-xl bg-cream-100 hover:bg-rose-100 text-rose-600"
                        title={isEn ? 'Delete' : 'ลบ'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-cream-200 flex flex-wrap items-center justify-between gap-2">
                  {isActive ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {m.cycle_unit === 'hour' && (
                        <div className="inline-flex items-center gap-1 bg-cream-100 px-2.5 py-1 rounded-xl border border-cream-300 text-xs">
                          <span>{isEn ? 'Hours:' : 'จำนวนชั่วโมง:'}</span>
                          <input
                            type="number"
                            min="1"
                            value={hourUnitsMap[m.id] ?? 1}
                            onChange={(e) =>
                              setHourUnitsMap({ ...hourUnitsMap, [m.id]: e.target.value })
                            }
                            className="w-12 text-center font-bold bg-white rounded-lg border border-cream-300 py-0.5"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleChargeNow(m)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-pastel-mint hover:bg-pastel-teal text-pastel-cocoa text-xs font-cute font-bold border border-white shadow-sm transition-transform hover:scale-105"
                      >
                        <Zap className="w-3.5 h-3.5" />{' '}
                        {isEn ? 'Deduct Charge Now' : 'หักยอดเข้าบัญชีตอนนี้'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(m, 'active')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-pastel-mint hover:bg-pastel-teal text-pastel-cocoa text-xs font-cute font-bold border border-white shadow-sm"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />{' '}
                      {isEn ? 'Reactivate' : 'กลับมาใช้งานอีกครั้ง'}
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {!isInactive && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(m, 'inactive')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pastel-butter hover:bg-amber-200 text-pastel-cocoa text-xs font-cute font-bold border border-white"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />{' '}
                        {isEn ? 'Mark Unused' : 'ไม่ได้ใช้แล้ว'}
                      </button>
                    )}

                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(m, 'cancelled')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-cute font-bold border border-white"
                      >
                        <XCircle className="w-3.5 h-3.5" />{' '}
                        {isEn ? 'Cancel Membership' : 'ยกเลิกสมาชิก'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pop-up Modal: Edit Membership */}
      <CuteModal
        open={Boolean(editModalMem)}
        title={isEn ? `Edit Membership: ${editModalMem?.name}` : `แก้ไข Membership: ${editModalMem?.name}`}
        emoji="🎀"
        onClose={() => setEditModalMem(null)}
      >
        <form onSubmit={handleEditSubmit}>
          <MembershipFormFields
            isEn={isEn}
            name={editName}
            setName={setEditName}
            amount={editAmount}
            setAmount={setEditAmount}
            cycleUnit={editCycleUnit}
            setCycleUnit={setEditCycleUnit}
            cycleInterval={editCycleInterval}
            setCycleInterval={setEditCycleInterval}
            accountId={editAccountId}
            setAccountId={setEditAccountId}
            categoryId={editCategoryId}
            setCategoryId={setEditCategoryId}
            shopId={editShopId}
            setShopId={setEditShopId}
            iconEmoji={editEmoji}
            setIconEmoji={setEditEmoji}
            color={editColor}
            setColor={setEditColor}
            nextBillingAt={editNextBilling}
            setNextBillingAt={setEditNextBilling}
            note={editNote}
            setNote={setEditNote}
            cycleUnitLabels={cycleUnitLabels}
            accountOptions={accountOptions}
            categoryOptions={categoryOptions}
            shopOptions={shopOptions}
            submitLabel={isEn ? '💾 Save Membership Changes' : '💾 บันทึกการแก้ไข Membership'}
          />
        </form>
      </CuteModal>
    </div>
  );
}
