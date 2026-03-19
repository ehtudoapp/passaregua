// public/sw.js
// Service Worker — Passa a Régua PWA
// Estratégia: Cache-First para assets estáticos, Network-First para API

const CACHE_NAME = 'passaregua-v3';
const OFFLINE_URL = '/offline.html';

// Assets estáticos conhecidos pré-cacheados na instalação do SW
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/icon.svg',
  '/manifest.webmanifest',
];

// ─── install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing…');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // 1. Cacheia os arquivos estáticos conhecidos
      console.log('[SW] Pre-caching shell assets');
      await cache.addAll(PRECACHE_URLS);

      // 2. Faz fetch do index.html para descobrir os bundles com hash do Vite
      //    (ex: /assets/index-CecZZRkK.js, /assets/index-Cmi5z3wS.css)
      //    e cacheia-os durante o install, garantindo app offline desde a 1ª visita.
      try {
        const response = await fetch('/');
        const html = await response.text();
        const assetUrls = [];

        // Extrai URLs de scripts e CSS (DOMParser não está disponível em Service Workers)
        for (const match of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
          if (match[1].startsWith('/')) assetUrls.push(match[1]);
        }
        for (const match of html.matchAll(/<link[^>]*\shref="([^"]+\.css[^"]*)"/g)) {
          if (match[1].startsWith('/')) assetUrls.push(match[1]);
        }

        if (assetUrls.length > 0) {
          console.log('[SW] Pre-caching dynamic bundles:', assetUrls);
          await cache.addAll(assetUrls);
        }
      } catch (err) {
        // Offline durante o install (improvável, mas seguro falhar silenciosamente)
        console.warn('[SW] Não foi possível cachear bundles dinâmicos:', err);
      }
    })()
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
          // Offline → serve o app shell cacheado (SPA vai cuidar do routing)
          const appShell = await caches.match('/');
          if (appShell) return appShell;
          // Último recurso: página offline dedicada
          const offline = await caches.match(OFFLINE_URL);
          return offline || new Response('App offline', { status: 503 });
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
          .catch(() => {
            if (cached) return cached;
            // Nenhum cache e sem rede: retorna 503 para evitar TypeError no browser
            return new Response('', { status: 503 });
          });

        return cached || networkFetch;
      })
    );
    return;
  }

  // 4. Tudo mais → tenta rede, usa cache como fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((cached) => {
      return cached || new Response('', { status: 503 });
    }))
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
