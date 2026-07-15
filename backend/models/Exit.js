const mongoose = require('mongoose');

const exitSchema = new mongoose.Schema({
  customerId: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: ['buy', 'sell'], // exiting a short is buy, exiting a long is sell
    required: true,
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  lot: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: true,
  },
  ltp: {
    type: Number,
    required: true,
  },
  marginRs: {
    type: Number,
    default: 0,
  },
  marginPct: {
    type: Number,
    default: 0,
  },
  date: {
    type: Date,
    required: true,
  },
  brokeragePct: {
    type: Number,
    default: 0.01,
  },
  brokerageFee: {
    type: Number,
    required: true,
  },
  estimatedTotal: {
    type: Number,
    required: true,
  },
  realizedPnl: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true,
});

const Exit = mongoose.model('Exit', exitSchema);

module.exports = Exit;
