/**
 * TradingView Advanced Chart embeds for Wunnaxswap
 * Uses the free public widget (exact TradingView chart UI) — no API key.
 * Falls back to WunnaChart canvas when TV has no symbol (e.g. synthetic indices).
 */
(function (global) {
  "use strict";

  var TV_SCRIPT = "https://s3.tradingview.com/tv.js";
  var scriptPromise = null;
  var instances = Object.create(null);
  var idSeq = 0;

  var TF_MAP = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "1h": "60",
    "4h": "240",
    "1D": "D",
    "1": "1",
    "5": "5",
    "15": "15",
    "60": "60",
    "240": "240",
    D: "D",
  };

  var FX = {
    EURUSD: "FX:EURUSD",
    GBPUSD: "FX:GBPUSD",
    USDJPY: "FX:USDJPY",
    AUDUSD: "FX:AUDUSD",
    USDCAD: "FX:USDCAD",
    USDCHF: "FX:USDCHF",
    NZDUSD: "FX:NZDUSD",
    EURJPY: "FX:EURJPY",
    EURGBP: "FX:EURGBP",
  };

  var INDICES = {
    US500: "FOREXCOM:SPXUSD",
    NAS100: "NASDAQ:NDX",
    US30: "DJ:DJI",
    GER40: "XETR:DAX",
    UK100: "FOREXCOM:UKXGBP",
    JP225: "TVC:NI225",
  };

  var COMMOD = {
    XAUUSD: "OANDA:XAUUSD",
    XAGUSD: "OANDA:XAGUSD",
    WTI: "TVC:USOIL",
    BRENT: "TVC:UKOIL",
    NATGAS: "TVC:NATGAS",
    COPPER: "TVC:COPPER",
  };

  /** Synthetic / demo-only symbols TradingView does not list */
  var SYNTH = /^(R_|BOOM|CRASH|STEP|JD|VIX|VOL)/i;

  function loadScript() {
    if (global.TradingView && global.TradingView.widget) {
      return Promise.resolve();
    }
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src*="s3.tradingview.com/tv.js"]');
      if (existing) {
        existing.addEventListener("load", function () {
          resolve();
        });
        existing.addEventListener("error", reject);
        if (global.TradingView) resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = TV_SCRIPT;
      s.async = true;
      s.onload = function () {
        resolve();
      };
      s.onerror = function () {
        reject(new Error("TradingView script failed to load"));
      };
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  function normalizeRaw(raw) {
    return String(raw || "BTC")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function toTvSymbol(raw) {
    var s = normalizeRaw(raw);
    if (!s) return "BINANCE:BTCUSDT";
    if (s.indexOf("BINANCE") === 0 || s.indexOf("FX") === 0 || s.indexOf("OANDA") === 0) return raw;
    if (FX[s]) return FX[s];
    if (INDICES[s]) return INDICES[s];
    if (COMMOD[s]) return COMMOD[s];
    if (SYNTH.test(s)) return null; // force fallback chart
    // BTCUSDT, ETHUSDT…
    if (/USDT$/.test(s) && s.length > 4) return "BINANCE:" + s;
    if (/USD$/.test(s) && s.length > 3 && s.length <= 7 && FX[s]) return FX[s];
    // bare coin
    if (s.length <= 6 && !/USD|JPY|EUR|GBP/.test(s.slice(-3))) {
      return "BINANCE:" + s + "USDT";
    }
    return "BINANCE:BTCUSDT";
  }

  function tfToInterval(tf) {
    return TF_MAP[tf] || "15";
  }

  function ensureShell(host) {
    var shell = host.closest(".wx-chart-shell");
    if (shell) return shell;
    shell = document.createElement("div");
    shell.className = "wx-chart-shell";
    host.parentNode.insertBefore(shell, host);
    shell.appendChild(host);
    return shell;
  }

  function wireChrome(shell, api) {
    // Always keep latest api on the shell (pair switches remount)
    shell.__wxChartApi = api;

    if (shell.getAttribute("data-wx-chart-wired") === "1") return;
    shell.setAttribute("data-wx-chart-wired", "1");

    var bar = shell.querySelector(".wx-chart-actions");
    if (!bar) {
      var toolbar = shell.querySelector(".chart-toolbar") || shell.querySelector(".wx-chart-bar");
      if (toolbar) {
        bar = document.createElement("div");
        bar.className = "wx-chart-actions";
        bar.innerHTML =
          '<button type="button" class="wx-chart-btn" data-chart-action="minimize" title="Minimize chart" aria-label="Minimize">−</button>' +
          '<button type="button" class="wx-chart-btn" data-chart-action="expand" title="Expand chart" aria-label="Expand">⛶</button>';
        toolbar.appendChild(bar);
      }
    }

    shell.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-chart-action]");
      if (!btn || !shell.contains(btn)) return;
      var cur = shell.__wxChartApi;
      if (!cur) return;
      var act = btn.getAttribute("data-chart-action");
      if (act === "expand") cur.toggleExpand();
      if (act === "minimize") cur.toggleMinimize();
      if (act === "restore") cur.restore();
    });

    // Escape exits expand
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && shell.classList.contains("is-expanded") && shell.__wxChartApi) {
        shell.__wxChartApi.restore();
      }
    });
  }

  function createFallback(canvas, price, vol) {
    if (!canvas || !global.WunnaChart) return null;
    canvas.hidden = false;
    return new global.WunnaChart(canvas, {
      price: price || 100,
      volatility: vol || 0.004,
      count: 100,
    });
  }

  /**
   * Mount TradingView (or fallback) into a host element.
   * @param {HTMLElement|string} hostEl - container for TV widget
   * @param {object} opts - { symbol, interval, height, price, volatility, fallbackCanvas }
   */
  function mount(hostEl, opts) {
    opts = opts || {};
    var host = typeof hostEl === "string" ? document.getElementById(hostEl) || document.querySelector(hostEl) : hostEl;
    if (!host) return null;

    var id = host.id || "tv_" + ++idSeq;
    if (!host.id) host.id = id;

    // tear down previous
    if (instances[id]) {
      try {
        instances[id].destroy();
      } catch (_) {}
    }

    var shell = ensureShell(host);
    var stage = shell.querySelector("[data-chart-stage]") || host.parentElement;
    if (stage && !stage.classList.contains("wx-chart-stage") && stage !== shell) {
      stage.classList.add("wx-chart-stage");
    }

    var state = {
      id: id,
      host: host,
      shell: shell,
      symbol: opts.symbol || "BTC",
      interval: opts.interval || "15m",
      height: opts.height || 420,
      price: opts.price || 100,
      volatility: opts.volatility || 0.004,
      widget: null,
      fallback: null,
      mode: "tv", // tv | fallback
      expanded: false,
      minimized: false,
    };

    function setStageHeight(h) {
      var st = shell.querySelector(".wx-chart-stage") || host.parentElement;
      if (st && st !== shell) st.style.height = h + "px";
      host.style.height = h + "px";
      host.style.minHeight = h + "px";
    }

    function clearHost() {
      host.innerHTML = "";
      host.classList.add("tv-host");
    }

    function mountFallback() {
      state.mode = "fallback";
      clearHost();
      var canvas = opts.fallbackCanvas;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.className = "wx-chart-fallback-canvas";
        host.appendChild(canvas);
      } else {
        canvas.hidden = false;
        if (canvas.parentNode !== host) host.appendChild(canvas);
      }
      try {
        if (state.fallback && state.fallback.destroy) state.fallback.destroy();
      } catch (_) {}
      state.fallback = createFallback(canvas, state.price, state.volatility);
      if (state.fallback && state.fallback.setTimeframe) {
        state.fallback.setTimeframe(state.interval);
      }
      setStageHeight(state.minimized ? 0 : state.expanded ? Math.max(520, window.innerHeight - 80) : state.height);
    }

    function mountTv() {
      var tvSym = toTvSymbol(state.symbol);
      if (!tvSym) {
        mountFallback();
        return Promise.resolve();
      }
      state.mode = "tv";
      return loadScript()
        .then(function () {
          if (!global.TradingView || !global.TradingView.widget) {
            mountFallback();
            return;
          }
          clearHost();
          var h = state.minimized ? 0 : state.expanded ? Math.max(520, window.innerHeight - 100) : state.height;
          setStageHeight(h);
          if (state.minimized) {
            host.style.display = "none";
            return;
          }
          host.style.display = "";
          // TradingView needs a fresh empty div
          var box = document.createElement("div");
          box.id = id + "_inner";
          box.style.width = "100%";
          box.style.height = h + "px";
          host.appendChild(box);
          try {
            state.widget = new global.TradingView.widget({
              autosize: true,
              symbol: tvSym,
              interval: tfToInterval(state.interval),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC",
              theme: "light",
              style: "1",
              locale: (document.documentElement.lang || "en").slice(0, 2),
              toolbar_bg: "#f6f5f3",
              enable_publishing: false,
              allow_symbol_change: true,
              hide_top_toolbar: false,
              hide_legend: false,
              hide_side_toolbar: false,
              withdateranges: true,
              details: true,
              hotlist: false,
              calendar: false,
              studies: ["Volume@tv-basicstudies"],
              container_id: box.id,
              support_host: "https://www.tradingview.com",
            });
          } catch (e) {
            console.warn("[tv-chart] widget error", e);
            mountFallback();
          }
        })
        .catch(function (err) {
          console.warn("[tv-chart] load failed", err);
          mountFallback();
        });
    }

    var api = {
      id: id,
      setSymbol: function (sym, price) {
        state.symbol = sym || state.symbol;
        if (price != null) state.price = price;
        var tvSym = toTvSymbol(state.symbol);
        if (!tvSym || state.mode === "fallback") {
          if (tvSym && state.mode === "fallback") {
            // upgrade to TV if now available
            return mountTv();
          }
          if (state.fallback) {
            if (price != null && state.fallback.reset) state.fallback.reset(price, state.volatility);
            else if (price != null && state.fallback.setPrice) state.fallback.setPrice(price);
          } else {
            mountFallback();
          }
          return;
        }
        // Re-create widget with new symbol (TV widget API is limited without advanced library)
        return mountTv();
      },
      setTimeframe: function (tf) {
        state.interval = tf || state.interval;
        if (state.mode === "fallback" && state.fallback && state.fallback.setTimeframe) {
          state.fallback.setTimeframe(state.interval);
          return;
        }
        return mountTv();
      },
      setPrice: function (p) {
        state.price = p;
        if (state.fallback && state.fallback.setPrice) state.fallback.setPrice(p);
      },
      reset: function (price, vol) {
        if (price != null) state.price = price;
        if (vol != null) state.volatility = vol;
        if (state.fallback && state.fallback.reset) state.fallback.reset(state.price, state.volatility);
        else if (state.mode === "tv") return mountTv();
      },
      draw: function () {
        if (state.fallback && state.fallback.draw) state.fallback.draw();
      },
      toggleExpand: function () {
        if (state.expanded) {
          api.restore();
          return;
        }
        state.expanded = true;
        state.minimized = false;
        shell.classList.add("is-expanded");
        shell.classList.remove("is-minimized");
        document.body.classList.add("wx-chart-expanded");
        var expBtn = shell.querySelector('[data-chart-action="expand"]');
        if (expBtn) {
          expBtn.textContent = "✕";
          expBtn.title = "Close expand";
          expBtn.setAttribute("aria-label", "Close expand");
        }
        mountTv();
      },
      toggleMinimize: function () {
        if (state.minimized) {
          api.restore();
          return;
        }
        state.minimized = true;
        state.expanded = false;
        shell.classList.add("is-minimized");
        shell.classList.remove("is-expanded");
        document.body.classList.remove("wx-chart-expanded");
        var st = shell.querySelector(".wx-chart-stage");
        if (st) st.style.height = "0px";
        host.style.display = "none";
        var minBtn = shell.querySelector('[data-chart-action="minimize"]');
        if (minBtn) {
          minBtn.textContent = "▢";
          minBtn.title = "Restore chart";
          minBtn.setAttribute("data-chart-action", "restore");
        }
        var expBtn = shell.querySelector('[data-chart-action="expand"]');
        if (expBtn) {
          expBtn.textContent = "⛶";
          expBtn.title = "Expand chart";
        }
      },
      restore: function () {
        state.expanded = false;
        state.minimized = false;
        shell.classList.remove("is-expanded", "is-minimized");
        document.body.classList.remove("wx-chart-expanded");
        host.style.display = "";
        setStageHeight(state.height);
        var minBtn = shell.querySelector('[data-chart-action="restore"], [data-chart-action="minimize"]');
        if (minBtn) {
          minBtn.textContent = "−";
          minBtn.title = "Minimize chart";
          minBtn.setAttribute("data-chart-action", "minimize");
        }
        var expBtn = shell.querySelector('[data-chart-action="expand"]');
        if (expBtn) {
          expBtn.textContent = "⛶";
          expBtn.title = "Expand chart";
          expBtn.setAttribute("aria-label", "Expand");
        }
        mountTv();
      },
      destroy: function () {
        try {
          host.innerHTML = "";
        } catch (_) {}
        shell.classList.remove("is-expanded", "is-minimized");
        document.body.classList.remove("wx-chart-expanded");
        delete instances[id];
      },
      getSymbol: function () {
        return state.symbol;
      },
      isTv: function () {
        return state.mode === "tv";
      },
    };

    wireChrome(shell, api);
    instances[id] = api;
    mountTv();
    return api;
  }

  function get(id) {
    return instances[id] || null;
  }

  global.WunnaxTvChart = {
    mount: mount,
    get: get,
    toTvSymbol: toTvSymbol,
    loadScript: loadScript,
    TF_MAP: TF_MAP,
  };
})(typeof window !== "undefined" ? window : globalThis);
