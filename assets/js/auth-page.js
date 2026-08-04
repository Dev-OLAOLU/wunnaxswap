/**
 * Standalone sign-in / sign-up page logic.
 * Does not depend on full app boot — always shows success then goes to home.
 */
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function showMsg(text, ok) {
    var el = $("authError");
    if (!el) return;
    el.hidden = !text;
    el.className = ok ? "auth-success" : "auth-error";
    el.textContent = text || "";
  }

  function home() {
    // Hard navigation — always works
    window.location.href = "/index.html";
  }

  function goHomeAfterSuccess(msg) {
    showMsg((msg || "Login successful") + " — opening home…", true);
    // Immediate + backup redirects so nothing can cancel it
    setTimeout(function () {
      try {
        window.location.replace("/");
      } catch (e1) {
        try {
          window.location.href = "/index.html";
        } catch (e2) {
          window.location.assign("/index.html");
        }
      }
    }, 600);
    // Failsafe if first navigation is blocked
    setTimeout(function () {
      if (/signin|signup/i.test(location.pathname || "")) {
        window.location.href = "/index.html";
      }
    }, 1600);
  }

  function wrongPasswordMsg(err) {
    var code = (err && err.code) || "";
    var msg = (err && err.message) || "";
    if (
      code === "auth/wrong-password" ||
      code === "auth/user-not-found" ||
      code === "auth/invalid-credential" ||
      code === "auth/invalid-login-credentials" ||
      /wrong-password|user-not-found|invalid-credential|INVALID_LOGIN|INVALID_PASSWORD|EMAIL_NOT_FOUND/i.test(
        code + " " + msg
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
    return (window.WunnaxBackend && WunnaxBackend.formatError
      ? WunnaxBackend.formatError(err)
      : null) || "Wrong email or password.";
  }

  function waitBackend(ms) {
    ms = ms || 8000;
    return new Promise(function (resolve) {
      var start = Date.now();
      (function tick() {
        if (window.WunnaxBackend && typeof WunnaxBackend.signIn === "function") {
          if (typeof WunnaxBackend.init === "function") {
            Promise.resolve(WunnaxBackend.init())
              .then(function () { resolve(true); })
              .catch(function () { resolve(true); });
            return;
          }
          resolve(true);
          return;
        }
        if (Date.now() - start > ms) {
          resolve(false);
          return;
        }
        setTimeout(tick, 50);
      })();
    });
  }

  function wireSignIn() {
    var form = $("signinForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopPropagation();
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

      waitBackend().then(function (ok) {
        if (!ok || !window.WunnaxBackend) {
          showMsg("Login service not ready. Refresh the page.", false);
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Sign in";
          }
          return;
        }
        return WunnaxBackend.signIn(email, pass)
          .then(function () {
            // Save session flag used by the rest of the app
            try {
              localStorage.setItem("wunnax_session", "1");
              localStorage.setItem(
                "wunnax_user",
                JSON.stringify({
                  name: email.split("@")[0],
                  email: email,
                  provider: "email",
                  backend: "firebase",
                })
              );
            } catch (_) {}
            goHomeAfterSuccess("Login successful");
          })
          .catch(function (err) {
            console.error("[auth-page] signIn", err);
            showMsg(wrongPasswordMsg(err), false);
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Sign in";
            }
          });
      });
      return false;
    });
  }

  function wireSignUp() {
    var form = $("signupForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopPropagation();
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

      waitBackend().then(function (ok) {
        if (!ok || !window.WunnaxBackend) {
          showMsg("Service not ready. Refresh the page.", false);
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Create account";
          }
          return;
        }
        return WunnaxBackend.signUp(email, pass, name)
          .then(function () {
            try {
              localStorage.setItem("wunnax_session", "1");
              localStorage.setItem(
                "wunnax_user",
                JSON.stringify({
                  name: name,
                  email: email,
                  provider: "email",
                  backend: "firebase",
                })
              );
            } catch (_) {}
            goHomeAfterSuccess("Login successful");
          })
          .catch(function (err) {
            console.error("[auth-page] signUp", err);
            showMsg(wrongPasswordMsg(err), false);
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Create account";
            }
          });
      });
      return false;
    });
  }

  function wireGoogle() {
    var btn = $("btnGoogle");
    if (!btn || !btn.getAttribute("data-provider")) {
      // still attach if present
    }
    var googleBtns = document.querySelectorAll('[data-provider="google"], #btnGoogle');
    googleBtns.forEach(function (b) {
      b.addEventListener("click", function () {
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

  document.addEventListener("DOMContentLoaded", function () {
    wireSignIn();
    wireSignUp();
    wireGoogle();
    // Init Firebase early
    if (window.WunnaxBackend && WunnaxBackend.init) {
      WunnaxBackend.init().catch(function () {});
    }
  });
})();
