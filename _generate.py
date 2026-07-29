from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent


def page(title, body, depth=0, extra_head=""):
    prefix = "../" * depth
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} | Wunnaxswap</title>
  <meta name="description" content="Wunnaxswap — buy and sell crypto at competitive rates with arbitrage tools, swap, markets, and earn products." />
  <meta name="theme-color" content="#070a12" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="{prefix}assets/css/main.css" />
  {extra_head}
</head>
<body>
{body}
  <script src="{prefix}assets/js/data.js"></script>
  <script src="{prefix}assets/js/app.js"></script>
</body>
</html>
"""


index_body = """
<main>
  <section class="container hero">
    <div>
      <div class="pill">◆ Multi-venue rates · Arbitrage-ready · Transparent fees</div>
      <h1>Buy & sell crypto at <span class="grad">smarter prices</span></h1>
      <p class="lead">Wunnaxswap helps you find cheaper buy quotes, stronger sell venues, and instant swaps — with transparent fees and tools built for everyday traders.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="signup.html">Create free account</a>
        <a class="btn btn-cyan" href="arbitrage.html">Open arbitrage scanner</a>
        <a class="btn btn-ghost" href="markets.html">Browse markets</a>
      </div>
      <div class="stats">
        <div class="stat"><strong>200+</strong><span>Countries welcome</span></div>
        <div class="stat"><strong>150+</strong><span>Trading pairs</span></div>
        <div class="stat"><strong>0.03%</strong><span>VIP maker fees</span></div>
        <div class="stat"><strong>24/7</strong><span>Demo markets live</span></div>
      </div>
    </div>
    <div class="card hero-card">
      <h3>Trending now</h3>
      <div id="homeTickers"></div>
      <div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <a class="btn btn-soft btn-sm" href="trade.html?pair=BTC_USDT">Trade BTC</a>
        <a class="btn btn-ghost btn-sm" href="swap.html">Instant swap</a>
      </div>
    </div>
  </section>

  <section class="section container">
    <div class="section-head">
      <div>
        <h2>Why traders choose Wunnaxswap</h2>
        <p>Everything you need to buy, sell, route, and earn — without opaque pricing.</p>
      </div>
    </div>
    <div class="grid-3">
      <article class="card feature"><div class="icon">⚡</div><h3>Arbitrage discovery</h3><p>Scan simulated multi-exchange quotes to spot cheaper buys and higher sells in seconds.</p></article>
      <article class="card feature"><div class="icon">⇄</div><h3>Instant swap desk</h3><p>Convert assets with live demo rates, clear fees, and one-tap execution in your wallet.</p></article>
      <article class="card feature"><div class="icon">◎</div><h3>Earn while you hold</h3><p>Flexible and fixed staking plans with transparent APRs. Lending is on the roadmap.</p></article>
      <article class="card feature"><div class="icon">📊</div><h3>Pro-style tools</h3><p>Market cap, screener, cross rates, heat map, and technical signals in one toolkit.</p></article>
      <article class="card feature"><div class="icon">🛡</div><h3>Security-first UX</h3><p>2FA flows, KYC guidance, session controls, and compliance pages built in.</p></article>
      <article class="card feature"><div class="icon">🚀</div><h3>Future-ready</h3><p>Roadmap includes fiat on-ramp, bridge, launchpad, and optional arb bots.</p></article>
    </div>
  </section>

  <section class="section container">
    <div class="section-head">
      <div>
        <h2>Explore products</h2>
        <p>Trade on your terms — spot, swap, earn, and arbitrage in one brand.</p>
      </div>
      <a class="btn btn-ghost btn-sm" href="markets.html">View all markets</a>
    </div>
    <div class="grid-2">
      <article class="card feature">
        <h3>Spot trading terminal</h3>
        <p>Order book, live chart, market/limit tickets, and order history — demo balances included.</p>
        <p style="margin-top:.8rem"><a class="btn btn-primary btn-sm" href="trade.html">Go trading</a></p>
      </article>
      <article class="card feature">
        <h3>Buy & sell made simple</h3>
        <p>Deposit major coins with clear minimums and commissions, then swap or trade immediately.</p>
        <p style="margin-top:.8rem"><a class="btn btn-cyan btn-sm" href="profile/deposit.html">Deposit</a>
        <a class="btn btn-ghost btn-sm" href="swap.html">Swap</a></p>
      </article>
    </div>
  </section>

  <section class="section container">
    <div class="section-head">
      <div>
        <h2>Product roadmap</h2>
        <p>Present features ship in-browser today. Future modules are marked and interactive via waitlists.</p>
      </div>
    </div>
    <div class="roadmap" id="roadmapGrid"></div>
  </section>

  <section class="section container">
    <div class="card" style="padding:1.4rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center">
      <div>
        <h2 style="margin:0 0 .35rem">Ready to list your project?</h2>
        <p class="muted" style="margin:0">Apply for listing and reach Wunnaxswap traders.</p>
      </div>
      <a class="btn btn-primary" href="contact.html#listing">Apply for listing</a>
    </div>
    <div class="disclaimer">Demo platform: prices and balances are simulated in your browser for product exploration. Not financial advice. Crypto is volatile — never invest more than you can afford to lose.</div>
  </section>
