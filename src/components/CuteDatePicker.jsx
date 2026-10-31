import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n.jsx';

const MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const MONTHS_SHORT_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Custom rounded pastel Date & Month Picker to replace native OS <input type="date"> and <input type="month">
 * mode: 'date' (YYYY-MM-DD) | 'month' (YYYY-MM)
 */
export default function CuteDatePicker({
  value,
  onChange,
  mode = 'date',
  size = 'md',
  className = '',
  align = 'left',
}) {
  const { lang } = useI18n();
  const isEn = lang === 'en';
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const today = new Date();
  const initialDate = value
    ? new Date(mode === 'month' ? `${value}-01T00:00:00` : `${value}T00:00:00`)
    : today;

  const [viewYear, setViewYear] = useState(
    !isNaN(initialDate.getTime()) ? initialDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    !isNaN(initialDate.getTime()) ? initialDate.getMonth() : today.getMonth()
  );

  useEffect(() => {
    if (value) {
      const d = new Date(mode === 'month' ? `${value}-01T00:00:00` : `${value}T00:00:00`);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value, mode]);

  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const monthNames = isEn ? MONTHS_EN : MONTHS_TH;
  const monthShort = isEn ? MONTHS_SHORT_EN : MONTHS_SHORT_TH;
  const dayNames = isEn ? DAYS_EN : DAYS_TH;

  function formatDisplay() {
    if (!value) return isEn ? 'Select Date' : 'เลือกวันที่';
    if (mode === 'month') {
      const [y, m] = value.split('-');
      const mIdx = parseInt(m, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${monthNames[mIdx]} ${y}`;
      }
      return value;
    }
    const [y, m, d] = value.split('-');
    const mIdx = parseInt(m, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${parseInt(d, 10)} ${monthShort[mIdx]} ${y}`;
    }
    return value;
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDay(dayNum) {
    const yyyy = viewYear;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  }

  function selectMonth(mIdx) {
    const yyyy = viewYear;
    const mm = String(mIdx + 1).padStart(2, '0');
    onChange(`${yyyy}-${mm}`);
    setOpen(false);
  }

  function selectToday() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setViewYear(yyyy);
    setViewMonth(now.getMonth());
    if (mode === 'month') {
      onChange(`${yyyy}-${mm}`);
    } else {
      onChange(`${yyyy}-${mm}-${dd}`);
    }
    setOpen(false);
  }

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs rounded-2xl'
      : 'px-3.5 py-2.5 text-sm rounded-2xl';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 bg-cream-100 hover:bg-cream-200/70 border border-cream-300 text-pastel-cocoa font-medium transition-all focus:outline-none focus:ring-2 focus:ring-pastel-pink ${sizeClasses} ${
          open ? 'ring-2 ring-pastel-pink bg-white border-pastel-pink' : ''
        }`}
      >
        <span className="truncate">{formatDisplay()}</span>
        <Calendar className="w-4 h-4 text-pastel-muted shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-72 bg-cream-50/95 backdrop-blur-md border-2 border-pastel-pink rounded-3xl shadow-cozy p-4 animate-fadeIn ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-cream-200">
            <button
              type="button"
              onClick={() => (mode === 'month' ? setViewYear((y) => y - 1) : prevMonth())}
              className="p-1.5 rounded-xl bg-cream-100 hover:bg-pastel-pink/60 text-pastel-cocoa transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-cute font-bold text-sm text-pastel-cocoa">
              {mode === 'month' ? `${viewYear}` : `${monthNames[viewMonth]} ${viewYear}`}
            </div>
            <button
              type="button"
              onClick={() => (mode === 'month' ? setViewYear((y) => y + 1) : nextMonth())}
              className="p-1.5 rounded-xl bg-cream-100 hover:bg-pastel-pink/60 text-pastel-cocoa transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {mode === 'month' ? (
            <div className="grid grid-cols-3 gap-2">
              {monthShort.map((mLbl, idx) => {
                const candidate = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
                const isSelected = value === candidate;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectMonth(idx)}
                    className={`py-2 rounded-2xl text-xs font-cute font-bold transition-all ${
                      isSelected
                        ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border border-white'
                        : 'bg-cream-100 hover:bg-cream-200 text-pastel-cocoa'
                    }`}
                  >
                    {mLbl}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-pastel-muted mb-1">
                {dayNames.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((dayNum, idx) => {
                  if (!dayNum) return <div key={idx} className="h-8" />;
                  const candidate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
                    dayNum
                  ).padStart(2, '0')}`;
                  const isSelected = value === candidate;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectDay(dayNum)}
                      className={`h-8 rounded-xl text-xs font-cute font-bold flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-pastel-pink text-pastel-cocoa shadow-sticker border border-white scale-105'
                          : 'hover:bg-pastel-pink/40 text-pastel-cocoa'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-3 pt-2.5 border-t border-cream-200 flex items-center justify-between">
            <button
              type="button"
              onClick={selectToday}
              className="text-xs font-cute font-bold px-3 py-1 rounded-xl bg-pastel-mint hover:bg-pastel-teal text-pastel-cocoa border border-white shadow-sm"
            >
              ✨ {isEn ? 'Today' : 'วันนี้'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-pastel-muted hover:text-pastel-cocoa px-2 py-1"
            >
              {isEn ? 'Close' : 'ปิด'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

