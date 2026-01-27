import { ref, computed, onMounted, onUnmounted } from 'vue';
import { syncService } from '../lib/sync';
import { useToast } from './useToast';
import { useDataRefresh } from './useDataRefresh';

const isSyncing = ref(false);
const pendingCount = ref(0);
const lastSyncTime = ref<number | null>(null);
const hasErrors = ref(false);

// Debounce para não ficar batendo no servidor toda hora
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 2000; // Espera 2 segundos após última operação

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

  async function triggerSync(immediate = false) {
    // Se immediate=true, sincroniza agora. Senão, usa debounce.
    if (immediate) {
      await doSync(true);
      return;
    }
    
    // Debounce: cancela timer anterior e agenda novo
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }
    
    syncDebounceTimer = setTimeout(async () => {
      syncDebounceTimer = null;
      await doSync(false);
    }, SYNC_DEBOUNCE_MS);
  }
  
  async function doSync(showToast = false) {
    if (isSyncing.value) {
      return; // Já está sincronizando
    }
    
    try {
      isSyncing.value = true;
      await syncService.fullSync();
      updateStatus();
      
      // Forçar refresh dos dados em todos os componentes
      triggerRefresh();
      
      // Mostrar toast apenas quando usuário clica manualmente
      if (showToast) {
        success('Dados sincronizados com sucesso!');
      }
      
    } catch (err) {
      console.error('Sync failed:', err);
      updateStatus();
      
      // Mostrar toast de erro sempre
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
