/**
 * Vercel serverless — set Firebase password after OTP verification.
 * Requires FIREBASE_SERVICE_ACCOUNT (JSON string of service account).
 *
 * Without Admin credentials, client finishes recovery via Firebase email link.
 */
var crypto = require("crypto");

// In-memory OTP mirror for this instance (client also stores in session/Firestore)
// Production should verify against Firestore with Admin SDK.
var recent = global.__wunnaxOtps || (global.__wunnaxOtps = new Map());

function hashCode(code, email) {
  return crypto.createHash("sha256").update(String(code) + "|" + String(email)).digest("hex");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    var body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    var email = String(body.email || "")
      .trim()
      .toLowerCase();
    var code = String(body.code || "").replace(/\s+/g, "");
    var newPassword = String(body.newPassword || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Invalid code" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password too short" });
    }

    var sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) {
      return res.status(501).json({
        error: "Admin not configured",
        skipped: true,
        hint: "Client will finish via Firebase recovery link",
      });
    }

    var admin;
    try {
      admin = require("firebase-admin");
    } catch (_) {
      return res.status(501).json({ error: "firebase-admin not installed", skipped: true });
    }

    if (!admin.apps.length) {
      var cred = JSON.parse(sa);
      admin.initializeApp({
        credential: admin.credential.cert(cred),
      });
    }

    // Prefer verifying against Firestore if the client stored the OTP there
    var db = admin.firestore();
    var docId =
      "e_" +
      email.replace(/[^a-z0-9]/gi, "_").slice(0, 80);
    var snap = await db.collection("passwordResets").doc(docId).get();
    if (!snap.exists) {
      return res.status(400).json({ error: "No reset request found. Request a new code." });
    }
    var data = snap.data() || {};
    if (data.used) {
      return res.status(400).json({ error: "Code already used" });
    }
    if (data.expiresAt && Date.now() > Number(data.expiresAt)) {
      return res.status(400).json({ error: "Code expired" });
    }
    var expected = data.codeHash;
    var got = hashCode(code, email);
    if (!expected || expected !== got) {
      var attempts = (data.attempts || 0) + 1;
      await snap.ref.set({ attempts: attempts }, { merge: true });
      return res.status(400).json({ error: "Wrong code" });
    }

    // Update password for the registered user
    var user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (e) {
      return res.status(404).json({ error: "No account for that email" });
    }

    await admin.auth().updateUser(user.uid, { password: newPassword });
    await snap.ref.set({ used: true, usedAt: Date.now() }, { merge: true });

    return res.status(200).json({ ok: true, via: "admin" });
  } catch (e) {
    console.error("[confirm-otp]", e);
    return res.status(500).json({ error: (e && e.message) || "Server error" });
  }
};
