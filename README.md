# Easy Express Training Portal

React/Vite employee training portal for the existing Easy Express Unity game, deployed on the existing Vercel project `easy-express-sites-izwi`.

Production: https://easy-express-sites-izwi.vercel.app

Read `docs/TRAINING.md` for architecture, setup, the game contract, rubric definitions, CEO/admin access, verification and remaining signed-in test steps.

## Local setup

```sh
npm ci
npm run dev
```

The local preview listens on http://127.0.0.1:5173. Its isolated file backend stores encrypted demonstration records and a development key under ignored `work/`. It never treats demo cookies as real game authorization. Optional PlayFab title configuration comes from server environment variables.

## Checks

```sh
npm run lint
npm test
npm run build
```

`scripts/production-smoke.mjs` verifies public denial and an isolated fictional demo workflow against the live portal. It does not establish real employee PlayFab sign-in or a Unity tutorial playthrough.

## Publish

```sh
npx vercel link --project easy-express-sites-izwi --yes
npx vercel --prod --yes
```

Confirm the linked project before publishing. The supplied URL belongs to `easy-express-sites-izwi`, which differs from the project that was previously linked in this checkout.

Employee permissions are enforced by the API. The CEO identity is configured on the server; administrator grants are persisted in private encrypted storage. Browser storage does not contain shared training records, passwords, server keys or administrator role authority.
