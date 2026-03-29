# FinTrack — Expense Tracker with Anomaly Detection

**Live Demo → [fintrack.onrender.com](https://fintrack.onrender.com)**

A full-stack personal finance web app with JWT authentication, categorized transaction logging, and a multi-rule anomaly detection engine that flags unusual spending patterns — simulating fraud detection logic used in real fintech systems.

---

## Features

- **Secure auth** — JWT-based login/register with bcrypt password hashing
- **Transaction management** — add, view, and filter income/expense transactions by category
- **5-rule anomaly detection engine** — every transaction is analysed on save:
  - Statistical outlier within category (z-score > 2.5σ)
  - Large single transaction threshold
  - Duplicate detection (same amount + category within 24h)
  - Unusual transaction hour (2am–5am)
  - Daily spending spike (3× rolling daily average)
- **Anomaly score** — 0–100% severity score per flagged transaction
- **Dashboard** — KPI cards, income vs expense bar chart, category pie chart, net balance trend
- **Anomaly log** — dedicated view of all flagged transactions with reasons

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Recharts, Axios, React Hot Toast |
| Backend | Node.js, Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Security | Helmet, CORS, express-rate-limit |
| Deployment | Render (backend) + Vercel (frontend) |

---

## Architecture

```
React Client (Vercel)
      │  JWT in Authorization header
      ▼
Express API (Render)
      ├── /api/auth          ← register, login, me
      ├── /api/transactions  ← CRUD + anomaly analysis on POST
      └── /api/analytics     ← monthly summary, 6-month trends
              │
              ▼
      AnomalyEngine          ← 5 rules, returns isAnomaly + reason + score
              │
              ▼
      MongoDB (Atlas)        ← Users, Transactions
```

---

## Running Locally

**Prerequisites:** Node.js 18+, MongoDB running locally (or a free MongoDB Atlas URI)

```bash
git clone https://github.com/harshituppala/fintrack
cd fintrack

# Install all dependencies
npm run install:all

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your MONGO_URI and JWT_SECRET

# Run both server and client concurrently
npm run dev
# Server → http://localhost:5000
# Client → http://localhost:3000
```

---

## Deployment

**Backend → Render:**
1. Create new Web Service on [render.com](https://render.com)
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add env vars: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`

**Frontend → Vercel:**
1. Import repo on [vercel.com](https://vercel.com)
2. Root directory: `client`
3. Add env var: `REACT_APP_API_URL=https://your-backend.onrender.com`

---

## Project Context

Built as part of my CICS internship application portfolio. The anomaly detection engine directly mirrors logic used in real fintech fraud detection systems — statistical z-score analysis, duplicate flagging, and behavioural baselines. This project demonstrates full-stack architecture, security fundamentals (JWT, bcrypt, rate limiting, helmet), and applied data analysis.

---

## Author

**Harshit Kumar Uppala**  
B.Sc. Computer Science, Memorial University of Newfoundland  
[github.com/harshituppala](https://github.com/harshituppala) · hkuppala@mun.ca
