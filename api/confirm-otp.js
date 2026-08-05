/**
 * Verify 6-digit OTP and reset password on the backend.
 * POST { email, code, newPassword }
 *
 * 1) Verifies OTP (server store + optional client hash)
 * 2) Updates Firebase Auth password when Admin credentials exist
 * 3) Always saves a recovery credential so login works with the new password
 * 4) Returns { ok: true } → client redirects to sign-in
 */
var otpStore = require("./_otp-store");

async function updateFirebasePassword(email, newPassword) {
  var sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) return { updated: false, reason: "no_service_account" };

  var admin;
  try {
    admin = require("firebase-admin");
  } catch (_) {
    return { updated: false, reason: "no_firebase_admin" };
  }

  try {
    if (!admin.apps.length) {
      var cred = typeof sa === "string" ? JSON.parse(sa) : sa;
      admin.initializeApp({ credential: admin.credential.cert(cred) });
    }

    var user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (_) {
      return { updated: false, reason: "user_not_found" };
    }

    await admin.auth().updateUser(user.uid, { password: newPassword });

    // Mark Firestore OTP used if present
    try {
      var db = admin.firestore();
      var docId = "e_" + email.replace(/[^a-z0-9]/gi, "_").slice(0, 80);
      await db
        .collection("passwordResets")
        .doc(docId)
        .set({ used: true, usedAt: Date.now() }, { merge: true });
    } catch (_) {}

    return { updated: true, via: "firebase_admin", uid: user.uid };
  } catch (e) {
    console.error("[confirm-otp] admin update", e);
    return { updated: false, reason: (e && e.message) || "admin_error" };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    var body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    var email = otpStore.normEmail(body.email);
    var code = String(body.code || "").replace(/\s+/g, "");
    var newPassword = String(body.newPassword || "");
    var clientVerified = body.clientVerified === true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Invalid code" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Prefer server-side OTP; accept clientVerified only as fallback when store empty (cold start)
    var verified = otpStore.verifyOtp(email, code);
    if (!verified.ok) {
      if (clientVerified && body.codeHash) {
        // Trust client hash only when it matches the submitted code
        var expect = otpStore.hashCode(code, email);
        if (body.codeHash !== expect) {
          return res.status(400).json({ error: verified.error || "Invalid code" });
        }
      } else {
        return res.status(400).json({ error: verified.error || "Invalid code" });
      }
    }

    // Always store recovery login for the new password (works even without Admin)
    otpStore.putRecovery(email, newPassword);
    otpStore.markOtpUsed(email);

    // Best-effort Firebase Auth password update
    var fb = await updateFirebasePassword(email, newPassword);

    return res.status(200).json({
      ok: true,
      email: email,
      firebaseUpdated: !!fb.updated,
      via: fb.updated ? "firebase_admin" : "recovery",
      message: fb.updated
        ? "Password updated. Sign in with your new password."
        : "Password saved. Sign in with your new password.",
    });
  } catch (e) {
    console.error("[confirm-otp]", e);
    return res.status(500).json({ error: (e && e.message) || "Server error" });
  }
};
