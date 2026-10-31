import React from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Pastel Pop-up Modal for editing any item in the app
 */
export default function CuteModal({
  open,
  title,
  emoji = '✏️',
  onClose,
  children,
  maxWidth = 'max-w-lg',
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pastel-cocoa/40 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`bg-cream-50 border-2 border-pastel-pink rounded-3xl ${maxWidth} w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-cream-200 sticky top-0 bg-cream-50/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-pastel-pink flex items-center justify-center text-xl shadow-sticker border-2 border-white">
              {emoji}
            </div>
            <h3 className="font-cute font-bold text-lg text-pastel-cocoa">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-cream-200/80 hover:bg-pastel-pink text-pastel-cocoa transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

