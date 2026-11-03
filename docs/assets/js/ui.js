export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export const siteRoot = new URL('../../', import.meta.url);
const paths = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', check: '<path d="m5 12 4 4L19 6"/>',
  shield: '<path d="m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7z"/><path d="m8 12 3 3 5-6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  sound: '<path d="M3 9v6m4-10v14m5-16v18m5-14v10m4-8v6"/>',
  message: '<path d="M21 15a3 3 0 0 1-3 3H7l-4 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3zM7 8h10M7 12h7"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>',
  music: '<path d="M9 18V5l12-3v13M9 8l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="15" rx="3" ry="3"/>',
  construction: '<path d="M3 18h18v3H3zM5 18v-5a7 7 0 0 1 14 0v5M10 5v8m4-8v8"/>',
  car: '<path d="m4 10 2-6h12l2 6M3 10h18v9H3zm2 9v3m14-3v3M6 14h2m8 0h2"/>',
  people: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-4a7 7 0 0 1 14 0v4M17 3a4 4 0 0 1 0 8m2 3a5 5 0 0 1 3 4v3"/>',
  more: '<circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="20" cy="12" r="1"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h1m-1 7h1m-1 7h1"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10M9 21h6"/>',
  chart: '<path d="M3 3v18h18M7 16v-5m5 5V6m5 10V9"/>',
  settings: '<path d="M5 3v18M12 3v18M19 3v18M2 8h6m1 8h6m1-9h6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  logout: '<path d="M9 3H3v18h6m3-9h10m-4-4 4 4-4 4"/>',
  alert: '<path d="m12 3 10 18H2zM12 9v5m0 3v1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3v2m0 3v1"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>', plus: '<path d="M12 4v16M4 12h16"/>',
};
export function icon(name, size = 19, className = '') { return `<svg class="icon ${escapeHTML(className)}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sound}</svg>`; }
export function brand(href = '#/admin/overview') { return `<a href="${escapeHTML(href)}" class="brand"><span class="brand-tile"><img class="brand-logo" src="${new URL('assets/sanaris-logo.png?v=signal-1', siteRoot)}" alt="" width="160" height="160"></span><strong class="brand-name">SANARIS</strong></a>`; }
export const badge = value => `<span class="badge ${escapeHTML(String(value).toLowerCase().replaceAll(' ', '-'))}">${escapeHTML(value)}</span>`;
export const empty = message => `<div class="empty">${escapeHTML(message)}</div>`;
export const notice = (message, success = false) => `<div class="${success ? 'form-success' : 'form-notice'}" role="${success ? 'status' : 'alert'}">${icon(success ? 'check' : 'alert')}<p>${escapeHTML(message)}</p></div>`;
export const heading = (title, description, action = '') => `<div class="page-heading"><div><p class="eyebrow">BARANGAY MANAGEMENT</p><h1>${escapeHTML(title)}</h1><p class="muted">${escapeHTML(description)}</p></div><div class="actions">${action}</div></div>`;
export const panel = (title, subtitle, body, action = '', attributes = '') => `<section class="panel" ${attributes}><div class="panel-heading"><div><h2>${escapeHTML(title)}</h2>${subtitle ? `<p class="muted small">${escapeHTML(subtitle)}</p>` : ''}</div>${action}</div>${body}</section>`;
export function field({ id, label, control, hint = '', error = '' }) { return `<div class="form-field"><label for="${id}">${label}</label>${control}${hint ? `<p id="${id}-hint" class="field-hint">${hint}</p>` : ''}<p id="${id}-error" class="field-error"${error ? '' : ' hidden'}>${escapeHTML(error)}</p></div>`; }
export function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const dateTime = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
