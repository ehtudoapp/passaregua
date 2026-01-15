import { ref, readonly } from 'vue';
import type { ActiveGroupId } from '../types';
import { getActiveGroupId as getFromStorage, setActiveGroupId as saveToStorage } from '../lib/storage';

// Estado global compartilhado (singleton)
const activeGroupId = ref<ActiveGroupId>(getFromStorage());

export function useActiveGroup() {
  // Função que atualiza ref + localStorage
  function setActiveGroupId(groupId: ActiveGroupId) {
    saveToStorage(groupId); // Salva no localStorage
    activeGroupId.value = groupId; // Atualiza ref (dispara reatividade)
  }

  // Retorna ref somente leitura (previne mutação direta)
  return {
    activeGroupId: readonly(activeGroupId),
    setActiveGroupId
  };
}
