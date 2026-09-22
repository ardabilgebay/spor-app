import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import pkg from './package.json' with { type: 'json' };
export default defineConfig({
  base: '/spor-app/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version + ' · ' + new Date().toISOString().slice(0, 10)) },
  build: { target: 'es2022', sourcemap: true },
  plugins: [VitePWA({
    registerType: 'prompt',            // yeni sürüm: seans ortasında UYGULANMAZ (B5) — UI karar verir
    injectRegister: false,
    workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'], navigateFallback: '/spor-app/index.html', cleanupOutdatedCaches: true },
    manifest: {
      name: 'Spor', short_name: 'Spor', lang: 'tr', start_url: '/spor-app/', scope: '/spor-app/', display: 'standalone',
      background_color: '#161826', theme_color: '#161826', orientation: 'portrait',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    },
  })],
});
