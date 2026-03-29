const router = require('express').Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// GET /api/analytics/summary — monthly summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const y = parseInt(year || now.getFullYear());
    const m = parseInt(month || now.getMonth() + 1);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const txns = await Transaction.find({ user: req.user._id, date: { $gte: start, $lte: end } }).lean();

    const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net = income - expenses;
    const anomalyCount = txns.filter(t => t.isAnomaly).length;

    // Breakdown by category
    const byCategory = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    res.json({ income, expenses, net, anomalyCount, byCategory, transactionCount: txns.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/trends — last 6 months
router.get('/trends', auth, async (req, res) => {
  try {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const trends = await Promise.all(months.map(async ({ year, month }) => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      const txns = await Transaction.find({ user: req.user._id, date: { $gte: start, $lte: end } }).lean();
      const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { year, month, income, expenses, net: income - expenses };
    }));

    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
