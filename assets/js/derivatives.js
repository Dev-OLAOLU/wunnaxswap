/**
 * Wunnaxswap Derivatives Desk — multi-asset demo terminal + desk chat.
 */
(function () {
  "use strict";

  var STORAGE_POS = "wunnax_deriv_positions";
  var state = {
    classFilter: "all",
    symbol: "EURUSD",
    side: "long",
    lev: 10,
    tf: "15m",
  };

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
      { forex: "FX", index: "Indices", commodity: "Commodities", crypto: "Crypto" }[c] ||
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
      return JSON.parse(localStorage.getItem(STORAGE_POS) || "[]");
    } catch (_) {
      return [];
    }
  }

  function setPositions(arr) {
    localStorage.setItem(STORAGE_POS, JSON.stringify(arr || []));
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
        c.label +
        "</button>"
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
          '<div class="deriv-pulse-row"><span>' +
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
    var levRow = $("derivLevRow");
    if (levRow) {
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
      sub.textContent = state.side === "long" ? "Place long" : "Place short";
      sub.className =
        "btn " + (state.side === "long" ? "btn-primary" : "btn-ghost") + "";
      sub.style.width = "100%";
      if (state.side === "short") {
        sub.style.borderColor = "rgba(225,29,72,.45)";
        sub.style.color = "#be123c";
      } else {
        sub.style.borderColor = "";
        sub.style.color = "";
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

  function renderChart() {
    var canvas = $("derivChart");
    var d = current();
    if (!canvas || !d) return;
    try {
      if (window.WunnaChart) {
        var vol = d.class === "forex" ? 0.0012 : d.class === "index" ? 0.0025 : 0.004;
        if (!chartInstance) {
          chartInstance = new WunnaChart(canvas, {
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
    // Fallback sparkline
    try {
      var ctx = canvas.getContext("2d");
      var w = (canvas.width = (canvas.clientWidth || 300) * 2);
      var h = (canvas.height = (canvas.clientHeight || 180) * 2);
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = d.change >= 0 ? "#0d9f6e" : "#e11d48";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var i = 0; i < 40; i++) {
        var x = (i / 39) * w;
        var y = h * 0.5 - Math.sin(i / 4 + d.price) * h * 0.2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } catch (_) {}
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

  function placeOrder() {
    var d = current();
    if (!d) return;
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
      symbol: d.symbol,
      side: state.side,
      size: size,
      entry: entry,
      lev: state.lev,
      class: d.class,
      at: Date.now(),
    });
    setPositions(arr);
    renderPositions();
    if (window.Wunnax && Wunnax.toast) {
      Wunnax.toast(
        (state.side === "long" ? "Long " : "Short ") + d.symbol + " × " + size + " @ " + money(entry, entry < 2 ? 4 : 2)
      );
    }
    if ($("derivOrderSize")) $("derivOrderSize").value = "";
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
    if (/help|what|how|desk|derivative/.test(q)) {
      return {
        text:
          "This Derivatives Desk covers FX, indices, commodities, and crypto perps — not spot-only crypto. Pick a class tab, select a market, Long/Short with leverage, and use this chat for desk-style Q&A.",
        links: [
          { href: "trade.html", label: "Crypto spot/futures" },
          { href: "markets.html", label: "Markets" },
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

  function tickDerivs() {
    list().forEach(function (d) {
      var vol = d.price * (0.00015 + Math.random() * 0.0004);
      var dir = Math.random() > 0.5 ? 1 : -1;
      d.price = Math.max(d.tick || 0.0001, d.price + dir * vol);
      d.change = +(d.change + (Math.random() - 0.5) * 0.04).toFixed(2);
      d.high = Math.max(d.high, d.price);
      d.low = Math.min(d.low, d.price);
      if (typeof d.funding === "number") {
        d.funding = +(d.funding + (Math.random() - 0.5) * 0.001).toFixed(4);
      }
    });
    // Sync crypto perps with spot book when available
    try {
      if (WUNNA.ASSETS) {
        ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE"].forEach(function (sym) {
          var spot = (WUNNA.ASSETS || []).find(function (a) {
            return a.symbol === sym;
          });
          var perp = WUNNA.derivBySymbol(sym + "USDT");
          if (spot && perp) {
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
    if (Math.random() > 0.6) renderBook();
  }

  function boot() {
    if (!$("derivList")) return;

    // URL symbol
    try {
      var u = new URLSearchParams(location.search || "");
      var sym = (u.get("symbol") || u.get("pair") || "").toUpperCase().replace("/", "");
      if (sym && WUNNA.derivBySymbol(sym)) state.symbol = sym;
      var cls = (u.get("class") || "").toLowerCase();
      if (cls && ["forex", "index", "commodity", "crypto", "all"].indexOf(cls) >= 0) {
        state.classFilter = cls;
      }
    } catch (_) {}

    renderClassTabs();
    renderList();
    renderTicket();
    renderBook();
    renderChart();
    renderPositions();
    renderPulse();
    initChat();
    wireTicket();
    setInterval(tickDerivs, 2200);
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
