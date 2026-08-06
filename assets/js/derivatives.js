/**
 * Wunnaxswap Derivatives Desk — multi-asset demo terminal + desk chat.
 */
(function () {
  "use strict";

  var STORAGE_POS = "wunnax_deriv_positions";
  var STORAGE_OPTS = "wunnax_deriv_options";
  var state = {
    classFilter: "all",
    symbol: "EURUSD",
    side: "long",
    lev: 10,
    tf: "15m",
    tradeMode: "perp", // perp | options
    optionDir: "rise", // rise | fall
    optionSecs: 60,
    liveFeed: false,
  };

  function userKey() {
    try {
      var u = JSON.parse(localStorage.getItem("wunnax_user") || "null");
      if (u && u.email) return String(u.email).toLowerCase();
    } catch (_) {}
    try {
      if (window.firebase && firebase.auth && firebase.auth().currentUser) {
        return (firebase.auth().currentUser.email || firebase.auth().currentUser.uid || "").toLowerCase();
      }
    } catch (_) {}
    return "guest";
  }

  function isUserAuthed() {
    try {
      if (window.Wunnax && typeof Wunnax.isAuthed === "function") return !!Wunnax.isAuthed();
    } catch (_) {}
    try {
      if (localStorage.getItem("wunnax_session") === "1") return true;
    } catch (_) {}
    try {
      if (window.WunnaxBackend && WunnaxBackend.isAuthed && WunnaxBackend.isAuthed()) return true;
    } catch (_) {}
    try {
      if (window.firebase && firebase.auth && firebase.auth().currentUser) return true;
    } catch (_) {}
    return false;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function money(n, d) {
    d = d == null ? 2 : d;
    var x = Number(n);
    if (!isFinite(x)) return "—";
    return x.toLocaleString(undefined, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  function clsLabel(c) {
    return (
      {
        forex: "FX",
        index: "Indices",
        commodity: "Commodities",
        derived: "Derived",
        crypto: "Crypto",
      }[c] ||
      c ||
      "—"
    );
  }

  function list() {
    return (window.WUNNA && WUNNA.DERIVATIVES) || [];
  }

  function current() {
    return (
      (WUNNA.derivBySymbol && WUNNA.derivBySymbol(state.symbol)) ||
      list()[0] ||
      null
    );
  }

  function getPositions() {
    try {
      var all = JSON.parse(localStorage.getItem(STORAGE_POS) || "{}");
      // migrate old array format
      if (Array.isArray(all)) {
        var mig = { guest: all };
        localStorage.setItem(STORAGE_POS, JSON.stringify(mig));
        all = mig;
      }
      var key = userKey();
      return Array.isArray(all[key]) ? all[key] : [];
    } catch (_) {
      return [];
    }
  }

  function setPositions(arr) {
    try {
      var all = JSON.parse(localStorage.getItem(STORAGE_POS) || "{}");
      if (Array.isArray(all)) all = { guest: all };
      all[userKey()] = arr || [];
      localStorage.setItem(STORAGE_POS, JSON.stringify(all));
    } catch (_) {
      localStorage.setItem(STORAGE_POS, JSON.stringify({}));
    }
  }

  function getOptionsBook() {
    try {
      var all = JSON.parse(localStorage.getItem(STORAGE_OPTS) || "{}");
      var key = userKey();
      return Array.isArray(all[key]) ? all[key] : [];
    } catch (_) {
      return [];
    }
  }

  function setOptionsBook(arr) {
    try {
      var all = JSON.parse(localStorage.getItem(STORAGE_OPTS) || "{}");
      all[userKey()] = arr || [];
      localStorage.setItem(STORAGE_OPTS, JSON.stringify(all));
    } catch (_) {}
  }

  function filtered() {
    var q = (($("derivSearch") && $("derivSearch").value) || "").trim().toLowerCase();
    return list().filter(function (d) {
      if (state.classFilter !== "all" && d.class !== state.classFilter) return false;
      if (!q) return true;
      return (
        d.symbol.toLowerCase().indexOf(q) >= 0 ||
        d.name.toLowerCase().indexOf(q) >= 0 ||
        d.class.toLowerCase().indexOf(q) >= 0
      );
    });
  }

  function iconHtml(symbol, size) {
    if (window.WUNNA && typeof WUNNA.derivIconHtml === "function") {
      return WUNNA.derivIconHtml(symbol, size || 28);
    }
    var src =
      (window.WUNNA && WUNNA.derivIconUrl ? WUNNA.derivIconUrl(symbol) : "assets/img/deriv-icons/" + symbol + ".svg");
    return (
      '<img class="deriv-mkt-icon" src="' +
      src +
      '" width="' +
      (size || 28) +
      '" height="' +
      (size || 28) +
      '" alt="" loading="lazy" />'
    );
  }

  function classIconHtml(classId) {
    var src =
      window.WUNNA && WUNNA.derivClassIconUrl
        ? WUNNA.derivClassIconUrl(classId)
        : "assets/img/deriv-icons/class_" + classId + ".svg";
    return (
      '<img class="deriv-mkt-icon deriv-mkt-icon--tab" src="' +
      src +
      '" width="18" height="18" alt="" loading="lazy" />'
    );
  }

  function renderClassTabs() {
    var el = $("derivClassTabs");
    if (!el || !WUNNA.DERIV_CLASSES) return;
    el.innerHTML = WUNNA.DERIV_CLASSES.map(function (c) {
      return (
        '<button type="button" class="deriv-tab' +
        (c.id === state.classFilter ? " is-on" : "") +
        '" data-class="' +
        c.id +
        '">' +
        classIconHtml(c.id) +
        "<span>" +
        c.label +
        "</span></button>"
      );
    }).join("");
    el.querySelectorAll("[data-class]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.classFilter = btn.getAttribute("data-class") || "all";
        renderClassTabs();
        renderList();
      });
    });
  }

  function renderList() {
    var el = $("derivList");
    if (!el) return;
    var rows = filtered();
    if (!rows.length) {
      el.innerHTML = '<div class="muted" style="padding:.75rem">No markets match.</div>';
      return;
    }
    el.innerHTML = rows
      .map(function (d) {
        var up = d.change >= 0;
        return (
          '<button type="button" class="deriv-row' +
          (d.symbol === state.symbol ? " is-active" : "") +
          '" data-sym="' +
          d.symbol +
          '" role="option" aria-selected="' +
          (d.symbol === state.symbol) +
          '">' +
          iconHtml(d.symbol, 30) +
          '<span class="deriv-row-sym"><strong>' +
          d.symbol +
          '</strong><span class="muted">' +
          clsLabel(d.class) +
          "</span></span>" +
          '<span class="deriv-row-px mono">' +
          money(d.price, d.price < 2 ? 4 : 2) +
          '</span><span class="mono ' +
          (up ? "up" : "down") +
          '">' +
          (up ? "+" : "") +
          money(d.change, 2) +
          "%</span></button>"
        );
      })
      .join("");
    el.querySelectorAll("[data-sym]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.symbol = btn.getAttribute("data-sym");
        chartInstance = null;
        renderList();
        renderTicket();
        renderBook();
        renderChart();
        updateHeader();
      });
    });
  }

  function renderPulse() {
    var el = $("derivPulse");
    if (!el) return;
    var sample = list().slice(0, 6);
    el.innerHTML = sample
      .map(function (d) {
        var up = d.change >= 0;
        return (
          '<div class="deriv-pulse-row">' +
          iconHtml(d.symbol, 22) +
          "<span>" +
          d.symbol +
          '</span><span class="mono ' +
          (up ? "up" : "down") +
          '">' +
          (up ? "+" : "") +
          money(d.change, 2) +
          "%</span></div>"
        );
      })
      .join("");
  }

  function updateHeader() {
    var d = current();
    if (!d) return;
    var logo = $("derivMarketIcon");
    if (logo) {
      logo.src = window.WUNNA && WUNNA.derivIconUrl ? WUNNA.derivIconUrl(d.symbol) : "assets/img/deriv-icons/" + d.symbol + ".svg";
      logo.alt = d.symbol;
      logo.hidden = false;
    }
    if ($("derivSymbol")) $("derivSymbol").textContent = d.symbol;
    if ($("derivName")) $("derivName").textContent = d.name;
    if ($("derivProduct")) $("derivProduct").textContent = d.product || "PERP";
    if ($("derivClassBadge")) $("derivClassBadge").textContent = clsLabel(d.class);
    if ($("derivPrice")) $("derivPrice").textContent = money(d.price, d.price < 2 ? 4 : 2);
    if ($("derivChange")) {
      var up = d.change >= 0;
      $("derivChange").textContent = (up ? "+" : "") + money(d.change, 2) + "%";
      $("derivChange").className = "mono " + (up ? "up" : "down");
    }
    if ($("derivFunding")) {
      $("derivFunding").textContent = "Funding " + money(d.funding, 3) + "%";
    }
    if ($("derivStats")) {
      $("derivStats").innerHTML =
        "<span>24h High <b class=\"mono\">" +
        money(d.high, d.price < 2 ? 4 : 2) +
        "</b></span>" +
        "<span>24h Low <b class=\"mono\">" +
        money(d.low, d.price < 2 ? 4 : 2) +
        "</b></span>" +
        "<span>Session <b>" +
        (d.session || "—") +
        "</b></span>" +
        "<span>Max lev <b>" +
        d.leverageMax +
        "x</b></span>";
    }
    if ($("derivSizeLabel")) {
      $("derivSizeLabel").textContent = "Size (" + (d.unit || "contracts") + ")";
    }
    if ($("derivHint")) {
      $("derivHint").textContent =
        "Paper margin · " + clsLabel(d.class) + " · max " + d.leverageMax + "x · demo only";
    }
  }

  function renderTicket() {
    var d = current();
    if (!d) return;
    var isOpt = state.tradeMode === "options" || d.class === "derived" || d.product === "OPTIONS";
    var perpBlock = $("derivPerpControls");
    var optBlock = $("derivOptionsPanel");
    if (perpBlock) perpBlock.hidden = !!isOpt && state.tradeMode === "options";
    if (optBlock) optBlock.hidden = !isOpt || (state.tradeMode === "perp" && d.class !== "derived");

    // When market is Derived, prefer options UI
    if (d.class === "derived" && state.tradeMode === "perp") {
      // keep perp mode allowed but show both hints
    }

    var levRow = $("derivLevRow");
    if (levRow && !isOpt) {
      var levs = [2, 5, 10, 25, 50, 100].filter(function (x) {
        return x <= (d.leverageMax || 50);
      });
      if (levs.indexOf(state.lev) < 0) state.lev = levs[Math.min(2, levs.length - 1)] || 10;
      levRow.innerHTML = levs
        .map(function (l) {
          return (
            '<button type="button" class="lev-btn' +
            (l === state.lev ? " active" : "") +
            '" data-lev="' +
            l +
            '">' +
            l +
            "x</button>"
          );
        })
        .join("");
      levRow.querySelectorAll("[data-lev]").forEach(function (b) {
        b.addEventListener("click", function () {
          state.lev = Number(b.getAttribute("data-lev")) || 10;
          renderTicket();
        });
      });
    }
    var longB = $("derivLong");
    var shortB = $("derivShort");
    if (longB && shortB) {
      longB.classList.toggle("active", state.side === "long");
      shortB.classList.toggle("active", state.side === "short");
    }
    var sub = $("derivSubmit");
    if (sub) {
      if (!isUserAuthed()) {
        sub.textContent = "Sign in to trade";
        sub.className = "btn btn-primary";
        sub.style.width = "100%";
        sub.style.borderColor = "";
        sub.style.color = "";
      } else if (state.tradeMode === "options" || d.class === "derived") {
        sub.textContent =
          "Buy " + (state.optionDir === "rise" ? "Rise" : "Fall") + " · " + (state.optionSecs || 60) + "s";
        sub.className = "btn btn-primary";
        sub.style.width = "100%";
        sub.style.borderColor = "";
        sub.style.color = "";
      } else {
        sub.textContent = state.side === "long" ? "Place long" : "Place short";
        sub.className = "btn " + (state.side === "long" ? "btn-primary" : "btn-ghost");
        sub.style.width = "100%";
        if (state.side === "short") {
          sub.style.borderColor = "rgba(225,29,72,.45)";
          sub.style.color = "#be123c";
        } else {
          sub.style.borderColor = "";
          sub.style.color = "";
        }
      }
    }
    if ($("derivSizeLabel")) {
      if (state.tradeMode === "options" || d.class === "derived") {
        $("derivSizeLabel").textContent = "Stake (USD)";
      } else {
        $("derivSizeLabel").textContent = "Size (" + (d.unit || "contracts") + ")";
      }
    }
    updateHeader();
  }

  function renderBook() {
    var d = current();
    if (!d) return;
    var mid = d.price;
    var tick = d.tick || 0.01;
    function rows(side) {
      var html = "";
      for (var i = 1; i <= 8; i++) {
        var px = side === "bid" ? mid - i * tick * (1 + Math.random()) : mid + i * tick * (1 + Math.random());
        var sz = (Math.random() * 12 + 0.5).toFixed(2);
        html +=
          '<div class="ob-row ' +
          side +
          '"><span class="mono">' +
          money(px, mid < 2 ? 4 : 2) +
          '</span><span class="mono">' +
          sz +
          "</span><span class=\"mono muted\">" +
          money(px * Number(sz), 0) +
          "</span></div>";
      }
      return html;
    }
    if ($("derivBids")) $("derivBids").innerHTML = rows("bid");
    if ($("derivAsks")) $("derivAsks").innerHTML = rows("ask");
  }

  var chartInstance = null;
  var chartSymbol = null;
  var chartTf = null;

  function renderChart() {
    var host = $("derivChart");
    var d = current();
    if (!host || !d) return;
    var vol = d.class === "forex" ? 0.0012 : d.class === "index" ? 0.0025 : 0.004;
    try {
      if (window.WunnaxTvChart) {
        if (!chartInstance) {
          chartInstance = WunnaxTvChart.mount(host, {
            symbol: d.symbol,
            interval: state.tf || "15m",
            height: 400,
            price: d.price,
            volatility: vol,
          });
          chartSymbol = d.symbol;
          chartTf = state.tf;
          return;
        }
        if (chartSymbol !== d.symbol) {
          chartSymbol = d.symbol;
          if (chartInstance.setSymbol) chartInstance.setSymbol(d.symbol, d.price);
        } else if (chartTf !== state.tf) {
          chartTf = state.tf;
          if (chartInstance.setTimeframe) chartInstance.setTimeframe(state.tf);
        } else if (chartInstance.isTv && !chartInstance.isTv() && chartInstance.setPrice) {
          chartInstance.setPrice(d.price);
        }
        return;
      }
      if (window.WunnaChart && host.tagName === "CANVAS") {
        if (!chartInstance) {
          chartInstance = new WunnaChart(host, {
            price: d.price,
            volatility: vol,
            count: 90,
          });
        } else {
          if (chartInstance.setPrice) chartInstance.setPrice(d.price);
          if (chartInstance.setTimeframe) chartInstance.setTimeframe(state.tf);
          if (chartInstance.draw) chartInstance.draw();
        }
        return;
      }
    } catch (e) {
      console.warn("[deriv] chart", e);
    }
  }

  function renderPositions() {
    var body = $("derivPositionsBody");
    if (!body) return;
    var pos = getPositions();
    if (!pos.length) {
      body.innerHTML = '<tr><td colspan="8" class="muted">No open positions yet.</td></tr>';
      return;
    }
    body.innerHTML = pos
      .map(function (p, idx) {
        var m = WUNNA.derivBySymbol(p.symbol);
        var mark = m ? m.price : p.entry;
        var dir = p.side === "long" ? 1 : -1;
        var pnl = ((mark - p.entry) / p.entry) * p.size * p.entry * dir;
        var up = pnl >= 0;
        return (
          "<tr><td><strong>" +
          p.symbol +
          "</strong></td><td class=\"" +
          (p.side === "long" ? "up" : "down") +
          '">' +
          p.side.toUpperCase() +
          '</td><td class="mono">' +
          money(p.size, 3) +
          '</td><td class="mono">' +
          money(p.entry, p.entry < 2 ? 4 : 2) +
          '</td><td class="mono">' +
          money(mark, mark < 2 ? 4 : 2) +
          '</td><td class="mono">' +
          p.lev +
          'x</td><td class="mono ' +
          (up ? "up" : "down") +
          '">' +
          (up ? "+" : "") +
          money(pnl, 2) +
          '</td><td><button type="button" class="btn btn-ghost btn-sm" data-close="' +
          idx +
          '">Close</button></td></tr>'
        );
      })
      .join("");
    body.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () {
        var i = Number(b.getAttribute("data-close"));
        var arr = getPositions();
        arr.splice(i, 1);
        setPositions(arr);
        renderPositions();
        if (window.Wunnax && Wunnax.toast) Wunnax.toast("Position closed (demo)");
      });
    });
  }

  function requireLoginToast() {
    if (window.Wunnax && Wunnax.toast) {
      Wunnax.toast("Sign in to trade derivatives on your account");
    } else {
      alert("Sign in to trade derivatives on your account");
    }
    setTimeout(function () {
      location.href = "signin.html?next=" + encodeURIComponent(location.pathname + location.search);
    }, 700);
  }

  function placeOrder() {
    if (!isUserAuthed()) {
      requireLoginToast();
      return;
    }
    var d = current();
    if (!d) return;

    // Options (Rise/Fall) — Deriv-style duration contracts, paper settled from live/demo ticks
    if (state.tradeMode === "options" || d.class === "derived" || d.product === "OPTIONS") {
      placeOptionContract(d);
      return;
    }

    var size = Number(($("derivOrderSize") && $("derivOrderSize").value) || 0);
    var type = ($("derivOrderType") && $("derivOrderType").value) || "market";
    var limitPx = Number(($("derivOrderPrice") && $("derivOrderPrice").value) || 0);
    if (!isFinite(size) || size <= 0) {
      if (window.Wunnax && Wunnax.toast) Wunnax.toast("Enter a valid size");
      else alert("Enter a valid size");
      return;
    }
    var entry = type === "limit" && limitPx > 0 ? limitPx : d.price;
    var arr = getPositions();
    arr.unshift({
      id: "d" + Date.now(),
      user: userKey(),
      symbol: d.symbol,
      side: state.side,
      size: size,
      entry: entry,
      lev: state.lev,
      class: d.class,
      liveEntry: !!(window.WunnaxDerivApi && WunnaxDerivApi.isLive(d.symbol)),
      at: Date.now(),
    });
    setPositions(arr);
    renderPositions();
    if (window.Wunnax && Wunnax.toast) {
      Wunnax.toast(
        (state.side === "long" ? "Long " : "Short ") +
          d.symbol +
          " × " +
          size +
          " @ " +
          money(entry, entry < 2 ? 4 : 2) +
          " · saved to " +
          userKey()
      );
    }
    if ($("derivOrderSize")) $("derivOrderSize").value = "";
  }

  function placeOptionContract(d) {
    var stake = Number(($("derivOrderSize") && $("derivOrderSize").value) || 0);
    if (!isFinite(stake) || stake < 1) {
      if (window.Wunnax && Wunnax.toast) Wunnax.toast("Options stake minimum is 1");
      return;
    }
    var entry = d.price;
    var secs = state.optionSecs || 60;
    var dir = state.optionDir || "rise";
    var book = getOptionsBook();
    var contract = {
      id: "opt" + Date.now(),
      user: userKey(),
      symbol: d.symbol,
      dir: dir,
      stake: stake,
      entry: entry,
      payout: stake * 1.85, // demo fixed payout multiplier (illustrative)
      opensAt: Date.now(),
      expiresAt: Date.now() + secs * 1000,
      status: "open",
      result: null,
      live: !!(window.WunnaxDerivApi && WunnaxDerivApi.isLive(d.symbol)),
    };
    book.unshift(contract);
    setOptionsBook(book);
    renderOptions();
    if (window.Wunnax && Wunnax.toast) {
      Wunnax.toast(
        (dir === "rise" ? "Rise" : "Fall") +
          " " +
          d.symbol +
          " · stake " +
          money(stake, 2) +
          " · " +
          secs +
          "s"
      );
    }
    if ($("derivOrderSize")) $("derivOrderSize").value = "";
    // Settle when duration ends
    setTimeout(function () {
      settleOption(contract.id);
    }, secs * 1000 + 50);
  }

  function settleOption(id) {
    var book = getOptionsBook();
    var i = book.findIndex(function (c) {
      return c.id === id;
    });
    if (i < 0) return;
    var c = book[i];
    if (c.status !== "open") return;
    var m = WUNNA.derivBySymbol(c.symbol);
    var exit = m ? m.price : c.entry;
    var won =
      (c.dir === "rise" && exit > c.entry) || (c.dir === "fall" && exit < c.entry);
    c.status = "settled";
    c.result = won ? "won" : exit === c.entry ? "tie" : "lost";
    c.exit = exit;
    c.pnl = won ? c.payout - c.stake : c.result === "tie" ? 0 : -c.stake;
    book[i] = c;
    setOptionsBook(book);
    renderOptions();
    if (window.Wunnax && Wunnax.toast) {
      Wunnax.toast(
        c.symbol +
          " option " +
          c.result.toUpperCase() +
          (c.pnl >= 0 ? " +" : " ") +
          money(c.pnl, 2)
      );
    }
  }

  function renderOptions() {
    var body = $("derivOptionsBody");
    if (!body) return;
    // settle any expired still open
    getOptionsBook().forEach(function (c) {
      if (c.status === "open" && Date.now() >= c.expiresAt) settleOption(c.id);
    });
    var book = getOptionsBook();
    if (!book.length) {
      body.innerHTML =
        '<tr><td colspan="8" class="muted">No options contracts yet. Switch to Options mode or pick a Derived market.</td></tr>';
      return;
    }
    body.innerHTML = book
      .slice(0, 40)
      .map(function (c) {
        var left = Math.max(0, Math.ceil((c.expiresAt - Date.now()) / 1000));
        return (
          "<tr><td><strong>" +
          c.symbol +
          "</strong></td><td>" +
          (c.dir || "").toUpperCase() +
          '</td><td class="mono">' +
          money(c.stake, 2) +
          '</td><td class="mono">' +
          money(c.entry, c.entry < 2 ? 4 : 2) +
          '</td><td class="mono">' +
          (c.exit != null ? money(c.exit, c.exit < 2 ? 4 : 2) : "—") +
          "</td><td>" +
          (c.status === "open" ? left + "s" : c.status) +
          '</td><td class="mono ' +
          (c.pnl > 0 ? "up" : c.pnl < 0 ? "down" : "") +
          '">' +
          (c.pnl != null ? (c.pnl >= 0 ? "+" : "") + money(c.pnl, 2) : "—") +
          "</td><td>" +
          (c.live ? "Live" : "Sim") +
          "</td></tr>"
        );
      })
      .join("");
  }

  /* ---------------- Derivatives Chat ---------------- */

  function derivReply(q) {
    q = String(q || "").toLowerCase();
    var d = current();
    var p = d ? d.symbol : "EURUSD";

    if (/gold|xau|silver|xag|metal/.test(q)) {
      return {
        text:
          "Metals desk: Gold (XAUUSD) and Silver (XAGUSD) trade as USDT-quoted perps here. Watch USD strength and real yields — stronger USD often pressures metals. Max lev is capped for commodities. This is paper trading only.",
        links: [{ href: "derivatives.html?symbol=XAUUSD", label: "Trade Gold" }],
      };
    }
    if (/oil|wti|brent|crude|energy|natgas|gas/.test(q)) {
      return {
        text:
          "Energy desk: WTI / Brent / NatGas are demo perpetual contracts. Oil often moves on inventory prints and geopolitics. Use smaller size — these markets can gap. Not financial advice.",
        links: [{ href: "derivatives.html?symbol=WTI", label: "Trade WTI" }],
      };
    }
    if (/nasdaq|nas100|s&p|spx|us500|dow|us30|dax|ger40|ftse|nikkei|index/.test(q)) {
      return {
        text:
          "Index desk: US500, NAS100, US30, GER40, UK100, JP225 are equity-index perps. Sessions are near-24h in this demo. Long = bullish beta, Short = hedge/risk-off. Funding is simulated.",
        links: [{ href: "derivatives.html?symbol=NAS100", label: "Trade Nasdaq" }],
      };
    }
    if (/eur|gbp|jpy|fx|forex|cable|yen|dollar|pair/.test(q)) {
      return {
        text:
          "FX desk: majors like EURUSD, GBPUSD, USDJPY run Mon–Fri in real markets (24/5). Here they’re perpetual contracts with leverage. Focus on spreads, session (London/NY overlap), and risk per trade.",
        links: [{ href: "derivatives.html?symbol=EURUSD", label: "Trade EURUSD" }],
      };
    }
    if (/btc|eth|crypto|perp|funding|leverage|long|short|margin/.test(q)) {
      return {
        text:
          "Crypto perps: BTCUSDT / ETHUSDT etc. use funding (demo %) and high max leverage. Same Long/Short ticket as FX and indices — pick class “Crypto perps”. Manage liquidation risk; this is simulated margin.",
        links: [{ href: "derivatives.html?symbol=BTCUSDT", label: "Trade BTC perp" }],
      };
    }
    if (/risk|liquidat|stop|size|lot|contract/.test(q)) {
      return {
        text:
          "Risk tips (demo): size positions so a 1–2% account move is acceptable; lower leverage on news; set mental stops. Unit labels (lots / contracts / oz) change by market. No real liquidations here.",
      };
    }
    if (/deriv\.com|options dashboard|volatility|r_10|r_50|boom|crash|synthetic/.test(q)) {
      return {
        text:
          "We stream public market data from Deriv’s API (active symbols + ticks). Derived markets like R_10 / R_50 / Boom & Crash map to Deriv Options underlyings. Paper Rise/Fall contracts settle here; real-money options stay on home.deriv.com/dashboard/options.",
        links: [
          { href: "https://home.deriv.com/dashboard/options", label: "Deriv Options dashboard" },
          { href: "derivatives.html?class=derived&mode=options", label: "Derived markets" },
        ],
      };
    }
    if (/help|what|how|desk|derivative/.test(q)) {
      return {
        text:
          "Derivatives Desk: FX, indices, commodities, crypto perps, and Deriv-style derived indices. Sign in to save perps & options to your user. Live ticks when the Deriv WebSocket connects.",
        links: [
          { href: "https://home.deriv.com/dashboard/options", label: "Deriv Options" },
          { href: "signin.html?next=derivatives.html", label: "Sign in" },
        ],
      };
    }
    return {
      text:
        "You're on the multi-asset derivatives desk. Current focus: " +
        p +
        (d ? " (" + d.name + ", " + clsLabel(d.class) + ")" : "") +
        ". Ask about FX, indices, gold/oil, crypto perps, leverage, or funding — or try a quick chip below.",
      links: [{ href: "derivatives.html?symbol=" + p, label: "Focus " + p }],
    };
  }

  function initChat() {
    var msgs = $("derivChatMsgs");
    var input = $("derivChatInput");
    var sendBtn = $("derivChatSend");
    var quick = $("derivChatQuick");
    if (!msgs || !input) return;

    function add(role, text, links) {
      var row = document.createElement("div");
      row.className = "deriv-chat-msg deriv-chat-msg--" + role;
      var linkHtml = "";
      if (links && links.length) {
        linkHtml =
          '<div class="wx-msg-links">' +
          links
            .map(function (l) {
              return '<a href="' + l.href + '">' + l.label + "</a>";
            })
            .join("") +
          "</div>";
      }
      row.innerHTML =
        '<div class="deriv-chat-bubble">' +
        String(text || "").replace(/\n/g, "<br>") +
        linkHtml +
        "</div>";
      msgs.appendChild(row);
      msgs.scrollTop = msgs.scrollHeight;
    }

    add(
      "bot",
      "Derivatives desk online. Trade FX, indices, commodities, and crypto perps — ask me about gold, EURUSD, Nasdaq, oil, or BTC funding."
    );

    if (quick) {
      var chips = ["Explain EURUSD", "Gold outlook", "Nasdaq leverage", "Oil risk", "BTC funding"];
      quick.innerHTML = chips
        .map(function (c) {
          return '<button type="button" class="deriv-chip" data-q="' + c + '">' + c + "</button>";
        })
        .join("");
      quick.querySelectorAll("[data-q]").forEach(function (b) {
        b.addEventListener("click", function () {
          input.value = b.getAttribute("data-q") || "";
          send();
        });
      });
    }

    function send() {
      var text = (input.value || "").trim();
      if (!text) return;
      add("user", text);
      input.value = "";
      setTimeout(function () {
        var ans = derivReply(text);
        add("bot", ans.text, ans.links || []);
      }, 280 + Math.random() * 280);
    }

    if (sendBtn) sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        send();
      }
    });

    var openBtn = $("openDerivChat");
    if (openBtn) {
      openBtn.addEventListener("click", function () {
        var card = $("derivChatCard");
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          input.focus();
        }
      });
    }
  }

  function wireTicket() {
    var longB = $("derivLong");
    var shortB = $("derivShort");
    if (longB) {
      longB.addEventListener("click", function () {
        state.side = "long";
        renderTicket();
      });
    }
    if (shortB) {
      shortB.addEventListener("click", function () {
        state.side = "short";
        renderTicket();
      });
    }
    if ($("derivSubmit")) $("derivSubmit").addEventListener("click", placeOrder);
    if ($("derivSearch")) {
      $("derivSearch").addEventListener("input", function () {
        renderList();
      });
    }
    if ($("derivTfGroup")) {
      $("derivTfGroup").querySelectorAll("[data-tf]").forEach(function (b) {
        b.addEventListener("click", function () {
          state.tf = b.getAttribute("data-tf") || "15m";
          $("derivTfGroup").querySelectorAll("[data-tf]").forEach(function (x) {
            x.classList.toggle("active", x === b);
          });
          renderChart();
        });
      });
    }
  }

  function applyLiveTick(sym, quote) {
    var d = WUNNA.derivBySymbol(sym);
    if (!d || !isFinite(quote)) return;
    var prev = d.price;
    d.price = quote;
    if (prev > 0) {
      var ch = ((quote - prev) / prev) * 100;
      d.change = +((d.change || 0) * 0.85 + ch * 0.15).toFixed(3);
    }
    d.high = Math.max(d.high || quote, quote);
    d.low = Math.min(d.low || quote, quote);
  }

  function tickDerivs() {
    list().forEach(function (d) {
      // Skip sim tick when Deriv live feed is fresh for this symbol
      if (window.WunnaxDerivApi && WunnaxDerivApi.isLive(d.symbol)) return;
      var vol = d.price * (0.00015 + Math.random() * 0.0004);
      var dir = Math.random() > 0.5 ? 1 : -1;
      d.price = Math.max(d.tick || 0.0001, d.price + dir * vol);
      d.change = +(d.change + (Math.random() - 0.5) * 0.04).toFixed(2);
      d.high = Math.max(d.high, d.price);
      d.low = Math.min(d.low, d.price);
      if (typeof d.funding === "number" && d.product !== "OPTIONS") {
        d.funding = +(d.funding + (Math.random() - 0.5) * 0.001).toFixed(4);
      }
    });
    try {
      if (WUNNA.ASSETS) {
        ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE"].forEach(function (sym) {
          var spot = (WUNNA.ASSETS || []).find(function (a) {
            return a.symbol === sym;
          });
          var perp = WUNNA.derivBySymbol(sym + "USDT");
          if (spot && perp && !(window.WunnaxDerivApi && WunnaxDerivApi.isLive(sym + "USDT"))) {
            perp.price = spot.price;
            perp.change = spot.change;
            perp.high = spot.high;
            perp.low = spot.low;
          }
        });
      }
    } catch (_) {}
    updateHeader();
    renderPulse();
    renderPositions();
    renderOptions();
    updateFeedStatus();
    updateUserBar();
    if (Math.random() > 0.6) renderBook();
  }

  function updateFeedStatus() {
    var el = $("derivFeedStatus");
    if (!el) return;
    var st = window.WunnaxDerivApi ? WunnaxDerivApi.getStatus() : { connected: false };
    if (st.connected) {
      el.innerHTML =
        '<span class="deriv-feed-dot is-live"></span> Live ticks via Deriv API · ' +
        (st.liveCount || 0) +
        " markets · <a href=\"https://home.deriv.com/dashboard/options\" target=\"_blank\" rel=\"noopener\">Options dashboard</a>";
      el.className = "deriv-feed-status is-live";
      state.liveFeed = true;
    } else {
      el.innerHTML =
        '<span class="deriv-feed-dot"></span> Connecting to Deriv… prices simulated until feed is live · <a href="https://home.deriv.com/dashboard/options" target="_blank" rel="noopener">home.deriv.com/options</a>';
      el.className = "deriv-feed-status";
      state.liveFeed = false;
    }
  }

  function updateUserBar() {
    var el = $("derivUserBar");
    if (!el) return;
    if (isUserAuthed()) {
      el.innerHTML =
        '<span class="up">Signed in</span> as <strong>' +
        userKey() +
        "</strong> — positions &amp; options are saved to your account on this device. " +
        '<a href="https://home.deriv.com/dashboard/options" target="_blank" rel="noopener">Open Deriv Options</a>';
    } else {
      el.innerHTML =
        '<span class="down">Guest mode</span> — browse live/sim markets free. <a href="signin.html?next=derivatives.html"><strong>Sign in</strong></a> to place perps &amp; options on your user book.';
    }
    // Gate ticket button label
    var sub = $("derivSubmit");
    if (sub && !isUserAuthed()) {
      sub.textContent = "Sign in to trade";
    }
  }

  function wireTradeMode() {
    var wrap = $("derivTradeMode");
    if (!wrap) return;
    wrap.querySelectorAll("[data-tmode]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.tradeMode = b.getAttribute("data-tmode") || "perp";
        wrap.querySelectorAll("[data-tmode]").forEach(function (x) {
          x.classList.toggle("active", x === b);
        });
        renderTicket();
        var optsPanel = $("derivOptionsPanel");
        if (optsPanel) {
          optsPanel.hidden = state.tradeMode !== "options";
        }
      });
    });
    var rise = $("optRise");
    var fall = $("optFall");
    if (rise) {
      rise.addEventListener("click", function () {
        state.optionDir = "rise";
        rise.classList.add("active");
        if (fall) fall.classList.remove("active");
      });
    }
    if (fall) {
      fall.addEventListener("click", function () {
        state.optionDir = "fall";
        fall.classList.add("active");
        if (rise) rise.classList.remove("active");
      });
    }
    var dur = $("optDuration");
    if (dur) {
      dur.addEventListener("change", function () {
        state.optionSecs = Number(dur.value) || 60;
      });
    }
  }

  function connectDerivFeed() {
    if (!window.WunnaxDerivApi) return;
    WunnaxDerivApi.onStatus(function () {
      updateFeedStatus();
    });
    WunnaxDerivApi.onTick(function (t) {
      applyLiveTick(t.symbol, t.quote);
      if (t.symbol === state.symbol) {
        updateHeader();
        // TV charts stream real market data; only push ticks into canvas fallback
        if (chartInstance && chartInstance.setPrice) {
          try {
            if (chartInstance.isTv && chartInstance.isTv()) {
              /* TradingView handles live updates */
            } else {
              chartInstance.setPrice(t.quote);
              if (chartInstance.draw) chartInstance.draw();
            }
          } catch (_) {}
        }
      }
      renderPulse();
      renderList();
    });
    WunnaxDerivApi.connect();
    // Subscribe all mapped symbols
    WunnaxDerivApi.getMappedSymbols().forEach(function (s) {
      WunnaxDerivApi.subscribeTick(s);
    });
  }

  function boot() {
    if (!$("derivList")) return;

    // URL symbol
    try {
      var u = new URLSearchParams(location.search || "");
      var sym = (u.get("symbol") || u.get("pair") || "").toUpperCase().replace("/", "");
      if (sym && WUNNA.derivBySymbol(sym)) state.symbol = sym;
      var cls = (u.get("class") || "").toLowerCase();
      if (cls && ["forex", "index", "commodity", "crypto", "derived", "all"].indexOf(cls) >= 0) {
        state.classFilter = cls;
      }
      if ((u.get("mode") || "").toLowerCase() === "options") state.tradeMode = "options";
    } catch (_) {}

    renderClassTabs();
    renderList();
    renderTicket();
    renderBook();
    renderChart();
    renderPositions();
    renderOptions();
    renderPulse();
    initChat();
    wireTicket();
    wireTradeMode();
    updateUserBar();
    updateFeedStatus();
    connectDerivFeed();

    // Default options panel visibility
    var optsPanel = $("derivOptionsPanel");
    if (optsPanel) optsPanel.hidden = state.tradeMode !== "options";
    var wrap = $("derivTradeMode");
    if (wrap) {
      wrap.querySelectorAll("[data-tmode]").forEach(function (x) {
        x.classList.toggle("active", x.getAttribute("data-tmode") === state.tradeMode);
      });
    }

    setInterval(tickDerivs, 2200);
    setInterval(renderOptions, 1000);
    window.addEventListener("resize", function () {
      renderChart();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
