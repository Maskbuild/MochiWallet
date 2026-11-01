import QRCode from 'qrcode';

export function generateQrMatrix(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  const qr = QRCode.create(value, {
    errorCorrectionLevel: 'M',
  });
  const size = qr.modules.size;
  const matrix = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(Boolean(qr.modules.get(r, c)));
    }
    matrix.push(row);
  }
  return matrix;
}
