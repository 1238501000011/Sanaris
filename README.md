# SANARIS — Community Noise Monitoring

SANARIS uses **plain HTML, CSS, and browser JavaScript**. There is no React, JSX, Vite, Tailwind, or npm frontend dependency. The browser-ready website is in `docs/`; GitHub Pages can publish that folder directly. A separate backend keeps resident reports shared across devices and protects the admin inbox: Node.js/SQLite locally, or Supabase for GitHub Pages.

The admin and resident sites have separate entry points. Residents need no account. No sensor readings are generated: stations wait for a configured hardware feed. The default high classification starts at **45 dB(A)**. The map is centered on Camia Street in Barangay San Pablo, Catbalogan City. Two planned stations, ESP-01 and ESP-02, await confirmed installation positions and hardware measurements.

## Run locally

Install Node.js 22.13 or newer (Node 24 or newer recommended). From the project folder:

```sh
npm run dev
```

No dependency installation or frontend build is required. On Windows, double-click `Start-SANARIS.cmd`, or use `npm.cmd run dev` if PowerShell blocks `npm.ps1`. Keep the server terminal open.

- Admin sign-in/dashboard: http://127.0.0.1:5173/#/admin/overview
- Resident reporting: http://127.0.0.1:5173/resident/#/report
- Resident tracking: http://127.0.0.1:5173/resident/#/track

The admin page opens sign-in directly. Existing passwords and reports remain in `data/sanaris.sqlite`. On a new local database, the first administrator creates a password of at least 12 characters. The resident site never requires that password.

Starting again reuses a healthy SANARIS process for the same folder/database. If another app owns the port, use `npm run dev -- --port 5180` or stop that app yourself. The launcher never terminates an unrelated process. An experimental SQLite warning on some Node versions is informational.

`npm start` serves the website and API on port 4173. `npm test` runs automated checks. `npm run build` optionally copies `docs/` to `dist/`; `npm run preview` serves that copy and the API. GitHub Pages does not need this build step.

## Antigravity, VS Code, and Live Server

Open the folder containing `package.json`. The standard terminal command above works in any IDE. VS Code-compatible IDEs also have **SANARIS: start server** and admin/resident debug launch configurations.

Live Server can now display the plain frontend. Opening the source-root `index.html` redirects to `docs/`; `resident/index.html` redirects to `docs/resident/`. JavaScript modules require HTTP(S), so use a server instead of double-clicking an HTML file with `file://`.

For working reports/sign-in through Live Server on port 5500:

1. Run the backend with `npm run dev`.
2. In `docs/config.js`, set `apiBase: 'http://127.0.0.1:5173'`.
3. In ignored `.env.local`, set `SANARIS_ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500`.
4. Restart the backend after changing its environment, then refresh Live Server.

Restore `apiBase: ''` to use the same server for both website and API. A static server alone cannot store shared reports or authenticate administrators. If the API is unavailable, the UI displays a connection error; a report is only confirmed after the backend saves it.

## GitHub Pages with a separate backend

**Prepared locally; not publicly deployed.** Uploading source to a repository and publishing a website are separate actions. Do not commit `.env.local`, database files, report exports, passwords, or private resident data. Existing `.gitignore` protections are preserved.

