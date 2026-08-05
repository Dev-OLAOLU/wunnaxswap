/**
 * Standalone sign-in / sign-up page logic.
 * Sign in → "Login successful" → home. Never hangs.
 */
(function () {
  "use strict";

  var HOME = "/index.html";
  var REDIRECTING = false;

  function $(id) {
    return document.getElementById(id);
  }

  function homeUrl() {
    try {
      return (location.origin || "") + HOME;
    } catch (_) {
      return HOME;
    }
  }

  function showMsg(text, ok) {
    var el = $("authError");
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.setAttribute("hidden", "");
      el.textContent = "";
      el.style.display = "none";
      return;
    }
    el.hidden = false;
    el.removeAttribute("hidden");
    el.className = ok ? "auth-success" : "auth-error";
    el.textContent = text;
    el.style.display = "block";
  }

  function showSuccessOverlay(msg) {
    var existing = document.getElementById("wxLoginSuccess");
    if (existing) existing.remove();
    var ov = document.createElement("div");
    ov.id = "wxLoginSuccess";
    ov.setAttribute("role", "status");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;" +
      "background:rgba(7,11,20,.92);padding:1.25rem;text-align:center;";
    ov.innerHTML =
      '<div style="max-width:22rem;padding:1.75rem 1.5rem;border-radius:16px;' +
      "border:1px solid rgba(52,211,153,.5);background:rgba(6,78,59,.55);" +
      'box-shadow:0 20px 50px rgba(0,0,0,.45)">' +
      '<div style="font-size:2rem;line-height:1;margin-bottom:.65rem">✓</div>' +
      '<p style="margin:0;font-size:1.15rem;font-weight:700;color:#a7f3d0">' +
      (msg || "Login successful") +
      "</p>" +
      '<p style="margin:.55rem 0 0;font-size:.9rem;color:#6ee7b7">Opening home page…</p>' +
      "</div>";
    document.body.appendChild(ov);
  }

  function saveSession(email, name, backend) {
    try {
      localStorage.setItem("wunnax_session", "1");
      localStorage.setItem(
        "wunnax_user",
        JSON.stringify({
          name: name || (email && email.split("@")[0]) || "Trader",
          email: (email || "").toLowerCase(),
          provider: "email",
          backend: backend || "firebase",
        })
      );
      sessionStorage.setItem("wunnax_just_logged_in", "1");
    } catch (_) {}
  }

  function goHomeAfterSuccess(msg) {
    if (REDIRECTING) return;
    REDIRECTING = true;

    var text = msg || "Login successful";
    showMsg(text + " — opening home…", true);
    showSuccessOverlay(text);

    var url = homeUrl();

    setTimeout(function () {
      try {
        window.location.replace(url);
      } catch (_) {
        try {
          window.location.href = url;
        } catch (__) {
          window.location.assign(url);
        }
      }
    }, 400);

    setTimeout(function () {
      if (/signin|signup/i.test(location.pathname || "")) window.location.href = url;
    }, 1000);

    setTimeout(function () {
      if (/signin|signup/i.test(location.pathname || "")) window.location.assign(HOME);
    }, 1800);
  }

  function wrongPasswordMsg(err) {
    var code = (err && err.code) || "";
    var msg = (err && err.message) || "";
    var blob = code + " " + msg;
    if (
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      code === "auth/invalid-credential" ||
      code === "auth/invalid-login-credentials" ||
      /wrong-password|user-not-found|invalid-credential|INVALID_LOGIN|INVALID_PASSWORD|EMAIL_NOT_FOUND/i.test(
        blob
      )
    ) {
      return "Wrong email or password.";
    }
    if (code === "auth/invalid-email") return "Enter a valid email address.";
    if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
    if (code === "auth/network-request-failed") return "Network error. Check connection.";
    if (code === "auth/timeout") return "Sign-in timed out. Try again.";
    if (window.WunnaxBackend && WunnaxBackend.formatError) {
      return WunnaxBackend.formatError(err) || "Wrong email or password.";
    }
    return "Wrong email or password.";
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          var e = new Error(label || "Request timed out. Try again.");
          e.code = "auth/timeout";
          reject(e);
        }, ms || 8000);
      }),
    ]);
  }

  function recoveryCheck(email, pass) {
    email = String(email || "")
      .trim()
      .toLowerCase();
    var expect = "";
    try {
      expect = btoa(unescape(encodeURIComponent("wx|" + pass))).slice(0, 48);
    } catch (_) {
      return null;
    }

    // Exact key
    try {
      var keys = ["wunnax_recovery_" + email];
      // Scan all recovery keys (email case variants)
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("wunnax_recovery_") === 0) keys.push(k);
      }
      for (var j = 0; j < keys.length; j++) {
        var raw = localStorage.getItem(keys[j]);
        if (!raw) continue;
        try {
          var stored = JSON.parse(raw);
          if (stored && stored.check === expect) {
            var em = (stored.email || email || "").toLowerCase();
            var name = em.split("@")[0] || "Trader";
            return {
              user: { email: em, displayName: name, uid: "recovery_local" },
              session: true,
              recovery: true,
              profile: { name: name, email: em, provider: "email", backend: "recovery" },
            };
          }
        } catch (_) {}
      }
    } catch (_) {}
    return null;
  }

  function apiRecoveryLogin(email, pass) {
    return fetch("/api/login-recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: pass }),
    })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (body) {
        if (body && body.ok && body.user) {
          return {
            user: {
              uid: body.user.id,
              email: body.user.email,
              displayName: body.user.name,
            },
            session: true,
            recovery: true,
            profile: body.user,
          };
        }
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  function firebaseSignIn(email, pass) {
    if (!window.firebase || !firebase.auth) {
      return Promise.reject(Object.assign(new Error("Firebase not loaded"), { code: "auth/network-request-failed" }));
    }
    try {
      if (!firebase.apps || !firebase.apps.length) {
        if (window.WUNNAX_FIREBASE) firebase.initializeApp(window.WUNNAX_FIREBASE);
      }
    } catch (_) {}
    return firebase.auth().signInWithEmailAndPassword(email, pass).then(function (cred) {
      return { user: cred.user, session: true, recovery: false };
    });
  }

  /**
   * Full sign-in: recovery local → Firebase → recovery API → success/home
   */
  function doSignIn(email, pass) {
    email = String(email || "")
      .trim()
      .toLowerCase();

    // 1) Instant recovery (after password reset on this browser)
    var local = recoveryCheck(email, pass);
    if (local) return Promise.resolve(local);

    // 2) Firebase + recovery fallbacks
    var authPromise;
    if (window.WunnaxBackend && typeof WunnaxBackend.signIn === "function") {
      // Don't wait on long init — kick it off, then sign in
      try {
        if (typeof WunnaxBackend.init === "function") WunnaxBackend.init().catch(function () {});
      } catch (_) {}
      authPromise = WunnaxBackend.signIn(email, pass);
    } else {
      authPromise = firebaseSignIn(email, pass);
    }

    return withTimeout(authPromise, 6000, "Sign-in timed out. Try again.")
      .then(function (res) {
        return res || { user: { email: email }, session: true };
      })
      .catch(function (err) {
        // 3) Local recovery again (in case email casing differed earlier)
        var again = recoveryCheck(email, pass);
        if (again) return again;

        // 4) API recovery
        return withTimeout(apiRecoveryLogin(email, pass), 2500, "recovery-timeout").then(function (apiRes) {
          if (apiRes) return apiRes;
          throw err;
        });
      });
  }

  function firebaseSignUp(email, pass, name) {
    if (!window.firebase || !firebase.auth) {
      return Promise.reject(new Error("Firebase not loaded"));
    }
    if (!firebase.apps || !firebase.apps.length) {
      if (window.WUNNAX_FIREBASE) firebase.initializeApp(window.WUNNAX_FIREBASE);
    }
    return firebase
      .auth()
      .createUserWithEmailAndPassword(email, pass)
      .then(function (cred) {
        if (name && cred.user && cred.user.updateProfile) {
          return cred.user.updateProfile({ displayName: name }).then(function () {
            return { user: cred.user, session: true };
          });
        }
        return { user: cred.user, session: true };
      });
  }

  function wireSignIn() {
    var form = $("signinForm");
    if (!form || form.getAttribute("data-wx-wired") === "1") return;
    form.setAttribute("data-wx-wired", "1");

    form.addEventListener(
      "submit",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        if (REDIRECTING) return false;

        showMsg("", false);

        var email = ($("siEmail") && $("siEmail").value.trim()) || "";
        var pass = ($("siPass") && $("siPass").value) || "";
        var btn = $("siSubmit") || form.querySelector('button[type="submit"]');

        if (!email || !pass) {
          showMsg("Enter your email and password.", false);
          return false;
        }

        email = email.toLowerCase();

        if (btn) {
          btn.disabled = true;
          btn.textContent = "Signing in…";
        }

        var finished = false;
        function ok(res) {
          if (finished || REDIRECTING) return;
          finished = true;
          var name =
            (res && res.profile && res.profile.name) ||
            (res && res.user && (res.user.displayName || (res.user.email || email).split("@")[0])) ||
            email.split("@")[0];
          saveSession(email, name, res && res.recovery ? "recovery" : "firebase");
          goHomeAfterSuccess("Login successful");
        }
        function fail(err) {
          if (finished || REDIRECTING) return;
          finished = true;
          console.error("[auth-page] signIn", err);
          showMsg(wrongPasswordMsg(err), false);
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Sign in";
          }
        }

        // Hard cap — never stick on Signing in…
        setTimeout(function () {
          if (finished || REDIRECTING) return;
          var local = recoveryCheck(email, pass);
          if (local) {
            ok(local);
            return;
          }
          // Last resort: if Firebase currentUser appeared
          try {
            if (window.firebase && firebase.auth && firebase.auth().currentUser) {
              ok({ user: firebase.auth().currentUser, session: true });
              return;
            }
          } catch (_) {}
          fail(Object.assign(new Error("Sign-in timed out. Try again."), { code: "auth/timeout" }));
        }, 7000);

        doSignIn(email, pass).then(ok).catch(fail);
        return false;
      },
      true
    );
  }

  function wireSignUp() {
    var form = $("signupForm");
    if (!form || form.getAttribute("data-wx-wired") === "1") return;
    form.setAttribute("data-wx-wired", "1");

    form.addEventListener(
      "submit",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        if (REDIRECTING) return false;

        showMsg("", false);

        var name = ($("suName") && $("suName").value.trim()) || "";
        var email = (($("suEmail") && $("suEmail").value.trim()) || "").toLowerCase();
        var pass = ($("suPass") && $("suPass").value) || "";
        var pass2 = ($("suPass2") && $("suPass2").value) || "";
        var btn = form.querySelector('button[type="submit"]');

        if (!name || !email || !pass) {
          showMsg("Fill in name, email, and password.", false);
          return false;
        }
        if (pass.length < 6) {
          showMsg("Password must be at least 6 characters.", false);
          return false;
        }
        if (pass2 && pass !== pass2) {
          showMsg("Passwords do not match.", false);
          return false;
        }

        if (btn) {
          btn.disabled = true;
          btn.textContent = "Creating account…";
        }

        var p;
        if (window.WunnaxBackend && WunnaxBackend.signUp) {
          try {
            if (WunnaxBackend.init) WunnaxBackend.init().catch(function () {});
          } catch (_) {}
          p = WunnaxBackend.signUp(email, pass, name);
        } else {
          p = firebaseSignUp(email, pass, name);
        }

        withTimeout(p, 10000, "Sign-up timed out. Try again.")
          .then(function () {
            // Also store recovery so they can always sign back in on this browser
            try {
              localStorage.setItem(
                "wunnax_recovery_" + email,
                JSON.stringify({
                  email: email,
                  check: btoa(unescape(encodeURIComponent("wx|" + pass))).slice(0, 48),
                  at: Date.now(),
                })
              );
            } catch (_) {}
            saveSession(email, name, "firebase");
            goHomeAfterSuccess("Login successful");
          })
          .catch(function (err) {
            console.error("[auth-page] signUp", err);
            try {
              if (window.firebase && firebase.auth && firebase.auth().currentUser) {
                saveSession(email, name, "firebase");
                goHomeAfterSuccess("Login successful");
                return;
              }
            } catch (_) {}
            showMsg(wrongPasswordMsg(err), false);
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Create account";
            }
          });

        return false;
      },
      true
    );
  }

  function finishGoogleUser(user) {
    if (!user || REDIRECTING) return;
    var email = (user.email || "").toLowerCase();
    var name =
      user.displayName ||
      (email ? email.split("@")[0] : "Trader");
    saveSession(email || "google-user", name, "firebase-google");
    try {
      localStorage.setItem("wunnax_session", "1");
      sessionStorage.setItem("wunnax_just_logged_in", "1");
      sessionStorage.removeItem("wunnax_google_oauth");
    } catch (_) {}
    goHomeAfterSuccess("Login successful");
  }

  function wireGoogle() {
    var googleBtns = document.querySelectorAll('[data-provider="google"], #btnGoogle');
    googleBtns.forEach(function (b) {
      if (b.getAttribute("data-wx-wired") === "1") return;
      b.setAttribute("data-wx-wired", "1");
      b.addEventListener("click", function () {
        if (REDIRECTING) return;
        showMsg("", false);
        if (!window.WunnaxBackend || !WunnaxBackend.signInWithOAuth) {
          showMsg("Google login not ready. Use email instead.", false);
          return;
        }
        showMsg("Opening Google…", true);
        try {
          if (WunnaxBackend.init) WunnaxBackend.init().catch(function () {});
        } catch (_) {}

        var btn = b;
        btn.disabled = true;

        WunnaxBackend.signInWithOAuth("google")
          .then(function (res) {
            // Redirect flow: browser leaves this page; boot() finishes on return
            if (res && res.redirecting) {
              showMsg("Continue with Google… you’ll return here shortly.", true);
              return;
            }
            if (res && res.user) {
              finishGoogleUser(res.user);
              return;
            }
            // Fallback: check currentUser
            try {
              if (window.firebase && firebase.auth && firebase.auth().currentUser) {
                finishGoogleUser(firebase.auth().currentUser);
                return;
              }
            } catch (_) {}
            showMsg("Google sign-in incomplete. Try again or use email.", false);
            btn.disabled = false;
          })
          .catch(function (err) {
            console.error("[auth-page] Google", err);
            showMsg(wrongPasswordMsg(err) || "Google sign-in failed. Use email.", false);
            btn.disabled = false;
          });
      });
    });
  }

  /**
   * After Google redirect returns to sign-in, complete session and go to home.
   * This was the main bug: redirect landed on login and stayed there.
   */
  function finishGoogleRedirectIfNeeded() {
    if (!/signin|signup/i.test(location.pathname || "")) return;

    function goIfUser(user) {
      if (user) finishGoogleUser(user);
    }

    // 1) Backend helper
    if (window.WunnaxBackend) {
      try {
        if (typeof WunnaxBackend.init === "function") {
          WunnaxBackend.init().catch(function () {});
        }
      } catch (_) {}

      if (typeof WunnaxBackend.completeRedirectSignIn === "function") {
        withTimeout(WunnaxBackend.completeRedirectSignIn(), 8000, "google-redirect-timeout")
          .then(function (res) {
            if (res && res.user) goIfUser(res.user);
          })
          .catch(function (err) {
            console.warn("[auth-page] google redirect", err);
            try {
              var ae = sessionStorage.getItem("wunnax_auth_error");
              if (ae) showMsg(ae, false);
            } catch (_) {}
          });
      }
    }

    // 2) Direct Firebase getRedirectResult + currentUser
    try {
      if (window.firebase && firebase.auth) {
        if (!firebase.apps || !firebase.apps.length) {
          if (window.WUNNAX_FIREBASE) firebase.initializeApp(window.WUNNAX_FIREBASE);
        }
        var auth = firebase.auth();
        withTimeout(auth.getRedirectResult(), 8000, "redirect-timeout")
          .then(function (result) {
            if (result && result.user) goIfUser(result.user);
            else if (auth.currentUser) goIfUser(auth.currentUser);
          })
          .catch(function () {
            if (auth.currentUser) goIfUser(auth.currentUser);
          });

        // 3) Auth state listener (covers delayed rehydrate)
        var unsub = auth.onAuthStateChanged(function (user) {
          if (user) {
            try {
              if (typeof unsub === "function") unsub();
            } catch (_) {}
            goIfUser(user);
          }
        });
        // Stop listening after a few seconds if still anonymous
        setTimeout(function () {
          try {
            if (typeof unsub === "function") unsub();
          } catch (_) {}
        }, 10000);
      }
    } catch (e) {
      console.warn("[auth-page] firebase google check", e);
    }

    // 4) Already have session from previous Google login on this page
    try {
      if (localStorage.getItem("wunnax_session") === "1" && sessionStorage.getItem("wunnax_google_oauth") === "1") {
        sessionStorage.removeItem("wunnax_google_oauth");
        goHomeAfterSuccess("Login successful");
      }
    } catch (_) {}
  }

  function boot() {
    wireSignIn();
    wireSignUp();
    wireGoogle();
    // Background Firebase init
    try {
      if (window.WunnaxBackend && WunnaxBackend.init) WunnaxBackend.init().catch(function () {});
    } catch (_) {}
    // Critical: complete Google OAuth redirect → home (not stuck on login)
    finishGoogleRedirectIfNeeded();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

