/**
 * Wunnaxswap Firebase backend (Auth + Firestore)
 * ---------------------------------------------------------------------------
 * Public surface: window.WunnaxBackend
 * Requires: firebase-app / auth / firestore compat CDN + firebase-config.js
 *
 * Design goals (quality / maintainability / data safety):
 *  - Single source of truth for paper balances in Firestore users/{uid}
 *  - Atomic balance mutations via transactions
 *  - Normalized errors for UI (formatError)
 *  - waitForReady() so pages never race auth
 *  - localStorage still used by app.js as offline demo when disabled
 *
 * @typedef {Object} WunnaxUser
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string} provider
 * @property {string|null} avatar_url
 * @property {string} kyc_status
 * @property {"firebase"} backend
 *
 * @typedef {Object.<string, number>} BalanceMap
 */
(function (global) {
  "use strict";

  /** @type {firebase.app.App|null} */
  var app = null;
  /** @type {firebase.auth.Auth|null} */
  var auth = null;
  /** @type {firebase.firestore.Firestore|null} */
  var db = null;

  var ready = false;
  /** @type {Promise<{enabled:boolean,user:firebase.User|null}>|null} */
  var initPromise = null;
  /** @type {firebase.User|null} */
  var sessionUser = null;
  var unsubAuth = null;

  /** Seed paper wallet — majors only; other coins start at 0 on first use */
  var DEFAULT_BALANCES = {
    USDT: 2500,
    USDC: 0,
    BTC: 0.05,
    ETH: 1.2,
    SOL: 15,
    BNB: 2,
    XRP: 200,
  };

  var ASSET_RE = /^[A-Z0-9]{2,12}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ------------------------------------------------------------------ */
  /* Config / bootstrap                                                 */
  /* ------------------------------------------------------------------ */

  function cfg() {
    return global.WUNNAX_FIREBASE || {};
  }

  function enabled() {
    if (typeof global.WUNNAX_FIREBASE_ENABLED === "function") {
      return global.WUNNAX_FIREBASE_ENABLED();
    }
    var c = cfg();
    return !!(c.apiKey && c.projectId && String(c.apiKey).length > 10);
  }

  function getAuth() {
    return auth;
  }

  function getDb() {
    return db;
  }

  function ts() {
    return global.firebase.firestore.FieldValue.serverTimestamp();
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
      try {
        // Keep session across page loads so login → home still recognizes the user
        auth.setPersistence(global.firebase.auth.Auth.Persistence.LOCAL);
      } catch (_) {
        /* ignore */
      }
      try {
        db.settings({ ignoreUndefinedProperties: true });
      } catch (_) {
        /* settings may only be called once */
      }
      return app;
    } catch (e) {
      console.error("[WunnaxBackend] init failed", e);
      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Errors & validation                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Map Firebase / app errors to short UI messages.
   * @param {unknown} err
   * @returns {string}
   */
  function formatError(err) {
    if (!err) return "Something went wrong";
    var code = (err && err.code) || "";
    var msg = (err && err.message) || String(err);
    var map = {
      "auth/email-already-in-use": "An account with this email already exists",
      "auth/invalid-email": "Enter a valid email address",
      "auth/weak-password": "Password must be at least 6 characters",
      "auth/user-not-found": "No account found for that email",
      "auth/wrong-password": "Incorrect password",
      "auth/invalid-credential": "Incorrect email or password",
      "auth/too-many-requests": "Too many attempts — try again later",
      "auth/network-request-failed": "Network error — check your connection",
      "auth/popup-closed-by-user": "Sign-in popup was closed — try again",
      "auth/popup-blocked": "Popup blocked — allow popups or use redirect sign-in",
      "auth/cancelled-popup-request": "Sign-in was cancelled — try again",
      "auth/operation-not-supported-in-this-environment": "Popup not supported here — using full-page Google sign-in",
      "auth/unauthorized-domain":
        "This domain is not allowed. Firebase → Authentication → Settings → Authorized domains → add your Vercel host (e.g. xxx.vercel.app)",
      "auth/operation-not-allowed":
        "Google sign-in is off. Firebase → Authentication → Sign-in method → enable Google",
      "auth/redirect-uri-mismatch":
        "Google Cloud OAuth redirect URI mismatch. Add https://wunnaxswap.firebaseapp.com/__/auth/handler (and keep authDomain as firebaseapp.com)",
      "auth/invalid-continue-uri":
        "Invalid continue URL — check Firebase authorized domains include this site",
      "auth/user-disabled": "This account has been disabled",
      "auth/account-exists-with-different-credential":
        "An account already exists with this email using a different sign-in method",
      "auth/expired-action-code": "This reset code has expired. Request a new one.",
      "auth/invalid-action-code": "Invalid or already-used reset code. Request a new one.",
      "auth/missing-continue-uri": "Reset link configuration error. Contact support.",
      "auth/unauthorized-continue-uri":
        "Reset redirect domain not allowed. Add this site in Firebase authorized domains.",
      "permission-denied": "Permission denied — check Firestore rules",
      "unavailable": "Service temporarily unavailable",
    };
    if (map[code]) return map[code];
    if (/insufficient/i.test(msg)) return msg;
    if (/not authenticated/i.test(msg)) return "Please sign in first";
    if (/Firebase not configured/i.test(msg)) return "Backend not configured";
    // Strip noisy Firebase prefixes for cleaner toasts
    return msg.replace(/^Firebase:\s*/i, "").replace(/\s*\(.*\)\s*$/, "").trim() || "Request failed";
  }

  function fail(message, code) {
    var e = new Error(message);
    if (code) e.code = code;
    return e;
  }

  function requireAuthUser() {
    if (!sessionUser || !sessionUser.uid) {
      throw fail("Not authenticated", "auth/required");
    }
    return sessionUser;
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function normalizeAsset(asset) {
    var a = String(asset || "").trim().toUpperCase();
    if (!ASSET_RE.test(a)) throw fail("Invalid asset symbol", "invalid-asset");
    return a;
  }

  function normalizeAmount(n, label) {
    var v = Number(n);
    if (!isFinite(v) || v <= 0) {
      throw fail((label || "Amount") + " must be a positive number", "invalid-amount");
    }
    // Guard against float dust & abuse
    if (v > 1e12) throw fail("Amount too large", "invalid-amount");
    return v;
  }

  function validatePassword(password) {
    if (typeof password !== "string" || password.length < 6) {
      throw fail("Password must be at least 6 characters", "auth/weak-password");
    }
  }

  function validateEmail(email) {
    var e = normalizeEmail(email);
    if (!EMAIL_RE.test(e)) throw fail("Enter a valid email address", "auth/invalid-email");
    return e;
  }

  function cloneBalances(src) {
    var out = Object.assign({}, DEFAULT_BALANCES);
    if (src && typeof src === "object") {
      Object.keys(src).forEach(function (k) {
        var key = String(k).toUpperCase();
        var n = Number(src[k]);
        out[key] = isFinite(n) ? n : 0;
      });
    }
    return out;
  }

  function assertNonNegativeBalances(balances) {
    Object.keys(balances).forEach(function (k) {
      if (Number(balances[k]) < -1e-12) {
        throw fail("Insufficient " + k + " balance", "insufficient-balance");
      }
      if (balances[k] < 0) balances[k] = 0;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Profile / wallet                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * @param {firebase.User} user
   * @param {Object|null} profile
   * @returns {WunnaxUser|null}
   */
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

  function sub(uid, name) {
    return userDoc(uid).collection(name);
  }

  async function loadProfile(uid) {
    var snap = await userDoc(uid).get();
    return snap.exists ? snap.data() : null;
  }

  /**
   * Ensure users/{uid} exists with paper balances.
   * @param {string} [uid]
   * @returns {Promise<BalanceMap|null>}
   */
  async function ensureWallet(uid) {
    uid = uid || (sessionUser && sessionUser.uid);
    if (!uid || !db) return null;
    var ref = userDoc(uid);
    var snap = await ref.get();
    if (!snap.exists) {
      var seed = cloneBalances(null);
      await ref.set(
        {
          email: (sessionUser && sessionUser.email) || "",
          displayName:
            (sessionUser && sessionUser.displayName) ||
            ((sessionUser && sessionUser.email && sessionUser.email.split("@")[0]) || "Trader"),
          balances: seed,
          kycStatus: "none",
          createdAt: ts(),
          updatedAt: ts(),
        },
        { merge: true }
      );
      return seed;
    }
    var data = snap.data() || {};
    if (!data.balances || typeof data.balances !== "object") {
      var seeded = cloneBalances(null);
      await ref.set({ balances: seeded, updatedAt: ts() }, { merge: true });
      return seeded;
    }
    return cloneBalances(data.balances);
  }

  /* ------------------------------------------------------------------ */
  /* Auth lifecycle                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Initialize Firebase + subscribe once to auth state.
   * Safe to call multiple times — returns the same promise.
   * @returns {Promise<{enabled:boolean,user:firebase.User|null}>}
   */
  async function init() {
    if (initPromise) return initPromise;

    initPromise = new Promise(function (resolve) {
      if (!ensureApp()) {
        ready = true;
        resolve({ enabled: false, user: null });
        return;
      }

      var settled = false;
      unsubAuth = auth.onAuthStateChanged(function (user) {
        sessionUser = user || null;

        function finish(eventName) {
          ready = true;
          document.dispatchEvent(
            new CustomEvent("wunna:auth", {
              detail: { event: eventName, user: user || null },
            })
          );
          if (!settled) {
            settled = true;
            resolve({ enabled: true, user: user || null });
          }
        }

        if (user) {
          // Never let wallet setup block auth readiness / login redirect
          var walletDone = false;
          function doneWallet() {
            if (walletDone) return;
            walletDone = true;
            finish(settled ? "signed_in" : "ready");
          }
          Promise.resolve(ensureWallet(user.uid))
            .catch(function (e) {
              console.warn("[WunnaxBackend] ensureWallet", e);
            })
            .then(doneWallet);
          setTimeout(doneWallet, 1500);
        } else {
          finish(settled ? "signed_out" : "ready");
        }
      });
    });

    return initPromise;
  }

  /**
   * Wait until init() has completed (auth listener fired once).
   * @param {number} [timeoutMs=15000]
   * @returns {Promise<boolean>} true if backend enabled
   */
  function waitForReady(timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    if (ready) return Promise.resolve(enabled());
    return Promise.race([
      init().then(function (r) {
        return !!(r && r.enabled);
      }),
      new Promise(function (resolve) {
        setTimeout(function () {
          ready = true;
          resolve(enabled());
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * @param {string} email
   * @param {string} password
   * @param {string} [name]
   */
  async function signUp(email, password, name) {
    ensureApp();
    if (!auth) throw fail("Firebase not configured");
    email = validateEmail(email);
    validatePassword(password);
    name = String(name || "").trim() || email.split("@")[0];

    try {
      var cred = await auth.createUserWithEmailAndPassword(email, password);
      sessionUser = cred.user;
      if (name) {
        try {
          await cred.user.updateProfile({ displayName: name });
        } catch (_) {
          /* non-fatal */
        }
      }
      // Wallet profile is best-effort — never block signup redirect on Firestore
      try {
        Promise.resolve(
          userDoc(cred.user.uid).set(
            {
              email: email,
              displayName: name,
              balances: cloneBalances(null),
              kycStatus: "none",
              createdAt: ts(),
              updatedAt: ts(),
            },
            { merge: true }
          )
        ).catch(function (profileErr) {
          console.warn("[WunnaxBackend] signup profile (non-fatal)", profileErr);
        });
      } catch (profileErr) {
        console.warn("[WunnaxBackend] signup profile (non-fatal)", profileErr);
      }
      return { user: cred.user, session: true };
    } catch (e) {
      throw fail(formatError(e), e.code);
    }
  }

  /**
   * @param {string} email
   * @param {string} password
   */
  function tryLocalRecovery(email, password) {
    email = normalizeEmail(email);
    try {
      var expect = btoa(unescape(encodeURIComponent("wx|" + password))).slice(0, 48);
      var raw = localStorage.getItem("wunnax_recovery_" + email);
      if (!raw) {
        // Scan recovery keys
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("wunnax_recovery_") === 0) {
            try {
              var s = JSON.parse(localStorage.getItem(k) || "null");
              if (s && s.check === expect) {
                raw = localStorage.getItem(k);
                break;
              }
            } catch (_) {}
          }
        }
      }
      if (!raw) return null;
      var stored = JSON.parse(raw);
      if (!stored || stored.check !== expect) return null;
      var name = (stored.email || email).split("@")[0] || "Trader";
      sessionUser = {
        uid: "recovery_local",
        email: stored.email || email,
        displayName: name,
      };
      return {
        user: sessionUser,
        session: true,
        recovery: true,
        profile: {
          name: name,
          email: stored.email || email,
          provider: "email",
          backend: "recovery",
        },
      };
    } catch (_) {
      return null;
    }
  }

  async function signIn(email, password) {
    ensureApp();
    email = validateEmail(email);
    if (!password) throw fail("Password required", "auth/weak-password");

    // Instant path: password set via OTP recovery on this browser
    var localRec = tryLocalRecovery(email, password);
    if (localRec) return localRec;

    if (!auth) {
      // Still allow recovery without Firebase auth object
      var again = tryLocalRecovery(email, password);
      if (again) return again;
      throw fail("Firebase not configured");
    }

    try {
      var cred = await auth.signInWithEmailAndPassword(email, password);
      sessionUser = cred.user;
      try {
        Promise.resolve(ensureWallet(cred.user.uid)).catch(function (wErr) {
          console.warn("[WunnaxBackend] signIn wallet (non-fatal)", wErr);
        });
      } catch (wErr) {
        console.warn("[WunnaxBackend] signIn wallet (non-fatal)", wErr);
      }
      // Keep a recovery mirror so future logins work even if Firebase flakes
      try {
        localStorage.setItem(
          "wunnax_recovery_" + email,
          JSON.stringify({
            email: email,
            check: btoa(unescape(encodeURIComponent("wx|" + password))).slice(0, 48),
            at: Date.now(),
          })
        );
      } catch (_) {}
      return { user: cred.user, session: true };
    } catch (e) {
      // Recovery API (password reset via OTP)
      try {
        var rec = await fetch("/api/login-recovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, password: password }),
        });
        if (rec.ok) {
          var body = await rec.json();
          if (body && body.ok && body.user) {
            sessionUser = {
              uid: body.user.id,
              email: body.user.email,
              displayName: body.user.name,
            };
            return {
              user: sessionUser,
              session: true,
              recovery: true,
              profile: body.user,
            };
          }
        }
      } catch (recErr) {
        console.warn("[WunnaxBackend] recovery login", recErr);
      }

      var local2 = tryLocalRecovery(email, password);
      if (local2) return local2;

      throw fail(formatError(e), e.code);
    }
  }

  /**
   * Email a password-reset message (Firebase Auth).
   * The email includes a secure link / oobCode the user uses to set a new password.
   * @param {string} email
   * @returns {Promise<{sent:boolean,email:string}>}
   */
  async function sendPasswordReset(email) {
    ensureApp();
    if (!auth) throw fail("Firebase not configured");
    email = validateEmail(email);

    var continueUrl = "/reset-password.html";
    try {
      continueUrl = (location.origin || "") + "/reset-password.html";
    } catch (_) {}

    var actionCodeSettings = {
      url: continueUrl,
      handleCodeInApp: false,
    };

    try {
      await auth.sendPasswordResetEmail(email, actionCodeSettings);
      try {
        sessionStorage.setItem("wunnax_reset_email", email);
      } catch (_) {}
      return { sent: true, email: email };
    } catch (e) {
      var code = (e && e.code) || "";
      // Avoid account enumeration: treat missing user like a successful send
      if (code === "auth/user-not-found") {
        try {
          sessionStorage.setItem("wunnax_reset_email", email);
        } catch (_) {}
        return { sent: true, email: email };
      }
      throw fail(formatError(e), code);
    }
  }

  /**
   * Check a password-reset oobCode from the email link.
   * @param {string} oobCode
   * @returns {Promise<{email:string}>}
   */
  async function verifyPasswordResetCode(oobCode) {
    ensureApp();
    if (!auth) throw fail("Firebase not configured");
    oobCode = String(oobCode || "").trim();
    if (!oobCode) throw fail("Enter the reset code from your email", "auth/invalid-action-code");
    try {
      var email = await auth.verifyPasswordResetCode(oobCode);
      return { email: email };
    } catch (e) {
      throw fail(formatError(e), e.code);
    }
  }

  /**
   * Complete password reset with the email oobCode + new password.
   * @param {string} oobCode
   * @param {string} newPassword
   */
  async function confirmPasswordReset(oobCode, newPassword) {
    ensureApp();
    if (!auth) throw fail("Firebase not configured");
    oobCode = String(oobCode || "").trim();
    if (!oobCode) throw fail("Enter the reset code from your email", "auth/invalid-action-code");
    validatePassword(newPassword);
    try {
      await auth.confirmPasswordReset(oobCode, newPassword);
      try {
        sessionStorage.removeItem("wunnax_reset_email");
      } catch (_) {}
      return { ok: true };
    } catch (e) {
      throw fail(formatError(e), e.code);
    }
  }

  function googleProvider() {
    var provider = new global.firebase.auth.GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }

  function prefersOAuthRedirect() {
    // Mobile / in-app browsers: redirect is more reliable than popup.
    // Desktop: prefer popup so we can finish login → home without a full page bounce.
    try {
      var ua = navigator.userAgent || "";
      return /Android|iPhone|iPad|iPod|Mobile|Instagram|FBAN|FBAV/i.test(ua);
    } catch (_) {
      return false;
    }
  }

  /**
   * After Google redirect returns to this origin, finish session + return user.
   * Never blocks on Firestore.
   * @returns {Promise<{user: firebase.User}|null>}
   */
  async function completeRedirectSignIn() {
    ensureApp();
    if (!auth) return null;
    try {
      var result = await auth.getRedirectResult();
      if (result && result.user) {
        sessionUser = result.user;
        // Non-blocking wallet/profile setup
        Promise.resolve(ensureUserAfterOAuth(result.user)).catch(function () {});
        return { user: result.user, via: "redirect" };
      }
      if (auth.currentUser) {
        sessionUser = auth.currentUser;
        Promise.resolve(ensureUserAfterOAuth(auth.currentUser)).catch(function () {});
        return { user: auth.currentUser, via: "currentUser" };
      }
      return null;
    } catch (e) {
      if (e && (e.code === "auth/no-auth-event" || e.code === "auth/argument-error")) {
        if (auth.currentUser) {
          sessionUser = auth.currentUser;
          Promise.resolve(ensureUserAfterOAuth(auth.currentUser)).catch(function () {});
          return { user: auth.currentUser, via: "currentUser" };
        }
        return null;
      }
      try {
        sessionStorage.setItem(
          "wunnax_auth_error",
          formatError(e) + (e.code ? " [" + e.code + "]" : "")
        );
      } catch (_) {}
      throw fail(formatError(e), e.code);
    }
  }

  async function ensureUserAfterOAuth(user) {
    if (!user || !user.uid) return;
    // Never fail Google login if Firestore is slow/rules missing — session still valid
    try {
      var profile = await loadProfile(user.uid);
      if (!profile) {
        await userDoc(user.uid).set(
          {
            email: user.email || "",
            displayName: user.displayName || (user.email || "Trader").split("@")[0],
            balances: cloneBalances(null),
            kycStatus: "none",
            createdAt: ts(),
            updatedAt: ts(),
          },
          { merge: true }
        );
      } else {
        await ensureWallet(user.uid);
      }
    } catch (e) {
      console.warn("[WunnaxBackend] ensureUserAfterOAuth (non-fatal)", e);
    }
  }

  /**
   * Google OAuth via popup (desktop) or redirect (mobile).
   * Always resolves with user or redirecting — wallet setup is non-blocking.
   * @param {"google"} providerName
   * @param {{forceRedirect?: boolean, forcePopup?: boolean}} [opts]
   * @returns {Promise<{user?: firebase.User, redirecting?: boolean}>}
   */
  async function signInWithOAuth(providerName, opts) {
    ensureApp();
    if (!auth) throw fail("Firebase not configured");
    opts = opts || {};
    if (providerName !== "google") {
      throw fail("Enable this provider in Firebase Console first", "auth/operation-not-allowed");
    }
    var provider = googleProvider();
    var useRedirect =
      opts.forcePopup === true
        ? false
        : opts.forceRedirect === true
          ? true
          : prefersOAuthRedirect();

    async function viaRedirect() {
      try {
        sessionStorage.setItem("wunnax_google_oauth", "1");
        sessionStorage.setItem("wunnax_google_return", location.pathname || "/signin.html");
      } catch (_) {}
      await auth.signInWithRedirect(provider);
      return { redirecting: true };
    }

    if (useRedirect) {
      try {
        return await viaRedirect();
      } catch (e) {
        throw fail(formatError(e), e.code);
      }
    }

    try {
      var cred = await auth.signInWithPopup(provider);
      sessionUser = cred.user;
      // Do not await Firestore — login must finish immediately
      Promise.resolve(ensureUserAfterOAuth(cred.user)).catch(function () {});
      return { user: cred.user, via: "popup" };
    } catch (e) {
      var code = (e && e.code) || "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/internal-error"
      ) {
        try {
          return await viaRedirect();
        } catch (e2) {
          throw fail(formatError(e2), e2.code);
        }
      }
      if (code === "auth/popup-closed-by-user") {
        throw fail(formatError(e), code);
      }
      throw fail(formatError(e), code);
    }
  }

  async function signOut() {
    if (!auth) return;
    await auth.signOut();
    sessionUser = null;
  }

  /** @returns {Promise<WunnaxUser|null>} */
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
    if ((auth && auth.currentUser) || sessionUser) return true;
    // Session flag set by login / recovery
    try {
      if (localStorage.getItem("wunnax_session") === "1") return true;
    } catch (_) {}
    // During page navigation Firebase may not have rehydrated yet — trust persisted user
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("firebase:authUser:") === 0) {
          var raw = localStorage.getItem(k);
          if (raw && raw.indexOf('"uid"') !== -1) return true;
        }
      }
    } catch (_) {}
    return false;
  }

  /**
   * Update display name / avatar on profile (owner only).
   * @param {{displayName?:string,avatarUrl?:string|null}} patch
   */
  async function updateProfile(patch) {
    var user = requireAuthUser();
    patch = patch || {};
    var data = { updatedAt: ts() };
    if (patch.displayName != null) {
      data.displayName = String(patch.displayName).trim().slice(0, 80);
      try {
        await user.updateProfile({ displayName: data.displayName });
      } catch (_) {
        /* ignore */
      }
    }
    if (patch.avatarUrl !== undefined) {
      data.avatarUrl = patch.avatarUrl ? String(patch.avatarUrl).slice(0, 500) : null;
    }
    await userDoc(user.uid).set(data, { merge: true });
    return getSessionUser();
  }

  /* ------------------------------------------------------------------ */
  /* Balances & ledger                                                  */
  /* ------------------------------------------------------------------ */

  /** @returns {Promise<BalanceMap|null>} */
  async function getBalancesMap() {
    if (!sessionUser || !db) return null;
    var bal = await ensureWallet(sessionUser.uid);
    var map = {};
    Object.keys(bal || {}).forEach(function (k) {
      map[k] = Number(bal[k]) || 0;
    });
    return map;
  }

  /**
   * Atomically apply delta to one asset (can be negative for debit).
   * @param {string} asset
   * @param {number} delta
   * @returns {Promise<BalanceMap>}
   */
  async function adjustBalance(asset, delta) {
    var user = requireAuthUser();
    asset = normalizeAsset(asset);
    delta = Number(delta);
    if (!isFinite(delta) || delta === 0) throw fail("Invalid balance delta", "invalid-amount");

    var nextBalances = null;
    var ref = userDoc(user.uid);
    await db.runTransaction(async function (tx) {
      var snap = await tx.get(ref);
      var data = snap.exists ? snap.data() : {};
      var balances = cloneBalances(data.balances);
      balances[asset] = Number(balances[asset] || 0) + delta;
      assertNonNegativeBalances(balances);
      nextBalances = balances;
      tx.set(ref, { balances: balances, updatedAt: ts() }, { merge: true });
    });
    return nextBalances;
  }

  /**
   * Append immutable ledger entry under users/{uid}/ledger.
   * @param {string} kind
   * @param {string} asset
   * @param {number} amount
   * @param {Object} [meta]
   */
  async function writeLedger(kind, asset, amount, meta) {
    if (!sessionUser) return null;
    var ref = await sub(sessionUser.uid, "ledger").add({
      kind: String(kind || "unknown"),
      asset: normalizeAsset(asset),
      amount: Number(amount) || 0,
      meta: meta && typeof meta === "object" ? meta : {},
      createdAt: ts(),
    });
    return ref.id;
  }

  /**
   * Paper deposit credit (demo faucet).
   * @param {string} asset
   * @param {number} amount
   */
  async function creditDemo(asset, amount) {
    requireAuthUser();
    asset = normalizeAsset(asset);
    amount = normalizeAmount(amount, "Deposit amount");
    await adjustBalance(asset, amount);
    var ledgerId = await writeLedger("demo_credit", asset, amount, { source: "deposit_ui" });
    return { ok: true, asset: asset, amount: amount, ledger_id: ledgerId };
  }

  /**
   * @param {number} [limit]
   * @returns {Promise<Array>}
   */
  async function listLedger(limit) {
    if (!sessionUser) return [];
    try {
      var snap = await sub(sessionUser.uid, "ledger")
        .orderBy("createdAt", "desc")
        .limit(limit || 50)
        .get();
      return snap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
    } catch (e) {
      console.warn("[WunnaxBackend] listLedger", e);
      return [];
    }
  }

  /* ------------------------------------------------------------------ */
  /* Trading: swap / orders                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Instant swap: debit send, credit recv, record swap + ledger.
   * Balance mutation is transactional; history docs are best-effort after.
   *
   * @param {string} send
   * @param {string} recv
   * @param {number} sendAmt
   * @param {number} recvAmt
   * @param {number} [fee]
   * @param {number|null} [rate]
   */
  async function executeSwap(send, recv, sendAmt, recvAmt, fee, rate) {
    var user = requireAuthUser();
    send = normalizeAsset(send);
    recv = normalizeAsset(recv);
    sendAmt = normalizeAmount(sendAmt, "Send amount");
    recvAmt = normalizeAmount(recvAmt, "Receive amount");
    if (send === recv) throw fail("Assets must differ", "invalid-pair");

    var uid = user.uid;
    var ref = userDoc(uid);
    var swapRef = sub(uid, "swaps").doc();

    await db.runTransaction(async function (tx) {
      var snap = await tx.get(ref);
      var data = snap.exists ? snap.data() : {};
      var balances = cloneBalances(data.balances);
      if (Number(balances[send] || 0) < sendAmt) {
        throw fail("Insufficient " + send + " balance", "insufficient-balance");
      }
      balances[send] = Number(balances[send] || 0) - sendAmt;
      balances[recv] = Number(balances[recv] || 0) + recvAmt;
      assertNonNegativeBalances(balances);

      tx.set(ref, { balances: balances, updatedAt: ts() }, { merge: true });
      tx.set(swapRef, {
        sendAsset: send,
        recvAsset: recv,
        sendAmount: sendAmt,
        recvAmount: recvAmt,
        feeAmount: Number(fee) || 0,
        rate: rate != null ? Number(rate) : null,
        createdAt: ts(),
      });
    });

    try {
      await writeLedger("swap_out", send, -sendAmt, { swapId: swapRef.id });
      await writeLedger("swap_in", recv, recvAmt, { swapId: swapRef.id });
    } catch (e) {
      console.warn("[WunnaxBackend] swap ledger", e);
    }

    return { ok: true, swap_id: swapRef.id };
  }

  /**
   * @param {{
   *   side: string,
   *   baseAsset: string,
   *   quoteAsset?: string,
   *   price: number,
   *   amount: number,
   *   pair?: string,
   *   marketType?: string,
   *   orderType?: string
   * }} opts
   */
  async function placeOrder(opts) {
    var user = requireAuthUser();
    opts = opts || {};
    var side = String(opts.side || "").toLowerCase();
    var base = normalizeAsset(opts.baseAsset);
    var quote = normalizeAsset(opts.quoteAsset || "USDT");
    var px = normalizeAmount(opts.price, "Price");
    var qty = normalizeAmount(opts.amount, "Amount");
    var cost = px * qty;
    var uid = user.uid;
    var ref = userDoc(uid);
    var orderRef = sub(uid, "orders").doc();

    await db.runTransaction(async function (tx) {
      var snap = await tx.get(ref);
      var data = snap.exists ? snap.data() : {};
      var balances = cloneBalances(data.balances);

      if (side === "buy" || side === "long") {
        if (Number(balances[quote] || 0) < cost) {
          throw fail("Insufficient " + quote, "insufficient-balance");
        }
        balances[quote] = Number(balances[quote] || 0) - cost;
        if (side === "buy") balances[base] = Number(balances[base] || 0) + qty;
      } else if (side === "sell" || side === "short") {
        if (side === "sell") {
          if (Number(balances[base] || 0) < qty) {
            throw fail("Insufficient " + base, "insufficient-balance");
          }
          balances[base] = Number(balances[base] || 0) - qty;
        }
        balances[quote] = Number(balances[quote] || 0) + cost;
      } else {
        throw fail("Invalid side", "invalid-side");
      }

      assertNonNegativeBalances(balances);
      tx.set(ref, { balances: balances, updatedAt: ts() }, { merge: true });
      tx.set(orderRef, {
        side: side,
        marketType: opts.marketType || "spot",
        pair: opts.pair || base + "_" + quote,
        orderType: opts.orderType || "market",
        price: px,
        amount: qty,
        status: "filled",
        meta: { base: base, quote: quote, cost: cost },
        createdAt: ts(),
      });
    });

    try {
      await writeLedger("order_" + side, base, side === "buy" ? qty : -qty, {
        orderId: orderRef.id,
        pair: opts.pair || base + "_" + quote,
        price: px,
      });
    } catch (e) {
      console.warn("[WunnaxBackend] order ledger", e);
    }

    return { ok: true, order_id: orderRef.id };
  }

  /** @param {number} [limit] */
  async function listOrders(limit) {
    if (!sessionUser) return [];
    try {
      var snap = await sub(sessionUser.uid, "orders")
        .orderBy("createdAt", "desc")
        .limit(limit || 50)
        .get();
      return snap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
    } catch (e) {
      console.warn("[WunnaxBackend] listOrders", e);
      return [];
    }
  }

  /** @param {number} [limit] */
  async function listSwaps(limit) {
    if (!sessionUser) return [];
    try {
      var snap = await sub(sessionUser.uid, "swaps")
        .orderBy("createdAt", "desc")
        .limit(limit || 50)
        .get();
      return snap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
    } catch (e) {
      console.warn("[WunnaxBackend] listSwaps", e);
      return [];
    }
  }

  /* ------------------------------------------------------------------ */
  /* Earn / staking                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Lock asset into an active stake (paper).
   * @param {string} asset
   * @param {number} amount
   * @param {string} [plan]
   * @param {number} [apr]
   */
  async function openStake(asset, amount, plan, apr) {
    var user = requireAuthUser();
    asset = normalizeAsset(asset);
    amount = normalizeAmount(amount, "Stake amount");
    apr = Number(apr);
    if (!isFinite(apr) || apr < 0 || apr > 100) apr = 5;

    var uid = user.uid;
    var ref = userDoc(uid);
    var stakeRef = sub(uid, "stakes").doc();

    await db.runTransaction(async function (tx) {
      var snap = await tx.get(ref);
      var data = snap.exists ? snap.data() : {};
      var balances = cloneBalances(data.balances);
      if (Number(balances[asset] || 0) < amount) {
        throw fail("Insufficient " + asset + " balance", "insufficient-balance");
      }
      balances[asset] = Number(balances[asset] || 0) - amount;
      assertNonNegativeBalances(balances);
      tx.set(ref, { balances: balances, updatedAt: ts() }, { merge: true });
      tx.set(stakeRef, {
        asset: asset,
        amount: amount,
        planLabel: String(plan || "flexible").slice(0, 40),
        apr: apr,
        status: "active",
        startedAt: ts(),
      });
    });

    try {
      await writeLedger("stake_lock", asset, -amount, { stakeId: stakeRef.id });
    } catch (e) {
      console.warn("[WunnaxBackend] stake ledger", e);
    }

    return { ok: true, stake_id: stakeRef.id };
  }

  /**
   * Unlock stake principal back to wallet (no interest calc in paper mode).
   * @param {string} stakeId
   */
  async function closeStake(stakeId) {
    var user = requireAuthUser();
    stakeId = String(stakeId || "");
    if (!stakeId) throw fail("Stake id required", "invalid-id");

    var stakeRef = sub(user.uid, "stakes").doc(stakeId);
    var userRef = userDoc(user.uid);
    var asset = null;
    var amount = 0;

    await db.runTransaction(async function (tx) {
      var stakeSnap = await tx.get(stakeRef);
      if (!stakeSnap.exists) throw fail("Stake not found", "not-found");
      var s = stakeSnap.data();
      if (s.status !== "active") throw fail("Stake not active", "invalid-state");
      asset = normalizeAsset(s.asset);
      amount = Number(s.amount);
      if (!(amount > 0)) throw fail("Invalid stake amount", "invalid-amount");

      var userSnap = await tx.get(userRef);
      var data = userSnap.exists ? userSnap.data() : {};
      var balances = cloneBalances(data.balances);
      balances[asset] = Number(balances[asset] || 0) + amount;
      tx.set(userRef, { balances: balances, updatedAt: ts() }, { merge: true });
      tx.update(stakeRef, { status: "closed", closedAt: ts() });
    });

    try {
      await writeLedger("stake_unlock", asset, amount, { stakeId: stakeId });
    } catch (e) {
      console.warn("[WunnaxBackend] unstake ledger", e);
    }

    return { ok: true, stake_id: stakeId, asset: asset, amount: amount };
  }

  async function listStakes() {
    if (!sessionUser) return [];
    try {
      var snap = await sub(sessionUser.uid, "stakes").where("status", "==", "active").get();
      return snap.docs.map(function (d) {
        var x = d.data();
        return {
          id: d.id,
          asset: x.asset,
          amount: Number(x.amount),
          apr: Number(x.apr || 0),
          term: x.planLabel || "flexible",
          started:
            x.startedAt && x.startedAt.toDate
              ? x.startedAt.toDate().toLocaleString()
              : "—",
        };
      });
    } catch (e) {
      console.warn("[WunnaxBackend] listStakes", e);
      return [];
    }
  }

  /* ------------------------------------------------------------------ */
  /* Favorites & deposit addresses                                      */
  /* ------------------------------------------------------------------ */

  async function getFavorites() {
    if (!sessionUser) return [];
    try {
      var snap = await sub(sessionUser.uid, "favorites").get();
      return snap.docs.map(function (d) {
        return d.id;
      });
    } catch (e) {
      return [];
    }
  }

  /**
   * @param {string} symbol
   * @returns {Promise<string[]>}
   */
  async function toggleFavorite(symbol) {
    requireAuthUser();
    symbol = normalizeAsset(symbol);
    var ref = sub(sessionUser.uid, "favorites").doc(symbol);
    var snap = await ref.get();
    if (snap.exists) await ref.delete();
    else await ref.set({ symbol: symbol, createdAt: ts() });
    return getFavorites();
  }

  /**
   * Store a demo deposit address record (not on-chain).
   * @param {string} asset
   * @param {string} network
   * @param {string} address
   */
  async function saveDepositAddress(asset, network, address) {
    requireAuthUser();
    asset = normalizeAsset(asset);
    address = String(address || "").trim();
    if (!address || address.length < 8) throw fail("Invalid address", "invalid-address");
    await sub(sessionUser.uid, "depositAddresses").add({
      asset: asset,
      network: String(network || "demo").slice(0, 40),
      address: address.slice(0, 200),
      createdAt: ts(),
    });
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                         */
  /* ------------------------------------------------------------------ */

  global.WunnaxBackend = {
    /** @returns {boolean} */
    enabled: enabled,
    /** Bootstrap auth listener (idempotent). */
    init: init,
    /** @returns {boolean} */
    isReady: function () {
      return ready;
    },
    waitForReady: waitForReady,
    formatError: formatError,

    getClient: getDb,
    getAuth: getAuth,

    signUp: signUp,
    signIn: signIn,
    sendPasswordReset: sendPasswordReset,
    verifyPasswordResetCode: verifyPasswordResetCode,
    confirmPasswordReset: confirmPasswordReset,
    /** Prefer WunnaxEmailOtp.requestOtp for 6-digit email codes */
    requestEmailOtp: function (email) {
      if (global.WunnaxEmailOtp && WunnaxEmailOtp.requestOtp) {
        return WunnaxEmailOtp.requestOtp(email);
      }
      return sendPasswordReset(email);
    },
    signInWithOAuth: signInWithOAuth,
    completeRedirectSignIn: completeRedirectSignIn,
    signOut: signOut,
    getSessionUser: getSessionUser,
    isAuthed: isAuthed,
    updateProfile: updateProfile,

    ensureWallet: function () {
      return ensureWallet();
    },
    getBalancesMap: getBalancesMap,
    creditDemo: creditDemo,
    listLedger: listLedger,

    executeSwap: executeSwap,
    placeOrder: placeOrder,
    listOrders: listOrders,
    listSwaps: listSwaps,

    openStake: openStake,
    closeStake: closeStake,
    listStakes: listStakes,

    getFavorites: getFavorites,
    toggleFavorite: toggleFavorite,
    saveDepositAddress: saveDepositAddress,

    /** Exposed for tests / tooling */
    DEFAULT_BALANCES: Object.assign({}, DEFAULT_BALANCES),
  };
})(window);
