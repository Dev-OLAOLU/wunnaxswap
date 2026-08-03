/**
 * Wunnaxswap Firebase backend (Auth + Firestore).
 * Requires: firebase-app/auth/firestore compat CDN + firebase-config.js
 * Same public API as before: window.WunnaxBackend
 */
(function (global) {
  var app = null;
  var auth = null;
  var db = null;
  var ready = false;
  var sessionUser = null;
  var unsubAuth = null;

  var DEFAULT_BALANCES = {
    USDT: 2500,
    BTC: 0.05,
    ETH: 1.2,
    SOL: 15,
    BNB: 2,
    XRP: 200,
  };

  function cfg() {
    return global.WUNNAX_FIREBASE || {};
  }

  function enabled() {
    if (typeof global.WUNNAX_FIREBASE_ENABLED === "function") {
      return global.WUNNAX_FIREBASE_ENABLED();
    }
    var c = cfg();
    return !!(c.apiKey && c.projectId);
  }

  function getAuth() {
    return auth;
  }

  function getDb() {
    return db;
  }

  function ensureApp() {
    if (!enabled()) return null;
    if (app) return app;
    if (!global.firebase || !global.firebase.initializeApp) {
      console.warn("[WunnaxBackend] Firebase SDK not loaded");
      return null;
    }
    try {
      if (global.firebase.apps && global.firebase.apps.length) {
        app = global.firebase.apps[0];
      } else {
        app = global.firebase.initializeApp(cfg());
      }
      auth = global.firebase.auth();
      db = global.firebase.firestore();
      return app;
    } catch (e) {
      console.error("[WunnaxBackend] init failed", e);
      return null;
    }
  }

  function mapUser(user, profile) {
    if (!user) return null;
    return {
      id: user.uid,
      email: user.email || (profile && profile.email) || "",
      name:
        (profile && profile.displayName) ||
        user.displayName ||
        (user.email ? user.email.split("@")[0] : "Trader"),
      provider:
        (user.providerData && user.providerData[0] && user.providerData[0].providerId) ||
        "password",
      avatar_url: (profile && profile.avatarUrl) || user.photoURL || null,
      kyc_status: (profile && profile.kycStatus) || "none",
      backend: "firebase",
    };
  }

  function userDoc(uid) {
    return db.collection("users").doc(uid);
  }

  async function loadProfile(uid) {
    var snap = await userDoc(uid).get();
    return snap.exists ? snap.data() : null;
  }

  async function ensureWallet(uid) {
    uid = uid || (sessionUser && sessionUser.uid);
    if (!uid || !db) return null;
    var ref = userDoc(uid);
    var snap = await ref.get();
    if (!snap.exists) {
      await ref.set(
        {
          email: (sessionUser && sessionUser.email) || "",
          displayName:
            (sessionUser && sessionUser.displayName) ||
            ((sessionUser && sessionUser.email && sessionUser.email.split("@")[0]) || "Trader"),
          balances: Object.assign({}, DEFAULT_BALANCES),
          kycStatus: "none",
          createdAt: global.firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return Object.assign({}, DEFAULT_BALANCES);
    }
    var data = snap.data() || {};
    if (!data.balances || typeof data.balances !== "object") {
      await ref.set(
        {
          balances: Object.assign({}, DEFAULT_BALANCES),
          updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return Object.assign({}, DEFAULT_BALANCES);
    }
    return data.balances;
  }

  async function init() {
    if (!ensureApp()) {
      ready = true;
      return { enabled: false };
    }
    return new Promise(function (resolve) {
      unsubAuth = auth.onAuthStateChanged(function (user) {
        sessionUser = user || null;
        if (user) {
          ensureWallet(user.uid)
            .catch(function () {})
            .finally(function () {
              ready = true;
              document.dispatchEvent(
                new CustomEvent("wunna:auth", { detail: { event: "ready", user: user } })
              );
              resolve({ enabled: true, user: user });
            });
        } else {
          ready = true;
          document.dispatchEvent(
            new CustomEvent("wunna:auth", { detail: { event: "signed_out", user: null } })
          );
          resolve({ enabled: true, user: null });
        }
      });
    });
  }

  async function signUp(email, password, name) {
    ensureApp();
    if (!auth) throw new Error("Firebase not configured");
    var cred = await auth.createUserWithEmailAndPassword(email, password);
    if (name) {
      await cred.user.updateProfile({ displayName: name });
    }
    sessionUser = cred.user;
    await userDoc(cred.user.uid).set(
      {
        email: email,
        displayName: name || email.split("@")[0],
        balances: Object.assign({}, DEFAULT_BALANCES),
        kycStatus: "none",
        createdAt: global.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { user: cred.user, session: true };
  }

  async function signIn(email, password) {
    ensureApp();
    if (!auth) throw new Error("Firebase not configured");
    var cred = await auth.signInWithEmailAndPassword(email, password);
    sessionUser = cred.user;
    await ensureWallet(cred.user.uid);
    return { user: cred.user };
  }

  async function signInWithOAuth(providerName) {
    ensureApp();
    if (!auth) throw new Error("Firebase not configured");
    var provider;
    if (providerName === "google") {
      provider = new global.firebase.auth.GoogleAuthProvider();
    } else {
      throw new Error("Enable this provider in Firebase Console first");
    }
    var cred = await auth.signInWithPopup(provider);
    sessionUser = cred.user;
    await ensureWallet(cred.user.uid);
    return { user: cred.user };
  }

  async function signOut() {
    if (!auth) return;
    await auth.signOut();
    sessionUser = null;
  }

  async function getSessionUser() {
    ensureApp();
    if (!auth || !auth.currentUser) {
      sessionUser = null;
      return null;
    }
    sessionUser = auth.currentUser;
    var profile = await loadProfile(sessionUser.uid);
    return mapUser(sessionUser, profile);
  }

  function isAuthed() {
    return !!(auth && auth.currentUser) || !!sessionUser;
  }

  async function getBalancesMap() {
    if (!sessionUser || !db) return null;
    var bal = await ensureWallet(sessionUser.uid);
    var map = {};
    Object.keys(bal || {}).forEach(function (k) {
      map[k] = Number(bal[k]) || 0;
    });
    return map;
  }

  async function adjustBalance(asset, delta) {
    var uid = sessionUser && sessionUser.uid;
    if (!uid) throw new Error("Not authenticated");
    asset = String(asset).toUpperCase();
    var ref = userDoc(uid);
    await db.runTransaction(async function (tx) {
      var snap = await tx.get(ref);
      var data = snap.exists ? snap.data() : {};
      var balances = Object.assign({}, DEFAULT_BALANCES, data.balances || {});
      var cur = Number(balances[asset] || 0);
      var next = cur + Number(delta);
      if (next < -1e-12) {
        throw new Error("Insufficient " + asset + " balance");
      }
      balances[asset] = next;
      tx.set(
        ref,
        {
          balances: balances,
          updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  }

  async function writeLedger(kind, asset, amount, meta) {
    if (!sessionUser) return;
    await db
      .collection("users")
      .doc(sessionUser.uid)
      .collection("ledger")
      .add({
        kind: kind,
        asset: asset,
        amount: amount,
        meta: meta || {},
        createdAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      });
  }

  async function creditDemo(asset, amount) {
    if (!isAuthed()) throw new Error("Not authenticated");
    amount = Number(amount);
    if (!(amount > 0)) throw new Error("Amount must be positive");
    asset = String(asset).toUpperCase();
    await adjustBalance(asset, amount);
    await writeLedger("demo_credit", asset, amount, { source: "deposit_ui" });
    return { ok: true, asset: asset, amount: amount };
  }

  async function executeSwap(send, recv, sendAmt, recvAmt, fee, rate) {
    if (!isAuthed()) throw new Error("Not authenticated");
    send = String(send).toUpperCase();
    recv = String(recv).toUpperCase();
    sendAmt = Number(sendAmt);
    recvAmt = Number(recvAmt);
    if (send === recv) throw new Error("Assets must differ");
    if (!(sendAmt > 0) || !(recvAmt > 0)) throw new Error("Invalid amounts");

    var uid = sessionUser.uid;
    var ref = userDoc(uid);
    await db.runTransaction(async function (tx) {
      var snap = await tx.get(ref);
      var data = snap.exists ? snap.data() : {};
      var balances = Object.assign({}, DEFAULT_BALANCES, data.balances || {});
      if (Number(balances[send] || 0) < sendAmt) {
        throw new Error("Insufficient " + send + " balance");
      }
      balances[send] = Number(balances[send] || 0) - sendAmt;
      balances[recv] = Number(balances[recv] || 0) + recvAmt;
      tx.set(
        ref,
        {
          balances: balances,
          updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    var swapRef = await db
      .collection("users")
      .doc(uid)
      .collection("swaps")
      .add({
        sendAsset: send,
        recvAsset: recv,
        sendAmount: sendAmt,
        recvAmount: recvAmt,
        feeAmount: fee || 0,
        rate: rate || null,
        createdAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      });

    await writeLedger("swap_out", send, -sendAmt, { swapId: swapRef.id });
    await writeLedger("swap_in", recv, recvAmt, { swapId: swapRef.id });
    return { ok: true, swap_id: swapRef.id };
  }

  async function placeOrder(opts) {
    if (!isAuthed()) throw new Error("Not authenticated");
    var side = String(opts.side || "").toLowerCase();
    var base = String(opts.baseAsset || "").toUpperCase();
    var quote = String(opts.quoteAsset || "USDT").toUpperCase();
    var px = Number(opts.price);
    var qty = Number(opts.amount);
    if (!(qty > 0) || !(px > 0)) throw new Error("Invalid price/amount");
    var cost = px * qty;

    var uid = sessionUser.uid;
    var ref = userDoc(uid);
    await db.runTransaction(async function (tx) {
      var snap = await tx.get(ref);
      var data = snap.exists ? snap.data() : {};
      var balances = Object.assign({}, DEFAULT_BALANCES, data.balances || {});

      if (side === "buy" || side === "long") {
        if (Number(balances[quote] || 0) < cost) throw new Error("Insufficient " + quote);
        balances[quote] = Number(balances[quote] || 0) - cost;
        if (side === "buy") balances[base] = Number(balances[base] || 0) + qty;
      } else if (side === "sell" || side === "short") {
        if (side === "sell") {
          if (Number(balances[base] || 0) < qty) throw new Error("Insufficient " + base);
          balances[base] = Number(balances[base] || 0) - qty;
        }
        balances[quote] = Number(balances[quote] || 0) + cost;
      } else {
        throw new Error("Invalid side");
      }

      tx.set(
        ref,
        {
          balances: balances,
          updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    var orderRef = await db
      .collection("users")
      .doc(uid)
      .collection("orders")
      .add({
        side: side,
        marketType: opts.marketType || "spot",
        pair: opts.pair,
        orderType: opts.orderType || "market",
        price: px,
        amount: qty,
        status: "filled",
        meta: { base: base, quote: quote },
        createdAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      });

    await writeLedger("order_" + side, base, side === "buy" ? qty : -qty, {
      orderId: orderRef.id,
      pair: opts.pair,
      price: px,
    });

    return { ok: true, order_id: orderRef.id };
  }

  async function listOrders(limit) {
    if (!sessionUser) return [];
    var snap = await db
      .collection("users")
      .doc(sessionUser.uid)
      .collection("orders")
      .orderBy("createdAt", "desc")
      .limit(limit || 50)
      .get();
    return snap.docs.map(function (d) {
      return Object.assign({ id: d.id }, d.data());
    });
  }

  async function openStake(asset, amount, plan, apr) {
    if (!isAuthed()) throw new Error("Not authenticated");
    asset = String(asset).toUpperCase();
    amount = Number(amount);
    if (!(amount > 0)) throw new Error("Invalid amount");
    await adjustBalance(asset, -amount);
    var ref = await db
      .collection("users")
      .doc(sessionUser.uid)
      .collection("stakes")
      .add({
        asset: asset,
        amount: amount,
        planLabel: plan || "flexible",
        apr: apr || 5,
        status: "active",
        startedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      });
    await writeLedger("stake_lock", asset, -amount, { stakeId: ref.id });
    return { ok: true, stake_id: ref.id };
  }

  async function closeStake(stakeId) {
    if (!isAuthed()) throw new Error("Not authenticated");
    var ref = db.collection("users").doc(sessionUser.uid).collection("stakes").doc(stakeId);
    var snap = await ref.get();
    if (!snap.exists) throw new Error("Stake not found");
    var s = snap.data();
    if (s.status !== "active") throw new Error("Stake not active");
    await adjustBalance(s.asset, Number(s.amount));
    await ref.update({
      status: "closed",
      closedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
    });
    await writeLedger("stake_unlock", s.asset, Number(s.amount), { stakeId: stakeId });
    return { ok: true, stake_id: stakeId };
  }

  async function listStakes() {
    if (!sessionUser) return [];
    var snap = await db
      .collection("users")
      .doc(sessionUser.uid)
      .collection("stakes")
      .where("status", "==", "active")
      .get();
    return snap.docs.map(function (d) {
      var x = d.data();
      return {
        id: d.id,
        asset: x.asset,
        amount: Number(x.amount),
        apr: Number(x.apr || 0),
        term: x.planLabel || "flexible",
        started: x.startedAt && x.startedAt.toDate ? x.startedAt.toDate().toLocaleString() : "—",
      };
    });
  }

  async function getFavorites() {
    if (!sessionUser) return [];
    var snap = await db
      .collection("users")
      .doc(sessionUser.uid)
      .collection("favorites")
      .get();
    return snap.docs.map(function (d) {
      return d.id;
    });
  }

  async function toggleFavorite(symbol) {
    if (!sessionUser) throw new Error("Not authenticated");
    var ref = db.collection("users").doc(sessionUser.uid).collection("favorites").doc(symbol);
    var snap = await ref.get();
    if (snap.exists) await ref.delete();
    else await ref.set({ symbol: symbol, createdAt: global.firebase.firestore.FieldValue.serverTimestamp() });
    return getFavorites();
  }

  async function saveDepositAddress(asset, network, address) {
    if (!sessionUser) throw new Error("Not authenticated");
    await db
      .collection("users")
      .doc(sessionUser.uid)
      .collection("depositAddresses")
      .add({
        asset: asset,
        network: network || "demo",
        address: address,
        createdAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      });
    return true;
  }

  global.WunnaxBackend = {
    enabled: enabled,
    init: init,
    isReady: function () {
      return ready;
    },
    getClient: getDb,
    getAuth: getAuth,
    signUp: signUp,
    signIn: signIn,
    signInWithOAuth: signInWithOAuth,
    signOut: signOut,
    getSessionUser: getSessionUser,
    isAuthed: isAuthed,
    ensureWallet: function () {
      return ensureWallet();
    },
    getBalancesMap: getBalancesMap,
    creditDemo: creditDemo,
    executeSwap: executeSwap,
    placeOrder: placeOrder,
    listOrders: listOrders,
    openStake: openStake,
    closeStake: closeStake,
    listStakes: listStakes,
    getFavorites: getFavorites,
    toggleFavorite: toggleFavorite,
    saveDepositAddress: saveDepositAddress,
  };
})(window);
