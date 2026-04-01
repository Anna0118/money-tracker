/**
 * Discord Slash Commands 一次性註冊腳本
 *
 * 使用方式：
 *   node scripts/register-commands.js
 *   （自動從 .env 讀取 DISCORD_BOT_TOKEN 和 DISCORD_APPLICATION_ID）
 *
 * 執行成功後，Slash Commands 會在 Discord 全域生效（約需 1 小時）。
 * 之後不需要再執行，除非要新增/修改指令。
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 手動載入 .env（不需要安裝額外套件）
try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...rest] = line.split('=');
        if (key && rest.length) {
            process.env[key.trim()] = rest.join('=').trim();
        }
    });
} catch (_) {
    // .env 不存在時忽略，依賴系統環境變數
}

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;

if (!TOKEN || !APPLICATION_ID) {
    console.error('❌ 請設定 DISCORD_BOT_TOKEN 和 DISCORD_APPLICATION_ID 環境變數');
    process.exit(1);
}

const commands = [
    {
        name: '支出',
        description: '記錄日常支出到 Google Sheets',
        options: [
            {
                name: 'item',
                description: '項目名稱（例如：午餐、計程車）',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'amount',
                description: '金額（新台幣）',
                type: 4, // INTEGER
                required: true,
            },
        ],
    },
    {
        name: '收入',
        description: '記錄本月收入（薪水、獎金等）',
        options: [
            {
                name: 'item',
                description: '項目名稱（例如：薪水、年終獎金）',
                type: 3,
                required: true,
            },
            {
                name: 'amount',
                description: '金額（新台幣）',
                type: 4,
                required: true,
            },
        ],
    },
    {
        name: '固定',
        description: '新增或更新每月固定支出（例如：房租、保險）',
        options: [
            {
                name: 'item',
                description: '項目名稱（例如：租金、健身房）',
                type: 3,
                required: true,
            },
            {
                name: 'amount',
                description: '每月固定金額',
                type: 4,
                required: true,
            },
        ],
    },
    {
        name: '預算',
        description: '設定本月可以花的預算上限',
        options: [
            {
                name: 'amount',
                description: '預算金額（新台幣）',
                type: 4,
                required: true,
            },
        ],
    },
    {
        name: '統計',
        description: '查看指定月份的收支統計',
        options: [
            {
                name: 'month',
                description: '月份（數字，不填預設本月，例如：3）',
                type: 4, // INTEGER
                required: false,
                min_value: 1,
                max_value: 12,
            },
        ],
    },
];

async function registerCommands() {
    const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

    console.log(`📡 正在註冊 ${commands.length} 個 Slash Commands...`);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bot ${TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`❌ 註冊失敗 (HTTP ${response.status}):`, error);
        process.exit(1);
    }

    const data = await response.json();
    console.log(`✅ 成功註冊 ${data.length} 個指令：`);
    data.forEach(cmd => console.log(`   • /${cmd.name} — ${cmd.description}`));
    console.log('\n⏳ 全域指令最長需要 1 小時生效，請耐心等候。');
}

registerCommands().catch(err => {
    console.error('❌ 發生錯誤:', err);
    process.exit(1);
});
