/**
 * Shared in-memory OTP + recovery password store for Vercel serverless.
 * Note: best-effort across warm instances; client also keeps session OTP hash.
 */
var crypto = require("crypto");

function store() {
  if (!global.__wunnaxOtpStore) {
    global.__wunnaxOtpStore = {
      otps: new Map(), // email -> { codeHash, expiresAt, used, attempts }
      recovery: new Map(), // email -> { passwordHash, updatedAt }
    };
  }
  return global.__wunnaxOtpStore;
}

function normEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function hashCode(code, email) {
  return crypto.createHash("sha256").update(String(code) + "|" + normEmail(email)).digest("hex");
}

function hashPassword(password) {
  return crypto.createHash("sha256").update("wunnax|v1|" + String(password)).digest("hex");
}

function putOtp(email, code, ttlMs) {
  email = normEmail(email);
  ttlMs = ttlMs || 15 * 60 * 1000;
  var rec = {
    codeHash: hashCode(code, email),
    expiresAt: Date.now() + ttlMs,
    used: false,
    attempts: 0,
  };
  store().otps.set(email, rec);
  return rec;
}

function verifyOtp(email, code) {
  email = normEmail(email);
  code = String(code || "").replace(/\s+/g, "");
  var rec = store().otps.get(email);
  if (!rec) return { ok: false, error: "No reset code found. Request a new one." };
  if (rec.used) return { ok: false, error: "This code was already used. Request a new one." };
  if (Date.now() > Number(rec.expiresAt)) return { ok: false, error: "This code has expired. Request a new one." };
  if (rec.attempts >= 8) return { ok: false, error: "Too many attempts. Request a new code." };
  if (hashCode(code, email) !== rec.codeHash) {
    rec.attempts += 1;
    store().otps.set(email, rec);
    return { ok: false, error: "Wrong code. Check your email and try again." };
  }
  return { ok: true, rec: rec };
}

function markOtpUsed(email) {
  email = normEmail(email);
  var rec = store().otps.get(email);
  if (rec) {
    rec.used = true;
    store().otps.set(email, rec);
  }
}

function putRecovery(email, password) {
  email = normEmail(email);
  store().recovery.set(email, {
    passwordHash: hashPassword(password),
    updatedAt: Date.now(),
  });
}

function checkRecovery(email, password) {
  email = normEmail(email);
  var rec = store().recovery.get(email);
  if (!rec) return false;
  // Recoveries older than 30 days expire
  if (Date.now() - Number(rec.updatedAt) > 30 * 24 * 60 * 60 * 1000) {
    store().recovery.delete(email);
    return false;
  }
  return rec.passwordHash === hashPassword(password);
}

module.exports = {
  normEmail: normEmail,
  hashCode: hashCode,
  hashPassword: hashPassword,
  putOtp: putOtp,
  verifyOtp: verifyOtp,
  markOtpUsed: markOtpUsed,
  putRecovery: putRecovery,
  checkRecovery: checkRecovery,
  store: store,
};
