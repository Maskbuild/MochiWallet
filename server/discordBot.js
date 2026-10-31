import zlib from 'node:zlib';
import db from './db.js';

const DISCORD_API = 'https://discord.com/api/v10';

let gatewayWs = null;
let heartbeatTimer = null;
let dayRolloverTimer = null;
let lastKnownDateStr = todayStr();
let lastSeq = null;
let activeToken = '';
let botStatus = {
  connected: false,
  botUser: null,
  lastError: null,
  lastSyncedAt: null,
};

// จำค่าที่ผู้ใช้กดเลือกจาก Dropdown บนหน้าจอ Panel ใน Discord (แยกตาม user id)
const userSelections = new Map();

// เก็บรายชื่อเซิร์ฟเวอร์และห้องแชทที่ได้รับจาก WebSocket Gateway (GUILD_CREATE) แบบเรียลไทม์
const gatewayGuildsMap = new Map();

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * สร้างตารางข้อมูล GitHub Activity Heatmap (52 สัปดาห์สำหรับรูป PNG และ 14 สัปดาห์สำหรับพรีวิว)
 */
export function getHeatmapMatrix(numWeeks = 28) {
  const logs = db
    .prepare(`
      SELECT activity_date, COUNT(*) as total_count
      FROM activity_logs
      GROUP BY activity_date
    `)
    .all();

  const map = {};
  let maxCount = 1;
  let totalActions = 0;
  for (const row of logs) {
    const cnt = Number(row.total_count || 0);
    map[row.activity_date] = cnt;
    totalActions += cnt;
    if (cnt > maxCount) maxCount = cnt;
  }

  const today = new Date();
  const endDay = new Date(today);
  const dayOfWeek = endDay.getDay();
  endDay.setDate(endDay.getDate() + (6 - dayOfWeek));

  const totalDays = numWeeks * 7;
  const startDay = new Date(endDay);
  startDay.setDate(endDay.getDate() - totalDays + 1);

  const weeks = [];
  const cursor = new Date(startDay);
  for (let w = 0; w < numWeeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isFuture = cursor > today;
      const count = isFuture ? -1 : map[dateStr] || 0;
      week.push({ dateStr, count });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return {
    weeks,
    maxCount,
    totalActions,
    activeDays: Object.keys(map).length,
  };
}

// ==========================================
// PURE NODE.JS PNG GENERATOR FOR GITHUB HEATMAP CARD
// วาดการ์ดตาราง GitHub สีพาสเทลคมชัดสูง (มุมโค้งมน) สำหรับแนบใน Discord Embed
// ==========================================
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(typeStr, dataBuf) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const crcInput = Buffer.concat([typeBuf, dataBuf]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function encodeRgbaToPng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type 0
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 6 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', idat),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function fillRoundedRect(rgba, imgW, imgH, x, y, w, h, radius, r, g, b, a = 255) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(imgW - 1, Math.floor(x + w - 1));
  const y1 = Math.min(imgH - 1, Math.floor(y + h - 1));

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      let dx = 0;
      let dy = 0;
      if (px < x + radius) dx = x + radius - px;
      else if (px > x + w - 1 - radius) dx = px - (x + w - 1 - radius);
      if (py < y + radius) dy = y + radius - py;
      else if (py > y + h - 1 - radius) dy = py - (y + h - 1 - radius);

      if (dx > 0 && dy > 0) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius + 0.5) continue;
      }

      const idx = (py * imgW + px) * 4;
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }
}

export function generateGithubHeatmapPngBuffer() {
  const numWeeks = 28;
  const { weeks, maxCount } = getHeatmapMatrix(numWeeks);

  const cellSize = 18;
  const gap = 5;
  const padX = 24;
  const padY = 22;

  const gridW = numWeeks * cellSize + (numWeeks - 1) * gap;
  const gridH = 7 * cellSize + 6 * gap;
  const width = padX * 2 + gridW;
  const height = padY * 2 + gridH + 26; // extra bottom space for legend bar

  const rgba = Buffer.alloc(width * height * 4, 0);

  // Outer card background: Pastel Dark Cozy (#232428) or Warm Cream (#FFFDF9)
  // Using Warm Pastel Cream card (#FFF9F2) with soft pink border (#FFD6E0) so it pops beautifully in Discord!
  fillRoundedRect(rgba, width, height, 0, 0, width, height, 18, 255, 214, 224, 255); // Border #FFD6E0
  fillRoundedRect(rgba, width, height, 3, 3, width - 6, height - 6, 15, 255, 251, 245, 255); // Inner #FFFBF5

  function pickRgb(cnt) {
    if (cnt < 0) return [246, 240, 232]; // Future (#F6F0E8)
    if (cnt === 0) return [235, 226, 213]; // Empty 0 (#EBE2D5)
    const ratio = cnt / maxCount;
    if (ratio <= 0.25) return [183, 228, 199]; // ≤25% Pastel Mint (#B7E4C7)
    if (ratio <= 0.5) return [116, 198, 157]; // ≤50% Mint (#74C69D)
    if (ratio <= 0.75) return [255, 179, 198]; // ≤75% Pastel Pink (#FFB3C6)
    return [255, 117, 143]; // 76-100% Rose Pink (#FF758F)
  }

  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cell = weeks[w][d];
      const [r, g, b] = pickRgb(cell.count);
      const cx = padX + w * (cellSize + gap);
      const cy = padY + d * (cellSize + gap);
      fillRoundedRect(rgba, width, height, cx, cy, cellSize, cellSize, 5, r, g, b, 255);
    }
  }

  // Bottom mini legend squares (5 levels centered on bottom right)
  const legendColors = [
    [235, 226, 213],
    [183, 228, 199],
    [116, 198, 157],
    [255, 179, 198],
    [255, 117, 143],
  ];
  const legY = padY + gridH + 10;
  let legX = width - padX - legendColors.length * 18;
  for (const [r, g, b] of legendColors) {
    fillRoundedRect(rgba, width, height, legX, legY, 13, 13, 4, r, g, b, 255);
    legX += 18;
  }

  return encodeRgbaToPng(width, height, rgba);
}

