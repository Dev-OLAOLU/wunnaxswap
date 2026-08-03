# Wunnaxswap

Interactive **crypto marketplace product demo** — markets, trade, swap, arbitrage, earn, wallet, AI assistant, and deposit flows.

[![Portfolio](https://img.shields.io/badge/Portfolio-Frontend%20Demo-6d28d9?style=for-the-badge)](https://github.com/Dev-OLAOLU/wunnaxswap)
[![Stack](https://img.shields.io/badge/HTML-CSS-JS-e34f26?style=for-the-badge)](#tech-stack)

> **Disclaimer:** Product demo. Prices and balances are paper/demo funds. This is **not** a regulated exchange, broker, or real custody product.

---

## Overview

Wunnaxswap is a multi-page crypto product UI: discovery, trading surfaces, conversion, yield, wallet deposit UX, compliance pages, and an in-product AI help widget.

Ideal as a portfolio piece for frontend / product engineering roles.

---

## Product surface

| Area | What you get |
|------|----------------|
| **Markets** | Spot / futures pairs, logos, 24h stats, sparklines |
| **Trade** | Spot + USDT-M perp UI, chart, order book, leverage controls |
| **Swap** | Instant conversion flow with fee display |
| **Arbitrage** | Multi-venue spread scanner (demo quotes) |
| **Earn** | Staking plans and positions |
| **Wallet / Deposit** | Balances and network deposit address UI |
| **Tools** | Market cap, screener, heat map, cross-rates, technicals |
| **Auth** | Sign in / sign up (localStorage **or** Supabase) |
| **AI chat** | Floating assistant for product help + coin readouts |
| **Legal / trust** | About, fees, FAQ, compliance, privacy, terms, contact |

---

## Tech stack

- HTML5 · CSS3 · Vanilla JavaScript
- LocalStorage demo ledger (default)
- **Supabase** (optional): Auth + paper wallet / orders / swaps / stakes
- Client-side charts and price simulation
- Static multi-page architecture (no build step required)

---

## Getting started

### Option A — Python static server

```bash
git clone https://github.com/Dev-OLAOLU/wunnaxswap.git
cd wunnaxswap
python3 -m http.server 5500
# open http://localhost:5500/
```

### Option B — macOS helper

Double-click `start-server.command` in the project folder.

---

## Project structure

```
index.html, markets.html, trade.html, swap.html, …
assets/js/       # app.js, backend.js, supabase-config.js
assets/css/
profile/         # Wallet, deposit, staking, settings
tools/           # Screener, heat map, etc.
supabase/        # APPLY_IN_DASHBOARD.sql
docs/            # SUPABASE_BACKEND.md
```

---

## Supabase backend

1. Create a **new** Supabase project (separate from Better Home)  
2. SQL Editor → run `supabase/APPLY_IN_DASHBOARD.sql`  
3. Put Project URL + **anon** key in `assets/js/supabase-config.js`  
4. Full guide: [docs/SUPABASE_BACKEND.md](docs/SUPABASE_BACKEND.md)

When keys are empty, the app keeps using localStorage. When configured, sign-up/sign-in, wallet, swap, trade, and demo deposits use Supabase.

---

## Roadmap ideas

- Live market data APIs  
- OAuth (Google / Apple) in Supabase Auth  
- Real custody / withdrawal rails (compliance required)  
- Visual regression tests  

---

## Author

**Ayantoyinbo David Olaoluwa**  
[GitHub @Dev-OLAOLU](https://github.com/Dev-OLAOLU) · [LinkedIn](https://www.linkedin.com/in/ayantoyinbo-david-9b5aa6240/) · davidayantoyinbo@gmail.com

---

## License

Portfolio demo. All rights reserved unless otherwise stated.
