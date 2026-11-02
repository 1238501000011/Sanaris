# SANARIS cloud setup

The frontend is plain HTML, CSS and JavaScript. GitHub Pages hosts `docs/`; the
Supabase Edge Function handles authentication and reports. No secret key belongs
in GitHub Pages, `docs/config.js`, or browser storage.

Cloud project: `Sanaris` (`uyhqnvpzrfdshzcbhiha`). The database migration has
been applied. The Edge Function is deployed and its health, public submission,
tracking and unauthorized-admin rejection have been verified. Admin account
creation and real password sign-in remain to be completed.

## Administrator account

1. Open https://supabase.com/dashboard/project/uyhqnvpzrfdshzcbhiha/auth/users.
2. Use **Add user → Create new user** for `norbenbarrios2@gmail.com` and enter a
   strong password yourself. Confirm the email through the dashboard's create-user
   options. Do not send the password in chat or commit it to Git.
3. Once that account exists, grant the intended account membership using the SQL
   Editor (or have the assistant perform this step):

```sql
insert into public.sanaris_admins(user_id)
select id from auth.users
where lower(email) = 'norbenbarrios2@gmail.com'
  and email_confirmed_at is not null
on conflict do nothing;
```

Account creation alone does not grant admin access. No public first-user setup or
self-registration grants membership. The local SQLite password remains unchanged.

## Deployment configuration

- Deploy `supabase/functions/sanaris-api/index.ts` and `handler.js` as the
  `sanaris-api` Edge Function with gateway JWT verification disabled. This is
  necessary for account-free resident submission/tracking. Every admin route
  validates the user with Supabase Auth and checks the server-owned admin table.
- Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function.
  The service-role credential stays server-side; never copy it into the frontend.
- Allowed browser origins default to `https://1238501000011.github.io` and
  localhost port 5173. For another website, set `SANARIS_ALLOWED_ORIGINS` to an
  explicit comma-separated list of origins. Paths and wildcards are not origins.
- Publish the reviewed frontend changes to the existing GitHub repository without
  overwriting remote work. Pages can serve `/docs` directly, or root redirects to
  `docs/` preserve the existing `/Sanaris/docs/` website URL.
- Hosted websites use `config.cloudApiBase`. Localhost uses the Node/SQLite
  backend unless `config.apiBase` is explicitly set to the cloud URL.
- Verify `/functions/v1/sanaris-api/api/health`, sign-in, resident submission,
  admin status updates, resident tracking and logout against the live function.

## Behavior and limitations

- Reports refresh every five seconds. Residents need no account; retain the
  randomly generated reference number to track progress. Tracking exposes status
  and timestamps only, not location or description.
- Auth tokens stay in memory. Refreshing the page or expiration requires signing
  in again. Logout records a token hash that prevents replay through this API.
  No refresh token is returned to the browser.
- Tables have RLS and no browser-role grants/policies: browser access is denied.
  The service-only RPC runs as SECURITY INVOKER. Supabase's informational
  `rls_enabled_no_policy` notices are intentional for these server-only tables:
  https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Shared per-minute limits are 30 login requests, 60 submissions and 600 tracking
  requests. These cap service traffic, but one abusive client can exhaust a shared
  limit. Before broad public use, add CAPTCHA and per-client abuse protection.
- Existing local reports are not uploaded. Cloud import of browser-saved reports
  is hidden; plan an explicit reviewed migration if real historical data is needed.
- No sensor data is generated. ESP32 measurements still require an authenticated
  gateway integration and calibrated hardware.
- The free Supabase tier may pause inactive projects; it does not provide an
  always-on guarantee. Check current plan terms before operational use.

## Verification

`npm test` covers local persistence/access control and the cloud handler using an
injected upstream. `supabase/tests/verify.sql` checks the actual Postgres RPC in a
transaction and rolls back every fixture. `npm run build` copies static files to
`dist/`. Real Supabase password sign-in and public hosting must be checked after
the admin account is created and deployment is approved.
