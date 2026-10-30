# SANARIS — Community Noise Monitoring

A local Computer Engineering capstone demonstration built with React 19, Vite, Tailwind CSS 4, Recharts, React Leaflet, and Lucide React. Nothing has been deployed.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Open http://127.0.0.1:5173. Admin: `/#/admin/overview`. Resident: `/#/resident/report`. Hash navigation supports refreshes without a production rewrite rule.

## Implemented

- Seven admin pages: overview, monitoring map, event history, disturbance alerts, analytics, complaints, assessment settings.
- Four virtual ESP32 nodes with clearly labeled generated dB(A) values, pause/resume and adjustable sampling interval.
- Interactive Leaflet map with illustrative Hinabangan, Samar locations, station selection, popup measurements and zoom. OpenStreetMap tiles need internet access.
- Recharts trends, threshold line, classification counts and per-node averages/peaks. Averages are arithmetic sample summaries, **not acoustic Leq**.
- Session event log, node/classification filtering, full filtered CSV export (table displays up to 100 rows).
- Potential-disturbance review and per-session acknowledgment. Alerts are current threshold exceedances, not verified violations or duration-based enforcement decisions.
- Threshold configuration with cross-field validation, immediately applied to readings and history.
- Resident complaint form, random reference generation, status tracking and timeline.
- Admin complaint search, status filtering and status changes persisted across reloads.
- Responsive sidebar, mobile navigation, single-column resident forms and visible simulation notices.

## Project structure

```text
src/
  App.jsx                   Navigation, layout, route selection, simulation notice
  main.jsx                  React entry point
  styles.css                Theme, responsive layouts, Tailwind import
  components/
    UI.jsx                  Shared headings, cards, badges, panels, empty states
    MonitoringMap.jsx       React Leaflet map and station focus
    Charts.jsx              Recharts trend and classification charts
  pages/
    Admin.jsx               Admin page workflows and controls
    Resident.jsx            Report submission, receipt and tracking
  lib/
    model.js                Virtual nodes, simulation, classification, validation
    store.jsx               Shared React state and browser persistence
 tests/model.test.js         Boundary, validation, sample and reference tests
```

## Demo storage and limitations

Complaints and settings live in `localStorage` under `sanaris-complaints` and `sanaris-settings`. They persist in this browser on this origin; there is no central database, backend API, authentication or cross-device synchronization. Switching to another port or browser produces a separate demo dataset. Admin access is intentionally open for demonstration and is labeled accordingly. Do not use the prototype for actual private resident records.

The initial 60 minutes of history are synthesized at one-minute intervals. Subsequent readings append at the configured interval, retaining the most recent 120 samples. History, selected station, pause state and alert acknowledgments reset on reload. The synthetic stream continues while either interface is mounted. Map coordinates are placeholders, not installed sensor locations. The sample complaint and any manually submitted demo reports are not sent to officials.

The reference website required authentication, so its design could not be inspected. This design uses the requested navy #152C4B, blue #447DD6 and background #F3F7FC; screenshots are needed for closer reference matching.

## Connecting the ESP32 gateway later

Recommended data path:

```text
4 ESP32 sensor nodes → authenticated gateway/MQTT broker
  → ingestion service → time-series database
  → authenticated REST API + SSE/WebSocket → React dashboard
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
4. Store nodes, readings, alert episodes, assessment revisions, complaints and status audit records centrally. Add server-generated complaint references with a unique index, admin authentication/authorization, restricted status updates and rate-limited resident tracking. Reference numbers should not expose personal complaint details without an appropriate verification mechanism.
5. In `src/lib/store.jsx`, replace the simulation timer with an API adapter. Load `/api/v1/nodes` and historical `/api/v1/readings`, then subscribe to `/api/v1/readings/stream`. Normalize backend fields to the current `readings` objects and `series` rows. Close subscriptions on unmount, reconnect with backoff and display stale/offline states based on last received time. Never silently substitute demo data when a hardware connection fails.
6. Keep simulation and hardware modes explicit and separate. Only show hardware-connected status after verified fresh authenticated readings. Preserve source labels in UI, exports and stored records.
7. Implement duration-based assessment on the server with configurable persistence, hysteresis/cooldown, and auditable revisions. Confirm thresholds and response procedures with the barangay before field use. Noise levels alone do not establish a source or violation.
8. Before real deployment, test duplicate, delayed, malformed and out-of-order messages; gateway reboot; clock drift; loss of Wi-Fi; replay; stale/offline nodes; access control; and complaint privacy. Obtain permission before public deployment.

## Verification

See `TESTING.md` for observed checks and remaining limits.


## Nighttime guidance in the interface

Assessment settings and alerts now distinguish WHO nighttime references from configurable demo sample cutoffs. WHO 1999 values of 45 dBA outside bedrooms and 30 dBA inside bedrooms refer to LAeq,8h; they are not universal instantaneous legal limits. The app explicitly reports WHO assessment as unavailable and Hinabangan ordinance limits as unverified. The demo uses Low below 40 dBA, Moderate from 40 to below 45 dBA, and High at or above 45 dBA, as requested. Older saved settings migrate once to these cutoffs while preserving the sampling interval; subsequent custom edits persist. These remain demo classification values. No compliance score is calculated from the short synthetic history, and no indoor exposure is inferred from outdoor nodes. Source links are provided in the guidance panel.


## Repository privacy

Only application source, the lockfile, documentation, tests, and the public SANARIS logo belong in Git. Dependency folders, build output, environment files, credentials, local screenshots, databases, uploads, and resident-data exports are ignored. Browser localStorage records are not part of this repository. The seed complaint in source is an explicitly fictional example. Keep any future `.env.example` limited to blank values or clearly fictional placeholders; never commit real resident information or gateway credentials.
