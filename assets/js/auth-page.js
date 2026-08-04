/**
 * Standalone sign-in / sign-up page logic.
 * Auth success ALWAYS shows "Login successful" then hard-navigates home.
 * Does not depend on full app boot or Firestore.
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
    el.hidden = !text;
    el.removeAttribute("hidden");
    if (!text) {
      el.hidden = true;
      el.setAttribute("hidden", "");
      return;
    }
    el.className = ok ? "auth-success" : "auth-error";
    el.textContent = text;
    el.style.display = "block";
  }

  /** Full-screen banner so success is impossible to miss */
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

  function saveSession(email, name) {
    try {
      localStorage.setItem("wunnax_session", "1");
      localStorage.setItem(
        "wunnax_user",
        JSON.stringify({
          name: name || (email && email.split("@")[0]) || "Trader",
          email: email || "",
          provider: "email",
          backend: "firebase",
        })
      );
      sessionStorage.setItem("wunnax_just_logged_in", "1");
    } catch (_) {}
  }

  /**
   * Show success, then force leave this page for home.
   * Multiple navigation attempts — nothing should cancel this.
   */
  function goHomeAfterSuccess(msg) {
    if (REDIRECTING) return;
    REDIRECTING = true;

    var text = msg || "Login successful";
    showMsg(text + " — opening home…", true);
    showSuccessOverlay(text);

    var url = homeUrl();

    // Paint success first, then navigate
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
    }, 500);

    setTimeout(function () {
      if (/signin|signup/i.test(location.pathname || "")) {
        window.location.href = url;
      }
    }, 1200);

    setTimeout(function () {
      if (/signin|signup/i.test(location.pathname || "")) {
        window.location.assign(HOME);
      }
    }, 2200);
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
    if (code === "auth/email-already-in-use") {
      return "That email is already registered. Use Sign in with your password.";
    }
    if (code === "auth/weak-password") return "Password must be at least 6 characters.";
    if (window.WunnaxBackend && WunnaxBackend.formatError) {
      return WunnaxBackend.formatError(err) || "Wrong email or password.";
    }
    return "Wrong email or password.";
  }

  function waitBackend(ms) {
    ms = ms || 10000;
    return new Promise(function (resolve) {
      var start = Date.now();
      (function tick() {
        if (window.WunnaxBackend && typeof WunnaxBackend.signIn === "function") {
          if (typeof WunnaxBackend.init === "function") {
            Promise.resolve(WunnaxBackend.init())
              .then(function () {
                resolve(true);
              })
              .catch(function () {
                resolve(true);
              });
            return;
          }
          resolve(true);
          return;
        }
        if (Date.now() - start > ms) {
          resolve(false);
          return;
        }
        setTimeout(tick, 40);
      })();
    });
  }

  /** Direct Firebase fallback if backend module is missing */
  function firebaseSignIn(email, pass) {
    if (!window.firebase || !firebase.auth) {
      return Promise.reject(new Error("Firebase not loaded"));
    }
    if (!firebase.apps || !firebase.apps.length) {
      if (window.WUNNAX_FIREBASE) {
        firebase.initializeApp(window.WUNNAX_FIREBASE);
      }
    }
    return firebase.auth().signInWithEmailAndPassword(email, pass);
  }

  function firebaseSignUp(email, pass, name) {
    if (!window.firebase || !firebase.auth) {
      return Promise.reject(new Error("Firebase not loaded"));
    }
    if (!firebase.apps || !firebase.apps.length) {
      if (window.WUNNAX_FIREBASE) {
        firebase.initializeApp(window.WUNNAX_FIREBASE);
      }
    }
    return firebase
      .auth()
      .createUserWithEmailAndPassword(email, pass)
      .then(function (cred) {
        if (name && cred.user && cred.user.updateProfile) {
          return cred.user.updateProfile({ displayName: name }).then(function () {
            return cred;
          });
        }
        return cred;
      });
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          var e = new Error(label || "Request timed out. Try again.");
          e.code = "auth/timeout";
          reject(e);
        }, ms || 15000);
      }),
    ]);
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

        if (btn) {
          btn.disabled = true;
          btn.textContent = "Signing in…";
        }

        waitBackend()
          .then(function (ok) {
            var p;
            if (ok && window.WunnaxBackend && WunnaxBackend.signIn) {
              p = WunnaxBackend.signIn(email, pass);
            } else {
              p = firebaseSignIn(email, pass);
            }
            return withTimeout(p, 12000, "Sign-in timed out. Check connection and try again.");
          })
          .then(function () {
            saveSession(email, email.split("@")[0]);
            goHomeAfterSuccess("Login successful");
          })
          .catch(function (err) {
            console.error("[auth-page] signIn", err);
            // If Firebase already signed in despite error, still go home
            try {
              if (window.firebase && firebase.auth && firebase.auth().currentUser) {
                saveSession(email, email.split("@")[0]);
                goHomeAfterSuccess("Login successful");
                return;
              }
            } catch (_) {}
            showMsg(wrongPasswordMsg(err), false);
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Sign in";
            }
          });

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
        var email = ($("suEmail") && $("suEmail").value.trim()) || "";
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

        waitBackend()
          .then(function (ok) {
            var p;
            if (ok && window.WunnaxBackend && WunnaxBackend.signUp) {
              p = WunnaxBackend.signUp(email, pass, name);
            } else {
              p = firebaseSignUp(email, pass, name);
            }
            return withTimeout(p, 12000, "Sign-up timed out. Check connection and try again.");
          })
          .then(function () {
            saveSession(email, name);
            goHomeAfterSuccess("Login successful");
          })
          .catch(function (err) {
            console.error("[auth-page] signUp", err);
            try {
              if (window.firebase && firebase.auth && firebase.auth().currentUser) {
                saveSession(email, name);
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

  function wireGoogle() {
    var googleBtns = document.querySelectorAll('[data-provider="google"], #btnGoogle');
    googleBtns.forEach(function (b) {
      if (b.getAttribute("data-wx-wired") === "1") return;
      b.setAttribute("data-wx-wired", "1");
      b.addEventListener("click", function () {
        if (REDIRECTING) return;
        showMsg("", false);
        waitBackend().then(function (ok) {
          if (!ok || !WunnaxBackend.signInWithOAuth) {
            showMsg("Google login not ready. Use email instead.", false);
            return;
          }
          showMsg("Opening Google…", true);
          WunnaxBackend.signInWithOAuth("google")
            .then(function (res) {
              if (res && res.redirecting) return;
              try {
                localStorage.setItem("wunnax_session", "1");
                sessionStorage.setItem("wunnax_just_logged_in", "1");
              } catch (_) {}
              goHomeAfterSuccess("Login successful");
            })
            .catch(function (err) {
              showMsg(wrongPasswordMsg(err) || "Google sign-in failed. Use email.", false);
            });
        });
      });
    });
  }

  function boot() {
    wireSignIn();
    wireSignUp();
    wireGoogle();
    if (window.WunnaxBackend && WunnaxBackend.init) {
      WunnaxBackend.init().catch(function () {});
    }

    // Already signed in? Go home (don't stick on sign-in)
    try {
      if (
        window.firebase &&
        firebase.auth &&
        firebase.auth().currentUser &&
        /signin|signup/i.test(location.pathname || "")
      ) {
        saveSession(
          firebase.auth().currentUser.email || "",
          firebase.auth().currentUser.displayName || ""
        );
        goHomeAfterSuccess("Login successful");
      }
    } catch (_) {}
  }

  // Wire immediately — DOMContentLoaded may have already fired
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
