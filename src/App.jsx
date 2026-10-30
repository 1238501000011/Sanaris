import { useState, useEffect } from 'react';
import { LayoutDashboard, Map, History, Bell, ChartNoAxesCombined, SlidersHorizontal, MessageSquare, ArrowUpRight, FlaskConical, Menu, X } from 'lucide-react';
import { Provider, useData } from './lib/store';
import Admin from './pages/Admin';
import Resident from './pages/Resident';
const nav = [['overview','Overview',LayoutDashboard],['map','Monitoring map',Map],['events','Event history',History],['alerts','Disturbance alerts',Bell],['analytics','Noise analytics',ChartNoAxesCombined],['complaints','Resident complaints',MessageSquare],['settings','Assessment settings',SlidersHorizontal]];
function Shell() {
 const [route,setRoute] = useState(location.hash || '#/admin/overview');
 const [menu,setMenu] = useState(false);
 const {storageError} = useData();
 useEffect(()=>{const handler=()=>{setRoute(location.hash);setMenu(false);window.scrollTo(0,0);};window.addEventListener('hashchange',handler);return()=>window.removeEventListener('hashchange',handler);},[]);
 const resident=route.startsWith('#/resident');
 const page=route.split('/')[2] || (resident?'report':'overview');
 const valid=resident?['report','track'].includes(page):nav.some(n=>n[0]===page);
 const logo=<a href={resident?'#/resident/report':'#/admin/overview'} className="brand"><span className="brand-tile"><img className="brand-logo" src="/sanaris-logo.png" alt="" width="160" height="160"/></span><strong className="brand-name">SANARIS</strong></a>;
 return <div className={resident?'resident-shell':'admin-shell'}>{!resident && <aside className={`sidebar ${menu?'open':''}`}>{logo}<div className="workspace-label">BARANGAY WORKSPACE</div><nav>{nav.map(([id,label,Icon])=><a key={id} href={`#/admin/${id}`} className={page===id?'active':''}><Icon size={19}/>{label}</a>)}</nav><div className="sidebar-bottom"><div className="demo-box"><FlaskConical size={19}/><strong>Capstone demonstration</strong><p>Designed for a more peaceful community.</p></div><a href="#/resident/report">Resident portal <ArrowUpRight size={17}/></a><div className="profile"><span>BA</span><div>Barangay Admin<small>Demo workspace · no authentication</small></div></div></div></aside>}<div className="main-shell"><header>{resident?logo:<><button className="mobile-menu" aria-label="Toggle navigation" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button><span className="breadcrumb">Workspace <span>/</span> {nav.find(n=>n[0]===page)?.[1] || 'Page'}</span></>}<div className="header-right"><span className="demo-chip"><i className="dot moderate"/> Demo mode</span><a href={resident?'#/admin/overview':'#/resident/report'}>{resident?'Admin dashboard':'Resident portal'} <ArrowUpRight size={15}/></a></div></header>{storageError && <div role="alert" className="storage-error">{storageError}</div>}<main>{valid ? resident?<Resident page={page}/>:<Admin page={page}/>:<div className="empty"><h1>Page not found</h1><a href="#/admin/overview">Return to overview</a></div>}</main><footer>SANARIS <span>Community Noise Monitoring System</span><span>Computer Engineering Capstone · Simulation</span></footer></div></div>;
}
export default function App(){return <Provider><Shell/></Provider>;}
