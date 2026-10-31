import React from 'react';

export const PASTEL_PALETTE = [
  { name: 'ชมพูพีชพาสเทล', hex: '#FFD6E0' },
  { name: 'มิ้นต์สดใส', hex: '#D4F5E9' },
  { name: 'ฟ้าปุยเมฆ', hex: '#D6ECFF' },
  { name: 'ม่วงลาเวนเดอร์', hex: '#E8DAFF' },
  { name: 'เหลืองเนยคัสตาร์ด', hex: '#FFF2B2' },
  { name: 'ส้มพีชละมุน', hex: '#FFE0C8' },
  { name: 'เขียวชาเขียวมัทฉะ', hex: '#E2F0CB' },
  { name: 'ชมพูซากุระ', hex: '#FFDFEA' },
  { name: 'ครีมนมสด', hex: '#F9EFE2' },
];

export const CUTE_EMOJIS = [
  '👛', '🐷', '🏦', '💳', '🪙', '💎', '🍡', '🧁', '🍱', '🍜',
  '🍵', '🧋', '🍓', '🥐', '🛍️', '🎀', '🧸', '🎮', '🎬', '🎵',
  '✈️', '🏕️', '🚌', '🚆', '🚗', '🏠', '💡', '💊', '🐾', '🌸',
  '✨', '💰', '🎁', '🏪', '📦', '☁️', '💻', '📚'
];

// Cute Sticker Emoji Badge that gives any emoji a 3D cartoon sticker look
export function CartoonEmojiBadge({ emoji = '🍡', color = '#FFD6E0', image = null, size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-9 h-9 text-lg rounded-xl',
    md: 'w-12 h-12 text-2xl rounded-2xl',
    lg: 'w-16 h-16 text-3xl rounded-3xl',
    xl: 'w-20 h-20 text-4xl rounded-3xl',
  }[size] || 'w-12 h-12 text-2xl rounded-2xl';

  return (
    <div
      style={{ backgroundColor: color }}
      className={`relative inline-flex items-center justify-center border-2 border-white shadow-sticker select-none shrink-0 overflow-hidden transition-transform hover:scale-105 ${sizeClasses} ${className}`}
    >
      <div className="absolute inset-x-1 top-0.5 h-1.5 bg-white/40 rounded-full pointer-events-none" />
      {image ? (
        <img
          src={image}
          alt="icon"
          className="w-full h-full object-contain p-1 drop-shadow-sm"
        />
      ) : (
        <span className="drop-shadow-[0_2px_1px_rgba(92,75,81,0.18)] leading-none">
          {emoji}
        </span>
      )}
    </div>
  );
}

// Cute Mochi Bunny Mascot SVG for headers and empty states
export function MochiMascot({ mood = 'happy', className = 'w-16 h-16' }) {
  return (
    <svg viewBox="0 0 120 120" className={`animate-float ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bunny Ears */}
      <ellipse cx="42" cy="30" rx="11" ry="24" transform="rotate(-12 42 30)" fill="#FFFDF9" stroke="#5C4B51" strokeWidth="3.5" />
      <ellipse cx="42" cy="31" rx="5.5" ry="15" transform="rotate(-12 42 31)" fill="#FFD6E0" />
      <ellipse cx="78" cy="30" rx="11" ry="24" transform="rotate(12 78 30)" fill="#FFFDF9" stroke="#5C4B51" strokeWidth="3.5" />
      <ellipse cx="78" cy="31" rx="5.5" ry="15" transform="rotate(12 78 31)" fill="#FFD6E0" />

      {/* Mochi Body */}
      <rect x="20" y="42" width="80" height="62" rx="31" fill="#FFFDF9" stroke="#5C4B51" strokeWidth="3.5" />

      {/* Blush Cheeks */}
      <ellipse cx="36" cy="74" rx="7" ry="4.5" fill="#FFACC7" opacity="0.75" />
      <ellipse cx="84" cy="74" rx="7" ry="4.5" fill="#FFACC7" opacity="0.75" />

      {/* Eyes */}
      {mood === 'wink' ? (
        <>
          <path d="M39 65C41.5 62 45.5 62 48 65" stroke="#5C4B51" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="76" cy="65" r="4" fill="#5C4B51" />
          <circle cx="77.5" cy="63.5" r="1.3" fill="white" />
        </>
      ) : (
        <>
          <circle cx="44" cy="65" r="4" fill="#5C4B51" />
          <circle cx="45.5" cy="63.5" r="1.3" fill="white" />
          <circle cx="76" cy="65" r="4" fill="#5C4B51" />
          <circle cx="77.5" cy="63.5" r="1.3" fill="white" />
        </>
      )}

      {/* Cute Mouth */}
      <path d="M55 71C56.5 74 59.5 74 60 71C60.5 74 63.5 74 65 71" stroke="#5C4B51" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Little Coin / Leaf on Head */}
      <circle cx="60" cy="40" r="9" fill="#FFF2B2" stroke="#5C4B51" strokeWidth="2.8" />
      <text x="60" y="43.5" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#5C4B51">฿</text>
    </svg>
  );
}

export function formatCurrency(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

