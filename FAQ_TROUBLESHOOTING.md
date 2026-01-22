# 🔧 FAQ e Troubleshooting

## Perguntas Frequentes

### P: Por que usar uma fila unificada e não uma por tabela?

**R:** Uma fila unificada simplifica:
- **Gerenciamento**: Uma única chave `pr:pendingChanges` vs N chaves
- **Batches atômicos**: Transaction + splits com mesmo `batchId` na mesma fila
- **Status global**: Um único lugar para ver todos pendentes e erros
- **Limpeza**: Remover apenas `pr:pendingChanges` vs limpar N chaves

Cada operação tem `collection` que indica qual tabela, então não há perda de contexto.

---

### P: E se o usuário fechar o navegador com pendências?

**R:** Tudo é preservado:
1. localStorage persiste entre sessões
2. Na próxima abertura, `useSyncStatus` detecta pendências
3. Auto-sync dispara e processa fila
4. Status reativo atualiza UI

Nada é perdido! ✓

---

### P: Como conflitos são resolvidos?

**R:** Last-write-wins por timestamp:

```typescript
// No pullRemoteData
const remoteTimestamp = parseServerTimestamp(remoteItem.updated); // "2026-01-22T10:30:00.000Z"
const localTimestamp = localItem.lastModified;                     // 1705932600000

if (remoteTimestamp > localTimestamp) {
  // Remoto é mais recente → usar remoto
  storage.update(localItem.id, { ...remoteItem });
} else {
  // Local é mais recente → manter local (será enviado)
}
```

**Exemplo**:
- Local editado às 10:30 (timestamp: 1705932600000)
- Remoto editado às 10:29 (timestamp: 1705932540000)
- Resultado: Local prevalece (mais recente)

---

### P: Posso fazer merge manual de conflitos?

**R:** Não implementado ainda, mas possível:

```typescript
// No futuro: adicionar hook de conflito
export async function mergeCollection(...) {
  remoteItems.forEach(remoteItem => {
    if (hasConflict(remoteItem, localItem)) {
      // Dispara evento para UI
      emit('conflict-detected', { remoteItem, localItem });
      // Usuário escolhe: usar remoto, manter local ou merge manual
    }
  });
}
```

Por enquanto, last-write-wins automático.

---

### P: Retry automático funciona como?

**R:** Exponential backoff:

1. **1ª falha**: Tenta novamente após 1s
2. **2ª falha**: Tenta novamente após 5s
3. **3ª falha**: Tenta novamente após 15s
4. **4ª falha**: Marca como `error`, notifica usuário

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

if (retryCount < MAX_RETRIES) {
  setTimeout(() => {
    // Tenta novamente
  }, RETRY_DELAYS[retryCount]);
} else {
  status = 'error';
  // Notificar usuário
}
```

---

### P: Como limpar erros antigos?

**R:** Manual via `SyncService.cleanupOldErrors()`:

```typescript
import { syncService } from '@/lib/sync'

// Limpar erros com >7 dias
await syncService.cleanupOldErrors()

// Ou via console
const { getPendingChanges, removePendingChange } = await import('@/lib/localStorage');
const changes = getPendingChanges();
const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);

changes
  .filter(c => c.status === 'error' && c.timestamp < cutoff)
  .forEach(c => removePendingChange(c.id));
```

---

### P: O PocketBase precisa estar rodando?

**R:** Depende do seu caso:

- ✅ **Offline**: Usuário pode usar totalmente offline
- ❌ **Sync**: PocketBase precisa estar online para sincronizar
- ⚠️ **Erro**: Se PocketBase cair, sync falha mas dados persistem localmente

Durante desenvolvimento:
```bash
npm run dev:pb  # Inicia PocketBase
npm run dev     # Inicia frontend
```

---

### P: Posso sincronizar um subconjunto de dados?

**R:** Sim, modificando `pullCollection()`:

```typescript
// Apenas transactions do grupo ativo
const remoteTransactions = await pullCollection<any>(
  'transactions',
  `group_id = "${activeGroupId}"`  // ← Filter PocketBase
);
```

Veja [PocketBase Filter Syntax](https://pocketbase.io/docs/api-filter-syntax/).

---

## Troubleshooting

### ❌ "Sync fails with 404"

**Possível causa**: PocketBase não rodando  
**Solução**:
```bash
npm run dev:pb
# Verifique se http://localhost:8090 está respondendo
curl http://localhost:8090
```

---

### ❌ "Pending changes never clear"

**Possível causa**: Status não está sendo atualizado  
**Debug**:
```javascript
// No console
const changes = JSON.parse(localStorage.getItem('pr:pendingChanges'));
console.log('Statuses:', changes.map(c => ({ id: c.id, status: c.status })));

