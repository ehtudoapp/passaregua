import { ref, computed, onMounted, onUnmounted } from 'vue';
import { syncService } from '../lib/sync';
import { useToast } from './useToast';
import { useDataRefresh } from './useDataRefresh';

const isSyncing = ref(false);
const pendingCount = ref(0);
const lastSyncTime = ref<number | null>(null);
const hasErrors = ref(false);

export function useSyncStatus() {
  const { success, error } = useToast();
  const { triggerRefresh } = useDataRefresh();

  function updateStatus() {
    const status = syncService.getStatus();
    isSyncing.value = status.isSyncing;
    pendingCount.value = status.pendingCount;
    lastSyncTime.value = status.lastSyncTime;
    hasErrors.value = status.hasErrors;
  }

  async function triggerSync() {
    try {
      isSyncing.value = true;
      await syncService.fullSync();
      updateStatus();
      
      // Forçar refresh dos dados em todos os componentes
      triggerRefresh();
      
      // Mostrar toast de sucesso
      success('Dados sincronizados com sucesso!');
      
    } catch (err) {
      console.error('Sync failed:', err);
      updateStatus();
      
      // Mostrar toast de erro
      error('Erro ao sincronizar dados. Tente novamente.');
    } finally {
      isSyncing.value = false;
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
