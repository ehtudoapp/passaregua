import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: ['passaregua.ehtudo.app'],
    proxy: {
      '/api': {
        target: 'https://silver-space-trout-5x7p4gw9gvhpvx6-8090.app.github.dev/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  preview: {
    allowedHosts: ['passaregua.ehtudo.app']
  }
})
