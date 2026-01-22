import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: ['passaregua.ehtudo.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false
      },
      '/_': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    allowedHosts: ['passaregua.ehtudo.app']
  }
})
