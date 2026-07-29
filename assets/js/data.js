/* Wunnaxswap market data + coin logo map (CoinGecko CDN + crypto-icons fallback) */
window.WUNNA = window.WUNNA || {};

/** Official-style logos via public CDNs */
WUNNA.LOGO = {
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  TON: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  TRX: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
  ADA: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  LTC: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  DOT: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  POL: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  SHIB: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  BCH: "https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png",
  ATOM: "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  NEAR: "https://assets.coingecko.com/coins/images/10365/small/near.jpg",
  APT: "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png",
  ARB: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
  OP: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
  PEPE: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
  SUI: "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg",
  FIL: "https://assets.coingecko.com/coins/images/12817/small/filecoin.png",
  ICP: "https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png",
  AAVE: "https://assets.coingecko.com/coins/images/12645/small/aave-token-round.png",
  MKR: "https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png",
  INJ: "https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png",
  RENDER: "https://assets.coingecko.com/coins/images/11636/small/rndr.png",
  NOT: "https://assets.coingecko.com/coins/images/36666/small/not_pixel.png",
};

WUNNA.logoUrl = function (symbol) {
  return WUNNA.LOGO[symbol] ||
    "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/" +
    String(symbol || "generic").toLowerCase() + ".png";
};

WUNNA.ASSETS = [
  { symbol: "BTC", name: "Bitcoin", price: 65044.76, change: 0.8, high: 65820, low: 64110, volume: 1284000000, marketCap: 1280000000000, category: "crypto", futures: true, funding: 0.012 },
  { symbol: "ETH", name: "Ethereum", price: 1947.61, change: 3.45, high: 1988, low: 1880, volume: 642000000, marketCap: 234000000000, category: "crypto", futures: true, funding: 0.008 },
  { symbol: "BNB", name: "BNB", price: 571.74, change: 0.18, high: 580, low: 562, volume: 184000000, marketCap: 86000000000, category: "crypto", futures: true, funding: 0.005 },
  { symbol: "SOL", name: "Solana", price: 76.21, change: 2.1, high: 78.4, low: 73.9, volume: 291000000, marketCap: 34000000000, category: "crypto", futures: true, funding: 0.015 },
  { symbol: "XRP", name: "Ripple", price: 1.0995, change: 0.23, high: 1.12, low: 1.07, volume: 156000000, marketCap: 60000000000, category: "crypto", futures: true, funding: 0.004 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.07208, change: -0.87, high: 0.074, low: 0.0705, volume: 98000000, marketCap: 10500000000, category: "crypto", futures: true, funding: -0.006 },
  { symbol: "TON", name: "Toncoin", price: 1.6, change: 0.94, high: 1.64, low: 1.55, volume: 72000000, marketCap: 5600000000, category: "crypto", futures: true, funding: 0.01 },
  { symbol: "TRX", name: "TRON", price: 0.3303, change: -0.48, high: 0.338, low: 0.325, volume: 61000000, marketCap: 28500000000, category: "crypto", futures: true, funding: 0.002 },
  { symbol: "ADA", name: "Cardano", price: 0.1629, change: -0.48, high: 0.168, low: 0.16, volume: 54000000, marketCap: 5700000000, category: "crypto", futures: true, funding: -0.003 },
  { symbol: "LTC", name: "Litecoin", price: 84.2, change: 1.12, high: 86.1, low: 82.4, volume: 43000000, marketCap: 6300000000, category: "crypto", futures: true, funding: 0.007 },
  { symbol: "LINK", name: "Chainlink", price: 13.84, change: 2.66, high: 14.2, low: 13.2, volume: 88000000, marketCap: 8600000000, category: "crypto", futures: true, funding: 0.009 },
  { symbol: "AVAX", name: "Avalanche", price: 21.45, change: 1.9, high: 22.1, low: 20.8, volume: 77000000, marketCap: 8800000000, category: "crypto", futures: true, funding: 0.011 },
  { symbol: "DOT", name: "Polkadot", price: 4.12, change: -1.2, high: 4.28, low: 4.05, volume: 39000000, marketCap: 6200000000, category: "crypto", futures: true, funding: -0.002 },
  { symbol: "MATIC", name: "Polygon", price: 0.241, change: 0.55, high: 0.25, low: 0.235, volume: 51000000, marketCap: 2400000000, category: "crypto", futures: true, funding: 0.003 },
  { symbol: "SHIB", name: "SHIBA INU", price: 0.0000124, change: 4.2, high: 0.000013, low: 0.0000118, volume: 112000000, marketCap: 7300000000, category: "crypto", futures: true, funding: 0.02 },
  { symbol: "BCH", name: "Bitcoin Cash", price: 368.2, change: 0.9, high: 375, low: 360, volume: 28000000, marketCap: 7200000000, category: "crypto", futures: true, funding: 0.006 },
  { symbol: "ATOM", name: "Cosmos", price: 4.85, change: -0.4, high: 5.0, low: 4.7, volume: 22000000, marketCap: 1900000000, category: "crypto", futures: true, funding: 0.001 },
  { symbol: "UNI", name: "Uniswap", price: 7.42, change: 1.8, high: 7.7, low: 7.1, volume: 31000000, marketCap: 5600000000, category: "crypto", futures: true, funding: 0.008 },
  { symbol: "NEAR", name: "NEAR Protocol", price: 3.18, change: 2.4, high: 3.3, low: 3.0, volume: 26000000, marketCap: 3500000000, category: "crypto", futures: true, funding: 0.012 },
  { symbol: "APT", name: "Aptos", price: 5.62, change: -1.1, high: 5.9, low: 5.4, volume: 19000000, marketCap: 2800000000, category: "crypto", futures: true, funding: -0.004 },
  { symbol: "ARB", name: "Arbitrum", price: 0.48, change: 0.7, high: 0.5, low: 0.46, volume: 24000000, marketCap: 1900000000, category: "crypto", futures: true, funding: 0.005 },
  { symbol: "OP", name: "Optimism", price: 1.12, change: 1.5, high: 1.18, low: 1.08, volume: 21000000, marketCap: 1300000000, category: "crypto", futures: true, funding: 0.006 },
  { symbol: "PEPE", name: "Pepe", price: 0.0000089, change: 6.2, high: 0.0000095, low: 0.0000081, volume: 180000000, marketCap: 3700000000, category: "crypto", futures: true, funding: 0.025 },
  { symbol: "SUI", name: "Sui", price: 1.85, change: 3.1, high: 1.95, low: 1.75, volume: 95000000, marketCap: 5200000000, category: "crypto", futures: true, funding: 0.014 },
  { symbol: "FIL", name: "Filecoin", price: 3.42, change: -0.6, high: 3.55, low: 3.3, volume: 14000000, marketCap: 2100000000, category: "crypto", futures: true, funding: 0.002 },
  { symbol: "AAVE", name: "Aave", price: 148.5, change: 2.2, high: 152, low: 142, volume: 32000000, marketCap: 2200000000, category: "crypto", futures: true, funding: 0.007 },
  { symbol: "INJ", name: "Injective", price: 14.8, change: 4.1, high: 15.4, low: 13.9, volume: 28000000, marketCap: 1450000000, category: "crypto", futures: true, funding: 0.016 },
  { symbol: "USDT", name: "Tether", price: 1.0, change: 0.01, high: 1.001, low: 0.999, volume: 4200000000, marketCap: 112000000000, category: "stable", futures: false, funding: 0 },
  { symbol: "USDC", name: "USD Coin", price: 1.0, change: 0.0, high: 1.001, low: 0.999, volume: 1800000000, marketCap: 34000000000, category: "stable", futures: false, funding: 0 },
];

