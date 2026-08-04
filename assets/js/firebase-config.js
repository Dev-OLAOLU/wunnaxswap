/**
 * Wunnaxswap — Firebase config
 *
 * authDomain MUST stay on *.firebaseapp.com unless you also add
 *   https://YOUR_DOMAIN/__/auth/handler
 * in Google Cloud Console → OAuth client → Authorized redirect URIs.
 * Using netlify.app as authDomain without that entry causes:
 *   Error 400: redirect_uri_mismatch
 */
window.WUNNAX_FIREBASE = {
  apiKey: "AIzaSyAloxjP-p76entAz4xK5SXQ96dRtRLRAuY",
  authDomain: "wunnaxswap.firebaseapp.com",
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
