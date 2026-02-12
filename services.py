import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os
import datetime
import calendar
from utils import parse_expense_message, parse_fixed_expense, parse_income, parse_budget_query, parse_budget_limit

class GoogleSheetService:
    def __init__(self):
        self.scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
        self.creds_file = 'credentials.json'
        self.client = None
        self.sheet_id = os.getenv('GOOGLE_SHEET_ID')
        
    def connect(self):
        if not os.path.exists(self.creds_file):
            return False
        try:
            self.creds = ServiceAccountCredentials.from_json_keyfile_name(self.creds_file, self.scope)
            self.client = gspread.authorize(self.creds)
            return True
        except Exception as e:
            print(f"Failed to connect to Google Sheets: {e}")
            return False

    def get_sheet_ready(self):
        if not self.client:
             if not self.connect():
                 return False
        return True

    def add_expense(self, item, amount):
        """Add expense to Expenses sheet"""
        if not self.get_sheet_ready(): return "無法連接至 Google Sheet"

        try:
            sheet = self.client.open_by_key(self.sheet_id).worksheet("Expenses")
            date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            sheet.append_row([date, item, amount, "支出", ""])
            return f"✅ 已記錄支出: **{item}** {amount}元"
        except Exception as e:
            return f"❌ 寫入失敗: {str(e)}"

    def add_income(self, item, amount):
        """Add income to Settings (format: Income:YYYY/M:item)"""
        if not self.get_sheet_ready(): return "無法連接至 Google Sheet"

        try:
            now = datetime.datetime.now()
            month_key = f"{now.year}/{now.month}"
            key = f"Income:{month_key}:{item}"
            
            sheet = self.client.open_by_key(self.sheet_id).worksheet("Settings")
            sheet.append_row([key, amount])
            return f"✅ 已記錄收入: **{item}** {amount}元 ({month_key})"
        except Exception as e:
            return f"❌ 寫入失敗: {str(e)}"

    def add_fixed_expense(self, item, amount):
        """Add or update fixed expense in Settings"""
        if not self.get_sheet_ready(): return "無法連接至 Google Sheet"
        
        try:
            sheet = self.client.open_by_key(self.sheet_id).worksheet("Settings")
            key = f"Fixed:{item}"
            cell = sheet.find(key)
            if cell:
                sheet.update_cell(cell.row, 2, amount)
                return f"✅ 已更新固定支出: **{item}** {amount}元"
            else:
                sheet.append_row([key, amount])
                return f"✅ 已新增固定支出: **{item}** {amount}元"
        except Exception as e:
            return f"❌ 設定失敗: {str(e)}"

    def set_budget_limit(self, amount):
        """Set monthly spending budget limit in Settings"""
        if not self.get_sheet_ready(): return "無法連接至 Google Sheet"
        
        try:
            now = datetime.datetime.now()
            month_key = f"{now.year}/{now.month}"
            key = f"Budget:{month_key}"
            
            sheet = self.client.open_by_key(self.sheet_id).worksheet("Settings")
            cell = sheet.find(key)
            if cell:
                sheet.update_cell(cell.row, 2, amount)
                return f"✅ 已更新{now.month}月預算上限: **{amount}** 元"
            else:
                sheet.append_row([key, amount])
                return f"✅ 已設定{now.month}月預算上限: **{amount}** 元"
        except Exception as e:
            return f"❌ 設定失敗: {str(e)}"

    def get_remaining_budget(self, year=None, month=None):
        """Get budget summary for specified or current month"""
        if not self.get_sheet_ready(): return "無法連接至 Google Sheet"
        
        try:
            # Determine target month
            if year is None or month is None:
                now = datetime.datetime.now()
                target_year, target_month = now.year, now.month
            else:
                target_year, target_month = year, month
            
            target_month_str = f"{target_year}-{target_month:02d}"
            target_month_key = f"{target_year}/{target_month}"
            
            # 1. Get Settings (Fixed Expenses, Income as Salary, Budget Limit)
            settings_sheet = self.client.open_by_key(self.sheet_id).worksheet("Settings")
            settings_data = settings_sheet.get_all_values()
            
            fixed_expenses_total = 0
            fixed_items = []
            salary = 0
            bonus_total = 0
            bonus_items = []
            budget_limit = 0

            for row in settings_data:
                if not row or len(row) < 2: continue
                key, val = row[0], row[1]
                
                if key.startswith("Fixed:"):
                    amount = int(val)
                    fixed_expenses_total += amount
                    item_name = key.replace('Fixed:', '')
                    fixed_items.append(f"{item_name}({amount})")
                elif key.startswith(f"Income:{target_month_key}:"):
                    # Income:2026/2:薪水 -> treat as salary
                    amount = int(val)
                    item_name = key.split(":")[-1]
                    
                    # Check if it's bonus (獎金)
                    if "獎金" in item_name:
                        bonus_total += amount
                        bonus_items.append(f"{item_name}({amount})")
                    else:
                        salary += amount
                elif key == f"Budget:{target_month_key}":
                    # Budget:2026/2
                    budget_limit = int(val)

            # 2. Get Month Expenses (exclude category "獎金")
            expenses_sheet = self.client.open_by_key(self.sheet_id).worksheet("Expenses")
            all_expenses = expenses_sheet.get_all_values()
            
            monthly_expense_total = 0
            
            # Skip header (row 0)
            for row in all_expenses[1:]:
                if not row: continue
                date_str = row[0]
                if date_str.startswith(target_month_str):
                    try:
                        amount = int(row[2])
                        category = row[3] if len(row) > 3 else ""
                        
                        # Exclude "獎金" category from expenses
                        if category != "獎金":
                            monthly_expense_total += amount
                    except ValueError:
                        pass
            
            remaining = salary - fixed_expenses_total - monthly_expense_total
            
            fixed_detail = ', '.join(fixed_items) if fixed_items else '無'
            bonus_detail = f"\n  • 額外收入: {bonus_total}" if bonus_items else ""
            
            # Calculate spendable budget
            spendable_remaining = budget_limit - monthly_expense_total if budget_limit > 0 else 0
            budget_info = f"\n預算上限: {budget_limit} \n還可以花: {spendable_remaining} " if budget_limit > 0 else ""
            
            msg = (
                f"💰 {target_month}月\n"
                f"{budget_info}\n"
                f"-------------------\n"
                f"收入:\n"
                f"  • 月薪: {salary}{bonus_detail}\n"
                f"支出:\n"
                f"  • 固定: {fixed_expenses_total} ({fixed_detail})\n"
                f"  • 日常: {monthly_expense_total}\n"
                f"-------------------\n"
                f"多存: {remaining}\n"
            )
            return msg

        except Exception as e:
            return f"❌ 查詢失敗: {str(e)}"

class DiscordBotService:
    def __init__(self):
        self.sheet_service = GoogleSheetService()

    def handle_message(self, text):
        # Priority 1: Budget Limit Setting
        budget_limit = parse_budget_limit(text)
        if budget_limit:
            return self.sheet_service.set_budget_limit(budget_limit)

        # Priority 2: Fixed Expense
        fixed_exp = parse_fixed_expense(text)
        if fixed_exp:
            item, amount = fixed_exp
            return self.sheet_service.add_fixed_expense(item, amount)

        # Priority 3: Income
        income = parse_income(text)
        if income:
            item, amount = income
            return self.sheet_service.add_income(item, amount)

        # Priority 4: Budget Query
        budget_query = parse_budget_query(text)
        if budget_query is not False:
            if budget_query is None:
                return self.sheet_service.get_remaining_budget()
            else:
                year, month = budget_query
                return self.sheet_service.get_remaining_budget(year, month)

        # Priority 5: Expense
        expense_data = parse_expense_message(text)
        if expense_data:
            item, amount = expense_data
            return self.sheet_service.add_expense(item, amount)
            
        return None
