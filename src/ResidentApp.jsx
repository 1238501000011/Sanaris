import { useEffect, useState } from 'react';
import Brand from './components/Brand';
import Resident from './pages/Resident';

export default function ResidentApp() {
  const [route, setRoute] = useState(location.hash || '#/report');
  useEffect(() => {
    const change = () => { setRoute(location.hash); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const page = route === '#/track' ? 'track' : route === '#/report' ? 'report' : null;
  return <div className="resident-shell"><div className="main-shell">
    <header><Brand href="#/report" /><span className="resident-site-label">Resident reporting</span></header>
    <main>{page ? <Resident page={page} /> : <div className="empty"><h1>Page not found</h1><a href="#/report">Submit a report</a></div>}</main>
    <footer>SANARIS <span>Hinabangan, Samar</span><span>Resident reporting</span></footer>
  </div></div>;
}
