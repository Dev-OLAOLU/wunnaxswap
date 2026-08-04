# Google Login Setup for Wunnaxswap (do this once)

Your Firebase project: **wunnaxswap**  
Your live site (Vercel): **https://wunnaxswap.vercel.app**

Do **Part A** then **Part B**. About **5 minutes**.

---

## Part A — Firebase (enable Google + domain)

### A1. Enable Google sign-in
1. Open: https://console.firebase.google.com/project/wunnaxswap/authentication/providers  
2. Click **Google**  
3. Turn **Enable** ON  
4. Choose a **Project support email** (your Gmail)  
5. Click **Save**

### A2. Authorized domains
1. Open: https://console.firebase.google.com/project/wunnaxswap/authentication/settings  
2. Under **Authorized domains**, confirm these exist (Add if missing):
   - `localhost`
   - `wunnaxswap.firebaseapp.com`
   - `wunnaxswap.vercel.app`  ← **required for Vercel**
3. Do **not** type `https://` — only the host name.

---

## Part B — Google Cloud (fixes Error 400 redirect_uri_mismatch)

This is the step that makes **Continue with Google** work on the live site.

### B1. Open OAuth credentials
1. Open: https://console.cloud.google.com/apis/credentials?project=wunnaxswap  
2. If it asks for project, pick **wunnaxswap**  
3. Under **OAuth 2.0 Client IDs**, click:  
   **Web client (auto created by Google Service)**  
   (If you see several, open the one that says “Web client”)

### B2. Authorized JavaScript origins
Click **+ ADD URI** and add **exactly**:

```text
https://wunnaxswap.vercel.app
```

Also keep (if present):

```text
https://wunnaxswap.firebaseapp.com
http://localhost
http://localhost:5500
```

### B3. Authorized redirect URIs
Click **+ ADD URI** and add **exactly** these two:

```text
https://wunnaxswap.firebaseapp.com/__/auth/handler
https://wunnaxswap.vercel.app/__/auth/handler
```

### B4. Save
1. Click **SAVE** at the bottom  
2. Wait **2–5 minutes** (Google is slow to update)

---

## Part C — Test

1. Open a **Private / Incognito** window  
2. Go to: **https://wunnaxswap.vercel.app/signin.html**  
3. Click **Continue with Google**  
4. Pick your Google account  
5. You should return signed in → home page  

If a popup is blocked: click **Allow** for popups on this site, or use **email** sign-in.

---

## If it still fails — what the error means

| Message | Fix |
|---------|-----|
| **redirect_uri_mismatch** | Part B3 — URI must match **exactly** (https, no trailing slash) |
| **unauthorized-domain** | Part A2 — add `wunnaxswap.vercel.app` |
| **operation-not-allowed** | Part A1 — enable Google provider |
| **Safari can’t connect** | Network blocking Google; try mobile data/VPN or use **email login** |

---

## Quick links (bookmark these)

| Step | Link |
|------|------|
| Enable Google | https://console.firebase.google.com/project/wunnaxswap/authentication/providers |
| Authorized domains | https://console.firebase.google.com/project/wunnaxswap/authentication/settings |
| OAuth credentials | https://console.cloud.google.com/apis/credentials?project=wunnaxswap |
| Live sign-in | https://wunnaxswap.vercel.app/signin.html |
| Live site | https://wunnaxswap.vercel.app/ |

---

## After setup

You only do this **once**. Then Google login works for all users on the Vercel site.