/**
 * สร้างตาราง Emoji สำหรับพรีวิวบนหน้าเว็บ (จัดระยะเท่ากันทุกบรรทัด 100%)
 */
export function buildGithubEmojiGrid(numWeeks = 14) {
  const { weeks, maxCount, totalActions, activeDays } = getHeatmapMatrix(numWeeks);

  function levelEmoji(cnt) {
    if (cnt < 0) return '⬛';
    if (cnt === 0) return '⬜';
    const ratio = cnt / maxCount;
    if (ratio <= 0.25) return '🟩';
    if (ratio <= 0.5) return '🟨';
    if (ratio <= 0.75) return '🟧';
    return '🟥';
  }

  // ใช้ตัวย่อภาษาอังกฤษ 3 ตัวอักษรเท่ากันเป๊ะ (SUN..SAT) เพื่อไม่ให้สระภาษาไทยทำตารางใน Discord เบี้ยว
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const rows = [];
  for (let d = 0; d < 7; d++) {
    const cells = weeks.map((w) => levelEmoji(w[d].count)).join(' ');
    rows.push(`${dayNames[d]}  ${cells}`);
  }

  return {
    gridText: rows.join('\n'),
    maxCount,
    totalActions,
    activeDays,
  };
}

/**
 * สร้างข้อมูล Dashboard Panel (Embed + Dropdown เลือกบัญชี/หมวดหมู่ + 3 ปุ่มกด: รายจ่าย / รายรับ / โอนเงิน)
 */
