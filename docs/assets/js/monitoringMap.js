import { mapCenter } from './model.js?v=camia-pins-1';
import { stationDisplay } from './mapDisplay.js?v=camia-pins-1';
import { loadGoogleMaps, onGoogleMapsError } from './googleMaps.js?v=camia-pins-1';
import { config } from './api.js?v=camia-pins-1';
import { escapeHTML as e } from './ui.js?v=camia-pins-1';

function hasPosition(node) { return Number.isFinite(node?.lat) && Number.isFinite(node?.lng); }
function popup(node, settings) { const display = stationDisplay(node, settings); return `<div class="station-popup"><strong>${e(node.name)}</strong><p>${e(node.id)}</p><p>${e(display.reading)}</p><p>${e(display.time)}</p></div>`; }
export function createMonitoringMap(element, initial, onSelect) {
  let current = initial, instance, dead = false, disposeGoogle = () => {}, type = '';
  const markers = new Map();
  function leaflet() {
    if (dead || type === 'leaflet') return;
    if (instance && type === 'google') { markers.forEach(marker => marker.setMap(null)); markers.clear(); instance = null; }
    element.replaceChildren(); type = 'leaflet';
    if (!window.L) { element.textContent = 'Map could not load. Use the Google Maps link above.'; return; }
    const map = window.L.map(element).setView(mapCenter, 17); instance = map;
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(map);
    for (const node of current.readings.filter(hasPosition)) {
      const marker = window.L.marker([node.lat, node.lng], { title: node.name, keyboard: true }).addTo(map);
      marker.bindPopup(popup(node, current.settings)); marker.on('click', () => onSelect(node.id)); markers.set(node.id, marker);
    }
    update(current); requestAnimationFrame(() => map.invalidateSize());
  }
  function update(next) {
    const changed = current.selected !== next.selected;
    current = next;
    if (dead || !instance) return;
    for (const node of current.readings) {
      const marker = markers.get(node.id), display = stationDisplay(node, current.settings), selected = current.selected === node.id;
      if (!marker) continue;
      if (type === 'leaflet') {
        marker.setIcon(window.L.divIcon({ className: 'native-station-marker', html: `<span style="background:${display.color}" class="${selected ? 'selected' : ''}">${e(node.id.slice(-2))}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] }));
        marker.setPopupContent(popup(node, current.settings)); marker.getElement()?.setAttribute('aria-label', `${node.name} · ${display.reading}`);
      } else if (type === 'google') { marker.button.style.backgroundColor = display.color; marker.button.classList.toggle('selected', selected); marker.button.setAttribute('aria-label', `${node.name} · ${display.reading}`); }
    }
    if (changed) { const node = current.readings.find(item => item.id === current.selected); if (hasPosition(node)) type === 'leaflet' ? instance.panTo([node.lat, node.lng]) : instance.panTo({ lat: node.lat, lng: node.lng }); }
  }
  if (!config.googleMapsApiKey?.trim()) leaflet();
  else {
    element.innerHTML = '<div class="map-loading" role="status">Loading map…</div>';
    disposeGoogle = onGoogleMapsError(leaflet);
    loadGoogleMaps(config.googleMapsApiKey).then(maps => {
      if (dead || type === 'leaflet') return;
      type = 'google'; element.replaceChildren();
      instance = new maps.Map(element, { center: { lat: mapCenter[0], lng: mapCenter[1] }, zoom: 17, gestureHandling: 'cooperative', mapTypeControl: true, streetViewControl: false });
      const info = new maps.InfoWindow();
      class Station extends maps.OverlayView {
        constructor(node) { super(); this.position = new maps.LatLng(node.lat, node.lng); this.button = document.createElement('button'); this.button.type = 'button'; this.button.className = 'google-station-marker'; this.button.textContent = node.id.slice(-2); this.button.onclick = () => { const latest = current.readings.find(item => item.id === node.id); info.setContent(popup(latest, current.settings)); info.setPosition(this.position); info.open({ map: instance, shouldFocus: false }); onSelect(node.id); }; this.setMap(instance); }
        onAdd() { this.getPanes().overlayMouseTarget.append(this.button); maps.OverlayView.preventMapHitsAndGesturesFrom(this.button); }
        draw() { const point = this.getProjection().fromLatLngToDivPixel(this.position); if (point) { this.button.style.left = point.x + 'px'; this.button.style.top = point.y + 'px'; } }
        onRemove() { this.button.remove(); }
      }
      current.readings.filter(hasPosition).forEach(node => markers.set(node.id, new Station(node))); update(current);
    }).catch(leaflet);
  }
  return { update, destroy() { dead = true; disposeGoogle(); if (type === 'leaflet') instance?.remove(); else { markers.forEach(marker => marker.setMap(null)); if (instance) window.google?.maps?.event.clearInstanceListeners(instance); } } };
}
