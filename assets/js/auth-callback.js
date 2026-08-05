/**
 * Mobile-safe Google OAuth bridge.
 *
 * Flow:
 *  1) /auth-callback.html?start=google  → start signInWithRedirect
 *  2) Google returns to this same page → getRedirectResult once
 *  3) Save session → hard navigate to home (never leave user on login)
 */
(function () {
  "use strict";

  var HOME = "/index.html";
  var LS_PENDING = "wunnax_oauth_pending";
  var LS_PENDING_AT = "wunnax_oauth_pending_at";
  var done = false;

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(title, text, isError) {
    var t = $("cbTitle");
    var p = $("cbText");
    var err = $("cbError");
    var spin = $("cbSpin");
    var back = $("cbSignIn");
    if (t) t.textContent = title || "";
    if (p) p.textContent = text || "";
    if (isError) {
      if (spin) spin.style.display = "none";
      if (err) {
        err.hidden = false;
        err.removeAttribute("hidden");
        err.textContent = text || title;
        err.style.display = "block";
      }
      if (back) back.style.display = "inline-flex";
    }
  }

  function markPending() {
    try {
      localStorage.setItem(LS_PENDING, "1");
      localStorage.setItem(LS_PENDING_AT, String(Date.now()));
    } catch (_) {}
  }

  function clearPending() {
    try {
      localStorage.removeItem(LS_PENDING);
      localStorage.removeItem(LS_PENDING_AT);
      sessionStorage.removeItem("wunnax_google_oauth");
    } catch (_) {}
  }

  function saveSession(user) {
    try {
      var email = ((user && user.email) || "").toLowerCase();
      var name =
        (user && user.displayName) ||
        (email ? email.split("@")[0] : "Trader");
      localStorage.setItem("wunnax_session", "1");
      localStorage.setItem(
        "wunnax_user",
        JSON.stringify({
          name: name,
          email: email || "google-user",
          provider: "google",
          backend: "firebase-google",
        })
      );
      sessionStorage.setItem("wunnax_just_logged_in", "1");
    } catch (_) {}
  }

  function goHome() {
    if (done) return;
    done = true;
    clearPending();
    setStatus("Login successful", "Opening home…", false);
    var url = HOME;
    try {
      url = (location.origin || "") + HOME;
    } catch (_) {}
    setTimeout(function () {
      try {
        window.location.replace(url);
      } catch (_) {
        window.location.href = url;
      }
    }, 200);
    setTimeout(function () {
      if (!/index\.html|^\/$|\/$/.test(location.pathname || "")) {
        window.location.href = HOME;
      }
    }, 900);
  }

  function fail(msg) {
    if (done) return;
    done = true;
    clearPending();
    setStatus("Google sign-in failed", msg || "Try again or use email sign-in.", true);
  }

  function ensureFirebase() {
    if (!window.firebase || !firebase.auth) throw new Error("Firebase SDK not loaded");
    if (!firebase.apps || !firebase.apps.length) {
      if (!window.WUNNAX_FIREBASE) throw new Error("Firebase config missing");
      firebase.initializeApp(window.WUNNAX_FIREBASE);
    }
    var auth = firebase.auth();
    try {
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (_) {}
    return auth;
  }

  function startGoogleRedirect() {
    setStatus("Continue with Google", "Redirecting to Google…", false);
    markPending();
    var auth = ensureFirebase();
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: "select_account" });
    return auth.signInWithRedirect(provider);
  }

  function finishFromUser(user) {
    if (!user) return false;
    saveSession(user);
    if (window.WunnaxBackend) {
      try {
        if (WunnaxBackend.init) WunnaxBackend.init().catch(function () {});
      } catch (_) {}
    }
    goHome();
    return true;
  }

  /**
   * getRedirectResult must be called once only.
   */
  function completeRedirect() {
    setStatus("Signing you in…", "Finishing Google sign-in…", false);
    markPending();

    var auth;
    try {
      auth = ensureFirebase();
    } catch (e) {
      fail((e && e.message) || "Auth not ready");
      return;
    }

    // Prefer backend helper if available (same single call path)
    var resultPromise;
    if (window.WunnaxBackend && typeof WunnaxBackend.completeRedirectSignIn === "function") {
      try {
        if (WunnaxBackend.init) {
          resultPromise = WunnaxBackend.init().then(function () {
            return WunnaxBackend.completeRedirectSignIn();
          });
        } else {
          resultPromise = WunnaxBackend.completeRedirectSignIn();
        }
      } catch (_) {
        resultPromise = auth.getRedirectResult().then(function (r) {
          return r && r.user ? { user: r.user } : null;
        });
      }
    } else {
      resultPromise = auth.getRedirectResult().then(function (r) {
        return r && r.user ? { user: r.user } : null;
      });
    }

    var settled = false;
    function onceUser(user) {
      if (settled) return;
      if (user) {
        settled = true;
        finishFromUser(user);
      }
    }

    // Auth state often fires before/around getRedirectResult on mobile
    var unsub = auth.onAuthStateChanged(function (user) {
      if (user) onceUser(user);
    });

    Promise.resolve(resultPromise)
      .then(function (res) {
        var user = (res && res.user) || auth.currentUser || null;
        if (user) {
          onceUser(user);
          return;
        }
        // Wait briefly for delayed rehydrate on mobile Safari
        return new Promise(function (resolve) {
          var n = 0;
          var t = setInterval(function () {
            n++;
            if (auth.currentUser) {
              clearInterval(t);
              onceUser(auth.currentUser);
              resolve(true);
              return;
            }
            if (n >= 20) {
              clearInterval(t);
              resolve(false);
            }
          }, 250);
        });
      })
      .then(function (ok) {
        if (settled) return;
        if (!ok && !auth.currentUser) {
          try {
            if (typeof unsub === "function") unsub();
          } catch (_) {}
          fail(
            "Google sign-in did not complete. On mobile, allow cookies/popups for this site, then try again — or use email sign-in."
          );
        }
      })
      .catch(function (err) {
        console.error("[auth-callback]", err);
        if (auth.currentUser) {
          onceUser(auth.currentUser);
          return;
        }
        var msg = (err && err.message) || "Google sign-in failed.";
        if (err && err.code === "auth/unauthorized-domain") {
          msg =
            "This domain is not authorized in Firebase. Add wunnaxswap.vercel.app under Authentication → Settings → Authorized domains.";
        }
        if (err && (err.code === "auth/operation-not-allowed" || /operation-not-allowed/i.test(msg))) {
          msg = "Google sign-in is disabled in Firebase Console. Enable Google under Sign-in method.";
        }
        fail(msg);
      });

    // Absolute failsafe: if we somehow got a session flag already
    setTimeout(function () {
      if (settled) return;
      try {
        if (localStorage.getItem("wunnax_session") === "1" && auth.currentUser) {
          onceUser(auth.currentUser);
        }
      } catch (_) {}
    }, 6000);
  }

  function boot() {
    var params;
    try {
      params = new URLSearchParams(location.search || "");
    } catch (_) {
      params = { get: function () { return null; } };
    }

    // Start OAuth from this dedicated page (best for mobile)
    if (params.get("start") === "google") {
      startGoogleRedirect().catch(function (err) {
        console.error("[auth-callback] start", err);
        fail((err && err.message) || "Could not open Google sign-in.");
      });
      return;
    }

    // Returning from Google (or direct visit after redirect)
    completeRedirect();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
