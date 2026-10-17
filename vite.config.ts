import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

const demo = process.env.VITE_DEMO === 'true'

export default defineConfig({
  resolve: {
    alias: [
      // Fuera de la demostración, el backend del navegador (PGlite) se reemplaza por un módulo vacío.
      ...(demo ? [] : [{ find: /^@\/infra\/demo\/demoBackend$/, replacement: path.resolve(__dirname, 'src/infra/demo/disabled.ts') }]),
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
  test: { globals: true },
  // PGlite (solo modo demostración) trae su propio WebAssembly; Vite no debe preempaquetarlo.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  plugins: [react(), tailwind(), VitePWA({
    registerType: 'autoUpdate',
    // En la demostración, la base de datos del navegador (~16 MB) también se guarda para usarla sin conexión.
    workbox: { maximumFileSizeToCacheInBytes: demo ? 20 * 1024 * 1024 : 2 * 1024 * 1024, globPatterns: ['**/*.{js,css,html,png,svg,wasm,data}'] },
    manifest: { name: 'VetGest', short_name: 'VetGest', theme_color: '#0f766e', background_color: '#ffffff', display: 'standalone',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] },
  })],
})
