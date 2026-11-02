import { useState } from 'react';
import { useData } from '../lib/store';
import { Heading, Panel, Badge, Empty } from './UI';

const statuses = ['Submitted', 'Under review', 'In progress', 'Resolved'];
export default function ComplaintInbox() {
  const { complaints, updateComplaint, complaintsLoading, complaintsError, complaintsConnected, savedReports, importSavedReports, refreshComplaints } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const filtered = complaints.filter(item => (statusFilter === 'All' || item.status === statusFilter) &&
    (item.id + ' ' + item.location + ' ' + item.category).toLowerCase().includes(search.toLowerCase()));
  async function change(id, status) {
    setPending(id);
    setError('');
    setMessage('');
    try { await updateComplaint(id, status); setMessage('Status updated. The resident can see the change in their tracker.'); }
    catch (failure) { setError(failure.message); }
    finally { setPending(null); }
  }
  return <>
    <Heading title="Resident complaints" description="Reports submitted through the separate resident reporting site." />
    {savedReports.length > 0 && <Panel title="Reports saved in this browser" subtitle={savedReports.length + ' reports can be added to the shared inbox'}>
      <p className="small muted">Import previous reports to make them available across admin sessions. Existing shared reports will keep their current status.</p>
      <button className="secondary import-reports" disabled={pending !== null} onClick={async () => {
        setPending('import'); setError('');
        try { await importSavedReports(); setMessage('Saved reports imported into the shared inbox.'); }
        catch (failure) { setError(failure.message); }
        finally { setPending(null); }
      }}>{pending === 'import' ? 'Importing…' : 'Import saved reports'}</button>
    </Panel>}
    <Panel title="Complaint inbox" subtitle={complaintsConnected ? 'Connected · New reports appear automatically' : 'Checking for new reports every 15 seconds'}
      action={<button className="secondary" onClick={refreshComplaints}>Refresh</button>}>
      <div className="filters">
        <input aria-label="Search complaints" placeholder="Search reference or location…" value={search} onChange={event => setSearch(event.target.value)} />
        <select aria-label="Filter complaint status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>{['All', ...statuses].map(status => <option key={status}>{status}</option>)}</select>
      </div>
      {(error || complaintsError) && <p className="form-error" role="alert">{error || complaintsError}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      {filtered.map(record => <article className="complaint" key={record.id}>
        <div className="flex justify-between gap-3 flex-wrap">
          <div><span className="eyebrow">{record.id}</span><h3>{record.category}</h3>
            <p className="small muted">{record.location} · Received {new Date(record.createdAt).toLocaleString()}</p>
            <p className="small muted">Incident time · {new Date(record.incidentAt).toLocaleString()}</p>
          </div><Badge value={record.status} />
        </div>
        <p>{record.description}</p>
        <label className="status-control">Update status
          <select aria-label={'Status for ' + record.id} value={record.status} disabled={pending !== null} onChange={event => change(record.id, event.target.value)}>
            {statuses.map(status => <option key={status}>{status}</option>)}
          </select>{pending === record.id && <span className="small muted">Saving…</span>}
        </label>
      </article>)}
      {complaintsLoading && <Empty>Loading reports…</Empty>}
      {!complaintsLoading && !complaintsError && !filtered.length && <Empty>{complaints.length ? 'No complaints match your filters.' : 'No resident reports have been submitted yet.'}</Empty>}
    </Panel>
  </>;
}
