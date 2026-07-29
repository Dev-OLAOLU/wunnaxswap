# Wunnaxswap

Interactive **crypto marketplace product demo** — markets, trade, swap, arbitrage, earn, wallet, AI assistant, and deposit flows.

> Frontend product demo. Prices and balances are simulated in the browser. Not a regulated exchange or real custody product.

## Open locally

```bash
# from this folder
python3 -m http.server 5500
# open http://localhost:5500/
```

Or double-click `start-server.command`.

## Product surface

| Area | Pages |
|------|--------|
| Markets | Spot / futures pairs, logos, 24h stats, sparklines |
| Trade | Spot + USDT-M perp UI, chart, order book, leverage |
| Swap | Instant conversion with fee display |
| Arbitrage | Multi-venue spread scanner (demo quotes) |
| Earn | Staking plans + positions |
| Wallet / Deposit | Balances, network deposit address popup |
| Tools | Market cap, screener, heat map, cross-rates, technicals |
| Auth | Sign in / sign up (demo session) |
| AI chat | Floating assistant for product help + coin market readouts |

## Stack

- HTML / CSS / JavaScript (vanilla)
- LocalStorage demo ledger
- Client-side charts and price simulation

## Author

**Ayantoyinbo David Olaoluwa** · [GitHub @Dev-OLAOLU](https://github.com/Dev-OLAOLU)

## Status

Portfolio-ready frontend. Ready to connect to real APIs, auth, and custody backends when required.
