import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, BarChart, Bar } from 'recharts';
import { classify } from '../lib/model';
import { Empty } from './UI';

const timeLabel = timestamp => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function TrendChart({ data, settings, emptyMessage = 'Awaiting sensor data' }) {
  if (!data.length) return <Empty>{emptyMessage}</Empty>;
  return <div className="chart">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs><linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#447dd6" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#447dd6" stopOpacity={0} />
        </linearGradient></defs>
        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8edf5" />
        <XAxis dataKey="timestamp" tickFormatter={timeLabel} minTickGap={45} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={['auto', 'auto']} unit=" dB" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip labelFormatter={timeLabel} formatter={value => [`${value} dB(A)`, 'Sensor reading']} />
        <ReferenceLine y={settings.high} ifOverflow="extendDomain" stroke="#e25e68" strokeDasharray="4 4" />
        <Area type="linear" dataKey="db" stroke="#447dd6" fill="url(#blueFill)" strokeWidth={2.5}
          dot={data.length === 1} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

export function ClassificationChart({ samples, settings, emptyMessage = 'Awaiting sensor data' }) {
  if (!samples.length) return <Empty>{emptyMessage}</Empty>;
  const counts = { Low: 0, Moderate: 0, High: 0 };
  for (const sample of samples) counts[classify(sample.db, settings)]++;
  const colors = { Low: '#20a38a', Moderate: '#e4a238', High: '#e25e68' };
  const values = Object.entries(counts).map(([name, count]) => ({ name, samples: count, fill: colors[name] }));
  return <div className="chart">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={values}>
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip /><Bar dataKey="samples" radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
