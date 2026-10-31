import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const folders = ['accounts', 'categories', 'slips', 'attachments'];

for (const folder of folders) {
  const dir = path.join(uploadsRoot, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createUploader(subfolder) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(uploadsRoot, subfolder));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, unique);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น (PNG, GIF, JPG, WebP, SVG ฯลฯ)'));
      }
    },
  });
}

// Multi-field uploader for transactions: supports both slip_image and attachment_image
const txStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const folder = file.fieldname === 'attachment_image' ? 'attachments' : 'slips';
    cb(null, path.join(uploadsRoot, folder));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

export const uploadTransactionFiles = multer({
  storage: txStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const uploadAccountCover = createUploader('accounts');
export const uploadCategoryImage = createUploader('categories');
export const uploadSlipImage = createUploader('slips');
export const uploadsDirectory = uploadsRoot;
