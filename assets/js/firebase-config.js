/**
 * Wunnaxswap — Firebase config
 *
 * On Netlify we set authDomain to wunnaxswap.netlify.app and proxy /__/auth/*
 * to Firebase (see netlify.toml + _redirects). That fixes Google login when
 * browsers block third-party cookies on *.firebaseapp.com.
 *
 * Firebase Console checklist:
 *  - Authentication → Sign-in method → Google → Enabled
 *  - Authorized domains includes: wunnaxswap.netlify.app, localhost
 */
(function () {
  var host = "";
  try {
    host = (typeof location !== "undefined" && location.hostname) || "";
  } catch (_) {}

  // Same-origin authDomain only on the live Netlify host (with /__/auth proxy)
  var authDomain =
    host === "wunnaxswap.netlify.app"
      ? "wunnaxswap.netlify.app"
      : "wunnaxswap.firebaseapp.com";

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
