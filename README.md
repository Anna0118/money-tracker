# Discord 記帳機器人

一個使用 Discord 的記帳機器人，可以追蹤支出、收入、固定支出，並提供預算管理功能。資料儲存在 Google Sheets。

## 功能

- 📝 記錄日常支出
- 💰 記錄收入（薪水、獎金）
- 🔄 管理固定支出（房租、訂閱等）
- 📊 設定月預算上限
- 📈 查詢月度統計
- 🔔 每日預算提醒

## 指令

- `支出 [項目] [金額]` - 記錄支出
- `收入 [項目] [金額]` - 記錄收入
- `固定 [項目] [金額]` - 設定固定支出
- `預算 [金額]` - 設定月預算上限
- `統計` - 查詢本月統計
- `$help` 或 `說明` - 顯示指令說明

## 本地開發

### 環境設定

1. 複製環境變數範例檔案：
```bash
cp .env.example .env
```

2. 編輯 `.env` 並填入以下資訊：
```
DISCORD_BOT_TOKEN=你的Discord機器人Token
DISCORD_CHANNEL_ID=提醒頻道ID（選填）
GOOGLE_SHEET_ID=你的Google試算表ID
```

3. 將 Google Service Account 憑證儲存為 `credentials.json`

### 安裝與執行

```bash
# 建立虛擬環境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安裝套件
pip install -r requirements.txt

# 執行機器人
python app.py
```

## Render 部署

### 1. 準備 GitHub Repository

```bash
# 初始化 Git（如果還沒有）
git init
git add .
git commit -m "Initial commit"

# 建立 GitHub repository 並推送
git remote add origin https://github.com/你的使用者名稱/你的repo名稱.git
git branch -M main
git push -u origin main
```

### 2. 在 Render 建立服務

1. 前往 [Render Dashboard](https://dashboard.render.com/)
2. 點擊 "New +" → "Web Service"
3. 連接你的 GitHub repository
4. Render 會自動偵測 `render.yaml` 配置

### 3. 設定環境變數

在 Render 服務設定中，新增以下環境變數：

- `DISCORD_BOT_TOKEN`: 你的 Discord 機器人 Token
- `DISCORD_CHANNEL_ID`: 提醒頻道 ID（選填）
- `GOOGLE_SHEET_ID`: Google 試算表 ID
- `GOOGLE_CREDENTIALS_JSON`: Google Service Account 憑證的 **完整 JSON 內容**

> **注意**: `GOOGLE_CREDENTIALS_JSON` 應該是整個 `credentials.json` 檔案的內容，複製貼上整個 JSON 字串。

### 4. 部署

點擊 "Create Web Service"，Render 會自動開始部署。

## Google Sheets 結構

需要建立包含以下工作表的 Google 試算表：

### Expenses 工作表
| 日期 | 項目 | 金額 | 類別 | 備註 |
|------|------|------|------|------|

### Settings 工作表
| Key | Value |
|-----|-------|
| Fixed:房租 | 10000 |
| Income:2026/2:薪水 | 50000 |
| Budget:2026/2 | 20000 |

## 授權

MIT License
