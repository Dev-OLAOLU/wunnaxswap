/**
 * Realistic OHLCV candlestick + volume chart for Wunnaxswap
 */
(function () {
  function genCandles(seedPrice, count, volatility) {
    const candles = [];
    let price = seedPrice;
    const now = Date.now();
    const step = 60 * 1000; // 1m base, scaled by timeframe externally
    for (let i = count; i > 0; i--) {
      const open = price;
      const drift = (Math.random() - 0.48) * volatility * price;
      const shock = (Math.random() - 0.5) * volatility * price * 0.6;
      const close = Math.max(price * 0.00001, open + drift + shock);
      const wickUp = Math.random() * volatility * price * 0.5;
      const wickDn = Math.random() * volatility * price * 0.5;
      const high = Math.max(open, close) + wickUp;
      const low = Math.min(open, close) - wickDn;
      const volume = seedPrice * (0.2 + Math.random() * 1.8) * (0.5 + Math.abs(close - open) / price * 40);
      candles.push({
        t: now - i * step,
        o: open,
        h: high,
        l: Math.max(low, 0),
        c: close,
        v: volume,
      });
      price = close;
    }
    return candles;
  }

  function timeframeMs(tf) {
    const map = { "1m": 60e3, "5m": 300e3, "15m": 900e3, "1h": 3600e3, "4h": 14400e3, "1D": 86400e3 };
    return map[tf] || 60e3;
  }

  function WunnaChart(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.opts = Object.assign(
      {
        price: 100,
        volatility: 0.004,
        count: 80,
        timeframe: "15m",
        theme: {
          bg: "#ffffff",
          grid: "#eef2f8",
          text: "#5b6b86",
          up: "#059669",
          down: "#dc2626",
          cross: "#94a3b8",
          volUp: "rgba(5,150,105,0.35)",
          volDown: "rgba(220,38,38,0.3)",
        },
      },
      options || {}
    );
    this.candles = genCandles(this.opts.price, this.opts.count, this.opts.volatility);
    this.hover = null;
    this._bind();
    this.resize();
    this.draw();
  }

  WunnaChart.prototype._bind = function () {
    const self = this;
    window.addEventListener("resize", function () {
      self.resize();
      self.draw();
    });
    this.canvas.addEventListener("mousemove", function (e) {
      const rect = self.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (self.canvas.width / rect.width);
      self.hover = { x: x, y: (e.clientY - rect.top) * (self.canvas.height / rect.height) };
      self.draw();
    });
    this.canvas.addEventListener("mouseleave", function () {
      self.hover = null;
      self.draw();
    });
  };

  WunnaChart.prototype.resize = function () {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 600;
    const h = this.canvas.clientHeight || 360;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
  };

  WunnaChart.prototype.setPrice = function (price) {
    // append new candle tick realism
    const last = this.candles[this.candles.length - 1];
    if (!last) return;
    const close = price;
    last.c = close;
    last.h = Math.max(last.h, close);
    last.l = Math.min(last.l, close);
    last.v += Math.abs(close - last.o) * (10 + Math.random() * 40);
    // occasionally roll a new candle
    if (Math.random() > 0.72) {
      const o = last.c;
      const c = price * (1 + (Math.random() - 0.5) * this.opts.volatility);
      this.candles.push({
        t: Date.now(),
        o: o,
        h: Math.max(o, c) * (1 + Math.random() * this.opts.volatility * 0.4),
        l: Math.min(o, c) * (1 - Math.random() * this.opts.volatility * 0.4),
        c: c,
        v: last.v * (0.4 + Math.random()),
      });
      if (this.candles.length > this.opts.count) this.candles.shift();
    }
    this.draw();
  };

  WunnaChart.prototype.reset = function (price, volatility) {
    this.opts.price = price;
    if (volatility) this.opts.volatility = volatility;
    this.candles = genCandles(price, this.opts.count, this.opts.volatility);
    this.draw();
  };

  WunnaChart.prototype.setTimeframe = function (tf) {
    this.opts.timeframe = tf;
    const mult = { "1m": 0.7, "5m": 0.9, "15m": 1, "1h": 1.3, "4h": 1.6, "1D": 2.2 }[tf] || 1;
    this.opts.volatility = 0.0035 * mult;
    this.candles = genCandles(this.opts.price || this.candles[this.candles.length - 1].c, this.opts.count, this.opts.volatility);
    this.draw();
  };

  WunnaChart.prototype.draw = function () {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const th = this.opts.theme;
    const padL = 8;
    const padR = 64;
    const padT = 12;
    const padB = 22;
    const volH = Math.floor(h * 0.22);
    const chartH = h - padT - padB - volH - 8;
    const chartW = w - padL - padR;
    const data = this.candles;
    if (!data.length) return;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, w, h);

    let min = Infinity;
    let max = -Infinity;
    let maxV = 0;
    data.forEach(function (c) {
      min = Math.min(min, c.l);
      max = Math.max(max, c.h);
      maxV = Math.max(maxV, c.v);
    });
    const pad = (max - min) * 0.08 || max * 0.01;
    min -= pad;
    max += pad;

    function yPrice(p) {
      return padT + (1 - (p - min) / (max - min || 1)) * chartH;
    }
    function xAt(i) {
      return padL + ((i + 0.5) / data.length) * chartW;
    }

    // grid
    ctx.strokeStyle = th.grid;
    ctx.lineWidth = 1;
    ctx.font = "11px DM Sans, sans-serif";
    ctx.fillStyle = th.text;
    for (let g = 0; g <= 4; g++) {
      const p = min + ((max - min) * g) / 4;
      const y = yPrice(p);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
      ctx.fillText(formatPrice(p), padL + chartW + 6, y + 4);
    }

    // SMA 20
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      const slice = data.slice(Math.max(0, i - 19), i + 1);
      sma.push(slice.reduce(function (s, c) { return s + c.c; }, 0) / slice.length);
    }
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    sma.forEach(function (v, i) {
      const x = xAt(i);
      const y = yPrice(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // EMA 9
    let ema = data[0].c;
    const k = 2 / (9 + 1);
    ctx.strokeStyle = "#0891b2";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    data.forEach(function (c, i) {
      ema = c.c * k + ema * (1 - k);
      const x = xAt(i);
      const y = yPrice(ema);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // candles
    const bodyW = Math.max(2, (chartW / data.length) * 0.62);
    data.forEach(function (c, i) {
      const x = xAt(i);
      const up = c.c >= c.o;
      const color = up ? th.up : th.down;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      // wick
      ctx.beginPath();
      ctx.moveTo(x, yPrice(c.h));
      ctx.lineTo(x, yPrice(c.l));
      ctx.stroke();
      // body
      const y1 = yPrice(c.o);
      const y2 = yPrice(c.c);
      const top = Math.min(y1, y2);
      const bh = Math.max(1, Math.abs(y2 - y1));
      if (up) {
        ctx.strokeRect(x - bodyW / 2, top, bodyW, bh);
        ctx.fillStyle = "rgba(5,150,105,0.15)";
        ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
        ctx.strokeStyle = color;
        ctx.strokeRect(x - bodyW / 2, top, bodyW, bh);
      } else {
        ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
      }

      // volume
      const vh = (c.v / (maxV || 1)) * (volH - 4);
      const vy = h - padB - vh;
      ctx.fillStyle = up ? th.volUp : th.volDown;
      ctx.fillRect(x - bodyW / 2, vy, bodyW, vh);
    });

    // volume label
    ctx.fillStyle = th.text;
    ctx.fillText("Vol", padL, h - padB - volH + 10);

    // crosshair + OHLC readout
    if (this.hover) {
      const idx = Math.min(data.length - 1, Math.max(0, Math.floor((this.hover.x - padL) / chartW * data.length)));
      const c = data[idx];
      const x = xAt(idx);
      ctx.strokeStyle = th.cross;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
      ctx.moveTo(padL, this.hover.y);
      ctx.lineTo(padL + chartW, this.hover.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const boxY = padT + 4;
      ctx.fillStyle = "rgba(15,23,42,0.82)";
      ctx.fillRect(padL + 4, boxY, 250, 54);
      ctx.fillStyle = "#fff";
      ctx.font = "11px JetBrains Mono, monospace";
      const chg = (((c.c - c.o) / c.o) * 100).toFixed(2);
      ctx.fillText(
        "O " + formatPrice(c.o) + "  H " + formatPrice(c.h) + "  L " + formatPrice(c.l) + "  C " + formatPrice(c.c),
        padL + 10,
        boxY + 18
      );
      ctx.fillStyle = c.c >= c.o ? th.up : th.down;
      ctx.fillText((c.c >= c.o ? "+" : "") + chg + "%   Vol " + formatVol(c.v), padL + 10, boxY + 38);
      ctx.fillStyle = th.text;
      ctx.font = "11px DM Sans, sans-serif";
    }

    // legend
    ctx.font = "11px DM Sans, sans-serif";
    ctx.fillStyle = "#7c3aed";
    ctx.fillText("SMA20", padL + 8, padT + 12);
    ctx.fillStyle = "#0891b2";
    ctx.fillText("EMA9", padL + 58, padT + 12);
  };

  function formatPrice(n) {
    var s;
    if (n >= 1000) s = n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    else if (n >= 1) s = n.toLocaleString(undefined, { maximumFractionDigits: 4 });
    else s = n.toLocaleString(undefined, { maximumFractionDigits: 8 });
    return "$" + s;
  }
  function formatVol(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toFixed(0);
  }

  // Mini sparkline for markets table
  function drawSparkline(canvas, seed, change) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 88;
    const h = canvas.clientHeight || 28;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pts = [];
    let p = seed;
    for (let i = 0; i < 24; i++) {
      p *= 1 + (Math.random() - 0.48) * 0.01 + change * 0.0002;
      pts.push(p);
    }
    const min = Math.min.apply(null, pts);
    const max = Math.max.apply(null, pts);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = change >= 0 ? "#059669" : "#dc2626";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    pts.forEach(function (v, i) {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  window.WunnaChart = WunnaChart;
  window.drawSparkline = drawSparkline;
})();
