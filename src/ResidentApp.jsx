import { useEffect, useState } from 'react';
import Brand from './components/Brand';
import Resident from './pages/Resident';
import { ClipboardList, MapPin, MessageSquarePlus, ShieldCheck } from 'lucide-react';
import './styles/resident.css';

export default function ResidentApp() {
  const [route, setRoute] = useState(location.hash || '#/report');
  useEffect(() => {
    const change = () => { setRoute(location.hash || '#/report'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const [pathname, search] = route.split('?');
  const page = pathname === '#/track' ? 'track' : pathname === '#/report' ? 'report' : null;
  const reference = new URLSearchParams(search).get('ref')?.trim().toUpperCase() || '';
  useEffect(() => { document.title = `${page === 'track' ? 'Track your report' : 'Resident reporting'} · SANARIS`; }, [page]);
  return <div className="resident-app">
    <a className="resident-skip" href="#resident-main" onClick={event => { event.preventDefault(); document.getElementById('resident-main')?.focus(); }}>Skip to content</a>
    <header className="resident-header"><div className="resident-container resident-header-inner"><div className="resident-brand"><Brand href="#/report" /><span>RESIDENT SERVICES</span></div><div className="resident-location"><MapPin size={17} aria-hidden="true" /><span>Hinabangan, Samar<small>Community noise reporting</small></span></div></div></header>
    <main id="resident-main" tabIndex={-1} className="resident-main resident-container">
      <div className="resident-intro"><p className="resident-kicker"><ShieldCheck size={15} aria-hidden="true" /> YOUR COMMUNITY. YOUR VOICE.</p>
        <h1>{page === 'track' ? 'Stay updated on your concern.' : 'Let’s make our community quieter.'}</h1>
        <p>{page === 'track' ? 'Follow your report from submission to resolution. No sign-in needed.' : 'Report a noise concern in a few simple steps. We’ll help you get it to the barangay.'}</p>
      </div>
      <nav className="resident-navigation" aria-label="Resident services"><a href="#/report" aria-current={page === 'report' ? 'page' : undefined}><MessageSquarePlus size={19} aria-hidden="true" />Report a concern</a><a href="#/track" aria-current={page === 'track' ? 'page' : undefined}><ClipboardList size={19} aria-hidden="true" />Track a report</a></nav>
      {page ? <Resident page={page} reference={reference} /> : <section className="resident-card resident-not-found"><h1>Page not found</h1><p>Return to the reporting form to send a concern.</p><a className="primary" href="#/report">Report a concern</a></section>}
    </main>
    <footer className="resident-footer resident-container"><p><strong>SANARIS</strong><span>A quieter community, together.</span></p><span>Hinabangan, Samar · Resident services</span></footer>
  </div>;
}
