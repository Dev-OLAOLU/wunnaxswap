/**
 * Wunnaxswap — Supabase project config
 *
 * 1. Create a new project at https://supabase.com
 * 2. Project Settings → API → copy Project URL + anon public key
 * 3. SQL Editor → run supabase/APPLY_IN_DASHBOARD.sql
 * 4. Auth → URL config → add your site URL (and localhost)
 * 5. Paste URL + anon key below (publishable only — never the service_role key)
 */
window.WUNNAX_SUPABASE = {
  // Example: "https://xxxxxxxx.supabase.co"
  url: "",
  // Example: "eyJhbGciOi..."
  anonKey: "",
};

/** True when both values are set (backend enabled). */
window.WUNNAX_SUPABASE_ENABLED = function () {
  var c = window.WUNNAX_SUPABASE || {};
  return !!(c.url && c.anonKey && String(c.url).indexOf("http") === 0);
};
