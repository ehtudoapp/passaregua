import { ref, readonly, computed } from 'vue';
import { getCurrentUserId as getFromStorage, setCurrentUserId as saveToStorage, getMember } from '../lib/storage';

// Estado global compartilhado (singleton)
const currentUserId = ref<string | null>(getFromStorage());

export function useCurrentUsername() {
  // Computed para obter o nome do usuário pelo ID
  const currentUsername = computed(() => {
    if (!currentUserId.value) {
      return null;
    }
    const member = getMember(currentUserId.value);
    return member?.nome || null;
  });

  // Função que atualiza ref + localStorage com o ID do usuário
  function setCurrentUsername(userId: string | null) {
    saveToStorage(userId); // Salva no localStorage
    currentUserId.value = userId; // Atualiza ref (dispara reatividade)
  }

  // Retorna ref somente leitura (previne mutação direta)
  return {
    currentUsername: readonly(currentUsername),
    currentUserId: readonly(currentUserId),
    setCurrentUsername
  };
}
