# Verification — plain HTML/CSS/JavaScript conversion

Verified locally on 2026-11-02. Nothing was published to GitHub Pages or a backend host.

## Automated checks

`npm test`: **26 passed, 0 failed**. Temporary databases/test servers are isolated from `data/sanaris.sqlite`.

Coverage includes:

- Shared resident submission → protected admin inbox → status update → public tracking.
- Same-origin cookie authentication, server events, unauthorized access, and logout.
- Separate-origin preflight, exact origin allowlist, bearer sessions, revoked sessions, and denied remote first-admin setup.
- Durable complaints/passwords across restart; hosting initialization never replaces an existing password.
- Idempotent retries, input validation, legacy imports preserving current status, and public tracking without private report details.
- Plain entry pages and linked assets load without a bundler; private database/environment/server files cannot be served.
- Relative JavaScript imports stay within the GitHub Pages repository subpath.
- Safe reuse of a running server, port conflicts with unrelated apps/other projects, API-unavailable startup, runtime options.
- 45 dB(A) boundary, settings migration/validation, resident form validation, time checks, unique references.
- Hardware packet validation, empty feeds, stale/delayed/duplicate packets, and per-node sample retention.

`node --check` passed for all application browser/server/launcher JavaScript.
`npm run build` passed and copies only the browser-ready `docs/` site to `dist/`.
`git diff --check` passed (Windows line-ending notices only).

The local dev server was restarted using the finished implementation. A second `npm run dev` successfully reused it without a port error.

## Browser checks

A temporary frontend served the site at `/sanaris-dashboard/` on one localhost origin; a separate backend origin used an in-memory SQLite database. These test services were stopped afterward. No test reports were submitted to the real local database.

- The actual local admin URL opens the new sign-in directly; the old React startup instruction screen is gone.
- Cross-origin admin sign-in, all seven admin routes, and mobile sign-out worked.
- The map opened over Hinabangan with four markers; selecting Residential Area updated its popup, selected station card, and Google Maps link.
- Empty stations/charts show waiting states. Isolated test packets (not real sensor data) exercised High classification at 45, event filtering, the trend/donut charts, node/range selection, and alert acknowledgment. Stale readings were labeled as last readings.
- Invalid settings were rejected; valid 40/45 settings saved.
- Empty resident form showed specific inline errors and focused the first invalid field.
- Location, category, time, description, and consent were retained when switching to tracking and back.
- A resident submission generated a reference and appeared automatically in the admin inbox.
- Admin search returned an empty filtered state and restored the report when cleared. Embedded HTML in a test description was displayed as literal text.
- Resolving the report updated the resident tracker automatically. Refreshing the reference link restored the status and actual two-entry history.
- Stopping the test backend and submitting another draft showed a connection error, kept the entered details, and did not show a success receipt.
- Resident layouts checked at 320, 390, 768 pixels and desktop. Text fields remain 16 px on phones. Unselected category checkmarks are hidden; only the selected option shows a checkmark.
- Admin login and navigation checked on phones. Overview, analytics, history, complaints, and settings fit a 320 px viewport without horizontal page overflow; narrow screens use one monitoring card per row.
- Browser console checks during normal admin/resident flows returned no errors. The deliberately stopped backend produced the expected connection failure.

Local visual proof (ignored by Git to avoid publishing resident screenshots):

- `screenshots/native-admin-login.jpg`
- `screenshots/native-resident-portal.jpg`

## Remaining external setup

- Google Maps requires a configured restricted browser key; the tested default map uses Leaflet/OpenStreetMap.
- No ESP32 is connected. Production sensor ingestion/calibration and permanent telemetry storage remain separate hardware/backend work.
- GitHub Pages and backend hosting have not been deployed. Configure the real HTTPS backend URL and allowed frontend origin before publishing, using README.md.
- The API still uses one SQLite database and in-memory admin sessions/events. Use a persistent disk and one backend instance with this version.
