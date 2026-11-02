import { useEffect, useState } from 'react';
import { mergeReadings, parseReadings, stationReadings } from './telemetry.js';

export function useSensorFeed(interval) {
  const path = import.meta.env.VITE_SENSOR_FEED_PATH?.trim();
  const [feed, setFeed] = useState({ samples: [], checkedAt: 0, unavailable: false });

  useEffect(() => {
    if (!path) return;
    let active = true;
    let nextPoll;
    let request;

    async function poll() {
      request = new AbortController();
      const timeout = setTimeout(() => request.abort(), 10_000);
      try {
        const url = new URL(path, window.location.origin);
        if (url.origin !== window.location.origin) throw new Error('Expected a same-origin sensor feed.');
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          redirect: 'error',
          signal: request.signal,
        });
        if (!response.ok) throw new Error('Sensor feed unavailable.');
        const payload = await response.json();
        const checkedAt = Date.now();
        const incoming = parseReadings(payload, checkedAt);
        if (active) setFeed(old => ({
          samples: mergeReadings(old.samples, incoming),
          checkedAt,
          unavailable: false,
        }));
      } catch {
        if (active) setFeed(old => ({ ...old, checkedAt: Date.now(), unavailable: true }));
      } finally {
        clearTimeout(timeout);
        if (active) nextPoll = setTimeout(poll, interval * 1000);
      }
    }

    poll();
    return () => {
      active = false;
      clearTimeout(nextPoll);
      request?.abort();
    };
  }, [path, interval]);

  return {
    readings: stationReadings(feed.samples, feed.checkedAt, feed.unavailable),
    samples: feed.samples,
    feedConfigured: Boolean(path),
    feedUnavailable: feed.unavailable,
  };
}
