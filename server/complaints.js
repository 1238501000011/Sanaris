import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const statuses = ['Submitted', 'Under review', 'In progress', 'Resolved'];
export const categories = ['Amplified music', 'Construction', 'Vehicle noise', 'Gathering', 'Other'];
export class RequestError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function validateReport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new RequestError('Enter your report details.');
  const location = typeof data.location === 'string' ? data.location.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const incidentAt = typeof data.incidentAt === 'string' ? Date.parse(data.incidentAt) : NaN;
  if (!location || location.length > 160) throw new RequestError('Enter a location of up to 160 characters.');
  if (description.length < 10 || description.length > 1500) throw new RequestError('Describe the concern in 10–1,500 characters.');
  if (!categories.includes(data.category)) throw new RequestError('Choose a valid noise category.');
  if (!Number.isFinite(incidentAt) || incidentAt > Date.now() + 60_000) throw new RequestError('Enter a valid incident time that is not in the future.');
  return { location, category: data.category, description, incidentAt: new Date(incidentAt).toISOString() };
}

export function openComplaintStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS config (name TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY, request_id TEXT UNIQUE, location TEXT NOT NULL,
      category TEXT NOT NULL, description TEXT NOT NULL, incident_at TEXT NOT NULL,
      status TEXT NOT NULL, created_at TEXT NOT NULL, updates TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS complaints_created ON complaints(created_at DESC);
  `);
  const byId = db.prepare('SELECT * FROM complaints WHERE id = ?');
  const byRequest = db.prepare('SELECT * FROM complaints WHERE request_id = ?');
  const insert = db.prepare('INSERT INTO complaints VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  function record(row) {
    return row && { id: row.id, location: row.location, category: row.category, description: row.description,
      incidentAt: row.incident_at, status: row.status, createdAt: row.created_at, updates: JSON.parse(row.updates) };
  }
  function passwordRecord() { return db.prepare("SELECT value FROM config WHERE name = 'admin_password'").get()?.value; }
  return {
    close: () => db.close(),
    configured: () => Boolean(passwordRecord()),
    setPassword(password) {
      if (passwordRecord()) throw new RequestError('An admin password is already set. Please sign in.', 409);
      if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new RequestError('Use a password with 12–128 characters.');
      const salt = randomBytes(16).toString('hex');
      const hash = scryptSync(password, salt, 64).toString('hex');
      db.prepare("INSERT INTO config VALUES ('admin_password', ?)").run(`${salt}:${hash}`);
    },
    verifyPassword(password) {
      if (typeof password !== 'string' || password.length > 128) return false;
      const saved = passwordRecord();
      if (!saved) return false;
      const [salt, hex] = saved.split(':');
      return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hex, 'hex'));
    },
    list: () => db.prepare('SELECT * FROM complaints ORDER BY created_at DESC, id DESC').all().map(record),
    find: id => record(byId.get(id)),
    submit(data, requestId) {
      if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) throw new RequestError('The submission identifier is invalid. Refresh and try again.');
      const report = validateReport(data);
      const existing = record(byRequest.get(requestId));
      if (existing) {
        if (Object.keys(report).some(key => report[key] !== existing[key])) throw new RequestError('This submission identifier was already used for a different report.', 409);
        return { item: existing, created: false };
      }
      const createdAt = new Date().toISOString();
      const id = `SAN-${new Date().getFullYear()}-${randomBytes(12).toString('hex').toUpperCase()}`;
      const updates = [{ status: 'Submitted', at: createdAt }];
      insert.run(id, requestId, report.location, report.category, report.description, report.incidentAt, 'Submitted', createdAt, JSON.stringify(updates));
      return { item: record(byId.get(id)), created: true };
    },
    update(id, status) {
      if (!statuses.includes(status)) throw new RequestError('Choose a valid complaint status.');
      const item = record(byId.get(id));
      if (!item) throw new RequestError('Report not found.', 404);
      if (item.status === status) return item;
      item.updates.push({ status, at: new Date().toISOString() });
      db.prepare('UPDATE complaints SET status = ?, updates = ? WHERE id = ?').run(status, JSON.stringify(item.updates), id);
      return record(byId.get(id));
    },
    importReports(reports) {
      if (!Array.isArray(reports) || reports.length > 100) throw new RequestError('Import up to 100 saved reports at a time.');
      const valid = reports.map(item => {
        const report = validateReport(item);
        if (!/^SAN-\d{4}-[A-F0-9]{12,24}$/.test(item.id) || !statuses.includes(item.status)) throw new RequestError('A saved report has an invalid reference or status.');
        if (!Number.isFinite(Date.parse(item.createdAt))) throw new RequestError('A saved report has an invalid creation time.');
        const updates = Array.isArray(item.updates) ? item.updates : [];
        if (!updates.length || updates.length > 100 || updates.some(update => !statuses.includes(update.status) || !Number.isFinite(Date.parse(update.at)))) throw new RequestError('A saved report has an invalid history.');
        return { ...report, id: item.id, status: item.status, createdAt: new Date(item.createdAt).toISOString(), updates: updates.map(update => ({ status: update.status, at: new Date(update.at).toISOString() })) };
      });
      let count = 0;
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const item of valid) {
          if (byId.get(item.id)) continue;
          insert.run(item.id, null, item.location, item.category, item.description, item.incidentAt, item.status, item.createdAt, JSON.stringify(item.updates));
          count++;
        }
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return count;
    },
  };
}

export function publicStatus(item) {
  return { id: item.id, status: item.status, createdAt: item.createdAt, updates: item.updates };
}
