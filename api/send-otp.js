/**
 * Vercel serverless — optional OTP email via Resend.
 * Set env RESEND_API_KEY (and optional RESEND_FROM) in Vercel project settings.
 *
 * Without Resend, client still delivers via FormSubmit + Firebase.
 */
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
    var code = String(body.code || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Invalid code" });
    }

    var key = process.env.RESEND_API_KEY;
    if (!key) {
      return res.status(501).json({ error: "Resend not configured", skipped: true });
    }

    var from = process.env.RESEND_FROM || "Wunnaxswap <onboarding@resend.dev>";
    var subject = "Wunnaxswap password reset code: " + code;
    var html =
      "<div style=\"font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px\">" +
      "<h2 style=\"color:#111\">Wunnaxswap</h2>" +
      "<p>Your password reset code:</p>" +
      "<p style=\"font-size:28px;font-weight:800;letter-spacing:0.3em;color:#1333fc\">" +
      code +
      "</p>" +
      "<p style=\"color:#6b7280;font-size:13px\">Expires in 15 minutes. If you did not request this, ignore this email.</p>" +
      "</div>";

    var r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from,
        to: [email],
        subject: subject,
        html: html,
        text:
          "Wunnaxswap password recovery\n\nYour reset code: " +
          code +
          "\n\nExpires in 15 minutes.",
      }),
    });

    if (!r.ok) {
      var t = await r.text();
      return res.status(502).json({ error: "Resend failed", detail: t.slice(0, 300) });
    }

    return res.status(200).json({ ok: true, via: "resend" });
  } catch (e) {
    return res.status(500).json({ error: (e && e.message) || "Server error" });
  }
};
