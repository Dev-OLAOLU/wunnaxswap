# Password reset OTP (email codes)

## How it works
1. User enters registered email on `/forgot-password.html`
2. App generates a **random 6-digit code**
3. Code is emailed via (first success counts):
   - `/api/send-otp` (Resend, if `RESEND_API_KEY` is set on Vercel)
   - EmailJS (if configured in `assets/js/email-config.js`)
   - FormSubmit (free → user’s inbox; first send may need “activate form”)
   - Firebase Auth password-reset email (secure recovery link backup)
4. User enters code + new password on `/reset-password.html`
5. Password is updated via:
   - `/api/confirm-otp` + Firebase Admin (if `FIREBASE_SERVICE_ACCOUNT` set), or
   - Firebase recovery link auto-apply (same browser)

## Optional Vercel env
- `RESEND_API_KEY` — reliable branded OTP email
- `RESEND_FROM` — e.g. `Wunnaxswap <noreply@yourdomain.com>`
- `FIREBASE_SERVICE_ACCOUNT` — full JSON of Firebase service account for one-step password set

## Optional EmailJS
Edit `assets/js/email-config.js` with serviceId, templateId, publicKey.
Template vars: `{{to_email}}`, `{{reset_code}}`, `{{message}}`

## Deploy Firestore rules
```
firebase deploy --only firestore:rules
```
