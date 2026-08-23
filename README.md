# Easy Express website

Official website and player portal for **Easy Express**, the Team 4R PC shop simulator.

## Local development

1. Copy `.env.example` to `.env.local` and fill in the required values.
2. Run `npm install`.
3. Run `npm run dev`.

## Vercel configuration

Set the server variables from `.env.example` in the Vercel project settings. `PLAYFAB_SECRET_KEY`, `PAYMONGO_SECRET_KEY`, and `PAYMONGO_WEBHOOK_SECRET` must never use a `VITE_` prefix because they are server-only secrets.

The PlayFab secret that was previously included in frontend source must be rotated in PlayFab before deploying this version.

## Account flow

- Registration creates the PlayFab account, then sends the OTP from a serverless endpoint so the code is never returned to browser code.
- Incomplete registrations can resume email verification on the same device.
- Login resolves the canonical PlayFab username, whether the player entered an email or username.
- Password recovery uses PlayFab's native single-use recovery link.
- Admin operations are allow-listed and proxied through `/api/admin`; the PlayFab secret remains on the server.
