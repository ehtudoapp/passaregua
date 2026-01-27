# 🔄 Implementação: Sistema de Sincronização com Fila de Mudanças Pendentes

## ✅ O que foi implementado

Um mecanismo completo de sincronização offline-first que sincroniza dados do localStorage com PocketBase usando:

- **Fila unificada de operações** (`pr:pendingChanges`) - sem necessidade de pending data separado por tabela
- **UUIDs gerados no front-end** - mantido conforme solicitado
- **Batches atômicos** - transaction + splits são agrupados com `batchId`
- **Timestamps em entidades** - `lastModified` em todas as entidades para resolução de conflitos
- **Estratégia last-write-wins** - timestamp mais recente prevalece em caso de conflito
- **Retry automático** - com exponential backoff (1s, 5s, 15s) e máximo 3 tentativas
- **Auto-sync** - sincronização automática a cada 30s quando online

## 📁 Arquivos Criados/Modificados

### Criados
```
src/lib/pocketbase.ts          - Cliente PocketBase configurado
src/lib/sync.ts                - SyncService com orquestração
src/composables/useSyncStatus.ts - Composable reativo para status
SYNC_DESIGN.md                 - Documentação técnica completa
VALIDATION.js                  - Script para validar implementação
```

### Modificados
```
src/types.ts                   - Adicionado lastModified e tipos de sync
src/lib/localStorage.ts        - Auto-population de lastModified + gerenciador de pending changes
src/lib/storage.ts             - Operações enfileiram mudanças + createTransactionWithSplits()
src/components/DrawerExpenseAdd.vue - Usa createTransactionWithSplits() para batch atômico
package.json                   - Adicionado pocketbase SDK
```

## 🔄 Fluxo de Sincronização

```
Usuário cria despesa offline
  ↓
✓ Transaction + Splits criados localmente (com lastModified)
✓ Operações enfileiradas em pr:pendingChanges com batchId
✓ UI atualiza imediatamente (offline-first)
  ↓
(Conexão detectada ou manual trigger)
  ↓
SyncService.fullSync()
  ├─ pullRemoteData()
  │   └─ Merge last-write-wins por timestamp
  └─ processPendingChanges()
      ├─ Agrupa por batchId
      ├─ Processa cada batch (transaction + splits atômico)
      ├─ Retry automático em falhas
      └─ Marca como completed
  ↓
✓ Sincronizado com servidor
✓ Operações concluídas removidas da fila
```

## 💾 Estrutura do localStorage

```javascript
// Dados originais
pr:groups          → [{ id, nome, lastModified }, ...]
pr:members         → [{ id, group_id, nome, lastModified }, ...]
pr:transactions    → [{ id, ..., lastModified }, ...]
pr:splits          → [{ id, ..., lastModified }, ...]

// Novo - Fila de sincronização
pr:pendingChanges  → [
  {
    id: UUID,
    timestamp: number,
    operation: 'create',
    collection: 'transactions',
    data: { id, group_id, ..., lastModified },
    batchId: UUID,  // ← Agrupa transaction + splits
    status: 'pending',
    retryCount: 0
  },
  {
    id: UUID,
    timestamp: number,
    operation: 'create',
    collection: 'splits',
    data: { id, transaction_id, ..., lastModified },
    batchId: UUID,  // ← MESMO batchId
    status: 'pending',
    retryCount: 0
  },
  ...
]
```

## 🧪 Como Testar

### 1. No console do navegador
```javascript
// Ver fila de pendências
JSON.parse(localStorage.getItem('pr:pendingChanges'))

// Ver status
import { syncService } from './lib/sync'
syncService.getStatus()
// Output: { isSyncing: false, pendingCount: 2, lastSyncTime: null, hasErrors: false }

// Testar sync manualmente
await syncService.fullSync()
```

### 2. Validar batch atômico
```javascript
// Criar despesa (offline)
// ✓ Deve criar 1 transaction + N splits com mesmo batchId

const changes = JSON.parse(localStorage.getItem('pr:pendingChanges'));
const batch = changes.filter(c => c.batchId);
console.log('Batch size:', batch.length); // 1 + N operações
console.log('Tipos:', batch.map(c => c.collection)); // ['transactions', 'splits', 'splits', ...]
```

### 3. Validar last-write-wins
```javascript
// Editar entidade localmente e remotamente
// Mais recente deve prevalecer na sincronização

const groups = JSON.parse(localStorage.getItem('pr:groups'));
console.log('lastModified:', groups[0].lastModified); // Deve ser > timestamp do servidor
```

## 🎯 Casos de Uso Cobertos

✅ **Offline-first**: Usuário cria dados sem conexão  
✅ **Batch atômico**: Transaction + splits sincronizados juntos  
✅ **Retry automático**: Fallhas de rede são resolvidas  
✅ **Conflito de timestamps**: Last-write-wins resolve automaticamente  
✅ **Auto-sync**: Sincroniza periodicamente quando online  
✅ **Status reativo**: UI mostra pendências e erros  

## ⚙️ Configuração

### Variável de ambiente
```env
VITE_BACKEND_URL=http://localhost:8090
```

### Usar SyncStatus em um componente
```vue
<script setup>
import { useSyncStatus } from '@/composables/useSyncStatus'

const { isSyncing, pendingCount, lastSyncTime, hasErrors, triggerSync } = useSyncStatus()
</script>

<template>
  <button @click="triggerSync" :disabled="isSyncing">
    Sincronizar ({{ pendingCount }} pendentes)
  </button>
</template>
```

## 📊 Métricas da Implementação

| Item | Status |
|------|--------|
| Fila unificada | ✅ |
| UUIDs no front-end | ✅ |
| Batch atômico | ✅ |
| lastModified em entidades | ✅ |
| Last-write-wins | ✅ |
| Retry com backoff | ✅ |
| Auto-sync | ✅ |
| Composable reativo | ✅ |
| Builds sem erros | ✅ |

## 🚀 Próximos Passos (Opcionais)

1. **UI Visual**: Banner em `AppHeader.vue` mostrando status de sync
2. **Testes E2E**: Simular offline/online com Cypress
3. **Detecção de conflitos**: Modal alertando sobre edições simultâneas
4. **Dashboards**: Página de configurações com histórico de sync
5. **Analytics**: Rastrear quantidade/tempo de operações sincronizadas

## 🔗 Referências

- [SYNC_DESIGN.md](./SYNC_DESIGN.md) - Documentação técnica completa
- [VALIDATION.js](./VALIDATION.js) - Script para validar implementação
- [PocketBase Docs](https://pocketbase.io/)
