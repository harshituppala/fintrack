/**
 * FinTrack Anomaly Detection Engine
 * Rule-based + statistical anomaly detection for personal finance transactions.
 * Flags unusual spending patterns that may indicate fraud or budget overruns.
 */

const Transaction = require('./models/Transaction');

/**
 * Compute mean and standard deviation for an array of numbers.
 */
function stats(values) {
  if (!values.length) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Analyse a new transaction against the user's history.
 * Returns { isAnomaly, anomalyReason, anomalyScore }
 */
async function analyseTransaction(userId, transaction) {
  const flags = [];
  let maxScore = 0;

  // ── Rule 1: Amount outlier within category ──────────────────────────────
  // Get last 90 days of transactions in the same category
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const history = await Transaction.find({
    user: userId,
    category: transaction.category,
    type: 'expense',
    date: { $gte: since },
  }).lean();

  if (history.length >= 3) {
    const amounts = history.map(t => t.amount);
    const { mean, std } = stats(amounts);
    if (std > 0) {
      const zScore = Math.abs((transaction.amount - mean) / std);
      if (zScore > 2.5) {
        const score = Math.min(zScore / 5, 1);
        maxScore = Math.max(maxScore, score);
        flags.push(`Amount is ${zScore.toFixed(1)}σ above your average for ${transaction.category} (avg: $${mean.toFixed(2)})`);
      }
    }
  }

  // ── Rule 2: Large single transaction (absolute threshold) ───────────────
  if (transaction.type === 'expense' && transaction.amount > 500) {
    const score = Math.min(transaction.amount / 2000, 1);
    maxScore = Math.max(maxScore, score);
    flags.push(`Large transaction: $${transaction.amount.toFixed(2)}`);
  }

  // ── Rule 3: Duplicate detection (same amount + category within 24h) ─────
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const duplicate = await Transaction.findOne({
    user: userId,
    amount: transaction.amount,
    category: transaction.category,
    type: transaction.type,
    date: { $gte: yesterday },
  }).lean();

  if (duplicate) {
    maxScore = Math.max(maxScore, 0.85);
    flags.push(`Possible duplicate: same amount and category within 24 hours`);
  }

  // ── Rule 4: Unusual hour (transaction at 2am–5am local) ─────────────────
  const hour = new Date(transaction.date || Date.now()).getHours();
  if (hour >= 2 && hour <= 5 && transaction.type === 'expense') {
    maxScore = Math.max(maxScore, 0.4);
    flags.push(`Unusual time: transaction logged at ${hour}:00`);
  }

  // ── Rule 5: Daily spending spike ────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTxns = await Transaction.find({
    user: userId, type: 'expense', date: { $gte: todayStart }
  }).lean();
  const todayTotal = todayTxns.reduce((s, t) => s + t.amount, 0) + transaction.amount;

  // Compare to daily average over last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const monthHistory = await Transaction.find({
    user: userId, type: 'expense', date: { $gte: thirtyDaysAgo }
  }).lean();

  if (monthHistory.length > 7) {
    const dailyAvg = monthHistory.reduce((s, t) => s + t.amount, 0) / 30;
    if (todayTotal > dailyAvg * 3 && dailyAvg > 0) {
      const score = Math.min(todayTotal / (dailyAvg * 6), 0.9);
      maxScore = Math.max(maxScore, score);
      flags.push(`Today's total ($${todayTotal.toFixed(2)}) is ${(todayTotal / dailyAvg).toFixed(1)}x your daily average`);
    }
  }

  return {
    isAnomaly: flags.length > 0,
    anomalyReason: flags.length ? flags.join(' | ') : null,
    anomalyScore: parseFloat(maxScore.toFixed(3)),
  };
}

module.exports = { analyseTransaction };
