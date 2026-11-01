import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import db, { initDb, resetAllData } from './db.js';
import {
  buildDiscordPanelPayload,
  recordPanelTransaction,
  syncDiscordPanel,
  startDiscordGatewayIfConfigured,
  stopDiscordGateway,
  getDiscordBotStatus,
  fetchBotAccessibleChannels,
  generateGithubHeatmapPngBuffer,
  sendCustomDiscordMessage,
} from './discordBot.js';
import {
  uploadAccountCover,
  uploadCategoryImage,
  uploadShopImage,
  uploadSlipImage,
  uploadAttachmentImage,
  uploadTransactionFiles,
  uploadsDirectory,
} from './upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDb();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDirectory));

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function logActivity(actionType, dateStr, detail) {
  db.prepare(`
    INSERT INTO activity_logs (action_type, activity_date, detail)
    VALUES (?, ?, ?)
  `).run(actionType, dateStr || todayStr(), detail || '');
}

function parseAccountRow(row) {
  if (!row) return row;
  let parsedSubs = [];
  try {
    parsedSubs = JSON.parse(row.sub_accounts || '[]');
  } catch {
    parsedSubs = [];
  }
  return {
    ...row,
    has_sub_accounts: Boolean(row.has_sub_accounts),
    sub_accounts_list: parsedSubs,
  };
}

function validateSubAccountsCap(hasSubsInt, subAccountsJson, mainBalance) {
  if (!hasSubsInt) return;
  let parsed = [];
  try {
    parsed = JSON.parse(subAccountsJson || '[]');
  } catch {
    parsed = [];
  }
  const subTotal = parsed.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
  if (subTotal > Number(mainBalance || 0) + 0.0001) {
    throw new Error('ยอดเงินรวมในหมวดย่อยต้องไม่เกินยอดเงินของบัญชีหลัก');
  }
}

function triggerPanelReset() {
  const cfg = db.prepare('SELECT auto_sync FROM bot_settings WHERE id = 1').get();
  if (!cfg || cfg.auto_sync) {
    syncDiscordPanel().catch(() => {});
  }
}

// ==========================================
// 1. ACCOUNTS API (กระเป๋าเงิน & หมวดย่อยของบัญชี)
// ==========================================
app.get('/api/accounts', (_req, res) => {
  const accounts = db.prepare('SELECT * FROM accounts ORDER BY id ASC').all();
  res.json(accounts.map(parseAccountRow));
});

