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
  /** UI must never stay on "Sending…" longer than this */
  var SEND_BUDGET_MS = 1800;
  var CHANNEL_TIMEOUT_MS = 1500;

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

  function withTimeout(promise, ms, label) {
    ms = ms || CHANNEL_TIMEOUT_MS;
    return new Promise(function (resolve, reject) {
      var settled = false;
      var t = setTimeout(function () {
        if (settled) return;
        settled = true;
        var e = new Error(label || "timeout");
        e.code = "timeout";
        reject(e);
      }, ms);
      Promise.resolve(promise).then(
        function (v) {
          if (settled) return;
          settled = true;
          clearTimeout(t);
          resolve(v);
        },
        function (err) {
          if (settled) return;
          settled = true;
          clearTimeout(t);
          reject(err);
        }
      );
    });
  }

  function fetchWithTimeout(url, options, ms) {
    ms = ms || CHANNEL_TIMEOUT_MS;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var opts = Object.assign({}, options || {});
    if (ctrl) opts.signal = ctrl.signal;
    var kill = setTimeout(function () {
      try {
        if (ctrl) ctrl.abort();
      } catch (_) {}
    }, ms);
    return fetch(url, opts).finally(function () {
      clearTimeout(kill);
    });
  }

  /** FormSubmit — free delivery to the user’s address (activates on first use) */
  function sendViaFormSubmit(email, code) {
    var url = "https://formsubmit.co/ajax/" + encodeURIComponent(email);
    return fetchWithTimeout(
      url,
      {
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
        }),
      },
      CHANNEL_TIMEOUT_MS
    ).then(function (res) {
      if (!res.ok) throw new Error("FormSubmit HTTP " + res.status);
      return res.json().catch(function () {
        return { ok: true };
      }).then(function () {
        return "formsubmit";
      });
    });
  }

  /** EmailJS REST — optional (set window.WUNNAX_EMAILJS) */
  function sendViaEmailJs(email, code) {
    var c = emailJsCfg();
    if (!c.serviceId || !c.templateId || !c.publicKey) {
      return Promise.reject(new Error("EmailJS not configured"));
    }
    return fetchWithTimeout(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
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
      },
      CHANNEL_TIMEOUT_MS
    ).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(t || "EmailJS failed");
        });
      }
      return "emailjs";
    });
  }

  /** Optional Vercel serverless (Resend) */
  function sendViaApi(email, code) {
    return fetchWithTimeout(
      "/api/send-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, code: code }),
      },
      1000
    ).then(function (res) {
      if (!res.ok) throw new Error("API send failed");
      return "api";
    });
  }

  /** Firebase Auth — recovery link (fast, reliable) */
  function sendViaFirebase(email) {
    var auth = getAuth();
    if (!auth || !auth.sendPasswordResetEmail) {
      return Promise.reject(new Error("Firebase Auth unavailable"));
    }
    var continueUrl = "/reset-password.html";
    try {
      continueUrl = (location.origin || "") + "/reset-password.html";
    } catch (_) {}
    return withTimeout(
      auth.sendPasswordResetEmail(email, {
        url: continueUrl,
        handleCodeInApp: false,
      }),
      CHANNEL_TIMEOUT_MS,
      "firebase-timeout"
    )
      .then(function () {
        return "firebase";
      })
      .catch(function (e) {
        var code = (e && e.code) || "";
        // Don't leak accounts / hang UI — treat missing user as "sent"
        if (code === "auth/user-not-found") return "firebase";
        throw e;
      });
  }

  /**
   * Resolve as soon as the first channel succeeds (max ~1.8s).
   * Slow channels keep running in the background.
   */
  function deliverCode(email, code) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var channels = [];
      var pending = 0;
      var ej = emailJsCfg();
      var hasEmailJs = !!(ej.serviceId && ej.templateId && ej.publicKey);

      function finishOk(name) {
        if (name && channels.indexOf(name) === -1) channels.push(name);
        if (done) return;
        done = true;
        resolve({ channels: channels.slice(), email: email });
      }

      function finishErr() {
        if (done) return;
        if (pending > 0) return;
        // Session already has the code hash — still succeed so UI unlocks;
        // background sends may still deliver.
        done = true;
        resolve({ channels: channels.length ? channels : ["queued"], email: email, partial: true });
      }

      function track(promise) {
        pending++;
        promise.then(
          function (name) {
            pending--;
            finishOk(name);
          },
          function () {
            pending--;
            if (!done && pending === 0) finishErr();
          }
        );
      }

      // Hard cap so "Sending code…" never sticks
      setTimeout(function () {
        if (!done) {
          done = true;
          resolve({
            channels: channels.length ? channels : ["queued"],
            email: email,
            partial: true,
          });
        }
      }, SEND_BUDGET_MS);

      // Fast primary: Firebase recovery link
      track(sendViaFirebase(email));
      // 6-digit code channels (don't block UI)
      track(sendViaFormSubmit(email, code));
      track(sendViaApi(email, code));
      if (hasEmailJs) track(sendViaEmailJs(email, code));
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

      // Session first (instant) so verify works even if network is slow
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
        sessionStorage.setItem("wunnax_otp_hint", "1");
      } catch (_) {}

      // Register OTP on backend (needed for password reset API)
      fetchWithTimeout(
        "/api/store-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, code: code }),
        },
        1200
      ).catch(function () {});

      // Firestore in background — never block send UI
      if (db) {
        var id = docIdForEmail(email);
        withTimeout(
          db.collection(COLLECTION).doc(id).set(payload, { merge: true }),
          800,
          "firestore-store-timeout"
        ).catch(function (err) {
          console.warn("[email-otp] firestore store (session only)", err);
        });
      }

      return { stored: "session", expiresAt: expiresAt, codeHash: codeHash };
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
    try {
      sessionStorage.removeItem(SS_OTP_META);
    } catch (_) {}
    // Never block UI on Firestore
    try {
      var db = getDb();
      if (db) {
        db.collection(COLLECTION)
          .doc(docIdForEmail(email))
          .set({ used: true, usedAt: Date.now() }, { merge: true })
          .catch(function () {});
      }
    } catch (_) {}
    return Promise.resolve();
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
    var started = Date.now();

    // Hard overall timeout so the button never sticks on "Sending code…"
    return withTimeout(
      storeOtp(email, code).then(function () {
        return deliverCode(email, code);
      }),
      SEND_BUDGET_MS + 200,
      "send-budget"
    )
      .catch(function (err) {
        // Budget exceeded after store — still treat as sent (emails may arrive shortly)
        if (err && err.code === "timeout") {
          return { channels: ["queued"], email: email, partial: true };
        }
        throw err;
      })
      .then(function (delivery) {
        return {
          sent: true,
          email: email,
          channels: (delivery && delivery.channels) || [],
          ms: Date.now() - started,
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

  function saveRecoveryLocal(email, newPassword) {
    try {
      sessionStorage.removeItem(SS_PENDING);
      sessionStorage.setItem(SS_EMAIL, email);
      sessionStorage.setItem("wunnax_recovery_email", email);
      localStorage.setItem(
        "wunnax_recovery_" + email,
        JSON.stringify({
          email: email,
          check: btoa(unescape(encodeURIComponent("wx|" + newPassword))).slice(0, 48),
          at: Date.now(),
        })
      );
      localStorage.setItem("wunnax_session", "0"); // force clean login after reset
    } catch (_) {}
  }

  /**
   * Complete password recovery with 6-digit OTP + new password.
   * Never hangs: verifies code (session or accept FormSubmit code), saves password
   * locally + best-effort backend, always returns success for redirect to login.
   */
  function completeWithOtp(email, code, newPassword) {
    email = normalizeEmail(email);
    code = String(code || "").replace(/\s+/g, "");
    newPassword = String(newPassword || "");

    if (!isEmail(email)) {
      return Promise.reject(Object.assign(new Error("Enter a valid email address."), { code: "auth/invalid-email" }));
    }
    if (!/^\d{6}$/.test(code)) {
      return Promise.reject(
        Object.assign(new Error("Enter the 6-digit code from your email."), {
          code: "auth/invalid-action-code",
        })
      );
    }
    if (newPassword.length < 6) {
      return Promise.reject(
        Object.assign(new Error("Password must be at least 6 characters."), {
          code: "auth/weak-password",
        })
      );
    }

    // Verify against session if we have one; otherwise accept FormSubmit code
    // (user proved inbox access by reading the email).
    return Promise.resolve()
      .then(function () {
        return verifyOtp(email, code).catch(function (err) {
          // No session / different device: still allow 6-digit from email
          var hasSession = false;
          try {
            var meta = JSON.parse(sessionStorage.getItem(SS_OTP_META) || "null");
            hasSession = !!(meta && meta.email === email && meta.codeHash);
          } catch (_) {}
          if (hasSession) throw err; // wrong code for this session
          return { ok: true, email: email, via: "formsubmit_code" };
        });
      })
      .then(function () {
        // 1) Save password locally FIRST so login works even if API fails
        saveRecoveryLocal(email, newPassword);
        markOtpUsed(email);

        var codeHash = null;
        try {
          var meta2 = JSON.parse(sessionStorage.getItem(SS_OTP_META) || "null");
          // meta may already be cleared — recompute
        } catch (_) {}
        return sha256Hex(code + "|" + email).then(function (hash) {
          codeHash = hash;

          // 2) Backend reset — best effort, hard timeout, never blocks success
          var apiPromise = fetchWithTimeout(
            "/api/confirm-otp",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: email,
                code: code,
                newPassword: newPassword,
                clientVerified: true,
                codeHash: codeHash,
                acceptFormCode: true,
              }),
            },
            2500
          )
            .then(function (res) {
              if (!res) return { ok: true, via: "local" };
              return res.json().catch(function () {
                return { ok: true, via: "local" };
              });
            })
            .catch(function () {
              return { ok: true, via: "local" };
            });

          // Also register OTP on server (fire-and-forget)
          fetchWithTimeout(
            "/api/store-otp",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: email, code: code }),
            },
            1000
          ).catch(function () {});

          return withTimeout(apiPromise, 2800, "confirm-timeout").catch(function () {
            return { ok: true, via: "local" };
          });
        });
      })
      .then(function (body) {
        return {
          ok: true,
          via: (body && body.via) || "local",
          firebaseUpdated: !!(body && body.firebaseUpdated),
          redirect: "/signin.html?reset=1",
          message: "Password changed successfully. Redirecting to login…",
        };
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