WUNNA.EXCHANGES = ["Binance", "OKX", "Bybit", "KuCoin", "Gate", "Wunnaxswap"];

WUNNA.DEPOSIT_FEES = [
  { symbol: "BTC", name: "Bitcoin", commission: "0.5%", min: "0.00005 BTC" },
  { symbol: "ETH", name: "Ethereum", commission: "0.5%", min: "0.0005 ETH" },
  { symbol: "USDT", name: "Tether", commission: "0%", min: "10 USDT" },
  { symbol: "USDC", name: "USD Coin", commission: "0%", min: "10 USDC" },
  { symbol: "SOL", name: "Solana", commission: "0.4%", min: "0.01 SOL" },
  { symbol: "BNB", name: "BNB", commission: "0.4%", min: "0.003 BNB" },
  { symbol: "XRP", name: "Ripple", commission: "0.4%", min: "3 XRP" },
  { symbol: "TON", name: "Toncoin", commission: "0.4%", min: "1 TON" },
  { symbol: "TRX", name: "TRON", commission: "0.3%", min: "5 TRX" },
  { symbol: "DOGE", name: "Dogecoin", commission: "0.5%", min: "5 DOGE" },
  { symbol: "ADA", name: "Cardano", commission: "0.5%", min: "2 ADA" },
  { symbol: "LTC", name: "Litecoin", commission: "0.4%", min: "0.01 LTC" },
  { symbol: "LINK", name: "Chainlink", commission: "0.5%", min: "1 LINK" },
  { symbol: "SUI", name: "Sui", commission: "0.4%", min: "1 SUI" },
  { symbol: "PEPE", name: "Pepe", commission: "0.5%", min: "100000 PEPE" },
];

