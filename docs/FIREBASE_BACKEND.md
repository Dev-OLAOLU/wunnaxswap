# Wunnaxswap — Firebase backend (updated)

Paper-trading **Auth + balances + activity history** on Google Firebase **Spark (free)**.  
Client library: `assets/js/backend.js` → public API `window.WunnaxBackend`.

This is **not** real crypto custody. Balances are demo numbers in Firestore.

---

## What the backend does

| Area | Responsibility |
|------|----------------|
| **Auth** | Email/password sign-up & sign-in; optional Google popup; session via Firebase Auth |
| **Profile** | `users/{uid}` with email, displayName, kycStatus, avatarUrl |
| **Wallet** | Paper `balances` map on the user doc; seed on first login |
| **Trading** | Atomic swap & spot order fills that debit/credit balances |
| **Earn** | Lock/unlock stake principal in subcollection `stakes` |
| **History** | Append-only `ledger`, `orders`, `swaps`; favorites; deposit address notes |
| **Fallback** | If config is empty, the UI still works on **localStorage** only |

---

## Setup (once)

1. [Firebase Console](https://console.firebase.google.com/) → project `wunnaxswap`
2. **Authentication** → Email/Password enabled (Google optional)
3. **Firestore** → create DB (production mode) → paste `firebase/firestore.rules` → **Publish**
4. **Project settings → Web app** → copy config into `assets/js/firebase-config.js`
5. Serve the site (`python3 -m http.server 5500`) and open `signup.html`

Never put Admin / service-account keys in the browser.

---

## Data model

```
users/{uid}
  email, displayName, avatarUrl?, kycStatus
  balances: { USDT, BTC, ETH, SOL, BNB, XRP, ... }
  createdAt, updatedAt

  orders/{orderId}           // filled paper orders
  swaps/{swapId}             // instant swaps
  stakes/{stakeId}           // status: active | closed
  favorites/{SYMBOL}         // watchlist symbols as doc ids
  ledger/{entryId}           // audit trail (credits, swaps, stakes, …)
  depositAddresses/{id}      // demo address labels only
```

**Default paper balances** (first account):

```
USDT 2500 · BTC 0.05 · ETH 1.2 · SOL 15 · BNB 2 · XRP 200 · USDC 0
```

---

## Public API — `window.WunnaxBackend`

All async methods return Promises. Failures throw `Error` with a clean `.message`  
(use `formatError(err)` in the UI).

### Lifecycle & config

| Function | Returns | Description |
|----------|---------|-------------|
| `enabled()` | `boolean` | True when `firebase-config.js` has a real `apiKey` + `projectId` |
| `init()` | `Promise<{enabled,user}>` | Idempotent. Initializes Firebase, attaches **one** auth listener, seeds wallet if signed in. Safe to call many times. |
| `isReady()` | `boolean` | True after first auth callback (or offline resolve) |
| `waitForReady(timeoutMs?)` | `Promise<boolean>` | Resolves when ready (default 15s). App boot uses this so UI does not race Auth. |
| `formatError(err)` | `string` | Maps Firebase codes (`auth/wrong-password`, …) to short toast text |
| `getClient()` | Firestore \| null | Raw Firestore instance |
| `getAuth()` | Auth \| null | Raw Auth instance |

### Authentication

| Function | Args | Description |
|----------|------|-------------|
| `signUp(email, password, name?)` | email normalized & validated; password ≥ 6 | Creates Auth user + Firestore profile with default balances. Returns `{ user, session: true }`. |
| `signIn(email, password)` | | Signs in; ensures wallet doc exists. Returns `{ user }`. |
| `signInWithOAuth("google")` | | Google popup (must enable provider in Console). Seeds profile if new. |
| `signOut()` | | Clears Firebase session + local session user |
| `getSessionUser()` | | Mapped app user: `{ id, email, name, provider, avatar_url, kyc_status, backend:"firebase" }` or `null` |
| `isAuthed()` | `boolean` | Current Firebase user (or cached session user) present |
| `updateProfile({ displayName?, avatarUrl? })` | | Merges profile fields; syncs Auth displayName when possible |

### Wallet & ledger

| Function | Args | Description |
|----------|------|-------------|
| `ensureWallet(uid?)` | optional uid | Creates user doc + default balances if missing. Returns balance map. |
| `getBalancesMap()` | | `{ ASSET: number, ... }` for the signed-in user |
| `creditDemo(asset, amount)` | positive amount | **Paper deposit**: transactionally credits balance + ledger `demo_credit` |
| `listLedger(limit?)` | default 50 | Recent ledger rows, newest first |

Internal helper (not always called from UI): balance deltas go through a **Firestore transaction** so two tabs cannot double-spend the same USDT.

### Swap & orders

| Function | Args | Description |
|----------|------|-------------|
| `executeSwap(send, recv, sendAmt, recvAmt, fee?, rate?)` | distinct assets; amounts > 0 | Transaction: debit `send`, credit `recv`, write `swaps/{id}` in the **same** transaction; then ledger `swap_out` / `swap_in`. Returns `{ ok, swap_id }`. |
| `placeOrder({ side, baseAsset, quoteAsset?, price, amount, pair?, marketType?, orderType? })` | side: `buy`\|`sell`\|`long`\|`short` | Instant **fill** (paper). Buy spends quote, receives base; sell opposite. Writes `orders/{id}` atomically with balances. Returns `{ ok, order_id }`. |
| `listOrders(limit?)` | | User orders, newest first |
| `listSwaps(limit?)` | | User swaps, newest first |

### Staking (earn)

| Function | Args | Description |
|----------|------|-------------|
| `openStake(asset, amount, plan?, apr?)` | amount > 0; apr 0–100 | Transaction: lock principal from wallet + create `stakes/{id}` `status:"active"`. Ledger `stake_lock`. |
| `closeStake(stakeId)` | | Transaction: set stake `closed`, return principal (no interest in paper mode). Ledger `stake_unlock`. |
| `listStakes()` | | Active stakes shaped for the UI (`id, asset, amount, apr, term, started`) |

### Preferences & deposits

| Function | Args | Description |
|----------|------|-------------|
| `getFavorites()` | | `string[]` of symbols |
| `toggleFavorite(symbol)` | | Add or remove watchlist doc; returns new list |
| `saveDepositAddress(asset, network, address)` | address length ≥ 8 | Stores a **label only** (not on-chain generation) |

### Constants

| Name | Description |
|------|-------------|
| `DEFAULT_BALANCES` | Copy of seed map used for new accounts |

---

## Auth events

`init()` dispatches on `document`:

```js
document.addEventListener("wunna:auth", (e) => {
  // e.detail.event: "ready" | "signed_in" | "signed_out"
  // e.detail.user: firebase.User | null
});
```

First callback uses `"ready"`; later sign-in/out use `"signed_in"` / `"signed_out"`.

---

## How the frontend uses it

`assets/js/app.js`:

1. On `DOMContentLoaded`, if `enabled()`, call `waitForReady` → refresh user + wallet → `bootApp()`
2. Auth forms call `signUp` / `signIn` and map errors with `formatError`
3. Swap, trade, deposit, stake call the matching backend methods when authed; otherwise localStorage demo
4. Logout calls `signOut()` and clears local session keys

---

## Security rules (summary)

File: `firebase/firestore.rules`

- Only the **owner** (`request.auth.uid == userId`) can read/write their tree
- User docs cannot be deleted from the client
- `orders`, `swaps`, `ledger`, `depositAddresses`: create + read only (immutable history)
- `stakes`: create + limited update (`status`, `closedAt`) for unstake
- `favorites`: full owner read/write
- `balances` must remain a map (size capped)

Re-publish rules after any change.

---

## Validation & error codes (app-level)

| Condition | Message / code |
|-----------|----------------|
| Bad email | `Enter a valid email address` |
| Short password | `Password must be at least 6 characters` |
| Wrong password / unknown user | Friendly auth map via `formatError` |
| Bad symbol | `Invalid asset symbol` |
| Non-positive amount | `… must be a positive number` |
| Overdraft | `Insufficient {ASSET} balance` |
| Not signed in | `Not authenticated` / `Please sign in first` |

---

## Free Spark tips

- Stay on **Spark** unless you need paid Google APIs
- Watch **Usage** in the console
- Composite indexes: only needed if you add multi-field queries later; current queries use single-field `orderBy` / `where` on subcollections

---

## Troubleshooting

| Issue | Fix |
|--------|-----|
| `Backend not configured` | Fill `firebase-config.js`, hard-refresh |
| `Permission denied` | Publish `firestore.rules` |
| Sign-up fails | Enable Email/Password in Authentication |
| Balances empty | Check `users/{uid}.balances` after first login |
| Popup blocked (Google) | Allow popups; enable Google provider |
| App flashes logged-out then in | Fixed by `waitForReady` before shell render |

---

## File map

| Path | Role |
|------|------|
| `assets/js/firebase-config.js` | Web client config + `WUNNAX_FIREBASE_ENABLED()` |
| `assets/js/backend.js` | All backend functions (`WunnaxBackend`) |
| `assets/js/app.js` | UI wiring, localStorage fallback, toasts |
| `firebase/firestore.rules` | Security rules |
| `docs/FIREBASE_BACKEND.md` | This document |
