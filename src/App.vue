<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import Toast from './components/Toast.vue';
import { useToast } from './composables/useToast';
import { isOnline, updateAvailable, applyUpdate } from './lib/serviceWorker'
import { useSyncStatus } from './composables/useSyncStatus'

const { toasts, removeToast } = useToast();
const { triggerSync } = useSyncStatus()

// Quando voltar a rede, dispara sync automático
function handleOnline() {
  console.log('[App] Online event — disparando sync')
  triggerSync(false) // debounced sync
}

onMounted(() => {
  window.addEventListener('app:online', handleOnline)
})

onUnmounted(() => {
  window.removeEventListener('app:online', handleOnline)
})
</script>

<template>
  <!-- Banner de offline -->
  <div
    v-if="!isOnline"
    class="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 text-center text-sm py-1 px-3 font-medium"
    role="status"
    aria-live="polite"
  >
    ⚠️ Você está offline. As alterações serão sincronizadas quando a rede voltar.
  </div>

  <!-- Banner de update disponível -->
  <div
    v-if="updateAvailable"
    class="fixed top-0 left-0 right-0 z-50 bg-emerald-800 text-white text-center text-sm py-1 px-3 flex items-center justify-center gap-3"
    role="alert"
  >
    <span>🔄 Nova versão disponível!</span>
    <button
      class="underline font-semibold hover:text-emerald-200"
      @click="applyUpdate"
    >
      Atualizar agora
    </button>
  </div>

  <router-view />
  
  <!-- Toast notifications - apenas o último -->
  <Toast
    v-if="toasts.length > 0"
    :message="toasts[toasts.length - 1].message"
    :type="toasts[toasts.length - 1].type"
    :show="true"
    @close="removeToast(toasts[toasts.length - 1].id)"
  />
</template>

