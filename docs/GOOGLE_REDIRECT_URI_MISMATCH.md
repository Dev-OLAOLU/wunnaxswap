# Fix: Error 400 redirect_uri_mismatch (Google login)

## What it means

Google received a **callback URL it does not recognize**.

After we briefly set `authDomain` to `wunnaxswap.netlify.app`, Google expected:

```text
https://wunnaxswap.netlify.app/__/auth/handler
```

…but the OAuth client only had Firebase’s default:

```text
https://wunnaxswap.firebaseapp.com/__/auth/handler
```

## App fix (already in code)

- `authDomain` is back to **`wunnaxswap.firebaseapp.com`**
- Google sign-in uses **popup** first (uses the default handler URI)
- Netlify sends header **`Cross-Origin-Opener-Policy: same-origin-allow-popups`**

Redeploy the site, then try **Continue with Google** again.  
**Allow popups** for `wunnaxswap.netlify.app`.

## If you still want custom-domain auth later

In [Google Cloud Console](https://console.cloud.google.com/) → project **wunnaxswap**:

1. **APIs & Services → Credentials**
2. Open the **Web client** OAuth 2.0 client (often “Web client (auto created by Google Service)”)
3. **Authorized JavaScript origins** add:
   - `https://wunnaxswap.netlify.app`
4. **Authorized redirect URIs** add:
   - `https://wunnaxswap.firebaseapp.com/__/auth/handler`
   - `https://wunnaxswap.netlify.app/__/auth/handler` (only if using custom authDomain + proxy)
5. Save and wait a few minutes

## Firebase (still required)

- **Authentication → Sign-in method → Google → Enabled**
- **Authorized domains** includes `wunnaxswap.netlify.app` (you already have this)
