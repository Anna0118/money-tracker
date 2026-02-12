import re

def parse_expense_message(text):
    """
    Parses expense message.
    Format: "支出 午餐 100" or "支出 巨城/CORBAN 895"
    Supports special characters: /, (), etc.
    Returns: (item, amount) or None
    """
    # Match: 支出 [item with any chars] [amount]
    match = re.match(r"^支出\s+(.+?)\s+(\d+)$", text)
    if match:
        item = match.group(1).strip()
        amount = int(match.group(2))
        return item, amount
    return None

def parse_income(text):
    """
    Parses income message.
    Format: "收入 薪水 70000"
    Returns: (item, amount) or None
    """
    match = re.match(r"^收入\s+(.+?)\s+(\d+)$", text)
    if match:
        return match.group(1).strip(), int(match.group(2))
    return None

def parse_fixed_expense(text):
    """
    Parses fixed expense message.
    Format: "固定 房租 15000"
    Returns: (item, amount) or None
    """
    match = re.match(r"^固定\s+(.+?)\s+(\d+)$", text)
    if match:
        return match.group(1).strip(), int(match.group(2))
    return None

def parse_budget_query(text):
    """
    Parses budget query.
    Format: "統計" or "統計 2026/1"
    Returns: (year, month) or None (None means current month)
    """
    # Check for month specification
    match = re.match(r"^統計\s+(\d{4})/(\d{1,2})$", text)
    if match:
        return int(match.group(1)), int(match.group(2))
    
    # Just "統計"
    if text == "統計":
        return None
    
    return False  # Not a budget query

def parse_budget_limit(text):
    """
    Parses budget limit setting.
    Format: "預算 30000"
    Returns: amount or None
    """
    match = re.match(r"^預算\s+(\d+)$", text)
    if match:
        return int(match.group(1))
    return None
