/**
 * Wunnaxswap — Firebase config (FREE Spark plan)
 *
 * 1. https://console.firebase.google.com → Create project "wunnaxswap"
 * 2. Build → Authentication → Get started → enable Email/Password
 * 3. Build → Firestore Database → Create database → Start in production mode
 * 4. Project settings (gear) → Your apps → Web app → copy config
 * 5. Paste the values below
 * 6. Firestore → Rules → paste firestore.rules (see docs/FIREBASE_BACKEND.md)
 *
 * Never put Admin/service account keys in the browser.
 */
window.WUNNAX_FIREBASE = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

/** True when Firebase web config is filled in. */
window.WUNNAX_FIREBASE_ENABLED = function () {
  var c = window.WUNNAX_FIREBASE || {};
  return !!(c.apiKey && c.projectId && String(c.apiKey).length > 10);
};

// Back-compat aliases (old Supabase names) so partial pages still detect config
window.WUNNAX_SUPABASE_ENABLED = window.WUNNAX_FIREBASE_ENABLED;
