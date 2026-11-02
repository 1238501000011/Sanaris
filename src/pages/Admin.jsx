import { useState } from 'react';
import { Activity, MapPin, Bell, ArrowRight, Download } from 'lucide-react';
import { useData } from '../lib/store';
import { classify, nodes, validateSettings } from '../lib/model';
import { Heading, Panel, Badge, NodeCard, Empty } from '../components/UI';
import MonitoringMap from '../components/MonitoringMap';
import MapSettings from '../components/MapSettings';
import ComplaintInbox from '../components/ComplaintInbox';
import NoiseGuidance, { AssessmentSummary } from '../components/NoiseGuidance';
import { TrendChart, ClassificationChart } from '../components/Charts';

const stationNames = new Map(nodes.map(node => [node.id, node.name]));

export default function Admin({ page }) {
  const { readings, samples, feedConfigured, feedUnavailable, settings, setSettings, complaints, complaintsLoading, complaintsError } = useData();
  const [selected, setSelected] = useState('ESP-02');
  const [nodeFilter, setNodeFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState('');
  const [range, setRange] = useState('60');
  const [acknowledged, setAcknowledged] = useState([]);

  const recent = readings.filter(node => node.status === 'Recent');
  const high = recent.filter(node => classify(node.db, settings) === 'High');
  let feedStatus = 'Awaiting sensor data';
  if (feedUnavailable) feedStatus = 'Sensor feed unavailable';
  else if (recent.length) feedStatus = `${recent.length} of ${nodes.length} stations reported in the past minute`;
  else if (samples.length) feedStatus = 'Awaiting fresh sensor data';

  if (page === 'settings') {
    function saveSettings(event) {
      event.preventDefault();
      if (!validateSettings(draft)) {
        setMessage('Enter thresholds from 30–120 dB(A), with the high threshold above moderate.');
        return;
      }
      setSettings(draft);
      setMessage('Assessment settings saved.');
    }
    return <>
      <Heading title="Assessment settings" description="Configure how station readings are assessed." />
      <Panel title="Sensor connection" subtitle={feedStatus}>
        <p className="muted">{feedConfigured
          ? 'Station readings come from the configured gateway feed.'
          : 'A gateway feed has not been configured for this installation.'}</p>
      </Panel>
      <MapSettings />
      <NoiseGuidance />
      <Panel title="Alert thresholds" subtitle="These cutoffs flag individual readings for review.">
        <form className="settings-form" onSubmit={saveSettings}>
          <label>Moderate threshold · dB(A)
            <input type="number" min="30" max="119" required value={draft.moderate}
              onChange={event => setDraft({ ...draft, moderate: Number(event.target.value) })} />
          </label>
          <label>High threshold · dB(A)
            <input type="number" min="31" max="120" required value={draft.high}
              onChange={event => setDraft({ ...draft, high: Number(event.target.value) })} />
          </label>
          <label>Sensor feed refresh interval
            <select value={draft.interval} onChange={event => setDraft({ ...draft, interval: Number(event.target.value) })}>
              {[2, 5, 10].map(seconds => <option key={seconds} value={seconds}>Every {seconds} seconds</option>)}
            </select>
          </label>
          <p className="note">Readings at or above {draft.high} dB(A) trigger a disturbance alert.</p>
          <button className="primary">Save settings</button><p role="status">{message}</p>
        </form>
      </Panel>
    </>;
  }

  if (page === 'complaints') return <ComplaintInbox />;

  if (page === 'events') {
    const rows = samples.filter(sample =>
      (nodeFilter === 'All' || sample.nodeId === nodeFilter) &&
      (levelFilter === 'All' || classify(sample.db, settings) === levelFilter)
    ).reverse();
    function exportRows() {
      const lines = rows.map(sample => [
        new Date(sample.timestamp).toISOString(), sample.nodeId, stationNames.get(sample.nodeId), sample.db, classify(sample.db, settings),
      ].join(','));
      const csv = ['Timestamp,Node,Location,Level dBA,Classification', ...lines].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sanaris-readings.csv';
      link.click();
      URL.revokeObjectURL(url);
    }
    return <>
      <Heading title="Event history" description="Explore measurements received from the monitoring stations.">
        <button className="secondary" disabled={!rows.length} onClick={exportRows}><Download size={16} /> Export CSV</button>
      </Heading>
      <Panel title="Monitoring log" subtitle={`${rows.length} matching samples · rolling session history`}>
        <div className="filters">
          <select aria-label="Filter node" value={nodeFilter} onChange={event => setNodeFilter(event.target.value)}>
            <option value="All">All nodes</option>{nodes.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}
          </select>
          <select aria-label="Filter level" value={levelFilter} onChange={event => setLevelFilter(event.target.value)}>
            {['All', 'Low', 'Moderate', 'High'].map(level => <option key={level}>{level}</option>)}
          </select>
        </div>
        {rows.length ? <>
          <div className="table-wrap"><table>
            <thead><tr><th>Time</th><th>Monitoring point</th><th>Node</th><th>Sound level</th><th>Classification</th></tr></thead>
            <tbody>{rows.slice(0, 100).map(sample => <tr key={`${sample.nodeId}-${sample.timestamp}`}>
              <td>{new Date(sample.timestamp).toLocaleString()}</td><td>{stationNames.get(sample.nodeId)}</td><td>{sample.nodeId}</td>
              <td><b>{sample.db.toFixed(1)}</b> dB(A)</td><td><Badge value={classify(sample.db, settings)} /></td>
            </tr>)}</tbody>
          </table></div>
          <p className="small muted">Showing up to 100 samples. CSV includes all matching samples.</p>
        </> : <Empty>{samples.length ? 'No samples match these filters.' : feedStatus}</Empty>}
      </Panel>
    </>;
  }

  if (page === 'alerts') return <>
    <Heading title="Potential disturbances" description="Review recent measurements that reached the configured high threshold." />
    <Panel title="Current alerts" subtitle={`High threshold · ${settings.high} dB(A)`}>
      {high.map(node => <article className="alert-row" key={node.id}>
        <span className="alert-icon"><Bell size={22} /></span>
        <div><h3>{node.name}</h3><p>{node.db.toFixed(1)} dB(A) · {node.id} · {new Date(node.timestamp).toLocaleTimeString()}</p>
          <p className="small muted">{acknowledged.includes(node.id) ? 'Acknowledged for this session.' : 'Review the time and duration of this event.'}</p></div>
        <button className="secondary" disabled={acknowledged.includes(node.id)} onClick={() => setAcknowledged([...acknowledged, node.id])}>
          {acknowledged.includes(node.id) ? 'Acknowledged' : 'Acknowledge'}
        </button>
      </article>)}
      {!high.length && <Empty>{recent.length ? 'No recent station readings reach the high threshold.' : feedStatus}</Empty>}
    </Panel>
    <NoiseGuidance />
  </>;

  if (page === 'analytics') {
    const start = Date.now() - Number(range) * 60_000;
    const inRange = samples.filter(sample => sample.timestamp >= start);
    const emptyMessage = samples.length ? 'No readings in this period.' : feedStatus;
    return <>
      <Heading title="Noise analytics" description="Explore sound levels measured across the community.">
        <select aria-label="Analytics time range" value={range} onChange={event => setRange(event.target.value)}>
          {[60, 15, 5].map(minutes => <option key={minutes} value={minutes}>Last {minutes} minutes</option>)}
        </select>
      </Heading>
      <AssessmentSummary settings={settings} />
      <div className="two-col">
        <Panel title="Noise trend" subtitle="Dashed line marks the high threshold" action={
          <select aria-label="Analytics node" value={selected} onChange={event => setSelected(event.target.value)}>
            {nodes.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}
          </select>}>
          <TrendChart data={inRange.filter(sample => sample.nodeId === selected)} settings={settings} emptyMessage={emptyMessage} />
        </Panel>
        <Panel title="Noise classification" subtitle="Measured samples across all stations">
          <ClassificationChart samples={inRange} settings={settings} emptyMessage={emptyMessage} />
        </Panel>
      </div>
      <Panel title="Node comparison" subtitle="Arithmetic mean and highest reading per station">
        {!inRange.length ? <Empty>{emptyMessage}</Empty> : <div className="comparison-grid">{nodes.map(node => {
          const values = inRange.filter(sample => sample.nodeId === node.id).map(sample => sample.db);
          return <div key={node.id}><p className="muted">{node.name}</p>
            {values.length ? <>
              <h2>{(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)} <small>dB(A)</small></h2>
              <p className="small muted">Peak {Math.max(...values).toFixed(1)} dB(A)</p>
            </> : <p className="small muted">No readings in this period.</p>}
          </div>;
        })}</div>}
      </Panel>
    </>;
  }

  const isMap = page === 'map';
  const average = recent.length ? recent.reduce((sum, node) => sum + node.db, 0) / recent.length : null;
  return <>
    <Heading title={isMap ? 'Monitoring map' : 'Community overview'} description="Community sound monitoring in Hinabangan, Samar." />
    {!isMap && <div className="stats">
      <div><span className="stat-icon"><Activity /></span><p>Network average</p>
        <h2>{average === null ? '—' : <>{average.toFixed(1)} <small>dB(A)</small></>}</h2>
        <span className="small muted">{average === null ? feedStatus : 'Mean of the latest readings from reporting stations'}</span>
      </div>
      <div><span className="stat-icon"><MapPin /></span><p>Reporting stations</p>
        <h2>{recent.length} <small>/ {nodes.length}</small></h2><span className="small muted">Stations with readings in the past minute</span>
      </div>
      <div><span className="stat-icon amber"><Bell /></span><p>Potential disturbances</p>
        <h2>{recent.length ? high.length : '—'}</h2><a href="#/admin/alerts" className="small">Review alerts <ArrowRight size={13} /></a>
      </div>
    </div>}
    {!isMap && <div className="report-summary" aria-live="polite">
      <div><h2>Resident reports</h2><p>{complaintsError ? 'Report updates are unavailable.' : complaintsLoading ? 'Loading reports…' : `${complaints.filter(report => report.status === 'Submitted').length} new · ${complaints.filter(report => report.status !== 'Resolved').length} open · ${complaints.length} total`}</p></div>
      <a className="secondary" href="#/admin/complaints">Review reports <ArrowRight size={15} /></a>
    </div>}
    <AssessmentSummary settings={settings} />
    <div className="section-label"><h2>Monitoring stations</h2><span className="small muted">{feedStatus}</span></div>
    <div className="node-grid">{readings.map(node => <NodeCard key={node.id} node={node} level={classify(node.db, settings)}
      selected={selected === node.id} onClick={() => setSelected(node.id)} />)}</div>
    <div className={isMap ? '' : 'overview-grid'}>
      <Panel title="Hinabangan, Samar monitoring map" subtitle="Select a station to view its reading" action={<span className="badge info">{nodes.length} configured stations</span>}>
        <MonitoringMap readings={readings} settings={settings} selected={selected} onSelect={setSelected} large={isMap} />
      </Panel>
      {!isMap && <Panel title="Noise trend" subtitle={stationNames.get(selected)}>
        <TrendChart data={samples.filter(sample => sample.nodeId === selected)} settings={settings}
          emptyMessage={feedUnavailable ? 'Sensor feed unavailable' : 'Awaiting sensor data'} />
        <a className="text-link" href="#/admin/analytics">Explore analytics <ArrowRight size={15} /></a>
      </Panel>}
    </div>
  </>;
}
