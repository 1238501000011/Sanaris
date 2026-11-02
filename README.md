# SANARIS — Community Noise Monitoring

A local Computer Engineering capstone application with separate admin and resident React entry points, built with Vite, Tailwind CSS 4, Recharts, React Leaflet, and Lucide React. A Node.js API and SQLite database share resident reports across browser sessions. Nothing has been deployed publicly.

## Run locally

Requires Node.js 22.13+ (Node 24 recommended) and npm. The report backend uses the built-in `node:sqlite` module. Node 24.11 displays an experimental SQLite warning.

```sh
npm install
npm run dev
```

Run `npm run dev` for both local sites and their shared API:

- Admin: http://127.0.0.1:5173/#/admin/overview
- Resident reporting: http://127.0.0.1:5173/resident/#/report
- Resident tracking: http://127.0.0.1:5173/resident/#/track

On the first admin visit, create a password with at least 12 characters. Later visits use that password. Residents can submit and track reports without an admin account. The two sites have separate HTML/JavaScript entry points and no links into each other's interface. They share one local server and database.

After `npm run build`, `npm start` serves both built sites and the API at port 4173. `npm run preview` also includes the local API. Development and built servers use `data/sanaris.sqlite` by default. Run one application server at a time for immediate event delivery. Servers bind to `127.0.0.1`, so these links work on this computer. Network/public hosting requires a separate deployment decision and HTTPS configuration.

## Opening the project in another IDE

Open the **Sanaris project folder containing `package.json`** in Antigravity, VS Code, or another IDE. Run the two commands above in that folder's terminal. On Windows PowerShell, use `npm.cmd` if your execution policy blocks `npm.ps1`. Keep the terminal running while you use the sites.

**Windows launcher:** double-click `Start-SANARIS.cmd`. It checks the Node version, installs locked dependencies if the Vite package is missing, starts or reuses the application and report API, and opens the admin site. It works from another working directory because it uses its own project folder. Close a server you started with Ctrl+C. The optional `--no-open` argument runs without opening a browser.

**VS Code-compatible run/debug support:** `.vscode/tasks.json` provides **SANARIS: install dependencies** and **SANARIS: start server**. Run the install task once after copying/cloning the project, then use **Terminal → Run Build Task** (Ctrl+Shift+B) to start it. The Run and Debug configurations **SANARIS: Admin dashboard** and **SANARIS: Resident reporting** start the server before launching Chrome. These configurations depend on the IDE's VS Code task/JavaScript debugger support. The terminal commands and Windows launcher work independently of IDE support.

