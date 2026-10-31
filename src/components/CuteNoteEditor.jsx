import React, { useRef } from 'react';
import { List, CornerDownLeft } from 'lucide-react';
import { useI18n } from '../i18n.jsx';

/**
 * Multi-line note editor with 1-click Bullet Point & New Line buttons
 * Automatically continues bullet points when pressing Enter on a bulleted line
 */
export default function CuteNoteEditor({
  value = '',
  onChange,
  placeholder = '',
  rows = 3,
}) {
  const { lang } = useI18n();
  const isEn = lang === 'en';
  const textareaRef = useRef(null);

  function insertBullet() {
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value}\n• ` : '• ');
      return;
    }
    const start = el.selectionStart ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(start);
    const needNewline = before.length > 0 && !before.endsWith('\n');
    const insertion = `${needNewline ? '\n' : ''}• `;
    const nextVal = before + insertion + after;
    onChange(nextVal);
    setTimeout(() => {
      el.focus();
      const pos = start + insertion.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  }

  function insertNewLine() {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}\n`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(start);
    const nextVal = `${before}\n${after}`;
    onChange(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + 1, start + 1);
    }, 0);
  }

  function handleTextChange(e) {
    const raw = e.target.value;
    const cursor = e.target.selectionStart;
    // Automatically convert "- " or "+ " at start of line into "• "
    const replaced = raw.replace(/(^|\n)[-+]\s/g, '$1• ');
    onChange(replaced);
    if (replaced !== raw && textareaRef.current) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(cursor, cursor);
        }
      }, 0);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const el = e.target;
      const start = el.selectionStart;
      const before = value.slice(0, start);
      const currentLine = before.split('\n').pop() || '';
      if (currentLine.trimStart().startsWith('• ')) {
        // If user presses Enter on an empty bullet "• ", remove bullet and just newline
        if (currentLine.trim() === '•') {
          e.preventDefault();
          const cleanedBefore = before.replace(/•\s*$/, '');
          const after = value.slice(start);
          onChange(`${cleanedBefore}${after}`);
          return;
        }
        e.preventDefault();
        const after = value.slice(start);
        const nextVal = `${before}\n• ${after}`;
        onChange(nextVal);
        setTimeout(() => {
          el.setSelectionRange(start + 3, start + 3);
        }, 0);
      }
    }
  }

  return (
    <div className="bg-cream-100 border border-cream-300 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-pastel-pink">
      <div className="flex items-center justify-between px-3 py-1.5 bg-cream-200/60 border-b border-cream-300/70">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={insertBullet}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-white hover:bg-pastel-pink/60 text-pastel-cocoa text-[11px] font-cute font-bold border border-cream-300 shadow-sm transition-colors"
          >
            <List className="w-3 h-3" />
            <span>{isEn ? '• Add Bullet' : '• เพิ่มหัวข้อย่อย (หรือพิมพ์ - เว้นวรรค)'}</span>
          </button>
          <button
            type="button"
            onClick={insertNewLine}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-white hover:bg-pastel-mint/70 text-pastel-cocoa text-[11px] font-cute font-bold border border-cream-300 shadow-sm transition-colors"
          >
            <CornerDownLeft className="w-3 h-3" />
            <span>{isEn ? 'New Line' : 'ขึ้นบรรทัดใหม่'}</span>
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={
          placeholder ||
          (isEn
            ? 'Write notes... (Type "- " + space for automatic • bullet)'
            : 'เขียนโน้ตบันทึก... (พิมพ์ - แล้วเคาะ Spacebar เพื่อเปลี่ยนเป็น • หัวข้อย่อยอัตโนมัติ)')
        }
        className="w-full px-3.5 py-2 bg-transparent text-xs text-pastel-cocoa focus:outline-none resize-none"
      />
    </div>
  );
}

/**
 * Renders multi-line notes and bullet points cleanly
 */
export function FormattedNote({ text, className = '' }) {
  if (!text || !text.trim()) return null;
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  return (
    <div className={`space-y-0.5 text-xs text-pastel-muted ${className}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
        const content = isBullet ? trimmed.replace(/^[•\-]\s*/, '') : trimmed;
        return (
          <div key={i} className="flex items-start gap-1.5">
            {isBullet && <span className="text-pink-500 font-bold leading-tight">•</span>}
            <span className="leading-snug break-words">{content}</span>
          </div>
        );
      })}
    </div>
  );
}

