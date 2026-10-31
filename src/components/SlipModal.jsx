import React from 'react';
import { X, ExternalLink, Receipt } from 'lucide-react';

export default function SlipModal({ slipUrl, title, amount, date, onClose }) {
  if (!slipUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-pastel-cocoa/40 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-cream-50 border-2 border-pastel-pink rounded-3xl max-w-md w-full p-5 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-cream-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-pastel-butter flex items-center justify-center text-xl shadow-sticker border border-white">
              🧾
            </div>
            <div>
              <h3 className="font-cute font-bold text-pastel-cocoa text-base leading-tight">
                ภาพสลิปบันทึกความจำ
              </h3>
              <p className="text-xs text-pastel-muted">
                {title || 'รายการบันทึก'} {date ? `• ${date}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-cream-200/70 hover:bg-pastel-pink/60 text-pastel-cocoa transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-cream-100 rounded-2xl p-3 border border-cream-300 flex items-center justify-center max-h-[65vh] overflow-auto bg-transparent-checker">
          <img
            src={slipUrl}
            alt="Slip"
            className="max-h-[58vh] w-auto object-contain rounded-xl shadow-sm"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          {amount !== undefined && (
            <span className="text-sm font-semibold bg-pastel-mint/70 px-3 py-1 rounded-full text-pastel-cocoa">
              ยอดเงิน ฿{Number(amount).toLocaleString('th-TH')}
            </span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <a
              href={slipUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl bg-pastel-sky/70 hover:bg-pastel-sky text-pastel-cocoa transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              เปิดภาพขนาดเต็ม
            </a>
            <button
              onClick={onClose}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-pastel-pink hover:bg-pastel-rose text-pastel-cocoa transition-colors"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

