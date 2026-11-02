import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import complaintsApi from './server/vitePlugin.js';
export default defineConfig({
 server: { port: 5173, strictPort: true },
 plugins: [react(), tailwindcss(), complaintsApi()],
 build: { rollupOptions: { input: { admin: resolve('index.html'), resident: resolve('resident/index.html') }, output: { manualChunks(id) {
  if (id.includes('node_modules')) {
   if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'charts';
   if (id.includes('leaflet')) return 'map';
   return 'vendor';
  }
 } } } }
});
