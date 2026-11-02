import { Panel } from './UI';

export default function MapSettings() {
  const configured = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim());
  return <Panel title="Google Maps" subtitle={configured ? 'API key configured for this installation' : 'Complete setup to enable Google Maps'}>
    <div className="map-setup">
      <p>View the four Hinabangan stations on Google Maps with road and satellite views.</p>
      <ol>
        <li>Create a project in <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console</a> and link a billing account.</li>
        <li>Enable <strong>Maps JavaScript API</strong> under APIs &amp; Services.</li>
        <li>Create an API key. Restrict it to <strong>Websites</strong> and to <strong>Maps JavaScript API</strong>. Allow both local addresses below.</li>
      </ol>
      <pre>http://127.0.0.1:5173/*{'\n'}http://localhost:5173/*</pre>
      <p>Add your key to <code>.env.local</code> in the project folder, then restart the development server.</p>
      <pre>VITE_GOOGLE_MAPS_API_KEY=your_key_here</pre>
      <p className="small muted">Google Maps usage is billed through your Google Cloud account. Set a budget alert and review usage quotas. Website restrictions protect this browser key. Keep the file out of Git.</p>
      <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank" rel="noreferrer">Google's setup guide ↗</a>
    </div>
  </Panel>;
}