export function buildDiscordPanelPayload() {
  const accounts = db.prepare('SELECT * FROM accounts ORDER BY id ASC').all();
  const categories = db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
  const cfg = db.prepare('SELECT selected_account, selected_category FROM bot_settings WHERE id = 1').get() || {};
  const totalNetWorth = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  const today = todayStr();
  const monthPrefix = today.slice(0, 7);

  const monthIncome = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND transaction_date LIKE ?"
    )
    .get(`${monthPrefix}%`).total;

  const monthExpense = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND transaction_date LIKE ?"
    )
    .get(`${monthPrefix}%`).total;

  const totalAllIncome = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'")
    .get().total;

  const totalAllExpense = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'")
    .get().total;

  const recentTx = db
    .prepare(`
      SELECT t.*, a.name as account_name, a.emoji as account_emoji,
             ta.name as to_account_name, ta.emoji as to_account_emoji,
             c.name as category_name, c.icon_emoji as category_emoji
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts ta ON t.to_account_id = ta.id
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.transaction_date DESC, t.id DESC
      LIMIT 5
    `)
    .all();

  const heatmap = buildGithubEmojiGrid(12);

  const accountLines =
    accounts.length > 0
      ? accounts
          .map((a, idx) => {
            const typeLabel =
              a.type === 'cash'
                ? 'เงินสด'
                : a.type === 'savings'
                ? 'เงินออม'
                : a.type === 'ewallet'
                ? 'E-Wallet'
                : 'ธนาคาร';
            return `> \`#${idx + 1}\` ${a.emoji || '👛'} **${a.name}** *(${typeLabel})* ➔ **\`฿${Number(
              a.balance || 0
            ).toLocaleString('th-TH', { minimumFractionDigits: 2 })}\`**`;
          })
          .join('\n')
      : '> ยังไม่มีบัญชีในระบบ';

  const recentLines =
    recentTx.length > 0
      ? recentTx
          .map((t) => {
            const badge = t.type === 'income' ? '🟢 `+`' : t.type === 'expense' ? '🔴 `-`' : '🔵 `⇄`';
            const detail =
              t.type === 'transfer'
                ? `${t.account_name || '-'} ➔ ${t.to_account_name || '-'}`
                : `${t.category_emoji || '🏷️'} ${t.category_name || 'ทั่วไป'} • ${t.account_name || '-'}`;
            return `${badge} **฿${Number(t.amount).toLocaleString('th-TH', {
              minimumFractionDigits: 2,
            })}** — **${t.title}** *(${detail})*`;
          })
          .join('\n')
      : '> *ยังไม่มีรายการบันทึก กดปุ่มด้านล่างเพื่อเริ่มจดได้เลย!*';

  const netMonth = monthIncome - monthExpense;

  const embed = {
    author: {
      name: 'MochiWallet 🍡 • สมุดบันทึกการเงินพาสเทล (Live Panel)',
    },
    title: '📊 กระดานสรุปยอดเงิน & ตารางความสม่ำเสมอ',
    description: [
      '```yaml',
      `💎 จำนวนเงินทั้งหมดทุกกระเป๋า : ฿${Number(totalNetWorth).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
      })} บาท`,
      '```',
      'เลือก **บัญชีธนาคาร** และ **ประเภทของ** จากเมนูด้านล่าง แล้วกดปุ่ม **🧁 รายจ่าย / 💰 รายรับ / 🔄 โอนเงิน** ได้เลย!',
    ].join('\n'),
    color: 0xffb3c6,
    fields: [
      {
        name: `💰 รายรับเดือนนี้ (${monthPrefix})`,
        value: `\`\`\`diff\n+ ฿${Number(monthIncome).toLocaleString('th-TH', {
          minimumFractionDigits: 2,
        })}\n\`\`\`สะสมรวม: \`฿${Number(totalAllIncome).toLocaleString()}\``,
        inline: true,
      },
      {
        name: `🧁 รายจ่ายเดือนนี้ (${monthPrefix})`,
        value: `\`\`\`diff\n- ฿${Number(monthExpense).toLocaleString('th-TH', {
          minimumFractionDigits: 2,
        })}\n\`\`\`สะสมรวม: \`฿${Number(totalAllExpense).toLocaleString()}\``,
        inline: true,
      },
      {
        name: '✨ คงเหลือสุทธิเดือนนี้',
        value: `\`\`\`fix\n${netMonth >= 0 ? '+' : ''}฿${Number(netMonth).toLocaleString('th-TH', {
          minimumFractionDigits: 2,
        })}\n\`\`\`สถานะ: \`${netMonth >= 0 ? 'สมดุลดีเยี่ยม 🌸' : 'รายจ่ายเกินรับ ⚠️'}\``,
        inline: true,
      },
      {
        name: '👛 กระเป๋าเงิน & ประเภทธนาคาร',
        value: accountLines,
        inline: false,
      },
      {
        name: '📝 5 รายการบันทึกล่าสุด',
        value: recentLines,
        inline: false,
      },
      {
        name: `🌱 ตารางบันทึกแบบ GitHub (สูงสุด/วัน: ${heatmap.maxCount} ครั้ง • รวม ${heatmap.totalActions} กิจกรรม • ใช้งาน ${heatmap.activeDays} วัน)`,
        value: '*(แสดงกราฟตารางสีพาสเทลด้านล่าง — ⬜ `0` • 🟩 `≤25%` • 🌿 `≤50%` • 🩷 `≤75%` • 🌸 `76-100%`)*',
        inline: false,
      },
    ],
    image: {
      url: 'attachment://mochi-heatmap.png',
    },
    footer: {
      text: `MochiWallet 🍡 • รีเซ็ตและอัปเดตล่าสุดเมื่อ ${new Date().toLocaleString('th-TH')}`,
    },
    timestamp: new Date().toISOString(),
  };

  // สร้าง Components:
  // แถวที่ 1: Dropdown เลือกประเภทธนาคาร / บัญชี (ช่วยให้ไม่ต้องพิมพ์เอง!)
  // แถวที่ 2: Dropdown เลือกประเภทของ / หมวดหมู่
  // แถวที่ 3: ปุ่มกด 3 ตัว (🧁 รายจ่าย, 💰 รายรับ, 🔄 โอนเงิน)
  const components = [];

  if (accounts.length > 0) {
    const activeAccName = cfg.selected_account || accounts[0]?.name || '';
    components.push({
      type: 1,
      components: [
        {
          type: 3, // String Select Menu
          custom_id: 'mochi_select_account',
          placeholder: '👛 เลือกประเภทธนาคาร / กระเป๋าเงินที่จะใช้',
          options: accounts.slice(0, 25).map((a) => ({
            label: `${a.name} (${
              a.type === 'cash'
                ? 'เงินสด'
                : a.type === 'savings'
                ? 'เงินออม'
                : a.type === 'ewallet'
                ? 'E-Wallet'
                : 'ธนาคาร'
            })`,
            value: a.name,
            description: `ยอดคงเหลือปัจจุบัน: ฿${Number(a.balance || 0).toLocaleString('th-TH', {
              minimumFractionDigits: 2,
            })}`,
            emoji: { name: a.emoji || '👛' },
            default: a.name === activeAccName,
          })),
        },
      ],
    });
  }

  if (categories.length > 0) {
    const activeCatName = cfg.selected_category || categories[0]?.name || '';
    components.push({
      type: 1,
      components: [
        {
          type: 3, // String Select Menu
          custom_id: 'mochi_select_category',
          placeholder: '🏷️ เลือกประเภทของ / หมวดหมู่ล่วงหน้า',
          options: categories.slice(0, 25).map((c) => ({
            label: c.name,
            value: c.name,
            description: c.type === 'income' ? 'หมวดหมู่รายรับ' : 'หมวดหมู่รายจ่าย',
            emoji: { name: c.icon_emoji || '🏷️' },
            default: c.name === activeCatName,
          })),
        },
      ],
    });
  }

  // แถวปุ่มกด 3 ตัว: รายจ่าย, รายรับ, โอนเงิน
  components.push({
    type: 1,
    components: [
      {
        type: 2,
        style: 4, // Danger (Red/Pink)
        label: 'รายจ่าย',
        emoji: { name: '🧁' },
        custom_id: 'mochi_btn_expense',
      },
      {
        type: 2,
        style: 3, // Success (Green)
        label: 'รายรับ',
        emoji: { name: '💰' },
        custom_id: 'mochi_btn_income',
      },
      {
        type: 2,
        style: 1, // Primary (Blue)
        label: 'โอนเงิน',
        emoji: { name: '🔄' },
        custom_id: 'mochi_btn_transfer',
      },
    ],
  });

  return {
    embeds: [embed],
    components,
    summaryData: {
      totalNetWorth,
      monthIncome,
      monthExpense,
      totalAllIncome,
      totalAllExpense,
      accounts,
      recentTx,
      heatmap,
    },
  };
}