</main>
"""
(ROOT / "index.html").write_text(page("Buy & Sell Crypto Cheaper", index_body), encoding="utf-8")

markets = """
<main class="container-wide" style="padding-bottom:2rem">
  <div class="page-hero">
    <h1>Markets</h1>
    <p>Live demo prices across major pairs. Favorite assets, filter gainers, and jump into trade or arbitrage.</p>
  </div>
  <div class="tabs">
    <button class="tab active" data-filter="all" type="button">All</button>
    <button class="tab" data-filter="favorites" type="button">Favorites</button>
    <button class="tab" data-filter="gainers" type="button">Gainers</button>
    <button class="tab" data-filter="losers" type="button">Losers</button>
    <button class="tab" data-filter="new" type="button">New listing</button>
  </div>
  <div style="margin-bottom:1rem;max-width:360px">
    <input class="input" id="marketSearch" placeholder="Search coin or symbol…" />
  </div>
  <div class="table-wrap">
    <table class="data">
      <thead><tr><th></th><th>Pair</th><th>Last price</th><th>24h change</th><th>24h high</th><th>24h low</th><th>24h volume</th><th>Action</th></tr></thead>
      <tbody id="marketsBody"></tbody>
    </table>
  </div>
</main>
"""
(ROOT / "markets.html").write_text(page("Markets", markets), encoding="utf-8")

swap = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero">
    <h1>Instant Swap</h1>
    <p>Convert assets at competitive demo rates with a clear 0.10% swap fee.</p>
  </div>
  <div class="grid-2">
    <div class="card swap-box">
      <div class="swap-side">
        <div class="row"><span class="muted">You send</span>
          <select id="swapSendAsset" class="select" style="width:auto;min-width:110px"></select>
        </div>
        <input id="swapAmount" type="number" min="0" step="any" placeholder="0.00" />
      </div>
      <div style="text-align:center;margin:.4rem 0">
        <button class="btn btn-ghost btn-sm" type="button" id="swapFlip">↕ Flip</button>
      </div>
      <div class="swap-side">
        <div class="row"><span class="muted">You receive</span>
          <select id="swapRecvAsset" class="select" style="width:auto;min-width:110px"></select>
        </div>
        <input id="swapOut" type="text" readonly placeholder="0.00" />
      </div>
      <div class="rate-line"><span id="swapRate">—</span><span id="swapFee">Fee (0.10%): —</span></div>
      <button class="btn btn-primary" type="button" id="swapSubmit" style="width:100%">Exchange</button>
      <p class="muted" style="font-size:.8rem;margin:.8rem 0 0">Requires sign-in. Uses your demo wallet balances.</p>
    </div>
    <div class="card" style="padding:1.2rem">
      <h3 style="margin-top:0">Last orders</h3>
      <div class="table-wrap">
        <table class="data" style="min-width:520px">
          <thead><tr><th>Side</th><th>Pair</th><th>Open</th><th>Closed</th><th>Price</th><th>Amount</th><th>Total</th></tr></thead>
          <tbody id="ordersBody"></tbody>
        </table>
      </div>
    </div>
  </div>
</main>
"""
(ROOT / "swap.html").write_text(page("Swap", swap), encoding="utf-8")

