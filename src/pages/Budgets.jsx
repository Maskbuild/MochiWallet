import React, { useState } from 'react';
import { Trash2, Edit3 } from 'lucide-react';
import { CartoonEmojiBadge, formatCurrency } from '../components/CuteStickers.jsx';
import CuteSelect from '../components/CuteSelect.jsx';
import CuteDatePicker from '../components/CuteDatePicker.jsx';
import CuteColorPicker from '../components/CuteColorPicker.jsx';
import CuteModal from '../components/CuteModal.jsx';
import { useI18n } from '../i18n.jsx';

function BudgetFormFields({
  isEn,
  name,
  setName,
  budgetScope,
  setBudgetScope,
  periodType,
  setPeriodType,
  totalLimit,
  setTotalLimit,
  categoryId,
  setCategoryId,
  monthStr,
  setMonthStr,
  yearStr,
  setYearStr,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  color,
  setColor,
  iconEmoji,
  setIconEmoji,
  subAllocations,
  setSubAllocations,
  expenseCategories,
  expenseCatOptions,
  submitLabel,
  submitting,
}) {
  const mainLimitNum = Number(totalLimit) || 0;
  const subTotalLimit = subAllocations.reduce(
    (sum, s) => sum + (Number(s.limit_amount) || 0),
    0
  );
  const isOverMainLimit = budgetScope === 'overall' && mainLimitNum > 0 && subTotalLimit > mainLimitNum;
  const unallocatedLimit = Math.max(0, mainLimitNum - subTotalLimit);

  function addSubAllocationRow() {
    const firstCat = expenseCategories[0]?.id || '';
    setSubAllocations([...subAllocations, { category_id: firstCat, limit_amount: '' }]);
  }

  function updateSubRow(index, field, val) {
    const copy = [...subAllocations];
    copy[index] = { ...copy[index], [field]: val };
    setSubAllocations(copy);
  }

  function removeSubRow(index) {
    setSubAllocations(subAllocations.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3.5">
      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1">
          {isEn ? 'Budget Period *' : 'รูปแบบช่วงเวลางบประมาณ *'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-cream-100 p-1.5 rounded-2xl border border-cream-200">
          {[
            { id: 'recurring_monthly', label: isEn ? '🔄 Every Month' : '🔄 ทุกเดือน' },
            { id: 'recurring_yearly', label: isEn ? '🔄 Every Year' : '🔄 ทุกปี' },
            { id: 'monthly', label: isEn ? '🌙 Monthly' : '🌙 เฉพาะเดือน' },
            { id: 'yearly', label: isEn ? '🎉 Yearly' : '🎉 เฉพาะปี' },
            { id: 'trip', label: isEn ? '✈️ Trip / Range' : '✈️ ทริป/ช่วงเวลา' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriodType(tab.id)}
              className={`py-2 rounded-xl font-cute font-bold text-xs transition-all ${
                periodType === tab.id
                  ? 'bg-pastel-lavender text-pastel-cocoa shadow-sticker border border-white'
                  : 'text-pastel-muted hover:bg-cream-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1">
          {isEn ? 'Budget Scope *' : 'ลักษณะการคุมงบ *'}
        </label>
        <div className="grid grid-cols-2 gap-2 bg-cream-100 p-1.5 rounded-2xl border border-cream-200">
          <button
            type="button"
            onClick={() => setBudgetScope('overall')}
            className={`py-2 rounded-xl font-cute font-bold text-xs transition-all ${
              budgetScope === 'overall'
                ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border border-white'
                : 'text-pastel-muted'
            }`}
          >
            {isEn ? '🌸 Overall (+ Sub-budgets)' : '🌸 ตั้งงบรวม (+แบ่งหมวดย่อยได้)'}
          </button>
          <button
            type="button"
            onClick={() => setBudgetScope('category')}
            className={`py-2 rounded-xl font-cute font-bold text-xs transition-all ${
              budgetScope === 'category'
                ? 'bg-pastel-mint text-pastel-cocoa shadow-sticker border border-white'
                : 'text-pastel-muted'
            }`}
          >
            {isEn ? '🏷️ Single Category' : '🏷️ ตั้งงบเฉพาะหมวดหมู่เดียว'}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-pastel-cocoa mb-1">
          {isEn ? 'Budget / Trip Name *' : 'ชื่องบประมาณ หรือ ชื่อทริป *'}
        </label>
        <input
          type="text"
          required
          placeholder={
            periodType === 'trip'
              ? isEn
                ? 'e.g. Autumn Japan Trip 🍁'
                : 'เช่น ทริปเที่ยวญี่ปุ่นใบไม้เปลี่ยนสี 🍁'
              : isEn
              ? 'e.g. Monthly Living Budget, Cafe Limit'
              : 'เช่น งบใช้จ่ายประจำเดือน, งบค่าคาเฟ่'
          }
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn ? 'Total Limit (THB) *' : 'วงเงินงบประมาณ (บาท) *'}
          </label>
          <input
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={totalLimit}
            onChange={(e) => setTotalLimit(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-cream-100 border border-cream-300 text-sm font-bold"
          />
        </div>

        {periodType === 'recurring_monthly' && (
          <div className="bg-pastel-mint/30 p-2.5 rounded-2xl border border-pastel-mint text-xs text-pastel-cocoa flex items-center gap-2">
            <span className="text-base">🔄</span>
            <div>
              <p className="font-bold">{isEn ? 'Renews automatically every month' : 'งบประจำ ตัดรอบใหม่ทุกเดือน'}</p>
              <p className="text-[11px] text-pastel-muted">{isEn ? 'Counts expenses for the current active month automatically' : 'ระบบจะนับยอดใช้จ่ายของเดือนปัจจุบันให้อัตโนมัติในทุกๆ เดือน'}</p>
            </div>
          </div>
        )}

        {periodType === 'recurring_yearly' && (
          <div className="bg-pastel-butter/40 p-2.5 rounded-2xl border border-amber-300 text-xs text-pastel-cocoa flex items-center gap-2">
            <span className="text-base">🔄</span>
            <div>
              <p className="font-bold">{isEn ? 'Renews automatically every year' : 'งบประจำ ตัดรอบใหม่ทุกปี'}</p>
              <p className="text-[11px] text-pastel-muted">{isEn ? 'Counts expenses for the current active year automatically' : 'ระบบจะนับยอดใช้จ่ายของปีปัจจุบันให้อัตโนมัติในทุกๆ ปี'}</p>
            </div>
          </div>
        )}

        {periodType === 'monthly' && (
          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'Select Month *' : 'เลือกเดือน *'}
            </label>
            <CuteDatePicker
              mode="month"
              align="right"
              value={monthStr}
              onChange={setMonthStr}
            />
          </div>
        )}

        {periodType === 'yearly' && (
          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'Select Year *' : 'เลือกปี (ค.ศ.) *'}
            </label>
            <CuteSelect
              value={yearStr}
              onChange={setYearStr}
              options={['2024', '2025', '2026', '2027', '2028', '2029', '2030'].map((y) => ({
                value: y,
                label: `🎉 ${y}`,
              }))}
            />
          </div>
        )}
      </div>

      {periodType === 'trip' && (
        <div className="grid grid-cols-2 gap-3 bg-pastel-mint/30 p-3 rounded-2xl border border-pastel-mint">
          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'Start Date *' : 'วันเริ่มทริป/ช่วงเวลา *'}
            </label>
            <CuteDatePicker size="sm" value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <label className="block text-xs font-bold text-pastel-cocoa mb-1">
              {isEn ? 'End Date *' : 'วันสิ้นสุดทริป/ช่วงเวลา *'}
            </label>
            <CuteDatePicker size="sm" align="right" value={endDate} onChange={setEndDate} />
          </div>
        </div>
      )}

      {budgetScope === 'category' ? (
        <div>
          <label className="block text-xs font-bold text-pastel-cocoa mb-1">
            {isEn ? 'Target Category *' : 'เลือกประเภท / หมวดหมู่ที่ต้องการจำกัดงบ *'}
          </label>
          <CuteSelect
            value={categoryId}
            onChange={(val) => setCategoryId(val)}
            options={expenseCatOptions}
          />
        </div>
      ) : (
        <div className="bg-cream-100/90 border border-cream-300 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-cute font-bold text-pastel-cocoa">
              {isEn
                ? '🧩 Sub-Category Allocations (Optional)'
                : '🧩 แยกย่อยงบตามแต่ละประเภท (ไม่บังคับ)'}
            </span>
            <button
              type="button"
              onClick={addSubAllocationRow}
              className="text-xs font-bold px-2.5 py-1 rounded-xl bg-pastel-butter hover:bg-amber-200 text-pastel-cocoa border border-white shadow-sm"
            >
              {isEn ? '+ Add Sub-Category' : '+ เพิ่มหมวดย่อยในงบนี้'}
            </button>
          </div>

          {subAllocations.length === 0 ? (
            <p className="text-[11px] text-pastel-muted">
              {isEn
                ? 'Click "+ Add Sub-Category" to set sub-limits for specific categories inside this budget.'
                : 'สามารถกด "+ เพิ่มหมวดย่อยในงบนี้" เพื่อกำหนดวงเงินย่อยของแต่ละหมวดหมู่ภายใต้ก้อนใหญ่นี้ได้'}
            </p>
          ) : (
            <div className="space-y-2">
              {subAllocations.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <CuteSelect
                      size="sm"
                      value={row.category_id}
                      onChange={(val) => updateSubRow(idx, 'category_id', val)}
                      options={expenseCategories.map((c) => ({
                        value: c.id,
                        label: `${c.parent_id ? '↳ ' : ''}${c.icon_emoji} ${c.name}`,
                      }))}
                    />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={isEn ? 'Limit' : 'งบหมวดนี้'}
                    value={row.limit_amount}
                    onChange={(e) => updateSubRow(idx, 'limit_amount', e.target.value)}
                    className={`w-28 px-2.5 py-1.5 rounded-2xl bg-white border text-xs font-bold ${
                      isOverMainLimit ? 'border-rose-400 text-rose-600' : 'border-cream-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSubRow(idx)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Sub-allocations Balance Cap Summary & Validation */}
              <div
                className={`p-2.5 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-2 ${
                  isOverMainLimit
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                    : 'bg-white/80 border-cream-200 text-pastel-cocoa'
                }`}
              >
                <span>
                  {isEn ? 'Sub-budgets Total:' : 'รวมหมวดย่อย:'}{' '}
                  <strong>฿{formatCurrency(subTotalLimit)}</strong> / ฿
                  {formatCurrency(mainLimitNum)}
                </span>
                {isOverMainLimit ? (
                  <span>
                    ⚠️{' '}
                    {isEn
                      ? 'Sub-categories total cannot exceed main budget limit!'
                      : 'ยอดรวมหมวดย่อยห้ามเกินวงเงินงบประมาณหลัก!'}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold">
                    {isEn ? 'Unallocated:' : 'คงเหลืองบส่วนกลาง:'} ฿
                    {formatCurrency(unallocatedLimit)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Pastel Color Picker & Emoji */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-pastel-cocoa">
          {isEn ? '🎨 Budget Card Color & Icon' : '🎨 สีการ์ดงบประมาณ & ไอคอน'}
        </label>
        <CuteColorPicker value={color} onChange={setColor} />
        <div className="flex items-center gap-1 pt-1">
          {['🎯', '🌸', '✈️', '🏕️', '🧁', '🛍️', '🍱'].map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setIconEmoji(em)}
              className={`w-8 h-8 rounded-xl text-base ${
                iconEmoji === em ? 'bg-pastel-pink border-2 border-white shadow-sm' : 'hover:bg-cream-200'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isOverMainLimit || submitting}
        className="w-full py-3 rounded-2xl bg-pastel-lavender hover:bg-pastel-purple text-pastel-cocoa font-cute font-bold text-sm shadow-sticker border-2 border-white transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (isEn ? 'Saving...' : 'กำลังบันทึก...') : submitLabel}
      </button>
    </div>
  );
}

export default function Budgets({ budgets, categories, onRefresh }) {
  const { lang } = useI18n();
  const isEn = lang === 'en';

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonth = todayStr.slice(0, 7);
  const currentYear = todayStr.slice(0, 4);

  // Create Form State
  const [name, setName] = useState('');
  const [budgetScope, setBudgetScope] = useState('overall');
  const [periodType, setPeriodType] = useState('monthly');
  const [totalLimit, setTotalLimit] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [monthStr, setMonthStr] = useState(currentMonth);
  const [yearStr, setYearStr] = useState(currentYear);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [color, setColor] = useState('#FFD6E0');
  const [iconEmoji, setIconEmoji] = useState('🎯');
  const [subAllocations, setSubAllocations] = useState([]);

  // Edit Pop-up Modal State
  const [editModalBudget, setEditModalBudget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editScope, setEditScope] = useState('overall');
  const [editPeriod, setEditPeriod] = useState('monthly');
  const [editLimit, setEditLimit] = useState('');
  const [editCatId, setEditCatId] = useState('');
  const [editMonthStr, setEditMonthStr] = useState(currentMonth);
  const [editYearStr, setEditYearStr] = useState(currentYear);
  const [editStartDate, setEditStartDate] = useState(todayStr);
  const [editEndDate, setEditEndDate] = useState(todayStr);
  const [editColor, setEditColor] = useState('#FFD6E0');
  const [editEmoji, setEditEmoji] = useState('🎯');
  const [editSubs, setEditSubs] = useState([]);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const expenseCatOptions = [
    { value: '', label: isEn ? '-- Select Category --' : '-- เลือกหมวดหมู่ --' },
    ...expenseCategories.map((c) => ({
      value: c.id,
      label: `${c.parent_id ? '↳ ' : ''}${c.icon_emoji} ${c.name}`,
    })),
  ];

  function resetCreateForm() {
    setName('');
    setBudgetScope('overall');
    setPeriodType('monthly');
    setTotalLimit('');
    setCategoryId('');
    setMonthStr(currentMonth);
    setYearStr(currentYear);
    setStartDate(todayStr);
    setEndDate(todayStr);
    setColor('#FFD6E0');
    setIconEmoji('🎯');
    setSubAllocations([]);
  }

  function openEditModal(b) {
    setEditModalBudget(b);
    setEditName(b.name);
    setEditScope(b.budget_scope || 'overall');
    setEditPeriod(b.period_type || 'monthly');
    setEditLimit(String(b.total_limit || ''));
    setEditCatId(b.category_id ? String(b.category_id) : '');
    setEditMonthStr(b.month_str || currentMonth);
    setEditYearStr(b.year_str || currentYear);
    setEditStartDate(b.start_date || todayStr);
    setEditEndDate(b.end_date || todayStr);
    setEditColor(b.color || '#FFD6E0');
    setEditEmoji(b.icon_emoji || '🎯');
    try {
      setEditSubs(JSON.parse(b.sub_allocations || '[]'));
    } catch {
      setEditSubs([]);
    }
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !totalLimit) return;

    const cleanSubs = subAllocations
      .filter((s) => s.category_id && Number(s.limit_amount) > 0)
      .map((s) => ({
        category_id: Number(s.category_id),
        limit_amount: Number(s.limit_amount),
      }));

    const payload = {
      name: name.trim(),
      budget_scope: budgetScope,
      period_type: periodType,
      total_limit: Number(totalLimit),
      category_id: budgetScope === 'category' && categoryId ? Number(categoryId) : null,
      month_str: monthStr,
      year_str: yearStr,
      start_date: startDate,
      end_date: endDate,
      color,
      icon_emoji: iconEmoji,
      sub_allocations: cleanSubs,
    };

    const res = await fetch('/api/budgets', {
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
    if (!editModalBudget || !editName.trim() || !editLimit) return;

    const cleanSubs = editSubs
      .filter((s) => s.category_id && Number(s.limit_amount) > 0)
      .map((s) => ({
        category_id: Number(s.category_id),
        limit_amount: Number(s.limit_amount),
      }));

    const payload = {
      name: editName.trim(),
      budget_scope: editScope,
      period_type: editPeriod,
      total_limit: Number(editLimit),
      category_id: editScope === 'category' && editCatId ? Number(editCatId) : null,
      month_str: editMonthStr,
      year_str: editYearStr,
      start_date: editStartDate,
      end_date: editEndDate,
      color: editColor,
      icon_emoji: editEmoji,
      sub_allocations: cleanSubs,
    };

    const res = await fetch(`/api/budgets/${editModalBudget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setEditModalBudget(null);
      await onRefresh();
    }
  }

  async function handleDelete(id) {
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    if (editModalBudget?.id === id) setEditModalBudget(null);
    await onRefresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <CartoonEmojiBadge emoji="🎯" color="#E8DAFF" size="lg" />
          <div>
            <h1 className="font-cute font-bold text-2xl text-pastel-cocoa">
              {isEn
                ? 'Budgets & Trip Expense Limits'
                : 'ตั้งงบประมาณ (Budget) & งบทริปท่องเที่ยว'}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Create Form */}
        <div className="lg:col-span-5 bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy h-fit">
          <h2 className="font-cute font-bold text-lg text-pastel-cocoa mb-4">
            {isEn ? '✨ Create Budget / Trip' : '✨ สร้างงบประมาณ / ทริปใหม่'}
          </h2>

          <form onSubmit={handleCreateSubmit}>
            <BudgetFormFields
              isEn={isEn}
              name={name}
              setName={setName}
              budgetScope={budgetScope}
              setBudgetScope={setBudgetScope}
              periodType={periodType}
              setPeriodType={setPeriodType}
              totalLimit={totalLimit}
              setTotalLimit={setTotalLimit}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              monthStr={monthStr}
              setMonthStr={setMonthStr}
              yearStr={yearStr}
              setYearStr={setYearStr}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              color={color}
              setColor={setColor}
              iconEmoji={iconEmoji}
              setIconEmoji={setIconEmoji}
              subAllocations={subAllocations}
              setSubAllocations={setSubAllocations}
              expenseCategories={expenseCategories}
              expenseCatOptions={expenseCatOptions}
              submitLabel={isEn ? '🎯 Save Budget' : '🎯 บันทึกงบประมาณ'}
            />
          </form>
        </div>

        {/* Right: Budgets List */}
        <div className="lg:col-span-7 space-y-4">
          {budgets.map((b) => {
            const pct = b.total_limit > 0 ? Math.round((b.spent / b.total_limit) * 100) : 0;
            const isOver = b.spent > b.total_limit;
            const remaining = b.total_limit - b.spent;

            return (
              <div
                key={b.id}
                className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <CartoonEmojiBadge emoji={b.icon_emoji} color={b.color} size="lg" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cream-200 text-pastel-cocoa">
                          {b.period_type === 'recurring_monthly'
                            ? `🔄 ${isEn ? 'Every Month' : 'ทุกเดือน'}`
                            : b.period_type === 'recurring_yearly'
                            ? `🔄 ${isEn ? 'Every Year' : 'ทุกปี'}`
                            : b.period_type === 'monthly'
                            ? `🌙 ${isEn ? 'Monthly' : 'เฉพาะเดือน'} (${b.month_str})`
                            : b.period_type === 'yearly'
                            ? `🎉 ${isEn ? 'Yearly' : 'เฉพาะปี'} (${b.year_str})`
                            : `✈️ ${isEn ? 'Trip' : 'ทริป'} (${b.start_date} - ${b.end_date})`}
                        </span>
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-pastel-butter/70 text-pastel-cocoa">
                          {b.budget_scope === 'category'
                            ? `${isEn ? 'Category:' : 'เฉพาะหมวด:'} ${b.category_emoji || ''} ${b.category_name || ''}`
                            : isEn
                            ? 'Overall Budget'
                            : 'งบรวม'}
                        </span>
                      </div>
                      <h3 className="font-cute font-bold text-xl text-pastel-cocoa mt-1">
                        {b.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      className="p-2 rounded-xl bg-cream-100 hover:bg-pastel-pink/50 text-pastel-cocoa"
                      title={isEn ? 'Edit in Pop-up' : 'แก้ไขงบประมาณ (Pop-up)'}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      className="p-2 rounded-xl bg-cream-100 hover:bg-rose-100 text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-pastel-muted">
                      {isEn ? 'Spent ' : 'ใช้ไปแล้ว '}
                      <strong className="text-pastel-cocoa">฿{formatCurrency(b.spent)}</strong>
                      {isEn ? ' of ' : ' จากงบทั้งหมด '}
                      <strong className="text-pastel-cocoa">฿{formatCurrency(b.total_limit)}</strong>
                    </span>
                    <span
                      className={`font-cute font-bold text-sm ${
                        isOver ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {isOver
                        ? `⚠️ ${isEn ? 'Over budget by' : 'เกินงบ'} ฿${formatCurrency(Math.abs(remaining))}`
                        : `${isEn ? 'Remaining' : 'เหลือใช้ได้'} ฿${formatCurrency(remaining)} (${pct}%)`}
                    </span>
                  </div>

                  <div className="w-full h-4 bg-cream-100 rounded-full overflow-hidden border border-cream-300 p-0.5">
                    <div
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: isOver ? '#FB7185' : b.color,
                      }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>

                {b.sub_breakdown && b.sub_breakdown.length > 0 && (
                  <div className="pt-3 border-t border-cream-200 space-y-2">
                    <p className="text-xs font-cute font-bold text-pastel-cocoa">
                      {isEn
                        ? '🧩 Sub-Category Breakdown:'
                        : '🧩 งบแยกย่อยตามแต่ละประเภทในก้อนนี้:'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {b.sub_breakdown.map((sub, sIdx) => {
                        const subPct =
                          sub.limit_amount > 0
                            ? Math.round((sub.spent / sub.limit_amount) * 100)
                            : 0;
                        const subOver = sub.spent > sub.limit_amount;
                        return (
                          <div
                            key={sIdx}
                            className="bg-cream-100/90 rounded-2xl p-3 border border-cream-200 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-cute font-bold text-pastel-cocoa">
                                {sub.category_emoji} {sub.category_name}
                              </span>
                              <span
                                className={`font-bold ${
                                  subOver ? 'text-rose-600' : 'text-pastel-cocoa'
                                }`}
                              >
                                ฿{formatCurrency(sub.spent)} / ฿{formatCurrency(sub.limit_amount)}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-white rounded-full overflow-hidden">
                              <div
                                style={{
                                  width: `${Math.min(100, subPct)}%`,
                                  backgroundColor: subOver ? '#FB7185' : sub.category_color,
                                }}
                                className="h-full rounded-full"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pop-up Modal for Editing Budget */}
      <CuteModal
        open={Boolean(editModalBudget)}
        title={isEn ? `Edit Budget: ${editModalBudget?.name}` : `แก้ไขงบประมาณ: ${editModalBudget?.name}`}
        emoji="🎯"
        onClose={() => setEditModalBudget(null)}
      >
        <form onSubmit={handleEditSubmit}>
          <BudgetFormFields
            isEn={isEn}
            name={editName}
            setName={setEditName}
            budgetScope={editScope}
            setBudgetScope={setEditScope}
            periodType={editPeriod}
            setPeriodType={setEditPeriod}
            totalLimit={editLimit}
            setTotalLimit={setEditLimit}
            categoryId={editCatId}
            setCategoryId={setEditCatId}
            monthStr={editMonthStr}
            setMonthStr={setEditMonthStr}
            yearStr={editYearStr}
            setYearStr={setEditYearStr}
            startDate={editStartDate}
            setStartDate={setEditStartDate}
            endDate={editEndDate}
            setEndDate={setEditEndDate}
            color={editColor}
            setColor={setEditColor}
            iconEmoji={editEmoji}
            setIconEmoji={setEditEmoji}
            subAllocations={editSubs}
            setSubAllocations={setEditSubs}
            expenseCategories={expenseCategories}
            expenseCatOptions={expenseCatOptions}
            submitLabel={isEn ? '💾 Save Budget Changes' : '💾 บันทึกการแก้ไขงบประมาณ'}
          />
        </form>
      </CuteModal>
    </div>
  );
}
