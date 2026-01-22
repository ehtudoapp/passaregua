import { ref, computed, onMounted, onUnmounted } from 'vue';
import { syncService } from '../lib/sync';

const isSyncing = ref(false);
const pendingCount = ref(0);
const lastSyncTime = ref<number | null>(null);
const hasErrors = ref(false);

let intervalId: number | null = null;

export function useSyncStatus() {
  function updateStatus() {
    const status = syncService.getStatus();
    isSyncing.value = status.isSyncing;
    pendingCount.value = status.pendingCount;
    lastSyncTime.value = status.lastSyncTime;
    hasErrors.value = status.hasErrors;
  }

  async function triggerSync() {
    try {
      await syncService.fullSync();
      updateStatus();
    } catch (error) {
      console.error('Sync failed:', error);
      updateStatus();
    }
  }

  function startAutoSync(intervalMs: number = 30000) {
    if (intervalId) return;

    intervalId = window.setInterval(() => {
      if (navigator.onLine && !isSyncing.value) {
        triggerSync();
      }
    }, intervalMs);
  }

  function stopAutoSync() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  onMounted(() => {
    updateStatus();

    // Auto-sync quando ficar online
    window.addEventListener('online', triggerSync);

    // Iniciar auto-sync
    startAutoSync();
  });

  onUnmounted(() => {
    window.removeEventListener('online', triggerSync);
    stopAutoSync();
  });

  return {
    isSyncing: computed(() => isSyncing.value),
    pendingCount: computed(() => pendingCount.value),
    lastSyncTime: computed(() => lastSyncTime.value),
    hasErrors: computed(() => hasErrors.value),
    triggerSync,
    updateStatus
  };
}