arb = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero">
    <h1>Arbitrage Scanner</h1>
    <p>Compare multi-venue quotes, surface spreads, and estimate net profit after rough fees. Built for cheaper buy / higher sell decisions.</p>
  </div>
  <div class="kpi-row">
    <div class="card kpi"><strong id="arbBest">—</strong><span>Top spread now</span></div>
    <div class="card kpi"><strong>6</strong><span>Venues compared</span></div>
    <div class="card kpi"><strong>~0.08%</strong><span>Assumed round-trip fees</span></div>
    <div class="card kpi"><button class="btn btn-cyan btn-sm" type="button" id="arbRefresh">Refresh board</button><span style="display:block;margin-top:.4rem">Live demo refresh</span></div>
  </div>
  <div class="grid-3" id="arbGrid"></div>
  <div class="disclaimer">Educational simulation only. Real arbitrage requires capital on multiple venues, transfer time, withdrawal fees, and risk controls.</div>
</main>
"""
(ROOT / "arbitrage.html").write_text(page("Arbitrage Scanner", arb), encoding="utf-8")

trade = """
<main class="container-wide" style="padding-bottom:2rem">
  <div class="page-hero" style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:end">
    <div>
      <h1 id="tradePair">BTC/USDT</h1>
      <p>Spot terminal with order book, chart, and market/limit tickets.</p>
    </div>
    <div class="mono" style="font-size:1.6rem;font-weight:800" id="tradePrice">—</div>
  </div>
  <div class="orderbook">
    <div class="card" style="padding:1rem">
      <h3 style="margin:.2rem 0 .6rem">Bids</h3>
      <div class="ob-list" id="bookBids"></div>
    </div>
    <div class="card" style="padding:1rem">
      <div class="chart-box"><canvas id="priceChart"></canvas></div>
      <div class="trade-box" style="padding:1rem 0 0">
        <div class="field"><label>Order type</label>
          <select id="orderType"><option value="market">Market</option><option value="limit">Limit</option></select>
        </div>
        <div class="field"><label>Price (USDT)</label><input id="orderPrice" type="number" step="any" placeholder="Market uses last price" /></div>
        <div class="field"><label>Amount</label><input id="orderAmount" type="number" step="any" placeholder="0.00" /></div>
        <div style="display:flex;gap:.5rem">
          <button class="btn btn-primary" style="flex:1;background:linear-gradient(135deg,#34d399,#059669)" type="button" id="btnBuy">Buy</button>
          <button class="btn btn-primary" style="flex:1;background:linear-gradient(135deg,#f87171,#dc2626)" type="button" id="btnSell">Sell</button>
        </div>
      </div>
    </div>
    <div class="card" style="padding:1rem">
      <h3 style="margin:.2rem 0 .6rem">Asks</h3>
      <div class="ob-list" id="bookAsks"></div>
    </div>
  </div>
  <div class="card" style="padding:1rem;margin-top:1rem">
    <h3 style="margin-top:0">Open / recent orders</h3>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Side</th><th>Pair</th><th>Open</th><th>Closed</th><th>Avg price</th><th>Amount</th><th>Total</th></tr></thead>
        <tbody id="ordersBody"></tbody>
      </table>
    </div>
  </div>
</main>
"""
(ROOT / "trade.html").write_text(page("Spot Trading", trade), encoding="utf-8")

earn = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero">
    <h1>Earn with Wunnaxswap</h1>
    <p>Passive income tools: staking now, crypto lending soon.</p>
  </div>
  <div class="grid-2" style="margin-bottom:1.2rem">
    <article class="card feature">
      <div class="icon">◎</div>
      <h3>Staking</h3>
      <p>Profit by keeping assets in flexible or fixed plans without complex setup.</p>
      <span class="badge badge-green">Live</span>
    </article>
    <article class="card feature">
      <div class="icon">🏦</div>
      <h3>Crypto lending</h3>
      <p>Lend selected assets at competitive rates. Join the waitlist for early access.</p>
      <button class="btn btn-soft btn-sm" type="button" id="lendWaitlist">Join waitlist</button>
      <span class="badge badge-amber" style="margin-left:.4rem">Soon</span>
    </article>
  </div>
  <div class="section-head"><div><h2>Staking plans</h2><p>Choose a plan to stake from your demo wallet.</p></div></div>
  <div class="grid-3" id="stakingGrid"></div>
  <div class="grid-3" style="margin-top:1.2rem">
    <article class="card feature"><h3>Passive income</h3><p>Hold or stake assets and track rewards in your balance area.</p></article>
    <article class="card feature"><h3>Asset security</h3><p>Production deployments should store majority of funds in cold wallets with WAF protection.</p></article>
    <article class="card feature"><h3>Simple interaction</h3><p>Open or close investments in minutes with clear status on your balance.</p></article>
  </div>
</main>
"""
(ROOT / "earn.html").write_text(page("Earn", earn), encoding="utf-8")

