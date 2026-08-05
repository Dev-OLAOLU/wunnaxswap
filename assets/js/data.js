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
  BUSD: "https://assets.coingecko.com/coins/images/9576/small/BUSD.png",
  DAI: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
  BCH: "https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png",
  ATOM: "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  UNI: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  NEAR: "https://assets.coingecko.com/coins/images/10365/small/near.jpg",
  AAVE: "https://assets.coingecko.com/coins/images/12645/small/aave-token-round.png",
  ALGO: "https://assets.coingecko.com/coins/images/4380/small/download.png",
  APE: "https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg",
  AXS: "https://assets.coingecko.com/coins/images/13029/small/axie_infinity_logo.png",
  CRO: "https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png",
  MANA: "https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png",
  ETC: "https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png",
  FLOW: "https://assets.coingecko.com/coins/images/13446/small/5f6294c0c7a8cda55cb1c936_Flow_Wordmark.png",
  KCS: "https://assets.coingecko.com/coins/images/1047/small/sa9z79.png",
  LEO: "https://assets.coingecko.com/coins/images/8418/small/leo-token.png",
  SAND: "https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg",
  VET: "https://assets.coingecko.com/coins/images/1167/small/VET.png",
  IPC: "https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png",
};

WUNNA.logoUrl = function (symbol) {
  return (
    WUNNA.LOGO[symbol] ||
    "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/" +
      String(symbol || "generic").toLowerCase() +
      ".png"
  );
};

/**
 * Supported exchanges (arbitrage / multi-venue demo quotes)
 */
WUNNA.EXCHANGES = [
  "Aster",
  "Binance",
  "Bitfinex",
  "Bitget",
  "Coinbase Advanced",
  "Crypto.com",
  "EVEDEX",
  "Gate.io",
  "Gemini",
  "HTX",
  "Hyperliquid",
  "Kraken",
  "Kucoin",
  "OKX",
  "Poloniex",
  "WhiteBIT",
  "BitMart",
  "Wunnaxswap",
];

/**
 * Supported coins — markets, swap, trade, deposit UI
 * Demo prices; tick simulation adjusts them in-browser.
 */
function asset(symbol, name, price, change, marketCap, opts) {
  opts = opts || {};
  var cat = opts.category || "crypto";
  var futures = opts.futures !== false && cat !== "stable";
  var high = price * (1 + Math.abs(change) / 100 + 0.01);
  var low = price * (1 - Math.abs(change) / 100 - 0.01);
  return {
    symbol: symbol,
    name: name,
    price: price,
    change: change,
    high: high,
    low: low,
    volume: opts.volume || marketCap * 0.04,
    marketCap: marketCap,
    category: cat,
    futures: futures,
    funding: futures ? opts.funding || 0.005 : 0,
  };
}

WUNNA.ASSETS = [
  asset("AAVE", "Aave", 148.5, 2.2, 2200000000),
  asset("ALGO", "Algorand", 0.185, 0.8, 1500000000),
  asset("APE", "ApeCoin", 1.12, -1.4, 780000000),
  asset("AVAX", "Avalanche", 21.45, 1.9, 8800000000),
  asset("AXS", "Axie Infinity", 6.4, 1.1, 950000000),
  asset("BNB", "BNB", 571.74, 0.18, 86000000000),
  asset("BUSD", "Binance USD", 1.0, 0.0, 5000000000, { category: "stable", futures: false }),
  asset("BTC", "Bitcoin", 65044.76, 0.8, 1280000000000),
  asset("BCH", "Bitcoin Cash", 368.2, 0.9, 7200000000),
  asset("ADA", "Cardano", 0.1629, -0.48, 5700000000),
  asset("LINK", "Chainlink", 13.84, 2.66, 8600000000),
  asset("ATOM", "Cosmos", 4.85, -0.4, 1900000000),
  asset("CRO", "Cronos", 0.092, 0.6, 2500000000),
  asset("DAI", "Dai", 1.0, 0.0, 5300000000, { category: "stable", futures: false }),
  asset("MANA", "Decentraland", 0.38, 1.3, 720000000),
  asset("DOGE", "Dogecoin", 0.07208, -0.87, 10500000000),
  asset("ETH", "Ethereum", 1947.61, 3.45, 234000000000),
  asset("ETC", "Ethereum Classic", 22.4, 0.5, 3300000000),
  asset("FLOW", "Flow", 0.72, -0.9, 1100000000),
  asset("IPC", "IPChain", 0.045, 0.3, 45000000),
  asset("KCS", "KuCoin Token", 9.8, 0.7, 950000000),
  asset("LEO", "LEO", 5.95, 0.2, 5500000000),
  asset("LTC", "Litecoin", 84.2, 1.12, 6300000000),
  asset("NEAR", "NEAR", 3.18, 2.4, 3500000000),
  asset("DOT", "Polkadot", 4.12, -1.2, 6200000000),
  asset("MATIC", "Polygon", 0.241, 0.55, 2400000000),
  asset("XRP", "Ripple", 1.0995, 0.23, 60000000000),
  asset("SAND", "Sandbox", 0.42, 1.5, 980000000),
  asset("SHIB", "Shiba Inu", 0.0000124, 4.2, 7300000000),
  asset("SOL", "Solana", 76.21, 2.1, 34000000000),
  asset("USDT", "Tether", 1.0, 0.01, 112000000000, { category: "stable", futures: false }),
  asset("TRX", "Tron", 0.3303, -0.48, 28500000000),
  asset("USDC", "USDC", 1.0, 0.0, 34000000000, { category: "stable", futures: false }),
  asset("UNI", "Uniswap", 7.42, 1.8, 5600000000),
  asset("VET", "VeChain", 0.028, 0.9, 2300000000),
];

