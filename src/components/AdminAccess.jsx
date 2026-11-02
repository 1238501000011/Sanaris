import { useState } from 'react';
import { ArrowRight, AudioLines, CircleCheck, LoaderCircle, LockKeyhole, MapPin, MessageSquareText, ShieldCheck } from 'lucide-react';
import { useData } from '../lib/store';
import Brand from './Brand';
import { FormNotice, PasswordField } from './FormControls';
import '../styles/access.css';

export default function AdminAccess() {
  const { session, sessionError, checkSession, signIn } = useData();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setup = session?.setupRequired;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (setup && data.get('password') !== data.get('confirm')) { setError('The passwords do not match.'); return; }
    setBusy(true);
    setError('');
    try { await signIn(data.get('password'), setup); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <main className="access-page">
    <div className="access-frame">
      <section className="access-story" aria-label="About SANARIS">
        <Brand />
        <div className="access-story-copy">
          <p className="access-eyebrow">COMMUNITY NOISE MONITORING</p>
          <h2>A quieter community.<br /><span>A clearer picture.</span></h2>
          <p>One workspace to understand local noise and respond to your community's concerns.</p>
          <div className="access-features">
            <div><span><AudioLines size={21} aria-hidden="true" /></span><p><strong>Community monitoring</strong><small>Keep an overview of your monitoring stations.</small></p></div>
            <div><span><MessageSquareText size={21} aria-hidden="true" /></span><p><strong>Resident concerns</strong><small>Review reports and keep residents informed.</small></p></div>
          </div>
        </div>
        <div className="access-location"><MapPin size={16} aria-hidden="true" /> Hinabangan, Samar <span>Community first.</span></div>
      </section>
      <section className="access-form-panel" aria-labelledby="access-title">
        <div className="access-form-inner">
          <span className="access-lock"><LockKeyhole size={25} aria-hidden="true" /></span>
          <p className="access-eyebrow">BARANGAY ADMIN</p>
          <h1 id="access-title">{session ? setup ? 'Your workspace starts here.' : 'Welcome back.' : sessionError ? 'Unable to connect.' : 'Getting things ready.'}</h1>
          <p className="access-description">{session ? setup ? 'Create a password to start managing community reports.' : 'Sign in to your SANARIS dashboard.' : sessionError ? 'Please check your connection and try again.' : 'Checking access to your community dashboard…'}</p>
          {session && <form onSubmit={submit} aria-busy={busy}>
            <PasswordField id="password" label="Admin password" setup={setup} disabled={busy} invalid={Boolean(error)}
              hint={setup ? 'Use at least 12 characters. Keep this password for future sign-ins.' : undefined} />
            {setup && <PasswordField id="confirm" label="Confirm password" setup disabled={busy} invalid={Boolean(error)} />}
            {error && <FormNotice>{error}</FormNotice>}
            <button className="primary access-submit" disabled={busy}>
              {busy ? <LoaderCircle className="ui-spinner" size={19} aria-hidden="true" /> : null}
              {busy ? 'Please wait…' : setup ? 'Create admin password' : 'Sign in to dashboard'}
              {!busy && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>}
          {sessionError && <><FormNotice>{sessionError}</FormNotice><button className="secondary access-retry" onClick={checkSession}>Try again</button></>}
          {!session && !sessionError && <div className="access-loading" role="status"><LoaderCircle className="ui-spinner" size={22} aria-hidden="true" /> Connecting to SANARIS</div>}
          <div className="access-security"><ShieldCheck size={18} aria-hidden="true" /><p>For authorized barangay administrators.<br /><span>Your workspace is protected by password access.</span></p></div>
        </div>
        <p className="access-footnote"><CircleCheck size={15} aria-hidden="true" /> Community Noise Monitoring System</p>
      </section>
    </div>
  </main>;
}
