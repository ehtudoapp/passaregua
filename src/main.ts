import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { registerServiceWorker } from './lib/serviceWorker'

const app = createApp(App)
app.use(router)
app.mount('#app')

// Registra SW após o app montar (não bloqueia a renderização inicial)
registerServiceWorker()
