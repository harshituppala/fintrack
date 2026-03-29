const router = require('express').Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { analyseTransaction } = require('../anomaly');

// GET /api/transactions — list with filters
router.get('/', auth, async (req, res) => {
  try {
    const { category, type, from, to, limit = 50, page = 1 } = req.query;
    const query = { user: req.user._id };
    if (category) query.category = category;
    if (type) query.type = type;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
      Transaction.countDocuments(query),
    ]);
    res.json({ transactions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions — create + run anomaly detection
router.post('/', auth, async (req, res) => {
  try {
    const { title, amount, type, category, date, notes } = req.body;
    if (!title || !amount || !type) return res.status(400).json({ error: 'title, amount, type required' });

    const anomaly = await analyseTransaction(req.user._id, { amount: parseFloat(amount), type, category, date });

    const transaction = await Transaction.create({
      user: req.user._id,
      title, amount: parseFloat(amount), type, category, date, notes,
      ...anomaly,
    });

    res.status(201).json({ transaction, anomalyDetected: anomaly.isAnomaly });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const t = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/anomalies — all flagged transactions
router.get('/anomalies', auth, async (req, res) => {
  try {
    const anomalies = await Transaction.find({ user: req.user._id, isAnomaly: true }).sort({ date: -1 }).limit(20);
    res.json(anomalies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
