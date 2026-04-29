import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Vite config.
 *
 * Coding-config requests (/ArgeDashRest/api/coding-config/{name}) are
 * forwarded to the Spring Boot backend running on http://localhost:8083 via
 * the proxy entry below. The backend is the single source of truth - it
 * reads C:/ArGePLM/{name}.properties at runtime so end users can edit the
 * file and refresh the browser without rebuilding or restarting anything.
 *
 * To run the UI locally:
 *   1. Start arge-plm-integration-onprem on port 8083
 *   2. npm run dev
 */
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/ArgeDashRest': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },
})
