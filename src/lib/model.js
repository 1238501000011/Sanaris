export const defaults = { moderate: 40, high: 45, interval: 5, version: 2 };
// Apply the requested 45 dBA policy once to older browser settings.
export function migrateSettings(saved) {
  if (!saved || typeof saved !== 'object') return { ...defaults };
  if (saved.version === defaults.version) return validateSettings(saved) ? saved : { ...defaults };
  return { ...defaults, interval: [2, 5, 10].includes(saved.interval) ? saved.interval : defaults.interval };
}
// Hinabangan town center; station positions are illustrative, not surveyed hardware sites.
export const mapCenter = [11.70111, 125.06628];
export const nodes = [
  { id: 'ESP-01', name: 'Barangay Hall', area: 'Civic center', lat: 11.70111, lng: 125.06628, base: 49 },
  { id: 'ESP-02', name: 'Public Market', area: 'Commercial zone', lat: 11.7020, lng: 125.0670, base: 73 },
  { id: 'ESP-03', name: 'Residential Area', area: 'Residential zone', lat: 11.6995, lng: 125.0674, base: 45 },
  { id: 'ESP-04', name: 'Main Road', area: 'Transport corridor', lat: 11.7006, lng: 125.0688, base: 63 },
];
export function classify(db, settings = defaults) { return db >= settings.high ? 'High' : db >= settings.moderate ? 'Moderate' : 'Low'; }
export function validateSettings(s) { return Number.isFinite(s.moderate) && Number.isFinite(s.high) && s.moderate >= 30 && s.high <= 120 && s.high > s.moderate && [2,5,10].includes(s.interval); }
export function sample(t = Date.now()) { return nodes.map((n, i) => ({ ...n, db: +(n.base + Math.sin(t / 17000 + i * 3) * 7).toFixed(1), timestamp: t })); }
export function history() { const now = Date.now(); return Array.from({ length: 60 }, (_, i) => { const timestamp = now - (59-i)*60000; return { timestamp, ...Object.fromEntries(sample(timestamp).map(n => [n.id, n.db])) }; }); }
export function reference() { return `SAN-${new Date().getFullYear()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`; }
export const seedComplaints = [{ id: 'SAN-DEMO-0001', location: 'Near the public market', category: 'Amplified music', description: 'Sample complaint: loud music from a nearby gathering.', status: 'Under review', createdAt: new Date().toISOString(), updates: [{ status: 'Submitted', at: new Date().toISOString() }, { status: 'Under review', at: new Date().toISOString() }] }];
