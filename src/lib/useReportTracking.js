import { useEffect, useState } from 'react';
import { requestApi } from './complaintsApi';

export function useReportTracking(reference, attempt) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setResult(null);
    setError('');
    setLoading(Boolean(reference));
    if (!reference) return;
    let active = true;
    let busy = false;
    let again = false;
    let events;
    const controller = new AbortController();
    async function refresh() {
      if (!active) return;
      if (busy) { again = true; return; }
      busy = true;
      try {
        const record = await requestApi('/api/complaints/' + encodeURIComponent(reference), { signal: controller.signal });
        if (active) {
          setResult(record);
          setError('');
          if (!events) {
            events = new EventSource('/api/complaints/' + encodeURIComponent(reference) + '/events');
            events.addEventListener('ready', refresh);
            events.addEventListener('complaints-changed', refresh);
            events.onerror = refresh;
          }
        }
      } catch (failure) {
        if (active) {
          setError(failure.status === 404 ? 'We couldn’t find that report. Check the reference number and try again.' : failure.message);
          if (failure.status === 404) { setResult(null); events?.close(); events = null; }
        }
      } finally {
        busy = false;
        if (active) setLoading(false);
        if (again && active) { again = false; refresh(); }
      }
    }
    refresh();
    const poll = setInterval(refresh, 15000);
    return () => { active = false; controller.abort(); events?.close(); clearInterval(poll); };
  }, [reference, attempt]);
  return { result, error, loading };
}
