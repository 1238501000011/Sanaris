export const defaults = { moderate: 40, high: 45, interval: 5, version: 2 };
// Apply the requested 45 dBA policy once to older browser settings.
export function migrateSettings(saved) {
  if (!saved || typeof saved !== 'object') return { ...defaults };
  if (saved.version === defaults.version) return validateSettings(saved) ? saved : { ...defaults };
  return { ...defaults, interval: [2, 5, 10].includes(saved.interval) ? saved.interval : defaults.interval };
}
// Proposed positions along OpenStreetMap's Camia Street geometry in Barangay San Pablo.
export const mapCenter = [11.77974, 124.88308];
const plannedPositions = [
  [11.779573, 124.882337],
  [11.779694, 124.882844],
  [11.779803, 124.883344],
  [11.779912, 124.883843],
];
export const nodes = plannedPositions.map(([lat, lng], index) => ({
  id: `ESP-0${index + 1}`, name: `Planned station ${index + 1}`, area: 'Camia Street', lat, lng,
}));
export function classify(db, settings = defaults) {
  if (!Number.isFinite(db)) return null;
  if (db >= settings.high) return 'High';
  return db >= settings.moderate ? 'Moderate' : 'Low';
}
export function validateSettings(s) { return Number.isFinite(s.moderate) && Number.isFinite(s.high) && s.moderate >= 30 && s.high <= 120 && s.high > s.moderate && [2,5,10].includes(s.interval); }
export function reference() { return `SAN-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`; }
