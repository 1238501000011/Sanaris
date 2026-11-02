import { ArrowRight, Check, ChevronDown, CircleHelp, ClipboardCheck, FileSearch, ShieldCheck } from 'lucide-react';

export default function ResidentHelp({ tracking }) {
  return <aside className="resident-help" aria-label="Reporting help">
    <section className="resident-next">
      <span className="resident-next-icon"><ShieldCheck size={23} aria-hidden="true" /></span>
      <h2>{tracking ? 'Stay informed, simply.' : 'What happens next?'}</h2>
      <p>Your report helps the barangay understand and respond to local noise concerns.</p>
      <ol>
        <li><span><Check size={17} aria-hidden="true" /></span><div><h3>Report received</h3><p>Your concern goes to the admin inbox.</p></div></li>
        <li><span><FileSearch size={17} aria-hidden="true" /></span><div><h3>Reviewed by the admin</h3><p>The barangay assesses your concern.</p></div></li>
        <li><span><ClipboardCheck size={17} aria-hidden="true" /></span><div><h3>Follow its progress</h3><p>Use your reference to see status updates.</p></div></li>
      </ol>
    </section>
    <section className="resident-faq" aria-label="Common questions">
      <h2><CircleHelp size={18} aria-hidden="true" /> A little help</h2>
      <details><summary>Do I need an account?<ChevronDown size={17} aria-hidden="true" /></summary><p>No. You can submit a report without signing in. No name or phone number is required.</p></details>
      <details><summary>{tracking ? 'Where is my reference number?' : 'What details should I include?'}<ChevronDown size={17} aria-hidden="true" /></summary><p>{tracking ? 'It appears on the confirmation screen after you submit. Look in your saved receipt, or paste the number you copied.' : 'Add a recognizable location, the time, and a short description of the noise and how long it lasted. Avoid sharing personal or sensitive details.'}</p></details>
      <a href={tracking ? '#/report' : '#/track'}>{tracking ? 'Report another concern' : 'Already sent a report? Track it'}<ArrowRight size={16} aria-hidden="true" /></a>
    </section>
    <p className="resident-urgent">Need urgent help? Contact your local emergency services directly. This portal is for non-emergency noise concerns.</p>
  </aside>;
}
