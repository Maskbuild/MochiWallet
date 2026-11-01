import React, { useState, useEffect, useMemo } from 'react';
import { QrCode, Smartphone, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
import CuteModal from './CuteModal.jsx';
import { generateQrMatrix } from '../utils/qrcodeSvg.js';
import { useI18n } from '../i18n.jsx';

export function QrMobileUploadButton({
  target = 'slip',
  onFileReceived,
  label,
  labelTh = '📱 สแกน QR ส่งรูปจากมือถือ',
  labelEn = '📱 Scan QR from Phone',
  className = '',
}) {
  const { lang } = useI18n();
  const isEn = lang === 'en';

  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [baseOrigin, setBaseOrigin] = useState('');
  const [lanIps, setLanIps] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'waiting' | 'uploaded'
  const [uploadedPreview, setUploadedPreview] = useState(null);

  async function startNewQrSession() {
    setStatus('waiting');
    setUploadedPreview(null);
    try {
      const res = await fetch('/api/qr-upload/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      const ips = Array.isArray(data.lanIps) ? data.lanIps : [];
      setLanIps(ips);

      const currentHost = window.location.hostname;
      const currentPort = window.location.port ? `:${window.location.port}` : '';
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        const preferredIp = ips.find((ip) => ip.startsWith('192.168.')) || ips[0] || currentHost;
        const directPort = data.port ? `:${data.port}` : currentPort;
        setBaseOrigin(`${window.location.protocol}//${preferredIp}${directPort}`);
      } else {
        setBaseOrigin(window.location.origin);
      }
    } catch {}
  }

  useEffect(() => {
    if (open) {
      startNewQrSession();
    } else {
      setSessionId(null);
      setStatus('idle');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !sessionId || status !== 'waiting') return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/qr-upload/session/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'uploaded' && data.fileUrl) {
          setStatus('uploaded');
          setUploadedPreview(data.fileUrl);
          clearInterval(timer);

          const imgRes = await fetch(data.fileUrl);
          const blob = await imgRes.blob();
          const fileObj = new File([blob], data.fileName || 'mobile-upload.png', {
            type: data.mimeType || blob.type || 'image/png',
          });
          if (onFileReceived) {
            onFileReceived(fileObj, data.fileUrl);
          }
          setTimeout(() => {
            setOpen(false);
          }, 1100);
        }
      } catch {}
    }, 1200);
    return () => clearInterval(timer);
  }, [open, sessionId, status, onFileReceived]);

  const mobileUrl = useMemo(() => {
    if (!sessionId || !baseOrigin) return '';
    return `${baseOrigin.replace(/\/$/, '')}/m/upload/${sessionId}`;
  }, [sessionId, baseOrigin]);

  const qrMatrix = useMemo(() => {
    if (!mobileUrl) return null;
    try {
      return generateQrMatrix(mobileUrl);
    } catch {
      return null;
    }
  }, [mobileUrl]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-pastel-sky hover:bg-pastel-blue text-pastel-cocoa text-xs font-cute font-bold border-2 border-white shadow-sm transition-transform hover:-translate-y-0.5'
        }
      >
        <QrCode className="w-3.5 h-3.5 shrink-0" />
        <span>{label || (isEn ? labelEn : labelTh)}</span>
      </button>

      <CuteModal
        open={open}
        title={
          isEn
            ? '📱 Scan QR Code to Upload Image from Phone'
            : '📱 สแกน QR Code เพื่อส่งรูปจากโทรศัพท์เข้าคอม'
        }
        emoji="📱"
        onClose={() => setOpen(false)}
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-pastel-muted">
            {isEn
              ? 'Scan this QR code with your phone camera (on the same Wi-Fi / LAN) to take a photo or choose a slip from your gallery. It will appear here automatically!'
              : 'ใช้กล้องโทรศัพท์สแกน QR Code ด้านล่าง (ในวง Wi-Fi เดียวกัน) เพื่อถ่ายรูปหรือเลือกรูปสลิปจากอัลบั้มบนมือถือ พอกดส่งปุ๊บรูปจะเด้งเข้าหน้าจอคอมให้อัตโนมัติทันที!'}
          </p>

          {/* QR Code Box */}
          <div className="flex flex-col items-center justify-center">
            {status === 'uploaded' ? (
              <div className="p-5 rounded-3xl bg-pastel-mint/50 border-2 border-white shadow-cozy space-y-2.5 flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-bounce" />
                <p className="font-cute font-bold text-sm text-emerald-900">
                  {isEn
                    ? '🎉 Received image from phone!'
                    : '🎉 รับรูปภาพจากโทรศัพท์เข้าคอมเรียบร้อยแล้ว!'}
                </p>
                {uploadedPreview && (
                  <img
                    src={uploadedPreview}
                    alt="Uploaded from phone"
                    className="w-36 h-36 object-cover rounded-2xl border-2 border-white shadow"
                  />
                )}
              </div>
            ) : qrMatrix ? (
              <div className="p-4 bg-white rounded-3xl border-4 border-pastel-pink/60 shadow-cozy inline-block">
                <svg
                  viewBox={`-4 -4 ${qrMatrix.length + 8} ${qrMatrix.length + 8}`}
                  className="w-56 h-56 sm:w-60 sm:h-60"
                  shapeRendering="crispEdges"
                >
                  <rect
                    x="-4"
                    y="-4"
                    width={qrMatrix.length + 8}
                    height={qrMatrix.length + 8}
                    fill="#FFFFFF"
                  />
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx}
                          y={rIdx}
                          width={1}
                          height={1}
                          fill="#000000"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>
            ) : (
              <div className="w-52 h-52 rounded-3xl bg-cream-100 flex items-center justify-center text-xs text-pastel-muted">
                {isEn ? 'Generating QR Code...' : 'กำลังสร้าง QR Code...'}
              </div>
            )}
          </div>

          {/* Waiting Status Pill */}
          {status === 'waiting' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pastel-butter/70 border border-amber-200 text-xs font-cute font-bold text-pastel-cocoa">
              <Smartphone className="w-3.5 h-3.5 animate-pulse text-pink-500" />
              <span>
                {isEn
                  ? '⏳ Waiting for photo from your phone...'
                  : '⏳ กำลังรอรับรูปจากโทรศัพท์ของคุณ...'}
              </span>
            </div>
          )}

          {/* Adjustable Server Address (in case of multiple LAN IPs) */}
          <div className="bg-cream-100 border border-cream-300 rounded-2xl p-3 text-left space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-pastel-cocoa">
                {isEn ? '🌐 Phone Upload Link (LAN IP):' : '🌐 ลิงก์เชื่อมต่อสำหรับมือถือ (LAN IP):'}
              </span>
              <div className="flex items-center gap-1.5">
                <a
                  href={mobileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-cute font-bold text-indigo-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{isEn ? 'Open Link' : 'ลองเปิดลิงก์'}</span>
                </a>
                <button
                  type="button"
                  onClick={startNewQrSession}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-cream-300 text-[10px] font-cute font-bold text-pastel-cocoa"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>{isEn ? 'New QR' : 'รีเฟรช QR'}</span>
                </button>
              </div>
            </div>

            {lanIps.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {lanIps.map((ip) => {
                  const portPart = window.location.port ? `:${window.location.port}` : '';
                  const candidate = `${window.location.protocol}//${ip}${portPart}`;
                  return (
                    <button
                      key={ip}
                      type="button"
                      onClick={() => setBaseOrigin(candidate)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border ${
                        baseOrigin === candidate
                          ? 'bg-pastel-pink text-pastel-cocoa font-bold border-white'
                          : 'bg-white text-pastel-muted border-cream-200'
                      }`}
                    >
                      {ip}
                    </button>
                  );
                })}
              </div>
            )}

            <input
              type="text"
              value={baseOrigin}
              onChange={(e) => setBaseOrigin(e.target.value)}
              placeholder="http://192.168.1.157:3002"
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-cream-200 text-[11px] font-mono text-pastel-cocoa focus:outline-none"
            />
          </div>
        </div>
      </CuteModal>
    </>
  );
}

export default QrMobileUploadButton;
