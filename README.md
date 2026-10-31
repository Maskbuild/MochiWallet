# 🍡 MochiWallet — สมุดบันทึกรายรับ-รายจ่ายพาสเทล (Pastel Cozy Finance Tracker)

ระบบเว็บสมุดบันทึกรายรับ-รายจ่ายโทนพาสเทลครีมสุดอบอุ่น พร้อมตารางความสม่ำเสมอแบบ GitHub (Pastel Heatmap), ระบบหมวดย่อยในบัญชี, ระบบคำนวณค่าสมาชิก (Membership), บอท Discord แบบหน้าจอ Interactive Panel (3 ปุ่มกด + Dropdown + กราฟ PNG สด) และระบบ External Web API (`POST /api/v1/send`, `POST /api/v1/transactions`, `GET /api/v1/summary`)

---

## 🐳 วิธีติดตั้งลง ZimaOS (Docker)

### วิธีที่ 1: ติดตั้งผ่านหน้าเว็บ ZimaOS โดยตรง (Import Docker Compose) — *แนะนำ & ง่ายที่สุด*
1. เปิดหน้าเว็บ **ZimaOS Dashboard**
2. กดปุ่ม **`+` (Install a customized app)** ที่มุมขวาบนของหน้า App Store
3. กดปุ่ม **`Import`** (มุมขวาบนของหน้าต่างตั้งค่า) แล้วเลือกไฟล์ [`docker-compose.zimaos.yml`](./docker-compose.zimaos.yml) หรือวางโค้ด YAML ด้านล่างนี้ได้เลย:

```yaml
name: mochiwallet
services:
  mochiwallet:
    image: node:24-alpine
    container_name: mochiwallet
    working_dir: /app
    command:
      - sh
      - -c
      - apk add --no-cache git && rm -rf /tmp/mochi && git clone --depth 1 https://github.com/Maskbuild/MochiWallet.git /tmp/mochi && cp -rf /tmp/mochi/* /app/ && mkdir -p /app/data /app/uploads/accounts /app/uploads/categories /app/uploads/slips /app/uploads/attachments && npm install --omit=dev --no-audit --no-fund && node server/index.js
    ports:
      - "3001:3001"
    volumes:
      - /DATA/AppData/mochiwallet/data:/app/data
      - /DATA/AppData/mochiwallet/uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - PORT=3001
      - TZ=Asia/Bangkok
    restart: unless-stopped
x-casaos:
  title:
    en_us: MochiWallet 🍡
  icon: https://raw.githubusercontent.com/Maskbuild/MochiWallet/main/public/mochi-bunny.svg
  port_map: "3001"
  index: /
  scheme: http
```

4. กด **Submit / Install** — ZimaOS จะดึง Image `node:24-alpine` และซิงก์โค้ดล่าสุดจาก GitHub (`https://github.com/Maskbuild/MochiWallet.git`) มาเปิดเซิร์ฟเวอร์อัตโนมัติ พร้อมแสดงไอคอนน้องกระต่าย **MochiWallet 🍡** บนหน้าจอ ZimaOS ทันที!
5. เปิดเข้าใช้งานได้ที่ `http://<IP-ของ-ZimaOS>:3001`

---

### วิธีที่ 2: ติดตั้งผ่าน Terminal / SSH ของ ZimaOS
```bash
cd /DATA/AppData
git clone https://github.com/Maskbuild/MochiWallet.git mochiwallet
cd mochiwallet
docker compose up -d --build
```
จากนั้นเปิดเบราว์เซอร์ไปที่ `http://<IP-ของ-ZimaOS>:3001` ได้เลย!
