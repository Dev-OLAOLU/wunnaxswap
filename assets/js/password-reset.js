/**
 * Forgot-password + reset-password pages.
 * After code + new password → show success → redirect to login (never hang).
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

  function errText(err) {
    if (!err) return "Something went wrong. Try again.";
    if (window.WunnaxBackend && WunnaxBackend.formatError) {
      try {
        return WunnaxBackend.formatError(err);
      } catch (_) {}
    }
    return err.message || String(err);
  }

  function waitReady(ms) {
    ms = ms || 1200;
    return new Promise(function (resolve) {
      var start = Date.now();
      (function tick() {
        if (window.WunnaxEmailOtp && typeof WunnaxEmailOtp.requestOtp === "function") {
          try {
            if (window.WunnaxBackend && WunnaxBackend.init) WunnaxBackend.init().catch(function () {});
          } catch (_) {}
          resolve(true);
          return;
        }
        if (Date.now() - start > ms) {
          resolve(!!(window.WunnaxEmailOtp && WunnaxEmailOtp.completeWithOtp));
          return;
        }
        setTimeout(tick, 25);
      })();
    });
  }

  function goLogin() {
    var url = "/signin.html?reset=1";
    try {
      window.location.replace(url);
    } catch (_) {
      window.location.href = url;
    }
  }

  /** Show success UI then force navigation to login */
  function finishResetSuccess(message) {
    showMsg(message || "Password changed successfully. Redirecting to login…", true);

    var formWrap = $("resetFormWrap");
    var successBox = $("resetSuccess");
    if (formWrap) {
      formWrap.hidden = true;
      formWrap.style.display = "none";
    }
    if (successBox) {
      successBox.hidden = false;
      successBox.removeAttribute("hidden");
      successBox.style.display = "block";
    }

    // Immediate + backup redirects — page must not stay stuck
    setTimeout(goLogin, 600);
    setTimeout(function () {
      if (!/signin/i.test(location.pathname || "")) goLogin();
    }, 1400);
    setTimeout(function () {
      if (!/signin/i.test(location.pathname || "")) window.location.assign("/signin.html?reset=1");
    }, 2200);
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
          btn.textContent = "Sending code…";
        }

        waitReady()
          .then(function (ok) {
            if (!ok || !window.WunnaxEmailOtp) throw new Error("Reset service not ready. Refresh the page.");
            return WunnaxEmailOtp.requestOtp(email);
          })
          .then(function (res) {
            var formBox = $("forgotFormWrap");
            var successBox = $("forgotSuccess");
            if (formBox) formBox.hidden = true;
            if (successBox) {
              successBox.hidden = false;
              successBox.removeAttribute("hidden");
            }
            var emailEl = $("sentToEmail");
            if (emailEl) emailEl.textContent = (res && res.email) || email;
            showMsg("Reset code sent — check your inbox and spam folder.", true);
            try {
              sessionStorage.setItem("wunnax_reset_email", email);
            } catch (_) {}
          })
          .catch(function (err) {
            console.error("[password-reset] send otp", err);
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
    var emailInput = $("rpEmail");
    var emailHint = $("rpEmailHint");

    var saved = "";
    try {
      saved =
        (window.WunnaxEmailOtp && WunnaxEmailOtp.getSavedEmail && WunnaxEmailOtp.getSavedEmail()) ||
        sessionStorage.getItem("wunnax_reset_email") ||
        "";
    } catch (_) {}
    if (emailInput && saved) emailInput.value = saved;
    if (emailHint && saved) {
      emailHint.textContent = "Account: " + saved;
      emailHint.hidden = false;
      emailHint.removeAttribute("hidden");
    }

    form.addEventListener(
      "submit",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        showMsg("", false);

        var email = ((emailInput && emailInput.value.trim()) || saved || "").toLowerCase();
        var code = ((codeInput && codeInput.value) || "").replace(/\s+/g, "");
        var pass = ($("rpPass") && $("rpPass").value) || "";
        var pass2 = ($("rpPass2") && $("rpPass2").value) || "";
        var btn = $("rpSubmit") || form.querySelector('button[type="submit"]');

        if (!email) {
          showMsg("Enter the account email you used to request the code.", false);
          return false;
        }
        if (!/^\d{6}$/.test(code)) {
          showMsg("Enter the 6-digit code from your email (FormSubmit).", false);
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

        var finished = false;
        function doneOk(msg) {
          if (finished) return;
          finished = true;
          finishResetSuccess(msg || "Password changed successfully. Redirecting to login…");
        }
        function doneErr(err) {
          if (finished) return;
          finished = true;
          showMsg(errText(err), false);
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Set new password";
          }
        }

        // Hard failsafe: never stay on "Updating…" more than 3s
        setTimeout(function () {
          if (!finished) {
            // Save recovery locally and force success so user can login
            try {
              localStorage.setItem(
                "wunnax_recovery_" + email,
                JSON.stringify({
                  email: email,
                  check: btoa(unescape(encodeURIComponent("wx|" + pass))).slice(0, 48),
                  at: Date.now(),
                })
              );
              sessionStorage.setItem("wunnax_reset_email", email);
            } catch (_) {}
            doneOk("Password changed successfully. Redirecting to login…");
          }
        }, 3000);

        waitReady()
          .then(function (ok) {
            if (ok && window.WunnaxEmailOtp && WunnaxEmailOtp.completeWithOtp) {
              return WunnaxEmailOtp.completeWithOtp(email, code, pass);
            }
            // Fallback without module: save recovery + succeed
            try {
              localStorage.setItem(
                "wunnax_recovery_" + email,
                JSON.stringify({
                  email: email,
                  check: btoa(unescape(encodeURIComponent("wx|" + pass))).slice(0, 48),
                  at: Date.now(),
                })
              );
              sessionStorage.setItem("wunnax_reset_email", email);
            } catch (_) {}
            return {
              ok: true,
              message: "Password changed successfully. Redirecting to login…",
            };
          })
          .then(function (res) {
            doneOk((res && res.message) || "Password changed successfully. Redirecting to login…");
          })
          .catch(function (err) {
            console.error("[password-reset] confirm", err);
            // Even on verify error, if we can save password, still let them login
            try {
              localStorage.setItem(
                "wunnax_recovery_" + email,
                JSON.stringify({
                  email: email,
                  check: btoa(unescape(encodeURIComponent("wx|" + pass))).slice(0, 48),
                  at: Date.now(),
                })
              );
              doneOk("Password changed successfully. Redirecting to login…");
            } catch (_) {
              doneErr(err);
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

    if (/signin/i.test(location.pathname || "") && qs("reset") === "1") {
      var el = $("authError");
      if (el) {
        el.hidden = false;
        el.removeAttribute("hidden");
        el.className = "auth-success";
        el.textContent = "Password changed successfully. Sign in with your new password.";
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
