# 📐 Arquitetura do Sistema de Sincronização

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vue.js)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Components (DrawerExpenseAdd.vue)                                  │
│  ├─ createTransactionWithSplits() ──┐                               │
│  └─ Operações CRUD                   │                               │
│                                       ↓                               │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Storage Layer (src/lib/storage.ts)                             │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │ • createTransaction(groupId, ...)                             │   │
│  │   └─ addPendingChange() → pr:pendingChanges                  │   │
│  │ • createSplit(transactionId, ...)                             │   │
│  │   └─ addPendingChange() → pr:pendingChanges                  │   │
│  │ • createTransactionWithSplits()                               │   │
│  │   └─ Batch atômico com batchId compartilhado                  │   │
│  └─────────────────┬──────────────────────────────────────────────┘   │
│                    ↓                                                    │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Local Storage (src/lib/localStorage.ts)                       │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │ Chaves:                                                        │   │
│  │ • pr:groups          → [{ id, nome, lastModified }, ...]     │   │
│  │ • pr:members         → [{ id, group_id, nome, ... }, ...]    │   │
│  │ • pr:transactions    → [{ id, ..., lastModified }, ...]      │   │
│  │ • pr:splits          → [{ id, ..., lastModified }, ...]      │   │
│  │ • pr:pendingChanges  → [{ id, batchId, operation, ... }, ...]│   │
│  │                                                                │   │
│  │ Funções:                                                       │   │
│  │ • getPendingChanges() - Lê fila de pendências                │   │
│  │ • addPendingChange(change) - Enfileira operação              │   │
│  │ • updatePendingChange(id, updates) - Atualiza status         │   │
│  │ • clearCompletedChanges() - Limpa operações concluídas       │   │
│  └─────────────────┬──────────────────────────────────────────────┘   │
│                    ↓                                                    │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Sync Service (src/lib/sync.ts)                                │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │ SyncService {                                                  │   │
│  │   processPendingChanges()                                     │   │
│  │   ├─ Agrupa por batchId                                       │   │
│  │   ├─ Processa cada batch em sequência                         │   │
│  │   ├─ Retry com backoff (1s, 5s, 15s)                          │   │
│  │   └─ Marca como completed/error                               │   │
│  │                                                                │   │
│  │   pullRemoteData()                                            │   │
│  │   ├─ Baixa grupos, membros, transactions, splits              │   │
│  │   ├─ Merge com lastModified vs updated (last-write-wins)     │   │
│  │   └─ Atualiza localStorage                                    │   │
│  │                                                                │   │
│  │   fullSync()                                                   │   │
│  │   ├─ pullRemoteData()                                          │   │
│  │   └─ processPendingChanges()                                   │   │
│  │                                                                │   │
│  │   getStatus()                                                  │   │
│  │   └─ { isSyncing, pendingCount, lastSyncTime, hasErrors }    │   │
│  └─────────────────┬──────────────────────────────────────────────┘   │
│                    │                                                    │
│  ┌────────────────┴──────────────────────────────────────────────┐   │
│  │ Composable (src/composables/useSyncStatus.ts)               │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │ useSyncStatus() {                                              │   │
│  │   isSyncing         - Se sincronização está em andamento      │   │
│  │   pendingCount      - Quantidade de operações pendentes       │   │
│  │   lastSyncTime      - Timestamp da última sincronização       │   │
│  │   hasErrors         - Se há erros na fila                     │   │
│  │   triggerSync()     - Força sincronização manual              │   │
│  │   updateStatus()    - Atualiza status reativo                 │   │
│  │                                                                │   │
│  │   Hooks:                                                       │   │
│  │   • onMounted(): startAutoSync (30s), listener 'online'       │   │
│  │   • onUnmounted(): stopAutoSync, remover listeners            │   │
│  └─────────────────┬──────────────────────────────────────────────┘   │
│                    ↓                                                    │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ PocketBase Client (src/lib/pocketbase.ts)                     │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │ • syncCreate(collection, data)                                │   │
│  │ • syncUpdate(collection, id, data)                            │   │
│  │ • syncDelete(collection, id)                                  │   │
│  │ • pullCollection(collection)                                  │   │
│  │ • parseServerTimestamp(updated)                               │   │
│  └─────────────────┬──────────────────────────────────────────────┘   │
│                    ↓                                                    │
└────────────────────┼──────────────────────────────────────────────────┘
                     │ HTTP REST API
                     ↓
        ┌──────────────────────────────────┐
        │  PocketBase Server (8090)        │
        ├──────────────────────────────────┤
        │ Collections:                      │
        │ • groups                          │
        │ • members                         │
        │ • transactions                    │
        │ • splits                          │
        │                                   │
        │ Campos automáticos:               │
        │ • id (UUID v4)                    │
        │ • created (autodate)              │
        │ • updated (autodate)              │
        └──────────────────────────────────┘
```

## Fluxo de Sincronização Detalhado

```
OFFLINE                              ONLINE
─────────────────────────────────────────────────────────────

Usuário cria despesa
│
├─ Valida forma
│
├─ createTransactionWithSplits(...)
│  ├─ Gera batchId = UUID
│  │
│  ├─ createTransaction() 
│  │  ├─ transactionsStorage.create()
│  │  │  └─ localStorage.setItem('pr:transactions', ...)
│  │  │
│  │  └─ addPendingChange({
│  │     operation: 'create',
│  │     collection: 'transactions',
│  │     data: { id, ..., lastModified: Date.now() },
│  │     batchId,
│  │     status: 'pending'
│  │  })
│  │  └─ localStorage.setItem('pr:pendingChanges', ...)
│  │
│  └─ forEach splits:
│     └─ createSplit()
│        ├─ splitsStorage.create()
│        │  └─ localStorage.setItem('pr:splits', ...)
│        │
│        └─ addPendingChange({
│           operation: 'create',
│           collection: 'splits',
│           data: { id, ..., lastModified: Date.now() },
│           batchId,  ← MESMO batchId
│           status: 'pending'
│        })
│        └─ localStorage.setItem('pr:pendingChanges', ...)
│
├─ emit('expense-added')
│  └─ UI atualiza (local-first, responsivo)
│
│
[... usuario continua usando app offline ...]
│
│
Conexão detectada (ou usuário clica "Sincronizar")
│
├─ window.addEventListener('online', triggerSync)
│  ou
│  useSyncStatus.triggerSync()
│
└─ syncService.fullSync()
   │
   ├─ pullRemoteData()
   │  ├─ pb.collection('groups').getFullList()
   │  │  └─ HTTP GET /api/collections/groups/records
   │  │     └─ Response: [{ id, nome, updated: "2026-01-22T02:30:00.000Z" }, ...]
   │  │
   │  ├─ mergeCollection('groups', remoteGroups, groupsStorage)
   │  │  └─ Para cada item remoto:
   │  │     ├─ Calcula remoteTimestamp = new Date(updated).getTime()
   │  │     ├─ Compara com localItem.lastModified
   │  │     └─ Se remoteTimestamp > lastModified → storage.update()
   │  │        Senão → manter local (será enviado depois)
   │  │
   │  ├─ pb.collection('members').getFullList()
   │  ├─ pb.collection('transactions').getFullList()
   │  └─ pb.collection('splits').getFullList()
   │     (mesmo padrão de merge)
   │
   └─ processPendingChanges()
      │
      ├─ getPendingChanges() 
      │  └─ Lê pr:pendingChanges do localStorage
      │     Retorna: [{ id, batchId, operation, collection, ... }, ...]
      │
      ├─ groupByBatch(changes)
      │  └─ Agrupa por batchId
      │     Resultado: [[tx + 2 splits], [outro tx + 3 splits], ...]
      │
      └─ forEach batch:
         │
         ├─ updatePendingChange(id, { status: 'processing' })
         │  └─ localStorage.setItem('pr:pendingChanges', ...)
         │
         ├─ forEach operation in batch:
         │  │
         │  └─ processChange(operation)
         │     │
         │     ├─ Se create:
         │     │  └─ pb.collection('transactions').create(data)
         │     │     └─ HTTP POST /api/collections/transactions/records
         │     │        └─ Response: { id, ..., created: "...", updated: "..." }
         │     │
         │     ├─ Se update:
         │     │  └─ pb.collection(collection).update(id, data)
         │     │     └─ HTTP PATCH /api/collections/{collection}/records/{id}
         │     │
         │     └─ Se delete:
         │        └─ pb.collection(collection).delete(id)
         │           └─ HTTP DELETE /api/collections/{collection}/records/{id}
         │
         ├─ Se tudo OK:
         │  └─ forEach change in batch:
         │     └─ updatePendingChange(id, { status: 'completed' })
         │
         └─ Se erro:
            └─ forEach change in batch:
               ├─ retryCount++
               ├─ Se retryCount < MAX_RETRIES:
               │  └─ updatePendingChange(id, { status: 'pending', retryCount })
               │     Próxima tentativa: 1s, 5s, 15s depois
               └─ Se retryCount >= MAX_RETRIES:
                  └─ updatePendingChange(id, { status: 'error', error: message })
                     ⚠️ Usuário notificado
      │
      └─ clearCompletedChanges()
         └─ localStorage.setItem('pr:pendingChanges', [...filtered...])
            (Remove todos os 'completed')

✅ Sincronização concluída
   └─ syncService.lastSyncTime = Date.now()
   └─ useSyncStatus.updateStatus()
      └─ Reatividade Vue atualiza UI
```

## Estrutura de Batch Atômico

```
┌─ Batch ID: 550e8400-e29b-41d4-a716-446655440000
│
├─ PendingChange #1
│  ├─ id: a1f2b3c4-...
│  ├─ operation: create
│  ├─ collection: transactions
│  ├─ data: {
│  │  id: 550e8400-e29b-41d4-a716-446655440001,
│  │  group_id: ...,
│  │  tipo: despesa,
│  │  valor_total: 100000,
│  │  lastModified: 1705935000000
│  │ }
│  ├─ batchId: 550e8400-e29b-41d4-a716-446655440000  ← MESMO
│  └─ status: pending
│
├─ PendingChange #2
│  ├─ id: b2c3d4e5-...
│  ├─ operation: create
│  ├─ collection: splits
│  ├─ data: {
│  │  id: 550e8400-e29b-41d4-a716-446655440002,
│  │  transaction_id: 550e8400-e29b-41d4-a716-446655440001,  ← REFERENCIA
│  │  devedor_id: ...,
│  │  valor_devido: 50000,
│  │  lastModified: 1705935000000
│  │ }
│  ├─ batchId: 550e8400-e29b-41d4-a716-446655440000  ← MESMO
│  └─ status: pending
│
└─ PendingChange #3
   ├─ id: c3d4e5f6-...
   ├─ operation: create
   ├─ collection: splits
   ├─ data: {
   │  id: 550e8400-e29b-41d4-a716-446655440003,
   │  transaction_id: 550e8400-e29b-41d4-a716-446655440001,  ← REFERENCIA
   │  devedor_id: ...,
   │  valor_devido: 50000,
   │  lastModified: 1705935000000
   │ }
   ├─ batchId: 550e8400-e29b-41d4-a716-446655440000  ← MESMO
   └─ status: pending

✨ Todas operações do mesmo batchId são processadas atomicamente:
   • Ou todas completam
   • Ou todas falham e são retentadas juntas
   • Garantindo consistência de dados
```

## Resolução de Conflitos: Last-Write-Wins

```
Cenário: Dois dispositivos editam mesma entidade

Device A                          Device B
─────────────────────────────────────────────

Cria Group                        Offine
─ lastModified: 1705935000000
│
Edita nome                        
─ lastModified: 1705935010000
│
               Conecta
               │
               └─ Sincroniza
                  (lastModified > servidor)
                  ✓ Envia para servidor
                  
                                  Cria Group
                                  ─ lastModified: 1705935005000
                                  │
                                  Edita nome
                                  ─ lastModified: 1705935015000
                                  │
                                  Sincroniza
                                  ├─ Pull remoto (timestamp: 1705935010000)
                                  ├─ Compara: 1705935010000 > 1705935015000?
                                  │  NÃO → Mantém local (1705935015000)
                                  └─ Envia local para servidor
                                     ✓ Último timestamp prevalece

Resultado: Device B vence (1705935015000 > 1705935010000)
Estratégia: Simple, sem conflitos de merge
```

## Componentes Reativos com Sync Status

```vue
<script setup>
import { useSyncStatus } from '@/composables/useSyncStatus'

const { 
  isSyncing,        // boolean, ref
  pendingCount,     // number, ref
  lastSyncTime,     // number | null, ref
  hasErrors,        // boolean, ref
  triggerSync,      // async function
  updateStatus      // function
} = useSyncStatus()
</script>

<template>
  <div class="sync-status">
    <!-- Indicador de sincronização -->
    <div v-if="isSyncing" class="spinner">
      Sincronizando...
    </div>

    <!-- Contador de pendências -->
    <span v-if="pendingCount > 0" class="badge">
      {{ pendingCount }} pendente(s)
    </span>

    <!-- Aviso de erros -->
    <div v-if="hasErrors" class="alert alert-warning">
      ⚠️ Erros na sincronização
    </div>

    <!-- Botão manual -->
    <button @click="triggerSync" :disabled="isSyncing">
      Sincronizar Agora
    </button>

    <!-- Timestamp -->
    <small v-if="lastSyncTime">
      Última sync: {{ new Date(lastSyncTime).toLocaleString() }}
    </small>
  </div>
</template>
```

## Diagrama de Estados

```
┌─────────────────────────────────────────────────────────────┐
│                  Status da Fila (pendingChanges)             │
└─────────────────────────────────────────────────────────────┘

                        [pending]
                            │
                    (Auto-sync, 30s ou manual)
                            │
                            ↓
                    [processing]
                            │
                ┌──────────┴──────────┐
                │                     │
                ↓                     ↓
         (Sucesso)            (Falha)
        [completed]         retryCount++
            │                     │
            │           ┌─────────┴──────────┐
            │           │                    │
            │    (< MAX_RETRIES)      (>= MAX_RETRIES)
            │           │                    │
            │           ↓                    ↓
            │       [pending]            [error]
            │    (próxima tentativa)   (alerta usuário)
            │           │                    │
            └───────────┼────────────────────┘
                        │
            clearCompletedChanges()
                        │
                        ↓
                (Removido da fila)
                Sucesso! ✓
```
