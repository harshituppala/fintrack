# FinTrack

An expense-tracking prototype with a React client, Express API and MongoDB storage. Users can record transactions, view category totals and inspect rule-based spending flags.

## What a flag means

`server/anomaly.js` checks category amount outliers, a fixed large-expense threshold, possible duplicates, unusual hours and daily spending spikes. These are hand-written heuristics. The score is a rule severity value, not the probability of fraud. There is no labelled fraud dataset or measured fraud-detection accuracy.

The code uses server-local time and current-time history windows. Backdated transactions and sparse histories can produce surprising flags. The amount-outlier message also assumes an upward outlier even though its calculation uses an absolute z-score. These are limitations to address before treating the flags as reliable advice.

## Run locally

Requires Node.js and MongoDB. Use sample transactions only.

```sh
npm ci
npm --prefix server ci
npm --prefix client ci
cp server/.env.example server/.env
```

Set a local MongoDB URI, an independently generated JWT secret and the client origin in `server/.env`. Then run:

```sh
PORT=5001 npm run dev
```

The client opens at http://localhost:3000 and its configured development proxy targets http://127.0.0.1:5001. The API listens only after MongoDB connects. To build the client, run `npm run build`.

## Boundaries

The API has account and transaction routes scoped to a user. Password hashing, JWTs and Helmet are present, but their presence is not a security assessment. The current code falls back to a development signing secret if configuration is missing; do not expose it publicly or use real financial records without fixing that behavior and reviewing authentication, validation, error responses and rate limiting. A rate-limit package is listed but not applied in the server entry point.

No automated test suite or deployment acceptance report is recorded here. Previous demo links have been removed from the introduction until the running service and its configuration are checked.

## Source map

- `client/src/App.js`: client views and authentication state.
- `server/routes/`: account, transaction and analytics endpoints.
- `server/anomaly.js`: flag calculations and their history queries.
- `server/models/`: stored user and transaction records.

This is a small full-stack exercise. It does not establish banking integration, production security or validated fraud detection.
