import { useCallback, useEffect, useRef, useState } from 'react';
import { requestApi } from './complaintsApi';

export function useComplaints() {
  const [session, setSession] = useState(null);
  const [sessionError, setSessionError] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setLoading] = useState(true);
  const [complaintsError, setError] = useState('');
  const [complaintsConnected, setConnected] = useState(false);
  const refreshRef = useRef(async () => {});
  const sessionGeneration = useRef(0);
  const [legacyReports] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('sanaris-complaints')); return Array.isArray(saved) ? saved.filter(item => item && item.id !== 'SAN-DEMO-0001') : []; }
    catch { return []; }
  });
  const checkSession = useCallback(async () => {
    const generation = ++sessionGeneration.current;
    setSessionError('');
    try { const result = await requestApi('/api/admin/session'); if (generation === sessionGeneration.current) setSession(result); }
    catch (error) { if (generation === sessionGeneration.current) setSessionError(error.message); }
  }, []);
  useEffect(() => { checkSession(); }, [checkSession]);

  useEffect(() => {
    if (!session?.authenticated) { setComplaints([]); return; }
    let active = true;
    let busy = false;
    let again = false;
    const controller = new AbortController();
    async function refresh() {
      if (!active) return;
      if (busy) { again = true; return; }
      busy = true;
      try {
        const items = await requestApi('/api/admin/complaints', { signal: controller.signal });
        if (active) { setComplaints(items); setError(''); }
      } catch (error) {
        if (active) {
          setError(error.message);
          if (error.status === 401) setSession({ authenticated: false, setupRequired: false });
        }
      } finally {
        busy = false;
        if (active) setLoading(false);
        if (again && active) { again = false; refresh(); }
      }
    }
    setLoading(true);
    refreshRef.current = refresh;
    refresh();
    const events = new EventSource('/api/admin/complaints/events');
    events.onopen = () => { if (active) setConnected(true); };
    events.addEventListener('ready', refresh);
    events.addEventListener('complaints-changed', refresh);
    events.onerror = () => { if (active) { setConnected(false); refresh(); } };
    const poll = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      controller.abort();
      events.close();
      clearInterval(poll);
      window.removeEventListener('focus', refresh);
      refreshRef.current = async () => {};
    };
  }, [session?.authenticated]);
  async function signIn(password, setup) {
    await requestApi(setup ? '/api/admin/setup' : '/api/admin/login', { method: 'POST', body: { password } });
    sessionGeneration.current++;
    setSession({ authenticated: true, setupRequired: false });
  }
  async function signOut() {
    await requestApi('/api/admin/logout', { method: 'POST' });
    sessionGeneration.current++;
    setSession({ authenticated: false, setupRequired: false });
  }
  async function updateComplaint(id, status) {
    await requestApi(`/api/admin/complaints/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } });
    await refreshRef.current();
  }
  const savedReports = legacyReports.filter(item => !complaints.some(report => report.id === item.id));
  async function importSavedReports() {
    for (let index = 0; index < savedReports.length; index += 100) {
      await requestApi('/api/admin/complaints/import', { method: 'POST', body: { reports: savedReports.slice(index, index + 100) } });
    }
    await refreshRef.current();
  }
  return { session, sessionError, checkSession, signIn, signOut, complaints, complaintsLoading, complaintsError, complaintsConnected,
    updateComplaint, savedReports, importSavedReports, refreshComplaints: () => refreshRef.current() };
}
