# One-time Google Cloud fix (stops redirect_uri_mismatch)

Your network often **blocks** `*.firebaseapp.com`, so Google login must use:

```text
https://wunnaxswap.netlify.app/__/auth/handler
```

Add that URI in Google Cloud (Firebase does not always add it for Netlify).

## Steps (about 3 minutes)

1. Open https://console.cloud.google.com/  
2. Select project **wunnaxswap** (same as Firebase)  
3. **APIs & Services → Credentials**  
4. Under **OAuth 2.0 Client IDs**, open **Web client (auto created by Google Service)**  
   (or the web client used by Firebase)  
5. **Authorized JavaScript origins** → **Add URI**:
   - `https://wunnaxswap.netlify.app`
6. **Authorized redirect URIs** → **Add URI**:
   - `https://wunnaxswap.netlify.app/__/auth/handler`
   - `https://wunnaxswap.firebaseapp.com/__/auth/handler` (keep this too)
7. **Save**
8. Wait 2–5 minutes, then try Google login again  

## Also in Firebase

- Authentication → Sign-in method → **Google = Enabled**  
- Authorized domains includes **wunnaxswap.netlify.app** (you already have this)

## Without this Cloud step

Use **email + password** on the sign-in page — that does **not** need `firebaseapp.com` in the browser.