/** Display-only ordered lists for “Supported” UI */
WUNNA.SUPPORTED_EXCHANGES = WUNNA.EXCHANGES.filter(function (e) {
  return e !== "Wunnaxswap";
});

WUNNA.SUPPORTED_COINS = WUNNA.ASSETS.map(function (a) {
  return { symbol: a.symbol, name: a.name, category: a.category };
});

WUNNA.DEPOSIT_FEES = WUNNA.ASSETS.map(function (a) {
  var isStable = a.category === "stable";
  var min =
    isStable
      ? "10 " + a.symbol
      : a.price >= 100
        ? "0.001 " + a.symbol
        : a.price >= 1
          ? "0.01 " + a.symbol
          : a.price >= 0.01
            ? "1 " + a.symbol
            : "1000 " + a.symbol;
  return {
    symbol: a.symbol,
    name: a.name,
    commission: isStable ? "0%" : "0.4%",
    min: min,
  };
});

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
  { asset: "ADA", apr: 3.2, term: "Flexible", lock: "None", risk: "Low", min: 10, capacity: 60 },
  { asset: "DOT", apr: 8.1, term: "90 days", lock: "90d", risk: "Medium", min: 1, capacity: 41 },
  { asset: "ATOM", apr: 9.5, term: "Flexible", lock: "None", risk: "Medium", min: 1, capacity: 58 },
  { asset: "AAVE", apr: 4.5, term: "Flexible", lock: "None", risk: "Medium", min: 0.1, capacity: 55 },
  { asset: "AVAX", apr: 5.0, term: "Flexible", lock: "None", risk: "Medium", min: 0.5, capacity: 62 },
];

WUNNA.ROADMAP = WUNNA.ROADMAP || [
  { tag: "Live", title: "Spot & swap", desc: "Markets, instant swap, and demo wallet balances." },
  { tag: "Live", title: "Multi-exchange quotes", desc: "Arbitrage scanner across supported venues." },
  { tag: "Live", title: "Derivatives desk", desc: "FX, indices, commodities & crypto perps in one terminal." },
  { tag: "Next", title: "Earn expansion", desc: "More staking assets and flexible plans." },
  { tag: "Later", title: "Deep liquidity", desc: "Tighter spreads and more order types." },
];

/**
 * Multi-asset derivatives (demo) — not just crypto.
 * class: forex | index | commodity | crypto
 */
function deriv(symbol, name, price, change, cls, opts) {
  opts = opts || {};
  return {
    symbol: symbol,
    name: name,
    price: price,
    change: change,
    high: price * (1 + Math.abs(change) / 100 + 0.008),
    low: price * (1 - Math.abs(change) / 100 - 0.008),
    volume: opts.volume || price * 50000,
    class: cls || "crypto",
    product: opts.product || "PERP",
    quote: opts.quote || "USDT",
    leverageMax: opts.leverageMax || 50,
    funding: typeof opts.funding === "number" ? opts.funding : 0.01,
    tick: opts.tick || 0.01,
    unit: opts.unit || "contracts",
    session: opts.session || "24/7",
  };
}

WUNNA.DERIV_CLASSES = [
  { id: "all", label: "All markets" },
  { id: "forex", label: "FX" },
  { id: "index", label: "Indices" },
  { id: "commodity", label: "Commodities" },
  { id: "crypto", label: "Crypto perps" },
];

