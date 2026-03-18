// public/sw.js
// Service Worker — Passa a Régua PWA
// Estratégia: Cache-First para assets estáticos, Network-First para API

const CACHE_NAME = 'passaregua-v1';
const OFFLINE_URL = '/';

// Assets que serão pré-cacheados na instalação do SW
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.webmanifest',
];

// ─── install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing…');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching shell assets');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Força o SW novo a ativar imediatamente, sem esperar abas fecharem
  self.skipWaiting();
});

// ─── activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating…');
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
  // Toma controle de todas as abas abertas imediatamente
  self.clients.claim();
});

// ─── fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Requisições para a API do PocketBase → Network-First, sem cache
  //    (rotas /api/*, /_/)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Offline e a requisição de API falhou → retorna 503 silencioso
        return new Response(
          JSON.stringify({ error: 'offline', message: 'Sem conexão com o servidor' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 2. Navegação (document) → Network-First com fallback para shell offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cacheia a resposta atualizada do shell
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          // Offline → serve o shell cacheado (SPA vai cuidar do routing)
          const cached = await caches.match(OFFLINE_URL);
          return cached || new Response('App offline', { status: 503 });
        })
    );
    return;
  }

  // 3. Assets estáticos (JS, CSS, imagens, fontes) → Cache-First
  //    Atualizamos o cache em background (stale-while-revalidate)
  if (
    url.origin === self.location.origin &&
    (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            return response;
          })
          .catch(() => cached); // se falhar e tiver cache, usa cache

        return cached || networkFetch;
      })
    );
    return;
  }

  // 4. Tudo mais → tenta rede, usa cache como fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── message ──────────────────────────────────────────────────────────────────
// Permite que a UI solicite skip-waiting via postMessage({ type: 'SKIP_WAITING' })
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── sync (Background Sync API — experimental, melhoria progressiva) ──────────
// TODO: implementar sync real via Background Sync API quando amplamente suportada
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-changes') {
    console.log('[SW] Background sync triggered');
    // O syncService no cliente vai executar quando a aba abrir.
    // Aqui apenas logamos — a sync real ocorre no main thread via useSyncStatus.
    event.waitUntil(Promise.resolve());
  }
});
