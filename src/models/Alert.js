// models/Alert.js
const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
    userId: String,
    tokenId: String,
    tokenName: String,
    priceThreshold: Number,
    direction: { type: String, enum: ['above', 'below'], default: 'above' }, // Optional: add if you want directional alerts
    lastPrice: Number, // NEW: track last known price
  });

module.exports = mongoose.model("Alert", alertSchema);