**Why Go Live showed a blank page:** Live Server at port 5500 serves source files directly. The browser cannot execute the project's uncompiled React JSX, and Live Server does not run the Node/SQLite complaint API. The HTML now shows startup instructions if React cannot load. Use the Vite address at port 5173 for the functioning application. See [Vite's development workflow](https://vite.dev/guide/) and [VS Code tasks](https://code.visualstudio.com/docs/debugtest/tasks).

`npm run dev` now checks whether a healthy SANARIS server for **this project folder and database** already owns port 5173. If so, it prints both site links and exits successfully instead of trying to start a second server. Keep the original server terminal open. The Windows launcher also opens the existing site when used normally. This preserves the existing admin session and report update connections.

If a different application or another SANARIS installation owns the port, the launcher explains the conflict and leaves it running. Stop that server yourself, or intentionally choose another port with `npm run dev -- --port 5180`. It never silently chooses a different port. Update any Google Maps website restriction to match the chosen port. Run `npm run dev -- --help` for supported options.

The `ExperimentalWarning: SQLite is an experimental feature` line is informational in Node 24.11. The startup failure in `Error: Port 5173 is already in use` was a second server trying to bind the same address. Reusing an existing server avoids importing SQLite or starting another API process.

For a built local installation, stop the development server and run:

```sh
npm run build
npm start
```

Open `http://127.0.0.1:4173/` for admin or `http://127.0.0.1:4173/resident/` for residents. Serving `dist/` through a static-only extension still omits the report API. Run checks separately with `npm test`.

## Implemented

- Seven admin pages: overview, monitoring map, event history, disturbance alerts, analytics, complaints, assessment settings.
- Four configured ESP32 stations. Each shows “Awaiting sensor data” until its first gateway measurement.
- Google Maps integration with road/satellite views, keyboard-accessible station markers, measurement popups and station selection. React Leaflet / OpenStreetMap remains available until a Google Maps key is configured, or if Google Maps fails to load. Both providers use the illustrative Hinabangan, Samar locations and need internet access.
- Recharts trends, threshold line, classification counts and per-node averages/peaks. Averages are arithmetic sample summaries, **not acoustic Leq**.
- Session event log, node/classification filtering, full filtered CSV export (table displays up to 100 rows).
- Potential-disturbance review and per-session acknowledgment. Alerts are current threshold exceedances, not verified violations or duration-based enforcement decisions.
- Threshold configuration with cross-field validation, immediately applied to readings and history.
- Separate resident complaint form, server-generated references, status tracking and timeline. Submission success is shown only after the database confirms storage. Failed submissions retain form input, and repeated attempts with the same submission identifier do not create duplicates.
- Admin complaint search, status filters, saved browser-report import, and status changes persisted in SQLite. Reports survive browser and application restarts.
- Automatic report updates via server-sent events with a 15-second refresh fallback. New reports update the admin overview and sidebar count. Admin status changes update an open resident tracker.
- Admin password setup/sign-in, an eight-hour HttpOnly session, protected complaint-list/status APIs, input validation, and request rate limits. Public tracking exposes the reference/status/history without the report description or location.
- Responsive sidebar, mobile navigation, single-column resident forms and explicit sensor connection states.
- Responsive admin sign-in with a balanced desktop layout, compact mobile layout, password visibility controls, and clear connection/sign-in feedback.
- Resident services with prominent report/track navigation, selectable noise categories, a current-time shortcut, field-specific validation, and form details retained when switching tabs or retrying a failed submission. Confirmation includes copyable references, a downloadable receipt, and a tracking link that works after refreshing the page.

## Project structure

```text
src/
  App.jsx                   Admin-only navigation, sign-in and layout
  ResidentApp.jsx           Independent resident layout and report/track routes
  main.jsx                  Admin React entry point
  resident-main.jsx         Resident React entry point
  styles.css                Theme, responsive layouts, Tailwind import
  components/
    UI.jsx                  Shared headings, cards, badges, panels, empty states
    MonitoringMap.jsx       Map provider selection, fallback, shared legend
    GoogleMonitoringMap.jsx Google Maps, accessible station markers and popups
    MapSettings.jsx         Google Cloud setup instructions
    AdminAccess.jsx         Admin password setup and sign-in
    FormControls.jsx        Accessible shared fields, notices and password controls
    ResidentHelp.jsx        Reporting steps and expandable resident help
    ReportReceipt.jsx       Confirmation, reference copying and receipt download
    ReportTracker.jsx       Reference search and live status timeline
    ComplaintInbox.jsx      Shared complaint management and legacy import
    Brand.jsx               Shared SANARIS branding
    Charts.jsx              Recharts trend and classification charts
  pages/
    Admin.jsx               Admin page workflows and controls
    Resident.jsx            Report submission, receipt and tracking
  lib/
    model.js                Station metadata, classification and validation
    googleMaps.js           Shared Google Maps script loading and error handling
    mapDisplay.js           Station colors and reading labels for both providers
    telemetry.js            Hardware packet validation and recent station history
    useSensorFeed.js        Optional gateway polling and connection state
    complaintsApi.js        HTTP requests and error handling
    useComplaints.js        Admin session, shared inbox and live updates
    useReportTracking.js    Resident status updates through SSE and polling
    residentForm.js         Resident input validation and local date/time helper
    store.jsx               Admin state and local assessment settings
  styles/
    forms.css               Shared readable form controls and feedback
    access.css              Responsive admin sign-in layout
    resident.css            Resident reporting, receipt and tracking layouts
resident/index.html         Independent resident website entry
Start-SANARIS.cmd           Windows launcher for the app and shared API
scripts/check-runtime.mjs   Node.js compatibility check before development
scripts/dev.mjs             Development startup entry
scripts/devServer.js        Server discovery, reuse, local URLs and startup
.vscode/                    Optional IDE run tasks and browser debug launches
server/
  complaints.js             SQLite persistence, validation, reference generation
  api.js                    Public reporting/tracking, admin auth, SSE updates
  vitePlugin.js             API integration with Vite development/preview
  devIdentity.js            Installation identity for safe development reuse
  start.js                  Local built-site and API server
data/                       Private SQLite data, ignored by Git
tests/                      Model, telemetry, persistence, API and startup tests
```

## Enable Google Maps

The map switches to Google Maps automatically when `VITE_GOOGLE_MAPS_API_KEY` is set. The Settings page also includes these instructions. The default without a key is a working OpenStreetMap map. The "Open in Google Maps" link opens the selected station's coordinates in a new tab without an API key.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project, for example `SANARIS Dashboard`.
2. Link a billing account. Review [Google Maps billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing), set a budget alert, and configure appropriate API usage quotas. A budget alert is a notification, not a spending cap.
3. In **APIs & Services → Library**, find and enable **Maps JavaScript API**.
4. In **APIs & Services → Credentials**, create an API key. Under application restrictions select **Websites**. Add these allowed referrers for local development:

   ```text
   http://127.0.0.1:5173/*
   http://localhost:5173/*
   ```

5. Under API restrictions, choose **Restrict key → Maps JavaScript API**, then save. This integration uses custom `OverlayView` station buttons, so a map ID and other Google APIs are not required.
6. Add the following to `.env.local` in the project root. A blank local file and `.env.example` are provided. Preserve any existing gateway settings.

   ```dotenv
   VITE_GOOGLE_MAPS_API_KEY=your_actual_key
   ```

7. Restart `npm run dev`, then open `http://127.0.0.1:5173/#/admin/map`. For a production build, run `npm run build` after setting the variable. Future authorized deployments need their own permitted website origin in the key restrictions.

`.env.local` is ignored by Git. Vite includes `VITE_*` values in browser code, so this browser key must have website and API restrictions. Never put service-account credentials or gateway secrets in these variables.

If setup fails, the dashboard falls back to OpenStreetMap. Check the browser console for Google's error code, confirm billing and API enablement, and verify the exact origin/port against the allowed referrers. Reload after correcting configuration. See [Google's API key setup](https://developers.google.com/maps/documentation/javascript/get-api-key) and [error reference](https://developers.google.com/maps/documentation/javascript/error-messages).

## Local data

New complaints persist in `data/sanaris.sqlite`, along with their status histories and the salted admin password hash. Keep this private database when upgrading the application. The folder and SQLite sidecar files are ignored by Git. Back up the database before moving the installation. `SANARIS_DATABASE_PATH` can select a different database when set in the server process environment. Never put server settings or passwords in `VITE_*` variables.

Assessment settings still use browser localStorage under `sanaris-settings`. Reports from the previous browser-only version remain untouched under `sanaris-complaints`. The admin complaint inbox offers **Import saved reports** for that browser. Import preserves references and histories and skips reports that already exist in the shared database. The old built-in example is excluded.

Resident reports are sent to this installation's admin inbox. Residents retain their reference to track status from another browser connected to the same server. No official barangay deployment or external notification service is configured.

## Reporting API

All endpoints are same-origin. JSON errors return a useful message and an appropriate status code.

- `POST /api/complaints` accepts `location`, `category`, `description`, and an ISO `incidentAt`. Include a unique `Idempotency-Key` header. The server generates the reference and initial status.
- `GET /api/complaints/:reference` returns reference, status, creation time and status history.
- `GET /api/complaints/:reference/events` sends change notifications for that reference only.
- `GET /api/admin/session` identifies sign-in/setup state.
- `POST /api/admin/setup` initializes a password from the server computer, once. `POST /api/admin/login` signs in. Both accept `{ "password": "..." }`.
- `POST /api/admin/logout` invalidates the session and its event stream.
- Authenticated `GET /api/admin/complaints`, `PATCH /api/admin/complaints/:reference` with `{ "status": "..." }`, and `GET /api/admin/complaints/events` manage the shared inbox.
- Authenticated `POST /api/admin/complaints/import` accepts `{ "reports": [...] }` with up to 100 saved browser reports per batch. Existing references are never overwritten.

SSE notifications contain no report details. Clients fetch the latest permitted data on connection/reconnection and after each notification. Admin sessions expire after eight hours and after a server restart.

## Sensor data

Measurement history starts empty. The four map locations are illustrative until surveyed. With no configured gateway, the dashboard makes no sensor requests and displays waiting states. Set `VITE_SENSOR_FEED_PATH` to a same-origin gateway read endpoint in your local Vite environment when one is available. Restart the dev server (or rebuild for production) after changing this setting.

The endpoint must return a JSON array of station records. Each record uses `source: "hardware"`, a registered `nodeId`, numeric `laeqDbA`, and an ISO `measuredAt` timestamp with a time zone. Empty arrays mean no new samples. The browser retains the latest 120 unique timestamps per station for the session. Only measurements from the last minute contribute to current alerts and the network average. A failed poll marks the feed unavailable and leaves earlier measurements visible as history.

The reference website required authentication, so its design could not be inspected. This design uses the requested navy #152C4B, blue #447DD6 and background #F3F7FC; screenshots are needed for closer reference matching.

## Connecting the ESP32 gateway later

Recommended data path:

```text
4 ESP32 sensor nodes → authenticated gateway/MQTT broker
  → ingestion service → time-series database
  → same-origin readings API → React dashboard
```

1. Calibrate the microphones against a reference sound-level meter. Define the measurement window and weighting (e.g. LAeq over 1 second), synchronization, units and calibration version. Raw microphone amplitude is not calibrated dB(A). Replace placeholder coordinates with verified deployment locations.
2. Have the gateway send timestamped readings to a backend, using a per-device credential over TLS. Never embed gateway/broker secrets in Vite browser environment variables. The following is a **proposed contract**, not an existing endpoint:

```http
POST /api/v1/readings
Authorization: Bearer <gateway credential>
Content-Type: application/json
```

```json
{
  "schemaVersion": 1,
  "messageId": "ESP-01:1042",
  "nodeId": "ESP-01",
  "measuredAt": "2026-10-27T03:00:00Z",
  "sequence": 1042,
  "laeqDbA": 62.4,
  "windowMs": 1000,
  "calibrationId": "cal-2026-01",
  "rssiDbm": -63,
  "source": "hardware"
}
```

3. Implement server validation: registered node IDs, finite plausible readings, required units/window, timestamp bounds, sequence/message deduplication, payload size, rate limits and gateway authentication. Store measurement and received timestamps. Buffer and retry offline samples on the gateway with exponential backoff; deduplicate retransmissions at ingestion.
4. Extend the server with storage for nodes, readings, alert episodes and assessment revisions. Shared complaints, status history, server-generated references and admin authentication are already implemented. Apply device authentication and access control to the sensor endpoints too.
5. Expose a read endpoint that returns an array of the hardware records shown above. For example, serve GET /api/v1/readings on the application origin and set `VITE_SENSOR_FEED_PATH=/api/v1/readings`. Supply authentication and device validation on the backend. An empty response array keeps stations awaiting data.
6. Use measured timestamps for status and history. The dashboard polls at the configured interval, merges repeated packets by station and measurement time, and marks older readings as historical.
7. Implement duration-based assessment on the server with configurable persistence, hysteresis/cooldown, and auditable revisions. Confirm thresholds and response procedures with the barangay before field use. Noise levels alone do not establish a source or violation.
8. Before real deployment, test duplicate, delayed, malformed and out-of-order messages; gateway reboot; clock drift; loss of Wi-Fi; replay; stale/offline nodes; access control; and complaint privacy. Obtain permission before public deployment.

## Verification

See `TESTING.md` for observed checks and remaining limits.


## Nighttime guidance in the interface

The default high alert threshold is 45 dBA. Low is below 40 dBA and Moderate is 40 to below 45 dBA. The threshold applies to individual recent measurements. Settings and alerts distinguish this rule from WHO eight-hour nighttime guidance and identify Hinabangan ordinance limits as unverified. Saved thresholds and refresh intervals carry forward.


## Repository privacy

Only application source, the lockfile, documentation, tests, and the public SANARIS logo belong in Git. Dependency folders, build output, environment files, credentials, local screenshots, databases, uploads, and resident-data exports are ignored. Browser localStorage records are not part of this repository. Keep any future `.env.example` limited to blank values or clearly fictional placeholders; never commit real resident information or gateway credentials.
