import { useState, useEffect } from 'react';
import { LayoutDashboard, Map, History, Bell, ChartNoAxesCombined, SlidersHorizontal, MessageSquare, Menu, X, LogOut } from 'lucide-react';
import { Provider, useData } from './lib/store';
import Admin from './pages/Admin';
import Brand from './components/Brand';
import AdminAccess from './components/AdminAccess';

const nav = [['overview', 'Overview', LayoutDashboard], ['map', 'Monitoring map', Map], ['events', 'Event history', History], ['alerts', 'Disturbance alerts', Bell], ['analytics', 'Noise analytics', ChartNoAxesCombined], ['complaints', 'Resident complaints', MessageSquare], ['settings', 'Assessment settings', SlidersHorizontal]];
function Shell() {
  const [route, setRoute] = useState(location.hash || '#/admin/overview');
  const [menu, setMenu] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const { storageError, session, signOut, complaints } = useData();
  useEffect(() => {
    const handler = () => { setRoute(location.hash); setMenu(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  const page = route.split('/')[2] || 'overview';
  const valid = route.startsWith('#/admin/') && nav.some(item => item[0] === page);
  const newReports = complaints.filter(item => item.status === 'Submitted').length;
  if (!session?.authenticated) return <AdminAccess />;
  return <div className="admin-shell">
    <aside id="admin-navigation" aria-label="Admin navigation" className={'sidebar ' + (menu ? 'open' : '')}>
      <Brand />
      <div className="workspace-label">BARANGAY WORKSPACE</div>
      <nav>{nav.map(([id, label, Icon]) => <a key={id} href={'#/admin/' + id} className={page === id ? 'active' : ''}>
        <Icon size={19} />{label}{id === 'complaints' && newReports > 0 && <span className="nav-count" aria-label={newReports + ' new reports'}>{newReports}</span>}
      </a>)}</nav>
      <div className="sidebar-bottom">
        <div className="profile"><span>BA</span><div>Barangay Admin<small>Report management</small></div></div>
        <button className="sign-out" onClick={async () => { try { await signOut(); } catch (error) { setLogoutError(error.message); } }}><LogOut size={15} /> Sign out</button>
        {logoutError && <p className="small" role="alert">{logoutError}</p>}
      </div>
    </aside>
    <div className="main-shell">
      {storageError && <div role="alert" className="storage-error">{storageError}</div>}
      <main>
        <div className="admin-mobile-controls">
          <button className="secondary" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} aria-controls="admin-navigation" onClick={() => setMenu(!menu)}>
            {menu ? <X size={18} /> : <Menu size={18} />} Menu
          </button>
        </div>
        {valid ? <Admin page={page} /> : <div className="empty"><h1>Page not found</h1><a href="#/admin/overview">Return to overview</a></div>}
      </main>
      <footer>SANARIS <span>Community Noise Monitoring System</span><span>Computer Engineering Capstone</span></footer>
    </div>
  </div>;
}
export default function App() { return <Provider><Shell /></Provider>; }
