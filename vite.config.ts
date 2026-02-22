import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.ts',
      registerType: 'prompt', // manual control — don't auto-swap SW mid-session
      injectManifest: {
        swSrc: 'public/sw.ts',
        swDest: 'dist/sw.js',
        // Bundle workbox sub-packages into the SW
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      },
      devOptions: {
        enabled: false, // SW not needed in dev; reduces noise
      },
      manifest: {
        name: 'EverProject',
        short_name: 'EverProject',
        description: 'Manage personal projects and stay productive',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        background_color: '#0a0a0a',
        theme_color: '#6366f1',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: '/screenshots/mobile-1.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
          { src: '/screenshots/mobile-2.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
