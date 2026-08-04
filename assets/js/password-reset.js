/**
 * Forgot-password + reset-password page logic (Firebase Auth email reset).
 * Flow: email → Firebase sends reset message → user opens link / enters code → new password.
 */
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
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

  function qs(name) {
    try {
      return new URLSearchParams(location.search).get(name) || "";
    } catch (_) {
      return "";
    }
  }

  function waitBackend(ms) {
    ms = ms || 10000;
    return new Promise(function (resolve) {
      var start = Date.now();
      (function tick() {
        if (window.WunnaxBackend && typeof WunnaxBackend.sendPasswordReset === "function") {
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

  function errText(err) {
    if (window.WunnaxBackend && WunnaxBackend.formatError) {
      return WunnaxBackend.formatError(err);
    }
    return (err && err.message) || "Something went wrong. Try again.";
  }

  function extractOobCode() {
    // Firebase email link params
    var code = qs("oobCode") || qs("code") || qs("oob") || "";
    if (code) return code.trim();
    // Sometimes nested in continueUrl
    try {
      var cont = qs("continueUrl") || qs("continueUrl".toLowerCase()) || "";
      if (cont) {
        var u = new URL(cont);
        return (u.searchParams.get("oobCode") || "").trim();
      }
    } catch (_) {}
    return "";
  }

  function wireForgot() {
    var form = $("forgotForm");
    if (!form) return;

    form.addEventListener(
      "submit",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        showMsg("", false);

        var email = ($("fpEmail") && $("fpEmail").value.trim()) || "";
        var btn = $("fpSubmit") || form.querySelector('button[type="submit"]');
        if (!email) {
          showMsg("Enter the email for your account.", false);
          return false;
        }

        if (btn) {
          btn.disabled = true;
          btn.textContent = "Sending…";
        }

        waitBackend()
          .then(function (ok) {
            if (!ok || !WunnaxBackend.sendPasswordReset) {
              throw new Error("Reset service not ready. Refresh the page.");
            }
            return WunnaxBackend.sendPasswordReset(email);
          })
          .then(function () {
            // Swap to success panel
            var formBox = $("forgotFormWrap");
            var successBox = $("forgotSuccess");
            if (formBox) formBox.hidden = true;
            if (successBox) {
              successBox.hidden = false;
              successBox.removeAttribute("hidden");
            }
            var emailEl = $("sentToEmail");
            if (emailEl) emailEl.textContent = email;
            showMsg("Reset code sent — check your email inbox (and spam).", true);
          })
          .catch(function (err) {
            console.error("[password-reset] send", err);
            showMsg(errText(err), false);
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Send reset code";
            }
          });

        return false;
      },
      true
    );
  }

  function wireReset() {
    var form = $("resetForm");
    if (!form) return;

    var codeInput = $("rpCode");
    var emailHint = $("rpEmailHint");
    var fromUrl = extractOobCode();
    if (codeInput && fromUrl) {
      codeInput.value = fromUrl;
    }

    // Prefill email hint from session if we have it
    try {
      var saved = sessionStorage.getItem("wunnax_reset_email");
      if (emailHint && saved) {
        emailHint.textContent = "Account: " + saved;
        emailHint.hidden = false;
      }
    } catch (_) {}

    // If code present, verify and show which email it belongs to
    if (fromUrl) {
      waitBackend().then(function (ok) {
        if (!ok || !WunnaxBackend.verifyPasswordResetCode) return;
        WunnaxBackend.verifyPasswordResetCode(fromUrl)
          .then(function (res) {
            if (emailHint && res && res.email) {
              emailHint.textContent = "Resetting password for " + res.email;
              emailHint.hidden = false;
              emailHint.removeAttribute("hidden");
            }
            showMsg("Reset code accepted. Choose a new password.", true);
          })
          .catch(function () {
            /* user can still try submitting; invalid will show then */
          });
      });
    }

    form.addEventListener(
      "submit",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        showMsg("", false);

        var code = (codeInput && codeInput.value.trim()) || "";
        var pass = ($("rpPass") && $("rpPass").value) || "";
        var pass2 = ($("rpPass2") && $("rpPass2").value) || "";
        var btn = $("rpSubmit") || form.querySelector('button[type="submit"]');

        if (!code) {
          showMsg("Paste the reset code from your email (or open the email link).", false);
          return false;
        }
        if (!pass || pass.length < 6) {
          showMsg("New password must be at least 6 characters.", false);
          return false;
        }
        if (pass !== pass2) {
          showMsg("Passwords do not match.", false);
          return false;
        }

        if (btn) {
          btn.disabled = true;
          btn.textContent = "Updating…";
        }

        waitBackend()
          .then(function (ok) {
            if (!ok || !WunnaxBackend.confirmPasswordReset) {
              throw new Error("Reset service not ready. Refresh the page.");
            }
            return WunnaxBackend.confirmPasswordReset(code, pass);
          })
          .then(function () {
            showMsg("Password updated. Redirecting to sign in…", true);
            var successBox = $("resetSuccess");
            var formWrap = $("resetFormWrap");
            if (formWrap) formWrap.hidden = true;
            if (successBox) {
              successBox.hidden = false;
              successBox.removeAttribute("hidden");
            }
            setTimeout(function () {
              window.location.replace("/signin.html?reset=1");
            }, 1200);
          })
          .catch(function (err) {
            console.error("[password-reset] confirm", err);
            showMsg(errText(err), false);
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Set new password";
            }
          });

        return false;
      },
      true
    );
  }

  function boot() {
    wireForgot();
    wireReset();
    if (window.WunnaxBackend && WunnaxBackend.init) {
      WunnaxBackend.init().catch(function () {});
    }

    // Sign-in page toast when coming back from successful reset
    if (/signin/i.test(location.pathname || "") && qs("reset") === "1") {
      var el = $("authError");
      if (el) {
        el.hidden = false;
        el.removeAttribute("hidden");
        el.className = "auth-success";
        el.textContent = "Password updated. Sign in with your new password.";
        el.style.display = "block";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
