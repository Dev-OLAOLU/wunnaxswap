/**
 * Forgot-password + reset-password pages.
 * Random 6-digit codes emailed via WunnaxEmailOtp (FormSubmit / EmailJS / Firebase).
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
    ms = ms || 10000;
    return new Promise(function (resolve) {
      var start = Date.now();
      (function tick() {
        var otp = window.WunnaxEmailOtp;
        var be = window.WunnaxBackend;
        if (otp && typeof otp.requestOtp === "function") {
          if (be && typeof be.init === "function") {
            Promise.resolve(be.init())
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
          resolve(!!otp);
          return;
        }
        setTimeout(tick, 40);
      })();
    });
  }

  function extractOobCode() {
    var code = qs("oobCode") || qs("oob") || "";
    if (code) return code.trim();
    // Long Firebase codes are not 6-digit — leave empty for OTP field
    return "";
  }

  function showSuccessPanel(formWrapId, successId) {
    var formWrap = $(formWrapId);
    var successBox = $(successId);
    if (formWrap) formWrap.hidden = true;
    if (successBox) {
      successBox.hidden = false;
      successBox.removeAttribute("hidden");
    }
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
            if (!ok || !window.WunnaxEmailOtp) {
              throw new Error("Reset service not ready. Refresh the page.");
            }
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

            var channels = (res && res.channels) || [];
            var extra = channels.length
              ? " Delivered via: " + channels.join(", ") + "."
              : "";
            showMsg("Reset code sent — check your inbox and spam folder." + extra, true);

            // Prefill reset page email
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

    // Prefill email
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

    var oobFromUrl = extractOobCode();
    // If Firebase link landed with oobCode, try auto-apply pending password
    if (oobFromUrl) {
      waitReady().then(function () {
        if (!window.WunnaxEmailOtp) return;
        WunnaxEmailOtp.tryApplyPendingWithOob(oobFromUrl).then(function (applied) {
          if (applied && applied.ok) {
            showSuccessPanel("resetFormWrap", "resetSuccess");
            showMsg("Password updated. Redirecting to sign in…", true);
            setTimeout(function () {
              window.location.replace("/signin.html?reset=1");
            }, 1000);
            return;
          }
          // Show oob in a hidden way — long codes go in the code field for manual confirm
          if (codeInput && !codeInput.value) {
            // Keep code field free for 6-digit; store oob separately
            codeInput.setAttribute("data-oob", oobFromUrl);
            showMsg("Recovery link opened. Enter a new password below (or your 6-digit email code).", true);
          }
        });
      });
    }

    form.addEventListener(
      "submit",
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        showMsg("", false);

        var email =
          (emailInput && emailInput.value.trim()) ||
          saved ||
          "";
        var code = (codeInput && codeInput.value.trim()) || "";
        var oobAttr = (codeInput && codeInput.getAttribute("data-oob")) || oobFromUrl || "";
        var pass = ($("rpPass") && $("rpPass").value) || "";
        var pass2 = ($("rpPass2") && $("rpPass2").value) || "";
        var btn = $("rpSubmit") || form.querySelector('button[type="submit"]');

        if (!pass || pass.length < 6) {
          showMsg("New password must be at least 6 characters.", false);
          return false;
        }
        if (pass !== pass2) {
          showMsg("Passwords do not match.", false);
          return false;
        }

        // Detect 6-digit OTP vs long Firebase oobCode
        var isSixDigit = /^\d{6}$/.test(code.replace(/\s+/g, ""));
        var isLongOob = code.length > 20 || (oobAttr && oobAttr.length > 20);

        if (!isSixDigit && !isLongOob && !oobAttr) {
          showMsg("Enter the 6-digit code from your email.", false);
          return false;
        }
        if (isSixDigit && !email) {
          showMsg("Enter the account email you used to request the code.", false);
          return false;
        }

        if (btn) {
          btn.disabled = true;
          btn.textContent = "Updating…";
        }

        waitReady()
          .then(function (ok) {
            if (!ok || !window.WunnaxEmailOtp) {
              throw new Error("Reset service not ready. Refresh the page.");
            }

            if (isSixDigit) {
              return WunnaxEmailOtp.completeWithOtp(email, code.replace(/\s+/g, ""), pass);
            }

            var oob = isLongOob ? code : oobAttr;
            return WunnaxEmailOtp.completeWithOob(oob, pass);
          })
          .then(function (res) {
            if (res && res.via === "pending_link") {
              showMsg(
                res.message ||
                  "Code accepted. Open the secure recovery link in your email to finish applying your new password.",
                true
              );
              var pendingNote = $("resetPendingNote");
              if (pendingNote) {
                pendingNote.hidden = false;
                pendingNote.removeAttribute("hidden");
              }
              if (btn) {
                btn.disabled = false;
                btn.textContent = "Set new password";
              }
              return;
            }

            showMsg("Password updated. Redirecting to sign in…", true);
            showSuccessPanel("resetFormWrap", "resetSuccess");
            setTimeout(function () {
              window.location.replace("/signin.html?reset=1");
            }, 1100);
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
