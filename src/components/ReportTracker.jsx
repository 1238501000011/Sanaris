import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, LoaderCircle, Search } from 'lucide-react';
import { Badge } from './UI';
import { Field, FormNotice } from './FormControls';
import { referencePattern } from '../lib/residentForm';
import { useReportTracking } from '../lib/useReportTracking';

const statusDescriptions = {
  Submitted: 'Your report has been received and is waiting for admin review.',
  'Under review': 'The barangay admin is reviewing your concern.',
  'In progress': 'The admin has marked your concern as being addressed.',
  Resolved: 'The admin has marked your report as resolved.',
};

export default function ReportTracker({ reference = '' }) {
  const [query, setQuery] = useState(reference);
  const [searched, setSearched] = useState(referencePattern.test(reference) ? reference : '');
  const [attempt, setAttempt] = useState(0);
  const [validation, setValidation] = useState('');
  const { result, error, loading } = useReportTracking(searched, attempt);
  useEffect(() => {
    if (!reference) return;
    setQuery(reference);
    setValidation(referencePattern.test(reference) ? '' : 'Enter the complete reference from your receipt.');
    setSearched(referencePattern.test(reference) ? reference : '');
  }, [reference]);
  function search(event) {
    event.preventDefault();
    const value = query.trim().toUpperCase();
    setQuery(value);
    if (!referencePattern.test(value)) {
      setSearched('');
      setValidation('Enter the complete reference number from your receipt.');
      event.currentTarget.elements.reference.focus();
      return;
    }
    setValidation('');
    setSearched(value);
    setAttempt(value => value + 1);
  }
  return <section className="resident-card tracking-card" aria-labelledby="tracking-title">
    <div className="resident-card-heading"><span className="resident-section-icon"><Search size={21} aria-hidden="true" /></span><div><h2 id="tracking-title">Track your report</h2><p>A reference number is all you need.</p></div></div>
    <form className="resident-track-form" onSubmit={search} noValidate aria-busy={loading}>
      <Field id="reference" label="Reference number" hint="Find this on the confirmation screen or your saved receipt." error={validation}>
        <input id="reference" name="reference" required maxLength={64} autoCapitalize="characters" autoComplete="off" spellCheck={false}
          placeholder="Paste your SAN- reference number" value={query} onChange={event => setQuery(event.target.value)}
          aria-invalid={Boolean(validation) || undefined} aria-describedby={`reference-hint${validation ? ' reference-error' : ''}`} />
      </Field>
      <button className="primary" disabled={loading}>{loading ? <LoaderCircle size={18} className="ui-spinner" aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}{loading ? 'Checking report…' : 'Check report status'}</button>
    </form>
    {error && <FormNotice>{error}</FormNotice>}
    {loading && <p className="tracking-loading" role="status">Looking up your report…</p>}
    {result && <div className="resident-tracking-result" aria-live="polite">
      <div className="tracking-status"><div><span>Current status</span><h3>{result.status}</h3></div><Badge value={result.status} /></div>
      <p className="tracking-status-description">{statusDescriptions[result.status]}</p>
      <div className="tracking-reference"><span>Reference</span><strong>{result.id}</strong></div>
      <h3 className="tracking-history-title">Report history</h3>
      <ol className="resident-timeline">{result.updates.map((update, index) => <li key={`${index}-${update.at}`}>
        <span><CheckCircle2 size={18} aria-hidden="true" /></span><div><strong>{update.status}</strong><time dateTime={update.at}>{new Date(update.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
      </li>)}</ol>
      <p className="tracking-auto-note">This page checks for status updates automatically.</p>
    </div>}
    {!result && !error && !loading && <div className="tracking-placeholder"><span><ClipboardList size={29} aria-hidden="true" /></span><h3>Your report, at a glance.</h3><p>Enter your reference above to see its current status and review history.</p></div>}
  </section>;
}
