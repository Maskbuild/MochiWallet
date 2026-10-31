import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'finance.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function addColumnIfNotExists(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'bank',
      balance REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#FFD6E0',
      emoji TEXT NOT NULL DEFAULT '👛',
      cover_image TEXT,
      note TEXT,
      has_sub_accounts INTEGER NOT NULL DEFAULT 0,
      sub_accounts TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS category_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      color TEXT NOT NULL DEFAULT '#FFE0C8',
      icon_emoji TEXT NOT NULL DEFAULT '🍱',
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon_emoji TEXT NOT NULL DEFAULT '🏪',
      color TEXT NOT NULL DEFAULT '#D6ECFF',
      default_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'income' | 'expense' | 'transfer'
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      sub_account_id TEXT,
      to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      to_sub_account_id TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
      time_period TEXT DEFAULT 'afternoon', -- 'morning' | 'afternoon' | 'evening' | 'night'
      note TEXT,
      slip_image TEXT,
      attachment_image TEXT,
      transaction_date TEXT NOT NULL, -- YYYY-MM-DD
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      budget_scope TEXT NOT NULL DEFAULT 'overall', -- 'overall' | 'category'
      period_type TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'yearly' | 'trip'
      total_limit REAL NOT NULL DEFAULT 0,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      start_date TEXT,
      end_date TEXT,
      month_str TEXT, -- YYYY-MM
      year_str TEXT,  -- YYYY
      color TEXT NOT NULL DEFAULT '#E8DAFF',
      icon_emoji TEXT NOT NULL DEFAULT '🎯',
      sub_allocations TEXT DEFAULT '[]', -- JSON array of { category_id, limit_amount }
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      cycle_unit TEXT NOT NULL DEFAULT 'month', -- 'hour' | 'day' | 'month' | 'year'
      cycle_interval INTEGER NOT NULL DEFAULT 1,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL,
      icon_emoji TEXT NOT NULL DEFAULT '🎀',
      color TEXT NOT NULL DEFAULT '#FFD6E0',
      status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive' | 'cancelled'
      auto_deduct INTEGER NOT NULL DEFAULT 0,
      last_billed_at TEXT,
      next_billing_at TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL, -- 'create_tx' | 'create_transfer' | 'create_account'
      activity_date TEXT NOT NULL, -- YYYY-MM-DD
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bot_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      api_key TEXT NOT NULL,
      bot_token TEXT DEFAULT '',
      channel_id TEXT DEFAULT '',
      panel_message_id TEXT DEFAULT '',
      reset_mode TEXT DEFAULT 'recreate',
      auto_sync INTEGER NOT NULL DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migrations for existing database
  addColumnIfNotExists('accounts', 'has_sub_accounts', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfNotExists('accounts', 'sub_accounts', "TEXT DEFAULT '[]'");
  addColumnIfNotExists('transactions', 'sub_account_id', 'TEXT');
  addColumnIfNotExists('transactions', 'to_sub_account_id', 'TEXT');
  addColumnIfNotExists('transactions', 'time_period', "TEXT DEFAULT 'afternoon'");
  addColumnIfNotExists('transactions', 'attachment_image', 'TEXT');
  addColumnIfNotExists('bot_settings', 'bot_token', "TEXT DEFAULT ''");
  addColumnIfNotExists('bot_settings', 'channel_id', "TEXT DEFAULT ''");
  addColumnIfNotExists('bot_settings', 'panel_message_id', "TEXT DEFAULT ''");
  addColumnIfNotExists('bot_settings', 'reset_mode', "TEXT DEFAULT 'recreate'");
  addColumnIfNotExists('bot_settings', 'auto_sync', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfNotExists('bot_settings', 'selected_account', "TEXT DEFAULT ''");
  addColumnIfNotExists('bot_settings', 'selected_category', "TEXT DEFAULT ''");

  const botConfig = db.prepare('SELECT id FROM bot_settings WHERE id = 1').get();
  if (!botConfig) {
    db.prepare(`
      INSERT INTO bot_settings (id, api_key, bot_token, channel_id, panel_message_id, reset_mode, auto_sync)
      VALUES (1, 'mochi_bot_secret_key_2026', '', '', '', 'recreate', 1)
    `).run();
  }
}

export function resetAllData() {
  db.exec(`
    DELETE FROM transactions;
    DELETE FROM memberships;
    DELETE FROM budgets;
    DELETE FROM shops;
    DELETE FROM categories;
    DELETE FROM category_images;
    DELETE FROM accounts;
    DELETE FROM activity_logs;
    DELETE FROM sqlite_sequence;
    UPDATE bot_settings
    SET bot_token = '',
        channel_id = '',
        panel_message_id = '',
        selected_account = '',
        selected_category = '',
        reset_mode = 'recreate',
        auto_sync = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1;
  `);
}

function getLocalDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function seedInitialData() {
  const today = getLocalDateStr(0);
  const yesterday = getLocalDateStr(-1);
  const twoDaysAgo = getLocalDateStr(-2);
  const fiveDaysAgo = getLocalDateStr(-5);
  const currentMonth = today.slice(0, 7);
  const currentYear = today.slice(0, 4);

  const insertAcc = db.prepare(`
    INSERT INTO accounts (name, type, balance, color, emoji, note, has_sub_accounts, sub_accounts)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const accCash = insertAcc.run('กระเป๋าตังค์พกพา', 'cash', 3450, '#FFF2B2', '👛', '• เงินสดใช้จ่ายรายวัน\n• พกติดตัว', 0, '[]').lastInsertRowid;
  const accBank = insertAcc.run('บัญชีเงินเดือน KBank', 'bank', 42800, '#D4F5E9', '🏦', '• บัญชีหลักรับเงินเดือน\n• โอนจ่ายค่าใช้จ่ายประจำ', 0, '[]').lastInsertRowid;
  const accSave = insertAcc.run(
    'กระปุกออมหมูชมพู',
    'savings',
    85000,
    '#FFD6E0',
    '🐷',
    '• เงินเก็บฉุกเฉิน\n• กองทุนท่องเที่ยวต่างประเทศ',
    1,
    JSON.stringify([
      { id: 'sub-1', name: 'เงินสำรองฉุกเฉิน', emoji: '🛡️', color: '#D4F5E9', balance: 55000 },
      { id: 'sub-2', name: 'เก็บเที่ยวญี่ปุ่น', emoji: '✈️', color: '#FFE0C8', balance: 30000 }
    ])
  ).lastInsertRowid;

  const insertCat = db.prepare(`
    INSERT INTO categories (name, type, parent_id, color, icon_emoji)
    VALUES (?, ?, ?, ?, ?)
  `);
  const catFood = insertCat.run('อาหารและเครื่องดื่ม', 'expense', null, '#FFE0C8', '🍱').lastInsertRowid;
  const catCafe = insertCat.run('คาเฟ่และของหวาน', 'expense', catFood, '#FFD6E0', '🧁').lastInsertRowid;
  const catTransport = insertCat.run('เดินทางและน้ำมัน', 'expense', null, '#D6ECFF', '🚌').lastInsertRowid;
  const catShopping = insertCat.run('ช้อปปิ้งและของใช้', 'expense', null, '#E8DAFF', '🛍️').lastInsertRowid;
  const catSub = insertCat.run('สมาชิกและบริการรายเดือน', 'expense', null, '#FFF2B2', '🎀').lastInsertRowid;
  const catTrip = insertCat.run('ท่องเที่ยวและทริป', 'expense', null, '#D4F5E9', '✈️').lastInsertRowid;
  const catSalary = insertCat.run('เงินเดือนประจำ', 'income', null, '#D4F5E9', '💰').lastInsertRowid;
  insertCat.run('รายได้เสริม / ฟรีแลนซ์', 'income', null, '#FFF2B2', '✨');

  const insertShop = db.prepare(`
    INSERT INTO shops (name, icon_emoji, color, default_category_id, note)
    VALUES (?, ?, ?, ?, ?)
  `);
  const shop711 = insertShop.run('7-Eleven', '🏪', '#D4F5E9', catFood, '• ร้านสะดวกซื้อใกล้บ้าน').lastInsertRowid;
  const shopCafe = insertShop.run('Bunny Matcha Cafe', '🍵', '#FFD6E0', catCafe, '• ร้านมัทฉะและเค้กประจำ').lastInsertRowid;
  insertShop.run('Shopee / Lazada', '📦', '#FFE0C8', catShopping, '• ช้อปปิ้งออนไลน์');
  const shopBTS = insertShop.run('รถไฟฟ้า BTS / MRT', '🚆', '#D6ECFF', catTransport, '• เดินทางไปทำงาน').lastInsertRowid;

  const insertTx = db.prepare(`
    INSERT INTO transactions (type, title, amount, account_id, to_account_id, category_id, shop_id, time_period, note, transaction_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTx.run('income', 'เงินเดือนเข้าบัญชี', 45000, accBank, null, catSalary, null, 'morning', '• เงินเดือนประจำเดือนนี้', fiveDaysAgo);
  insertTx.run('transfer', 'แบ่งเงินออมเข้ากระปุกหมู', 5000, accBank, accSave, null, null, 'evening', '• ออมเงินประจำเดือน', twoDaysAgo);
  insertTx.run('expense', 'มัทฉะลาเต้ + สตรอว์เบอร์รีชอร์ตเค้ก', 245, accCash, null, catCafe, shopCafe, 'afternoon', '• มัทฉะลาเต้หวานน้อย\n• เค้กสตรอว์เบอร์รี 1 ชิ้น', yesterday);
  insertTx.run('expense', 'ซื้อของว่างและนมสด', 120, accCash, null, catFood, shop711, 'morning', '• นมสดพาสเจอร์ไรส์\n• แซนด์วิชแฮมชีส', today);
  insertTx.run('expense', 'เติมเที่ยวรถไฟฟ้า', 450, accBank, null, catTransport, shopBTS, 'morning', '• เดินทางรายสัปดาห์', today);

  const insertBudget = db.prepare(`
    INSERT INTO budgets (name, budget_scope, period_type, total_limit, category_id, start_date, end_date, month_str, year_str, color, icon_emoji, sub_allocations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBudget.run(
    'งบใช้จ่ายประจำเดือนนี้',
    'overall',
    'monthly',
    18000,
    null,
    null,
    null,
    currentMonth,
    currentYear,
    '#FFD6E0',
    '🌸',
    JSON.stringify([
      { category_id: Number(catFood), limit_amount: 6000 },
      { category_id: Number(catCafe), limit_amount: 1500 },
      { category_id: Number(catTransport), limit_amount: 2500 },
      { category_id: Number(catShopping), limit_amount: 4000 }
    ])
  );
  insertBudget.run(
    'คุมงบคาเฟ่ & ของหวาน',
    'category',
    'monthly',
    1500,
    catCafe,
    null,
    null,
    currentMonth,
    currentYear,
    '#FFE0C8',
    '🧁',
    '[]'
  );
  insertBudget.run(
    'ทริปเชียงใหม่หน้าหนาว 🏕️',
    'overall',
    'trip',
    12000,
    catTrip,
    getLocalDateStr(-3),
    getLocalDateStr(10),
    currentMonth,
    currentYear,
    '#D4F5E9',
    '✈️',
    JSON.stringify([
      { category_id: Number(catFood), limit_amount: 3500 },
      { category_id: Number(catTrip), limit_amount: 6500 },
      { category_id: Number(catShopping), limit_amount: 2000 }
    ])
  );

  const insertMem = db.prepare(`
    INSERT INTO memberships (name, amount, cycle_unit, cycle_interval, account_id, category_id, shop_id, icon_emoji, color, status, auto_deduct, last_billed_at, next_billing_at, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMem.run('YouTube Premium Family', 299, 'month', 1, accBank, catSub, null, '📺', '#FFD6E0', 'active', 0, yesterday, getLocalDateStr(29), '• หารกับที่บ้าน');
  insertMem.run('iCloud+ 200GB', 99, 'month', 1, accBank, catSub, null, '☁️', '#D6ECFF', 'active', 1, twoDaysAgo, getLocalDateStr(28), '• เก็บรูปภาพ');
  insertMem.run('Co-Working Space รายชั่วโมง', 60, 'hour', 1, accCash, catSub, null, '💻', '#FFF2B2', 'active', 0, today, today, '• คิดตามชั่วโมงที่นั่งทำงาน');
  insertMem.run('Disney+ Hotstar (รายปี)', 1590, 'year', 1, accBank, catSub, null, '🎬', '#E8DAFF', 'inactive', 0, fiveDaysAgo, null, '• พักการใช้งานไว้ก่อน');

  const insertLog = db.prepare(`
    INSERT INTO activity_logs (action_type, activity_date, detail)
    VALUES (?, ?, ?)
  `);
  insertLog.run('create_account', fiveDaysAgo, 'เปิดบัญชี กระเป๋าตังค์พกพา');
  insertLog.run('create_account', fiveDaysAgo, 'เปิดบัญชี บัญชีเงินเดือน KBank');
  insertLog.run('create_account', fiveDaysAgo, 'เปิดบัญชี กระปุกออมหมูชมพู');
  insertLog.run('create_tx', fiveDaysAgo, 'บันทึกรายรับ: เงินเดือนเข้าบัญชี');
  insertLog.run('create_transfer', twoDaysAgo, 'โอนเงิน: แบ่งเงินออมเข้ากระปุกหมู');
  insertLog.run('create_tx', yesterday, 'บันทึกรายจ่าย: มัทฉะลาเต้ + สตรอว์เบอร์รีชอร์ตเค้ก');
  insertLog.run('create_tx', today, 'บันทึกรายจ่าย: ซื้อของว่างและนมสด');
  insertLog.run('create_tx', today, 'บันทึกรายจ่าย: เติมเที่ยวรถไฟฟ้า');
}

export default db;
