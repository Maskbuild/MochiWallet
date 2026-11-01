# 🍡 MochiWallet — Cozy Pastel Finance Tracker

MochiWallet is a self-hosted, pastel-themed personal finance management web application designed for simplicity, cozy aesthetics, and cross-device workflows.

---

## ✨ Key Features

- **🌸 Overview Dashboard**: Real-time asset summary, date range breakdowns (Daily, Monthly, Quarterly, Half-Year, Yearly, All Time), category proportion bars, and recent transactions.
- **🌱 Pastel Activity Garden (Heatmap)**: GitHub-inspired contribution heatmap tracking your daily logging consistency and habits.
- **📈 Deep-Dive Financial Analytics & Line Chart**: Interactive SVG line charts comparing income vs. expenses over custom historical periods, cumulative curves, savings rates, and top merchant/expense statistics.
- **👛 Wallets & Savings Accounts**: Manage multiple accounts, custom colors, emoji badges, animated GIF/PNG covers, and sub-account pocket allocations.
- **💸 Transactions & Slips**: Track expenses, income, and account transfers. Supports bullet/multi-line note formatting and full image slip modal previews.
- **📱 QR Mobile Image Upload**: Scan a QR code on your PC monitor with your smartphone to instantly shoot or select photos (slips, receipts, covers, category icons) and transfer them directly into the desktop form in real time over local LAN.
- **🎯 Budgets & Trip Planner**: Set overall or category-specific spending limits for monthly, yearly, or custom travel date ranges with warning indicators.
- **🏷️ Categories & Shops**: Reusable category image gallery, custom pastel palettes, cartoon emojis, and merchant/store tracking.
- **🎀 Subscriptions & Memberships**: Track recurring memberships (hourly, daily, monthly, yearly) and upcoming billing cycles.
- **🤖 Discord Bot Panel & REST API**: Interactive 1-message Discord dashboard with live buttons and modals to log transactions from Discord, plus external REST API endpoints (`/api/v1/send`, `/api/v1/transactions`, `/api/v1/summary`).
- **🌐 Bilingual UI**: Full support for both Thai and English.

---

## 🐳 Docker Deployment

### 1. Using Docker Compose (Recommended)

Create a `docker-compose.yml` file on your server or NAS:

```yaml
services:
  mochiwallet:
    image: ghcr.io/maskbuild/mochiwallet:latest
    container_name: mochiwallet
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - PORT=3001
      - TZ=Asia/Bangkok
    restart: unless-stopped
```

Then start the container:

```bash
docker compose up -d
```

Open your browser and navigate to:
```
http://<your-server-ip>:3001
```

---

### 2. Using Standalone Docker CLI (`docker run`)

```bash
docker run -d \
  --name mochiwallet \
  -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e TZ=Asia/Bangkok \
  --restart unless-stopped \
  ghcr.io/maskbuild/mochiwallet:latest
```

---

### 3. Build & Run from Source

```bash
# Clone the repository
git clone https://github.com/Maskbuild/MochiWallet.git
cd MochiWallet

# Build and start with Docker Compose
docker compose up -d --build
```

---

## 📂 Persistent Data Storage

Make sure to mount the following directories to persist your data across container updates:
- `/app/data` — Contains the SQLite database file (`finance.db`).
- `/app/uploads` — Stores uploaded slips, account covers, category icons, and photo attachments.
