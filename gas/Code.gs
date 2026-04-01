// ============================================================
// Money Tracker — Google Apps Script
// Discord Slash Command Handler + Google Sheets Integration
// ============================================================

/**
 * 在 GAS 專案設定 > 指令碼屬性 中設定以下變數：
 *   SHEET_ID — Google Sheets 的試算表 ID
 */

// ── Entry Point ──────────────────────────────────────────────

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // Discord PING (type 1) — 端點驗證
    if (body.type === 1) {
      return jsonResponse({ type: 1 });
    }

    // Discord APPLICATION_COMMAND (type 2) — Slash Command
    if (body.type === 2) {
      return handleCommand(body);
    }

    return jsonResponse({ type: 4, data: { content: '❓ Unknown request type' } });
  } catch (err) {
    return jsonResponse({ type: 4, data: { content: `❌ System error: ${err.message}` } });
  }
}

// ── Command Router ───────────────────────────────────────────

function handleCommand(interaction) {
  const commandName = interaction.data.name;

  // 將 options 陣列轉成 {name: value} 的物件方便使用
  const options = {};
  if (interaction.data.options) {
    interaction.data.options.forEach(opt => {
      options[opt.name] = opt.value;
    });
  }

  let message = '';

  switch (commandName) {
    case '支出':
      message = addExpense(options['item'], options['amount']);
      break;
    case '收入':
      message = addIncome(options['item'], options['amount']);
      break;
    case '固定':
      message = addFixedExpense(options['item'], options['amount']);
      break;
    case '統計':
      message = getSummary(options['month'] || null);
      break;
    case '預算':
      message = setBudgetLimit(options['amount']);
      break;
    default:
      message = `❓ Unknown command: ${commandName}`;
  }

  return jsonResponse({
    type: 4,
    data: { content: message }
  });
}

// ── Helpers ──────────────────────────────────────────────────

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!sheetId) throw new Error('SHEET_ID is not set in script properties');
  return SpreadsheetApp.openById(sheetId);
}

function nowTaipei() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
}

// ── Command Handlers ─────────────────────────────────────────

/**
 * /支出 item:名稱 amount:金額
 */
function addExpense(item, amount) {
  try {
    const sheet = getSpreadsheet().getSheetByName('Expenses');
    const date = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([date, item, amount, '支出', '']);
    return `✅ Expense recorded: **${item}** $${amount}`;
  } catch (e) {
    return `❌ Write failed: ${e.message}`;
  }
}

/**
 * /收入 item:名稱 amount:金額
 */
function addIncome(item, amount) {
  try {
    const sheet = getSpreadsheet().getSheetByName('Settings');
    const now = nowTaipei();
    const monthKey = `${now.getFullYear()}/${now.getMonth() + 1}`;
    const key = `Income:${monthKey}:${item}`;
    sheet.appendRow([key, amount]);
    return `✅ Income recorded: **${item}** $${amount} (${monthKey})`;
  } catch (e) {
    return `❌ Write failed: ${e.message}`;
  }
}

/**
 * /固定 item:名稱 amount:金額
 */
function addFixedExpense(item, amount) {
  try {
    const sheet = getSpreadsheet().getSheetByName('Settings');
    const key = `Fixed:${item}`;
    const data = sheet.getDataRange().getValues();

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(amount);
        return `✅ Fixed expense updated: **${item}** $${amount}`;
      }
    }

    sheet.appendRow([key, amount]);
    return `✅ Fixed expense added: **${item}** $${amount}`;
  } catch (e) {
    return `❌ Failed: ${e.message}`;
  }
}

/**
 * /預算 amount:金額
 */
function setBudgetLimit(amount) {
  try {
    const sheet = getSpreadsheet().getSheetByName('Settings');
    const now = nowTaipei();
    const monthKey = `${now.getFullYear()}/${now.getMonth() + 1}`;
    const key = `Budget:${monthKey}`;
    const data = sheet.getDataRange().getValues();

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(amount);
        return `✅ Budget updated for month ${now.getMonth() + 1}: **$${amount}**`;
      }
    }

    sheet.appendRow([key, amount]);
    return `✅ Budget set for month ${now.getMonth() + 1}: **$${amount}**`;
  } catch (e) {
    return `❌ Failed: ${e.message}`;
  }
}

