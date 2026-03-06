
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'TrainMaster Pro',
        short_name: 'TrainMaster',
        description: 'Gestão Avançada de Treinamentos de Software',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3462/3462151.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3462/3462151.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ],
        shortcuts: [
          {
            name: 'Novo Treinamento',
            url: './?view=NEW_TRAINING',
            icons: [{ src: 'https://cdn-icons-png.flaticon.com/192/3119/3119338.png', sizes: '192x192' }]
          }
        ]
      }
    })
  ],
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist'
  }
});
