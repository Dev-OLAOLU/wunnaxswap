/**
 * Arbitrage-themed widget on the login showcase.
 * Shows multi-venue spread routes (buy venue → sell venue) — core product story.
 */
(function () {
  "use strict";

  // Simulated multi-exchange arb routes
  var routes = [
    { coin: "BTC", buy: "Binance", sell: "OKX", buyPx: 65020, sellPx: 65180, net: 0.18 },
    { coin: "ETH", buy: "Kraken", sell: "Coinbase", buyPx: 1942.1, sellPx: 1949.6, net: 0.24 },
    { coin: "SOL", buy: "Gate.io", sell: "Binance", buyPx: 75.9, sellPx: 76.45, net: 0.31 },
    { coin: "XRP", buy: "Bitget", sell: "KuCoin", buyPx: 1.094, sellPx: 1.102, net: 0.22 },
    { coin: "BNB", buy: "OKX", sell: "Bybit", buyPx: 570.2, sellPx: 572.8, net: 0.15 },
    { coin: "DOGE", buy: "HTX", sell: "Binance", buyPx: 0.0718, sellPx: 0.0726, net: 0.41 },
  ];

  function money(n) {
    if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (n >= 10) return n.toFixed(2);
    if (n >= 1) return n.toFixed(3);
    return n.toFixed(4);
  }

  function renderTicks() {
    var el = document.getElementById("loginWidgetTicks");
    if (!el) return;
    el.innerHTML = routes
      .map(function (r) {
        return (
          '<div class="dmw-tick dmw-tick--arb">' +
          '<span class="dmw-arb-coin"><strong>' +
          r.coin +
          '</strong><span class="dmw-arb-route">' +
          r.buy +
          " → " +
          r.sell +
          "</span></span>" +
          '<span class="mono dmw-arb-spread up">+' +
          r.net.toFixed(2) +
          "%</span>" +
          '<span class="mono muted dmw-arb-px">' +
          money(r.buyPx) +
          " / " +
          money(r.sellPx) +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function drawSpark() {
    var canvas = document.getElementById("loginSpark");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 320;
    var h = canvas.clientHeight || 100;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (var g = 1; g < 4; g++) {
      var gy = (h / 4) * g;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    // Two lines: buy venue (lower) vs sell venue (higher) — visual “spread”
    function path(base, amp, color, fill) {
      var pts = [];
      var p = base;
      for (var i = 0; i < 48; i++) {
        p *= 1 + (Math.random() - 0.48) * amp;
        pts.push(p);
      }
      var min = Math.min.apply(null, pts) * 0.998;
      var max = Math.max.apply(null, pts) * 1.002;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach(function (v, i) {
        var x = (i / (pts.length - 1)) * w;
        var y = h - ((v - min) / (max - min || 1)) * (h - 20) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      if (fill) {
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        var gr = ctx.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "rgba(52,211,153,0.2)");
        gr.addColorStop(1, "rgba(52,211,153,0)");
        ctx.fillStyle = gr;
        ctx.fill();
      }
      return pts;
    }

    path(100, 0.012, "rgba(167,190,255,0.85)", false); // buy (cooler)
    path(101.2, 0.012, "#6ee7b7", true); // sell (green spread)

    // label chips
    ctx.font = "600 10px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(167,190,255,0.9)";
    ctx.fillText("Buy venue", 8, 14);
    ctx.fillStyle = "rgba(110,231,183,0.95)";
    ctx.fillText("Sell venue", 72, 14);
  }

  function tick() {
    routes.forEach(function (r) {
      var mid = (r.buyPx + r.sellPx) / 2;
      var vol = mid * (0.00015 + Math.random() * 0.0004);
      r.buyPx = Math.max(0.00001, r.buyPx + (Math.random() - 0.52) * vol);
      r.sellPx = Math.max(r.buyPx * 1.0005, r.sellPx + (Math.random() - 0.48) * vol);
      r.net = +(((r.sellPx - r.buyPx) / r.buyPx) * 100).toFixed(2);
      if (r.net < 0.05) {
        r.sellPx = r.buyPx * (1.001 + Math.random() * 0.004);
        r.net = +(((r.sellPx - r.buyPx) / r.buyPx) * 100).toFixed(2);
      }
    });
    // Keep strongest opportunities on top
    routes.sort(function (a, b) {
      return b.net - a.net;
    });
    renderTicks();
  }

  function wireAsk() {
    var fab = document.getElementById("derivAskFab");
    var panel = document.getElementById("derivAskPanel");
    var close = document.getElementById("derivAskClose");
    if (!fab || !panel) return;
    fab.addEventListener("click", function () {
      var open = !panel.hidden;
      panel.hidden = open;
      if (!open) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
    if (close) {
      close.addEventListener("click", function () {
        panel.hidden = true;
        panel.setAttribute("hidden", "");
      });
    }
  }

  function boot() {
    if (!document.getElementById("loginMarketWidget")) return;
    renderTicks();
    drawSpark();
    wireAsk();
    setInterval(tick, 2000);
    setInterval(drawSpark, 4500);
    window.addEventListener("resize", drawSpark);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