fees = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero">
    <h1>Trade more. Pay less.</h1>
    <p>Transparent maker/taker tiers and per-asset deposit conditions.</p>
  </div>
  <div class="kpi-row">
    <div class="card kpi"><strong>0.03%</strong><span>VIP maker from</span></div>
    <div class="card kpi"><strong>0.06%</strong><span>VIP taker from</span></div>
    <div class="card kpi"><strong>0%</strong><span>Stablecoin deposit fee*</span></div>
    <div class="card kpi"><strong>Clear</strong><span>Min deposit per asset</span></div>
  </div>
  <div class="section-head"><div><h2>Trading fee tiers</h2></div></div>
  <div class="table-wrap" style="margin-bottom:1.5rem">
    <table class="data" style="min-width:560px">
      <thead><tr><th>Tier</th><th>30D volume</th><th>Maker</th><th>Taker</th></tr></thead>
      <tbody id="feeTiersBody"></tbody>
    </table>
  </div>
  <div class="section-head"><div><h2>Deposit fees</h2><p>Commission and minimum amount for supported assets.</p></div></div>
  <div class="table-wrap">
    <table class="data">
      <thead><tr><th>Asset</th><th>Name</th><th>Commission</th><th>Min. deposit</th></tr></thead>
      <tbody id="depositFeesBody"></tbody>
    </table>
  </div>
</main>
"""
(ROOT / "fees.html").write_text(page("Fees", fees), encoding="utf-8")

about = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero">
    <h1>About Wunnaxswap</h1>
    <p>A security-minded crypto marketplace focused on competitive pricing and arbitrage-aware tools.</p>
  </div>
  <div class="kpi-row">
    <div class="card kpi"><strong>150+</strong><span>Markets</span></div>
    <div class="card kpi"><strong>200+</strong><span>Countries</span></div>
    <div class="card kpi"><strong>Demo</strong><span>Frontend status</span></div>
    <div class="card kpi"><strong>$100+</strong><span>Typical min start</span></div>
  </div>
  <div class="grid-2">
    <article class="card feature"><h3>Our mission</h3><p>Help people buy and sell digital assets at fairer rates by combining swap, spot, and cross-venue price intelligence.</p></article>
    <article class="card feature"><h3>Security model</h3><p>Account safeguards, monitoring, compliance workflows, and market controls designed for safer access.</p></article>
  </div>
  <div class="section-head" style="margin-top:1.5rem"><div><h2>Platform status</h2></div></div>
  <div class="kpi-row">
    <div class="card kpi"><strong>100%</strong><span>90d uptime (demo)</span></div>
    <div class="card kpi"><strong>~12 ms</strong><span>UI latency</span></div>
    <div class="card kpi"><strong>0</strong><span>Open incidents</span></div>
    <div class="card kpi"><strong>4 / 4</strong><span>Regions ready</span></div>
  </div>
  <div class="section-head"><div><h2>Referral programme</h2><p>Invite friends. Earn together — up to 40% commission (programme rules apply).</p></div></div>
  <div class="grid-3">
    <article class="card feature"><h3>01 Invite</h3><p>Share your unique referral link with traders and communities.</p></article>
    <article class="card feature"><h3>02 They trade</h3><p>Invited users sign up, verify if needed, and trade supported markets.</p></article>
    <article class="card feature"><h3>03 You earn</h3><p>Receive rewards from qualified trading fees in USDT.</p></article>
  </div>
</main>
"""
(ROOT / "about.html").write_text(page("About", about), encoding="utf-8")

