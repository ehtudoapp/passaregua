import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [vue()],
    server: {
      allowedHosts: ['passaregua.ehtudo.app'],
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8090',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    preview: {
      allowedHosts: ['passaregua.ehtudo.app']
    }
  }
})
