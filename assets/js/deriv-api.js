/**
 * Wunnaxswap ↔ Deriv public WebSocket market data
 * Docs: https://developers.deriv.com/
 * Dashboard reference: https://home.deriv.com/dashboard/options
 *
 * Uses public app_id (replace with your own at https://api.deriv.com for production).
 * Live ticks only — contract buy/sell on real money still requires a Deriv API token.
 */
(function (global) {
  "use strict";

  var APP_ID = 1089; // public demo app id
  var WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=" + APP_ID;

  /** Map our desk symbols → Deriv underlying symbols */
  var SYMBOL_MAP = {
    EURUSD: "frxEURUSD",
    GBPUSD: "frxGBPUSD",
    USDJPY: "frxUSDJPY",
    AUDUSD: "frxAUDUSD",
    USDCAD: "frxUSDCAD",
    USDCHF: "frxUSDCHF",
    XAUUSD: "frxXAUUSD",
    XAGUSD: "frxXAGUSD",
    // Derived / synthetic indices (Deriv options favourites)
    R_10: "R_10",
    R_25: "R_25",
    R_50: "R_50",
    R_75: "R_75",
    R_100: "R_100",
    BOOM1000: "BOOM1000",
    CRASH1000: "CRASH1000",
    // Crypto (when available on Deriv)
    BTCUSDT: "cryBTCUSD",
    ETHUSDT: "cryETHUSD",
  };

  var reverseMap = {};
  Object.keys(SYMBOL_MAP).forEach(function (k) {
    reverseMap[SYMBOL_MAP[k]] = k;
  });

  var state = {
    ws: null,
    connected: false,
    connecting: false,
    reqId: 1,
    tickSubs: {}, // derivSymbol -> true
    lastTick: {}, // ourSymbol -> { quote, epoch }
    activeSymbols: [],
    listeners: [],
    statusListeners: [],
    reconnectTimer: null,
    error: null,
  };

  function emitStatus() {
    var payload = {
      connected: state.connected,
      error: state.error,
      liveCount: Object.keys(state.lastTick).length,
    };
    state.statusListeners.forEach(function (fn) {
      try {
        fn(payload);
      } catch (_) {}
    });
  }

  function emitTick(ourSym, quote, epoch) {
    state.lastTick[ourSym] = { quote: quote, epoch: epoch, at: Date.now() };
    state.listeners.forEach(function (fn) {
      try {
        fn({ symbol: ourSym, quote: quote, epoch: epoch });
      } catch (_) {}
    });
  }

  function send(msg) {
    if (!state.ws || state.ws.readyState !== 1) return false;
    if (!msg.req_id) msg.req_id = state.reqId++;
    try {
      state.ws.send(JSON.stringify(msg));
      return true;
    } catch (_) {
      return false;
    }
  }

  function handleMessage(raw) {
    var data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      return;
    }
    if (data.error) {
      state.error = data.error.message || "Deriv API error";
      emitStatus();
      return;
    }
    if (data.msg_type === "tick" && data.tick) {
      var ds = data.tick.symbol;
      var our = reverseMap[ds];
      if (our) emitTick(our, Number(data.tick.quote), data.tick.epoch);
      return;
    }
    if (data.msg_type === "active_symbols" && data.active_symbols) {
      state.activeSymbols = data.active_symbols;
      emitStatus();
      // Auto-subscribe mapped markets that exist
      Object.keys(SYMBOL_MAP).forEach(function (our) {
        var d = SYMBOL_MAP[our];
        var found = state.activeSymbols.some(function (s) {
          return s.symbol === d;
        });
        if (found) subscribeTick(our);
      });
    }
  }

  function connect() {
    if (state.connected || state.connecting) return;
    if (typeof WebSocket === "undefined") {
      state.error = "WebSocket not supported";
      emitStatus();
      return;
    }
    state.connecting = true;
    state.error = null;
    emitStatus();
    try {
      state.ws = new WebSocket(WS_URL);
    } catch (e) {
      state.connecting = false;
      state.error = "Could not open Deriv connection";
      emitStatus();
      scheduleReconnect();
      return;
    }
    state.ws.onopen = function () {
      state.connected = true;
      state.connecting = false;
      state.error = null;
      emitStatus();
      // Public market list (options / contracts underlyings)
      send({ active_symbols: "brief", product_type: "basic" });
      // Re-subscribe
      Object.keys(state.tickSubs).forEach(function (ds) {
        send({ ticks: ds, subscribe: 1 });
      });
    };
    state.ws.onmessage = function (ev) {
      handleMessage(ev.data);
    };
    state.ws.onerror = function () {
      state.error = "Deriv feed error — retrying…";
      emitStatus();
    };
    state.ws.onclose = function () {
      state.connected = false;
      state.connecting = false;
      state.ws = null;
      emitStatus();
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (state.reconnectTimer) return;
    state.reconnectTimer = setTimeout(function () {
      state.reconnectTimer = null;
      connect();
    }, 4000);
  }

  function subscribeTick(ourSymbol) {
    ourSymbol = String(ourSymbol || "").toUpperCase();
    var ds = SYMBOL_MAP[ourSymbol];
    if (!ds) return false;
    state.tickSubs[ds] = true;
    if (state.connected) send({ ticks: ds, subscribe: 1 });
    return true;
  }

  function unsubscribeTick(ourSymbol) {
    ourSymbol = String(ourSymbol || "").toUpperCase();
    var ds = SYMBOL_MAP[ourSymbol];
    if (!ds) return;
    delete state.tickSubs[ds];
    if (state.connected) send({ forget_all: "ticks" });
    // re-sub remaining
    Object.keys(state.tickSubs).forEach(function (s) {
      send({ ticks: s, subscribe: 1 });
    });
  }

  function getLastTick(ourSymbol) {
    return state.lastTick[String(ourSymbol || "").toUpperCase()] || null;
  }

  function isLive(ourSymbol) {
    var t = getLastTick(ourSymbol);
    return !!(t && Date.now() - t.at < 15000);
  }

  function onTick(fn) {
    if (typeof fn === "function") state.listeners.push(fn);
    return function () {
      state.listeners = state.listeners.filter(function (f) {
        return f !== fn;
      });
    };
  }

  function onStatus(fn) {
    if (typeof fn === "function") state.statusListeners.push(fn);
    return function () {
      state.statusListeners = state.statusListeners.filter(function (f) {
        return f !== fn;
      });
    };
  }

  function getMappedSymbols() {
    return Object.keys(SYMBOL_MAP);
  }

  function toDerivSymbol(our) {
    return SYMBOL_MAP[String(our || "").toUpperCase()] || null;
  }

  global.WunnaxDerivApi = {
    connect: connect,
    subscribeTick: subscribeTick,
    unsubscribeTick: unsubscribeTick,
    getLastTick: getLastTick,
    isLive: isLive,
    onTick: onTick,
    onStatus: onStatus,
    getMappedSymbols: getMappedSymbols,
    toDerivSymbol: toDerivSymbol,
    isConnected: function () {
      return state.connected;
    },
    getStatus: function () {
      return {
        connected: state.connected,
        error: state.error,
        liveCount: Object.keys(state.lastTick).length,
        appId: APP_ID,
        dashboard: "https://home.deriv.com/dashboard/options",
        docs: "https://developers.deriv.com/",
      };
    },
    SYMBOL_MAP: SYMBOL_MAP,
  };
})(typeof window !== "undefined" ? window : globalThis);
