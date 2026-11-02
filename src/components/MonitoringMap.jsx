import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { mapCenter } from '../lib/model';
import { mapColors, waitingColor, stationDisplay } from '../lib/mapDisplay';
import GoogleMonitoringMap from './GoogleMonitoringMap';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

function Focus({ node }) {
  const map = useMap();
  useEffect(() => {
    if (node) map.flyTo([node.lat, node.lng], 16, { duration: 0.6 });
  }, [node?.id, node?.lat, node?.lng, map]);
  return null;
}

export default function MonitoringMap({ readings, settings, selected, onSelect, large = false }) {
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const handleGoogleError = useCallback(() => setGoogleUnavailable(true), []);
  const useGoogle = Boolean(apiKey) && !googleUnavailable;
  const focus = readings.find(node => node.id === selected);
  const googleLink = `https://www.google.com/maps/search/?api=1&query=${focus?.lat ?? mapCenter[0]},${focus?.lng ?? mapCenter[1]}`;
  return <>
    <div className="map-toolbar">
      <span className="badge info">{useGoogle ? 'Google Maps' : 'OpenStreetMap'}</span>
      <a href={googleLink} target="_blank" rel="noreferrer">Open in Google Maps <ExternalLink size={13} /></a>
    </div>
    {!useGoogle && <p className="map-provider-note" role="status">
      {googleUnavailable ? 'Google Maps is unavailable. Showing OpenStreetMap.' : 'Google Maps setup is pending.'}
      {' '}<a href="#/admin/settings">View setup steps</a>
    </p>}
    <div className={`map ${large ? 'large' : ''}`}>
      {useGoogle ? <GoogleMonitoringMap apiKey={apiKey} readings={readings} settings={settings}
        selected={selected} onSelect={onSelect} onError={handleGoogleError} /> :
      <MapContainer center={mapCenter} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Focus node={readings.find(node => node.id === selected)} />
        {readings.map(node => {
          const display = stationDisplay(node, settings);
          return <CircleMarker key={node.id} center={[node.lat, node.lng]} radius={selected === node.id ? 16 : 11}
            pathOptions={{ color: 'white', weight: 3, fillColor: display.color, fillOpacity: 0.95 }}
            eventHandlers={{ click: () => onSelect(node.id) }}>
            <Popup>
              <strong>{node.name}</strong><br />{node.id}<br />
              {display.reading}{display.time && <><br />{display.time}</>}
            </Popup>
          </CircleMarker>;
        })}
      </MapContainer>}
    </div>
    <div className="map-footer">
      <span><i className="dot" style={{ background: waitingColor }} /> No recent reading</span>
      {Object.entries(mapColors).map(([level, color]) =>
        <span key={level}><i className="dot" style={{ background: color }} /> {level}</span>
      )}
      <span className="muted">Hinabangan, Samar · Illustrative locations</span>
    </div>
  </>;
}