/**
 * สร้างหน้าจอ Pop-up Modal ของ Discord เมื่อกดปุ่ม รายจ่าย / รายรับ / โอนเงิน
 * พร้อมดึงค่าที่ผู้ใช้เลือกไว้ใน Dropdown มาใส่ในช่องให้อัตโนมัติ (แก้หรือพิมพ์ทับได้ทันที)
 */
function buildTransactionModal(txType, userId) {
  const accounts = db.prepare('SELECT name, type FROM accounts ORDER BY id ASC').all();
  const categories = db
    .prepare('SELECT name FROM categories WHERE type = ? ORDER BY id ASC')
    .all(txType === 'income' ? 'income' : 'expense');

  const cfg =
    db.prepare('SELECT selected_account, selected_category FROM bot_settings WHERE id = 1').get() ||
    {};
  const saved = userSelections.get(userId) || {};

  const defaultAccount =
    saved.account || cfg.selected_account || accounts[0]?.name || '';
  const defaultCategory =
    txType === 'transfer'
      ? accounts.find((a) => a.name !== defaultAccount)?.name || accounts[0]?.name || ''
      : saved.category || cfg.selected_category || categories[0]?.name || '';

  // ใช้ nonce ใน custom_id เพื่อป้องกัน Discord จำค่าเก่าค้างไว้ในแคช (Modal Draft Cache)
  const nonce = Date.now().toString(36);

  const modalTitle =
    txType === 'income'
      ? '💰 บันทึกรายรับใหม่'
      : txType === 'transfer'
      ? '🔄 โอนเงินระหว่างบัญชี'
      : '🧁 บันทึกรายจ่ายใหม่';

  return {
    type: 9, // MODAL
    data: {
      custom_id: `mochi_modal_${txType}__${nonce}`,
      title: modalTitle,
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: `field_title__${nonce}`,
              label: '1. ชื่อรายการ',
              style: 1,
              placeholder:
                txType === 'income'
                  ? 'เช่น เงินเดือน, รายได้เสริม'
                  : txType === 'transfer'
                  ? 'เช่น โอนเงินออม, ย้ายเข้ากระเป๋าเงินสด'
                  : 'เช่น มัทฉะลาเต้, ข้าวผัดกะเพรา',
              required: true,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: `field_amount__${nonce}`,
              label: '2. จำนวนเงิน (บาท)',
              style: 1,
              placeholder: 'เช่น 120 หรือ 500.00',
              required: true,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: `field_bank_account__${nonce}`,
              label:
                txType === 'transfer'
                  ? '3. ประเภทธนาคาร / บัญชีต้นทาง'
                  : '3. ประเภทธนาคาร / ชื่อบัญชี',
              style: 1,
              value: defaultAccount,
              placeholder: 'ชื่อบัญชี หรือพิมพ์ เงินสด / ธนาคาร / เงินออม',
              required: true,
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: `field_category_or_target__${nonce}`,
              label:
                txType === 'transfer'
                  ? '4. ไปยังประเภทธนาคาร / บัญชีปลายทาง'
                  : '4. ประเภทของ / หมวดหมู่',
              style: 1,
              value: defaultCategory,
              placeholder:
                txType === 'transfer'
                  ? 'พิมพ์ชื่อบัญชีปลายทางที่รับโอน'
                  : 'เช่น อาหาร, คาเฟ่, เดินทาง, ของใช้',
              required: true,
            },
          ],
        },
      ],
    },
  };
}

