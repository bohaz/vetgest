import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { globals: true },
  plugins: [react(), tailwind(), VitePWA({
    registerType: 'autoUpdate',
    manifest: { name: 'VetGest', short_name: 'VetGest', theme_color: '#0f766e', background_color: '#ffffff', display: 'standalone',
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] },
  })],
})
