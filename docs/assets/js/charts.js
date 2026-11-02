import { classify } from './model.js';
import { escapeHTML as e, empty } from './ui.js';
const colors = { Low: '#20a38a', Moderate: '#e4a238', High: '#e25e68' };
export function trendChart(data, settings, message) {
  if (!data.length) return empty(message || 'Awaiting sensor data');
  const values = data.slice(-100), width = 640, height = 260, left = 48, right = 18, top = 20, bottom = 38;
  const maximum = Math.max(90, Math.ceil(Math.max(settings.high, ...values.map(item => item.db)) / 30) * 30);
  const span = Math.max(1, values.at(-1).timestamp - values[0].timestamp);
  const x = index => left + (values[index].timestamp - values[0].timestamp) / span * (width - left - right);
  const y = value => height - bottom - value / maximum * (height - top - bottom);
  const points = values.map((item, index) => `${x(index)},${y(item.db)}`).join(' ');
  const ticks = [0, .25, .5, .75, 1].map(part => `<g><line x1="${left}" x2="${width - right}" y1="${y(part * maximum)}" y2="${y(part * maximum)}" stroke="#e8eef6"/><text x="${left - 9}" y="${y(part * maximum) + 4}" text-anchor="end">${Math.round(part * maximum)}</text></g>`).join('');
  return `<div class="native-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Noise measurements in dB(A); high threshold ${settings.high}">
    ${ticks}<line x1="${left}" x2="${width - right}" y1="${y(settings.high)}" y2="${y(settings.high)}" stroke="#cf8350" stroke-dasharray="5 5"/>
    <polyline points="${points}" fill="none" stroke="#447dd6" stroke-width="2.5"/>
    ${values.map((item, index) => `<circle cx="${x(index)}" cy="${y(item.db)}" r="4" fill="${colors[classify(item.db, settings)]}" tabindex="0" aria-label="${e(new Date(item.timestamp).toLocaleTimeString())}: ${item.db.toFixed(1)} dB(A)"><title>${e(new Date(item.timestamp).toLocaleString())} · ${item.db.toFixed(1)} dB(A)</title></circle>`).join('')}
    <text x="${left}" y="${height - 10}">${e(new Date(values[0].timestamp).toLocaleTimeString())}</text><text x="${width - right}" y="${height - 10}" text-anchor="end">${e(new Date(values.at(-1).timestamp).toLocaleTimeString())}</text>
  </svg><p class="small muted">Hover or focus a point for its reading. Dashed line: ${settings.high} dB(A).</p></div>`;
}
export function classificationChart(samples, settings, message) {
  if (!samples.length) return empty(message || 'Awaiting sensor data');
  const counts = { Low: 0, Moderate: 0, High: 0 };
  for (const sample of samples) counts[classify(sample.db, settings)]++;
  let offset = 0;
  const slices = Object.entries(counts).map(([level, count]) => {
    const length = count / samples.length * 100;
    const circle = `<circle cx="75" cy="75" r="55" pathLength="100" fill="none" stroke="${colors[level]}" stroke-width="20" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 75 75)"/>`;
    offset += length; return circle;
  }).join('');
  return `<div class="classification-chart"><svg viewBox="0 0 150 150" role="img" aria-label="Noise classification: ${Object.entries(counts).map(([name, count]) => `${name} ${count}`).join(', ')}">${slices}<text x="75" y="76" text-anchor="middle" class="chart-count">${samples.length}</text><text x="75" y="94" text-anchor="middle">samples</text></svg><ul>${Object.entries(counts).map(([level, count]) => `<li><span class="dot ${level.toLowerCase()}"></span><span>${level}</span><strong>${count}</strong><span>${(count / samples.length * 100).toFixed(0)}%</span></li>`).join('')}</ul></div>`;
}
