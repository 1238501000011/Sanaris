// Public website settings. Never put passwords, service-role keys, or secrets here.
// Leave apiBase empty when the website and API share one server.
// For GitHub Pages, set it to your HTTPS backend address, e.g. https://api.example.com.
export const config = {
  apiBase: '',
  // Used on hosted websites; localhost continues using the local Node server.
  cloudApiBase: 'https://uyhqnvpzrfdshzcbhiha.supabase.co/functions/v1/sanaris-api/',
  googleMapsApiKey: '', // Optional browser key restricted to your website URLs.
  sensorFeedPath: '',  // Optional /api/admin/readings endpoint on the backend.
};
