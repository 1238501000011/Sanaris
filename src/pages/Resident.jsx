import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Search, ShieldCheck, Copy } from 'lucide-react';
import { requestApi } from '../lib/complaintsApi';
import { Panel, Badge } from '../components/UI';

export default function Resident({ page }) {
  const [receipt, setReceipt] = useState(null);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [result, setResult] = useState(null);
  const [trackingError, setTrackingError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingAttempt, setTrackingAttempt] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const submission = useRef(null);

  useEffect(() => {
    if (page !== 'track' || !searched) return;
    let active = true;
    let busy = false;
    let again = false;
    let events;
    const controller = new AbortController();
    setResult(null);
    setTrackingLoading(true);
    setTrackingError('');
    async function refresh() {
      if (!active) return;
      if (busy) { again = true; return; }
      busy = true;
      try {
        const record = await requestApi('/api/complaints/' + encodeURIComponent(searched), { signal: controller.signal });
        if (active) {
          setResult(record);
          setTrackingError('');
          if (!events) {
            events = new EventSource('/api/complaints/' + encodeURIComponent(searched) + '/events');
            events.addEventListener('ready', refresh);
            events.addEventListener('complaints-changed', refresh);
            events.onerror = refresh;
          }
        }
      } catch (error) {
        if (active) {
          setTrackingError(error.message);
          if (error.status === 404) { setResult(null); events?.close(); events = null; }
        }
      } finally {
        busy = false;
        if (active) setTrackingLoading(false);
        if (again && active) { again = false; refresh(); }
      }
    }
    refresh();
    const poll = setInterval(refresh, 15000);
    return () => { active = false; controller.abort(); events?.close(); clearInterval(poll); };
  }, [page, searched, trackingAttempt]);

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const report = {
      location: data.location.trim(), category: data.category,
      description: data.description.trim(), incidentAt: new Date(data.incidentAt).toISOString(),
    };
    if (!report.location || report.description.length < 10) { setSubmitError('Enter a location and describe the concern in at least 10 characters.'); return; }
    const fingerprint = JSON.stringify(report);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, key: crypto.randomUUID() };
    setSubmitting(true);
    setSubmitError('');
    try {
      const record = await requestApi('/api/complaints', { method: 'POST', body: report, key: submission.current.key });
      setReceipt(record);
      setQuery(record.id);
      setCopied(false);
      submission.current = null;
    } catch (error) { setSubmitError(error.message); }
    finally { setSubmitting(false); }
  }

  return <div className="resident-content">
    <div className="resident-hero">
      <p className="eyebrow">SANARIS · HINABANGAN, SAMAR</p>
      <h1>A quieter community<br />starts with your voice.</h1>
      <p>Send a noise concern to the barangay admin.<br />Keep your reference number to follow its progress.</p>
      <div className="hero-tabs">
        <a className={page === 'report' ? 'active' : ''} href="#/report">Submit a report <ArrowRight size={16} /></a>
        <a className={page === 'track' ? 'active' : ''} href="#/track">Track a report <Search size={16} /></a>
      </div>
    </div>
    <div className="resident-grid">
      <Panel title={page === 'track' ? 'Track your report' : receipt ? 'Report received' : 'Tell us about your concern'}
        subtitle={page === 'track' ? 'Status updates appear here when the admin reviews your report.' : 'Submitted reports go directly to the admin complaint inbox.'}>
        {page === 'track' ? <>
          <form className="track-form" onSubmit={event => {
            event.preventDefault();
            const reference = query.trim().toUpperCase();
            if (!/^SAN-\d{4}-[A-F0-9]{12,24}$/.test(reference)) { setSearched(''); setResult(null); setTrackingError('Enter the complete reference from your receipt.'); return; }
            setSearched(reference);
            setTrackingAttempt(value => value + 1);
          }}>
            <label>Complaint reference number<input required maxLength={64} placeholder="Enter the reference on your receipt" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <button className="primary" disabled={trackingLoading}><Search size={17} />{trackingLoading ? 'Checking…' : 'Track report'}</button>
          </form>
          {trackingError && <p className="form-error" role="alert">{trackingError}</p>}
          {result && <div className="tracking-result" aria-live="polite">
            <div className="flex justify-between gap-3 flex-wrap"><h3>{result.id}</h3><Badge value={result.status} /></div>
            <ol className="timeline">{result.updates.map((update, index) => <li key={index}>
              <CheckCircle2 size={19} /><div><b>{update.status}</b><p className="small muted">{new Date(update.at).toLocaleString()}</p></div>
            </li>)}</ol>
          </div>}
        </> : receipt ? <div className="receipt">
          <CheckCircle2 size={45} /><h2>Your report has been submitted.</h2>
          <p>The admin can now review your concern. Keep this reference to check its status from any browser.</p>
          <strong>{receipt.id}</strong>
          <button className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(receipt.id); setCopied(true); } catch { setCopied(false); } }}><Copy size={15} />{copied ? 'Copied' : 'Copy reference'}</button>
          <a className="primary" href="#/track" onClick={() => { setQuery(receipt.id); setSearched(receipt.id); }}>Track this report <ArrowRight size={16} /></a>
          <button className="secondary" onClick={() => setReceipt(null)}>Submit another report</button>
        </div> : <form className="report-form" onSubmit={submit}>
          <label>Location of concern<input name="location" required maxLength={160} placeholder="Street, purok, or nearby landmark" /></label>
          <div className="form-row">
            <label>Type of noise<select name="category" required><option value="">Select a category</option>{['Amplified music', 'Construction', 'Vehicle noise', 'Gathering', 'Other'].map(category => <option key={category}>{category}</option>)}</select></label>
            <label>When did it happen?<input name="incidentAt" type="datetime-local" required max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} /></label>
          </div>
          <label>Describe the concern<textarea name="description" required minLength={10} maxLength={1500} rows={5} placeholder="Describe the noise, how long it lasted, and how it affected the area. Please avoid personal or sensitive information." /></label>
          <label className="checkbox"><input name="consent" type="checkbox" required />I confirm that these details are accurate and agree to share this report with the barangay admin.</label>
          {submitError && <p className="form-error" role="alert">{submitError}</p>}
          <button className="primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit report'} <ArrowRight size={17} /></button>
        </form>}
      </Panel>
      <aside>
        <div className="guidance"><ShieldCheck size={29} /><h2>Every report matters.</h2>
          <p>Clear details help the barangay understand the concern and determine an appropriate response.</p>
          <ol><li>Describe the location clearly.</li><li>Include the time and duration.</li><li>Save your reference number.</li></ol>
        </div>
        <p className="small muted side-note">For urgent safety concerns, contact your local emergency services directly. This portal is not an emergency response service.</p>
      </aside>
    </div>
  </div>;
}
