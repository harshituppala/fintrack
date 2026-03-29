import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// ── THEME ─────────────────────────────────────────────────────────────────
const C = {
  navy: '#1B3A6B', steel: '#2563A8', light: '#EFF6FF',
  green: '#16A34A', red: '#DC2626', yellow: '#D97706',
  text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB', bg: '#F8FAFC',
};

const CATEGORY_COLORS = {
  'Food & Dining': '#F59E0B', 'Transportation': '#3B82F6', 'Shopping': '#8B5CF6',
  'Entertainment': '#EC4899', 'Healthcare': '#10B981', 'Utilities': '#6366F1',
  'Rent & Housing': '#EF4444', 'Education': '#14B8A6', 'Travel': '#F97316',
  'Income': '#22C55E', 'Savings': '#0EA5E9', 'Other': '#9CA3AF',
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

// ── AUTH CONTEXT ──────────────────────────────────────────────────────────
const AuthCtx = createContext(null);

function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ft_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/auth/me')
        .then(r => setUser(r.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const r = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('ft_token', r.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
    setToken(r.data.token);
    setUser(r.data.user);
  };

  const register = async (name, email, password) => {
    const r = await axios.post('/api/auth/register', { name, email, password });
    localStorage.setItem('ft_token', r.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
    setToken(r.data.token);
    setUser(r.data.user);
  };

  const logout = () => {
    localStorage.removeItem('ft_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return <AuthCtx.Provider value={{ user, token, login, register, logout, loading }}>{children}</AuthCtx.Provider>;
}

// ── COMPONENTS ────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: color }}>{sub}</div>
    </div>
  );
}

function AnomalyBadge({ reason, score }) {
  const severity = score > 0.7 ? C.red : score > 0.4 ? C.yellow : C.steel;
  return (
    <div style={{ background: `${severity}15`, border: `1px solid ${severity}40`, borderRadius: 6, padding: '4px 8px', fontSize: 11, color: severity, marginTop: 4, fontWeight: 600 }}>
      ⚠ {reason}
    </div>
  );
}

function AddTransactionModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ title: '', amount: '', type: 'expense', category: 'Food & Dining', date: new Date().toISOString().split('T')[0], notes: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await axios.post('/api/transactions', form);
      if (r.data.anomalyDetected) {
        toast.error(`⚠ Anomaly detected: ${r.data.transaction.anomalyReason}`, { duration: 6000 });
      } else {
        toast.success('Transaction added!');
      }
      onAdded(r.data.transaction);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box', marginTop: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 440, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: C.navy }}>Add Transaction</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>TITLE</label>
              <input style={inp} placeholder="e.g. Grocery run" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>AMOUNT ($)</label>
                <input style={inp} type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>TYPE</label>
                <select style={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>CATEGORY</label>
                <select style={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>DATE</label>
                <input style={inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>NOTES (optional)</label>
              <input style={inp} placeholder="Any notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
              {loading ? 'Analysing...' : 'Add & Analyse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const load = async () => {
    const [txR, sumR, trendR, anomR] = await Promise.all([
      axios.get('/api/transactions?limit=20'),
      axios.get('/api/analytics/summary'),
      axios.get('/api/analytics/trends'),
      axios.get('/api/transactions/anomalies'),
    ]);
    setTransactions(txR.data.transactions);
    setSummary(sumR.data);
    setTrends(trendR.data.map(t => ({ ...t, label: `${t.year}-${String(t.month).padStart(2, '0')}` })));
    setAnomalies(anomR.data);
  };

  useEffect(() => { load(); }, []);

  const fmt = (n) => `$${(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pieData = summary ? Object.entries(summary.byCategory).map(([name, value]) => ({ name, value })) : [];

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ background: C.navy, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>💳 FinTrack</span>
          {['dashboard', 'transactions', 'anomalies'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? 'rgba(255,255,255,0.15)' : 'none',
              border: 'none', color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.65)',
              padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, textTransform: 'capitalize'
            }}>{tab}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>👋 {user?.name}</span>
          <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Add button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: C.text, fontWeight: 700 }}>
            {activeTab === 'dashboard' ? '📊 Dashboard' : activeTab === 'transactions' ? '📋 Transactions' : '⚠ Anomaly Log'}
          </h2>
          <button onClick={() => setShowModal(true)} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Add Transaction
          </button>
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && summary && (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              <KPICard label="Income" value={fmt(summary.income)} sub="This month" color={C.green} icon="↑" />
              <KPICard label="Expenses" value={fmt(summary.expenses)} sub="This month" color={C.red} icon="↓" />
              <KPICard label="Net Balance" value={fmt(summary.net)} sub={summary.net >= 0 ? 'Positive month' : 'Overspent'} color={summary.net >= 0 ? C.green : C.red} icon="=" />
              <KPICard label="Anomalies" value={summary.anomalyCount} sub="Flagged transactions" color={C.yellow} icon="⚠" />
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: C.text }}>Income vs Expenses — Last 6 Months</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill={C.green} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill={C.red} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: C.text }}>Spending by Category</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {pieData.map((entry) => <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#9CA3AF'} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p style={{ color: C.muted, fontSize: 13 }}>No expense data this month.</p>}
              </div>
            </div>

            {/* Net trend */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: C.text }}>Net Balance Trend</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Line type="monotone" dataKey="net" name="Net" stroke={C.steel} strokeWidth={2.5} dot={{ fill: C.steel, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {activeTab === 'transactions' && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {transactions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>No transactions yet. Add one!</div>
            ) : transactions.map(t => (
              <div key={t._id} style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${CATEGORY_COLORS[t.category]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {t.type === 'income' ? '💰' : '💸'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{t.title}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: t.type === 'income' ? C.green : C.red }}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    <span style={{ background: `${CATEGORY_COLORS[t.category]}20`, color: CATEGORY_COLORS[t.category], padding: '2px 6px', borderRadius: 4, fontWeight: 600, marginRight: 8 }}>{t.category}</span>
                    {new Date(t.date).toLocaleDateString('en-CA')}
                  </div>
                  {t.isAnomaly && <AnomalyBadge reason={t.anomalyReason} score={t.anomalyScore} />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ANOMALIES TAB ── */}
        {activeTab === 'anomalies' && (
          <div>
            {anomalies.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: C.muted, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                ✅ No anomalies detected. Your spending looks normal.
              </div>
            ) : anomalies.map(t => (
              <div key={t._id} style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${t.anomalyScore > 0.7 ? C.red : C.yellow}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{t.title}</span>
                    <span style={{ marginLeft: 10, fontSize: 12, color: C.muted }}>{new Date(t.date).toLocaleDateString('en-CA')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>Score: {(t.anomalyScore * 100).toFixed(0)}%</span>
                    <span style={{ fontWeight: 700, color: t.type === 'income' ? C.green : C.red }}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</span>
                  </div>
                </div>
                <div style={{ background: `${C.yellow}15`, borderRadius: 6, padding: '8px 12px', fontSize: 13, color: C.text }}>
                  ⚠ {t.anomalyReason}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} onAdded={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inp = { width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 15, boxSizing: 'border-box', marginTop: 6 };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <Toaster position="top-right" />
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💳</div>
          <h1 style={{ margin: 0, fontSize: 26, color: C.navy, fontWeight: 800 }}>FinTrack</h1>
          <p style={{ margin: '6px 0 0 0', color: C.muted, fontSize: 14 }}>Smart expense tracking with anomaly detection</p>
        </div>
        <div style={{ display: 'flex', background: C.bg, borderRadius: 8, padding: 4, marginBottom: 24 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: mode === m ? '#fff' : 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: mode === m ? C.navy : C.muted, boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', textTransform: 'capitalize' }}>{m}</button>
          ))}
        </div>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gap: 14 }}>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>NAME</label>
                <input style={inp} placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>EMAIL</label>
              <input style={inp} type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>PASSWORD</label>
              <input style={inp} type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" disabled={loading} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
              {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#6B7280' }}>Loading...</div>;
  return user ? <Dashboard /> : <AuthPage />;
}

export { AuthProvider };
