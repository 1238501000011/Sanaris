import { useRef, useState } from 'react';
import { Car, Check, Clock3, HardHat, LoaderCircle, MapPin, MessageSquareText, MoreHorizontal, Music2, Send, ShieldCheck, Users } from 'lucide-react';
import { requestApi } from '../lib/complaintsApi';
import { localDateTime, noiseCategories, validateResidentReport } from '../lib/residentForm';
import { Field, FormNotice } from '../components/FormControls';
import ResidentHelp from '../components/ResidentHelp';
import ReportReceipt from '../components/ReportReceipt';
import ReportTracker from '../components/ReportTracker';

const categoryIcons = [Music2, HardHat, Car, Users, MoreHorizontal];
const emptyDraft = { location: '', category: '', incidentAt: '', description: '', consent: false };

export default function Resident({ page, reference }) {
  const [receipt, setReceipt] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submission = useRef(null);
  const form = useRef(null);
  function change(name, value) {
    setDraft(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: undefined }));
    setSubmitError('');
  }
  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validateResidentReport(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      form.current.querySelector(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
      return;
    }
    const report = { location: draft.location.trim(), category: draft.category, description: draft.description.trim(), incidentAt: new Date(draft.incidentAt).toISOString() };
    const fingerprint = JSON.stringify(report);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, key: crypto.randomUUID() };
    setSubmitting(true);
    setSubmitError('');
    try {
      const record = await requestApi('/api/complaints', { method: 'POST', body: report, key: submission.current.key });
      setReceipt(record);
      submission.current = null;
      setDraft(emptyDraft);
    } catch (failure) { setSubmitError(failure.message); }
    finally { setSubmitting(false); }
  }
  const describedBy = name => `${name}-hint${errors[name] ? ` ${name}-error` : ''}`;
  return <div className="resident-layout">
    {page === 'track' ? <ReportTracker reference={reference} /> : receipt ? <ReportReceipt receipt={receipt} onAnother={() => { setReceipt(null); setErrors({}); setSubmitError(''); }} /> :
      <section className="resident-card resident-report-card" aria-labelledby="report-title">
        <div className="resident-card-heading"><span className="resident-section-icon"><MessageSquareText size={21} aria-hidden="true" /></span><div><h2 id="report-title">Tell us what happened</h2><p>A few details will help the barangay review your concern.</p></div></div>
        <form className="resident-report-form" noValidate onSubmit={submit} ref={form} aria-busy={submitting}>
          <p className="resident-required">All fields are required.</p>
          <fieldset className="resident-form-section" disabled={submitting}>
            <legend><span>01</span>Location & noise</legend>
            <Field id="location" label="Where is the noise coming from?" hint="Include a street, purok, or familiar landmark in Hinabangan." error={errors.location}>
              <div className="resident-input-icon"><MapPin size={18} aria-hidden="true" /><input id="location" name="location" required maxLength={160} value={draft.location}
                onChange={event => change('location', event.target.value)} placeholder="e.g. Near the barangay hall, Purok 2"
                aria-invalid={Boolean(errors.location) || undefined} aria-describedby={describedBy('location')} /></div>
            </Field>
            <fieldset className="noise-options-field" aria-describedby={errors.category ? 'category-error' : undefined}>
              <legend>What type of noise is it?</legend>
              <div className="noise-options">{noiseCategories.map((category, index) => {
                const Icon = categoryIcons[index];
                return <label className={`noise-option ${draft.category === category ? 'is-selected' : ''}`} key={category}>
                  <input type="radio" name="category" value={category} required checked={draft.category === category} onChange={() => change('category', category)} aria-invalid={Boolean(errors.category) || undefined} />
                  <span className="noise-option-content"><Icon size={21} aria-hidden="true" /><span>{category}</span><Check className="noise-choice-check" size={13} aria-hidden="true" /></span>
                </label>;
              })}</div>
              {errors.category && <p className="field-error" id="category-error">{errors.category}</p>}
            </fieldset>
          </fieldset>
          <fieldset className="resident-form-section" disabled={submitting}>
            <legend><span>02</span>Time & details</legend>
            <Field id="incidentAt" label="When did it happen?" hint="Choose the local date and time the noise occurred." error={errors.incidentAt}>
              <div className="resident-time-row"><input id="incidentAt" name="incidentAt" type="datetime-local" required value={draft.incidentAt} max={localDateTime()}
                onChange={event => change('incidentAt', event.target.value)} aria-invalid={Boolean(errors.incidentAt) || undefined} aria-describedby={describedBy('incidentAt')} />
                <button type="button" className="secondary" onClick={() => change('incidentAt', localDateTime())}><Clock3 size={16} aria-hidden="true" />Use current time</button></div>
            </Field>
            <Field id="description" label="Tell us a little more" hint="Describe the sound, how long it lasted, and how it affected the area. Avoid personal or sensitive information." error={errors.description}>
              <textarea id="description" name="description" required minLength={10} maxLength={1500} rows={4} value={draft.description}
                onChange={event => change('description', event.target.value)} placeholder="e.g. Loud music has been playing for about an hour and can be heard inside nearby homes."
                aria-invalid={Boolean(errors.description) || undefined} aria-describedby={describedBy('description')} />
              <span className="resident-character-count">{draft.description.length.toLocaleString()} / 1,500</span>
            </Field>
          </fieldset>
          <div className="resident-form-bottom">
            <label className="resident-consent" htmlFor="consent"><input id="consent" name="consent" type="checkbox" required checked={draft.consent} disabled={submitting} onChange={event => change('consent', event.target.checked)} aria-invalid={Boolean(errors.consent) || undefined} aria-describedby={errors.consent ? 'consent-error' : undefined} /><span>I confirm these details are accurate and agree to share this report with the barangay admin.</span></label>
            {errors.consent && <p className="field-error" id="consent-error">{errors.consent}</p>}
            {submitError && <FormNotice>{submitError} Your details are still here; you can retry.</FormNotice>}
            <div className="resident-submit-row"><p><ShieldCheck size={17} aria-hidden="true" /><span>No account needed.<br />Sent to the barangay admin.</span></p><button className="primary" disabled={submitting}>{submitting ? <LoaderCircle className="ui-spinner" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}{submitting ? 'Sending report…' : 'Send report'}</button></div>
          </div>
        </form>
      </section>}
    <ResidentHelp tracking={page === 'track'} />
  </div>;
}