function resolveAccountByInput(inputStr, fallbackIndex = 0) {
  const all = db.prepare('SELECT * FROM accounts ORDER BY id ASC').all();
  if (all.length === 0) return null;
  if (!inputStr || !inputStr.trim()) return all[fallbackIndex] || all[0];

  const q = inputStr.trim().toLowerCase();

  const byName = all.find((a) => a.name.toLowerCase().includes(q));
  if (byName) return byName;

  if (q.includes('สด') || q.includes('cash') || q.includes('พกพา')) {
    const found = all.find((a) => a.type === 'cash');
    if (found) return found;
  }
  if (q.includes('ธนาคาร') || q.includes('bank') || q.includes('kbank') || q.includes('scb')) {
    const found = all.find((a) => a.type === 'bank');
    if (found) return found;
  }
  if (q.includes('ออม') || q.includes('เก็บ') || q.includes('saving') || q.includes('หมู')) {
    const found = all.find((a) => a.type === 'savings');
    if (found) return found;
  }
  if (q.includes('wallet') || q.includes('วอลเล็ท') || q.includes('บัตร')) {
    const found = all.find((a) => a.type === 'ewallet');
    if (found) return found;
  }

  const idx = parseInt(q.replace('#', ''), 10);
  if (!Number.isNaN(idx) && idx >= 1 && idx <= all.length) {
    return all[idx - 1];
  }

  return all[fallbackIndex] || all[0];
}

