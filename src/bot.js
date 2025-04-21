const express = require("express");
const { Telegraf } = require("telegraf");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB  model
const User = require("./models/User");
const Alert = require("./models/Alert");

// Express server setup
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB error:", err));

// Telegram bot setup
const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware: allow only registered users
bot.use(async (ctx, next) => {
  const message = ctx.message?.text;
  if (message?.startsWith("/register")) return next();

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    return ctx.reply("You must /register to use this bot.");
  }

  return next();
});

// /register command
bot.command("register", async (ctx) => {
  const telegramId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;
  console.log("telegramId",telegramId,"username",username)
  try {
    let user = await User.findOne({ telegramId });

    if (user) {
      return ctx.reply("⚠️ You're already registered.");
    }

    user = new User({ telegramId, username });
    await user.save();

    ctx.reply("Registered! You're ready to use the bot.");
  } catch (err) {
    console.error("Registration error:", err);
    ctx.reply("Registration failed. Please try again.");
  }
});

// /start command
bot.command("start", (ctx) => {
  ctx.replyWithHTML(
    `👋 Welcome!\nType <b>/help</b> to see available commands.`
  );
});

// /help command
bot.command("help", (ctx) => {
  ctx.replyWithHTML(`
<b> Command list:</b>

/register - Register to use the bot
/currencies - Show supported currencies
/crypto_price  - Get price info (e.g. /crypto_price usd bitcoin)
/token_info - Get detailed info for a token  
/set_alert token price - Set a price alert  
/list_alerts - List your active alerts  
/remove_alert alert_id - Remove a specific alert  
  `);
});

// /currencies command
bot.command("currencies", async (ctx) => {
  try {
    const res = await axios.get(
      "https://api.coingecko.com/api/v3/simple/supported_vs_currencies"
    );
    const currencies = res.data.map((c) => `• ${c}`).join("\n");

    ctx.replyWithMarkdown(`*Supported currencies:*\n\n${currencies}`);
  } catch (err) {
    console.error(err);
    ctx.reply("Failed to fetch currencies.");
  }
});


// /crypto_price command
bot.command("crypto_price", async (ctx) => {
  const parts = ctx.message.text.split(" ");
  const currencies = parts[1];
  const cryptos = parts[2];

  if (!currencies || !cryptos) {
    return ctx.reply(
      "Usage: /crypto_price <currency> <crypto>\nExample: /crypto_price usd bitcoin"
    );
  }

  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptos}&vs_currencies=${currencies}`
    );

    if (Object.keys(res.data).length === 0) {
      return ctx.reply("⚠️ Invalid currencies or cryptos.");
    }

    let message = "";

    for (const crypto in res.data) {
      for (const currency in res.data[crypto]) {
        message += `<b>${crypto}</b> ➡️ <b>${res.data[crypto][currency]}</b> ${currency.toUpperCase()}\n`;
      }
    }

    ctx.replyWithHTML(message);
  } catch (err) {
    console.error(err);
    ctx.reply("Error fetching price data.");
  }
});
// /token_info command
bot.command("token_info", async (ctx) => {
  const token = ctx.message.text.split(" ")[1];

  if (!token) {
    return ctx.reply("Usage: /token_info <token_id>");
  }

  try {
    // 1. Get token details from CoinGecko
    const cgRes = await axios.get(`https://api.coingecko.com/api/v3/coins/${token}`);
    const data = cgRes.data;

    let holders = "N/A";

    // Get contract addresses
    const platforms = data.platforms;
    const ethContract = platforms?.ethereum;
    const solContract = platforms?.solana;
    console.log("ethContract",ethContract,"platforms",platforms)
    // Get Ethereum token holders from Etherscan
    if (ethContract) {
      try {
        const ethRes = await axios.get("https://api.etherscan.io/api", {
          params: {
            module: "token",
            action: "tokenholdercount",
            contractaddress: ethContract,
            apikey: process.env.ETHERSCAN_API_KEY,
          },
        });
        console.log("ethRes------>",ethRes)
        if (ethRes.data.status === "1") {
          holders = parseInt(ethRes.data.result).toLocaleString();
        }
      } catch (e) {
        console.log("Etherscan error:", e.message);
      }
    }

    // 3. Get Solana token holders using Helius API
    else if (solContract) {
      try {
        const heliusRes = await axios.get(
          `https://api.helius.xyz/v0/tokens/${solContract}/holders?api-key=${process.env.HELIUS_API_KEY}`
        );

        if (heliusRes.data?.totalHolders) {
          holders = parseInt(heliusRes.data.totalHolders).toLocaleString();
        }
      } catch (e) {
        console.log("Helius error:", e.message);
      }
    }

    // 4. Send token info
    const message = `
<b>${data.name} (${data.symbol.toUpperCase()})</b>

Price: $${data.market_data.current_price.usd}
Market Cap: $${data.market_data.market_cap.usd.toLocaleString()}
Volume (24h): $${data.market_data.total_volume.usd.toLocaleString()}
Change (24h): ${data.market_data.price_change_percentage_24h.toFixed(2)}%
Change (7d): ${data.market_data.price_change_percentage_7d.toFixed(2)}%
Holders: ${holders}
`;

    ctx.replyWithHTML(message, { disable_web_page_preview: true });
  } catch (err) {
    console.error(err);
    ctx.reply("Could not fetch token info. Check token ID.");
  }
});
// /set_alert command
bot.command("set_alert", async (ctx) => {
  const [_, tokenName, thresholdStr] = ctx.message.text.split(" ");
  const threshold = parseFloat(thresholdStr);
  const userId = ctx.from.id;

  if (!tokenName || isNaN(threshold)) {
    return ctx.reply("Usage: /set_alert <token_name> <price_threshold>");
  }

  try {
    const tokenRes = await axios.get("https://api.coingecko.com/api/v3/coins/list");
    const token = tokenRes.data.find((t) => t.name.toLowerCase() === tokenName.toLowerCase());

    if (!token) return ctx.reply("Token not found.");

    // Create the alert in the database
    await Alert.create({
      userId,
      tokenId: token.id,
      tokenName: token.name,
      priceThreshold: threshold,
    });

    ctx.reply(`Alert set for ${token.name} at $${threshold}`);
  } catch (err) {
    console.error(err);
    ctx.reply("Failed to set alert.");
  }
});

