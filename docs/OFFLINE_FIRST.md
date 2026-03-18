# Implantação: Suporte Offline-First

> **Branch:** `copilot/add-offline-capability`  
> **Data:** Março 2026

---

## Visão Geral

Esta implantação transforma o *Passa a Régua* em um **Progressive Web App (PWA) totalmente funcional offline**. O usuário consegue abrir o app, visualizar grupos, membros e transações já carregados — mesmo sem conexão — e qualquer alteração feita offline é sincronizada automaticamente quando a rede voltar.

---

## Arquivos Alterados / Criados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `public/sw.js` | Criado | Service Worker com estratégias de cache |
| `public/offline.html` | Criado | Página de fallback quando totalmente offline |
| `public/manifest.webmanifest` | Alterado | Branding e metadados PWA corrigidos |
| `index.html` | Alterado | Meta tags PWA e `theme-color` sincronizados |
| `src/lib/serviceWorker.ts` | Criado | Registro do SW + reatividade online/offline |
| `src/composables/useSyncStatus.ts` | Criado | Composable de controle de sync com debounce |
| `src/main.ts` | Alterado | Chama `registerServiceWorker()` após montar |
| `src/App.vue` | Alterado | Banners de offline e de atualização disponível |

---

## Detalhamento das Alterações

### 1. `public/sw.js` — Service Worker

O coração do offline-first. Implementa **quatro estratégias de cache** separadas para cada tipo de requisição:

#### Estratégia 1 — API PocketBase → *Network-Only* (sem cache)
```
/api/* e /_/*
```
Requisições à API sempre vão para a rede. Se offline, retorna `503 JSON` com mensagem amigável em vez de erro de rede puro. Isso evita que o app tente usar dados de API em cache (que poderiam estar desatualizados).

#### Estratégia 2 — Navegação (documento HTML) → *Network-First*
```
request.mode === 'navigate'
```
Tenta buscar o HTML atualizado na rede. Se offline, serve o `index.html` do cache (o app SPA cuida do roteamento). Último recurso: serve `offline.html`.

#### Estratégia 3 — Assets estáticos (JS, CSS, imagens, fontes) → *Cache-First + Stale-While-Revalidate*
```
request.destination === 'script' | 'style' | 'image' | 'font'
```
Serve instantaneamente do cache enquanto atualiza o cache em background. Garante carregamento rápido mesmo em rede lenta.

#### Estratégia 4 — Tudo mais → *Network-First com fallback de cache*
Para requisições não enquadradas acima (ex.: SVG de ícone via fetch direto).

#### Pré-cache dinâmico na instalação
O Vite gera bundles com hash no nome (ex.: `/assets/index-CecZZRkK.js`). Durante o evento `install`, o SW faz fetch de `/`, analisa o HTML para extrair os `<script src>` e `<link href="*.css">`, e cacheia todos esses assets automaticamente — sem precisar listá-los manualmente.

```js
// Trecho de sw.js
const response = await fetch('/');
const html = await response.text();
for (const match of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
  if (match[1].startsWith('/')) assetUrls.push(match[1]);
}
```

#### Ciclo de vida: install → activate → fetch
- **install**: Pré-cacheia assets e força `skipWaiting()` (novo SW ativa sem esperar abas fecharem).
- **activate**: Remove caches de versões anteriores (`passaregua-v1`, `passaregua-v2`…). Chama `clients.claim()` para tomar controle imediato de todas as abas.
- **fetch**: Intercepta todas as requisições conforme as estratégias acima.

> **Versão atual do cache:** `passaregua-v3` — bump de versão apaga caches incompletos de iterações anteriores.

---

### 2. `public/offline.html` — Página de Fallback

Página HTML pura (sem dependências externas) exibida quando:
- O usuário tenta navegar para uma rota nova enquanto offline **e**
- O `index.html` também não está em cache (ex.: primeira visita sem conexão).

Contém ícone 📶, texto explicativo e botão "Tentar novamente" que chama `window.location.reload()`.

---

### 3. `public/manifest.webmanifest` — Branding PWA

Três ajustes de branding:

| Campo | Antes | Depois |
|---|---|---|
| `id` | *(ausente)* | `"app.ehtudo.passaregua"` |
| `theme_color` | `"#4f46e5"` (índigo) | `"#047857"` (emerald-700) |
| `categories` | *(ausente)* | `["finance","lifestyle","social"]` |

O campo `id` é importante para que o browser (e lojas de apps) identifiquem o PWA de forma estável, independente da URL. O `theme_color` foi corrigido para combinar com o header verde do app.

---

### 4. `index.html` — Meta Tags PWA