WUNNA.FEE_TIERS = [
  { tier: "Basic", volume: "< $1K", maker: "0.10%", taker: "0.14%" },
  { tier: "Starter", volume: "$1K – $10K", maker: "0.09%", taker: "0.12%" },
  { tier: "Active", volume: "$10K – $50K", maker: "0.07%", taker: "0.10%" },
  { tier: "Trader", volume: "$50K – $250K", maker: "0.05%", taker: "0.08%" },
  { tier: "Pro", volume: "$250K – $1M", maker: "0.04%", taker: "0.07%" },
  { tier: "VIP", volume: "$1M+", maker: "0.03%", taker: "0.06%" },
];

WUNNA.STAKING = [
  { asset: "USDT", apr: 5.2, term: "Flexible", lock: "None", risk: "Low", min: 10, capacity: 92 },
  { asset: "ETH", apr: 3.8, term: "Flexible", lock: "None", risk: "Low", min: 0.01, capacity: 78 },
  { asset: "BTC", apr: 2.1, term: "30 days", lock: "30d", risk: "Low", min: 0.001, capacity: 65 },
  { asset: "SOL", apr: 6.4, term: "Flexible", lock: "None", risk: "Medium", min: 0.1, capacity: 88 },
  { asset: "BNB", apr: 4.0, term: "60 days", lock: "60d", risk: "Low", min: 0.05, capacity: 71 },
  { asset: "TON", apr: 7.5, term: "Flexible", lock: "None", risk: "Medium", min: 1, capacity: 54 },
  { asset: "ADA", apr: 3.2, term: "Flexible", lock: "None", risk: "Low", min: 10, capacity: 60 },
  { asset: "DOT", apr: 8.1, term: "90 days", lock: "90d", risk: "Medium", min: 1, capacity: 41 },
  { asset: "ATOM", apr: 9.5, term: "Flexible", lock: "None", risk: "Medium", min: 1, capacity: 58 },
  { asset: "SUI", apr: 5.8, term: "Flexible", lock: "None", risk: "Medium", min: 1, capacity: 73 },
];

WUNNA.FAQ = [
  { q: "What is Wunnaxswap?", a: "Wunnaxswap is a crypto marketplace focused on competitive buy/sell rates, instant swaps, multi-exchange arbitrage discovery, spot & futures trading, and earn products." },
  { q: "What is coin arbitrage on Wunnaxswap?", a: "Arbitrage means spotting price differences for the same coin across venues. The scanner compares simulated multi-venue quotes so you can find cheaper buys and higher sells." },
  { q: "What is Futures trading?", a: "USDT-M perpetual contracts let you go Long or Short with leverage. Funding rates periodically exchange between long and short positions. Demo mode uses simulated margin only." },
  { q: "Is this live production trading with real funds?", a: "This website is a fully interactive demo frontend. Balances, orders, and charts are simulated in your browser. Connect a real backend for production." },
  { q: "How do fees work?", a: "Maker and taker fees follow volume tiers from Basic to VIP. Futures use a separate fee schedule shown on the Fees page." },
  { q: "What is Two-Factor Authentication (2FA)?", a: "2FA adds a second login factor (usually a 6-digit authenticator code). Enable it under Profile → Settings." },
  { q: "How do I pass KYC?", a: "Open Profile → Settings → Verification, submit ID details, a clear document photo, and a liveness check." },
  { q: "Which assets are supported?", a: "Major coins and stables including BTC, ETH, SOL, BNB, XRP, USDT, USDC, PEPE, SUI, and more — each shown with its official logo." },
];

WUNNA.ROADMAP = [
  { tag: "Live", title: "Spot + Swap", desc: "Markets, swap desk, wallet demo, and fee transparency." },
  { tag: "Live", title: "Futures Perp", desc: "USDT-M perpetual long/short with leverage & funding." },
  { tag: "Live", title: "Arbitrage Scanner", desc: "Cross-venue spread finder with profit estimates." },
  { tag: "Live", title: "Pro Candles", desc: "OHLCV candlesticks, volume, crosshair, timeframes." },
  { tag: "Next", title: "Depth + Alerts", desc: "Full depth chart and price alert API hooks." },
  { tag: "Soon", title: "Fiat On-Ramp", desc: "Cards & bank transfers for local payment rails." },
  { tag: "Soon", title: "Mobile PWA", desc: "Installable app with push alerts for arb windows." },
  { tag: "Future", title: "Copy Arb Bots", desc: "Optional automated strategies with risk limits." },
];
