# Wunnaxswap — Supabase backend

Paper-trading ledger + Auth for the Wunnaxswap demo. **Not real custody** — balances are demo funds in your Supabase project.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name it e.g. `wunnaxswap` (use a **separate** project from Better Home)
3. Wait until the project is ready

## 2. Apply SQL

1. Dashboard → **SQL Editor** → New query  
2. Paste entire contents of:

   `supabase/APPLY_IN_DASHBOARD.sql`

3. **Run**

This creates:

| Table / RPC | Purpose |
|-------------|---------|
| `profiles` | User profile (from Auth) |
| `wallets` / `balances` | Per-user paper balances |
| `orders` | Spot/futures fills |
| `swaps` | Instant swaps |
| `stakes` | Earn positions |
| `favorites` | Market favorites |
| `deposit_addresses` | Generated deposit addresses |
| `ledger_entries` | Audit trail |
| `credit_demo_balance` | Deposit UI credit |
| `execute_swap` | Atomic swap |
| `place_order` | Trade fill + balance move |
| `open_stake` / `close_stake` | Earn lock/unlock |
| `ensure_my_wallet` / `get_my_balances` | Wallet bootstrap |

RLS: users only see/change **their own** rows. Mutations go through **SECURITY DEFINER** RPCs.

## 3. Auth settings

1. **Authentication → Providers** → enable **Email**  
2. (Optional) Google / Apple OAuth — add Client IDs  
3. **Authentication → URL configuration**  
   - Site URL: your live site or `http://localhost:5500`  
   - Redirect URLs: same + `**/profile/wallet.html`

## 4. Wire the frontend

1. **Project Settings → API**  
   - Copy **Project URL**  
   - Copy **anon public** key (never `service_role`)

2. Edit `assets/js/supabase-config.js`:

```js
window.WUNNAX_SUPABASE = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_ANON_KEY",
};
```

3. Serve the site and hard-refresh:

```bash
cd Wunnaxswap
python3 -m http.server 5500
# open http://localhost:5500/signup.html
```

## 5. What works when configured

| Flow | Behavior |
|------|----------|
| Sign up / Sign in | Supabase Auth |
| Wallet balances | Loaded from DB |
| Credit demo deposit | `credit_demo_balance` RPC |
| Swap | `execute_swap` RPC |
| Spot trade | `place_order` RPC |
| Stake (when balance allows) | `open_stake` RPC |
| Log out | Supabase signOut |

If `url` / `anonKey` are empty, the app still runs on **localStorage** (original demo mode).

## 6. Security notes

- This is a **demo / paper** backend. Anyone with the anon key can call public RPCs **as themselves** after signup.
- Do **not** put `service_role` in the browser.
- For production trading you need KYC, withdrawal rails, market data feeds, risk engines, and legal compliance — out of scope here.

## 7. Verify in SQL

```sql
select * from public.profiles;
select * from public.wallets;
select * from public.balances;
select * from public.orders order by created_at desc limit 20;
```