Adicionadas/corrigidas as meta tags:

```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.webmanifest" />

<!-- iOS Safari (não lê o manifest completamente) -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="PassaRégua" />
<link rel="apple-touch-icon" href="/icon.svg" />

<!-- Cor da barra de status (Android Chrome) -->
<meta name="theme-color" content="#047857" />
```

---

### 5. `src/lib/serviceWorker.ts` — Registro e Reatividade

Módulo TypeScript que:

1. **Registra** `/sw.js` com `scope: '/'`.
2. **Detecta update** via evento `updatefound` → seta o ref reativo `updateAvailable`.
3. **Monitora rede** via eventos `online`/`offline` do browser → seta `isOnline`.
4. **Expõe `applyUpdate()`**: envia `{ type: 'SKIP_WAITING' }` ao SW aguardando e recarrega a página após o `controllerchange`.

```ts
export const updateAvailable = ref(false);
export const isOnline = ref(navigator.onLine);
```

Esses refs são importados por `App.vue` e `useSyncStatus` para reagir em tempo real.

---

### 6. `src/composables/useSyncStatus.ts` — Sync com Debounce

Composable que controla quando o app sincroniza dados com o PocketBase:

- **Offline guard**: se `isOnline.value === false`, não tenta sincronizar.
- **Debounce de 2 s**: após uma operação local, aguarda 2 segundos antes de enviar ao servidor (evita múltiplas chamadas em edições rápidas).
- **Sync imediato**: quando o app detecta retorno de rede (`app:online`), chama `triggerSync(false)` com debounce.
- **Feedback**: exibe toast de sucesso/erro apenas em sync manual.

---

### 7. `src/main.ts` — Inicialização

```ts
// Registra SW após o app montar (não bloqueia a renderização inicial)
registerServiceWorker()
```

Registrar depois do mount garante que a renderização inicial do Vue não seja atrasada pelo registro do SW.

---

### 8. `src/App.vue` — Banners de Status

Dois banners fixos no topo da tela:

**Banner offline** (amarelo) — aparece quando `isOnline === false`:
```
⚠️ Você está offline. As alterações serão sincronizadas quando a rede voltar.
```

**Banner de update** (verde escuro) — aparece quando `updateAvailable === true`:
```
🔄 Nova versão disponível!  [Atualizar agora]
```
O botão "Atualizar agora" chama `applyUpdate()`, que força o SW novo a ativar e recarrega a página.

> A cor do banner foi alterada de `bg-indigo-600` para `bg-emerald-800` para combinar com o tema verde do app e evitar uma faixa azul visível na barra de status de dispositivos instalados.

---

## Fluxo Completo

```
Usuário abre o app
        │
        ▼
main.ts chama registerServiceWorker()
        │
        ├─ SW já instalado? ── cache hit ──▶ app carrega offline ✓
        │
        └─ 1ª visita (online):
                install: pré-cacheia shell + bundles dinâmicos
                activate: limpa caches antigos
                fetch: intercepta requisições

Usuário fica offline
        │
        ▼
isOnline = false ──▶ Banner amarelo exibe
        │
        ▼
Operações locais ──▶ localStorage (leituras continuam funcionando)
                     sync adiada

Rede volta
        │
        ▼
evento 'online' ──▶ isOnline = true ──▶ banner some
        │
        ▼
dispatchEvent('app:online') ──▶ App.vue ──▶ triggerSync(debounced)
        │
        ▼
syncService.fullSync() ──▶ PocketBase
```

---

## Compatibilidade

| Browser | Service Worker | Install prompt |
|---|---|---|
| Chrome / Edge (Android/Desktop) | ✅ | ✅ |
| Safari iOS 16.4+ | ✅ | ✅ (via "Adicionar à Tela Inicial") |
| Firefox (Android) | ✅ | ✅ |
| Firefox (Desktop) | ✅ | ❌ (sem install prompt) |
| Samsung Internet | ✅ | ✅ |

---

## Como Testar Offline

1. Abra o app e navegue pelo menos uma vez (para popular o cache).
2. No DevTools → **Application → Service Workers** → marque **Offline**.
3. Recarregue a página — o app deve carregar normalmente.
4. Navegue entre rotas — a SPA deve funcionar sem erros.
5. Desmarque **Offline** — o banner amarelo deve sumir e o sync disparar.

Para testar update:
1. Modifique `CACHE_NAME` em `sw.js` (ex.: `passaregua-v4`).
2. Recarregue — após alguns segundos o banner verde deve aparecer.
3. Clique "Atualizar agora" — a página recarrega com a nova versão.