contact = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero">
    <h1>Contact Wunnaxswap</h1>
    <p>Account help, compliance, business, or listing requests.</p>
  </div>
  <div class="grid-2">
    <form class="card" style="padding:1.2rem" id="contactForm">
      <div class="field"><label>Topic</label>
        <select id="ctTopic"><option>General support</option><option>Compliance</option><option>Business</option><option>Listing</option><option>Press</option></select>
      </div>
      <div class="field"><label>Name</label><input required placeholder="Your name" /></div>
      <div class="field"><label>Email</label><input type="email" required placeholder="you@email.com" /></div>
      <div class="field"><label>Message</label><textarea rows="5" required placeholder="How can we help?"></textarea></div>
      <button class="btn btn-primary" type="submit">Send message</button>
    </form>
    <div>
      <article class="card feature" style="margin-bottom:1rem">
        <h3>Support channels</h3>
        <p>General: support@wunnaxswap.com</p>
        <p>Legal: legal@wunnaxswap.com</p>
        <p class="muted">Emails are placeholders for this demo site.</p>
      </article>
      <article class="card feature" id="listing">
        <h3>Project listing application</h3>
        <form id="listingForm">
          <div class="field"><label>Project name</label><input required /></div>
          <div class="field"><label>Token symbol</label><input required /></div>
          <div class="field"><label>Website / whitepaper</label><input required /></div>
          <div class="field"><label>Contact email</label><input type="email" required /></div>
          <button class="btn btn-cyan" type="submit">Apply for listing</button>
        </form>
      </article>
    </div>
  </div>
</main>
"""
(ROOT / "contact.html").write_text(page("Contact", contact), encoding="utf-8")

faq = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero"><h1>FAQ</h1><p>Security, KYC, fees, and product questions.</p></div>
  <div id="faqList"></div>
</main>
"""
(ROOT / "faq.html").write_text(page("FAQ", faq), encoding="utf-8")

signin = """
<div class="auth-wrap">
  <form class="card auth-box" id="signinForm">
    <div class="pill">Secure account access</div>
    <h1>Sign in to Wunnaxswap</h1>
    <p class="muted">Access wallets, trading tools, and your protected account area.</p>
    <div class="field"><label>Email</label><input id="siEmail" type="email" required placeholder="you@email.com" /></div>
    <div class="field"><label>Password</label><input id="siPass" type="password" required placeholder="••••••••" /></div>
    <div class="checkline"><input type="checkbox" checked /> <span>Security verification step completed (demo)</span></div>
    <button class="btn btn-primary" style="width:100%" type="submit">Continue</button>
    <p class="muted" style="margin:1rem 0 0;font-size:.88rem">No account? <a href="signup.html">Create account</a></p>
  </form>
</div>
"""
(ROOT / "signin.html").write_text(page("Sign In", signin), encoding="utf-8")

signup = """
<div class="auth-wrap">
  <form class="card auth-box" id="signupForm">
    <div class="pill">Start your crypto journey</div>
    <h1>Create your account</h1>
    <p class="muted">Demo signup stores profile locally in your browser only.</p>
    <div class="field"><label>Full name</label><input id="suName" required placeholder="As on your ID" /></div>
    <div class="field"><label>Email</label><input id="suEmail" type="email" required placeholder="you@email.com" /></div>
    <div class="field"><label>Password</label><input id="suPass" type="password" required minlength="6" placeholder="Min 6 characters" /></div>
    <div class="checkline"><input type="checkbox" required /> <span>I agree to the <a href="terms.html">Terms</a> and <a href="privacy.html">Privacy Policy</a></span></div>
    <button class="btn btn-primary" style="width:100%" type="submit">Sign up</button>
    <p class="muted" style="margin:1rem 0 0;font-size:.88rem">Already registered? <a href="signin.html">Sign in</a></p>
  </form>
</div>
"""
(ROOT / "signup.html").write_text(page("Sign Up", signup), encoding="utf-8")

