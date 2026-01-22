import { ref, computed, onMounted, onUnmounted } from 'vue';
import { syncService } from '../lib/sync';

const isSyncing = ref(false);
const pendingCount = ref(0);
const lastSyncTime = ref<number | null>(null);
const hasErrors = ref(false);

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

  onMounted(() => {
    updateStatus();
  });

  onUnmounted(() => {
    // Cleanup if needed
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
