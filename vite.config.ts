import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: ['passaregua.ehtudo.app']
  },
  preview: {
    allowedHosts: ['passaregua.ehtudo.app']
  }
})
