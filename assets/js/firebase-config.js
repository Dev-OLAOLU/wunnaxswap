/**
 * Wunnaxswap — Firebase config
 *
 * On Netlify: authDomain = this site + /__/auth proxy (see netlify.toml).
 * That way Safari never needs to open *.firebaseapp.com directly
 * (many networks block firebaseapp.com → "can't connect to internet").
 *
 * Google Cloud Console MUST list redirect URI (or Google returns 400):
 *   https://wunnaxswap.netlify.app/__/auth/handler
 * See docs/GOOGLE_CLOUD_OAUTH_SETUP.md
 */
(function () {
  var host = "";
  try {
    host = (typeof location !== "undefined" && location.hostname) || "";
  } catch (_) {}

  var authDomain = "wunnaxswap.firebaseapp.com";
  if (host === "wunnaxswap.netlify.app") {
    authDomain = "wunnaxswap.netlify.app";
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