GitHub Pages serves HTML/CSS/JavaScript, so the shared Node/SQLite API must run on a separate host. [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

### 1. Host the backend

Use a Node host with HTTPS and a **persistent writable disk**, running one application instance. This version uses SQLite and in-process sessions/events; ephemeral/serverless storage or multiple replicas need a different database/session design.

- Runtime: Node.js 22.13+.
- Start command: `npm start` (or `node server/start.js`). No build/install packages are required.
- Set `HOST=0.0.0.0` in the host environment. The local default is loopback only.
- Use the host-provided `PORT`.
- Set `SANARIS_DATABASE_PATH` to a file on the mounted persistent disk, such as `/var/data/sanaris.sqlite`.
- Set `SANARIS_ALLOWED_ORIGINS=https://YOUR-ACCOUNT.github.io`. This is an exact **origin**, without `/sanaris-dashboard`, a wildcard, or a trailing slash. Multiple origins may be comma-separated.
- On a new database, set the secret environment variable `SANARIS_INITIAL_ADMIN_PASSWORD` to a unique password of at least 12 characters. It only initializes an unconfigured database and never overwrites an existing password. Remove that environment variable after initialization. The public site cannot claim first-admin setup remotely.
- Check `https://YOUR-BACKEND/api/health` for `{"service":"sanaris","status":"ok"}`.

The backend serves only `docs/` and API routes; private project/database files are outside its public directory. Use HTTPS at the hosting proxy. Back up the database through the host's disk/database backup facility. Sessions expire after eight hours or a backend restart. The public API has input validation and basic request limits; review operational limits and privacy handling before wider use.

To carry existing local reports/password to the host, stop the local server, make a private backup of `data/`, and transfer the database through the host's secure file facility. Never put the database in GitHub or `docs/`.

### 2. Point the frontend at the hosted API

Edit the **public** file `docs/config.js`:

```js
export const config = {
  apiBase: 'https://YOUR-BACKEND',
  googleMapsApiKey: '',
  sensorFeedPath: '',
};
```

This file is downloadable by visitors. Put only the API address and public browser settings here. Admin passwords, gateway keys, and database credentials belong exclusively on the backend.

The admin retains its bearer access token in tab-scoped sessionStorage for cross-origin requests. Refreshing restores the token and asks the server to validate it. Sign-out, authorization rejection or expiry ends access. If browser storage is blocked, sign-in works in memory and a reload requires signing in again. Same-origin local hosting also supports an HttpOnly session cookie. Reports are checked every five seconds, with server events when available on the same origin. Public tracking returns only a reference, status, and status-history dates, not complaint details.

### 3. Publish the frontend when ready

Create/select your repository, inspect `git remote -v`, and commit the source. If the earlier repository was deleted, recreate it or choose a new destination before pushing. Never force-push over existing remote work.

In the repository's **Settings → Pages**, select **Deploy from a branch**, then your source branch (usually `main`) and **`/docs`**, and save. Relative asset/module URLs and hash navigation work under `/sanaris-dashboard/`; `.nojekyll` is included. [GitHub publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Expected URLs after publishing a repository named `sanaris-dashboard`:

- Admin: `https://YOUR-ACCOUNT.github.io/sanaris-dashboard/`
- Residents: `https://YOUR-ACCOUNT.github.io/sanaris-dashboard/resident/`

GitHub Free supports Pages from public repositories. Publishing from a private repository requires a supported paid plan. A Pages site is generally public even if its source repository is private; admin data still requires backend authentication. Do not change repository visibility just to enable Pages without deciding whether the source should be public. [GitHub plan and visibility details](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Share the **resident URL** or a QR code of it with residents. They can submit and track from a phone without seeing admin navigation.

## Project structure

```text
docs/                     Browser-ready GitHub Pages website
  index.html              Admin entry: sign-in, then dashboard
  resident/index.html     Separate resident entry
  config.js               Public API/Google Maps/feed configuration
  assets/css/             Shared, sign-in, and resident styles
  assets/js/admin.js      Admin authentication, routes, forms, filters
  assets/js/resident.js   Resident form, receipt, tracker, navigation
  assets/js/api.js        Shared API requests, session token, updates
  assets/js/ui.js         Escaped HTML helpers, icons, shared UI
  assets/js/model.js      Stations, 45 dBA defaults, classification
  assets/js/telemetry.js  Hardware packet validation and sample history
  assets/js/charts.js     Accessible native SVG charts
  assets/js/monitoringMap.js  Leaflet/Google Maps adapter
  assets/vendor/leaflet/  Local Leaflet distribution and license
server/                   HTTP server, API, SQLite store, authentication
scripts/                  Local launcher, runtime check, optional copy build
tests/                    API, persistence, telemetry, forms, startup tests
data/                     Private local database (ignored by Git)
index.html                Source-folder redirect for static IDE servers
resident/index.html       Source-folder resident redirect
Start-SANARIS.cmd          Windows launcher
```

## Features and limits

Seven admin pages: overview, monitoring map, event history, disturbance alerts, analytics, resident complaints, and assessment settings. Cards and map markers select stations; history filters export received samples as CSV. Charts use actual received samples. Alerts start at the configured high threshold; acknowledgments last for the browser session. Assessment settings are saved in that browser, not centrally synchronized across administrators.

The resident portal includes accessible field labels, inline validation, noise-type choices, a current-time shortcut, draft retention while switching between report/track, unique references, copy/download receipts, and automatic status tracking. Drafts are held in memory and clear when the page closes/reloads. Retrying an unchanged submission uses the same idempotency key while the page remains open.

The API stores complaints durably in SQLite. Old browser-only reports can be imported by a signed-in administrator using the inbox's import action; existing shared statuses are preserved. No sample complaints or simulated sensor readings are inserted.

## Connect the ESP32 gateway later

No ESP32 is connected by this project. The frontend is ready to consume a hardware feed, but gateway ingestion, calibration, and persistent telemetry storage still need implementing on your backend.

1. Calibrate each microphone/measurement chain for A-weighted sound levels and record its measurement interval. A raw ADC/RMS value is not a calibrated dB(A) measurement.
2. Have the ESP32 nodes send timestamped measurements to a trusted gateway using your chosen MQTT or HTTPS design. Authenticate devices on the backend; keep device credentials out of the browser.
3. Store/validate readings on the gateway/backend and expose an admin-protected JSON endpoint, for example `/api/admin/readings` (not implemented yet). Return an array:

   ```json
   [
     {
       "nodeId": "ESP-01",
       "laeqDbA": 42.6,
       "measuredAt": "2026-11-02T00:00:00.000Z",
       "source": "hardware"
     }
   ]
   ```

   This is the expected packet format only, not a live reading. Valid node IDs are `ESP-01` and `ESP-02`; timestamps should be ISO 8601 UTC. An endpoint on the same backend can reuse the admin authentication guard in `server/api.js`.
4. Set `sensorFeedPath: '/api/admin/readings'` in `docs/config.js`. The dashboard polls it using the chosen interval. Unknown nodes, invalid levels, future/invalid timestamps, and non-hardware records are rejected. A failed feed is shown as unavailable, not zero noise.

Click a station card or map marker to open its TinyML + INAE panel. The same
gateway array can include optional device metadata. The following is a packet
format example for integration, with illustrative values only:

```json
{
  "nodeId": "ESP-01",
  "source": "hardware",
  "measuredAt": "2026-11-04T05:08:00Z",
  "receivedAt": "2026-11-04T05:08:01Z",
  "detectedSound": "vehicle noise",
  "confidence": 0.996,
  "microphoneDbfs": -25.8,
  "inaeDecision": "MONITORING",
  "quietHours": false,
  "deviceTime": "2026-11-04T13:08:00+08:00",
  "rtcValid": true,
  "sdOnline": false
}
```

Use timezone-qualified ISO timestamps. `receivedAt` is the gateway's actual
receipt time and is optional. Confidence is a fraction from 0 to 1. The firmware
supplies the INAE decision and quiet-hours flag. Missing metadata displays as
awaiting or unknown. A newer partial packet replaces the prior snapshot, so old
decisions cannot appear as fresh data. Device time is displayed in Philippine
time, and snapshots older than one minute are marked as last received data.

`microphoneDbfs` is a digital microphone level at or below 0 dBFS. Calibrated
`laeqDbA` remains optional in this packet and is required for dBA charts and
threshold alerts. Digital microphone levels are displayed only in the station
detail panel. This UI extension requires the existing gateway feed to supply
the optional fields before device values can appear.
5. Update surveyed station coordinates in `docs/assets/js/model.js`. Test packet loss, stale timestamps, duplicate batches, and threshold boundaries using real calibrated equipment.

The frontend retains up to 120 unique timestamped samples per node for the current admin session. Readings older than 60 seconds are shown as last readings; they do not create current disturbance alerts. Refreshing loses this in-memory sensor history unless the backend returns it again. The displayed arithmetic mean of dB values is a descriptive summary, not an energy-averaged acoustic exposure metric. The configurable 45 dB(A) per-reading cutoff is an application policy, not proof of a legal violation or a complete WHO nighttime assessment.

## Google Maps

OpenStreetMap/Leaflet works by default. To use Google Maps, enable Maps JavaScript API and billing in Google Cloud, create a browser API key with website-referrer and API restrictions, and set `googleMapsApiKey` in `docs/config.js`. Restrict it to your localhost and published frontend URLs. A browser key is necessarily visible to visitors; never use an unrestricted server credential. The map falls back to OpenStreetMap if Google Maps cannot load. [Google's setup guide](https://developers.google.com/maps/documentation/javascript/get-api-key).

## Verification

See `TESTING.md` for automated and browser checks. Tests use isolated temporary/in-memory databases and do not modify the real resident database. A source-only backup of the previous React version is retained locally under ignored `.npm-cache/react-migration-backup/`.

## Supabase hosting setup

For the prepared Supabase backend and restored admin/resident interfaces, follow
[SUPABASE-SETUP.md](SUPABASE-SETUP.md). The cloud database and Edge Function are deployed; create the administrator
account as described in that guide. Local Node/SQLite mode
continues to work independently.
