# Wunnaxswap — Google OAuth (Firebase)

Google sign-in uses **Firebase Auth** (popup first; if blocked, full-page **redirect**).

## Required console setup (without this, Google always fails)

1. [Firebase Console](https://console.firebase.google.com/) → **wunnaxswap**  
2. **Authentication → Sign-in method → Google → Enable → Save** (support email required)  
3. **Authentication → Settings → Authorized domains** must include:  
   - `wunnaxswap.netlify.app`  
   - `localhost`  
4. Wait ~1 minute after saving, then hard-refresh the site  

## App behaviour

| Step | What happens |
|------|----------------|
| Click **Continue with Google** | Popup to Google (or redirect on mobile / if popup blocked) |
| After success | Creates/loads Firestore `users/{uid}` wallet |
| Return from redirect | `completeRedirectSignIn()` finishes session on `signin.html` / `signup.html` |

## Common errors

| Message | Fix |
|---------|-----|
| unauthorized domain | Add `wunnaxswap.netlify.app` under Authorized domains |
| operation-not-allowed | Enable **Google** provider |
| popup blocked | Allow popups, or wait — app falls back to redirect |
| popup closed | User closed Google window — try again |

## Test

1. Deploy latest site to Netlify  
2. https://wunnaxswap.netlify.app/signin.html → **Continue with Google**  
3. Should land on markets with a real session  
