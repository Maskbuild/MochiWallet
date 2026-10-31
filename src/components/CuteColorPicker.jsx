import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { PASTEL_PALETTE } from './CuteStickers.jsx';
import { useI18n } from '../i18n.jsx';

const EXTENDED_PASTEL_SWATCHES = [
  '#FFD6E0', '#FFACC7', '#FFCAD4', '#F4ACB7', '#FFE5EC', '#FFC2D1',
  '#D4F5E9', '#A8E6CF', '#B7E4C7', '#D8F3DC', '#E2F0CB', '#CCD5AE',
  '#D6ECFF', '#A9D6FF', '#BDE0FE', '#A2D2FF', '#CAF0F8', '#ADE8F4',
  '#E8DAFF', '#CDB4DB', '#DEC9E9', '#E0AAFF', '#F3D5B5', '#FFE0C8',
  '#FFF2B2', '#FDFFB6', '#FAEDCD', '#F9EFE2', '#E5E5E5', '#FFDAB9',
];

function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/**
 * Custom rounded pastel Color Picker with popover UI (no native OS color dialog)
 */
export default function CuteColorPicker({ value = '#FFD6E0', onChange }) {
  const { lang } = useI18n();
  const isEn = lang === 'en';
  const [open, setOpen] = useState(false);
  const [hue, setHue] = useState(340);
  const [lightness, setLightness] = useState(88);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function handleSliderChange(newH, newL) {
    setHue(newH);
    setLightness(newL);
    onChange(hslToHex(newH, 85, newL));
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        {PASTEL_PALETTE.map((p) => {
          const isSelected = value?.toUpperCase() === p.hex.toUpperCase();
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => onChange(p.hex)}
              style={{ backgroundColor: p.hex }}
              title={p.name}
              className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center ${
                isSelected
                  ? 'border-pastel-cocoa scale-110 shadow-sm'
                  : 'border-white hover:scale-105'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-pastel-cocoa" />}
            </button>
          );
        })}

        {/* Custom Pastel Color Popover Trigger */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 text-xs font-cute font-bold bg-cream-100 hover:bg-pastel-pink/50 px-3 py-1.5 rounded-2xl border border-cream-300 text-pastel-cocoa transition-colors"
        >
          <span
            style={{ backgroundColor: value }}
            className="w-4 h-4 rounded-full border border-pastel-cocoa/40 inline-block"
          />
          <Palette className="w-3.5 h-3.5" />
          <span>{isEn ? 'More Colors' : 'เลือกเฉดสีเอง'}</span>
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-2 left-0 w-72 bg-cream-50/95 backdrop-blur-md border-2 border-pastel-pink rounded-3xl shadow-cozy p-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-cream-200">
            <span className="font-cute font-bold text-xs text-pastel-cocoa">
              🎨 {isEn ? 'Pastel Color Studio' : 'ถาดผสมสีพาสเทล'}
            </span>
            <span
              style={{ backgroundColor: value }}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border border-white shadow-sm text-pastel-cocoa"
            >
              {value}
            </span>
          </div>

          {/* 30 Extended Macaron Swatches */}
          <div className="grid grid-cols-6 gap-1.5">
            {EXTENDED_PASTEL_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  onChange(hex);
                  setOpen(false);
                }}
                style={{ backgroundColor: hex }}
                className={`h-7 rounded-xl border-2 transition-transform hover:scale-110 ${
                  value?.toUpperCase() === hex.toUpperCase()
                    ? 'border-pastel-cocoa scale-105'
                    : 'border-white'
                }`}
              />
            ))}
          </div>

          {/* Custom Hue & Softness Sliders */}
          <div className="space-y-2 pt-2 border-t border-cream-200 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-pastel-muted mb-1">
                🌈 {isEn ? 'Color Tone (Hue)' : 'โทนสี (Hue)'}
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => handleSliderChange(Number(e.target.value), lightness)}
                className="w-full accent-pink-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-pastel-muted mb-1">
                ☁️ {isEn ? 'Pastel Softness' : 'ความละมุนพาสเทล'}
              </label>
              <input
                type="range"
                min="72"
                max="95"
                value={lightness}
                onChange={(e) => handleSliderChange(hue, Number(e.target.value))}
                className="w-full accent-pink-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-28 px-2.5 py-1 rounded-xl bg-cream-100 border border-cream-300 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1 rounded-xl bg-pastel-pink text-pastel-cocoa font-cute font-bold text-xs border border-white shadow-sm"
              >
                {isEn ? 'Done' : 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