function resolveOrCreateCategory(inputStr, txType) {
  if (txType === 'transfer') return null;
  const catType = txType === 'income' ? 'income' : 'expense';
  const all = db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY id ASC').all(catType);
  if (!inputStr || !inputStr.trim()) return all[0]?.id || null;

  const q = inputStr.trim();
  const found = all.find((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  if (found) return found.id;

  const created = db
    .prepare(`INSERT INTO categories (name, type, color, icon_emoji) VALUES (?, ?, ?, ?)`)
    .run(q, catType, catType === 'income' ? '#D4F5E9' : '#FFD6E0', catType === 'income' ? '💰' : '🛍️');
  return Number(created.lastInsertRowid);
}

export function recordPanelTransaction({
  type = 'expense',
  title,
  amount,
  bankAccountInput,
  categoryOrTargetInput,
}) {
  const numAmount = parseFloat(String(amount).replace(/,/g, ''));
  if (!numAmount || numAmount <= 0) {
    throw new Error('กรุณากรอกจำนวนเงินที่มากกว่า 0');
  }

  const fromAcc = resolveAccountByInput(bankAccountInput, 0);
  if (!fromAcc) {
    throw new Error('ยังไม่มีบัญชีในระบบ กรุณาสร้างบัญชีก่อน');
  }

  let toAcc = null;
  let categoryId = null;

  if (type === 'transfer') {
    toAcc = resolveAccountByInput(categoryOrTargetInput, 1);
  } else {
    categoryId = resolveOrCreateCategory(categoryOrTargetInput, type);
  }

  const txDate = todayStr();
  const cleanTitle = (title || '').trim() || (type === 'transfer' ? 'โอนเงิน' : 'รายการบันทึก');

  const result = db
    .prepare(`
      INSERT INTO transactions (type, title, amount, account_id, to_account_id, category_id, note, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      type,
      cleanTitle,
      numAmount,
      fromAcc.id,
      toAcc ? toAcc.id : null,
      categoryId,
      `• บัญชี: ${fromAcc.name}\n• หมวดหมู่/ปลายทาง: ${categoryOrTargetInput || '-'}`,
      txDate
    );

  if (type === 'income') {
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(numAmount, fromAcc.id);
    db.prepare('INSERT INTO activity_logs (action_type, activity_date, detail) VALUES (?, ?, ?)').run(
      'create_tx',
      txDate,
      `รายรับ: ${cleanTitle}`
    );
  } else if (type === 'expense') {
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(numAmount, fromAcc.id);
    db.prepare('INSERT INTO activity_logs (action_type, activity_date, detail) VALUES (?, ?, ?)').run(
      'create_tx',
      txDate,
      `รายจ่าย: ${cleanTitle}`
    );
  } else if (type === 'transfer' && toAcc) {
    db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(numAmount, fromAcc.id);
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(numAmount, toAcc.id);
    db.prepare('INSERT INTO activity_logs (action_type, activity_date, detail) VALUES (?, ?, ?)').run(
      'create_transfer',
      txDate,
      `โอนเงิน: ${cleanTitle}`
    );
  }

  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * สร้าง Multipart FormData พร้อมแนบรูป PNG ตาราง GitHub สีพาสเทลคมชัดสูง
 */
function buildDiscordMultipartFormData(payload) {
  const pngBuffer = generateGithubHeatmapPngBuffer();
  const form = new FormData();
  form.append(
    'payload_json',
    JSON.stringify({
      embeds: payload.embeds,
      components: payload.components,
      attachments: [{ id: 0, filename: 'mochi-heatmap.png' }],
    })
  );
  form.append(
    'files[0]',
    new Blob([pngBuffer], { type: 'image/png' }),
    'mochi-heatmap.png'
  );
  return form;
}

/**
 * เลือกห้องแชทอัตโนมัติ (เช่น #mochi-wallet หรือห้องแรกในเซิร์ฟเวอร์) หากผู้ใช้ใส่ ID ผิดหรือเว้นว่างไว้
 */
async function resolveFallbackChannelId(currentChannelId) {
  const discovery = await fetchBotAccessibleChannels();
  const list = discovery.channels || [];
  if (list.length === 0) return null;

  if (currentChannelId && list.some((c) => c.id === currentChannelId)) {
    return currentChannelId;
  }

  const preferred =
    list.find((c) => /mochi|wallet|การเงิน|บัญชี/i.test(c.name)) ||
    list.find((c) => /general|พูดคุย|ทั่วไป/i.test(c.name)) ||
    list[0];

  if (preferred?.id) {
    db.prepare(
      'UPDATE bot_settings SET channel_id = ?, panel_message_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
    ).run(preferred.id, '');
    return preferred.id;
  }
  return null;
}

/**
 * รีเซ็ต / อัปเดตหน้าจอ Panel ในห้อง Discord ทุกครั้งที่มีการเปลี่ยนแปลงข้อมูล
 */
export async function syncDiscordPanel({ forceRecreate = false } = {}) {
  const cfg = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
  if (!cfg || !cfg.bot_token) {
    return { skipped: true, reason: 'ยังไม่ได้ตั้งค่า Bot Token' };
  }

  const token = cfg.bot_token.trim();
  let channelId = (cfg.channel_id || '').trim();

  if (!channelId) {
    const autoCh = await resolveFallbackChannelId('');
    if (autoCh) channelId = autoCh;
  }

  if (!channelId) {
    return { skipped: true, reason: 'ยังไม่ได้ตั้งค่า Channel ID' };
  }

  const payload = buildDiscordPanelPayload();
  const authHeader = { Authorization: `Bot ${token}` };

  try {
    const shouldRecreate = forceRecreate || cfg.reset_mode === 'recreate' || !cfg.panel_message_id;

    if (shouldRecreate) {
      if (cfg.panel_message_id) {
        try {
          await fetch(`${DISCORD_API}/channels/${channelId}/messages/${cfg.panel_message_id}`, {
            method: 'DELETE',
            headers: authHeader,
          });
        } catch {}
      }

      let form = buildDiscordMultipartFormData(payload);
      let createRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: authHeader,
        body: form,
      });

      let createdData = await createRes.json();

      // หากผู้ใช้เผลอใส่ Application ID หรือ Server ID แทนที่จะเป็น Channel ID (Unknown Channel) ให้สลับไปใช้ห้องแชทในเซิร์ฟเวอร์อัตโนมัติ
      if (!createRes.ok && (createdData?.code === 10003 || createRes.status === 404)) {
        const fallbackId = await resolveFallbackChannelId('');
        if (fallbackId && fallbackId !== channelId) {
          channelId = fallbackId;
          form = buildDiscordMultipartFormData(payload);
          createRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
            method: 'POST',
            headers: authHeader,
            body: form,
          });
          createdData = await createRes.json();
        }
      }

      if (!createRes.ok) {
        const errMsg = createdData?.message || `Discord API HTTP ${createRes.status}`;
        botStatus.lastError = errMsg;
        throw new Error(errMsg);
      }

      db.prepare(
        'UPDATE bot_settings SET channel_id = ?, panel_message_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
      ).run(channelId, createdData.id);
      botStatus.lastSyncedAt = new Date().toISOString();
      botStatus.lastError = null;
      return { success: true, mode: 'reset_recreated', channel_id: channelId, message_id: createdData.id };
    } else {
      const form = buildDiscordMultipartFormData(payload);
      const editRes = await fetch(
        `${DISCORD_API}/channels/${channelId}/messages/${cfg.panel_message_id}`,
        {
          method: 'PATCH',
          headers: authHeader,
          body: form,
        }
      );

      if (editRes.ok) {
        const editedData = await editRes.json();
        botStatus.lastSyncedAt = new Date().toISOString();
        botStatus.lastError = null;
        return { success: true, mode: 'edited', channel_id: channelId, message_id: editedData.id };
      }

      return await syncDiscordPanel({ forceRecreate: true });
    }
  } catch (err) {
    botStatus.lastError = err.message;
    console.error('syncDiscordPanel error:', err.message);
    return { success: false, error: err.message };
  }
}

export function startDiscordGatewayIfConfigured() {
  // ตั้งเวลาตรวจจับเมื่อข้ามวันใหม่ (00:00 น.) เพื่อรีเซ็ตตาราง GitHub และยอดรายเดือนใน Discord อัตโนมัติ
  if (!dayRolloverTimer) {
    dayRolloverTimer = setInterval(() => {
      const currentDay = todayStr();
      if (currentDay !== lastKnownDateStr) {
        lastKnownDateStr = currentDay;
        syncDiscordPanel().catch(() => {});
      }
    }, 60 * 1000);
  }

  const cfg = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
  const token = cfg?.bot_token?.trim() || '';

  if (!token) {
    stopDiscordGateway();
    return;
  }

  if (gatewayWs && activeToken === token && botStatus.connected) {
    return;
  }

  stopDiscordGateway();
  activeToken = token;

  try {
    const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
    gatewayWs = ws;

    ws.addEventListener('message', async (event) => {
      try {
        const packet = JSON.parse(event.data.toString());
        const { op, d, s, t } = packet;
        if (s) lastSeq = s;

        if (op === 10) {
          const interval = d.heartbeat_interval || 41250;
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          heartbeatTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 1, d: lastSeq }));
            }
          }, interval);

          ws.send(
            JSON.stringify({
              op: 2,
              d: {
                token,
                intents: 1,
                properties: {
                  os: 'linux',
                  browser: 'mochiwallet',
                  device: 'mochiwallet',
                },
              },
            })
          );
        }

        if (op === 0) {
          if (t === 'READY') {
            botStatus.connected = true;
            botStatus.botUser = d.user
              ? `${d.user.username}${
                  d.user.discriminator && d.user.discriminator !== '0'
                    ? `#${d.user.discriminator}`
                    : ''
                }`
              : 'Connected';
            botStatus.lastError = null;
            console.log(`🤖 Discord Bot Connected as ${botStatus.botUser}`);
          }

          if (t === 'GUILD_CREATE' || t === 'GUILD_UPDATE') {
            if (d?.id) {
              gatewayGuildsMap.set(d.id, {
                id: d.id,
                name: d.name || 'Discord Server',
                channels: Array.isArray(d.channels) ? d.channels : [],
              });
              const currentCfg = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
              if (currentCfg && (!currentCfg.panel_message_id || botStatus.lastError)) {
                syncDiscordPanel({ forceRecreate: true }).catch(() => {});
              }
            }
          }

          if (t === 'CHANNEL_CREATE' || t === 'CHANNEL_UPDATE') {
            if (d?.guild_id && gatewayGuildsMap.has(d.guild_id)) {
              const g = gatewayGuildsMap.get(d.guild_id);
              const idx = g.channels.findIndex((c) => c.id === d.id);
              if (idx >= 0) g.channels[idx] = d;
              else g.channels.push(d);
            }
          }

          if (t === 'INTERACTION_CREATE') {
            await handleDiscordInteraction(d, token);
          }
        }
      } catch (err) {
        console.error('Gateway packet error:', err.message);
      }
    });

    ws.addEventListener('close', (ev) => {
      botStatus.connected = false;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (ev.code === 4004) {
        botStatus.lastError = 'Bot Token ไม่ถูกต้อง (Authentication Failed 4004)';
      }
    });

    ws.addEventListener('error', () => {
      botStatus.connected = false;
    });
  } catch (err) {
    botStatus.lastError = err.message;
  }
}

export function stopDiscordGateway() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (gatewayWs) {
    try {
      gatewayWs.close();
    } catch {}
    gatewayWs = null;
  }
  gatewayGuildsMap.clear();
  botStatus.connected = false;
  botStatus.botUser = null;
}

async function handleDiscordInteraction(interaction, token) {
  const headers = {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  };
  const callbackUrl = `${DISCORD_API}/interactions/${interaction.id}/${interaction.token}/callback`;
  const userId = interaction.member?.user?.id || interaction.user?.id || 'default';

  // กรณีเลือก Dropdown (Select Menu) บัญชี หรือ หมวดหมู่
  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id || '';

    if (customId === 'mochi_select_account' || customId === 'mochi_select_category') {
      const selectedVal = interaction.data?.values?.[0] || '';
      const current = userSelections.get(userId) || {};
      if (customId === 'mochi_select_account') {
        current.account = selectedVal;
        db.prepare('UPDATE bot_settings SET selected_account = ? WHERE id = 1').run(selectedVal);
      } else {
        current.category = selectedVal;
        db.prepare('UPDATE bot_settings SET selected_category = ? WHERE id = 1').run(selectedVal);
      }
      userSelections.set(userId, current);

      await fetch(callbackUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 6 }),
      });
      return;
    }

    // กรณีกดปุ่ม 1 ใน 3 ตัว (🧁 รายจ่าย / 💰 รายรับ / 🔄 โอนเงิน) -> เปิด Modal พร้อมค่าที่เลือกไว้
    let txType = 'expense';
    if (customId === 'mochi_btn_income') txType = 'income';
    else if (customId === 'mochi_btn_transfer') txType = 'transfer';

    const modalPayload = buildTransactionModal(txType, userId);
    await fetch(callbackUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(modalPayload),
    });
    return;
  }

  // กรณีกดส่งฟอร์มในหน้าจอ Modal
  if (interaction.type === 5) {
    const customId = interaction.data?.custom_id || '';
    const txType = customId.split('__')[0].replace('mochi_modal_', '') || 'expense';

    const fieldMap = {};
    for (const row of interaction.data?.components || []) {
      for (const comp of row.components || []) {
        const baseKey = (comp.custom_id || '').split('__')[0];
        fieldMap[baseKey] = comp.value;
      }
    }

    try {
      recordPanelTransaction({
        type: txType,
        title: fieldMap.field_title,
        amount: fieldMap.field_amount,
        bankAccountInput: fieldMap.field_bank_account,
        categoryOrTargetInput: fieldMap.field_category_or_target,
      });

      // ตอบรับแบบเงียบ (type 6 DEFERRED_UPDATE_MESSAGE) ไม่ส่งข้อความรกแชท แล้วรีเซ็ต Panel ทันที!
      await fetch(callbackUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 6 }),
      });

      await syncDiscordPanel();
    } catch (err) {
      await fetch(callbackUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 4,
          data: {
            content: `⚠️ ไม่สามารถบันทึกได้: ${err.message}`,
            flags: 64,
          },
        }),
      });
    }
  }
}

export function getDiscordBotStatus() {
  return botStatus;
}

/**
 * ส่งข้อความหรือการ์ด Embed จากเว็บอื่น (ผ่าน External API) เข้าไปยังห้องแชท Discord
 */
export async function sendCustomDiscordMessage({
  channel_id,
  message,
  title,
  description,
  color,
  fields,
}) {
  const cfg = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
  if (!cfg || !cfg.bot_token) {
    throw new Error('ยังไม่ได้ตั้งค่า Discord Bot Token ในระบบ');
  }

  const targetChannel = (channel_id || cfg.channel_id || '').trim();
  if (!targetChannel) {
    throw new Error('ยังไม่ได้ระบุ Discord Channel ID');
  }

  const payload = {};
  if (message) {
    payload.content = String(message);
  }

  if (title || description || (Array.isArray(fields) && fields.length > 0)) {
    let embedColor = 0xffcad4;
    if (typeof color === 'number') embedColor = color;
    else if (typeof color === 'string' && color.startsWith('#')) {
      embedColor = parseInt(color.slice(1), 16) || 0xffcad4;
    }

    payload.embeds = [
      {
        title: title || '💌 ข้อความจากระบบ API เชื่อมต่อภายนอก (MochiWallet)',
        description: description || undefined,
        color: embedColor,
        fields: Array.isArray(fields)
          ? fields.map((f) => ({
              name: String(f.name || '-'),
              value: String(f.value || '-'),
              inline: Boolean(f.inline),
            }))
          : undefined,
        footer: {
          text: `ส่งผ่าน MochiWallet External API • ${new Date().toLocaleString('th-TH')}`,
        },
        timestamp: new Date().toISOString(),
      },
    ];
  }

  if (!payload.content && !payload.embeds) {
    throw new Error('กรุณาระบุข้อความ (message) หรือหัวข้อการ์ด (title / description)');
  }

  const res = await fetch(`${DISCORD_API}/channels/${targetChannel}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${cfg.bot_token.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Discord API Error ${res.status}`);
  }

  return {
    success: true,
    channel_id: targetChannel,
    message_id: data.id,
  };
}


export async function fetchBotAccessibleChannels() {
  const cfg = db.prepare('SELECT * FROM bot_settings WHERE id = 1').get();
  const token = cfg?.bot_token?.trim();
  if (!token) {
    return { inviteUrl: null, guilds: [], channels: [] };
  }

  const headers = {
    Authorization: `Bot ${token}`,
  };

  let inviteUrl = null;
  try {
    const appRes = await fetch(`${DISCORD_API}/oauth2/applications/@me`, { headers });
    if (appRes.ok) {
      const appData = await appRes.json();
      if (appData?.id) {
        inviteUrl = `https://discord.com/oauth2/authorize?client_id=${appData.id}&permissions=93184&scope=bot`;
      }
    }
  } catch {}

  const guildMap = new Map();
  const channelMap = new Map();

  // 1. ดึงจาก WebSocket Gateway (GUILD_CREATE) ที่เชื่อมต่ออยู่แบบเรียลไทม์ (ไม่ติด Rate Limit)
  for (const [, g] of gatewayGuildsMap.entries()) {
    guildMap.set(g.id, { id: g.id, name: g.name });
    if (Array.isArray(g.channels)) {
      for (const ch of g.channels) {
        if (ch.type === 0 || ch.type === 5) {
          channelMap.set(ch.id, {
            id: ch.id,
            name: ch.name,
            guild_id: g.id,
            guild_name: g.name,
          });
        }
      }
    }
  }

  // 2. ดึงเพิ่มเติมจาก Discord REST API
  try {
    const gRes = await fetch(`${DISCORD_API}/users/@me/guilds`, { headers });
    if (gRes.ok) {
      const guildList = await gRes.json();
      if (Array.isArray(guildList)) {
        for (const g of guildList) {
          guildMap.set(g.id, { id: g.id, name: g.name });
          try {
            const cRes = await fetch(`${DISCORD_API}/guilds/${g.id}/channels`, { headers });
            if (cRes.ok) {
              const chList = await cRes.json();
              if (Array.isArray(chList)) {
                for (const ch of chList) {
                  if (ch.type === 0 || ch.type === 5) {
                    channelMap.set(ch.id, {
                      id: ch.id,
                      name: ch.name,
                      guild_id: g.id,
                      guild_name: g.name,
                    });
                  }
                }
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

  return {
    inviteUrl,
    guilds: Array.from(guildMap.values()),
    channels: Array.from(channelMap.values()),
  };
}
