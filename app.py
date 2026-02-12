import os
import discord
from discord.ext import tasks
from dotenv import load_dotenv
from services import DiscordBotService
import datetime

load_dotenv()

DISCORD_TOKEN = os.getenv('DISCORD_BOT_TOKEN')
DISCORD_CHANNEL_ID = os.getenv('DISCORD_CHANNEL_ID') # For daily reminders

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)
bot_service = DiscordBotService()

@client.event
async def on_ready():
    print(f'We have logged in as {client.user}')
    if not daily_reminder.is_running():
        daily_reminder.start()

@client.event
async def on_message(message):
    if message.author == client.user:
        return

    reply = bot_service.handle_message(message.content)
    if reply:
        await message.channel.send(reply)
    elif message.content.startswith('$help') or message.content == '說明':
         await message.channel.send(
            "📋 **記帳小幫手指令**:\n"
            "1. 支出 xxx 金額\n"
            "2. 收入 xxx 金額\n"
            "3. 固定 xxx 金額\n"
            "4. 收入 獎金 金額\n"
            "5. 預算 金額\n"
            "6. 統計"
        )

@tasks.loop(minutes=60) # Check every hour
async def daily_reminder():
    # Simple check for a specific time, e.g., 20:00
    now = datetime.datetime.now()
    if now.hour == 20: 
        if DISCORD_CHANNEL_ID:
            channel = client.get_channel(int(DISCORD_CHANNEL_ID))
            if channel:
                budget_info = bot_service.sheet_service.get_remaining_budget()
                await channel.send(f"🔔 **每日預算提醒**\n{budget_info}")

if __name__ == "__main__":
    if not DISCORD_TOKEN:
        print("Error: DISCORD_BOT_TOKEN must be set in .env")
    else:
        client.run(DISCORD_TOKEN)
