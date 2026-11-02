let loading;
let authError;
const errorListeners = new Set();

export function onGoogleMapsError(listener) {
  errorListeners.add(listener);
  if (authError) listener(authError);
  return () => errorListeners.delete(listener);
}

// A single script and promise are shared across routes and React Strict Mode mounts.
export function loadGoogleMaps(apiKey) {
  if (!apiKey?.trim()) return Promise.reject(new Error('Google Maps needs an API key.'));
  if (authError) return Promise.reject(authError);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onerror = null;
      // Keep a harmless callback if a slow request completes after the timeout.
      window.sanarisGoogleMapsReady = () => {};
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve(window.google.maps);
      }
    };
    const timer = setTimeout(() => finish(new Error('Google Maps took too long to load.')), 15000);
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      authError = new Error('Check your Google Maps key, billing and website restrictions.');
      finish(authError);
      errorListeners.forEach(listener => listener(authError));
      previousAuthFailure?.();
    };
    window.sanarisGoogleMapsReady = () => {
      if (!window.google?.maps?.Map || !window.google.maps.OverlayView) {
        finish(new Error('Google Maps could not initialize.'));
        return;
      }
      finish();
    };
    script.async = true;
    script.onerror = () => finish(new Error('Google Maps could not load.'));
    const query = new URLSearchParams({
      key: apiKey.trim(), callback: 'sanarisGoogleMapsReady', loading: 'async',
      v: 'quarterly', language: 'en', region: 'PH',
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${query}`;
    document.head.append(script);
  });
  return loading;
}
