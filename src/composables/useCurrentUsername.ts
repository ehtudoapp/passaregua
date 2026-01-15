import { ref, readonly } from 'vue';
import { getCurrentUsername as getFromStorage, setCurrentUsername as saveToStorage } from '../lib/storage';

// Estado global compartilhado (singleton)
const currentUsername = ref<string | null>(getFromStorage());

export function useCurrentUsername() {
  // Função que atualiza ref + localStorage
  function setCurrentUsername(username: string | null) {
    saveToStorage(username); // Salva no localStorage
    currentUsername.value = username; // Atualiza ref (dispara reatividade)
  }

  // Retorna ref somente leitura (previne mutação direta)
  return {
    currentUsername: readonly(currentUsername),
    setCurrentUsername
  };
}
