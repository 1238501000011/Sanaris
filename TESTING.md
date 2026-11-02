# Verification record

- Dependencies installed successfully; npm reported zero vulnerabilities at installation.
- Production build passed. Initial build reported a large JavaScript bundle; dependency chunks were subsequently separated.
- Five Node tests passed (including the 45 dBA boundary and settings migration): threshold boundaries, invalid settings, four finite node readings/chronological history, and uniqueness/format of 1,000 complaint references.
- Local Vite server returned HTTP 200.
- Browser exercised all seven admin pages and both resident pages.
- Verified pause control, station selection, map zoom, node/classification event filters, alert acknowledgment, analytics range/node controls, settings save, complaint search and status filters.
- Submitted a local test complaint, tracked Submitted, changed to Resolved from admin, reloaded and confirmed persisted Resolved status and timeline.
- Inspected desktop dashboard and narrow-width resident tracking layout. Narrow layout exposes the working mobile admin navigation. No physical phone test was performed.
- Map tiles and charts rendered in the browser.
- Hardware and backend integration are not tested because neither is connected or implemented in this browser-local prototype.
- The design reference was gated by sign-in. Visual fidelity to that reference remains unverified pending screenshots.

## Sensor waiting-state verification — 2026-11-01

- The simulator and prefilled measurement history have been removed. The earlier pause/resume checks above describe the previous implementation.
- Production build and all eight current Node tests passed.
- All seven admin pages and both resident pages passed checks in an isolated headless browser profile.
- Empty-feed checks confirmed four waiting station cards, neutral map markers, empty charts/history/alerts and disabled CSV export.
- Saved settings and resident reports survived the update. The original built-in complaint example is hidden without removing it from browser storage.
- A separate local test feed verified partial hardware packets, rejected simulated packets, the 45 dBA alert boundary, stale readings, working charts and retained history after an HTTP failure. No browser exceptions were recorded.
- A cached empty admin module was refreshed during verification. The running development server now serves the complete module.
- An actual gateway endpoint still needs to be provided for live readings. The application performs no sensor requests when the feed setting is absent.

## Google Maps integration — 2026-11-01

- Production build and all eight existing Node tests passed after the map changes.
- The running local application showed four waiting stations on OpenStreetMap and made no Google API requests with the blank key. The Google Maps link followed the selected station's coordinates.
- The Settings page included API enablement, billing, website restrictions and local configuration steps. `.env.local` was confirmed ignored by Git.
- The map and setup guide passed 390-pixel-wide layout checks. A mobile screenshot was inspected. Tile requests were blocked only inside the isolated browser test.
- A separate local Vite instance and an intercepted Google API test stub verified four accessible station buttons, bidirectional station selection, reading popups, station focus, route cleanup and one script load across remounts. A separate test feed verified the 45 dBA marker boundary and neutral colors for missing/stale readings.
- Authentication errors, script network failures and a missing ready callback all returned the interface to OpenStreetMap. No uncaught browser exceptions were recorded.
- The isolated test server and browser were closed. Test credentials and sensor fixtures were never configured in the user's running dashboard.
- Live Google service authentication, Google basemap imagery and satellite controls remain unverified until a valid, restricted API key and enabled billing are supplied. The default local key is blank.

## Separate resident site and shared complaints — 2026-11-02

- The admin entry point and `/resident/` entry point build independently. The admin top bar and Resident portal link have been removed. The resident site has no admin navigation or admin page bundle.
- All 11 Node tests passed. The new tests exercise SQLite persistence after reopening the database, unique references, idempotent submissions, input validation, preserved legacy imports, admin sessions, denied anonymous access, same-origin checks, and change notifications for separate resident/admin clients.
- A production build passed. An isolated built-site server with a temporary SQLite database was tested in separate admin and resident browser contexts.
- The resident submitted a report, received its server-generated reference, and the admin overview count and inbox updated automatically. Resolving the report in the admin inbox updated the open resident tracker without a reload. Tracking worked after a page reload without report data in resident localStorage.
- A forced HTTP 503 preserved the report form and showed an error without issuing a receipt. Retrying successfully stored the report.
- Importing a previous browser report added it to the shared inbox while preserving the original browser record. Complaint status filtering worked.
- All seven admin routes and both resident routes rendered. Admin password setup, sign-in, incorrect-password feedback, logout, blocked unauthenticated access and later sign-in were checked. No uncaught application exceptions were recorded.
- Mobile admin navigation and both mobile interfaces passed overflow checks at 390px. Screenshots were inspected. A stretched desktop status badge was corrected with explicit alignment.
- Browser tests used only isolated fixture reports and a temporary test password/database, which were removed after testing. The real local database is ready for the user to create their admin password.
- The local development server serves both sites and their API at port 5173. Public hosting, cross-device network access, and official barangay deployment remain separate work requiring authorization.

## Opening from another IDE — 2026-11-02

- Added `Start-SANARIS.cmd`, a pre-development Node runtime check, and optional VS Code-compatible tasks/debug configurations. The development port is fixed at 5173 with explicit port-conflict errors.
- Ran the Windows launcher from the parent directory with `--no-open`. It found the project, passed its runtime/dependency checks and started Vite and the report API successfully. The existing-install dependency path was tested; a fresh network dependency download was not repeated.
- A second start while port 5173 was occupied exited with a clear message and left the existing server running.
- Both source HTML entries were served through an isolated static-only server to reproduce Live Server behavior. The browser displayed startup instructions and the correct site link even though the raw JSX could not load. The fallback passed a 390px overflow check and its screenshot was inspected.
- Following the fallback links opened the real Vite admin sign-in/setup screen and the separate resident form. React removed the startup help after loading. Resident tracking rendered, and the admin session API responded. No application exceptions were observed on the functioning Vite pages.
- Tasks and launch JSON parsed, task references resolved, and the background task matcher matched Vite's ready output. Antigravity/VS Code's debugger UI was not automated.
- The production build passed with both entry points. The running local server was left available at port 5173.

## Repeated development startup — 2026-11-02

- The earlier port-conflict behavior above has been replaced: `npm run dev` recognizes a healthy server for the same project folder and database and exits successfully with both site links. It leaves the original server and connections running.
- All 18 automated tests passed. Startup tests cover reuse, a different installation/database, an unrelated application, an unavailable report API, a free port, local browser targets, and stable identity before/after database creation.
- An isolated fresh server started on a separate local port with a temporary database. Both HTML entries, both React entry modules, and the session API returned successful responses. A second startup exited with code 0, reported reuse, emitted no SQLite warning, and left the first process and API running. The temporary database and owned processes were cleaned up.
- Both `npm run dev` and `Start-SANARIS.cmd --no-open` succeeded against the existing server on port 5173. The Windows launcher was invoked from the parent directory to verify it locates its own project folder.
- The production build passed with both admin and resident entry points after the startup changes.
- The SQLite experimental warning remains informational on first startup with Node 24.11. No warnings were globally suppressed, and no unrelated process was stopped.