app.post('/api/accounts', uploadAccountCover.single('cover_image'), (req, res) => {
  try {
    const { name, type, balance, color, emoji, note, has_sub_accounts, sub_accounts } = req.body;
    const coverImage = req.file ? `/uploads/accounts/${req.file.filename}` : null;
    const initialBalance = parseFloat(balance) || 0;
    const hasSubsInt = has_sub_accounts === 'true' || has_sub_accounts === '1' || has_sub_accounts === true ? 1 : 0;
    const subAccountsJson = hasSubsInt
      ? typeof sub_accounts === 'string'
        ? sub_accounts
        : JSON.stringify(sub_accounts || [])
      : '[]';

    validateSubAccountsCap(hasSubsInt, subAccountsJson, initialBalance);

    const result = db.prepare(`
      INSERT INTO accounts (name, type, balance, color, emoji, cover_image, note, has_sub_accounts, sub_accounts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name || 'กระเป๋าใหม่',
      type || 'bank',
      initialBalance,
      color || '#FFD6E0',
      emoji || '👛',
      coverImage,
      note || '',
      hasSubsInt,
      subAccountsJson
    );

    logActivity('create_account', todayStr(), `เปิดบัญชีใหม่: ${name}`);
    triggerPanelReset();

    const created = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
    res.json(parseAccountRow(created));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/accounts/:id', uploadAccountCover.single('cover_image'), (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(Number(id));
    if (!existing) return res.status(404).json({ error: 'ไม่พบบัญชีนี้' });

    const { name, type, balance, color, emoji, note, remove_cover, has_sub_accounts, sub_accounts } = req.body;
    let coverImage = existing.cover_image;
    if (remove_cover === 'true') {
      coverImage = null;
    }
    if (req.file) {
      coverImage = `/uploads/accounts/${req.file.filename}`;
    }

    const hasSubsInt =
      has_sub_accounts !== undefined
        ? has_sub_accounts === 'true' || has_sub_accounts === '1' || has_sub_accounts === true
          ? 1
          : 0
        : existing.has_sub_accounts;

    let subAccountsJson = existing.sub_accounts || '[]';
    if (!hasSubsInt) {
      subAccountsJson = '[]';
    } else if (sub_accounts !== undefined) {
      subAccountsJson = typeof sub_accounts === 'string' ? sub_accounts : JSON.stringify(sub_accounts);
    }

    const finalBalance = balance !== undefined ? parseFloat(balance) : existing.balance;
    validateSubAccountsCap(hasSubsInt, subAccountsJson, finalBalance);

    db.prepare(`
      UPDATE accounts
      SET name = ?, type = ?, balance = ?, color = ?, emoji = ?, cover_image = ?, note = ?, has_sub_accounts = ?, sub_accounts = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      type ?? existing.type,
      finalBalance,
      color ?? existing.color,
      emoji ?? existing.emoji,
      coverImage,
      note ?? existing.note,
      hasSubsInt,
      subAccountsJson,
      Number(id)
    );

    triggerPanelReset();
    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(Number(id));
    res.json(parseAccountRow(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/accounts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM accounts WHERE id = ?').run(Number(req.params.id));
    triggerPanelReset();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 2. CATEGORIES & REUSABLE IMAGE GALLERY API
// ==========================================
app.get('/api/categories', (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY parent_id ASC NULLS FIRST, id ASC').all();
  res.json(categories);
});

app.get('/api/category-images', (_req, res) => {
  const images = db.prepare('SELECT * FROM category_images ORDER BY id DESC').all();
  res.json(images);
});

app.post('/api/category-images', uploadCategoryImage.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'กรุณาเลือกไฟล์รูปภาพ' });
    const filePath = `/uploads/categories/${req.file.filename}`;
    const name = req.body.name || req.file.originalname;
    const result = db.prepare(`
      INSERT INTO category_images (name, file_path)
      VALUES (?, ?)
    `).run(name, filePath);
    const created = db.prepare('SELECT * FROM category_images WHERE id = ?').get(result.lastInsertRowid);
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/category-images/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM category_images WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/categories', uploadCategoryImage.single('image'), (req, res) => {
  try {
    const { name, type, parent_id, color, icon_emoji, reused_image_path } = req.body;
    let imagePath = reused_image_path || null;

    if (req.file) {
      imagePath = `/uploads/categories/${req.file.filename}`;
      db.prepare(`
        INSERT INTO category_images (name, file_path)
        VALUES (?, ?)
      `).run(name || req.file.originalname, imagePath);
    }

    const parentIdNum = parent_id && parent_id !== 'null' && parent_id !== '' ? Number(parent_id) : null;

    const result = db.prepare(`
      INSERT INTO categories (name, type, parent_id, color, icon_emoji, image_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      name || 'หมวดหมู่ใหม่',
      type || 'expense',
      parentIdNum,
      color || '#FFE0C8',
      icon_emoji || '🍱',
      imagePath
    );

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/categories/:id', uploadCategoryImage.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(id));
    if (!existing) return res.status(404).json({ error: 'ไม่พบหมวดหมู่' });

    const { name, type, parent_id, color, icon_emoji, reused_image_path, clear_image } = req.body;
    let imagePath = existing.image_path;

    if (clear_image === 'true') {
      imagePath = null;
    } else if (reused_image_path) {
      imagePath = reused_image_path;
    }

    if (req.file) {
      imagePath = `/uploads/categories/${req.file.filename}`;
      db.prepare(`
        INSERT INTO category_images (name, file_path)
        VALUES (?, ?)
      `).run(name || existing.name, imagePath);
    }

    const parentIdNum = parent_id && parent_id !== 'null' && parent_id !== '' ? Number(parent_id) : null;

    db.prepare(`
      UPDATE categories
      SET name = ?, type = ?, parent_id = ?, color = ?, icon_emoji = ?, image_path = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      type ?? existing.type,
      parentIdNum,
      color ?? existing.color,
      icon_emoji ?? existing.icon_emoji,
      imagePath,
      Number(id)
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(id));
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 3. SHOPS API (ระบบร้านค้า)
// ==========================================
app.get('/api/shops', (_req, res) => {
  const shops = db.prepare(`
    SELECT s.*, c.name as category_name, c.icon_emoji as category_emoji
    FROM shops s
    LEFT JOIN categories c ON s.default_category_id = c.id
    ORDER BY s.id ASC
  `).all();
  res.json(shops);
});

app.post('/api/shops', uploadShopImage.single('image'), (req, res) => {
  try {
    const { name, icon_emoji, color, default_category_id, note } = req.body;
    const catId = default_category_id ? Number(default_category_id) : null;
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/shops/${req.file.filename}`;
    }
    const result = db.prepare(`
      INSERT INTO shops (name, icon_emoji, color, image_path, default_category_id, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name || 'ร้านค้าใหม่', icon_emoji || '🏪', color || '#D6ECFF', imagePath, catId, note || '');

    const created = db.prepare('SELECT * FROM shops WHERE id = ?').get(result.lastInsertRowid);
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/shops/:id', uploadShopImage.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM shops WHERE id = ?').get(Number(id));
    if (!existing) return res.status(404).json({ error: 'ไม่พบร้านค้า' });

    const { name, icon_emoji, color, default_category_id, note, clear_image } = req.body;
    const catId = default_category_id ? Number(default_category_id) : null;
    let imagePath = existing.image_path;

    if (clear_image === 'true') {
      imagePath = null;
    }
    if (req.file) {
      imagePath = `/uploads/shops/${req.file.filename}`;
    }

    db.prepare(`
      UPDATE shops
      SET name = ?, icon_emoji = ?, color = ?, image_path = ?, default_category_id = ?, note = ?
      WHERE id = ?
    `).run(name, icon_emoji || '🏪', color || '#D6ECFF', imagePath, catId, note || '', Number(id));
    const updated = db.prepare('SELECT * FROM shops WHERE id = ?').get(Number(id));
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/shops/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM shops WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. TRANSACTIONS & TRANSFERS API (สลิปแยก + รูปประกอบ + ช่วงเวลา + หมวดย่อยบัญชี)
// ==========================================
app.get('/api/transactions', (req, res) => {
  const { start_date, end_date, type, account_id, category_id, shop_id } = req.query;
  let sql = `
    SELECT t.*,
      a.name as account_name, a.emoji as account_emoji, a.color as account_color, a.sub_accounts as account_subs_json,
      ta.name as to_account_name, ta.emoji as to_account_emoji, ta.color as to_account_color, ta.sub_accounts as to_account_subs_json,
      c.name as category_name, c.icon_emoji as category_emoji, c.color as category_color, c.image_path as category_image, c.parent_id as category_parent_id,
      s.name as shop_name, s.icon_emoji as shop_emoji, s.color as shop_color, s.image_path as shop_image
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN shops s ON t.shop_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (start_date) {
    sql += ' AND t.transaction_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND t.transaction_date <= ?';
    params.push(end_date);
  }
  if (type && type !== 'all') {
    sql += ' AND t.type = ?';
    params.push(type);
  }
  if (account_id && account_id !== 'all') {
    sql += ' AND (t.account_id = ? OR t.to_account_id = ?)';
    params.push(Number(account_id), Number(account_id));
  }
  if (category_id && category_id !== 'all') {
    sql += ' AND (t.category_id = ? OR c.parent_id = ?)';
    params.push(Number(category_id), Number(category_id));
  }
  if (shop_id && shop_id !== 'all') {
    sql += ' AND t.shop_id = ?';
    params.push(Number(shop_id));
  }

  sql += ' ORDER BY t.transaction_date DESC, t.id DESC';
  const rows = db.prepare(sql).all(...params);

  const enriched = rows.map((r) => {
    let subAccountName = null;
    if (r.sub_account_id && r.account_subs_json) {
      try {
        const list = JSON.parse(r.account_subs_json);
        const found = list.find((x) => String(x.id) === String(r.sub_account_id));
        if (found) subAccountName = `${found.emoji || '🏷️'} ${found.name}`;
      } catch {}
    }
    let toSubAccountName = null;
    if (r.to_sub_account_id && r.to_account_subs_json) {
      try {
        const list = JSON.parse(r.to_account_subs_json);
        const found = list.find((x) => String(x.id) === String(r.to_sub_account_id));
        if (found) toSubAccountName = `${found.emoji || '🏷️'} ${found.name}`;
      } catch {}
    }
    return {
      ...r,
      sub_account_label: subAccountName,
      to_sub_account_label: toSubAccountName,
    };
  });

  res.json(enriched);
});

function adjustSubAccountBalance(accountId, subAccountId, delta) {
  if (!accountId || !subAccountId || !delta) return;
  try {
    const acc = db.prepare('SELECT sub_accounts FROM accounts WHERE id = ?').get(Number(accountId));
    if (!acc || !acc.sub_accounts) return;
    const subs = JSON.parse(acc.sub_accounts);
    let changed = false;
    for (const s of subs) {
      if (String(s.id) === String(subAccountId)) {
        s.balance = Math.round(((Number(s.balance) || 0) + Number(delta)) * 100) / 100;
        changed = true;
        break;
      }
    }
    if (changed) {
      db.prepare('UPDATE accounts SET sub_accounts = ? WHERE id = ?').run(JSON.stringify(subs), Number(accountId));
    }
  } catch (err) {
    console.error('adjustSubAccountBalance error:', err);
  }
}

const txUploadFields = uploadTransactionFiles.fields([
  { name: 'slip_image', maxCount: 1 },
  { name: 'attachment_image', maxCount: 1 },
]);

app.post('/api/transactions', txUploadFields, (req, res) => {
  try {
    const {
      type,
      title,
      amount,
      account_id,
      sub_account_id,
      to_account_id,
      to_sub_account_id,
      category_id,
      shop_id,
      time_period,
      note,
      transaction_date,
    } = req.body;

    const numAmount = parseFloat(amount) || 0;
    const accId = Number(account_id);
    const toAccId = to_account_id && to_account_id !== 'null' && to_account_id !== '' ? Number(to_account_id) : null;
    const catId = category_id && category_id !== 'null' && category_id !== '' ? Number(category_id) : null;
    const shopId = shop_id && shop_id !== 'null' && shop_id !== '' ? Number(shop_id) : null;

    const slipFile = req.files?.slip_image?.[0];
    const attachFile = req.files?.attachment_image?.[0];
    const slipPath = slipFile ? `/uploads/slips/${slipFile.filename}` : null;
    const attachPath = attachFile ? `/uploads/attachments/${attachFile.filename}` : null;
    const txDate = transaction_date || todayStr();

    const result = db.prepare(`
      INSERT INTO transactions (type, title, amount, account_id, sub_account_id, to_account_id, to_sub_account_id, category_id, shop_id, time_period, note, slip_image, attachment_image, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      type || 'expense',
      title || (type === 'transfer' ? 'โอนเงินระหว่างบัญชี' : 'รายการใหม่'),
      numAmount,
      accId,
      sub_account_id || null,
      toAccId,
      to_sub_account_id || null,
      catId,
      shopId,
      time_period || 'afternoon',
      note || '',
      slipPath,
      attachPath,
      txDate
    );

    if (type === 'income') {
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(numAmount, accId);
      adjustSubAccountBalance(accId, sub_account_id, numAmount);
      logActivity('create_tx', txDate, `รายรับ: ${title || 'รายการใหม่'}`);
    } else if (type === 'expense') {
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(numAmount, accId);
      adjustSubAccountBalance(accId, sub_account_id, -numAmount);
      logActivity('create_tx', txDate, `รายจ่าย: ${title || 'รายการใหม่'}`);
    } else if (type === 'transfer' && toAccId) {
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(numAmount, accId);
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(numAmount, toAccId);
      adjustSubAccountBalance(accId, sub_account_id, -numAmount);
      adjustSubAccountBalance(toAccId, to_sub_account_id, numAmount);
      logActivity('create_transfer', txDate, `โอนเงิน/แลกเปลี่ยน: ${title || 'โอนระหว่างบัญชี'}`);
    }

    const created = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    triggerPanelReset();
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', txUploadFields, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(Number(id));
    if (!existing) return res.status(404).json({ error: 'ไม่พบรายการ' });

    // Revert old balance effect first
    if (existing.type === 'income') {
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(existing.amount, existing.account_id);
      adjustSubAccountBalance(existing.account_id, existing.sub_account_id, -existing.amount);
    } else if (existing.type === 'expense') {
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(existing.amount, existing.account_id);
      adjustSubAccountBalance(existing.account_id, existing.sub_account_id, existing.amount);
    } else if (existing.type === 'transfer' && existing.to_account_id) {
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(existing.amount, existing.account_id);
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(existing.amount, existing.to_account_id);
      adjustSubAccountBalance(existing.account_id, existing.sub_account_id, existing.amount);
      adjustSubAccountBalance(existing.to_account_id, existing.to_sub_account_id, -existing.amount);
    }

    const {
      type,
      title,
      amount,
      account_id,
      sub_account_id,
      to_account_id,
      to_sub_account_id,
      category_id,
      shop_id,
      time_period,
      note,
      transaction_date,
      remove_slip,
      remove_attachment,
    } = req.body;

    const newType = type || existing.type;
    const numAmount = amount !== undefined ? parseFloat(amount) || 0 : existing.amount;
    const accId = account_id ? Number(account_id) : existing.account_id;
    const toAccId =
      to_account_id !== undefined
        ? to_account_id && to_account_id !== 'null' && to_account_id !== ''
          ? Number(to_account_id)
          : null
        : existing.to_account_id;
    const catId =
      category_id !== undefined
        ? category_id && category_id !== 'null' && category_id !== ''
          ? Number(category_id)
          : null
        : existing.category_id;
    const shopId =
      shop_id !== undefined
        ? shop_id && shop_id !== 'null' && shop_id !== ''
          ? Number(shop_id)
          : null
        : existing.shop_id;

    let slipPath = existing.slip_image;
    if (remove_slip === 'true') slipPath = null;
    if (req.files?.slip_image?.[0]) {
      slipPath = `/uploads/slips/${req.files.slip_image[0].filename}`;
    }

    let attachPath = existing.attachment_image;
    if (remove_attachment === 'true') attachPath = null;
    if (req.files?.attachment_image?.[0]) {
      attachPath = `/uploads/attachments/${req.files.attachment_image[0].filename}`;
    }

    db.prepare(`
      UPDATE transactions
      SET type = ?, title = ?, amount = ?, account_id = ?, sub_account_id = ?, to_account_id = ?, to_sub_account_id = ?, category_id = ?, shop_id = ?, time_period = ?, note = ?, slip_image = ?, attachment_image = ?, transaction_date = ?
      WHERE id = ?
    `).run(
      newType,
      title ?? existing.title,
      numAmount,
      accId,
      sub_account_id !== undefined ? sub_account_id || null : existing.sub_account_id,
      toAccId,
      to_sub_account_id !== undefined ? to_sub_account_id || null : existing.to_sub_account_id,
      catId,
      shopId,
      time_period ?? existing.time_period ?? 'afternoon',
      note ?? existing.note,
      slipPath,
      attachPath,
      transaction_date ?? existing.transaction_date,
      Number(id)
    );

    const finalSubId = sub_account_id !== undefined ? sub_account_id || null : existing.sub_account_id;
    const finalToSubId = to_sub_account_id !== undefined ? to_sub_account_id || null : existing.to_sub_account_id;

    // Apply new balance effect
    if (newType === 'income') {
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(numAmount, accId);
      adjustSubAccountBalance(accId, finalSubId, numAmount);
    } else if (newType === 'expense') {
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(numAmount, accId);
      adjustSubAccountBalance(accId, finalSubId, -numAmount);
    } else if (newType === 'transfer' && toAccId) {
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(numAmount, accId);
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(numAmount, toAccId);
      adjustSubAccountBalance(accId, finalSubId, -numAmount);
      adjustSubAccountBalance(toAccId, finalToSubId, numAmount);
    }

    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(Number(id));
    triggerPanelReset();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  try {
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(Number(req.params.id));
    if (!tx) return res.status(404).json({ error: 'ไม่พบรายการ' });

    if (tx.type === 'income') {
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(tx.amount, tx.account_id);
      adjustSubAccountBalance(tx.account_id, tx.sub_account_id, -tx.amount);
    } else if (tx.type === 'expense') {
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
      adjustSubAccountBalance(tx.account_id, tx.sub_account_id, tx.amount);
    } else if (tx.type === 'transfer' && tx.to_account_id) {
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(tx.amount, tx.account_id);
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(tx.amount, tx.to_account_id);
      adjustSubAccountBalance(tx.account_id, tx.sub_account_id, tx.amount);
      adjustSubAccountBalance(tx.to_account_id, tx.to_sub_account_id, -tx.amount);
    }

    db.prepare('DELETE FROM transactions WHERE id = ?').run(tx.id);
    triggerPanelReset();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. BUDGETS API
// ==========================================
app.get('/api/budgets', (_req, res) => {
  const budgets = db.prepare(`
    SELECT b.*, c.name as category_name, c.icon_emoji as category_emoji
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    ORDER BY b.id DESC
  `).all();

  const allCategories = db.prepare('SELECT * FROM categories').all();
  const catMap = Object.fromEntries(allCategories.map((c) => [c.id, c]));

  const enriched = budgets.map((b) => {
    let startDate = '0000-01-01';
    let endDate = '9999-12-31';

    const currentYearMonth = todayStr().slice(0, 7);
    const currentYear = todayStr().slice(0, 4);

    if (b.period_type === 'recurring_monthly') {
      startDate = `${currentYearMonth}-01`;
      endDate = `${currentYearMonth}-31`;
    } else if (b.period_type === 'recurring_yearly') {
      startDate = `${currentYear}-01-01`;
      endDate = `${currentYear}-12-31`;
    } else if (b.period_type === 'monthly' && b.month_str) {
      startDate = `${b.month_str}-01`;
      endDate = `${b.month_str}-31`;
    } else if (b.period_type === 'yearly' && b.year_str) {
      startDate = `${b.year_str}-01-01`;
      endDate = `${b.year_str}-12-31`;
    } else if (b.period_type === 'trip') {
      startDate = b.start_date || todayStr();
      endDate = b.end_date || todayStr();
    }

    let spent = 0;
    if (b.budget_scope === 'category' && b.category_id) {
      const row = db.prepare(`
        SELECT COALESCE(SUM(t.amount), 0) as total
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'expense'
          AND t.transaction_date >= ? AND t.transaction_date <= ?
          AND (t.category_id = ? OR c.parent_id = ?)
      `).get(startDate, endDate, b.category_id, b.category_id);
      spent = row.total;
    } else {
      const row = db.prepare(`
        SELECT COALESCE(SUM(t.amount), 0) as total
        FROM transactions t
        WHERE t.type = 'expense'
          AND t.transaction_date >= ? AND t.transaction_date <= ?
      `).get(startDate, endDate);
      spent = row.total;
    }

    let parsedSubs = [];
    try {
      parsedSubs = JSON.parse(b.sub_allocations || '[]');
    } catch {
      parsedSubs = [];
    }

    const enrichedSubs = parsedSubs.map((sub) => {
      const subCatId = Number(sub.category_id);
      const subRow = db.prepare(`
        SELECT COALESCE(SUM(t.amount), 0) as total
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'expense'
          AND t.transaction_date >= ? AND t.transaction_date <= ?
          AND (t.category_id = ? OR c.parent_id = ?)
      `).get(startDate, endDate, subCatId, subCatId);
      const catInfo = catMap[subCatId] || {};
      return {
        ...sub,
        category_id: subCatId,
        category_name: catInfo.name || 'หมวดหมู่',
        category_emoji: catInfo.icon_emoji || '🏷️',
        category_color: catInfo.color || '#FFE0C8',
        spent: subRow.total,
      };
    });

    return {
      ...b,
      spent,
      sub_breakdown: enrichedSubs,
    };
  });

  res.json(enriched);
});

app.post('/api/budgets', (req, res) => {
  try {
    const {
      name,
      budget_scope,
      period_type,
      total_limit,
      category_id,
      start_date,
      end_date,
      month_str,
      year_str,
      color,
      icon_emoji,
      sub_allocations,
    } = req.body;

    const catId = category_id && category_id !== 'null' && category_id !== '' ? Number(category_id) : null;
    const subStr = typeof sub_allocations === 'string' ? sub_allocations : JSON.stringify(sub_allocations || []);

    const result = db.prepare(`
      INSERT INTO budgets (name, budget_scope, period_type, total_limit, category_id, start_date, end_date, month_str, year_str, color, icon_emoji, sub_allocations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name || 'งบประมาณใหม่',
      budget_scope || 'overall',
      period_type || 'monthly',
      parseFloat(total_limit) || 0,
      catId,
      start_date || null,
      end_date || null,
      month_str || todayStr().slice(0, 7),
      year_str || todayStr().slice(0, 4),
      color || '#FFD6E0',
      icon_emoji || '🎯',
      subStr
    );

    const created = db.prepare('SELECT * FROM budgets WHERE id = ?').get(result.lastInsertRowid);
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/budgets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      budget_scope,
      period_type,
      total_limit,
      category_id,
      start_date,
      end_date,
      month_str,
      year_str,
      color,
      icon_emoji,
      sub_allocations,
    } = req.body;

    const catId = category_id && category_id !== 'null' && category_id !== '' ? Number(category_id) : null;
    const subStr = typeof sub_allocations === 'string' ? sub_allocations : JSON.stringify(sub_allocations || []);

    db.prepare(`
      UPDATE budgets
      SET name = ?, budget_scope = ?, period_type = ?, total_limit = ?, category_id = ?, start_date = ?, end_date = ?, month_str = ?, year_str = ?, color = ?, icon_emoji = ?, sub_allocations = ?
      WHERE id = ?
    `).run(
      name,
      budget_scope || 'overall',
      period_type || 'monthly',
      parseFloat(total_limit) || 0,
      catId,
      start_date || null,
      end_date || null,
      month_str || todayStr().slice(0, 7),
      year_str || todayStr().slice(0, 4),
      color || '#FFD6E0',
      icon_emoji || '🎯',
      subStr,
      Number(id)
    );

    const updated = db.prepare('SELECT * FROM budgets WHERE id = ?').get(Number(id));
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/budgets/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM budgets WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 6. MEMBERSHIPS API
// ==========================================
app.get('/api/memberships', (_req, res) => {
  const rows = db.prepare(`
    SELECT m.*,
      a.name as account_name, a.emoji as account_emoji,
      c.name as category_name, c.icon_emoji as category_emoji,
      s.name as shop_name, s.icon_emoji as shop_emoji
    FROM memberships m
    LEFT JOIN accounts a ON m.account_id = a.id
    LEFT JOIN categories c ON m.category_id = c.id
    LEFT JOIN shops s ON m.shop_id = s.id
    ORDER BY
      CASE m.status WHEN 'active' THEN 1 WHEN 'inactive' THEN 2 ELSE 3 END,
      m.id DESC
  `).all();
  res.json(rows);
});

app.post('/api/memberships', (req, res) => {
  try {
    const {
      name,
      amount,
      cycle_unit,
      cycle_interval,
      account_id,
      category_id,
      shop_id,
      icon_emoji,
      color,
      status,
      auto_deduct,
      next_billing_at,
      note,
    } = req.body;

    const result = db.prepare(`
      INSERT INTO memberships (name, amount, cycle_unit, cycle_interval, account_id, category_id, shop_id, icon_emoji, color, status, auto_deduct, next_billing_at, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name || 'สมาชิกใหม่',
      parseFloat(amount) || 0,
      cycle_unit || 'month',
      parseInt(cycle_interval, 10) || 1,
      account_id ? Number(account_id) : null,
      category_id ? Number(category_id) : null,
      shop_id ? Number(shop_id) : null,
      icon_emoji || '🎀',
      color || '#FFD6E0',
      status || 'active',
      auto_deduct ? 1 : 0,
      next_billing_at || todayStr(),
      note || ''
    );

    const created = db.prepare('SELECT * FROM memberships WHERE id = ?').get(result.lastInsertRowid);
    res.json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/memberships/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM memberships WHERE id = ?').get(Number(id));
    if (!existing) return res.status(404).json({ error: 'ไม่พบรายการ Membership' });

    const {
      name,
      amount,
      cycle_unit,
      cycle_interval,
      account_id,
      category_id,
      shop_id,
      icon_emoji,
      color,
      status,
      auto_deduct,
      next_billing_at,
      note,
    } = req.body;

    db.prepare(`
      UPDATE memberships
      SET name = ?, amount = ?, cycle_unit = ?, cycle_interval = ?, account_id = ?, category_id = ?, shop_id = ?, icon_emoji = ?, color = ?, status = ?, auto_deduct = ?, next_billing_at = ?, note = ?
      WHERE id = ?
    `).run(
      name ?? existing.name,
      amount !== undefined ? parseFloat(amount) : existing.amount,
      cycle_unit ?? existing.cycle_unit,
      cycle_interval !== undefined ? parseInt(cycle_interval, 10) : existing.cycle_interval,
      account_id !== undefined ? (account_id ? Number(account_id) : null) : existing.account_id,
      category_id !== undefined ? (category_id ? Number(category_id) : null) : existing.category_id,
      shop_id !== undefined ? (shop_id ? Number(shop_id) : null) : existing.shop_id,
      icon_emoji ?? existing.icon_emoji,
      color ?? existing.color,
      status ?? existing.status,
      auto_deduct !== undefined ? (auto_deduct ? 1 : 0) : existing.auto_deduct,
      next_billing_at !== undefined ? next_billing_at : existing.next_billing_at,
      note ?? existing.note,
      Number(id)
    );

    const updated = db.prepare('SELECT * FROM memberships WHERE id = ?').get(Number(id));
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/memberships/:id/charge', (req, res) => {
  try {
    const { id } = req.params;
    const { units_multiplier = 1 } = req.body;
    const m = db.prepare('SELECT * FROM memberships WHERE id = ?').get(Number(id));
    if (!m) return res.status(404).json({ error: 'ไม่พบรายการ Membership' });

    const accId = m.account_id || db.prepare('SELECT id FROM accounts LIMIT 1').get()?.id;
    if (!accId) return res.status(400).json({ error: 'กรุณาสร้างบัญชีก่อนตัดยอด' });

    const multiplier = parseFloat(units_multiplier) || 1;
    const totalCharge = m.amount * multiplier;
    const dateNow = todayStr();

    const unitLabelMap = {
      hour: 'ชั่วโมง',
      day: 'วัน',
      month: 'เดือน',
      year: 'ปี',
    };
    const title = `ค่าสมาชิก: ${m.name}${multiplier > 1 ? ` (${multiplier} ${unitLabelMap[m.cycle_unit] || 'รอบ'})` : ''}`;

    db.prepare(`
      INSERT INTO transactions (type, title, amount, account_id, category_id, shop_id, time_period, note, transaction_date)
      VALUES ('expense', ?, ?, ?, ?, ?, 'afternoon', ?, ?)
    `).run(title, totalCharge, accId, m.category_id, m.shop_id, `• ตัดยอดจากระบบ Membership (${m.name})`, dateNow);

    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(totalCharge, accId);

    const nextDate = new Date();
    const interval = (m.cycle_interval || 1) * multiplier;
    if (m.cycle_unit === 'day') nextDate.setDate(nextDate.getDate() + interval);
    else if (m.cycle_unit === 'month') nextDate.setMonth(nextDate.getMonth() + interval);
    else if (m.cycle_unit === 'year') nextDate.setFullYear(nextDate.getFullYear() + interval);

    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;

    db.prepare(`
      UPDATE memberships SET last_billed_at = ?, next_billing_at = ? WHERE id = ?
    `).run(dateNow, nextStr, m.id);

    logActivity('create_tx', dateNow, title);
    triggerPanelReset();

    res.json({ success: true, charged: totalCharge, next_billing_at: nextStr });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/memberships/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM memberships WHERE id = ?').run(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 7. GITHUB ACTIVITY HEATMAP API
// ==========================================
app.get('/api/activity-heatmap', (_req, res) => {
  const logs = db.prepare(`
    SELECT
      activity_date,
      COUNT(*) as total_count,
      SUM(CASE WHEN action_type = 'create_tx' THEN 1 ELSE 0 END) as tx_count,
      SUM(CASE WHEN action_type = 'create_transfer' THEN 1 ELSE 0 END) as transfer_count,
      SUM(CASE WHEN action_type = 'create_account' THEN 1 ELSE 0 END) as account_count
    FROM activity_logs
    GROUP BY activity_date
    ORDER BY activity_date ASC
  `).all();

  const recentLogs = db.prepare(`
    SELECT * FROM activity_logs ORDER BY id DESC LIMIT 15
  `).all();

  res.json({ daily: logs, recent: recentLogs });
});

// ==========================================
// 8. DISCORD INTERACTIVE PANEL BOT & API
// (หน้าจอแบบ GitHub + ยอดเงินทั้งหมด + รายรับรายจ่าย + รีเซ็ตทุกครั้งที่อัปเดต + 3 ปุ่มกด รายจ่าย/รายรับ/โอนเงิน)
// ==========================================
// เก็บประวัติการยิง API จากเว็บอื่นล่าสุด (สูงสุด 20 รายการ) เพื่อแสดงบนหน้าเว็บ
const recentExternalApiLogs = [];
function logExternalApiCall(method, endpoint, source, summaryText, status = 'OK') {
  recentExternalApiLogs.unshift({
    id: `${Date.now()}-${Math.round(Math.random() * 1000)}`,
    time: new Date().toLocaleString('th-TH'),
    method,
    endpoint,
    source: source || 'External Website',
    summary: summaryText,
    status,
  });
  if (recentExternalApiLogs.length > 20) recentExternalApiLogs.pop();
}

function requireBotApiKey(req, res, next) {
  const cfg = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
  const providedKey =
    req.headers['x-api-key'] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    req.query.api_key ||
    req.body?.api_key;

  if (!cfg || !providedKey || providedKey !== cfg.api_key) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing X-API-Key (ส่งผ่าน Header X-API-Key หรือ ?api_key=...)',
    });
  }
  next();
}

// ดึงรูปตาราง GitHub Heatmap สีพาสเทลคมชัดสูง (ตัวเดียวกับที่ส่งเข้า Discord)
app.get('/api/bot/heatmap.png', (_req, res) => {
  const png = generateGithubHeatmapPngBuffer();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-store');
  res.send(png);
});

// ดึงข้อมูลตั้งค่าบอท + ข้อมูลตัวอย่างหน้าจอ Discord Panel สด + รายชื่อห้องที่บอทมองเห็น + ประวัติ API จากเว็บอื่น
app.get('/api/bot-settings', async (_req, res) => {
  const cfg = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
  const status = getDiscordBotStatus();
  const panelPayload = buildDiscordPanelPayload();
  const discovery = await fetchBotAccessibleChannels();
  res.json({
    settings: cfg,
    status,
    panel: panelPayload,
    discovery,
    apiLogs: recentExternalApiLogs,
  });
});

// บันทึก Bot Token & Channel ID พร้อมเชื่อมต่อและรีเซ็ตหน้าจอใน Discord ทันที
app.put('/api/bot-settings', async (req, res) => {
  try {
    const { api_key, bot_token, channel_id, reset_mode, auto_sync } = req.body;
    const existing = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
    db.prepare(`
      UPDATE bot_settings
      SET api_key = ?, bot_token = ?, channel_id = ?, reset_mode = ?, auto_sync = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      api_key?.trim() || existing.api_key,
      bot_token !== undefined ? bot_token.trim() : existing.bot_token,
      channel_id !== undefined ? channel_id.trim() : existing.channel_id,
      reset_mode || existing.reset_mode || 'recreate',
      auto_sync !== undefined ? (auto_sync ? 1 : 0) : existing.auto_sync
    );

    startDiscordGatewayIfConfigured();

    // รอ 900ms เพื่อให้ WebSocket (READY + GUILD_CREATE) รับรายชื่อเซิร์ฟเวอร์และห้องแชทมาครบก่อน
    await new Promise((r) => setTimeout(r, 900));

    let syncResult = null;
    const updatedCfg = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
    if (updatedCfg.bot_token) {
      syncResult = await syncDiscordPanel({ forceRecreate: true });
    }

    const finalCfg = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
    const discovery = await fetchBotAccessibleChannels();

    res.json({
      settings: finalCfg,
      status: getDiscordBotStatus(),
      panel: buildDiscordPanelPayload(),
      discovery,
      syncResult,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ปุ่มสั่งรีเซ็ตและส่งหน้าจอ Panel ใหม่เข้าห้อง Discord ทันที
app.post('/api/bot-settings/sync-panel', async (_req, res) => {
  try {
    startDiscordGatewayIfConfigured();
    const result = await syncDiscordPanel({ forceRecreate: true });
    if (!result.success && !result.skipped) {
      return res.status(400).json({ error: result.error || 'ไม่สามารถส่งหน้าจอเข้า Discord ได้' });
    }
    res.json({
      result,
      status: getDiscordBotStatus(),
      panel: buildDiscordPanelPayload(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/bot-settings/regenerate-key', (_req, res) => {
  const randomPart = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  const newKey = `mochi_bot_${randomPart}`;
  db.prepare('UPDATE bot_settings SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(newKey);
  const updated = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
  res.json({
    settings: updated,
    status: getDiscordBotStatus(),
    panel: buildDiscordPanelPayload(),
  });
});

// ทดลองกดปุ่ม 3 ตัว (รายจ่าย / รายรับ / โอนเงิน) และส่งฟอร์ม Modal (ใช้ได้ทั้งจากหน้าจำลองบนเว็บ และบอทภายนอก)
app.post('/api/bot/panel-modal-submit', async (req, res) => {
  try {
    const { type, title, amount, bank_account, category_or_target } = req.body;
    const created = recordPanelTransaction({
      type: type || 'expense',
      title,
      amount,
      bankAccountInput: bank_account,
      categoryOrTargetInput: category_or_target,
    });

    // รีเซ็ตหน้าจอ Panel ใน Discord ทุกครั้งที่มีการอัปเดต
    await syncDiscordPanel();

    res.json({
      success: true,
      transaction: created,
      panel: buildDiscordPanelPayload(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Endpoint สำหรับบอท Discord ภายนอกหรือเว็บอื่น ดึงหน้าจอ Panel แบบ GitHub + สรุปยอดเงินทั้งหมด
app.get(['/api/v1/summary', '/api/bot/panel-data', '/api/bot/summary'], requireBotApiKey, (req, res) => {
  logExternalApiCall('GET', req.path, req.headers['origin'] || 'External Web', 'ดึงข้อมูลสรุปยอดเงิน & ตาราง GitHub');
  res.json(buildDiscordPanelPayload());
});

// Endpoint หลักสำหรับให้ "เว็บอื่นๆ" ยิง API เพื่อส่งข้อความเข้า Discord หรือส่งรายการรายรับ-รายจ่ายเข้ามาบันทึกได้ทันที!
app.post(['/api/v1/send', '/api/bot/send'], requireBotApiKey, async (req, res) => {
  try {
    const {
      message,
      content,
      title,
      description,
      color,
      fields,
      channel_id,
      // หรือถ้าเว็บอื่นต้องการส่งรายการการเงินพร้อมกันด้วย:
      type,
      amount,
      bank_account,
      account_name,
      category,
      category_name,
      to_account_name,
      reset_panel,
    } = req.body;

    let recordedTx = null;
    if (amount && Number(amount) > 0) {
      recordedTx = recordPanelTransaction({
        type: type || 'expense',
        title: title || message || 'รายการจาก API ภายนอก',
        amount,
        bankAccountInput: bank_account || account_name,
        categoryOrTargetInput:
          type === 'transfer' ? to_account_name || category : category || category_name,
      });
    }

    let discordMessageResult = null;
    if (message || content || description || (title && !recordedTx)) {
      discordMessageResult = await sendCustomDiscordMessage({
        channel_id,
        message: message || content,
        title: recordedTx ? undefined : title,
        description,
        color,
        fields,
      });
    }

    if (recordedTx || reset_panel) {
      await syncDiscordPanel();
    }

    logExternalApiCall(
      'POST',
      req.path,
      req.headers['origin'] || 'External Web',
      recordedTx
        ? `บันทึกรายการ "${recordedTx.title}" ฿${recordedTx.amount}`
        : `ส่งข้อความ "${(message || content || title || '').slice(0, 40)}"`
    );

    res.json({
      success: true,
      transaction: recordedTx,
      discord_message: discordMessageResult,
      panel: buildDiscordPanelPayload(),
    });
  } catch (err) {
    logExternalApiCall('POST', req.path, req.headers['origin'] || 'External Web', err.message, 'ERROR');
    res.status(400).json({ error: err.message });
  }
});

// Endpoint สำหรับเว็บอื่นหรือบอทส่งข้อมูลรายการ (ชื่อ, จำนวนเงิน, ประเภทธนาคาร, ประเภทของ)
app.post(['/api/v1/transactions', '/api/bot/transactions'], requireBotApiKey, async (req, res) => {
  try {
    const {
      type = 'expense',
      title,
      amount,
      bank_account,
      account_name,
      category,
      category_name,
      to_account_name,
    } = req.body;

    const created = recordPanelTransaction({
      type,
      title,
      amount,
      bankAccountInput: bank_account || account_name,
      categoryOrTargetInput:
        type === 'transfer' ? to_account_name || category : category || category_name,
    });

    await syncDiscordPanel();

    logExternalApiCall(
      'POST',
      req.path,
      req.headers['origin'] || 'External Web',
      `บันทึก ${type}: "${created.title}" ฿${created.amount}`
    );

    res.json({
      success: true,
      transaction: created,
      panel: buildDiscordPanelPayload(),
    });
  } catch (err) {
    logExternalApiCall('POST', req.path, req.headers['origin'] || 'External Web', err.message, 'ERROR');
    res.status(400).json({ error: err.message });
  }
});

// ล้างข้อมูลทั้งหมดในระบบ (สำหรับเริ่มใช้งานใหม่ / ย้ายเข้า Docker ZimaOS)
app.post('/api/system/reset-data', (_req, res) => {
  try {
    stopDiscordGateway();
    resetAllData();
    recentExternalApiLogs.length = 0;

    // ล้างไฟล์อัปโหลดทดสอบในโฟลเดอร์ uploads/
    for (const sub of ['accounts', 'categories', 'slips']) {
      const subDir = path.join(uploadsDirectory, sub);
      if (fs.existsSync(subDir)) {
        for (const f of fs.readdirSync(subDir)) {
          try {
            fs.unlinkSync(path.join(subDir, f));
          } catch {}
        }
      }
    }

    res.json({
      success: true,
      settings: db.prepare('SELECT * FROM bot_settings WHERE id = 1').get(),
      status: getDiscordBotStatus(),
      panel: buildDiscordPanelPayload(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 9. QR CODE MOBILE IMAGE UPLOAD SYSTEM (สแกน QR ส่งรูปจากมือถือเข้าคอมแบบเรียลไทม์)
// ==========================================
const qrUploadSessions = new Map();

function getLocalLanIps() {
  const nets = os.networkInterfaces();
  const primary = [];
  const secondary = [];
  for (const name of Object.keys(nets)) {
    const lowerName = name.toLowerCase();
    const isVirtual =
      lowerName.includes('zerotier') ||
      lowerName.includes('tailscale') ||
      lowerName.includes('vmware') ||
      lowerName.includes('virtual') ||
      lowerName.includes('vethernet') ||
      lowerName.includes('wsl');
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('169.254.')) continue;
        if (!isVirtual && net.address.startsWith('192.168.')) {
          primary.push(net.address);
        } else {
          secondary.push(net.address);
        }
      }
    }
  }
  return [...primary, ...secondary];
}

app.post('/api/qr-upload/session', (req, res) => {
  const { target = 'slip' } = req.body || {};
  const now = Date.now();
  // ล้าง session เก่าที่เกิน 30 นาที
  for (const [k, v] of qrUploadSessions.entries()) {
    if (now - v.createdAt > 30 * 60 * 1000) qrUploadSessions.delete(k);
  }

  const sessionId = `qr_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  qrUploadSessions.set(sessionId, {
    id: sessionId,
    target,
    status: 'waiting',
    fileUrl: null,
    fileName: null,
    mimeType: null,
    createdAt: now,
  });

  res.json({
    sessionId,
    target,
    lanIps: getLocalLanIps(),
    port: PORT,
  });
});

app.get('/api/qr-upload/session/:id', (req, res) => {
  const session = qrUploadSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session expired or not found' });
  }
  res.json(session);
});

app.post('/api/qr-upload/session/:id/upload', (req, res) => {
  const session = qrUploadSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'รหัส QR นี้หมดอายุแล้ว กรุณากดเปิด QR ใหม่บนหน้าจอคอมครับ' });
  }

  const uploaderMap = {
    account: uploadAccountCover,
    category: uploadCategoryImage,
    attachment: uploadAttachmentImage,
    slip: uploadSlipImage,
  };
  const folderMap = {
    account: 'accounts',
    category: 'categories',
    attachment: 'attachments',
    slip: 'slips',
  };

  const uploader = (uploaderMap[session.target] || uploadSlipImage).single('image');
  uploader(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาเลือกรูปภาพก่อนกดส่ง' });
    }

    const folder = folderMap[session.target] || 'slips';
    const fileUrl = `/uploads/${folder}/${req.file.filename}`;
    session.status = 'uploaded';
    session.fileUrl = fileUrl;
    session.fileName = req.file.originalname || req.file.filename;
    session.mimeType = req.file.mimetype || 'image/png';

    // ถ้าเป็นการอัปโหลดเข้าคลังรูปหมวดหมู่ ให้บันทึกเข้า category_images ด้วย
    if (session.target === 'category') {
      try {
        db.prepare('INSERT INTO category_images (name, file_path) VALUES (?, ?)').run(
          session.fileName,
          fileUrl
        );
      } catch {}
    }

    res.json({
      success: true,
      fileUrl,
      fileName: session.fileName,
      mimeType: session.mimeType,
    });
  });
});

// หน้าเว็บสำหรับโทรศัพท์มือถือเมื่อสแกน QR Code
app.get('/m/upload/:id', (req, res) => {
  const session = qrUploadSessions.get(req.params.id);
  const labelMap = {
    slip: '🧾 แนบรูปสลิปโอนเงิน',
    attachment: '🖼️ แนบรูปภาพประกอบรายการ',
    account: '👛 อัปโหลดรูปปกบัญชี',
    category: '🏷️ อัปโหลดรูปหมวดหมู่',
  };
  const targetLabel = session ? labelMap[session.target] || '📸 อัปโหลดรูปภาพ' : '⚠️ QR Code หมดอายุ';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>MochiWallet 🍡 ส่งรูปเข้าคอม</title>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Mitr:wght@400;500;600&family=Prompt:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: 'Prompt', sans-serif;
      background: radial-gradient(circle at top, #FFF5F8 0%, #FFFDF9 55%, #F2FBF7 100%);
      color: #5C4B51;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: #FFFDF9;
      border: 3px solid #FFFFFF;
      border-radius: 28px;
      padding: 24px 20px;
      box-shadow: 0 12px 30px rgba(92, 75, 81, 0.08);
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: #FFD6E0;
      color: #5C4B51;
      font-family: 'Mitr', sans-serif;
      font-size: 13px;
      padding: 5px 14px;
      border-radius: 999px;
      margin-bottom: 10px;
      border: 2px solid #FFF;
    }
    h1 {
      font-family: 'Mitr', sans-serif;
      font-size: 21px;
      margin: 4px 0 6px;
    }
    p {
      font-size: 13px;
      color: #8E7C82;
      margin: 0 0 18px;
    }
    .btn-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    .pick-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 16px 10px;
      border-radius: 22px;
      border: 2px dashed #F4ACB7;
      background: #FFF5F8;
      color: #5C4B51;
      font-family: 'Mitr', sans-serif;
      font-size: 13px;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .pick-btn.gallery {
      border-color: #95D5B2;
      background: #F2FBF7;
    }
    .pick-btn:active { transform: scale(0.97); }
    .pick-btn span.icon { font-size: 28px; }
    #preview-box {
      display: none;
      margin-bottom: 16px;
      background: #FFF;
      padding: 10px;
      border-radius: 20px;
      border: 2px solid #F3EAE0;
    }
    #preview-img {
      width: 100%;
      max-height: 260px;
      object-fit: contain;
      border-radius: 14px;
    }
    .send-btn {
      width: 100%;
      padding: 14px;
      border-radius: 20px;
      border: 2px solid #FFF;
      background: #FFCAD4;
      color: #5C4B51;
      font-family: 'Mitr', sans-serif;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 4px 0 #F4ACB7;
      cursor: pointer;
      display: none;
    }
    .send-btn:disabled { opacity: 0.6; }
    .status {
      margin-top: 14px;
      padding: 12px;
      border-radius: 18px;
      font-size: 13px;
      font-weight: 600;
      display: none;
    }
    .status.ok { display: block; background: #D8F3DC; color: #1B4332; }
    .status.err { display: block; background: #FFE3E3; color: #9B2226; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:44px;margin-bottom:4px;">🐰📱</div>
    <div class="badge">${targetLabel}</div>
    <h1>ส่งรูปเข้าคอมพิวเตอร์</h1>
    <p>เลือกรูปสลิปหรือถ่ายภาพจากมือถือ แล้วกดส่งเข้าหน้าจอคอมได้ทันที!</p>

    ${
      !session
        ? '<div class="status err">⚠️ QR Code นี้หมดอายุแล้ว กรุณากดเปิด QR Code บนหน้าจอคอมใหม่อีกครั้งครับ</div>'
        : `
    <div class="btn-group">
      <label class="pick-btn">
        <span class="icon">📸</span>
        <span>ถ่ายรูปกล้อง</span>
        <input type="file" id="cam-input" accept="image/*" capture="environment" style="display:none" />
      </label>
      <label class="pick-btn gallery">
        <span class="icon">🖼️</span>
        <span>เลือกจากอัลบั้ม</span>
        <input type="file" id="gal-input" accept="image/*" style="display:none" />
      </label>
    </div>

    <div id="preview-box">
      <img id="preview-img" alt="Preview" />
      <div id="file-name" style="font-size:11px;color:#8E7C82;margin-top:6px;"></div>
    </div>

    <button id="send-btn" class="send-btn">✨ ส่งรูปเข้าหน้าจอคอมทันที</button>
    <div id="status-box" class="status"></div>
    `
    }
  </div>

  <script>
    const camInput = document.getElementById('cam-input');
    const galInput = document.getElementById('gal-input');
    const previewBox = document.getElementById('preview-box');
    const previewImg = document.getElementById('preview-img');
    const fileNameEl = document.getElementById('file-name');
    const sendBtn = document.getElementById('send-btn');
    const statusBox = document.getElementById('status-box');
    let selectedFile = null;

    function onPick(file) {
      if (!file) return;
      selectedFile = file;
      previewImg.src = URL.createObjectURL(file);
      fileNameEl.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
      previewBox.style.display = 'block';
      sendBtn.style.display = 'block';
      statusBox.className = 'status';
      statusBox.style.display = 'none';
    }

    if (camInput) camInput.addEventListener('change', (e) => onPick(e.target.files[0]));
    if (galInput) galInput.addEventListener('change', (e) => onPick(e.target.files[0]));

    if (sendBtn) {
      sendBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        sendBtn.disabled = true;
        sendBtn.textContent = '⏳ กำลังส่งรูปเข้าคอม...';
        try {
          const fd = new FormData();
          fd.append('image', selectedFile);
          const res = await fetch('/api/qr-upload/session/${req.params.id}/upload', {
            method: 'POST',
            body: fd
          });
          const data = await res.json();
          if (res.ok && data.success) {
            sendBtn.style.display = 'none';
            statusBox.className = 'status ok';
            statusBox.textContent = '🎉 ส่งรูปเข้าหน้าจอคอมพิวเตอร์สำเร็จแล้ว! ดูที่หน้าจอคอมได้เลยครับ';
          } else {
            throw new Error(data.error || 'อัปโหลดไม่สำเร็จ');
          }
        } catch (err) {
          sendBtn.disabled = false;
          sendBtn.textContent = '✨ ลองส่งใหม่อีกครั้ง';
          statusBox.className = 'status err';
          statusBox.textContent = '⚠️ ' + err.message;
        }
      });
    }
  </script>
</body>
</html>`);
});

// เริ่มเชื่อมต่อ Discord Bot Gateway อัตโนมัติถ้าตั้งค่า Token ไว้แล้ว
startDiscordGatewayIfConfigured();

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend build not found. Run npm run dev or npm run build.');
  });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🌸 Pastel Cozy Finance Server running at http://0.0.0.0:${PORT}`);
});

if (Number(PORT) !== 3002) {
  const secondaryServer = app.listen(3002, '0.0.0.0', () => {
    console.log('🌸 Pastel Cozy Finance Server also listening on port 3002');
  });
  secondaryServer.on('error', () => {});
}
