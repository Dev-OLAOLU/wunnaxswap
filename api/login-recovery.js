/**
 * Login with password set via OTP recovery (when Firebase Admin was unavailable).
 * POST { email, password } → { ok, user }
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
    var password = String(body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    if (!otpStore.checkRecovery(email, password)) {
      return res.status(401).json({ error: "Wrong email or password." });
    }

    var name = email.split("@")[0] || "Trader";
    return res.status(200).json({
      ok: true,
      user: {
        id: "recovery_" + Buffer.from(email).toString("base64url").slice(0, 24),
        email: email,
        name: name,
        provider: "email",
        backend: "recovery",
      },
    });
  } catch (e) {
    return res.status(500).json({ error: (e && e.message) || "Server error" });
  }
};
