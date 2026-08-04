/**
 * Wunnaxswap — Firebase config
 *
 * Hosted on Vercel. authDomain uses the live hostname when on *.vercel.app
 * (with /__/auth rewrite in vercel.json) so Google login avoids blocked firebaseapp.com.
 *
 * Firebase Console → Authentication → Authorized domains: add your Vercel URL host
 * e.g. wunnaxswap.vercel.app  (and any custom domain)
 *
 * Google Cloud OAuth client → Authorized redirect URIs:
 *   https://YOUR-VERCEL-HOST/__/auth/handler
 *   https://wunnaxswap.firebaseapp.com/__/auth/handler
 */
(function () {
  var host = "";
  try {
    host = (typeof location !== "undefined" && location.hostname) || "";
  } catch (_) {}

  var authDomain = "wunnaxswap.firebaseapp.com";
  // Same-origin auth on Vercel (proxy via vercel.json rewrites)
  if (host && (host.indexOf("vercel.app") !== -1 || host === "wunnaxswap.netlify.app")) {
    authDomain = host;
  }

  window.WUNNAX_FIREBASE = {
    apiKey: "AIzaSyAloxjP-p76entAz4xK5SXQ96dRtRLRAuY",
    authDomain: authDomain,
    projectId: "wunnaxswap",
    storageBucket: "wunnaxswap.firebasestorage.app",
    messagingSenderId: "567140064736",
    appId: "1:567140064736:web:4df9736782798f7a0b1f85",
  };

  window.WUNNAX_FIREBASE_ENABLED = function () {
    var c = window.WUNNAX_FIREBASE || {};
    return !!(c.apiKey && c.projectId && String(c.apiKey).length > 10);
  };

  window.WUNNAX_SUPABASE_ENABLED = window.WUNNAX_FIREBASE_ENABLED;
})();
