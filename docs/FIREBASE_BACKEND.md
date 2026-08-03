# Wunnaxswap — Firebase backend (FREE Spark)

Paper-trading auth + balances on **Google Firebase** free tier. No Supabase required.

## 1. Create a Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → name it `wunnaxswap` (or similar)
3. Disable Google Analytics if you want fewer prompts → Create

## 2. Enable Authentication

1. **Build → Authentication → Get started**
2. **Sign-in method → Email/Password → Enable → Save**
3. (Optional later) Google provider for social login

## 3. Create Firestore

1. **Build → Firestore Database → Create database**
2. Start in **production mode** (we paste rules next)
3. Pick a region close to you (e.g. `europe-west` or `us-central`)

## 4. Security rules

1. Firestore → **Rules**
2. Replace with contents of `firebase/firestore.rules`
3. **Publish**

## 5. Register a Web app

1. Project **Settings** (gear) → **Your apps** → Web `</>`
2. Nickname: `wunnaxswap-web`
3. Copy the `firebaseConfig` object fields

## 6. Paste config into the site

Edit `assets/js/firebase-config.js`:

```js
window.WUNNAX_FIREBASE = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc",
};
```

Use only the **web client** config. Never put service-account JSON in the browser.

## 7. Run the site

```bash
cd Wunnaxswap
python3 -m http.server 5500
# open http://localhost:5500/signup.html
```

1. Sign up with email + password  
2. Open **Wallet** — demo balances should appear from Firestore  
3. Deposit → credit demo → balance updates in Firebase Console → Firestore  

If config fields are empty, the app still uses **localStorage** (offline demo).

## Data model

```
users/{uid}
  email, displayName, balances: { USDT, BTC, ETH, ... }, kycStatus
  orders/{id}
  swaps/{id}
  stakes/{id}
  favorites/{symbol}
  ledger/{id}
  depositAddresses/{id}
```

## Free Spark tips

- Stay on **Spark** (free); don’t enable Blaze unless you need paid APIs
- Watch **Usage** in the console
- This is **paper trading only** — not real crypto custody

## Troubleshooting

| Issue | Fix |
|--------|-----|
| `Firebase not configured` | Fill `firebase-config.js` and hard-refresh |
| `Missing or insufficient permissions` | Publish `firestore.rules` |
| Sign-up fails | Enable Email/Password in Authentication |
| Balances empty | Check Firestore `users/{uid}.balances` after first login |
