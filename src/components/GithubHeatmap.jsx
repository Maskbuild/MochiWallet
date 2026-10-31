import React, { useMemo, useState } from 'react';
import { useI18n } from '../i18n.jsx';

const MONTH_NAMES_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GithubHeatmap({ dailyData = [] }) {
  const { lang, t } = useI18n();
  const [hoveredCell, setHoveredCell] = useState(null);

  const monthNames = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_TH;
  const dayLabels = lang === 'en' ? DAY_LABELS_EN : DAY_LABELS_TH;

  const { weeks, monthHeaders, totalActions, activeDaysCount, currentStreak, maxCount } = useMemo(() => {
    const map = {};
    let total = 0;
    let maxVal = 0;
    for (const item of dailyData) {
      map[item.activity_date] = item;
      const cnt = Number(item.total_count || 0);
      total += cnt;
      if (cnt > maxVal) maxVal = cnt;
    }

    const today = new Date();
    const numWeeks = 52;
    const totalDays = numWeeks * 7;

    const endDay = new Date(today);
    const dayOfWeek = endDay.getDay();
    endDay.setDate(endDay.getDate() + (6 - dayOfWeek));

    const startDay = new Date(endDay);
    startDay.setDate(endDay.getDate() - totalDays + 1);

    const weeksArr = [];
    const headers = [];
    let lastMonth = -1;

    const cursor = new Date(startDay);
    for (let w = 0; w < numWeeks; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const yyyy = cursor.getFullYear();
        const mm = String(cursor.getMonth() + 1).padStart(2, '0');
        const dd = String(cursor.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const record = map[dateStr] || {
          activity_date: dateStr,
          total_count: 0,
          tx_count: 0,
          transfer_count: 0,
          account_count: 0,
        };

        if (d === 0 && cursor.getMonth() !== lastMonth) {
          headers.push({ weekIndex: w, label: monthNames[cursor.getMonth()] });
          lastMonth = cursor.getMonth();
        }

        week.push({
          date: dateStr,
          isFuture: cursor > today,
          ...record,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeksArr.push(week);
    }

    let streak = 0;
    const checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const yyyy = checkDate.getFullYear();
      const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
      const dd = String(checkDate.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      if (map[key] && map[key].total_count > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      weeks: weeksArr,
      monthHeaders: headers,
      totalActions: total,
      activeDaysCount: Object.keys(map).length,
      currentStreak: streak,
      maxCount: Math.max(1, maxVal),
    };
  }, [dailyData, monthNames]);

  function getCellColor(count, isFuture) {
    if (isFuture) return 'bg-cream-100/40 border-transparent';
    if (!count || count <= 0) return 'bg-cream-200/80 border-cream-300/60';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'bg-[#D8F3DC] border-[#B7E4C7]';
    if (ratio <= 0.50) return 'bg-[#95D5B2] border-[#74C69D]';
    if (ratio <= 0.75) return 'bg-[#FFCAD4] border-[#F4ACB7]';
    return 'bg-[#FF8FA3] border-[#FF758F]';
  }

  return (
    <div className="bg-cream-50 border-2 border-white rounded-3xl p-5 shadow-cozy relative">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-pastel-mint flex items-center justify-center text-2xl shadow-sticker border-2 border-white">
            🌱
          </div>
          <div>
            <h3 className="font-cute font-bold text-lg text-pastel-cocoa flex items-center gap-2">
              {t('heatmapTitle')}
            </h3>
            <p className="text-xs text-pastel-muted">{t('heatmapDesc')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <div className="px-3 py-1.5 rounded-2xl bg-pastel-butter/70 border border-white font-medium">
            ✨ {t('heatmapTotal')} <span className="font-bold text-pastel-cocoa">{totalActions}</span>{' '}
            {t('heatmapActivities')}
          </div>
          <div className="px-3 py-1.5 rounded-2xl bg-pastel-pink/60 border border-white font-medium">
            🗓️ {t('heatmapActiveDays')}{' '}
            <span className="font-bold text-pastel-cocoa">{activeDaysCount}</span> {t('heatmapDays')}
          </div>
          <div className="px-3 py-1.5 rounded-2xl bg-pastel-mint/70 border border-white font-medium">
            🔥 {t('heatmapStreak')}{' '}
            <span className="font-bold text-pastel-cocoa">{currentStreak}</span> {t('heatmapDays')}
          </div>
        </div>
      </div>

      {/* GitHub Grid without visible scrollbar */}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex ml-8 mb-1 text-[11px] text-pastel-muted relative h-4">
            {monthHeaders.map((m, idx) => (
              <span
                key={idx}
                style={{ left: `${m.weekIndex * 15}px` }}
                className="absolute whitespace-nowrap font-medium"
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex items-start gap-1.5">
            <div className="grid grid-rows-7 gap-[3px] text-[10px] text-pastel-muted pr-1 leading-[12px]">
              {dayLabels.map((lbl, i) => (
                <span key={i} className={i % 2 === 1 ? 'opacity-100' : 'opacity-40'}>
                  {lbl}
                </span>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-rows-7 gap-[3px]">
                  {week.map((cell) => (
                    <div
                      key={cell.date}
                      onMouseEnter={() => !cell.isFuture && setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`w-[12px] h-[12px] rounded-[3.5px] border transition-transform hover:scale-125 cursor-pointer ${getCellColor(
                        cell.total_count,
                        cell.isFuture
                      )}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legend with explicit count levels + Live Tooltip */}
      <div className="mt-3 pt-3 border-t border-cream-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-pastel-cocoa min-h-[20px] flex items-center gap-2">
          {hoveredCell ? (
            <span className="inline-flex flex-wrap items-center gap-2 bg-cream-100 px-3 py-1 rounded-xl border border-cream-300">
              <span className="font-semibold">📅 {hoveredCell.date}:</span>
              {hoveredCell.total_count === 0 ? (
                <span className="text-pastel-muted">{t('heatmapNoActivity')}</span>
              ) : (
                <>
                  <span className="font-bold text-pink-600">
                    {lang === 'en' ? `Total ${hoveredCell.total_count}` : `รวม ${hoveredCell.total_count} ครั้ง`}
                  </span>
                  <span>
                    (💸 {lang === 'en' ? 'Income/Exp' : 'รายรับ/จ่าย'} {hoveredCell.tx_count || 0}
                  </span>
                  <span>
                    • 🔄 {lang === 'en' ? 'Transfer' : 'โอนเงิน'} {hoveredCell.transfer_count || 0}
                  </span>
                  <span>
                    • 👛 {lang === 'en' ? 'New Wallet' : 'เปิดบัญชี'} {hoveredCell.account_count || 0})
                  </span>
                </>
              )}
            </span>
          ) : (
            <span className="text-pastel-muted">{t('heatmapHoverHint')}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-pastel-muted ml-auto">
          <span className="font-semibold text-pastel-cocoa bg-cream-100 px-2 py-0.5 rounded-lg border border-cream-200">
            🏆 {lang === 'en' ? `Max/day: ${maxCount}` : `สูงสุดต่อวัน: ${maxCount} ครั้ง`}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-cream-200/80 border border-cream-300/60 inline-block" />
            <span>0</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-[#D8F3DC] border border-[#B7E4C7] inline-block" />
            <span>≤25%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-[#95D5B2] border border-[#74C69D] inline-block" />
            <span>≤50%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-[#FFCAD4] border border-[#F4ACB7] inline-block" />
            <span>≤75%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-[#FF8FA3] border border-[#FF758F] inline-block" />
            <span>76-100% 🌸</span>
          </span>
        </div>
      </div>
    </div>
  );
}
