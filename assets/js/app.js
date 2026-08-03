/* Wunnaxswap shared UI + interactive demo engine */
(function () {
  const STORAGE = {
    user: "wunnax_user",
    wallet: "wunnax_wallet",
    orders: "wunnax_orders",
    favorites: "wunnax_favs",
    session: "wunnax_session",
    stakes: "wunnax_stakes",
  };

  /** Firebase backend (optional — see assets/js/firebase-config.js) */
  let backendWalletCache = null;
  let backendUserCache = null;

  function backendOn() {
    return !!(window.WunnaxBackend && typeof WunnaxBackend.enabled === "function" && WunnaxBackend.enabled());
  }

  /** Friendly message from backend or raw Error */
  function backendErr(err) {
    if (window.WunnaxBackend && typeof WunnaxBackend.formatError === "function") {
      return WunnaxBackend.formatError(err);
    }
    return (err && err.message) || "Request failed";
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function money(n, d) {
    if (n === undefined || n === null || isNaN(n)) return "—";
    const abs = Math.abs(n);
    const digits = d != null ? d : abs >= 1000 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8;
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function compact(n) {
    if (n == null || isNaN(n)) return "—";
    const a = Math.abs(n);
    if (a >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
    if (a >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + money(n, 2);
  }

  function coinImg(symbol, cls) {
    const url = (window.WUNNA && WUNNA.logoUrl) ? WUNNA.logoUrl(symbol) : "";
    const c = cls || "coin-logo";
    return '<img class="' + c + '" src="' + url + '" alt="' + symbol +
      '" width="28" height="28" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling&&(this.nextElementSibling.style.display=\'grid\')" />' +
      '<span class="asset-badge" style="display:none">' + String(symbol).slice(0, 2) + "</span>";
  }

  function getStakes() {
    try { return JSON.parse(localStorage.getItem(STORAGE.stakes) || "[]"); } catch (e) { return []; }
  }
  function setStakes(s) { localStorage.setItem(STORAGE.stakes, JSON.stringify(s)); }

  async function refreshBackendWallet() {
    if (!backendOn() || !WunnaxBackend.isAuthed()) {
      backendWalletCache = null;
      return null;
    }
    try {
      backendWalletCache = await WunnaxBackend.getBalancesMap();
      if (backendWalletCache) setWallet(backendWalletCache);
      return backendWalletCache;
    } catch (e) {
      console.warn("[Wunnax] wallet refresh failed", e);
      return null;
    }
  }

  async function refreshBackendUser() {
    if (!backendOn()) {
      backendUserCache = null;
      return null;
    }
    try {
      backendUserCache = await WunnaxBackend.getSessionUser();
      if (backendUserCache) setUser(backendUserCache);
      return backendUserCache;
    } catch (e) {
      backendUserCache = null;
      return null;
    }
  }

  function toast(msg) {
    let wrap = $(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  function getUser() {
    if (backendOn() && backendUserCache) return backendUserCache;
    try { return JSON.parse(localStorage.getItem(STORAGE.user) || "null"); } catch (e) { return null; }
  }
  function setUser(u) { localStorage.setItem(STORAGE.user, JSON.stringify(u)); }
  function isAuthed() {
    if (backendOn()) return !!(WunnaxBackend.isAuthed() || backendUserCache || localStorage.getItem(STORAGE.session));
    return !!localStorage.getItem(STORAGE.session);
  }

  function defaultWallet() {
    return { USDT: 2500, BTC: 0.05, ETH: 1.2, SOL: 15, BNB: 2, XRP: 200 };
  }
  function getWallet() {
    if (backendOn() && backendWalletCache) return Object.assign({}, backendWalletCache);
    try {
      return JSON.parse(localStorage.getItem(STORAGE.wallet) || "null") || defaultWallet();
    } catch (e) { return defaultWallet(); }
  }
  function setWallet(w) { localStorage.setItem(STORAGE.wallet, JSON.stringify(w)); }

  function getOrders() {
    try { return JSON.parse(localStorage.getItem(STORAGE.orders) || "[]"); } catch (e) { return []; }
  }
  function setOrders(o) { localStorage.setItem(STORAGE.orders, JSON.stringify(o)); }

  function getFavs() {
    try { return JSON.parse(localStorage.getItem(STORAGE.favorites) || "[]"); } catch (e) { return []; }
  }
  function toggleFav(sym) {
    const favs = getFavs();
    const i = favs.indexOf(sym);
    if (i >= 0) favs.splice(i, 1); else favs.push(sym);
    localStorage.setItem(STORAGE.favorites, JSON.stringify(favs));
    return favs;
  }

  /* Simulated live ticks */
  function tickPrices() {
    if (!window.WUNNA || !WUNNA.ASSETS) return;
    WUNNA.ASSETS.forEach(function (a) {
      if (a.symbol === "USDT" || a.symbol === "USDC") {
        a.price = 1 + (Math.random() - 0.5) * 0.0004;
        a.change = (a.price - 1) * 100;
        return;
      }
      const vol = a.price * (0.0008 + Math.random() * 0.0015);
      const dir = Math.random() > 0.5 ? 1 : -1;
      a.price = Math.max(a.price * 0.0001, a.price + dir * vol * Math.random());
      a.change = +(a.change + (Math.random() - 0.5) * 0.08).toFixed(2);
      a.high = Math.max(a.high, a.price);
      a.low = Math.min(a.low, a.price);
      a.volume = a.volume * (1 + (Math.random() - 0.5) * 0.002);
      if (a.marketCap) a.marketCap = a.marketCap * (1 + (Math.random() - 0.5) * 0.0015);
      if (typeof a.funding === "number") a.funding = +(a.funding + (Math.random() - 0.5) * 0.002).toFixed(4);
    });
    document.dispatchEvent(new CustomEvent("wunna:prices"));
  }

  function assetBySymbol(sym) {
    return (WUNNA.ASSETS || []).find(function (a) { return a.symbol === sym; });
  }

  /* Shell: nav + footer + chat */
  function pathPrefix() {
    const path = location.pathname.replace(/\\/g, "/");
    if (path.includes("/tools/") || path.includes("/profile/")) return "../";
    return "";
  }

  function renderShell() {
    const p = pathPrefix();
    const user = getUser();
    const authed = isAuthed();

    const header = document.createElement("header");
    header.className = "topbar";
    header.innerHTML =
      '<div class="container topbar-inner">' +
      '<a class="brand" href="' + p + 'index.html"><span class="brand-mark">WX</span> Wunnaxswap</a>' +
      '<nav class="nav" id="mainNav">' +
      '<a href="' + p + 'markets.html">Markets</a>' +
      '<div class="drop"><button type="button">Trade ▾</button><div class="drop-menu">' +
      '<a href="' + p + 'trade.html">Spot Terminal</a>' +
      '<a href="' + p + 'trade.html?mode=futures">Futures Perp</a>' +
      '<a href="' + p + 'swap.html">Instant Swap</a>' +
      '<a href="' + p + 'arbitrage.html">Arbitrage Scanner</a>' +
      "</div></div>" +
      '<a href="' + p + 'earn.html">Earn</a>' +
      '<div class="drop"><button type="button">Tools ▾</button><div class="drop-menu">' +
      '<a href="' + p + 'tools/market-cap.html">Market Cap</a>' +
      '<a href="' + p + 'tools/screener.html">Market Screener</a>' +
      '<a href="' + p + 'tools/cross-rates.html">Cross Rates</a>' +
      '<a href="' + p + 'tools/heat-map.html">Heat Map</a>' +
      '<a href="' + p + 'tools/technical.html">Technical Analysis</a>' +
      "</div></div>" +
      '<a href="' + p + 'fees.html">Fees</a>' +
      '<a href="' + p + 'about.html">About</a>' +
      '<a href="' + p + 'contact.html">Contact</a>' +
      "</nav>" +
      '<div class="nav-actions">' +
      (authed
        ? '<a class="btn btn-ghost btn-sm hide-sm" href="' + p + 'profile/wallet.html">Wallet</a>' +
          '<a class="btn btn-soft btn-sm" href="' + p + 'profile/settings.html">' +
          (user && user.name ? user.name.split(" ")[0] : "Account") +
          "</a>" +
          '<button class="btn btn-ghost btn-sm" type="button" id="logoutBtn">Log out</button>'
        : '<a class="btn btn-ghost btn-sm hide-sm" href="' + p + 'signin.html">Sign In</a>' +
          '<a class="btn btn-primary btn-sm" href="' + p + 'signup.html">Sign Up</a>') +
      '<button class="menu-toggle" type="button" id="menuToggle" aria-label="Menu">☰</button>' +
      "</div></div>";

    const mobile = document.createElement("div");
    mobile.className = "mobile-nav";
    mobile.id = "mobileNav";
    mobile.innerHTML =
      '<a href="' + p + 'index.html">Home</a>' +
      '<a href="' + p + 'markets.html">Markets</a>' +
      '<a href="' + p + 'trade.html">Spot Trade</a>' +
      '<a href="' + p + 'swap.html">Swap</a>' +
      '<a href="' + p + 'arbitrage.html">Arbitrage</a>' +
      '<a href="' + p + 'earn.html">Earn</a>' +
      '<a href="' + p + 'tools/market-cap.html">Tools</a>' +
      '<a href="' + p + 'fees.html">Fees</a>' +
      '<a href="' + p + 'about.html">About</a>' +
      '<a href="' + p + 'contact.html">Contact</a>' +
      '<a href="' + p + 'faq.html">FAQ</a>' +
      (authed
        ? '<a href="' + p + 'profile/wallet.html">Wallet</a><a href="' + p + 'profile/deposit.html">Deposit</a>'
        : '<a href="' + p + 'signin.html">Sign In</a><a href="' + p + 'signup.html">Sign Up</a>');

    const footer = document.createElement("footer");
    footer.className = "footer";
    footer.innerHTML =
      '<div class="container footer-grid">' +
      "<div><a class=\"brand\" href=\"" + p + "index.html\"><span class=\"brand-mark\">WX</span> Wunnaxswap</a>" +
      "<p class=\"muted\" style=\"margin:.7rem 0 0;font-size:.9rem\">Buy & sell crypto smarter. Arbitrage-aware rates, transparent fees, and tools built for everyday traders.</p></div>" +
      "<div><h4>Products</h4>" +
      '<a href="' + p + 'markets.html">Markets</a><a href="' + p + 'swap.html">Swap</a>' +
      '<a href="' + p + 'arbitrage.html">Arbitrage</a><a href="' + p + 'trade.html">Spot Trade</a>' +
      '<a href="' + p + 'earn.html">Earn</a></div>' +
      "<div><h4>Tools</h4>" +
      '<a href="' + p + 'tools/market-cap.html">Market Cap</a><a href="' + p + 'tools/screener.html">Screener</a>' +
      '<a href="' + p + 'tools/cross-rates.html">Cross Rates</a><a href="' + p + 'tools/heat-map.html">Heat Map</a>' +
      '<a href="' + p + 'tools/technical.html">Technical</a></div>' +
      "<div><h4>Company</h4>" +
      '<a href="' + p + 'about.html">About</a><a href="' + p + 'fees.html">Fees</a>' +
      '<a href="' + p + 'contact.html">Contact</a><a href="' + p + 'faq.html">FAQ</a></div>' +
      "<div><h4>Legal</h4>" +
      '<a href="' + p + 'terms.html">Terms</a><a href="' + p + 'privacy.html">Privacy</a>' +
      '<a href="' + p + 'compliance.html">Compliance</a></div></div>' +
      '<div class="container footer-bottom"><span>© ' + new Date().getFullYear() +
      " Wunnaxswap. Demo frontend — not financial advice.</span>" +
      "<span>Built for cheaper buy/sell discovery & transparent crypto tools.</span></div>";

    document.body.prepend(mobile);
    document.body.prepend(header);
    document.body.appendChild(footer);

    // Active link highlight
    $$(".nav a, .mobile-nav a").forEach(function (a) {
      const href = a.getAttribute("href") || "";
      const file = location.pathname.split("/").pop() || "index.html";
      if (href.endsWith(file)) a.classList.add("active");
    });

    $("#menuToggle") && $("#menuToggle").addEventListener("click", function () {
      $("#mobileNav").classList.toggle("open");
    });
    $("#logoutBtn") && $("#logoutBtn").addEventListener("click", function () {
      localStorage.removeItem(STORAGE.session);
      backendUserCache = null;
      backendWalletCache = null;
      if (backendOn()) {
        WunnaxBackend.signOut().finally(function () {
          toast("Signed out");
          setTimeout(function () { location.href = p + "index.html"; }, 500);
        });
        return;
      }
      toast("Signed out");
      setTimeout(function () { location.href = p + "index.html"; }, 500);
    });

    // Customer Care + AI Assistant (bottom-right, all pages)
    initCareAssistant(p);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pageContext() {
    const path = (location.pathname || "").toLowerCase();
    const file = path.split("/").pop() || "index.html";
    if (file.includes("trade")) return "trade";
    if (file.includes("swap")) return "swap";
    if (file.includes("arbitrage")) return "arbitrage";
    if (file.includes("market")) return "markets";
    if (file.includes("earn") || file.includes("staking")) return "earn";
    if (file.includes("wallet") || file.includes("deposit")) return "wallet";
    if (file.includes("signin") || file.includes("signup")) return "auth";
    if (file.includes("fee")) return "fees";
    if (file.includes("faq")) return "faq";
    if (file.includes("screener") || file.includes("heat") || file.includes("technical") || file.includes("cross") || file.includes("market-cap")) return "tools";
    if (file.includes("settings")) return "settings";
    if (file.includes("index") || file === "" || file === "/") return "home";
    return "general";
  }

  const COIN_INTEL = {
    BTC: {
      name: "Bitcoin",
      role: "flagship store-of-value and liquidity leader",
      drivers: "ETF/flow narratives, dollar strength (DXY), rates, miner selling, halving cycle positioning, institutional custody demand",
      levels: "Watch prior day high/low, round psychological levels ($60k / $65k / $70k zones in demo), and volume spikes",
      bias: "BTC often leads alt season on/off — strong BTC trend lifts risk assets; sharp BTC dumps usually hit alts harder",
    },
    ETH: {
      name: "Ethereum",
      role: "smart-contract platform and DeFi / L2 settlement layer",
      drivers: "staking yields, L2 activity, ETH/BTC ratio, gas demand, restaking narratives, ETF flow stories",
      levels: "Track ETH/BTC ratio for relative strength; demo range high/low and mid for mean-reversion hints",
      bias: "ETH can outperform BTC when risk-on + DeFi/L2 activity rises; underperforms when pure 'digital gold' narrative dominates",
    },
    SOL: {
      name: "Solana",
      role: "high-throughput L1 with strong retail/meme and DeFi activity",
      drivers: "network uptime perception, meme coin cycles, NFT/activity spikes, ecosystem TVL, risk appetite",
      levels: "More volatile than BTC/ETH — use wider stop logic; momentum often extends after volume breakouts",
      bias: "Tends to amplify BTC direction; rises faster in risk-on, falls faster in risk-off",
    },
    BNB: {
      name: "BNB",
      role: "exchange-ecosystem token (utility + burn narrative)",
      drivers: "exchange volume, launchpad activity, burn schedule stories, broad market beta",
      levels: "Often trades as beta to BTC with lower relative volatility than pure memes",
      bias: "Usually tracks majors; less explosive upside than SOL/meme names unless exchange catalysts hit",
    },
    XRP: {
      name: "Ripple (XRP)",
      role: "payments-focused large-cap with regulatory narrative sensitivity",
      drivers: "legal/regulatory headlines, payment corridor stories, BTC correlation, liquidity events",
      levels: "Can gap on news; demo change% is a quick sentiment proxy",
      bias: "News-driven spikes possible; otherwise mid-cap beta to majors",
    },
    DOGE: {
      name: "Dogecoin",
      role: "original meme large-cap, high retail sentiment beta",
      drivers: "social volume, celebrity/meme cycles, BTC risk-on, exchange listing liquidity",
      levels: "High noise — short-term signals less reliable; volume is key",
      bias: "Amplifies market mood; strong only when retail FOMO is active",
    },
    PEPE: {
      name: "Pepe",
      role: "meme micro/mid-cap high beta",
      drivers: "social hype, BTC risk-on, liquidity and listing flows",
      levels: "Extremely volatile — treat demo signals as short-horizon only",
      bias: "Rises/falls faster than BTC; weak when BTC dumps hard",
    },
    LINK: {
      name: "Chainlink",
      role: "oracle infrastructure for DeFi and tokenized assets",
      drivers: "DeFi TVL, CCIP / RWA narratives, ETH ecosystem health",
      levels: "Often follows ETH risk cycles with infrastructure premium",
      bias: "Constructive when DeFi/RWA narrative is hot",
    },
    AVAX: {
      name: "Avalanche",
      role: "L1 with subnet / DeFi narrative",
      drivers: "ecosystem growth, BTC risk appetite, competitor L1 rotation",
      levels: "Momentum with volume more useful than slow grind ranges",
      bias: "Risk-on alt; follows majors with higher beta",
    },
    SUI: {
      name: "Sui",
      role: "newer high-performance L1",
      drivers: "ecosystem launches, retail attention, SOL-like high-beta flows",
      levels: "Momentum-driven; check 24h range expansion",
      bias: "Can lead alts in risk-on; sharp mean reversion after overextension",
    },
  };

  function compactUsd(n) {
    if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + money(n, 2);
  }

  function findCoinInQuery(q) {
    const aliases = {
      bitcoin: "BTC", btc: "BTC", ethereum: "ETH", eth: "ETH", ether: "ETH",
      solana: "SOL", sol: "SOL", binance: "BNB", bnb: "BNB",
      ripple: "XRP", xrp: "XRP", doge: "DOGE", dogecoin: "DOGE",
      pepe: "PEPE", link: "LINK", chainlink: "LINK", avax: "AVAX", avalanche: "AVAX",
      sui: "SUI", ton: "TON", toncoin: "TON", ada: "ADA", cardano: "ADA",
      ltc: "LTC", litecoin: "LTC", matic: "MATIC", polygon: "MATIC",
      dot: "DOT", polkadot: "DOT", uni: "UNI", uniswap: "UNI",
      near: "NEAR", apt: "APT", arb: "ARB", op: "OP", optimism: "OP",
      shib: "SHIB", aave: "AAVE", inj: "INJ", injective: "INJ", fil: "FIL",
      bch: "BCH", atom: "ATOM", cosmos: "ATOM", trx: "TRX", tron: "TRX",
    };
    // longest alias first
    const keys = Object.keys(aliases).sort(function (a, b) { return b.length - a.length; });
    for (let i = 0; i < keys.length; i++) {
      const re = new RegExp("\\b" + keys[i] + "\\b", "i");
      if (re.test(q)) return aliases[keys[i]];
    }
    // bare symbols from assets
    if (WUNNA.ASSETS) {
      for (let j = 0; j < WUNNA.ASSETS.length; j++) {
        const s = WUNNA.ASSETS[j].symbol;
        if (new RegExp("\\b" + s + "\\b", "i").test(q)) return s;
      }
    }
    return null;
  }

  function analyzeCoin(symbol) {
    const a = assetBySymbol(symbol);
    if (!a) return null;
    const intel = COIN_INTEL[symbol] || {
      name: a.name,
      role: a.category === "stable" ? "stablecoin pegged near $1" : "crypto market asset on Wunnaxswap demo markets",
      drivers: "BTC leadership, liquidity, and sector rotation",
      levels: "Use demo 24h high/low and mid-range as short-term anchors",
      bias: "Follows broader market beta unless a unique catalyst appears",
    };
    const chg = a.change;
    const range = Math.max(a.high - a.low, a.price * 0.0001);
    const pos = (a.price - a.low) / range; // 0 bottom of day range, 1 top
    const mid = (a.high + a.low) / 2;
    const vol = a.volume || 0;
    const btc = assetBySymbol("BTC");
    const eth = assetBySymbol("ETH");

    let momentum = "neutral";
    if (chg >= 2.5) momentum = "strong bullish";
    else if (chg >= 0.6) momentum = "mild bullish";
    else if (chg <= -2.5) momentum = "strong bearish";
    else if (chg <= -0.6) momentum = "mild bearish";

    let rangeNote = "trading mid-range";
    if (pos >= 0.78) rangeNote = "pressing the top of today's demo range (extension risk / breakout watch)";
    else if (pos <= 0.22) rangeNote = "near the bottom of today's demo range (bounce or breakdown watch)";

    let nextBias = "sideways / choppy next few sessions unless volume expands";
    let action = "Wait for a clearer break of the 24h high or low with volume.";
    if (chg >= 1.2 && pos > 0.55) {
      nextBias = "short-term bias lean UP (momentum continuation more likely than full reverse)";
      action = "Bullish scenario: hold above mid-range $" + money(mid) + ". Pullback toward mid is healthier than a flush under 24h low $" + money(a.low) + ".";
    } else if (chg <= -1.2 && pos < 0.45) {
      nextBias = "short-term bias lean DOWN (sellers still in control unless reclaimed mid)";
      action = "Bearish scenario: rebounds may fade under mid $" + money(mid) + ". A reclaim of 24h high $" + money(a.high) + " would invalidate the weak bias.";
    } else if (Math.abs(chg) < 0.6) {
      nextBias = "range-bound — expect mean reversion until a breakout";
      action = "Trade the range: fade extremes near $" + money(a.low) + " / $" + money(a.high) + " or wait for expansion.";
    }

    // BTC leadership context
    let leader = "";
    if (btc && symbol !== "BTC") {
      if (btc.change >= 1 && chg < btc.change - 0.5) leader = " BTC is stronger today — this coin is lagging the leader (catch-up or underperformance).";
      else if (btc.change <= -1 && chg > btc.change + 0.5) leader = " Holding up better than BTC on a red day (relative strength).";
      else if (btc.change >= 0.5 && chg >= 0.5) leader = " Moving with BTC risk-on — continuation often tracks BTC.";
      else if (btc.change <= -0.5 && chg <= -0.5) leader = " Selling with BTC — alts often bounce only after BTC stabilizes.";
    }
    if (symbol === "ETH" && btc) {
      const rel = chg - btc.change;
      if (rel >= 1) leader += " ETH/BTC strength positive (ETH outperforming BTC today).";
      else if (rel <= -1) leader += " ETH lagging BTC today (ratio pressure).";
    }

    let conf = 52;
    conf += Math.min(18, Math.abs(chg) * 4);
    if (pos > 0.8 || pos < 0.2) conf += 6;
    if (vol > 5e8) conf += 5;
    conf = Math.max(40, Math.min(78, Math.round(conf)));

    const lines = [
      "📊 " + intel.name + " (" + symbol + ") — live demo market read",
      "Price: $" + money(a.price) + " · 24h: " + (chg >= 0 ? "+" : "") + chg.toFixed(2) + "% (" + momentum + ")",
      "Range: low $" + money(a.low) + " → high $" + money(a.high) + " · now " + rangeNote,
      "Volume (demo): " + compactUsd(vol) + " · MCap: " + compactUsd(a.marketCap || 0),
      "What it is: " + intel.role + ".",
      "Key drivers: " + intel.drivers + ".",
      "Next-move bias: " + nextBias + "." + leader,
      action,
      "Model confidence ~" + conf + "% (demo heuristics — not financial advice).",
    ];
    if (intel.levels) lines.push("Levels: " + intel.levels + ".");
    if (intel.bias) lines.push("Structure: " + intel.bias + ".");
    if (a.futures) {
      lines.push(
        "Funding (demo): " + (a.funding >= 0 ? "+" : "") + (a.funding || 0).toFixed(3) +
        "% — positive = longs pay shorts."
      );
    }

    return {
      text: lines.join("\n"),
      links: [
        { href: pathPrefix() + "trade.html?pair=" + symbol + "_USDT", label: "Trade " + symbol },
        { href: pathPrefix() + "markets.html", label: "Markets" },
        { href: pathPrefix() + "tools/technical.html", label: "Technicals" },
      ],
    };
  }

  function marketOverview() {
    const list = (WUNNA.ASSETS || []).filter(function (a) { return a.category === "crypto"; });
    const sorted = list.slice().sort(function (a, b) { return b.change - a.change; });
    const gainers = sorted.slice(0, 3);
    const losers = sorted.slice().reverse().slice(0, 3);
    const btc = assetBySymbol("BTC");
    const eth = assetBySymbol("ETH");
    let tone = "mixed";
    if (btc && eth) {
      if (btc.change > 0.5 && eth.change > 0.5) tone = "risk-on";
      else if (btc.change < -0.5 && eth.change < -0.5) tone = "risk-off";
    }
    const g = gainers.map(function (a) { return a.symbol + " " + (a.change >= 0 ? "+" : "") + a.change.toFixed(2) + "%"; }).join(", ");
    const l = losers.map(function (a) { return a.symbol + " " + (a.change >= 0 ? "+" : "") + a.change.toFixed(2) + "%"; }).join(", ");
    return {
      text:
        "🌐 Demo market pulse (" + tone + "): BTC $" + money(btc ? btc.price : 0) +
        " (" + (btc && btc.change >= 0 ? "+" : "") + (btc ? btc.change.toFixed(2) : "0") + "%) · ETH $" +
        money(eth ? eth.price : 0) + " (" + (eth && eth.change >= 0 ? "+" : "") + (eth ? eth.change.toFixed(2) : "0") +
        "%). Top gainers: " + g + ". Weakest: " + l +
        ". Ask me “predict BTC” or “will ETH rise?” for a coin-level forecast using live demo ticks.",
      links: [
        { href: pathPrefix() + "markets.html", label: "Markets" },
        { href: pathPrefix() + "tools/heat-map.html", label: "Heat map" },
        { href: pathPrefix() + "tools/screener.html", label: "Screener" },
      ],
    };
  }

  function careReply(text, ctx) {
    const q = text.toLowerCase().trim();
    const p = pathPrefix();

    // Coin prediction / analysis (BTC, ETH, etc.)
    const wantsForecast = /predict|forecast|rise|fall|pump|dump|bull|bear|next move|going up|going down|will .* (up|down)|analysis|outlook|target|signal|trend/.test(q);
    const wantsOverview = /market overview|market pulse|what.?s hot|top gainer|market today|how is the market/.test(q);
    const coin = findCoinInQuery(q);

    if (wantsOverview && !coin) return marketOverview();

    if (coin) {
      const analysis = analyzeCoin(coin);
      if (analysis) {
        if (wantsForecast || /price|worth|buy|sell|hold|long|short/.test(q) || q.length < 40) {
          return analysis;
        }
        // still return analysis if they just say "BTC" or "tell me about eth"
        if (/about|tell me|info|what is|how is|data|stats/.test(q) || new RegExp("^\\s*" + coin + "\\s*$", "i").test(text)) {
          return analysis;
        }
        // coin mentioned with other intent — still attach analysis if predict-like or generic coin question
        if (/btc|eth|bitcoin|ethereum|sol|coin|crypto|token/.test(q)) return analysis;
      }
    }

    if (wantsForecast && !coin) {
      return {
        text: "Tell me which coin — e.g. “predict BTC”, “will ETH rise?”, “SOL outlook”. I use live demo price, 24h change, range position, volume and BTC leadership to estimate short-term rise/fall bias.",
        links: [{ href: p + "markets.html", label: "Pick a market" }, { href: p + "tools/technical.html", label: "Technicals" }],
      };
    }

    // FAQ exact-ish match
    if (WUNNA.FAQ && WUNNA.FAQ.length) {
      for (let i = 0; i < WUNNA.FAQ.length; i++) {
        const f = WUNNA.FAQ[i];
        const words = f.q.toLowerCase().replace(/[?]/g, "").split(/\s+/).filter(function (w) { return w.length > 3; });
        let hits = 0;
        words.forEach(function (w) { if (q.indexOf(w) >= 0) hits++; });
        if (hits >= 2 || q.indexOf(f.q.toLowerCase().slice(0, 18)) >= 0) {
          return { text: f.a, links: [{ href: p + "faq.html", label: "Open FAQ" }] };
        }
      }
    }

    const rules = [
      {
        test: /fee|commission|maker|taker|vip|cost|charge/,
        text: "Fees are transparent by tier: maker starts around 0.10% and can fall to about 0.03% for VIP. Futures use a separate schedule. Deposit commissions and minimums are listed per asset.",
        links: [{ href: p + "fees.html", label: "View Fees" }],
      },
      {
        test: /arb|arbitrage|spread|cheaper|expensive venue|multi.?exchange/,
        text: "Use the Arbitrage Scanner to compare simulated multi-venue quotes for the same coin. It highlights buy low / sell high routes and estimated net on $1,000 (demo data).",
        links: [{ href: p + "arbitrage.html", label: "Open Arbitrage" }],
      },
      {
        test: /swap|convert|exchange coin|instant/,
        text: "Instant Swap converts one asset to another at a live demo rate with a clear 0.10% fee. Pick send/receive assets, enter amount, then confirm — balances update in your demo wallet.",
        links: [{ href: p + "swap.html", label: "Open Swap" }],
      },
      {
        test: /future|perp|leverage|long|short|funding|margin/,
        text: "Futures are USDT-M perpetuals: go Long or Short with leverage. Funding is shown every ~8h in the demo UI. Use Trade → Futures Perp. This is simulated margin only until a real backend is connected.",
        links: [{ href: p + "trade.html?mode=futures", label: "Trade Futures" }],
      },
      {
        test: /spot|buy|sell|order|limit|market order/,
        text: "Spot trading: open Trade Terminal, pick a pair, choose market or limit, set size, then Buy or Sell. Orders and balances are stored in this browser for the demo.",
        links: [{ href: p + "trade.html", label: "Open Spot Trade" }],
      },
      {
        test: /stake|earn|apr|reward|lend|yield/,
        text: "Earn lets you stake assets on flexible or fixed plans with transparent APRs. Crypto lending is on the roadmap. Open Earn or Profile → Staking to start a demo stake.",
        links: [{ href: p + "earn.html", label: "Open Earn" }, { href: p + "profile/staking.html", label: "Staking" }],
      },
      {
        test: /kyc|verify|verification|passport|identity|id document/,
        text: "KYC is under Profile → Settings → Verification. Typical docs: passport, national ID, or driver license, plus a clear photo and liveness check when you go live.",
        links: [{ href: p + "profile/settings.html", label: "Settings / KYC" }],
      },
      {
        test: /2fa|two.?factor|authenticator|security|hack/,
        text: "Enable Two-Factor Authentication under Profile → Settings for extra login security. Also use a strong password and never share codes. Report suspected compromise via Contact.",
        links: [{ href: p + "profile/settings.html", label: "Security settings" }, { href: p + "contact.html", label: "Contact support" }],
      },
      {
        test: /deposit|withdraw|wallet|balance|fund/,
        text: "Open Deposit, pick a coin and network, then tap “Get deposit address” — a popup shows a random wallet address you can copy. Use “Credit demo balance” to simulate funds in the browser. Total is estimated in USD.",
        links: [{ href: p + "profile/wallet.html", label: "Wallet" }, { href: p + "profile/deposit.html", label: "Deposit" }],
      },
      {
        test: /sign ?in|log ?in|sign ?up|register|account|password/,
        text: "Create an account on Sign up (email, Google, Apple, or device). Then Sign in to unlock wallet, staking, and protected profile pages. Sessions are stored locally in this demo.",
        links: [{ href: p + "signup.html", label: "Sign up" }, { href: p + "signin.html", label: "Sign in" }],
      },
      {
        test: /market|price|ticker|pair|chart|candle/,
        text: "Markets lists spot and USDT-M pairs with live demo prices, 24h change, volume, and mini charts. For coin forecasts try “predict BTC” or “ETH outlook”. Tools: market cap, screener, heat map, technicals.",
        links: [{ href: p + "markets.html", label: "Markets" }, { href: p + "tools/screener.html", label: "Screener" }],
      },
      {
        test: /demo|real money|production|live fund|fake/,
        text: "This site is a full interactive demo frontend. Prices, balances, and orders run in your browser only. No real funds move until you connect a production backend and compliance stack.",
        links: [{ href: p + "about.html", label: "About" }, { href: p + "compliance.html", label: "Compliance" }],
      },
      {
        test: /help|stuck|confused|how (do|to)|where|what is|support|human|agent|contact/,
        text: "I can explain features and point you to the right page. For account-specific issues, use Contact or the FAQ. What are you trying to do?",
        links: [{ href: p + "faq.html", label: "FAQ" }, { href: p + "contact.html", label: "Contact" }],
      },
    ];

    for (let i = 0; i < rules.length; i++) {
      if (rules[i].test.test(q)) return { text: rules[i].text, links: rules[i].links || [] };
    }

    // Page-aware default when user is vague
    const ctxTips = {
      trade: { text: "You're on Trade. Pick a pair, set market/limit size, then Buy/Sell (spot) or Long/Short (futures). Need leverage, funding, or order types explained?", links: [{ href: p + "fees.html", label: "Fees" }] },
      swap: { text: "You're on Swap. Choose send & receive assets, enter amount, check the rate and fee, then confirm. Balances update in your demo wallet.", links: [{ href: p + "profile/wallet.html", label: "Wallet" }] },
      arbitrage: { text: "You're on Arbitrage. Refresh quotes, compare buy vs sell venues, and use the estimated net on $1,000 to judge a route (demo).", links: [{ href: p + "markets.html", label: "Markets" }] },
      markets: { text: "You're on Markets. Filter by spot/futures/favorites, search a symbol, then open Trade. Prices here are live demo ticks.", links: [{ href: p + "trade.html", label: "Trade" }] },
      earn: { text: "You're on Earn/Staking. Pick a plan, stake from wallet balances, and track estimated daily rewards. Lending is coming later.", links: [{ href: p + "profile/wallet.html", label: "Wallet" }] },
      wallet: { text: "You're in Wallet/Deposit. Balances are demo-only. Use Deposit to simulate funding; totals are estimated in USD.", links: [{ href: p + "swap.html", label: "Swap" }] },
      auth: { text: "You're on sign-in/up. Use email or social/device options. After login you can access wallet, staking, and settings.", links: [{ href: p + "faq.html", label: "FAQ" }] },
      fees: { text: "You're on Fees. Check maker/taker tiers and deposit conditions. Ask me if a line item is unclear.", links: [{ href: p + "contact.html", label: "Contact" }] },
      tools: { text: "You're in Tools. Screener filters coins, heat map shows movers, technicals plot signals, cross-rates convert pairs — all demo data.", links: [{ href: p + "markets.html", label: "Markets" }] },
      settings: { text: "You're in Settings. Manage profile, 2FA, and KYC verification here. Ask if a step is unclear.", links: [{ href: p + "faq.html", label: "FAQ" }] },
      home: { text: "Welcome to Wunnaxswap. I can help with trading, swap, arbitrage, earn, fees, KYC, or wallet steps. Tell me what feels confusing.", links: [{ href: p + "markets.html", label: "Markets" }, { href: p + "faq.html", label: "FAQ" }] },
      general: { text: "I can help with fees, trading, swap, arbitrage, staking, wallet, KYC, and account setup. Describe the problem in a short sentence and I'll give a clear next step.", links: [{ href: p + "faq.html", label: "FAQ" }, { href: p + "contact.html", label: "Human support" }] },
    };
    return ctxTips[ctx] || ctxTips.general;
  }

  function initCareAssistant(p) {
    if ($(".wx-chat-fab") || $("#wxChatWin")) return;

    // Solid white speech-bubble (visible on violet gradient FAB)
    const ICO_MSG =
      '<svg class="wx-i-msg" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">' +
      '<path fill="#fff" d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6l-.9 3.4c-.1.5.4.9.8.7l3.7-1.6c.9.3 1.9.5 3 .5 5.5 0 10-3.6 10-8S17.5 3 12 3z"/>' +
      "</svg>";
    const ICO_BUBBLE =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="#fff" d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6l-.9 3.4c-.1.5.4.9.8.7l3.7-1.6c.9.3 1.9.5 3 .5 5.5 0 10-3.6 10-8S17.5 3 12 3z"/>' +
      "</svg>";
    const ICO_X =
      '<svg class="wx-i-x" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">' +
      '<path fill="#fff" d="M18.3 5.71 12 12.01l-6.3-6.3-1.41 1.42L10.59 13.4l-6.3 6.3 1.41 1.41L12 14.83l6.29 6.3 1.42-1.42-6.3-6.29 6.3-6.3z"/>' +
      "</svg>";
    const ICO_SEND =
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    const ICO_CHAT_SM =
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
      '<path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6l-.9 3.4c-.1.5.4.9.8.7l3.7-1.6c.9.3 1.9.5 3 .5 5.5 0 10-3.6 10-8S17.5 3 12 3z"/>' +
      "</svg>";

    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "wx-chat-fab";
    fab.setAttribute("aria-label", "Open messages");
    fab.innerHTML = ICO_MSG + ICO_X;

    const win = document.createElement("div");
    win.id = "wxChatWin";
    win.className = "wx-chat-win";
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-label", "Messages");
    win.innerHTML =
      '<div class="wx-chat-top">' +
      '  <div class="wx-chat-tabs" style="position:relative">' +
      '    <button type="button" class="wx-chat-tab is-on" data-tab="messages">' + ICO_CHAT_SM + " Messages</button>" +
      '    <button type="button" class="wx-chat-tab" data-tab="articles">Articles</button>' +
      '    <button type="button" class="wx-chat-chev" id="wxChatClose" aria-label="Close">▾</button>' +
      "  </div>" +
      '  <div class="wx-chat-agent">' +
      '    <div class="wx-chat-ava">AI</div>' +
      '    <div class="wx-chat-agent-name">AI Assistant<span class="wx-chat-agent-sub">from Wunnaxswap</span></div>' +
      '    <button type="button" class="wx-chat-agent-dd" aria-hidden="true">▾</button>' +
      "  </div>" +
      "</div>" +
      '<div class="wx-chat-msgs" id="wxChatMsgs"></div>' +
      '<div class="wx-chat-compose-wrap">' +
      '  <div class="wx-chat-compose">' +
      '    <input id="wxChatInput" type="text" autocomplete="off" placeholder="Compose your message..." />' +
      '    <div class="wx-chat-compose-bar">' +
      '      <div class="wx-chat-tools"><span title="Emoji">☺</span><span title="Attach">📎</span><span title="Voice">🎙</span></div>' +
      '      <button type="button" class="wx-chat-send" id="wxChatSend" aria-label="Send">' + ICO_SEND + "</button>" +
      "    </div>" +
      "  </div>" +
      "</div>";

    document.body.appendChild(win);
    document.body.appendChild(fab);

    const msgs = $("#wxChatMsgs");
    const input = $("#wxChatInput");

    function scrollMsgs() {
      msgs.scrollTop = msgs.scrollHeight;
    }

    function todayLabel() {
      try {
        return new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
      } catch (e) {
        return "Today";
      }
    }

    function addMsg(role, text, links) {
      const row = document.createElement("div");
      row.className = "wx-msg wx-msg--" + role;
      let linkHtml = "";
      if (links && links.length) {
        linkHtml = '<div class="wx-msg-links">' + links.map(function (l) {
          return '<a href="' + escapeHtml(l.href) + '">' + escapeHtml(l.label) + "</a>";
        }).join("") + "</div>";
      }
      const bodyHtml = String(text || "").replace(/\n/g, "<br>");
      if (role === "bot") {
        row.innerHTML =
          '<div class="wx-msg-botdot">' + ICO_BUBBLE + "</div>" +
          '<div class="wx-bubble">' + bodyHtml + linkHtml + "</div>";
      } else {
        row.innerHTML = '<div class="wx-bubble">' + bodyHtml + "</div>";
      }
      msgs.appendChild(row);
      scrollMsgs();
    }

    function showTyping(on) {
      const el = $("#wxTyping");
      if (el) el.remove();
      if (!on) return;
      const t = document.createElement("div");
      t.id = "wxTyping";
      t.className = "wx-typing";
      t.innerHTML = "<i></i><i></i><i></i>";
      msgs.appendChild(t);
      scrollMsgs();
    }

    function openChat() {
      win.classList.add("is-open");
      fab.classList.add("is-open");
      fab.setAttribute("aria-label", "Close messages");
      setTimeout(function () { if (input) input.focus(); }, 180);
    }
    function closeChat() {
      win.classList.remove("is-open");
      fab.classList.remove("is-open");
      fab.setAttribute("aria-label", "Open messages");
    }

    const date = document.createElement("div");
    date.className = "wx-chat-date";
    date.textContent = todayLabel();
    msgs.appendChild(date);
    addMsg(
      "bot",
      "How can we help? Ask about fees, trading, or coin outlooks — e.g. “predict BTC”, “will ETH rise?”, “SOL analysis”."
    );

    function send() {
      const text = (input.value || "").trim();
      if (!text) return;
      addMsg("user", escapeHtml(text));
      input.value = "";
      showTyping(true);
      setTimeout(function () {
        showTyping(false);
        const ans = careReply(text, pageContext());
        addMsg("bot", escapeHtml(ans.text), ans.links || []);
      }, 450 + Math.floor(Math.random() * 350));
    }

    fab.addEventListener("click", function () {
      if (win.classList.contains("is-open")) closeChat();
      else openChat();
    });
    $("#wxChatClose").addEventListener("click", closeChat);
    $("#wxChatSend").addEventListener("click", send);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        send();
      }
    });

    $$(".wx-chat-tab", win).forEach(function (tab) {
      tab.addEventListener("click", function () {
        $$(".wx-chat-tab", win).forEach(function (t) { t.classList.remove("is-on"); });
        tab.classList.add("is-on");
        if (tab.getAttribute("data-tab") === "articles") {
          addMsg("bot", "Articles: open FAQ for fee tiers, KYC, futures, and arbitrage guides.", [
            { href: pathPrefix() + "faq.html", label: "FAQ" },
            { href: pathPrefix() + "fees.html", label: "Fees" },
          ]);
        }
      });
    });
  }

  function requireAuth(redirect) {
    if (!isAuthed()) {
      toast("Please sign in to continue");
      setTimeout(function () {
        location.href = pathPrefix() + "signin.html?next=" + encodeURIComponent(redirect || location.pathname);
      }, 600);
      return false;
    }
    return true;
  }

  /* Page: markets table */
  function initMarketsPage() {
    const tbody = $("#marketsBody");
    if (!tbody) return;
    let mode = "spot";
    let cat = "all";
    let showViz = true;

    function refresh() {
      const favs = getFavs();
      let rows = WUNNA.ASSETS.slice();
      if (mode === "futures") rows = rows.filter(function (a) { return a.futures; });
      if (mode === "favorites") rows = rows.filter(function (a) { return favs.indexOf(a.symbol) >= 0; });
      if (mode === "spot") rows = rows.filter(function (a) { return a.category !== "stable" || cat === "stable" || cat === "all"; });

      if (cat === "crypto") rows = rows.filter(function (a) { return a.category === "crypto"; });
      if (cat === "stable") rows = rows.filter(function (a) { return a.category === "stable"; });
      if (cat === "gainers") rows = rows.filter(function (a) { return a.change > 0; }).sort(function (a, b) { return b.change - a.change; });
      if (cat === "losers") rows = rows.filter(function (a) { return a.change < 0; }).sort(function (a, b) { return a.change - b.change; });

      const q = ($("#marketSearch") && $("#marketSearch").value || "").trim().toLowerCase();
      if (q) rows = rows.filter(function (a) {
        return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
      });

      const tradeMode = mode === "futures" ? "futures" : "spot";
      tbody.innerHTML = rows.map(function (a, idx) {
        const cls = a.change >= 0 ? "up" : "down";
        const star = favs.indexOf(a.symbol) >= 0 ? "★" : "☆";
        const pairLabel = mode === "futures"
          ? a.symbol + "USDT <span class=\"tag-perp\">PERP</span>"
          : a.symbol + " <span class=\"muted\">/USDT</span>";
        return (
          "<tr>" +
          '<td><button class="btn btn-ghost btn-sm fav-btn" data-sym="' + a.symbol + '">' + star + "</button></td>" +
          '<td><div class="pair-cell">' + coinImg(a.symbol) +
          '<div class="meta"><strong>' + pairLabel + "</strong><span>" + a.name +
          (mode === "futures" ? " · Funding " + ((a.funding || 0) >= 0 ? "+" : "") + (a.funding || 0).toFixed(3) + "%" : "") +
          "</span></div></div></td>" +
          '<td class="mono">$' + money(a.price) + "</td>" +
          '<td class="mono ' + cls + '">' + (a.change >= 0 ? "+" : "") + a.change.toFixed(2) + "%</td>" +
          '<td class="mono">' + money(a.high) + "</td>" +
          '<td class="mono">' + money(a.low) + "</td>" +
          '<td class="mono">' + compact(a.volume) + "</td>" +
          '<td>' + (showViz ? '<canvas class="spark" data-sym="' + a.symbol + '" data-chg="' + a.change + '" data-px="' + a.price + '" width="96" height="32"></canvas>' : "—") + "</td>" +
          '<td><a class="btn btn-soft btn-sm" href="' + pathPrefix() + "trade.html?pair=" + a.symbol + "_USDT&mode=" + tradeMode + '">' +
          (mode === "futures" ? "Futures" : "Trade") + "</a> " +
          '<a class="btn btn-ghost btn-sm" href="' + pathPrefix() + "arbitrage.html?asset=" + a.symbol + '">Arb</a></td>' +
          "</tr>"
        );
      }).join("") || '<tr><td colspan="9" class="muted">No markets match your filter.</td></tr>';

      $$(".fav-btn", tbody).forEach(function (btn) {
        btn.addEventListener("click", function () {
          toggleFav(btn.getAttribute("data-sym"));
          refresh();
        });
      });

      if (showViz && window.drawSparkline) {
        $$("canvas.spark", tbody).forEach(function (c) {
          drawSparkline(c, parseFloat(c.dataset.px), parseFloat(c.dataset.chg));
        });
      }
    }

    refresh();
    document.addEventListener("wunna:prices", refresh);

    $$("#marketMode button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("#marketMode button").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        mode = btn.getAttribute("data-mode");
        refresh();
      });
    });
    $$("#marketCats .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        $$("#marketCats .tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        cat = tab.getAttribute("data-cat");
        refresh();
      });
    });
    $("#marketSearch") && $("#marketSearch").addEventListener("input", refresh);
    $("#showViz") && $("#showViz").addEventListener("change", function () {
      showViz = $("#showViz").checked;
      refresh();
    });
  }

  /* Home live mini list */
  function initHomeTickers() {
    const el = $("#homeTickers");
    if (!el) return;
    function draw() {
      const list = WUNNA.ASSETS.filter(function (a) { return ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE"].indexOf(a.symbol) >= 0; });
      el.innerHTML = list.map(function (a) {
        const cls = a.change >= 0 ? "up" : "down";
        return '<div class="mini-row"><span class="asset">' + coinImg(a.symbol) + " " + a.symbol +
          '</span><span class="mono">$' + money(a.price) +
          '</span><span class="mono ' + cls + '">' + (a.change >= 0 ? "+" : "") + a.change.toFixed(2) + "%</span></div>";
      }).join("");
    }
    draw();
    document.addEventListener("wunna:prices", draw);
  }

  /* Swap */
  function initSwap() {
    const sendSel = $("#swapSendAsset");
    const recvSel = $("#swapRecvAsset");
    if (!sendSel || !recvSel) return;
    const coins = WUNNA.ASSETS.map(function (a) { return a.symbol; });
    sendSel.innerHTML = coins.map(function (c) { return "<option>" + c + "</option>"; }).join("");
    recvSel.innerHTML = coins.map(function (c) { return "<option>" + c + "</option>"; }).join("");
    sendSel.value = "USDT";
    recvSel.value = "BTC";
    const amountIn = $("#swapAmount");
    const amountOut = $("#swapOut");
    const rateEl = $("#swapRate");
    const feeEl = $("#swapFee");

    function calc() {
      const a = assetBySymbol(sendSel.value);
      const b = assetBySymbol(recvSel.value);
      if (!a || !b) return;
      const amt = parseFloat(amountIn.value) || 0;
      const rate = a.price / b.price;
      const fee = amt * 0.001;
      const out = Math.max(0, (amt - fee) * rate);
      amountOut.value = out ? money(out) : "";
      rateEl.textContent = "1 " + sendSel.value + " ≈ " + money(rate) + " " + recvSel.value;
      feeEl.textContent = "Fee (0.10%): " + money(fee) + " " + sendSel.value;
    }
    [sendSel, recvSel, amountIn].forEach(function (el) {
      el.addEventListener("input", calc);
      el.addEventListener("change", calc);
    });
    $("#swapFlip") && $("#swapFlip").addEventListener("click", function () {
      const s = sendSel.value; sendSel.value = recvSel.value; recvSel.value = s; calc();
    });
    $("#swapSubmit") && $("#swapSubmit").addEventListener("click", function () {
      if (!requireAuth("swap.html")) return;
      const amt = parseFloat(amountIn.value) || 0;
      if (amt <= 0) return toast("Enter an amount");
      const w = getWallet();
      const send = sendSel.value;
      const recv = recvSel.value;
      if ((w[send] || 0) < amt) return toast("Insufficient " + send + " balance (demo wallet)");
      const a = assetBySymbol(send);
      const b = assetBySymbol(recv);
      const fee = amt * 0.001;
      const out = (amt - fee) * (a.price / b.price);
      const rate = a.price / b.price;

      function applyLocalSwap() {
        const ww = getWallet();
        ww[send] = (ww[send] || 0) - amt;
        ww[recv] = (ww[recv] || 0) + out;
        setWallet(ww);
        const orders = getOrders();
        orders.unshift({
          side: "SWAP", pair: send + "→" + recv, open: new Date().toLocaleString(),
          closed: new Date().toLocaleString(), price: rate, amount: amt, total: out,
        });
        setOrders(orders.slice(0, 50));
      }

      function done() {
        toast("Swap executed: " + money(amt) + " " + send + " → " + money(out) + " " + recv);
        amountIn.value = "";
        calc();
        renderOrdersTable();
        renderWallet();
      }

      if (backendOn() && WunnaxBackend.isAuthed()) {
        WunnaxBackend.executeSwap(send, recv, amt, out, fee, rate)
          .then(function () { return refreshBackendWallet(); })
          .then(done)
          .catch(function (err) {
            toast(backendErr(err) || "Swap failed");
          });
        return;
      }
      applyLocalSwap();
      done();
    });
    calc();
    document.addEventListener("wunna:prices", calc);
  }

  /* Arbitrage scanner */
  function buildArbRows(assetFilter) {
    const assets = WUNNA.ASSETS.filter(function (a) {
      return a.symbol !== "USDT" && a.symbol !== "USDC" && (!assetFilter || a.symbol === assetFilter);
    }).slice(0, 12);
    return assets.map(function (a) {
      const quotes = WUNNA.EXCHANGES.map(function (ex) {
        const skew = (Math.random() - 0.5) * 0.006;
        return { ex: ex, price: a.price * (1 + skew) };
      });
      quotes.sort(function (x, y) { return x.price - y.price; });
      const buy = quotes[0];
      const sell = quotes[quotes.length - 1];
      const spreadPct = ((sell.price - buy.price) / buy.price) * 100;
      const profitOn1k = 1000 * (spreadPct / 100) * 0.92; // after rough fees
      return { asset: a.symbol, buy: buy, sell: sell, spreadPct: spreadPct, profitOn1k: profitOn1k, quotes: quotes };
    }).sort(function (a, b) { return b.spreadPct - a.spreadPct; });
  }

  function initArbitrage() {
    const grid = $("#arbGrid");
    if (!grid) return;
    const params = new URLSearchParams(location.search);
    const focus = params.get("asset");
    function draw() {
      const rows = buildArbRows(focus);
      grid.innerHTML = rows.map(function (r) {
        const good = r.spreadPct >= 0.25;
        return (
          '<article class="card arb-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div class="asset">' + coinImg(r.asset) + "<strong>" + r.asset + "/USDT</strong></div>" +
          '<span class="badge ' + (good ? "badge-green" : "badge-amber") + '">' + (good ? "Opportunity" : "Tight") + "</span></div>" +
          '<div class="spread ' + (good ? "up" : "") + '">' + r.spreadPct.toFixed(3) + "% spread</div>" +
          '<div class="muted">Buy on <strong style="color:var(--text)">' + r.buy.ex + "</strong> @ $" + money(r.buy.price) + "</div>" +
          '<div class="muted">Sell on <strong style="color:var(--text)">' + r.sell.ex + "</strong> @ $" + money(r.sell.price) + "</div>" +
          '<div class="mono">Est. net on $1,000: <span class="up">+$' + money(r.profitOn1k, 2) + "</span></div>" +
          '<button class="btn btn-primary btn-sm arb-act" type="button" data-asset="' + r.asset +
          '" data-buy="' + r.buy.ex + '" data-sell="' + r.sell.ex + '">Simulate route</button>' +
          "</article>"
        );
      }).join("");
      $$(".arb-act", grid).forEach(function (btn) {
        btn.addEventListener("click", function () {
          toast("Demo route: buy " + btn.dataset.asset + " on " + btn.dataset.buy + " → sell on " + btn.dataset.sell);
        });
      });
      const best = rows[0];
      if (best && $("#arbBest")) {
        $("#arbBest").textContent = best.asset + " " + best.spreadPct.toFixed(3) + "%";
      }
    }
    draw();
    setInterval(draw, 4000);
    $("#arbRefresh") && $("#arbRefresh").addEventListener("click", function () {
      draw();
      toast("Arbitrage board refreshed");
    });
  }

  /* Trade terminal — Spot + Futures with realistic candles */
  function initTrade() {
    if (!$("#tradePair")) return;
    const params = new URLSearchParams(location.search);
    let base = (params.get("pair") || "BTC_USDT").split("_")[0];
    let mode = params.get("mode") === "futures" ? "futures" : "spot";
    let leverage = 10;
    let futSide = "long";
    let chart = null;

    const priceEl = $("#tradePrice");
    const bookBids = $("#bookBids");
    const bookAsks = $("#bookAsks");

    function asset() { return assetBySymbol(base) || assetBySymbol("BTC"); }
    function mid() { return asset().price; }

    function syncModeUI() {
      $$("#tradeMode button").forEach(function (b) {
        b.classList.toggle("active", b.getAttribute("data-mode") === mode);
      });
      const isFut = mode === "futures";
      if ($("#futuresExtras")) $("#futuresExtras").style.display = isFut ? "block" : "none";
      if ($("#spotActions")) $("#spotActions").hidden = isFut;
      if ($("#futActions")) $("#futActions").hidden = !isFut;
      if ($("#tradePerpTag")) $("#tradePerpTag").hidden = !isFut;
      if ($("#tradeSubtitle")) {
        $("#tradeSubtitle").textContent = isFut
          ? "USDT-M perpetual · funding every 8h · demo margin"
          : "Spot market · maker/taker fees apply";
      }
      updateOpenBtn();
    }

    function updateOpenBtn() {
      const btn = $("#btnOpen");
      if (!btn) return;
      if (futSide === "long") {
        btn.textContent = "Open Long " + leverage + "x";
        btn.style.background = "linear-gradient(135deg,#34d399,#059669)";
      } else {
        btn.textContent = "Open Short " + leverage + "x";
        btn.style.background = "linear-gradient(135deg,#f87171,#dc2626)";
      }
    }

    function setPair(sym) {
      base = sym;
      const a = asset();
      $("#tradePair").textContent = mode === "futures" ? sym + "USDT" : sym + "/USDT";
      const logo = $("#tradeLogo");
      if (logo) {
        logo.src = WUNNA.logoUrl(sym);
        logo.alt = sym;
      }
      if (chart) chart.reset(a.price, 0.004);
      else if ($("#priceChart") && window.WunnaChart) {
        chart = new WunnaChart($("#priceChart"), { price: a.price, volatility: 0.004, count: 90 });
      }
      drawAll();
      renderPairList();
    }

    function renderPairList() {
      const list = $("#pairList");
      if (!list) return;
      const rows = WUNNA.ASSETS.filter(function (a) {
        if (mode === "futures") return a.futures;
        return a.category === "crypto";
      });
      list.innerHTML = '<div style="padding:.4rem .5rem .6rem;font-weight:800;font-size:.85rem">Pairs</div>' +
        rows.map(function (a) {
          const cls = a.change >= 0 ? "up" : "down";
          return '<div class="pair-row' + (a.symbol === base ? " active" : "") + '" data-sym="' + a.symbol + '">' +
            '<div class="sym">' + coinImg(a.symbol) + " " + a.symbol +
            (mode === "futures" ? '<span class="tag-perp">PERP</span>' : "") + "</div>" +
            '<div class="mono">' + money(a.price) + '</div>' +
            '<div class="mono ' + cls + '">' + (a.change >= 0 ? "+" : "") + a.change.toFixed(2) + "%</div></div>";
        }).join("");
      $$(".pair-row", list).forEach(function (row) {
        row.addEventListener("click", function () { setPair(row.getAttribute("data-sym")); });
      });
    }

    function drawStats() {
      const a = asset();
      if (priceEl) {
        priceEl.textContent = "$" + money(a.price);
        priceEl.className = "mono " + (a.change >= 0 ? "up" : "down");
      }
      if ($("#tradeChange")) {
        $("#tradeChange").textContent = (a.change >= 0 ? "+" : "") + a.change.toFixed(2) + "%";
        $("#tradeChange").className = "mono " + (a.change >= 0 ? "up" : "down");
      }
      if ($("#tradeStats")) {
        $("#tradeStats").innerHTML =
          "<span>24h High <b class=\"up\">" + money(a.high) + "</b></span>" +
          "<span>24h Low <b class=\"down\">" + money(a.low) + "</b></span>" +
          "<span>24h Vol <b>" + compact(a.volume) + "</b></span>" +
          (mode === "futures"
            ? "<span>Mark <b>" + money(a.price * (1 + (Math.random() - 0.5) * 0.0002)) + "</b></span>" +
              "<span>Index <b>" + money(a.price * (1 + (Math.random() - 0.5) * 0.0003)) + "</b></span>"
            : "<span>Mkt Cap <b>" + compact(a.marketCap) + "</b></span>");
      }
      const fund = $("#fundingPill");
      if (fund && mode === "futures") {
        const f = a.funding || 0;
        fund.textContent = "Funding " + (f >= 0 ? "+" : "") + f.toFixed(3) + "%";
        fund.className = "funding-pill" + (f < 0 ? " neg" : "");
      }
    }

    function drawBook() {
      const m = mid();
      let bids = "", asks = "";
      for (let i = 1; i <= 14; i++) {
        const bp = m * (1 - 0.00035 * i - Math.random() * 0.00015);
        const ap = m * (1 + 0.00035 * i + Math.random() * 0.00015);
        const amt = (Math.random() * 2.4 + 0.02);
        bids += '<div class="ob-row bid"><span class="up">' + money(bp) + "</span><span>" + amt.toFixed(4) +
          "</span><span>" + money(bp * amt, 2) + "</span></div>";
        asks = '<div class="ob-row ask"><span class="down">' + money(ap) + "</span><span>" + amt.toFixed(4) +
          "</span><span>" + money(ap * amt, 2) + "</span></div>" + asks;
      }
      if (bookBids) bookBids.innerHTML = bids;
      if (bookAsks) bookAsks.innerHTML = asks;
    }

    function drawAll() {
      drawStats();
      drawBook();
      if (chart) chart.setPrice(mid());
    }

    // Mode switch
    $$("#tradeMode button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        mode = btn.getAttribute("data-mode");
        syncModeUI();
        renderPairList();
        setPair(base);
      });
    });
    $$("#levRow .lev-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("#levRow .lev-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        leverage = parseInt(btn.getAttribute("data-lev"), 10);
        updateOpenBtn();
      });
    });
    $("#sideLong") && $("#sideLong").addEventListener("click", function () {
      futSide = "long";
      $("#sideLong").classList.add("active");
      $("#sideShort").classList.remove("active");
      updateOpenBtn();
    });
    $("#sideShort") && $("#sideShort").addEventListener("click", function () {
      futSide = "short";
      $("#sideShort").classList.add("active");
      $("#sideLong").classList.remove("active");
      updateOpenBtn();
    });
    $$("#tfGroup .tf-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("#tfGroup .tf-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        if (chart) chart.setTimeframe(btn.getAttribute("data-tf"));
      });
    });

    function placeSpot(side) {
      if (!requireAuth("trade.html")) return;
      const type = ($("#orderType") && $("#orderType").value) || "market";
      const amount = parseFloat($("#orderAmount").value) || 0;
      if (amount <= 0) return toast("Enter amount");
      const px = type === "limit" ? (parseFloat($("#orderPrice").value) || mid()) : mid();
      const w = getWallet();
      if (side === "buy") {
        const cost = amount * px;
        if ((w.USDT || 0) < cost) return toast("Insufficient USDT");
      } else {
        if ((w[base] || 0) < amount) return toast("Insufficient " + base);
      }

      function applyLocal() {
        const ww = getWallet();
        if (side === "buy") {
          ww.USDT -= amount * px;
          ww[base] = (ww[base] || 0) + amount;
        } else {
          ww[base] -= amount;
          ww.USDT = (ww.USDT || 0) + amount * px;
        }
        setWallet(ww);
        const orders = getOrders();
        orders.unshift({
          side: side.toUpperCase(), pair: base + "/USDT", mode: "Spot",
          open: new Date().toLocaleString(),
          closed: type === "market" ? new Date().toLocaleString() : "—",
          price: px, amount: amount, total: amount * px,
        });
        setOrders(orders.slice(0, 50));
      }

      function done() {
        toast(side.toUpperCase() + " " + amount + " " + base + " @ $" + money(px));
        renderOrdersTable();
        renderWallet();
      }

      if (backendOn() && WunnaxBackend.isAuthed()) {
        WunnaxBackend.placeOrder({
          side: side,
          marketType: "spot",
          pair: base + "/USDT",
          orderType: type,
          price: px,
          amount: amount,
          baseAsset: base,
          quoteAsset: "USDT",
        })
          .then(function () { return refreshBackendWallet(); })
          .then(done)
          .catch(function (err) { toast(backendErr(err) || "Order failed"); });
        return;
      }
      applyLocal();
      done();
    }

    function placeFutures() {
      if (!requireAuth("trade.html")) return;
      const size = parseFloat($("#orderAmount").value) || 0;
      if (size <= 0) return toast("Enter position size");
      const px = mid();
      const notional = size * px;
      const margin = notional / leverage;
      const w = getWallet();
      if ((w.USDT || 0) < margin) return toast("Insufficient USDT margin (need ~" + money(margin, 2) + ")");
      w.USDT -= margin;
      setWallet(w);
      // Simulated instant small PnL fluctuation on open
      const pnl = notional * (Math.random() - 0.5) * 0.002;
      const orders = getOrders();
      orders.unshift({
        side: futSide === "long" ? "LONG" : "SHORT",
        pair: base + "USDT",
        mode: "Futures " + leverage + "x",
        open: new Date().toLocaleString(),
        closed: "OPEN",
        price: px,
        amount: size,
        total: pnl,
      });
      setOrders(orders.slice(0, 50));
      toast((futSide === "long" ? "Long" : "Short") + " " + size + " " + base + " @ " + leverage + "x");
      renderOrdersTable();
      renderWallet();
    }

    $("#btnBuy") && $("#btnBuy").addEventListener("click", function () { placeSpot("buy"); });
    $("#btnSell") && $("#btnSell").addEventListener("click", function () { placeSpot("sell"); });
    $("#btnOpen") && $("#btnOpen").addEventListener("click", placeFutures);

    syncModeUI();
    setPair(base);
    document.addEventListener("wunna:prices", drawAll);
  }

  function renderOrdersTable() {
    const body = $("#ordersBody");
    if (!body) return;
    const orders = getOrders();
    const cols = body.closest("table") && body.closest("table").querySelectorAll("thead th").length;
    body.innerHTML = orders.length
      ? orders.map(function (o) {
          const pnlCls = typeof o.total === "number" && o.mode && String(o.mode).indexOf("Futures") === 0
            ? (o.total >= 0 ? "up" : "down") : "";
          return "<tr><td>" + o.side + "</td><td>" + o.pair + "</td><td>" + (o.mode || "Spot") +
            "</td><td>" + o.open + "</td><td>" + o.closed +
            '</td><td class="mono">' + money(o.price) +
            '</td><td class="mono">' + money(o.amount) +
            '</td><td class="mono ' + pnlCls + '">' + money(o.total) + "</td></tr>";
        }).join("")
      : '<tr><td colspan="' + (cols || 8) + '" class="muted">No records yet — place a swap, spot, or futures order.</td></tr>';
  }

  function renderWallet() {
    const el = $("#walletBody");
    const totalEl = $("#walletTotal");
    if (!el) return;
    const w = getWallet();
    let total = 0;
    const rows = Object.keys(w).map(function (sym) {
      const amt = w[sym] || 0;
      const a = assetBySymbol(sym);
      const px = a ? a.price : sym === "USDT" || sym === "USDC" ? 1 : 0;
      const usd = amt * px;
      total += usd;
      return "<tr><td><div class=\"asset\">" + coinImg(sym) + " " + sym +
        "</div></td><td class=\"mono\">" + money(amt) +
        "</td><td class=\"mono\">$" + money(px) + "</td><td class=\"mono\">$" + money(usd, 2) + "</td></tr>";
    }).join("");
    el.innerHTML = rows;
    if (totalEl) totalEl.textContent = "$" + money(total, 2);
  }

  function randomHex(len) {
    let s = "";
    const chars = "0123456789abcdef";
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * 16)];
    return s;
  }

  function randomBase58(len) {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let s = "";
    for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return s;
  }

  function networksForAsset(symbol) {
    const map = {
      BTC: ["Bitcoin", "Lightning (demo)"],
      ETH: ["ERC20 (Ethereum)", "Arbitrum", "Optimism", "Base"],
      USDT: ["TRC20 (TRON)", "ERC20 (Ethereum)", "BEP20 (BSC)", "Solana (SPL)"],
      USDC: ["ERC20 (Ethereum)", "Solana (SPL)", "BEP20 (BSC)"],
      SOL: ["Solana"],
      BNB: ["BEP20 (BSC)", "opBNB (demo)"],
      XRP: ["XRP Ledger"],
      TRX: ["TRC20 (TRON)"],
      TON: ["The Open Network"],
      DOGE: ["Dogecoin"],
      ADA: ["Cardano"],
      LTC: ["Litecoin"],
      LINK: ["ERC20 (Ethereum)"],
      SUI: ["Sui"],
      PEPE: ["ERC20 (Ethereum)"],
      MATIC: ["Polygon", "ERC20 (Ethereum)"],
      AVAX: ["Avalanche C-Chain"],
      DOT: ["Polkadot"],
      ATOM: ["Cosmos"],
      NEAR: ["NEAR"],
      ARB: ["Arbitrum"],
      OP: ["Optimism"],
      SHIB: ["ERC20 (Ethereum)"],
      UNI: ["ERC20 (Ethereum)"],
      AAVE: ["ERC20 (Ethereum)"],
      INJ: ["Injective"],
      FIL: ["Filecoin"],
      BCH: ["Bitcoin Cash"],
      APT: ["Aptos"],
    };
    return map[symbol] || ["Native / default"];
  }

  function generateDepositAddress(symbol, network) {
    const net = (network || "").toLowerCase();
    const sym = (symbol || "").toUpperCase();

    if (sym === "BTC" || net.indexOf("bitcoin") >= 0) {
      // bech32-style demo
      return "bc1q" + randomHex(38);
    }
    if (sym === "LTC" || net.indexOf("litecoin") >= 0) {
      return "ltc1q" + randomHex(38);
    }
    if (sym === "DOGE" || net.indexOf("doge") >= 0) {
      return "D" + randomBase58(33);
    }
    if (sym === "XRP" || net.indexOf("xrp") >= 0) {
      return "r" + randomBase58(33);
    }
    if (sym === "ADA" || net.indexOf("cardano") >= 0) {
      return "addr1" + randomHex(54);
    }
    if (sym === "SOL" || net.indexOf("solana") >= 0 || net.indexOf("spl") >= 0) {
      return randomBase58(44);
    }
    if (sym === "TON" || net.indexOf("open network") >= 0) {
      return "UQ" + randomBase58(46);
    }
    if (sym === "TRX" || net.indexOf("trc20") >= 0 || net.indexOf("tron") >= 0) {
      return "T" + randomBase58(33);
    }
    if (sym === "SUI" || net.indexOf("sui") >= 0) {
      return "0x" + randomHex(64);
    }
    if (sym === "NEAR" || net.indexOf("near") >= 0) {
      return randomHex(64) + ".near";
    }
    if (sym === "DOT" || net.indexOf("polkadot") >= 0) {
      return "1" + randomBase58(46);
    }
    if (sym === "ATOM" || net.indexOf("cosmos") >= 0) {
      return "cosmos1" + randomHex(38);
    }
    if (sym === "FIL" || net.indexOf("filecoin") >= 0) {
      return "f1" + randomBase58(39);
    }
    if (sym === "INJ" || net.indexOf("injective") >= 0) {
      return "inj1" + randomHex(38);
    }
    if (sym === "APT" || net.indexOf("aptos") >= 0) {
      return "0x" + randomHex(64);
    }
    // Default EVM-style (ETH, BNB, ERC20, BEP20, Polygon, Arbitrum, etc.)
    if (
      net.indexOf("erc20") >= 0 ||
      net.indexOf("bep20") >= 0 ||
      net.indexOf("ethereum") >= 0 ||
      net.indexOf("bsc") >= 0 ||
      net.indexOf("polygon") >= 0 ||
      net.indexOf("arbitrum") >= 0 ||
      net.indexOf("optimism") >= 0 ||
      net.indexOf("base") >= 0 ||
      net.indexOf("avalanche") >= 0 ||
      net.indexOf("c-chain") >= 0 ||
      ["ETH", "BNB", "USDT", "USDC", "LINK", "PEPE", "MATIC", "AVAX", "ARB", "OP", "SHIB", "UNI", "AAVE"].indexOf(sym) >= 0
    ) {
      return "0x" + randomHex(40);
    }
    return "wx1" + randomBase58(40);
  }

  function initDeposit() {
    const sel = $("#depositAsset");
    const netSel = $("#depNetwork");
    if (!sel) return;

    const fees = WUNNA.DEPOSIT_FEES || [];
    // Include main assets even if not in fee table
    const symbols = {};
    fees.forEach(function (d) { symbols[d.symbol] = d; });
    (WUNNA.ASSETS || []).forEach(function (a) {
      if (!symbols[a.symbol] && a.category !== "stable") {
        // keep fee table primary; stables already covered
      }
    });

    sel.innerHTML = fees.map(function (d) {
      return '<option value="' + d.symbol + '">' + d.symbol + " — " + d.name + "</option>";
    }).join("");

    let currentAddress = "";

    function feeFor(sym) {
      return fees.find(function (x) { return x.symbol === sym; }) || {
        symbol: sym, name: sym, commission: "0.5%", min: "—",
      };
    }

    function fillNetworks() {
      if (!netSel) return;
      const nets = networksForAsset(sel.value);
      netSel.innerHTML = nets.map(function (n) {
        return "<option>" + n + "</option>";
      }).join("");
    }

    function updateMeta() {
      const d = feeFor(sel.value);
      if ($("#depCommission")) $("#depCommission").textContent = d.commission;
      if ($("#depMin")) $("#depMin").textContent = d.min;
    }

    function refreshAddress() {
      const network = netSel ? netSel.value : "Native / default";
      currentAddress = generateDepositAddress(sel.value, network);
      return currentAddress;
    }

    function openAddressModal(regenerate) {
      if (regenerate || !currentAddress) refreshAddress();
      const d = feeFor(sel.value);
      const network = netSel ? netSel.value : "Native / default";
      const modal = $("#depModal");
      if (!modal) {
        toast("Address: " + currentAddress);
        return;
      }
      if ($("#depModalAsset")) $("#depModalAsset").textContent = sel.value + " · " + (d.name || sel.value);
      if ($("#depModalNetwork")) $("#depModalNetwork").textContent = network;
      if ($("#depModalAddress")) $("#depModalAddress").textContent = currentAddress;
      if ($("#depModalCommission")) $("#depModalCommission").textContent = d.commission;
      if ($("#depModalMin")) $("#depModalMin").textContent = d.min;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeAddressModal() {
      const modal = $("#depModal");
      if (modal) modal.hidden = true;
      document.body.style.overflow = "";
    }

    fillNetworks();
    updateMeta();
    refreshAddress();

    sel.addEventListener("change", function () {
      fillNetworks();
      updateMeta();
      refreshAddress();
    });
    if (netSel) {
      netSel.addEventListener("change", function () {
        refreshAddress();
      });
    }

    $("#depShowAddress") && $("#depShowAddress").addEventListener("click", function () {
      openAddressModal(true);
    });

    $("#depModalClose") && $("#depModalClose").addEventListener("click", closeAddressModal);
    $("#depModalBackdrop") && $("#depModalBackdrop").addEventListener("click", closeAddressModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAddressModal();
    });

    $("#depNewAddress") && $("#depNewAddress").addEventListener("click", function () {
      openAddressModal(true);
      toast("New deposit address generated");
    });

    $("#depCopyAddress") && $("#depCopyAddress").addEventListener("click", function () {
      const addr = ($("#depModalAddress") && $("#depModalAddress").textContent) || currentAddress;
      if (!addr || addr === "—") return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function () {
          toast("Address copied");
        }).catch(function () {
          fallbackCopy(addr);
        });
      } else {
        fallbackCopy(addr);
      }
    });

    function fallbackCopy(text) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast("Address copied");
      } catch (e) {
        toast("Copy failed — select address manually");
      }
      document.body.removeChild(ta);
    }

    $("#depSimulate") && $("#depSimulate").addEventListener("click", function () {
      if (!requireAuth("profile/deposit.html")) return;
      const amt = parseFloat($("#depAmount") && $("#depAmount").value) || 0;
      if (amt <= 0) return toast("Enter an amount to credit your demo balance");
      const sym = sel.value;

      function done() {
        toast("Demo deposit credited: " + amt + " " + sym);
        if ($("#depAmount")) $("#depAmount").value = "";
        renderWallet();
      }

      if (backendOn() && WunnaxBackend.isAuthed()) {
        WunnaxBackend.creditDemo(sym, amt)
          .then(function () { return refreshBackendWallet(); })
          .then(done)
          .catch(function (err) { toast(backendErr(err) || "Credit failed"); });
        return;
      }
      const w = getWallet();
      w[sym] = (w[sym] || 0) + amt;
      setWallet(w);
      done();
    });
  }

  function finishLogin(user, message) {
    setUser(user);
    backendUserCache = user;
    localStorage.setItem(STORAGE.session, "1");
    if (!localStorage.getItem(STORAGE.wallet)) setWallet(defaultWallet());
    toast(message || ("Signed in as " + (user.name || user.email)));
    const next = new URLSearchParams(location.search).get("next");
    const go = function () {
      setTimeout(function () {
        location.href = next && !next.startsWith("http") ? next.replace(/^\//, "") : "profile/wallet.html";
      }, 650);
    };
    if (backendOn() && WunnaxBackend.isAuthed()) {
      refreshBackendWallet().finally(go);
      return;
    }
    go();
  }

  function showOAuthModal(provider, onDone) {
    let overlay = $("#oauthOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "oauth-overlay";
      overlay.id = "oauthOverlay";
      overlay.innerHTML =
        '<div class="oauth-modal" role="dialog" aria-modal="true">' +
        '<div class="oauth-spinner" aria-hidden="true"></div>' +
        '<h3 id="oauthTitle">Connecting…</h3>' +
        '<p id="oauthText">Confirm on your device to continue securely.</p>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="oauthCancel">Cancel</button>' +
        "</div>";
      document.body.appendChild(overlay);
    }
    const labels = {
      google: { title: "Continue with Google", text: "Opening Google on this device… approve the account to finish." },
      apple: { title: "Continue with Apple", text: "Use Face ID / Touch ID or your Apple ID on this device." },
      device: { title: "Sign in with this device", text: "Use your device passkey, Face ID, or Touch ID." },
    };
    const L = labels[provider] || labels.device;
    $("#oauthTitle").textContent = L.title;
    $("#oauthText").textContent = L.text;
    overlay.classList.add("open");
    let cancelled = false;
    const cancel = function () {
      cancelled = true;
      overlay.classList.remove("open");
    };
    $("#oauthCancel").onclick = cancel;
    // Simulated device OAuth handshake (replace with real Google/Apple Client IDs in production)
    setTimeout(function () {
      if (cancelled) return;
      overlay.classList.remove("open");
      onDone();
    }, 1400);
  }

  function socialLogin(provider) {
    showOAuthModal(provider, function () {
      const stamp = Date.now().toString(36);
      let name, email;
      if (provider === "google") {
        name = "Google User";
        email = "user." + stamp + "@gmail.com";
      } else if (provider === "apple") {
        name = "Apple User";
        email = "user." + stamp + "@privaterelay.appleid.com";
      } else {
        name = "Device User";
        email = "device." + stamp + "@wunnaxswap.local";
      }
      // Prefer existing local profile email if already registered with same provider
      const existing = getUser();
      if (existing && existing.provider === provider) {
        finishLogin(existing, "Welcome back via " + provider);
        return;
      }
      finishLogin(
        {
          name: name,
          email: email,
          provider: provider,
          created: Date.now(),
        },
        "Signed in with " + (provider === "google" ? "Google" : provider === "apple" ? "Apple" : "this device")
      );
    });
  }

  function devicePasskeyLogin() {
    // Device / Face ID / Touch ID style flow (demo). Wire WebAuthn passkeys in production.
    socialLogin("device");
  }

  function initAuth() {
    const signup = $("#signupForm");
    const signin = $("#signinForm");

    // Social / device buttons (present on signin + signup)
    $$("[data-provider]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const provider = btn.getAttribute("data-provider");
        if (provider === "device") devicePasskeyLogin();
        else socialLogin(provider);
      });
    });

    // Show device button on capable / mobile browsers
    const deviceBtn = $("#btnDevice");
    if (deviceBtn) {
      const ua = navigator.userAgent || "";
      const isApple = /iPhone|iPad|iPod|Macintosh/.test(ua);
      const isMobile = /Android|iPhone|iPad|iPod/.test(ua);
      if (isApple || isMobile || window.PublicKeyCredential) {
        deviceBtn.hidden = false;
        const label = $("#deviceLabel");
        if (label) {
          label.textContent = isApple
            ? "Continue with Face ID / Touch ID"
            : "Sign in with this device";
        }
      }
    }

    if (signup) {
      signup.addEventListener("submit", function (e) {
        e.preventDefault();
        const name = $("#suName").value.trim();
        const email = $("#suEmail").value.trim();
        const pass = $("#suPass").value;
        if (!name || !email || pass.length < 6) return toast("Fill all fields (password 6+ chars)");

        if (backendOn()) {
          toast("Creating account…");
          WunnaxBackend.signUp(email, pass, name)
            .then(function (data) {
              if (!data.session) {
                toast("Check your email to confirm, then sign in");
                return;
              }
              return refreshBackendUser().then(function (u) {
                finishLogin(u || { name: name, email: email, provider: "email", backend: "firebase" },
                  "Welcome to Wunnaxswap, " + name.split(" ")[0] + "!");
              });
            })
            .catch(function (err) {
              toast(backendErr(err) || "Sign up failed");
            });
          return;
        }

        finishLogin(
          { name: name, email: email, pass: pass, provider: "email", created: Date.now() },
          "Welcome to Wunnaxswap, " + name.split(" ")[0] + "!"
        );
      });
    }
    if (signin) {
      signin.addEventListener("submit", function (e) {
        e.preventDefault();
        const email = $("#siEmail").value.trim();
        const pass = $("#siPass").value;

        if (backendOn()) {
          if (!email || pass.length < 4) return toast("Enter email and password");
          toast("Signing in…");
          WunnaxBackend.signIn(email, pass)
            .then(function () { return refreshBackendUser(); })
            .then(function (u) {
              finishLogin(u || { name: email.split("@")[0], email: email, provider: "email", backend: "firebase" }, "Signed in");
            })
            .catch(function (err) {
              toast(backendErr(err) || "Invalid credentials");
            });
          return;
        }

        const user = getUser();
        if (!user || user.email !== email || (user.pass && user.pass !== pass)) {
          if (email && pass.length >= 4) {
            finishLogin(
              { name: email.split("@")[0], email: email, pass: pass, provider: "email", created: Date.now() },
              "Signed in"
            );
          } else {
            return toast("Invalid credentials");
          }
          return;
        }
        finishLogin(user, "Signed in");
      });
    }
  }

  function initFeesTables() {
    const dep = $("#depositFeesBody");
    if (dep) {
      dep.innerHTML = WUNNA.DEPOSIT_FEES.map(function (d) {
        return "<tr><td><div class=\"asset\"><span class=\"asset-badge\">" + d.symbol.slice(0, 2) +
          "</span>" + d.symbol + "</div></td><td>" + d.name + "</td><td>" + d.commission +
          "</td><td class=\"mono\">" + d.min + "</td></tr>";
      }).join("");
    }
    const tiers = $("#feeTiersBody");
    if (tiers) {
      tiers.innerHTML = WUNNA.FEE_TIERS.map(function (t) {
        return "<tr><td><strong>" + t.tier + "</strong></td><td>" + t.volume +
          "</td><td class=\"mono\">" + t.maker + "</td><td class=\"mono\">" + t.taker + "</td></tr>";
      }).join("");
    }
  }

  function initEarn() {
    const grid = $("#stakingGrid");
    if (!grid) return;

    function renderPlans() {
      grid.innerHTML = WUNNA.STAKING.map(function (s) {
        const apr = typeof s.apr === "number" ? s.apr : parseFloat(s.apr) || 0;
        return '<article class="card feature">' +
          '<div class="asset" style="margin-bottom:.6rem">' + coinImg(s.asset, "coin-logo lg") +
          "<div><strong>" + s.asset + " Staking</strong><div class=\"muted\" style=\"font-size:.78rem\">Min " + s.min + " · " + s.risk + " risk</div></div></div>" +
          "<p>APR <strong class=\"up\">" + apr.toFixed(1) + "%</strong> · " + s.term + " · Lock: " + s.lock + "</p>" +
          '<div class="stake-progress" title="Pool capacity"><i style="width:' + (s.capacity || 50) + '%"></i></div>' +
          '<p class="muted" style="font-size:.78rem">Capacity filled: ' + (s.capacity || 50) + "%</p>" +
          '<button class="btn btn-soft btn-sm stake-btn" type="button" data-asset="' + s.asset +
          '" data-apr="' + apr + '" data-term="' + s.term + '" data-min="' + s.min +
          '">Stake now</button></article>';
      }).join("");
      $$(".stake-btn", grid).forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!requireAuth(location.pathname.includes("profile") ? "profile/staking.html" : "earn.html")) return;
          const asset = btn.dataset.asset;
          const min = parseFloat(btn.dataset.min) || 0;
          const apr = parseFloat(btn.dataset.apr) || 0;
          const amt = Math.max(min, min * 2);
          const w = getWallet();
          if ((w[asset] || 0) < amt && asset !== "USDT") {
            if ((w.USDT || 0) < 50) return toast("Need more " + asset + " or USDT in wallet");
          }

          function localStake() {
            const ww = getWallet();
            if ((ww[asset] || 0) >= amt) ww[asset] -= amt;
            else ww.USDT = (ww.USDT || 0) - 50;
            setWallet(ww);
            const stakes = getStakes();
            stakes.unshift({
              asset: asset,
              amount: amt,
              apr: apr,
              term: btn.dataset.term,
              started: new Date().toLocaleString(),
            });
            setStakes(stakes);
          }

          function done() {
            toast("Staked " + money(amt) + " " + asset + " @ " + apr + "% APR");
            renderWallet();
            renderStakePositions();
          }

          if (backendOn() && WunnaxBackend.isAuthed() && (w[asset] || 0) >= amt) {
            WunnaxBackend.openStake(asset, amt, btn.dataset.term || "flexible", apr)
              .then(function (res) {
                if (res && res.stake_id) {
                  const stakes = getStakes();
                  stakes.unshift({
                    id: res.stake_id,
                    asset: asset,
                    amount: amt,
                    apr: apr,
                    term: btn.dataset.term || "flexible",
                    started: new Date().toLocaleString(),
                  });
                  setStakes(stakes);
                }
                return refreshBackendWallet();
              })
              .then(done)
              .catch(function (err) { toast(backendErr(err) || "Stake failed"); });
            return;
          }
          localStake();
          done();
        });
      });
    }

    function paintStakePositions(stakes) {
      const body = $("#stakePositions");
      let totalUsd = 0;
      let daily = 0;
      stakes.forEach(function (s) {
        const a = assetBySymbol(s.asset);
        const px = a ? a.price : s.asset === "USDT" ? 1 : 0;
        const usd = s.amount * px;
        totalUsd += usd;
        daily += usd * (s.apr / 100) / 365;
      });
      if ($("#stakeTotal")) $("#stakeTotal").textContent = "$" + money(totalUsd, 2);
      if ($("#stakeReward")) $("#stakeReward").textContent = "$" + money(daily, 4);
      if ($("#stakePlans")) $("#stakePlans").textContent = String(stakes.length);
      if (!body) return;
      body.innerHTML = stakes.length
        ? stakes.map(function (s, i) {
            const a = assetBySymbol(s.asset);
            const px = a ? a.price : s.asset === "USDT" ? 1 : 0;
            const day = s.amount * px * (s.apr / 100) / 365;
            const idAttr = s.id ? ' data-id="' + String(s.id).replace(/"/g, "") + '"' : "";
            return "<tr><td><div class=\"asset\">" + coinImg(s.asset) + " " + s.asset +
              "</div></td><td class=\"mono\">" + money(s.amount) +
              '</td><td class="up mono">' + s.apr + "%</td><td>" + s.term +
              "</td><td>" + s.started + '</td><td class="mono up">$' + money(day, 4) +
              '</td><td><button class="btn btn-ghost btn-sm unstake-btn" data-i="' + i + '"' +
              idAttr + ">Unstake</button></td></tr>";
          }).join("")
        : '<tr><td colspan="7" class="muted">No active stakes yet.</td></tr>';
      $$(".unstake-btn", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          const i = parseInt(btn.dataset.i, 10);
          const stakeId = btn.dataset.id || "";
          const local = getStakes();
          const s = local[i] || (stakeId ? { id: stakeId, asset: "?" } : null);
          if (!s && !stakeId) return;

          function localUnstake() {
            const stakes = getStakes();
            const row = stakes[i];
            if (!row) return;
            const w = getWallet();
            w[row.asset] = (w[row.asset] || 0) + row.amount;
            setWallet(w);
            stakes.splice(i, 1);
            setStakes(stakes);
          }

          function done(assetLabel) {
            toast("Unstaked " + (assetLabel || "position"));
            renderWallet();
            renderStakePositions();
          }

          if (backendOn() && WunnaxBackend.isAuthed() && stakeId && WunnaxBackend.closeStake) {
            WunnaxBackend.closeStake(stakeId)
              .then(function (res) { return refreshBackendWallet().then(function () { return res; }); })
              .then(function (res) {
                // Drop matching local cache row if present
                const stakes = getStakes().filter(function (x) {
                  return x.id !== stakeId;
                });
                setStakes(stakes);
                done((res && res.asset) || s.asset);
              })
              .catch(function (err) { toast(backendErr(err) || "Unstake failed"); });
            return;
          }
          localUnstake();
          done(s.asset);
        });
      });
    }

    function renderStakePositions() {
      if (backendOn() && WunnaxBackend.isAuthed() && WunnaxBackend.listStakes) {
        WunnaxBackend.listStakes()
          .then(function (remote) {
            if (remote && remote.length) {
              setStakes(remote);
              paintStakePositions(remote);
            } else {
              paintStakePositions(getStakes());
            }
          })
          .catch(function () {
            paintStakePositions(getStakes());
          });
        return;
      }
      paintStakePositions(getStakes());
    }

    renderPlans();
    renderStakePositions();
    $("#lendWaitlist") && $("#lendWaitlist").addEventListener("click", function () {
      toast("You're on the crypto lending waitlist — future feature");
    });
  }

  function initFaq() {
    const box = $("#faqList");
    if (!box) return;
    box.innerHTML = WUNNA.FAQ.map(function (f, i) {
      return '<div class="faq-item' + (i === 0 ? " open" : "") + '"><button type="button" class="faq-q">' +
        f.q + '<span>+</span></button><div class="faq-a">' + f.a + "</div></div>";
    }).join("");
    $$(".faq-item .faq-q", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.parentElement.classList.toggle("open");
      });
    });
  }

  function initTools() {
    // market cap
    const capBody = $("#capBody");
    if (capBody) {
      function drawCap() {
        const q = ($("#capSearch") && $("#capSearch").value || "").trim().toLowerCase();
        let sorted = WUNNA.ASSETS.slice().sort(function (a, b) { return (b.marketCap || 0) - (a.marketCap || 0); });
        if (q) sorted = sorted.filter(function (a) {
          return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
        });
        const totalCap = WUNNA.ASSETS.reduce(function (s, a) { return s + (a.marketCap || 0); }, 0);
        const totalVol = WUNNA.ASSETS.reduce(function (s, a) { return s + (a.volume || 0); }, 0);
        const btc = assetBySymbol("BTC");
        if ($("#capTotal")) $("#capTotal").textContent = compact(totalCap);
        if ($("#capVol")) $("#capVol").textContent = compact(totalVol);
        if ($("#capBtcDom")) $("#capBtcDom").textContent = btc && totalCap ? ((btc.marketCap / totalCap) * 100).toFixed(1) + "%" : "—";
        if ($("#capCount")) $("#capCount").textContent = String(sorted.length);

        capBody.innerHTML = sorted.map(function (a, i) {
          const dom = totalCap ? ((a.marketCap || 0) / totalCap * 100).toFixed(2) + "%" : "—";
          return "<tr><td>" + (i + 1) + '</td><td><div class="pair-cell">' + coinImg(a.symbol) +
            '<div class="meta"><strong>' + a.name + "</strong><span>" + a.symbol +
            "</span></div></div></td>" +
            '<td class="mono">$' + money(a.price) + '</td><td class="mono ' + (a.change >= 0 ? "up" : "down") + '">' +
            (a.change >= 0 ? "+" : "") + a.change.toFixed(2) + "%</td>" +
            '<td class="mono">' + compact(a.marketCap) +
            '</td><td class="mono">' + compact(a.volume) +
            "</td><td class=\"mono\">" + dom + "</td>" +
            '<td><canvas class="spark" data-px="' + a.price + '" data-chg="' + a.change + '" width="96" height="32"></canvas></td>' +
            '<td><a class="btn btn-soft btn-sm" href="../trade.html?pair=' + a.symbol + '_USDT">Trade</a></td></tr>';
        }).join("");
        if (window.drawSparkline) {
          $$("canvas.spark", capBody).forEach(function (c) {
            drawSparkline(c, parseFloat(c.dataset.px), parseFloat(c.dataset.chg));
          });
        }
      }
      drawCap();
      document.addEventListener("wunna:prices", drawCap);
      $("#capSearch") && $("#capSearch").addEventListener("input", drawCap);
    }

    // screener
    const scr = $("#screenerBody");
    if (scr) {
      function signalOf(a) {
        if (a.change > 2) return "hot";
        if (a.change < -1) return "weak";
        return "stable";
      }
      function drawScr() {
        const minCh = parseFloat($("#scrMinChange") && $("#scrMinChange").value);
        const maxCh = parseFloat($("#scrMaxChange") && $("#scrMaxChange").value);
        const minVol = parseFloat($("#scrMinVol") && $("#scrMinVol").value) || 0;
        const minMcap = parseFloat($("#scrMinMcap") && $("#scrMinMcap").value) || 0;
        const cat = ($("#scrCat") && $("#scrCat").value) || "all";
        const sig = ($("#scrSignal") && $("#scrSignal").value) || "all";
        const q = ($("#scrSearch") && $("#scrSearch").value || "").trim().toLowerCase();
        const rows = WUNNA.ASSETS.filter(function (a) {
          if (!isNaN(minCh) && a.change < minCh) return false;
          if (!isNaN(maxCh) && a.change > maxCh) return false;
          if (a.volume < minVol) return false;
          if ((a.marketCap || 0) < minMcap) return false;
          if (cat === "crypto" && a.category !== "crypto") return false;
          if (cat === "stable" && a.category !== "stable") return false;
          if (cat === "futures" && !a.futures) return false;
          if (sig !== "all" && signalOf(a) !== sig) return false;
          if (q && !(a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))) return false;
          return true;
        });
        if ($("#scrCount")) $("#scrCount").textContent = rows.length + " results";
        scr.innerHTML = rows.map(function (a) {
          const s = signalOf(a);
          const badge = s === "hot" ? "badge-green" : s === "weak" ? "badge-amber" : "badge-violet";
          const label = s === "hot" ? "Hot" : s === "weak" ? "Weak" : "Stable";
          return "<tr><td><div class=\"pair-cell\">" + coinImg(a.symbol) +
            '<div class="meta"><strong>' + a.symbol + "</strong><span>" + a.name +
            "</span></div></div></td>" +
            '<td class="mono">$' + money(a.price) +
            '</td><td class="mono ' + (a.change >= 0 ? "up" : "down") + '">' + a.change.toFixed(2) +
            "%</td><td class=\"mono\">" + compact(a.volume) +
            '</td><td class="mono">' + compact(a.marketCap) +
            '</td><td><span class="badge ' + badge + '">' + label + "</span></td>" +
            '<td><canvas class="spark" data-px="' + a.price + '" data-chg="' + a.change + '" width="96" height="32"></canvas></td>' +
            '<td><a class="btn btn-soft btn-sm" href="../trade.html?pair=' + a.symbol + '_USDT">Trade</a> ' +
            (a.futures ? '<a class="btn btn-ghost btn-sm" href="../trade.html?pair=' + a.symbol + '_USDT&mode=futures">Futures</a>' : "") +
            "</td></tr>";
        }).join("") || '<tr><td colspan="8" class="muted">No coins match filters.</td></tr>';
        if (window.drawSparkline) {
          $$("canvas.spark", scr).forEach(function (c) {
            drawSparkline(c, parseFloat(c.dataset.px), parseFloat(c.dataset.chg));
          });
        }
      }
      drawScr();
      ["scrMinChange", "scrMaxChange", "scrMinVol", "scrMinMcap", "scrCat", "scrSignal", "scrSearch"].forEach(function (id) {
        const el = $("#" + id);
        if (!el) return;
        el.addEventListener("input", drawScr);
        el.addEventListener("change", drawScr);
      });
      $("#scrReset") && $("#scrReset").addEventListener("click", function () {
        if ($("#scrMinChange")) $("#scrMinChange").value = -100;
        if ($("#scrMaxChange")) $("#scrMaxChange").value = 100;
        if ($("#scrMinVol")) $("#scrMinVol").value = 0;
        if ($("#scrMinMcap")) $("#scrMinMcap").value = 0;
        if ($("#scrCat")) $("#scrCat").value = "all";
        if ($("#scrSignal")) $("#scrSignal").value = "all";
        if ($("#scrSearch")) $("#scrSearch").value = "";
        drawScr();
      });
      document.addEventListener("wunna:prices", drawScr);
    }

    // cross rates
    const cross = $("#crossBody");
    if (cross) {
      const bases = ["BTC", "ETH", "SOL", "BNB", "XRP"];
      function drawCross() {
        let html = "<tr><th></th>" + bases.map(function (b) { return "<th>" + b + "</th>"; }).join("") + "</tr>";
        bases.forEach(function (row) {
          html += "<tr><th>" + row + "</th>";
          bases.forEach(function (col) {
            const a = assetBySymbol(row);
            const b = assetBySymbol(col);
            const v = row === col ? "1" : money(a.price / b.price);
            html += '<td class="mono">' + v + "</td>";
          });
          html += "</tr>";
        });
        cross.innerHTML = html;
      }
      drawCross();
      document.addEventListener("wunna:prices", drawCross);
    }

    // heat map
    const heat = $("#heatMap");
    if (heat) {
      function drawHeat() {
        heat.innerHTML = WUNNA.ASSETS.filter(function (a) { return a.symbol !== "USDT"; }).map(function (a) {
          const intensity = Math.min(1, Math.abs(a.change) / 5);
          const bg = a.change >= 0
            ? "rgba(52,211,153," + (0.15 + intensity * 0.55) + ")"
            : "rgba(248,113,113," + (0.15 + intensity * 0.55) + ")";
          return '<div class="heat-cell" style="background:' + bg + '"><div>' + a.symbol +
            "</div><div class=\"mono\">" + (a.change >= 0 ? "+" : "") + a.change.toFixed(2) + "%</div></div>";
        }).join("");
      }
      drawHeat();
      document.addEventListener("wunna:prices", drawHeat);
    }

    // technical — realistic candles
    const techChart = $("#techChart");
    if (techChart && window.WunnaChart) {
      const sel = $("#techAsset");
      if (sel) {
        sel.innerHTML = WUNNA.ASSETS.filter(function (a) { return a.category === "crypto"; })
          .map(function (a) { return "<option value=\"" + a.symbol + "\">" + a.symbol + " — " + a.name + "</option>"; }).join("");
      }
      let tech = new WunnaChart(techChart, {
        price: (assetBySymbol((sel && sel.value) || "BTC") || {}).price || 100,
        volatility: 0.0045,
        count: 100,
      });
      function updateTechMeta() {
        const a = assetBySymbol((sel && sel.value) || "BTC");
        if ($("#techPrice")) $("#techPrice").textContent = "$" + money(a.price);
        const last = tech.candles[tech.candles.length - 1];
        const prev = tech.candles[tech.candles.length - 15] || last;
        const mom = ((last.c - prev.c) / prev.c) * 100;
        if ($("#techRsi")) $("#techRsi").textContent = (50 + mom * 4).toFixed(1);
        if ($("#techSignal")) {
          const r = 50 + mom * 4;
          $("#techSignal").textContent = r > 70 ? "Overbought" : r < 30 ? "Oversold" : "Neutral";
        }
      }
      updateTechMeta();
      sel && sel.addEventListener("change", function () {
        const a = assetBySymbol(sel.value);
        tech.reset(a.price, 0.0045);
        updateTechMeta();
      });
      document.addEventListener("wunna:prices", function () {
        const a = assetBySymbol((sel && sel.value) || "BTC");
        tech.setPrice(a.price);
        updateTechMeta();
      });
    }
  }

  function initRoadmap() {
    const el = $("#roadmapGrid");
    if (!el) return;
    el.innerHTML = WUNNA.ROADMAP.map(function (r) {
      const cls = r.tag === "Live" ? "badge-green" : r.tag === "Next" ? "badge-violet" : "badge-amber";
      return '<article class="card road-item"><span class="badge ' + cls + ' tag">' + r.tag +
        "</span><h3>" + r.title + "</h3><p>" + r.desc + "</p></article>";
    }).join("");
  }

  function initContact() {
    const form = $("#contactForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      toast("Message queued — demo support will reply in chat");
      form.reset();
    });
  }

  function initListing() {
    const form = $("#listingForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      toast("Listing application received (demo)");
      form.reset();
    });
  }

  function initSettings() {
    const box = $("#settingsUser");
    if (!box) return;
    const u = getUser();
    if (!isAuthed()) { requireAuth("profile/settings.html"); return; }
    box.innerHTML = u
      ? "<p><strong>Name:</strong> " + u.name + "</p><p><strong>Email:</strong> " + u.email + "</p>"
      : "<p class=\"muted\">No profile</p>";
    $("#enable2fa") && $("#enable2fa").addEventListener("click", function () {
      toast("2FA demo enabled — use authenticator in production");
    });
  }


  function initSupportedLists() {
    const exEl = $("#supportedExchanges");
    const coinEl = $("#supportedCoins");
    if (!exEl && !coinEl) return;
    if (!window.WUNNA) return;

    if (exEl) {
      const list = WUNNA.SUPPORTED_EXCHANGES || (WUNNA.EXCHANGES || []).filter(function (e) {
        return e !== "Wunnaxswap";
      });
      exEl.innerHTML = list.map(function (name) {
        return '<span class="chip ex">' + name + "</span>";
      }).join("");
      if ($("#exchangeCount")) $("#exchangeCount").textContent = "(" + list.length + ")";
    }

    if (coinEl) {
      const coins = WUNNA.SUPPORTED_COINS || (WUNNA.ASSETS || []).map(function (a) {
        return { symbol: a.symbol, name: a.name, category: a.category };
      });
      coinEl.innerHTML = coins.map(function (c) {
        const cls = c.category === "stable" ? "chip stable" : "chip";
        const img = coinImg(c.symbol, "chip-logo");
        return '<span class="' + cls + '">' + img + " " + c.name + " <span class=\"muted\">" + c.symbol + "</span></span>";
      }).join("");
      if ($("#coinCount")) $("#coinCount").textContent = "(" + coins.length + ")";
    }
  }

  function bootApp() {
    renderShell();
    initHomeTickers();
    initMarketsPage();
    initSwap();
    initArbitrage();
    initTrade();
    initAuth();
    initFeesTables();
    initEarn();
    initFaq();
    initTools();
    initRoadmap();
    initContact();
    initListing();
    initDeposit();
    initSettings();
    renderOrdersTable();
    renderWallet();
    initSupportedLists();
    setInterval(tickPrices, 2200);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (backendOn() && window.WunnaxBackend && WunnaxBackend.init) {
      var readyFn =
        typeof WunnaxBackend.waitForReady === "function"
          ? WunnaxBackend.waitForReady(12000)
          : WunnaxBackend.init();
      readyFn
        .then(function () { return refreshBackendUser(); })
        .then(function () { return refreshBackendWallet(); })
        .catch(function (e) { console.warn("[Wunnax] backend init", e); })
        .finally(bootApp);
      return;
    }
    bootApp();
  });

  // expose for debugging
  window.Wunnax = {
    toast: toast,
    getWallet: getWallet,
    getUser: getUser,
    money: money,
    backendOn: backendOn,
    backendErr: backendErr,
    refreshBackendWallet: refreshBackendWallet,
  };
})();
