import { createContext, useContext, useEffect, useState } from 'react';
import { defaults, migrateSettings } from './model';
import { useSensorFeed } from './useSensorFeed';
import { useComplaints } from './useComplaints';
const Context = createContext(null);
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
export function Provider({ children }) {
 const [settings, setSettings] = useState(() => migrateSettings(read('sanaris-settings', defaults)));
 const reports = useComplaints();
 const telemetry = useSensorFeed(settings.interval);
 const [storageError, setStorageError] = useState('');
 useEffect(() => { try { localStorage.setItem('sanaris-settings', JSON.stringify(settings)); setStorageError(''); } catch { setStorageError('Browser storage is unavailable. Assessment settings will be lost when this page closes.'); } }, [settings]);
 return <Context.Provider value={{ settings, setSettings, ...reports, ...telemetry, storageError }}>{children}</Context.Provider>;
}
export const useData = () => useContext(Context);
