import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useData } from '../lib/store';
import Brand from './Brand';

export default function AdminAccess() {
  const { session, sessionError, checkSession, signIn } = useData();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setup = session?.setupRequired;
  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (setup && data.get('password') !== data.get('confirm')) { setError('The passwords do not match.'); return; }
    setBusy(true);
    setError('');
    try { await signIn(data.get('password'), setup); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <main className="admin-access">
    <Brand />
    <section className="panel">
      <LockKeyhole size={28} />
      <h1>{session ? setup ? 'Set up admin access' : 'Admin sign-in' : 'Connecting to SANARIS'}</h1>
      <p className="muted">{setup ? 'Create the admin password to manage reports for Hinabangan, Samar.' : 'Sign in to view reports and manage the community dashboard.'}</p>
      {session && <form onSubmit={submit}>
        <label>Admin password<input name="password" type="password" autoComplete={setup ? 'new-password' : 'current-password'} required minLength={setup ? 12 : 1} maxLength={128} /></label>
        {setup && <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>}
        {setup && <p className="small muted">Use at least 12 characters. Keep this password for future sign-ins.</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : setup ? 'Create admin password' : 'Sign in'}</button>
      </form>}
      {(error || sessionError) && <p className="form-error" role="alert">{error || sessionError}</p>}
      {sessionError && <button className="secondary" onClick={checkSession}>Try again</button>}
    </section>
  </main>;
}
