import { createContext, useContext, useEffect, useState } from 'react';
import { defaults, history, sample, seedComplaints, reference, migrateSettings } from './model';
const Context = createContext(null);
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
export function Provider({ children }) {
 const [settings, setSettings] = useState(() => migrateSettings(read('sanaris-settings', defaults)));
 const [complaints, setComplaints] = useState(() => read('sanaris-complaints', seedComplaints));
 const [readings, setReadings] = useState(sample);
 const [series, setSeries] = useState(history);
 const [paused, setPaused] = useState(false);
 const [storageError, setStorageError] = useState('');
 useEffect(() => { try { localStorage.setItem('sanaris-settings', JSON.stringify(settings)); localStorage.setItem('sanaris-complaints', JSON.stringify(complaints)); setStorageError(''); } catch { setStorageError('Browser storage is unavailable. Changes will be lost when this page closes.'); } }, [settings, complaints]);
 useEffect(() => { if (paused) return; const timer = setInterval(() => { const next = sample(); setReadings(next); setSeries(old => [...old.slice(-119), { timestamp: Date.now(), ...Object.fromEntries(next.map(n => [n.id, n.db])) }]); }, settings.interval * 1000); return () => clearInterval(timer); }, [settings.interval, paused]);
 function submitComplaint(data) { const item = { ...data, id: reference(), status: 'Submitted', createdAt: new Date().toISOString(), updates: [{ status: 'Submitted', at: new Date().toISOString() }] }; setComplaints(old => [item, ...old]); return item; }
 function updateComplaint(id, status) { setComplaints(old => old.map(c => c.id === id && c.status !== status ? { ...c, status, updates: [...c.updates, { status, at: new Date().toISOString() }] } : c)); }
 return <Context.Provider value={{ settings, setSettings, complaints, submitComplaint, updateComplaint, readings, series, paused, setPaused, storageError }}>{children}</Context.Provider>;
}
export const useData = () => useContext(Context);
