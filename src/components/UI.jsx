import { Radio, ArrowUpRight } from 'lucide-react';
export function Badge({ value }) { return <span className={`badge ${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>; }
export function Heading({ eyebrow = 'BARANGAY MANAGEMENT', title, description, children }) { return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div><div className="actions">{children}</div></div>; }
export function Panel({ title, subtitle, children, action, className = '' }) { return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p className="muted small">{subtitle}</p>}</div>{action}</div>{children}</section>; }
export function NodeCard({ node, level, selected, onClick }) {
  const hasReading = Number.isFinite(node.db);
  const badge = hasReading ? (node.status === 'Recent' ? level : 'Last reading') : 'Waiting';
  return <button className={`node-card ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onClick}>
    <div className="flex justify-between items-center">
      <span className="node-icon"><Radio size={20} /></span>
      <Badge value={badge} />
    </div>
    <p className="small muted node-id">{node.id}</p>
    <h3>{node.name}</h3>
    <div className="reading">{hasReading ? node.db.toFixed(1) : '—'} {hasReading && <span>dB(A)</span>}</div>
    <p className="small muted">{hasReading ? new Date(node.timestamp).toLocaleString() : 'Awaiting sensor data'}</p>
    {node.status === 'Recent' && <div className="meter">
      <span className={level.toLowerCase()} style={{ width: `${Math.max(0, Math.min(node.db, 100))}%` }} />
    </div>}
    <div className="flex justify-between small muted"><span>{node.area}</span><ArrowUpRight size={16} /></div>
  </button>;
}
export function Empty({ children }) { return <div className="empty">{children}</div>; }
