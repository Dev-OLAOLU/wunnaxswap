# Wunnaxswap — Google OAuth (Firebase)

The site already has a **Firebase backend**. Google sign-in uses that backend — not a separate server.

## Why the app opened without login before

1. A **localStorage** flag (`wunnax_session`) was treated as “logged in” even with no Firebase user  
2. **Google / Apple** used a **fake demo** popup (no real Google)  
3. Some clean URLs were wrongly treated as public  

Those loopholes are closed. Product pages need a **real Firebase session**.

## Enable Google in Firebase (required once)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **wunnaxswap**  
2. **Build → Authentication → Sign-in method**  
3. **Google** → **Enable** → set a support email → **Save**  
4. **Authentication → Settings → Authorized domains** → add:  
   - `wunnaxswap.netlify.app`  
   - `localhost` (for local tests)  
   - any custom domain you use  

5. (Usually automatic) Google provider uses the Firebase OAuth client. If popup fails with “unauthorized domain”, step 4 is missing.

## Test

1. Redeploy site to Netlify  
2. Open https://wunnaxswap.netlify.app/markets.html → should redirect to **sign in**  
3. **Continue with Google** → Google popup → lands on markets with real session  
4. **Log out** → markets/trade/swap blocked again  

## Email / password

Already wired: `signUp` / `signIn` → Firebase Email/Password (must be enabled under Sign-in method).
