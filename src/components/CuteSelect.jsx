import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom ultra-rounded pastel dropdown to replace native OS <select>
 * Supports options: [{ value: string|number, label: string }]
 */
export default function CuteSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- เลือก --',
  className = '',
  size = 'md',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs rounded-2xl'
      : 'px-3.5 py-2.5 text-sm rounded-2xl';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-cream-100 hover:bg-cream-200/70 border border-cream-300 text-pastel-cocoa font-medium transition-all focus:outline-none focus:ring-2 focus:ring-pastel-pink ${sizeClasses} ${
          open ? 'ring-2 ring-pastel-pink bg-white border-pastel-pink' : ''
        }`}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-pastel-muted shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-pastel-cocoa' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-cream-50/95 backdrop-blur-md border-2 border-pastel-pink rounded-3xl shadow-cozy p-2 max-h-64 overflow-y-auto no-scrollbar animate-fadeIn">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-pastel-muted text-center">
              ไม่มีตัวเลือก
            </div>
          ) : (
            <div className="space-y-1">
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl text-left text-xs sm:text-sm transition-all ${
                      isSelected
                        ? 'bg-pastel-pink text-pastel-cocoa font-cute font-bold shadow-sm'
                        : 'text-pastel-cocoa hover:bg-cream-200/80'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-pastel-cocoa" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