terms = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero"><h1>Terms of Service</h1><p>Effective demo terms for the Wunnaxswap frontend experience.</p></div>
  <article class="card" style="padding:1.3rem;line-height:1.65">
    <p>By using Wunnaxswap you agree to these Terms. This deployment is a demonstration product interface. It does not execute real on-chain settlements unless you connect your own production backend.</p>
    <h3>1. Eligibility</h3>
    <p>You must be at least 18 and legally able to use crypto services in your jurisdiction. Restricted jurisdictions may be blocked.</p>
    <h3>2. Nature of services</h3>
    <p>Services may include market data displays, simulated trading, swap demos, earn catalogues, arbitrage education tools, and account UI. Nothing here is investment advice.</p>
    <h3>3. Account security</h3>
    <p>You are responsible for credentials and devices. Enable 2FA in production. Notify support of suspected compromise.</p>
    <h3>4. Risks</h3>
    <p>Digital assets are volatile. You may lose value. Arbitrage involves transfer risk, fee risk, and latency risk.</p>
    <h3>5. Fees</h3>
    <p>Displayed fees are illustrative. Production fees will be published in the live fee schedule.</p>
    <h3>6. Prohibited use</h3>
    <p>No fraud, sanctions evasion, market manipulation, abuse of bugs, or unlawful activity.</p>
    <h3>7. Contact</h3>
    <p>legal@wunnaxswap.com (placeholder for demo).</p>
  </article>
</main>
"""
(ROOT / "terms.html").write_text(page("Terms of Service", terms), encoding="utf-8")

privacy = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero"><h1>Privacy Policy</h1><p>How the demo site handles data in your browser.</p></div>
  <article class="card" style="padding:1.3rem;line-height:1.65">
    <p>Wunnaxswap’s static demo stores account, wallet, and order data in your browser localStorage. We do not transmit this demo data to a server unless you host your own backend.</p>
    <h3>Data categories</h3>
    <p>Identity fields you enter, simulated balances, order history, favorites, and chat messages typed in the support widget.</p>
    <h3>Purpose</h3>
    <p>Provide interactive product exploration, remember session state, and improve UX locally.</p>
    <h3>Your controls</h3>
    <p>Clear site data in your browser to erase demo profile and wallet. Production deployments should publish a full controller notice and lawful bases.</p>
    <h3>Contact</h3>
    <p>privacy@wunnaxswap.com (placeholder).</p>
  </article>
</main>
"""
(ROOT / "privacy.html").write_text(page("Privacy Policy", privacy), encoding="utf-8")

compliance = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero"><h1>Compliance</h1><p>Framework overview for a responsible digital asset platform.</p></div>
  <div class="grid-2">
    <article class="card feature"><h3>Customer due diligence</h3><p>Identity verification, liveness checks, and enhanced due diligence when risk warrants.</p></article>
    <article class="card feature"><h3>AML & sanctions</h3><p>Screening, monitoring, and escalation procedures for suspicious activity.</p></article>
    <article class="card feature"><h3>Transaction review</h3><p>Blockchain analytics and behavioural risk signals for transfers and withdrawals.</p></article>
    <article class="card feature"><h3>Market integrity</h3><p>Controls against abuse, manipulation, and compromised accounts.</p></article>
  </div>
  <p class="muted" style="margin-top:1rem">This page is informational for the demo brand and is not a regulatory licence claim.</p>
</main>
"""
(ROOT / "compliance.html").write_text(page("Compliance", compliance), encoding="utf-8")

wallet = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero">
    <h1>Wallet</h1>
    <p>Demo balances stored in your browser. Total estimated in USDT terms.</p>
  </div>
  <div class="kpi-row">
    <div class="card kpi"><strong id="walletTotal">$0.00</strong><span>Estimated total</span></div>
    <div class="card kpi"><a class="btn btn-primary btn-sm" href="deposit.html">Deposit</a><span style="display:block;margin-top:.45rem">Add funds (demo)</span></div>
    <div class="card kpi"><a class="btn btn-cyan btn-sm" href="../swap.html">Swap</a><span style="display:block;margin-top:.45rem">Convert assets</span></div>
    <div class="card kpi"><a class="btn btn-ghost btn-sm" href="../trade.html">Trade</a><span style="display:block;margin-top:.45rem">Spot terminal</span></div>
  </div>
  <div class="table-wrap">
    <table class="data" style="min-width:520px">
      <thead><tr><th>Asset</th><th>Balance</th><th>Price</th><th>Value</th></tr></thead>
      <tbody id="walletBody"></tbody>
    </table>
  </div>
</main>
"""
(ROOT / "profile" / "wallet.html").write_text(page("Wallet", wallet, depth=1), encoding="utf-8")

