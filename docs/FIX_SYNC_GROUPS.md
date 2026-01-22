# 🔧 Correção: Sincronização de Grupos e Membros

## Problema
Quando um usuário criava um grupo, a operação era enfileirada localmente, mas **nenhuma sincronização era acionada** porque:
1. `useSyncStatus` composable nunca era inicializado
2. Apenas transaction e split enfileiravam operações (grupos/membros não)

## Solução Implementada

### 1. ✅ Ativar Auto-Sync em App.vue
```typescript
// src/App.vue
<script setup lang="ts">
import { useSyncStatus } from './composables/useSyncStatus'

// Ativa auto-sync (rodar a cada 30s quando online)
useSyncStatus()
</script>
```

**Impacto**: Auto-sync agora está sempre ativo na aplicação.

### 2. ✅ Enfileirar Operações de Grupo e Membro

#### Criação de Grupo
```typescript
export function createGroup(data) {
  const group = groupsStorage.create({ nome: data.nome });
  
  // NOVO: Enfileira operação
  addPendingChange({
    operation: 'create',
    collection: 'groups',
    data: group
  });
  
  // ... criar membros
  return group;
}
```

#### Adição de Membro
```typescript
export function addMemberToGroup(groupId, memberName) {
  const member = membersStorage.create({...});
  
  // NOVO: Enfileira operação
  addPendingChange({
    operation: 'create',
    collection: 'members',
    data: member
  });
  
  return member;
}
```

#### Atualização de Grupo/Membro
```typescript
export function updateGroupName(id, newName) {
  const updated = updateGroup(id, { nome: trimmedName });
  
  // NOVO: Enfileira operação
  if (updated) {
    addPendingChange({
      operation: 'update',
      collection: 'groups',
      data: updated
    });
  }
  
  return updated;
}
```

#### Deleção de Grupo/Membro/Transaction/Split
```typescript
export function removeGroup(id) {
  const group = getGroup(id);
  // ... remover membros (também enfileira deleção de cada um)
  
  const removed = groupsStorage.remove(id);
  
  // NOVO: Enfileira deleção
  if (removed && group) {
    addPendingChange({
      operation: 'delete',
      collection: 'groups',
      data: group
    });
  }
  
  return removed;
}
```

## Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/App.vue` | Adiciona `useSyncStatus()` para ativar auto-sync |
| `src/lib/storage.ts` | Adiciona enfileiramento em todas as operações CRUD |

## Fluxo Agora

```
Usuário cria grupo
    ↓
createGroup()
├─ Cria localmente
├─ Enfileira em pr:pendingChanges ✅ NOVO
├─ UI atualiza
└─ Auto-sync detecta pendência
    ↓
useSyncStatus() (em App.vue)
├─ Auto-sync a cada 30s ✅ NOVO
└─ Quando online, sincroniza com PocketBase
    ↓
✅ Grupo criado no servidor
```

## Operações Agora Enfileiradas

### Grupos
- ✅ `createGroup()` → enfileira create
- ✅ `updateGroupName()` → enfileira update
- ✅ `removeGroup()` → enfileira delete

### Membros
- ✅ `addMemberToGroup()` → enfileira create
- ✅ `updateMember()` → enfileira update
- ✅ `removeMember()` → enfileira delete

### Transactions
- ✅ `createTransaction()` → enfileira create
- ✅ `createPaymentTransaction()` → enfileira create
- ✅ `removeTransaction()` → enfileira delete

### Splits
- ✅ `createSplit()` → enfileira create
- ✅ `updateSplit()` → enfileira update
- ✅ `removeSplit()` → enfileira delete

## Build Status
✅ Sem erros de TypeScript  
✅ 395 módulos transformados  
✅ Built in 3.39s

## Como Testar

1. **Criar um grupo offline**
   ```
   Groups → Novo Grupo → Nome → Membros → Criar
   ```

2. **Verificar fila localmente**
   ```javascript
   JSON.parse(localStorage.getItem('pr:pendingChanges'))
   // Deve mostrar operação de create para grupos
   ```

3. **Conectar online**
   ```
   Auto-sync rodará a cada 30s
   Ou abrir PocketBase Dashboard para ver se grupo foi criado
   ```

4. **Verificar status**
   ```javascript
   import { syncService } from '@/lib/sync'
   syncService.getStatus()
   // { pendingCount: 0 } após sincronizar com sucesso
   ```

## Próximos Passos

- [ ] Adicionar UI visual em AppHeader mostrando "Sincronizando..."
- [ ] Notificação toast quando sync completa
- [ ] Teste E2E de offline/online
- [ ] Botão manual de "Sincronizar Agora" em SettingsView
