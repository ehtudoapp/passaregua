// src/lib/serviceWorker.ts
/**
 * Módulo de registro e gerenciamento do Service Worker.
 *
 * Responsabilidades:
 * - Registrar /sw.js quando o browser suportar
 * - Detectar quando há update disponível e notificar a UI
 * - Expor função para forçar o skip-waiting (atualizar SW imediatamente)
 * - Escutar o evento `online` do browser para disparar sync quando voltar a rede
 */

import { ref } from 'vue';

/** true quando há uma versão nova do SW aguardando ativação */
export const updateAvailable = ref(false);

/** true quando o browser está online */
export const isOnline = ref(navigator.onLine);

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Registra o Service Worker.
 * Deve ser chamado UMA vez, no main.ts, após o app ser montado.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Worker não suportado neste browser');
    return;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Registrado com sucesso, scope:', swRegistration.scope);

    // Verifica se há update disponível no momento do registro
    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration!.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // Há um SW novo instalado; o atual ainda está ativo
          console.log('[SW] Nova versão disponível!');
          updateAvailable.value = true;
        }
      });
    });

    // Verifica se já há um SW aguardando (caso de hard-reload com SW novo)
    if (swRegistration.waiting) {
      updateAvailable.value = true;
    }

  } catch (error) {
    console.error('[SW] Falha ao registrar:', error);
  }

  // ── Monitora status de rede ────────────────────────────────────────────────
  window.addEventListener('online', () => {
    console.log('[SW] Voltou a rede');
    isOnline.value = true;
    // Dispara sync quando a rede voltar (será capturado pelo App.vue)
    window.dispatchEvent(new CustomEvent('app:online'));
  });

  window.addEventListener('offline', () => {
    console.log('[SW] Sem rede');
    isOnline.value = false;
  });
}

/**
 * Força a ativação imediata do SW novo (skip waiting).
 * Após chamar, recarrega a página para aplicar o update.
 */
let controllerChangeListenerAdded = false;

export function applyUpdate(): void {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  // Recarrega quando o novo SW tomar controle (adiciona o listener apenas uma vez)
  if (!controllerChangeListenerAdded) {
    controllerChangeListenerAdded = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}
