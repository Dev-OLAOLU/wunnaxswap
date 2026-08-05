/**
 * Register a client-generated OTP on the server so confirm can verify it.
 * POST { email, code }
 */
var otpStore = require("./_otp-store");

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Invalid code" });
    }

    otpStore.putOtp(email, code, 15 * 60 * 1000);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: (e && e.message) || "Server error" });
  }
};
