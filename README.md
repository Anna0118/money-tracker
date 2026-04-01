# Money Tracker 💰

Personal expense tracking bot via **Discord Slash Commands** → **Google Sheets**.  
100% free. No server required.

---

## Architecture

```
Discord  →  Cloudflare Worker  →  Google Apps Script  →  Google Sheets
            (verify signature)     (business logic)
```

---

## Commands

| Command | Description |
|---------|-------------|
| `/支出 item:午餐 amount:120` | Record a daily expense |
| `/收入 item:薪水 amount:50000` | Record income for this month |
| `/固定 item:車貸 amount:14000` | Add / update a monthly fixed expense |
| `/預算 amount:15000` | Set spending budget for this month |
| `/統計` | View this month's summary |
| `/統計 month:3` | View summary for a specific month |

### Stats output format

```
💰 Month 4
Budget:        $15000
Left to spend: $4000
-------------------
Income:
  Salary: $69018
Expenses:
  Fixed:  $36509 (租金(8000), 孝親費(10000), ...)
  Daily:  $11000
    - 午餐: $120
    - 好市多: $1971
    - ...
-------------------
Saved:  $21509
```

---

## Setup

### Prerequisites

- Google Account
- Cloudflare Account (free) — [cloudflare.com](https://cloudflare.com)
- Discord Developer Account — [discord.com/developers](https://discord.com/developers/applications)

---

### Step 1 — Deploy Google Apps Script

1. Go to [script.google.com](https://script.google.com) → **New Project**
2. Paste the contents of `gas/Code.gs`
3. Go to **Project Settings → Script Properties**, add:
   ```
   SHEET_ID = <your Google Sheets ID>
   ```
   > The Sheets ID is in the URL: `https://docs.google.com/spreadsheets/d/【HERE】/edit`
4. **Deploy → New deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the **Web App URL**

---

### Step 2 — Deploy Cloudflare Worker

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create Worker**
2. Paste the contents of `cloudflare-worker/index.js`
3. Go to **Settings → Variables and Secrets**, add:
   ```
   DISCORD_PUBLIC_KEY     = <your Discord app Public Key>
   DISCORD_APPLICATION_ID = <your Discord app Application ID>
   GAS_URL                = <Web App URL from Step 1>
   ```
   > Public Key and Application ID: Discord Developer Portal → Your App → General Information
4. Copy the **Worker URL**

---

### Step 3 — Set Discord Interactions Endpoint

1. Go to [Discord Developer Portal](https://discord.com/developers/applications) → Your App
2. **General Information → Interactions Endpoint URL** = Worker URL from Step 2
3. Click **Save Changes** (Discord will auto-verify the endpoint)

---

### Step 4 — Register Slash Commands (one-time)

```bash
node scripts/register-commands.js
```

> Reads `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID` from `.env` automatically.  
> Global commands take up to 1 hour to propagate.

---

### Step 5 — Invite Bot to Server

Go to **OAuth2 → URL Generator**:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`

Use the generated URL to invite the bot to your Discord server.

---

## Google Sheets Structure

The spreadsheet needs two sheets:

**Expenses**

| date | item | amount | category | note |
|------|------|--------|----------|------|
| 2026-04-01 21:00:00 | 午餐 | 120 | 支出 | |

**Settings**

| key | value |
|-----|-------|
| `Fixed:車貸` | `14000` |
| `Fixed:房費` | `20000` |
| `Income:2026/4:薪水` | `70000` |
| `Budget:2026/4` | `15000` |

---

## Cost

| Service | Free Tier | Actual Usage |
|---------|-----------|-------------|
| Google Apps Script | 90 min/day execution | Minimal |
| Cloudflare Workers | 100,000 req/day | Minimal |
| Google Sheets | Free | — |
| **Total** | **$0** | |

---

## Files

```
gas/
  Code.gs              ← GAS script (all business logic)
  appsscript.json      ← GAS project config

cloudflare-worker/
  index.js             ← Discord signature verification + forward to GAS
  wrangler.toml        ← Cloudflare Worker config

scripts/
  register-commands.js ← One-time script to register Discord slash commands

.env                   ← Local secrets (not committed)
.env.example           ← Template for required env vars
```
