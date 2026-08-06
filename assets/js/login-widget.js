/**
 * Look-alike market widget on the Deriv-style login page.
 * Lightweight tickers + sparkline (no full app boot required).
 */
(function () {
  "use strict";

  var ticks = [
    { s: "EURUSD", p: 1.0864, c: 0.12 },
    { s: "R_50", p: 210.55, c: 0.41 },
    { s: "XAUUSD", p: 2348.6, c: 0.28 },
    { s: "BTCUSD", p: 65044, c: 0.8 },
    { s: "NAS100", p: 18420, c: 0.62 },
    { s: "BOOM1K", p: 11200, c: 0.55 },
  ];

  function money(n) {
    if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (n >= 10) return n.toFixed(2);
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(5);
  }

  function renderTicks() {
    var el = document.getElementById("loginWidgetTicks");
    if (!el) return;
    el.innerHTML = ticks
      .map(function (t) {
        var up = t.c >= 0;
        return (
          '<div class="dmw-tick">' +
          "<strong>" +
          t.s +
          '</strong><span class="mono">' +
          money(t.p) +
          '</span><span class="mono ' +
          (up ? "up" : "down") +
          '">' +
          (up ? "+" : "") +
          t.c.toFixed(2) +
          "%</span></div>"
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

    // soft grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (var g = 1; g < 4; g++) {
      var gy = (h / 4) * g;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    var pts = [];
    var p = 100;
    for (var i = 0; i < 48; i++) {
      p *= 1 + (Math.random() - 0.48) * 0.02;
      pts.push(p);
    }
    var min = Math.min.apply(null, pts);
    var max = Math.max.apply(null, pts);
    var grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#6786ed");
    grad.addColorStop(0.5, "#547afd");
    grad.addColorStop(1, "#a7f3d0");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach(function (v, i) {
      var x = (i / (pts.length - 1)) * w;
      var y = h - ((v - min) / (max - min || 1)) * (h - 16) - 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // fill under curve
    var lastX = w;
    var lastY = h - ((pts[pts.length - 1] - min) / (max - min || 1)) * (h - 16) - 8;
    ctx.lineTo(lastX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    var fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, "rgba(84,122,253,0.28)");
    fill.addColorStop(1, "rgba(84,122,253,0)");
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function tick() {
    ticks.forEach(function (t) {
      var vol = t.p * (0.0002 + Math.random() * 0.0005);
      t.p = Math.max(0.0001, t.p + (Math.random() > 0.5 ? 1 : -1) * vol);
      t.c = +(t.c + (Math.random() - 0.5) * 0.06).toFixed(2);
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
    setInterval(drawSpark, 4000);
    window.addEventListener("resize", drawSpark);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