WUNNA.DERIVATIVES = [
  // Forex
  deriv("EURUSD", "Euro / US Dollar", 1.0864, 0.12, "forex", { product: "PERP", quote: "USD", leverageMax: 100, tick: 0.0001, unit: "lots", session: "Mon–Fri" }),
  deriv("GBPUSD", "British Pound / USD", 1.2738, -0.08, "forex", { product: "PERP", quote: "USD", leverageMax: 100, tick: 0.0001, unit: "lots", session: "Mon–Fri" }),
  deriv("USDJPY", "US Dollar / Yen", 151.42, 0.21, "forex", { product: "PERP", quote: "JPY", leverageMax: 100, tick: 0.01, unit: "lots", session: "Mon–Fri" }),
  deriv("AUDUSD", "Aussie / USD", 0.6612, 0.05, "forex", { product: "PERP", quote: "USD", leverageMax: 100, tick: 0.0001, unit: "lots", session: "Mon–Fri" }),
  deriv("USDCAD", "USD / Canadian", 1.3588, -0.04, "forex", { product: "PERP", quote: "CAD", leverageMax: 100, tick: 0.0001, unit: "lots", session: "Mon–Fri" }),
  deriv("USDCHF", "USD / Swiss Franc", 0.8845, 0.09, "forex", { product: "PERP", quote: "CHF", leverageMax: 100, tick: 0.0001, unit: "lots", session: "Mon–Fri" }),
  // Indices
  deriv("US500", "S&P 500", 5284.6, 0.35, "index", { product: "PERP", quote: "USD", leverageMax: 50, tick: 0.1, unit: "contracts", session: "Near 24h" }),
  deriv("NAS100", "Nasdaq 100", 18420.3, 0.62, "index", { product: "PERP", quote: "USD", leverageMax: 50, tick: 0.1, unit: "contracts", session: "Near 24h" }),
  deriv("US30", "Dow Jones 30", 39210.8, 0.18, "index", { product: "PERP", quote: "USD", leverageMax: 50, tick: 1, unit: "contracts", session: "Near 24h" }),
  deriv("GER40", "DAX 40", 18240.5, -0.22, "index", { product: "PERP", quote: "EUR", leverageMax: 40, tick: 0.5, unit: "contracts", session: "Near 24h" }),
  deriv("UK100", "FTSE 100", 8245.1, 0.11, "index", { product: "PERP", quote: "GBP", leverageMax: 40, tick: 0.5, unit: "contracts", session: "Near 24h" }),
  deriv("JP225", "Nikkei 225", 38890.0, 0.44, "index", { product: "PERP", quote: "JPY", leverageMax: 40, tick: 5, unit: "contracts", session: "Near 24h" }),
  // Commodities
  deriv("XAUUSD", "Gold", 2348.6, 0.28, "commodity", { product: "PERP", quote: "USD", leverageMax: 50, tick: 0.1, unit: "oz", session: "Near 24h" }),
  deriv("XAGUSD", "Silver", 28.42, 0.55, "commodity", { product: "PERP", quote: "USD", leverageMax: 30, tick: 0.01, unit: "oz", session: "Near 24h" }),
  deriv("WTI", "Crude Oil WTI", 78.35, -0.72, "commodity", { product: "PERP", quote: "USD", leverageMax: 30, tick: 0.01, unit: "bbl", session: "Near 24h" }),
  deriv("BRENT", "Brent Crude", 82.1, -0.51, "commodity", { product: "PERP", quote: "USD", leverageMax: 30, tick: 0.01, unit: "bbl", session: "Near 24h" }),
  deriv("NATGAS", "Natural Gas", 2.84, 1.2, "commodity", { product: "PERP", quote: "USD", leverageMax: 20, tick: 0.001, unit: "mmBtu", session: "Near 24h" }),
  deriv("COPPER", "Copper", 4.62, 0.33, "commodity", { product: "PERP", quote: "USD", leverageMax: 20, tick: 0.001, unit: "lb", session: "Near 24h" }),
  // Crypto perps (linked to crypto book)
  deriv("BTCUSDT", "Bitcoin Perp", 65044.76, 0.8, "crypto", { product: "PERP", quote: "USDT", leverageMax: 100, funding: 0.008, unit: "contracts" }),
  deriv("ETHUSDT", "Ethereum Perp", 1947.61, 3.45, "crypto", { product: "PERP", quote: "USDT", leverageMax: 100, funding: 0.012, unit: "contracts" }),
  deriv("SOLUSDT", "Solana Perp", 76.21, 2.1, "crypto", { product: "PERP", quote: "USDT", leverageMax: 75, funding: 0.015, unit: "contracts" }),
  deriv("BNBUSDT", "BNB Perp", 571.74, 0.18, "crypto", { product: "PERP", quote: "USDT", leverageMax: 50, funding: 0.01, unit: "contracts" }),
  deriv("XRPUSDT", "XRP Perp", 1.0995, 0.23, "crypto", { product: "PERP", quote: "USDT", leverageMax: 50, funding: 0.009, unit: "contracts" }),
  deriv("DOGEUSDT", "Dogecoin Perp", 0.07208, -0.87, "crypto", { product: "PERP", quote: "USDT", leverageMax: 50, funding: 0.02, unit: "contracts" }),
];

WUNNA.derivBySymbol = function (sym) {
  sym = String(sym || "").toUpperCase();
  return (WUNNA.DERIVATIVES || []).find(function (d) {
    return d.symbol === sym;
  });
};
