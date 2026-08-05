/**
 * Wunnaxswap — email OTP for password recovery
 * ---------------------------------------------------------------------------
 * Generates a random 6-digit code, emails it to the registered address, and
 * verifies it so the user can set a new password.
 *
 * Delivery channels (first success wins for “sent”; all are attempted):
 *  1) FormSubmit → delivers to the user’s own inbox (free, no API key)
 *  2) EmailJS    → if WUNNAX_EMAILJS is configured
 *  3) Firebase Auth password-reset email (always reliable backup link)
 *
 * Password update after a 6-digit code:
 *  - Prefer /api/confirm-otp (Firebase Admin on Vercel) when available
 *  - Else complete via Firebase oob link (auto-applied when user opens it)
 */
(function (global) {
  "use strict";

  var OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes
  var COLLECTION = "passwordResets";
  var SS_EMAIL = "wunnax_reset_email";
  var SS_PENDING = "wunnax_pending_reset";
  var SS_OTP_META = "wunnax_otp_meta";

  function cfg() {
    return global.WUNNAX_FIREBASE || {};
  }

  function emailJsCfg() {
    return global.WUNNAX_EMAILJS || {};
  }

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  function isEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Cryptographically strong 6-digit code (000000–999999, zero-padded) */
  function generateCode() {
    try {
      if (global.crypto && crypto.getRandomValues) {
        var buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return String(buf[0] % 1000000).padStart(6, "0");
      }
    } catch (_) {}
    return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  }

  function sha256Hex(text) {
    var data = new TextEncoder().encode(String(text));
    if (!global.crypto || !crypto.subtle) {
      // Fallback hash (not for high security; browsers without subtle are rare)
      var h = 2166136261;
      for (var i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return Promise.resolve(("00000000" + (h >>> 0).toString(16)).slice(-8) + "_" + text.length);
    }
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      var arr = Array.from(new Uint8Array(buf));
      return arr
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function docIdForEmail(email) {
    // Firestore doc ids: safe, deterministic-ish from email
    return (
      "e_" +
      String(email)
        .replace(/[^a-z0-9]/gi, "_")
        .slice(0, 80)
    );
  }

  function getDb() {
    try {
      if (global.WunnaxBackend && typeof WunnaxBackend.getClient === "function") {
        var d = WunnaxBackend.getClient();
        if (d) return d;
      }
    } catch (_) {}
    if (global.firebase && firebase.firestore) {
      try {
        if (!firebase.apps || !firebase.apps.length) {
          if (cfg().apiKey) firebase.initializeApp(cfg());
        }
        return firebase.firestore();
      } catch (_) {}
    }
    return null;
  }

  function getAuth() {
    try {
      if (global.WunnaxBackend && typeof WunnaxBackend.getAuth === "function") {
        var a = WunnaxBackend.getAuth();
        if (a) return a;
      }
    } catch (_) {}
    if (global.firebase && firebase.auth) {
      try {
        return firebase.auth();
      } catch (_) {}
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Email senders                                                      */
  /* ------------------------------------------------------------------ */

  function emailHtml(code, email) {
    return (
      "<div style=\"font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f6f5f3;color:#111\">" +
      "<div style=\"background:#fff;border-radius:16px;padding:28px;border:1px solid #e4e2dc\">" +
      "<div style=\"font-weight:800;font-size:18px;margin-bottom:8px\">Wunnaxswap</div>" +
      "<p style=\"margin:0 0 16px;color:#6b7280;font-size:14px\">Password recovery for <strong>" +
      email +
      "</strong></p>" +
      "<p style=\"margin:0 0 8px;font-size:14px\">Your one-time reset code:</p>" +
      "<div style=\"font-size:32px;font-weight:800;letter-spacing:0.35em;color:#1333fc;margin:12px 0 20px\">" +
      code +
      "</div>" +
      "<p style=\"margin:0;color:#6b7280;font-size:13px;line-height:1.5\">This code expires in 15 minutes. " +
      "Enter it on the reset password page, then choose a new password.</p>" +
      "<p style=\"margin:16px 0 0;color:#98a4c2;font-size:12px\">If you did not request this, you can ignore this email.</p>" +
      "</div></div>"
    );
  }

  function emailText(code, email) {
    return (
      "Wunnaxswap password recovery\n\n" +
      "Account: " +
      email +
      "\n" +
      "Your reset code: " +
      code +
      "\n\n" +
      "This code expires in 15 minutes.\n" +
      "Open the reset password page, enter this code, and set a new password.\n\n" +
      "If you did not request this, ignore this email."
    );
  }

  /** FormSubmit — free delivery to the user’s address (activates on first use) */
  function sendViaFormSubmit(email, code) {
    var url = "https://formsubmit.co/ajax/" + encodeURIComponent(email);
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: "Wunnaxswap password reset code: " + code,
        _template: "table",
        _captcha: "false",
        _honey: "",
        name: "Wunnaxswap Security",
        email: "noreply@wunnaxswap.app",
        message: emailText(code, email),
        reset_code: code,
        html: emailHtml(code, email),
      }),
    }).then(function (res) {
      if (!res.ok) throw new Error("FormSubmit HTTP " + res.status);
      return res.json().catch(function () {
        return { ok: true };
      });
    });
  }

  /** EmailJS REST — optional (set window.WUNNAX_EMAILJS) */
  function sendViaEmailJs(email, code) {
    var c = emailJsCfg();
    if (!c.serviceId || !c.templateId || !c.publicKey) {
      return Promise.reject(new Error("EmailJS not configured"));
    }
    return fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: c.serviceId,
        template_id: c.templateId,
        user_id: c.publicKey,
        template_params: {
          to_email: email,
          email: email,
          user_email: email,
          reset_code: code,
          code: code,
          message: emailText(code, email),
          from_name: "Wunnaxswap",
          reply_to: "noreply@wunnaxswap.app",
        },
      }),
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(t || "EmailJS failed");
        });
      }
      return { ok: true, via: "emailjs" };
    });
  }

  /** Optional Vercel serverless (Resend / Admin) */
  function sendViaApi(email, code) {
    return fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, code: code }),
    }).then(function (res) {
      if (!res.ok) throw new Error("API send failed");
      return res.json();
    });
  }

  /** Firebase Auth — always attempt (reliable inbox delivery of recovery link) */
  function sendViaFirebase(email) {
    var auth = getAuth();
    if (!auth || !auth.sendPasswordResetEmail) {
      return Promise.reject(new Error("Firebase Auth unavailable"));
    }
    var continueUrl = "/reset-password.html";
    try {
      continueUrl = (location.origin || "") + "/reset-password.html";
    } catch (_) {}
    return auth
      .sendPasswordResetEmail(email, {
        url: continueUrl,
        handleCodeInApp: false,
      })
      .then(function () {
        return { ok: true, via: "firebase" };
      });
  }

  /**
   * Fire all channels. Resolves if at least one delivery path succeeds.
   */
  function deliverCode(email, code) {
    var attempts = [
      sendViaApi(email, code).then(function () {
        return "api";
      }),
      sendViaEmailJs(email, code).then(function () {
        return "emailjs";
      }),
      sendViaFormSubmit(email, code).then(function () {
        return "formsubmit";
      }),
      sendViaFirebase(email).then(function () {
        return "firebase";
      }),
    ];

    return Promise.allSettled(attempts).then(function (results) {
      var ok = [];
      results.forEach(function (r) {
        if (r.status === "fulfilled" && r.value) ok.push(r.value);
      });
      if (!ok.length) {
        var err = new Error(
          "Could not deliver email. Check your connection, or try again in a minute."
        );
        err.code = "email/delivery-failed";
        throw err;
      }
      return { channels: ok, email: email };
    });
  }

  /* ------------------------------------------------------------------ */
  /* Firestore persistence                                              */
  /* ------------------------------------------------------------------ */

  function storeOtp(email, code) {
    return sha256Hex(code + "|" + email).then(function (codeHash) {
      var db = getDb();
      var expiresAt = Date.now() + OTP_TTL_MS;
      var payload = {
        email: email,
        codeHash: codeHash,
        expiresAt: expiresAt,
        createdAt: Date.now(),
        used: false,
        attempts: 0,
      };

      // Always keep a client-side copy so verify works even if Firestore rules block
      try {
        sessionStorage.setItem(
          SS_OTP_META,
          JSON.stringify({
            email: email,
            codeHash: codeHash,
            expiresAt: expiresAt,
          })
        );
        sessionStorage.setItem(SS_EMAIL, email);
        // Store plain code only in session for same-browser re-send UX (not for security)
        sessionStorage.setItem("wunnax_otp_hint", "1");
      } catch (_) {}

      if (!db) return { stored: "session", expiresAt: expiresAt };

      var id = docIdForEmail(email);
      return db
        .collection(COLLECTION)
        .doc(id)
        .set(payload, { merge: true })
        .then(function () {
          return { stored: "firestore", expiresAt: expiresAt };
        })
        .catch(function (err) {
          console.warn("[email-otp] firestore store (using session)", err);
          return { stored: "session", expiresAt: expiresAt };
        });
    });
  }

  function loadOtpRecord(email) {
    var db = getDb();
    var sessionRec = null;
    try {
      var raw = sessionStorage.getItem(SS_OTP_META);
      if (raw) {
        sessionRec = JSON.parse(raw);
        if (sessionRec.email !== email) sessionRec = null;
      }
    } catch (_) {}

    if (!db) return Promise.resolve(sessionRec);

    return db
      .collection(COLLECTION)
      .doc(docIdForEmail(email))
      .get()
      .then(function (snap) {
        if (snap && snap.exists) {
          var d = snap.data() || {};
          return {
            email: d.email || email,
            codeHash: d.codeHash,
            expiresAt: d.expiresAt,
            used: !!d.used,
            attempts: d.attempts || 0,
            from: "firestore",
          };
        }
        return sessionRec;
      })
      .catch(function () {
        return sessionRec;
      });
  }

  function markOtpUsed(email) {
    var db = getDb();
    try {
      sessionStorage.removeItem(SS_OTP_META);
    } catch (_) {}
    if (!db) return Promise.resolve();
    return db
      .collection(COLLECTION)
      .doc(docIdForEmail(email))
      .set({ used: true, usedAt: Date.now() }, { merge: true })
      .catch(function () {});
  }

  function bumpAttempts(email, attempts) {
    var db = getDb();
    if (!db) return Promise.resolve();
    return db
      .collection(COLLECTION)
      .doc(docIdForEmail(email))
      .set({ attempts: attempts }, { merge: true })
      .catch(function () {});
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Generate a random code, email it, and store hash for later verify.
   * @param {string} email
   */
  function requestOtp(email) {
    email = normalizeEmail(email);
    if (!isEmail(email)) {
      return Promise.reject(Object.assign(new Error("Enter a valid email address"), { code: "auth/invalid-email" }));
    }

    var code = generateCode();

    return storeOtp(email, code)
      .then(function () {
        return deliverCode(email, code);
      })
      .then(function (delivery) {
        return {
          sent: true,
          email: email,
          channels: delivery.channels,
          // Never return the code to the UI in production UI code paths
        };
      });
  }

  /**
   * Verify a 6-digit code for an email.
   * @param {string} email
   * @param {string} code
   */
  function verifyOtp(email, code) {
    email = normalizeEmail(email);
    code = String(code || "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code)) {
      return Promise.reject(
        Object.assign(new Error("Enter the 6-digit code from your email."), {
          code: "auth/invalid-action-code",
        })
      );
    }

    return loadOtpRecord(email).then(function (rec) {
      if (!rec || !rec.codeHash) {
        return Promise.reject(
          Object.assign(new Error("No reset code found. Request a new one."), {
            code: "auth/invalid-action-code",
          })
        );
      }
      if (rec.used) {
        return Promise.reject(
          Object.assign(new Error("This code was already used. Request a new one."), {
            code: "auth/invalid-action-code",
          })
        );
      }
      if (rec.expiresAt && Date.now() > Number(rec.expiresAt)) {
        return Promise.reject(
          Object.assign(new Error("This code has expired. Request a new one."), {
            code: "auth/expired-action-code",
          })
        );
      }
      if (rec.attempts && rec.attempts >= 8) {
        return Promise.reject(
          Object.assign(new Error("Too many attempts. Request a new code."), {
            code: "auth/too-many-requests",
          })
        );
      }

      return sha256Hex(code + "|" + email).then(function (hash) {
        if (hash !== rec.codeHash) {
          var next = (rec.attempts || 0) + 1;
          bumpAttempts(email, next);
          return Promise.reject(
            Object.assign(new Error("Wrong code. Check your email and try again."), {
              code: "auth/invalid-action-code",
            })
          );
        }
        return { ok: true, email: email };
      });
    });
  }

  /**
   * Complete password recovery with 6-digit OTP + new password.
   * Tries serverless Admin API first, then same-browser Firebase oob path.
   */
  function completeWithOtp(email, code, newPassword) {
    email = normalizeEmail(email);
    newPassword = String(newPassword || "");
    if (newPassword.length < 6) {
      return Promise.reject(
        Object.assign(new Error("Password must be at least 6 characters."), {
          code: "auth/weak-password",
        })
      );
    }

    return verifyOtp(email, code).then(function () {
      // 1) Server-side complete (Firebase Admin) if deployed
      return fetch("/api/confirm-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, code: code, newPassword: newPassword }),
      })
        .then(function (res) {
          if (res.ok) {
            return res.json().then(function (body) {
              if (body && body.ok) {
                return markOtpUsed(email).then(function () {
                  try {
                    sessionStorage.removeItem(SS_PENDING);
                    sessionStorage.setItem(SS_EMAIL, email);
                  } catch (_) {}
                  return { ok: true, via: "api" };
                });
              }
              throw new Error((body && body.error) || "API confirm failed");
            });
          }
          throw new Error("API unavailable");
        })
        .catch(function () {
          // 2) Client path: save pending password, ensure Firebase reset email is out,
          //    and finish when user opens the Firebase link (oobCode) — auto-applied.
          try {
            sessionStorage.setItem(
              SS_PENDING,
              JSON.stringify({
                email: email,
                newPassword: newPassword,
                at: Date.now(),
              })
            );
            sessionStorage.setItem(SS_EMAIL, email);
          } catch (_) {}

          return sendViaFirebase(email)
            .catch(function () {
              /* may already have been sent */
            })
            .then(function () {
              return markOtpUsed(email).then(function () {
                return {
                  ok: true,
                  via: "pending_link",
                  message:
                    "Code accepted. Open the secure recovery link in your email to finish applying your new password (same device works automatically).",
                };
              });
            });
        });
    });
  }

  /**
   * If page has Firebase oobCode and we have a pending new password, apply it.
   * @param {string} oobCode
   */
  function tryApplyPendingWithOob(oobCode) {
    oobCode = String(oobCode || "").trim();
    if (!oobCode) return Promise.resolve(null);

    var pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(SS_PENDING) || "null");
    } catch (_) {}
    if (!pending || !pending.newPassword) return Promise.resolve(null);
    if (pending.at && Date.now() - pending.at > OTP_TTL_MS) {
      try {
        sessionStorage.removeItem(SS_PENDING);
      } catch (_) {}
      return Promise.resolve(null);
    }

    var auth = getAuth();
    if (!auth || !auth.confirmPasswordReset) {
      return Promise.resolve(null);
    }

    return auth
      .confirmPasswordReset(oobCode, pending.newPassword)
      .then(function () {
        try {
          sessionStorage.removeItem(SS_PENDING);
        } catch (_) {}
        return { ok: true, via: "oob_auto", email: pending.email };
      })
      .catch(function (err) {
        console.warn("[email-otp] oob auto-apply", err);
        return null;
      });
  }

  /**
   * Complete with Firebase oobCode (from email link) + new password.
   */
  function completeWithOob(oobCode, newPassword) {
    oobCode = String(oobCode || "").trim();
    newPassword = String(newPassword || "");
    if (!oobCode) {
      return Promise.reject(new Error("Missing reset code from email."));
    }
    if (newPassword.length < 6) {
      return Promise.reject(new Error("Password must be at least 6 characters."));
    }
    var auth = getAuth();
    if (!auth) return Promise.reject(new Error("Auth not ready."));
    return auth.confirmPasswordReset(oobCode, newPassword).then(function () {
      try {
        sessionStorage.removeItem(SS_PENDING);
        sessionStorage.removeItem(SS_OTP_META);
      } catch (_) {}
      return { ok: true, via: "oob" };
    });
  }

  function getSavedEmail() {
    try {
      return sessionStorage.getItem(SS_EMAIL) || "";
    } catch (_) {
      return "";
    }
  }

  global.WunnaxEmailOtp = {
    generateCode: generateCode,
    requestOtp: requestOtp,
    verifyOtp: verifyOtp,
    completeWithOtp: completeWithOtp,
    completeWithOob: completeWithOob,
    tryApplyPendingWithOob: tryApplyPendingWithOob,
    getSavedEmail: getSavedEmail,
    deliverCode: deliverCode,
  };
})(typeof window !== "undefined" ? window : globalThis);