deposit = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero"><h1>Deposit</h1><p>Clear commission and minimums. Simulate a credit to your demo wallet.</p></div>
  <div class="grid-2">
    <div class="card" style="padding:1.2rem">
      <div class="field"><label>Asset</label><select id="depositAsset"></select></div>
      <div class="field"><label>Network</label><select><option>Native / default</option><option>TRC20</option><option>ERC20</option><option>BEP20</option></select></div>
      <div class="field"><label>Amount</label><input id="depAmount" type="number" step="any" placeholder="0.00" /></div>
      <p class="muted">Commission: <strong id="depCommission">—</strong> · Min: <strong id="depMin">—</strong></p>
      <p class="mono" style="word-break:break-all">Address: <span id="depAddress">—</span></p>
      <button class="btn btn-primary" type="button" id="depSimulate">Simulate deposit credit</button>
    </div>
    <article class="card feature">
      <h3>Before you deposit</h3>
      <p>✓ Match network exactly<br/>✓ Check minimum amount<br/>✓ Wait for confirmations<br/>✓ Never share seed phrases</p>
      <p class="muted">Production systems should generate unique deposit addresses per user and network.</p>
    </article>
  </div>
</main>
"""
(ROOT / "profile" / "deposit.html").write_text(page("Deposit", deposit, depth=1), encoding="utf-8")

staking = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero"><h1>Staking</h1><p>Manage earn positions. Plans mirror the Earn catalogue.</p></div>
  <div class="grid-3" id="stakingGrid"></div>
  <p style="margin-top:1rem"><a class="btn btn-ghost" href="../earn.html">Back to Earn</a></p>
</main>
"""
(ROOT / "profile" / "staking.html").write_text(page("Staking", staking, depth=1), encoding="utf-8")

settings = """
<main class="container" style="padding-bottom:2rem">
  <div class="page-hero"><h1>Settings</h1><p>Account security and verification (demo).</p></div>
  <div class="grid-2">
    <article class="card feature">
      <h3>Profile</h3>
      <div id="settingsUser"></div>
    </article>
    <article class="card feature">
      <h3>Security</h3>
      <p>Two-factor authentication protects logins and withdrawals.</p>
      <button class="btn btn-soft btn-sm" type="button" id="enable2fa">Enable Google 2FA (demo)</button>
      <h3 style="margin-top:1.2rem">Verification (KYC)</h3>
      <p class="muted">Upload ID + liveness in production. Status: <span class="badge badge-amber">Unverified demo</span></p>
      <a class="btn btn-ghost btn-sm" href="../faq.html">KYC help</a>
    </article>
  </div>
</main>
"""
(ROOT / "profile" / "settings.html").write_text(page("Settings", settings, depth=1), encoding="utf-8")


def tool_page(title, inner):
    shell = f"""
<main class="container-wide" style="padding-bottom:2rem">
  <div class="tool-grid">
    <aside class="card side-nav">
      <a href="market-cap.html">Market Cap</a>
      <a href="screener.html">Market Screener</a>
      <a href="cross-rates.html">Cross Rates</a>
      <a href="heat-map.html">Heat Map</a>
      <a href="technical.html">Technical Analysis</a>
      <a href="../arbitrage.html">Arbitrage Scanner</a>
    </aside>
    <section>
      <div class="page-hero" style="padding-top:.4rem">
        <h1>{title}</h1>
      </div>
      {inner}
    </section>
  </div>
</main>
"""
    return page(title, shell, depth=1)


(ROOT / "tools" / "market-cap.html").write_text(
    tool_page(
        "Market Cap",
        """
<p class="muted">Illustrative rankings from live demo prices and volumes.</p>
<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Asset</th><th>Price</th><th>24h</th><th>Market cap*</th><th>Volume</th></tr></thead><tbody id="capBody"></tbody></table></div>
<p class="muted" style="font-size:.8rem">*Demo market cap is illustrative, not supply-accurate.</p>
""",
    ),
    encoding="utf-8",
)

