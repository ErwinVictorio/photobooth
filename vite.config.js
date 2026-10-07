import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { offlinePlugin } from './build/offline-plugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlinePlugin()],
})
