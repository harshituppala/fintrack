const mongoose = require('mongoose');

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
  'Healthcare', 'Utilities', 'Rent & Housing', 'Education',
  'Travel', 'Income', 'Savings', 'Other'
];

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, enum: CATEGORIES, default: 'Other' },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true },

  // Anomaly detection fields
  isAnomaly: { type: Boolean, default: false },
  anomalyReason: { type: String, default: null },
  anomalyScore: { type: Number, default: 0 }, // 0-1, higher = more anomalous
}, { timestamps: true });

// Index for fast user+date queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.CATEGORIES = CATEGORIES;
