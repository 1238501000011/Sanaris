import { useEffect, useRef, useState } from 'react';
import { mapCenter } from '../lib/model';
import { stationDisplay } from '../lib/mapDisplay';
import { loadGoogleMaps, onGoogleMapsError } from '../lib/googleMaps';

function popupContent(node, settings) {
  const display = stationDisplay(node, settings);
  const container = document.createElement('div');
  container.className = 'station-popup';
  for (const [tag, text] of [['strong', node.name], ['p', node.id], ['p', display.reading], ['p', display.time]]) {
    if (!text) continue;
    const element = document.createElement(tag);
    element.textContent = text;
    container.append(element);
  }
  return container;
}

// OverlayView supports accessible station buttons without requiring a separate map ID.
function markerClass(maps) {
  return class StationMarker extends maps.OverlayView {
    constructor(map, node, onClick) {
      super();
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.className = 'google-station-marker';
      this.button.textContent = node.id.slice(-2);
      this.button.onclick = onClick;
      this.position = new maps.LatLng(node.lat, node.lng);
      this.setMap(map);
    }

    onAdd() {
      this.getPanes().overlayMouseTarget.append(this.button);
      maps.OverlayView.preventMapHitsAndGesturesFrom(this.button);
    }

    draw() {
      const point = this.getProjection().fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.button.style.left = `${point.x}px`;
      this.button.style.top = `${point.y}px`;
    }

    update(node, settings, selected) {
      const display = stationDisplay(node, settings);
      this.position = new maps.LatLng(node.lat, node.lng);
      this.button.style.backgroundColor = display.color;
      this.button.classList.toggle('selected', selected);
      this.button.setAttribute('aria-pressed', String(selected));
      this.button.setAttribute('aria-label', `${node.name} (${node.id}) · ${display.reading}`);
      this.button.title = `${node.name} · ${display.reading}`;
      if (this.getProjection()) this.draw();
    }

    onRemove() {
      this.button.remove();
    }
  };
}

export default function GoogleMonitoringMap({ apiKey, readings, settings, selected, onSelect, onError }) {
  const container = useRef(null);
  const current = useRef({ readings, settings, onSelect });
  const instance = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    current.current = { readings, settings, onSelect };
  }, [readings, settings, onSelect]);

  useEffect(() => {
    let active = true;
    const unsubscribe = onGoogleMapsError(() => { if (active) onError(); });
    const element = container.current;
    loadGoogleMaps(apiKey).then(maps => {
      if (!active) return;
      const map = new maps.Map(element, {
        center: { lat: mapCenter[0], lng: mapCenter[1] }, zoom: 15,
        gestureHandling: 'cooperative', mapTypeControl: true,
        streetViewControl: false, fullscreenControl: true, clickableIcons: false,
      });
      const info = new maps.InfoWindow({ maxWidth: 260, disableAutoPan: true });
      const Marker = markerClass(maps);
      const markers = new Map();
      const state = { map, info, markers, focused: null, popupId: null, listeners: [] };
      instance.current = state;
      for (const node of current.current.readings) {
        markers.set(node.id, new Marker(map, node, () => {
          const latest = current.current;
          const station = latest.readings.find(reading => reading.id === node.id);
          if (!station) return;
          state.popupId = station.id;
          info.setContent(popupContent(station, latest.settings));
          info.setPosition({ lat: station.lat, lng: station.lng });
          info.open({ map, shouldFocus: false });
          latest.onSelect(station.id);
        }));
      }
      state.listeners.push(info.addListener('closeclick', () => { state.popupId = null; }));
      setReady(true);
    }).catch(() => { if (active) onError(); });
    return () => {
      active = false;
      unsubscribe();
      const state = instance.current;
      if (state) {
        state.info.close();
        state.listeners.forEach(listener => listener.remove());
        state.markers.forEach(marker => marker.setMap(null));
        window.google?.maps?.event.clearInstanceListeners(state.map);
        instance.current = null;
      }
      element.replaceChildren();
    };
  }, [apiKey, onError]);

  useEffect(() => {
    const state = instance.current;
    if (!ready || !state) return;
    readings.forEach(node => state.markers.get(node.id)?.update(node, settings, node.id === selected));
    const node = readings.find(reading => reading.id === selected);
    if (node && state.focused !== node.id) {
      state.map.panTo({ lat: node.lat, lng: node.lng });
      state.map.setZoom(16);
      state.focused = node.id;
      if (state.popupId && state.popupId !== node.id) {
        state.info.close();
        state.popupId = null;
      }
    }
    const popupNode = readings.find(reading => reading.id === state.popupId);
    if (popupNode) state.info.setContent(popupContent(popupNode, settings));
  }, [readings, settings, selected, ready]);

  return <>
    <div ref={container} className="google-map-canvas" aria-label="Google Maps monitoring locations in Hinabangan, Samar" />
    {!ready && <div className="map-loading" role="status">Loading Google Maps…</div>}
  </>;
}
