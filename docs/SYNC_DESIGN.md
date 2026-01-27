# Sistema de Sincronização com Fila de Mudanças Pendentes

## Visão Geral

Um mecanismo de sincronização offline-first que mantém uma fila de operações pendentes no localStorage e sincroniza com PocketBase quando online. A estratégia last-write-wins resolve conflitos automaticamente.

## Arquitetura

### Camadas Implementadas

1. **localStorage.ts** - Gerenciamento de pending changes
   - `getPendingChanges()` - Recupera fila de operações
   - `addPendingChange()` - Enfileira nova operação
   - `updatePendingChange()` - Atualiza status de operação
   - `clearCompletedChanges()` - Limpa operações concluídas

2. **pocketbase.ts** - Cliente API PocketBase
   - `syncCreate()`, `syncUpdate()`, `syncDelete()` - Operações de sincronização
   - `pullCollection()` - Pull de dados remotos
   - `parseServerTimestamp()` - Converte timestamps do servidor

3. **sync.ts** - Orquestrador de sincronização
   - `SyncService.processPendingChanges()` - Processa fila com retry automático
   - `SyncService.pullRemoteData()` - Sincroniza dados remotos
   - `SyncService.fullSync()` - Sincronização bidirecional completa
   - Estratégia: operações são processadas em **batches atômicos**

4. **useSyncStatus.ts** - Status reativo de sincronização
   - Expõe: `isSyncing`, `pendingCount`, `lastSyncTime`, `hasErrors`
   - Auto-sync a cada 30 segundos quando online
   - Dispara sync automático ao detectar conexão

## Estrutura de Dados

### Pending Changes

```typescript
interface PendingChange {
  id: UUID;                    // ID único da operação
  timestamp: number;           // Quando foi enfileirada
  operation: 'create' | 'update' | 'delete';
  collection: 'groups' | 'members' | 'transactions' | 'splits';
  data: any;                   // Dados completos da entidade
  batchId?: UUID;              // Agrupa transaction+splits
  status: 'pending' | 'processing' | 'completed' | 'error';
  retryCount?: number;         // Tentativas de sincronização
  error?: string;              // Mensagem de erro
  lastAttempt?: number;        // Timestamp última tentativa
}
```

### Timestamp em Entidades

Todas as entidades agora têm `lastModified: number` que:
- É definido automaticamente em `create()` com `Date.now()`
- É atualizado automaticamente em `update()` com `Date.now()`
- É comparado com `updated` do PocketBase para resolução de conflitos

## Fluxo de Operação

### Criação de Despesa (Batch Atômico)

```typescript
// Antes (separado):
const tx = createTransaction(...);
splits.forEach(split => createSplit(tx.id, ...));

// Agora (atômico):
const { transaction, splits } = createTransactionWithSplits(
  groupId, descricao, valor, data, pagador, splits
);
// Ambas operações são enfileiradas com mesmo batchId
```

### Sincronização

```
1. Usuario cria despesa offline
   ↓
2. Operation é enfileirada (pr:pendingChanges)
3. UI continua responsiva (local-first)
   ↓
4. Auto-sync detecta online
   ↓
5. processPendingChanges() processa fila:
   - Agrupa por batchId
   - Processa cada batch em sequência
   - Retry com backoff: 1s → 5s → 15s
   - Max 3 tentativas antes de marcar erro
   ↓
6. pullRemoteData() sincroniza dados do servidor:
   - Compara lastModified vs updated
   - Last-write-wins: timestamp mais recente prevalece
   ↓
7. Operações completadas são limpas
```

## Política de Retry

- **Tentativas máximas**: 3
- **Backoff**: 1s, 5s, 15s (exponencial)
- **Após 3 falhas**: Operação marcada como `error`
- **Limpeza**: Erros com >7 dias são removidos (opcional via `cleanupOldErrors()`)

## Resolução de Conflitos

### Last-Write-Wins

Quando sincronizando, compara timestamps:

```typescript
const remoteTimestamp = parseServerTimestamp(remoteItem.updated);
const localItem = storage.get(id);

if (remoteTimestamp > localItem.lastModified) {
  // Remoto é mais recente → atualizar local
  storage.update(id, { ...remoteItem });
} else {
  // Local é mais recente → manter local
  // (será enviado na próxima sincronização)
}
```

**Vantagem**: Sem conflitos de merge complexos  
**Limitação**: Edições simultâneas de múltiplos usuários usarão último timestamp

## Hooks e Composables

### Usar em um View

```vue
<script setup lang="ts">
import { useSyncStatus } from '../composables/useSyncStatus';

const { 
  isSyncing, 
  pendingCount, 
  lastSyncTime, 
  hasErrors,
  triggerSync 
} = useSyncStatus();
</script>

<template>
  <div>
    <button @click="triggerSync" :disabled="isSyncing">
      {{ isSyncing ? 'Sincronizando...' : 'Sincronizar Agora' }}
    </button>
    
    <span v-if="pendingCount > 0" class="text-yellow-600">
      {{ pendingCount }} operações pendentes
    </span>
    
    <span v-if="hasErrors" class="text-red-600">
      ⚠️ Erros na sincronização
    </span>
    
    <small v-if="lastSyncTime">
      Última sincronização: {{ new Date(lastSyncTime).toLocaleString() }}
    </small>
  </div>
</template>
```

## Variáveis de Ambiente

```env
VITE_BACKEND_URL=http://localhost:8090  # PocketBase server
```

Padrão: `http://localhost:8090`

## Mudanças nos Arquivos Principais

### src/types.ts
- Adicionado `lastModified: number` às entidades
- Tipos de sync: `PendingChange`, `SyncStatus`, etc.

### src/lib/localStorage.ts
- `create()` auto-popula `lastModified`
- `update()` atualiza `lastModified`
- Novo: gerenciador de pending changes

### src/lib/storage.ts
- `createTransaction()` e `createSplit()` enfileiram operações
- Nova: `createTransactionWithSplits()` para batch atômico

### src/components/DrawerExpenseAdd.vue
- Usa `createTransactionWithSplits()` para criar batch atômico

## Verificação de Integridade

Estrutura de pending changes é salva em `pr:pendingChanges`:

```javascript
// No console do navegador
const changes = JSON.parse(localStorage.getItem('pr:pendingChanges'));
console.log(changes); // Array de operações pendentes
```

## Próximos Passos Sugeridos

1. **UI de sincronização**: Adicionar banner visual em `AppHeader.vue`
2. **Detecção de conflitos**: Alertar usuário sobre conflitos em `SettingsView.vue`
3. **Testes E2E**: Simular sincronização offline com Cypress
4. **Otimizações**: Compressão de batch, delta sync apenas de campos modificados
5. **Autenticação**: Integrar auth PocketBase para dados multi-usuário

## Referências

- [PocketBase API](https://pocketbase.io/docs/api-authentication/)
- [localStorage MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Last-Write-Wins Pattern](https://en.wikipedia.org/wiki/Last-write-wins)
