# Consumer web deployment

The consumer app is a separate Vercel static deployment from the backend and
admin portal. Its Vercel project root must be this repository. `vercel.json`
exports Expo to `dist`, serves real exported files before the SPA rewrite, and
falls back all application routes to `index.html`.

The authenticated SPA sends `X-Robots-Tag: noindex, nofollow, noarchive` on all
responses. Do not remove that policy unless a separate public, indexable site is
introduced.

## Frontend environment

Set these variables in the consumer Vercel project for Production and each
approved Preview environment:

- `EXPO_PUBLIC_API_URL` — backend origin with no trailing slash, for example
  `https://tribe-tracker-backend.vercel.app`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the browser-safe publishable/anon key,
  never `service_role`
- `EXPO_PUBLIC_WEB_APP_URL` — canonical consumer origin, for example
  `https://app.tribetracker.com`
- `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` — RevenueCat Web Billing public key
- `EXPO_PUBLIC_REVENUECAT_WEB_MONTHLY_PRODUCT_ID` — exact monthly RevenueCat
  Billing product identifier
- `EXPO_PUBLIC_REVENUECAT_WEB_ANNUAL_PRODUCT_ID` — exact annual RevenueCat
  Billing product identifier

Keep `EXPO_PUBLIC_BILLING_MODE` unset in release deployments. Legal and support
URLs may be overridden with `EXPO_PUBLIC_TERMS_URL`,
`EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_SUPPORT_URL`, and
`EXPO_PUBLIC_COMMUNITY_GUIDELINES_URL`.

The Content Security Policy permits the current backend, Supabase HTTPS and
Realtime, RevenueCat, and Stripe checkout surfaces. If the backend origin or
billing provider changes, update and test the CSP before changing production
environment values.

## External configuration

In RevenueCat, connect the Stripe account to RevenueCat Billing, attach both web
products to monthly and annual packages in the current offering, and grant the
same `pro` entitlement used by Apple and Google. Register the production web
domain for browser wallet payment methods where required.

In Supabase Auth, add the exact production and approved Preview callback URLs,
including `/reset-password`, to the redirect allowlist. If email confirmation
is enabled, verify the project Site URL completes confirmation in the intended
web/native flow. Run the Security Advisor and the cross-user/RLS/Storage checks
documented in the backend repository before launch.

## Deployment order

1. Back up the database and apply the backend migrations in timestamp order.
2. Verify Supabase RLS, Storage policies, advisors, and Auth redirect URLs in
   staging.
3. Configure RevenueCat Billing products, offering, entitlement, web public key,
   backend secret key, and webhook authorization; send a test webhook.
4. Deploy the backend with `TRIBE_TRACKER_WEB_ALLOWED_ORIGINS` set to the exact
   staging consumer origin and `TRIBE_TRACKER_WEB_APP_ORIGIN` set to that same
   origin.
5. Deploy this frontend with the variables above. Confirm direct loads of
   `/login`, `/reset-password`, `/challenge/:id`, `/invite/:code`, and
   `/organization-invite/:token` return the SPA rather than 404.
6. In staging, test sign-in, password recovery, API reads/writes, Realtime,
   monthly and annual purchase, restore, subscription management, and
   cross-platform entitlement visibility.
7. Repeat migrations and backend deployment in production first, then deploy
   the production frontend. Run the same smoke checks before announcing it.

Do not set `TRIBE_TRACKER_WEB_APP_ORIGIN` to a frontend deployment until its SPA
fallback and required environment variables are live; backend landing pages
begin emitting consumer links as soon as that value is enabled.
