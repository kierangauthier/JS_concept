import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/planning\/my/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'planning-cache',
              expiration: { maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /\/api\/jobs(\?|$)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'jobs-cache',
              expiration: { maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      manifest: {
        name: 'ConceptManager Terrain',
        short_name: 'CM Terrain',
        display: 'standalone',
        start_url: '/terrain',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        icons: [
          { src: '/icon-192.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