/**
 * /統計 [month:月份數字，不填預設本月]
 */
function getSummary(monthParam) {
  try {
    const now = nowTaipei();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth() + 1;

    if (monthParam !== null && monthParam !== undefined) {
      targetMonth = parseInt(monthParam);
      // 若指定月份大於現在月份，視為上一年
      if (targetMonth > now.getMonth() + 1) targetYear--;
    }

    const targetMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    const targetMonthKey = `${targetYear}/${targetMonth}`;

    // ── 讀 Settings ───────────────────────────────────────
    const settingsSheet = getSpreadsheet().getSheetByName('Settings');
    const settingsData = settingsSheet.getDataRange().getValues();

    let fixedTotal = 0;
    const fixedItems = [];
    let salary = 0;
    let bonusTotal = 0;
    const bonusItems = [];
    let budgetLimit = 0;

    settingsData.forEach(row => {
      if (row.length < 2 || !row[0]) return;
      const key = String(row[0]);
      const val = parseInt(row[1]) || 0;

      if (key.startsWith('Fixed:')) {
        fixedTotal += val;
        fixedItems.push(`${key.replace('Fixed:', '')}(${val})`);
      } else if (key.startsWith(`Income:${targetMonthKey}:`)) {
        const itemName = key.split(':').pop();
        if (itemName.includes('獎金')) {
          bonusTotal += val;
          bonusItems.push(`${itemName}(${val})`);
        } else {
          salary += val;
        }
      } else if (key === `Budget:${targetMonthKey}`) {
        budgetLimit = val;
      }
    });

    // ── 讀 Expenses ───────────────────────────────────────
    const expensesSheet = getSpreadsheet().getSheetByName('Expenses');
    const allExpenses = expensesSheet.getDataRange().getValues();

    let monthlyExpense = 0;
    const dailyItems = [];
    allExpenses.slice(1).forEach(row => {
      if (!row[0]) return;
      // GAS 從Sheets讀回日期欄位時可能是Date物件（Sheets自動轉換），
      // 需要統一格式化成 yyyy-MM-dd 才能比對
      let dateStr;
      if (row[0] instanceof Date) {
        dateStr = Utilities.formatDate(row[0], 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
      } else {
        dateStr = String(row[0]);
      }
      if (dateStr.startsWith(targetMonthStr)) {
        const amount = parseInt(row[2]) || 0;
        const category = row[3] || '';
        if (category !== '獎金') {
          monthlyExpense += amount;
          dailyItems.push({ item: String(row[1] || ''), amount });
        }
      }
    });

    // ── 組合訊息 ──────────────────────────────────────────
    const remaining = salary - fixedTotal - monthlyExpense;
    const fixedDetail = fixedItems.length > 0 ? `(${fixedItems.join(', ')})` : '';
    const bonusLine = bonusTotal > 0 ? `\n  Bonus:  $${bonusTotal}` : '';

    // 用 code block 避免 Discord Markdown 把格式搞亂
    let inner = `💰 Month ${targetMonth}\n`;
    if (budgetLimit > 0) {
      const spendable = budgetLimit - monthlyExpense;
      inner += `Budget:        $${budgetLimit}\nLeft to spend: $${spendable}\n`;
    }
    inner += `-------------------\n`;
    inner += `Income:\n  Salary: $${salary}${bonusLine}\n`;
    inner += `Expenses:\n  Fixed:  $${fixedTotal} ${fixedDetail}\n`;
    inner += `  Daily:  $${monthlyExpense}\n`;
    if (dailyItems.length > 0) {
      dailyItems.forEach(({ item, amount }) => {
        inner += `    - ${item}: $${amount}\n`;
      });
    }
    inner += `-------------------\n`;
    inner += `Saved:  $${remaining}`;

    return `\`\`\`\n${inner}\n\`\`\``;

  } catch (e) {
    return `❌ Query failed: ${e.message}`;
  }
}