// /list_alerts command
bot.command("list_alerts", async (ctx) => {
  const userId = ctx.from.id;
  const alerts = await Alert.find({ userId });

  if (!alerts.length) {
    return ctx.reply("You have no active alerts.");
  }

  const msg = alerts.map((a, i) => `${i + 1}. ${a.tokenId} → $${a.priceThreshold} (ID: ${a._id})`).join("\n");

  ctx.reply(`<b>Your Alerts:</b>\n\n${msg}`, { parse_mode: "HTML" });
});

// /remove_alert command
bot.command("remove_alert", async (ctx) => {
  const alertId = ctx.message.text.split(" ")[1];

  if (!alertId) return ctx.reply("Usage: /remove_alert <alert_id>");

  try {
    await Alert.deleteOne({ _id: alertId });
    ctx.reply("Alert removed.");
  } catch (err) {
    console.error(err);
    ctx.reply("Could not remove alert.");
  }
});

// Fetch the latest data at regular intervals and update the users who have set alerts.
setInterval(async () => {
  try {
    const alerts = await Alert.find();
    const tokenIds = [...new Set(alerts.map(a => a.tokenId))];
    
    // Fetch prices in bulk
    const pricesRes = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenIds.join(',')}&vs_currencies=usd`
    );
    const prices = pricesRes.data;

    for (const alert of alerts) {
      const currentPrice = prices[alert.tokenId]?.usd;
      if (!currentPrice) continue;

      const lastPrice = alert.lastPrice || currentPrice;

      const crossed =
        (lastPrice < alert.priceThreshold && currentPrice > alert.priceThreshold) ||
        (lastPrice > alert.priceThreshold && currentPrice < alert.priceThreshold);

      if (crossed) {
        bot.telegram.sendMessage(
          alert.userId,
          `<b>${alert.tokenId}</b> price crossed your threshold!\nThreshold: <b>$${alert.priceThreshold}</b>\nCurrent: <b>$${currentPrice}</b>`,
          { parse_mode: "HTML" }
        );
      }

      alert.lastPrice = currentPrice;
      await alert.save();
    }
  } catch (err) {
    console.error("Error checking price alerts:", err.message);
  }
}, 60 * 1000); // every 1 minute

bot.launch();
console.log("Bot is running...");

// Express webhook listener (optional for deployment)
app.get("/", (req, res) => {
  res.send("Bot server is live!");
});
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