(ROOT / "tools" / "screener.html").write_text(
    tool_page(
        "Market Screener",
        """
<p class="muted">Filter coins by change and volume thresholds.</p>
<div class="grid-2" style="margin-bottom:1rem">
  <div class="field"><label>Min 24h change %</label><input id="scrMinChange" type="number" value="-100" step="0.1" /></div>
  <div class="field"><label>Min volume (USD)</label><input id="scrMinVol" type="number" value="0" step="1000" /></div>
</div>
<div class="table-wrap"><table class="data" style="min-width:560px"><thead><tr><th>Symbol</th><th>Price</th><th>Change</th><th>Volume</th><th>Signal</th></tr></thead><tbody id="screenerBody"></tbody></table></div>
""",
    ),
    encoding="utf-8",
)

(ROOT / "tools" / "cross-rates.html").write_text(
    tool_page(
        "Cross Rates",
        """
<p class="muted">Cross conversion matrix using USDT-quoted demo mid prices.</p>
<div class="table-wrap"><table class="data" id="crossBody" style="min-width:480px"></table></div>
""",
    ),
    encoding="utf-8",
)

(ROOT / "tools" / "heat-map.html").write_text(
    tool_page(
        "Heat Map",
        """
<p class="muted">Color intensity scales with 24h percentage move.</p>
<div class="heat" id="heatMap"></div>
""",
    ),
    encoding="utf-8",
)

(ROOT / "tools" / "technical.html").write_text(
    tool_page(
        "Technical Analysis",
        """
<div class="grid-2" style="margin-bottom:1rem">
  <div class="field"><label>Asset</label><select id="techAsset"></select></div>
  <div class="kpi-row" style="margin:0">
    <div class="card kpi"><strong id="techPrice">—</strong><span>Last</span></div>
    <div class="card kpi"><strong id="techRsi">—</strong><span>RSI (approx)</span></div>
    <div class="card kpi"><strong id="techSignal">—</strong><span>Signal</span></div>
  </div>
</div>
<div class="chart-box" style="height:340px"><canvas id="techChart"></canvas></div>
<p class="muted" style="font-size:.82rem;margin-top:.6rem">Purple = price · Cyan = MA(10). Indicators are simplified for demo education.</p>
""",
    ),
    encoding="utf-8",
)

(ROOT / "README.txt").write_text(
    """WUNNAXSWAP — Crypto buy/sell + arbitrage platform (demo)
========================================================

Folder: Desktop/Wunnaxswap
Structurally inspired by yuklaswap.com but fully rebranded as Wunnaxswap
(unique violet/cyan identity — not a visual clone).

OPEN LOCALLY
------------
Double-click start-server.command
  or:  python3 -m http.server 5500
Then open http://localhost:5500/

PAGES INCLUDED
--------------
Home, Markets, Trade, Swap, Arbitrage, Earn, Fees, About, Contact, FAQ,
Sign in/up, Wallet, Deposit, Staking, Settings,
Tools: Market Cap, Screener, Cross Rates, Heat Map, Technical,
Terms, Privacy, Compliance.

INTERACTIVE NOW
---------------
Live simulated prices, markets filters/favorites, swap + demo wallet,
spot trade + chart/order book, arbitrage scanner, earn staking,
tools suite, auth, support chat, FAQ, listing form, lending waitlist.

FUTURE-READY
------------
Roadmap modules, waitlists, API-ready notes for fiat on-ramp, bridge,
launchpad, and optional arb bots.

NOTE
----
Frontend product demo only. Not real custody or regulated exchange activity.
""",
    encoding="utf-8",
)

cmd = ROOT / "start-server.command"
cmd.write_text(
    """#!/bin/bash
cd "$(dirname "$0")"
echo "Wunnaxswap → http://localhost:5500/"
python3 -m http.server 5500
""",
    encoding="utf-8",
)
os.chmod(cmd, 0o755)

# remove generator after run optional - keep for regenerate
htmls = list(ROOT.rglob("*.html"))
print("OK", ROOT)
print("HTML pages:", len(htmls))
for p in sorted(htmls):
    print(" -", p.relative_to(ROOT))
