

```markdown
# 📈 Telegram Crypto Bot

A Telegram bot that fetches live cryptocurrency data including prices, market cap, trading volume, holders, and price changes using CoinGecko, Etherscan, and Solana APIs. Users can register, get token details, and set real-time price alerts.

---

## 🚀 Features

- `/register` - Register to use the bot.
- `/currencies` - List supported tokens with names and symbols.
- `/crypto_price` - Get current price of tokens in one or more currencies.
- `/token_info` - Get full token data: price, mcap, volume, change %, holders.
- `/set_alert` - Set price alerts by token and threshold.
- `/list_alerts` - View all your active alerts.
- `/remove_alert` - Remove an alert by its ID.
- Real-time alert notifications when thresholds are crossed.

---

## 🛠 Tech Stack

- Node.js
- Telegram Bot API (via Telegraf)
- MongoDB (via Mongoose)
- CoinGecko API
- Etherscan API
- Helius API (for Solana)

---

## 📦 Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/try/download/community)
- A Telegram Bot Token from [BotFather](https://t.me/botfather)
- Etherscan API Key: [etherscan.io](https://etherscan.io/)
- Helius API Key: [helius.xyz](https://www.helius.xyz/)

---

## ⚙️ Setup Instructions

1. **Clone the repository:**

```bash
git clone https://github.com/your-username/telegram-crypto-bot.git
cd telegram-crypto-bot
```

2. **Install dependencies:**

```bash
npm install
```

3. **Create `.env` file and add your config:**

```bash
touch .env
```

```env
BOT_TOKEN=your_telegram_bot_token
MONGODB_URI=mongodb://localhost:27017/crypto-bot
ETHERSCAN_API_KEY=your_etherscan_api_key
HELIUS_API_KEY=your_helius_api_key
```

4. **Start MongoDB locally (if not already running):**

```bash
mongod
```

5. **Run the bot:**

```bash
node index.js
```

You should see: `Bot is running...`  
Now open Telegram and search for your bot, then start interacting!

---

## 🔍 Example Commands

```bash
/register
/crypto_price usd bitcoin
/token_info ethereum
/set_alert btc 65000
/list_alerts
/remove_alert 663c49f21a1c87abc9efde19
```

---

## 📄 Demo Video Link

[Video Link](https://drive.google.com/file/d/1joVLlxuuo5N-dOgwfZt4G5frjuM3NEfZ/view?usp=sharing)