// Limpar manualmente
localStorage.removeItem('pr:pendingChanges');
```

---

### ❌ "Batch atomicity não funciona"

**Possível causa**: `batchId` não está sendo usado  
**Verificar**:
```javascript
const changes = JSON.parse(localStorage.getItem('pr:pendingChanges'));
const withoutBatch = changes.filter(c => !c.batchId);
console.log('Sem batchId:', withoutBatch.length); // Deve ser 0 para operações compostas
```

---

### ❌ "lastModified está null"

**Possível causa**: Dados criados antes da implementação  
**Solução**: Migrar dados

```javascript
// Migração one-time
const collections = ['groups', 'members', 'transactions', 'splits'];
collections.forEach(name => {
  const key = `pr:${name}`;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  const migrated = items.map(item => ({
    ...item,
    lastModified: item.lastModified || Date.now()
  }));
  localStorage.setItem(key, JSON.stringify(migrated));
});
```

---

### ❌ "Conflitos são perdidos"

**Possível causa**: Last-write-wins sobrescrevendo sem alertar  
**Solução**: Adicionar hook de conflito (não implementado)

```typescript
// TODO: Implementar em pullRemoteData
if (remoteTimestamp !== localTimestamp) {
  // Conflito detectado
  console.warn(`Conflito em ${id}: remoto=${remoteTimestamp}, local=${localTimestamp}`);
  // Poderia salvar em localStorage para revisão depois
}
```

---

### ❌ "Auto-sync não está rodando"

**Possível causa**: `useSyncStatus` não ativado em nenhum view  
**Solução**: Adicionar a um view raiz

```vue
<!-- App.vue -->
<script setup>
import { useSyncStatus } from '@/composables/useSyncStatus'
// Só por usar a composable, ela inicia auto-sync
const { } = useSyncStatus()
</script>
```

---

### ❌ "Memória crescendo infinitamente"

**Possível causa**: `clearCompletedChanges()` não está sendo chamado  
**Verificar**:
```javascript
const changes = JSON.parse(localStorage.getItem('pr:pendingChanges'));
const completed = changes.filter(c => c.status === 'completed');
console.log('Operações completadas na fila:', completed.length); // Deve estar vazio
```

---

## Debug e Monitoramento

### Logs de Sincronização

```typescript
// Em src/lib/sync.ts, adicionar (já tem alguns):
console.log('✓ Sync iniciado');
console.log(`  Pendências: ${changes.length}`);
console.log(`  Batches: ${batches.length}`);
console.log(`  Status: ${JSON.stringify(this.getStatus())}`);
```

### Inspecionar localStorage

```javascript
// Ver todos os dados
const data = {};
['groups', 'members', 'transactions', 'splits', 'pendingChanges'].forEach(key => {
  data[key] = JSON.parse(localStorage.getItem(`pr:${key}`) || '[]');
});
console.table(data);
```

### Monitorar mudanças

```javascript
// Detectar mudanças em tempo real
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key.startsWith('pr:')) {
    console.log(`localStorage.setItem('${key}', ...)`);
    if (key === 'pr:pendingChanges') {
      console.table(JSON.parse(value));
    }
  }
  return originalSetItem.apply(this, arguments);
};
```

### Testar conexão

```javascript
// Simular offline/online
// DevTools → Network → Offline checkbox

// Verificar se navegador detectou
console.log('Online:', navigator.onLine);

// Forçar sync
import { syncService } from '@/lib/sync';
await syncService.fullSync();
```

---

## Performance

### Tamanho do localStorage

```javascript
function getStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    total += localStorage[key].length + key.length;
  }
  return (total / 1024).toFixed(2) + ' KB';
}

console.log('Storage usado:', getStorageSize());
```

### Operações por segundo

```javascript
console.time('Full Sync');
await syncService.fullSync();
console.timeEnd('Full Sync');
// Output: Full Sync: 234.56ms
```

---

## Migração de Dados Existentes

Se migrando de um sistema sem `lastModified`:

```typescript
// Script de migração (executar uma vez)
import { 
  groupsStorage, membersStorage, transactionsStorage, splitsStorage 
} from '@/lib/storage';

const NOW = Date.now();

[groupsStorage, membersStorage, transactionsStorage, splitsStorage].forEach(storage => {
  storage.all().forEach(item => {
    if (!item.lastModified) {
      storage.update(item.id, { lastModified: NOW });
    }
  });
});

console.log('✓ Migração concluída');
```

---

## Roadmap Sugerido

- [ ] UI visual no `AppHeader.vue` mostrando status
- [ ] Modal de conflitos com opção de merge
- [ ] Página de sincronização em `SettingsView.vue`
- [ ] Compressão de batch (enviar delta apenas)
- [ ] Autenticação PocketBase multi-usuário
- [ ] Notificações de erro (Toast)
- [ ] Gráfico de histórico de sync
- [ ] Teste E2E offline/online
