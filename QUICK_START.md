# 🚀 Quick Start - Sistema de Sincronização

## 5 Minutos de Setup

### 1. Verifying Installation ✅

```bash
cd /workspaces/passaregua

# Verifique se arquivos foram criados
ls -la src/lib/sync.ts
ls -la src/lib/pocketbase.ts  
ls -la src/composables/useSyncStatus.ts

# Deve aparecer os 3 arquivos criados
```

### 2. Build & Test ✅

```bash
npm run build  # Deve compilar sem erros
npm run test   # Testes passam
```

### 3. Run Dev Server ✅

```bash
# Terminal 1: PocketBase
npm run dev:pb

# Terminal 2: Frontend
npm run dev
# → http://localhost:5173
```

### 4. Test no Navegador

Abra DevTools (F12) → Console:

```javascript
// Ver estrutura de pending changes
JSON.parse(localStorage.getItem('pr:pendingChanges'))

// Criar despesa (vai enfileirar operações)
// → Checa AppHeader ou SettingsView para ver status de sync

// Ver status de sync
import { syncService } from '/src/lib/sync.ts'
syncService.getStatus()
// Output: { isSyncing: false, pendingCount: X, ... }

// Forçar sincronização
await syncService.fullSync()
```

## Arquivos Essenciais

| Arquivo | Função |
|---------|--------|
| `src/lib/sync.ts` | Motor de sincronização |
| `src/lib/pocketbase.ts` | Cliente API |
| `src/composables/useSyncStatus.ts` | Status reativo |
| `src/lib/localStorage.ts` | Gerenciador de fila |
| `src/lib/storage.ts` | Interface de entidades |

## Fluxo Mínimo

```
Usuário cria despesa
    ↓
createTransactionWithSplits() → enfileira (localStorage)
    ↓
UI atualiza (offline-first)
    ↓
Auto-sync/Manual trigger
    ↓
syncService.fullSync()
    └─ pull remoto (merge last-write-wins)
    └─ processPendingChanges() (retry automático)
    ↓
✅ Sincronizado
```

## Próximos Passos

1. **Adicionar UI visual**
   ```vue
   <!-- AppHeader.vue ou SettingsView.vue -->
   <script setup>
   import { useSyncStatus } from '@/composables/useSyncStatus'
   const { pendingCount, isSyncing, triggerSync } = useSyncStatus()
   </script>
   
   <template>
     <button @click="triggerSync" :disabled="isSyncing">
       {{ isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingCount})` }}
     </button>
   </template>
   ```

2. **Ver documentação completa**
   - `IMPLEMENTATION_SUMMARY.md` - Resumo de mudanças
   - `SYNC_DESIGN.md` - Design técnico
   - `ARCHITECTURE.md` - Diagramas e fluxos
   - `FAQ_TROUBLESHOOTING.md` - Perguntas frequentes

## Status da Implementação

✅ Fila unificada de pendências  
✅ UUIDs no front-end  
✅ Batch atômico (transaction + splits)  
✅ Timestamps em entidades  
✅ Last-write-wins  
✅ Retry automático  
✅ Auto-sync  
✅ Composable reativo  
✅ Build sem erros  

## Dúvidas?

Veja `FAQ_TROUBLESHOOTING.md` para:
- Por que essa arquitetura?
- O que acontece se fechar o navegador?
- Como conflitos são resolvidos?
- Troubleshooting de erros comuns
