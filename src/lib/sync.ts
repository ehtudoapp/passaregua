import {
  getPendingChanges,
  updatePendingChange,
  removePendingChange,
  clearCompletedChanges
} from './localStorage';
import { syncCreate, syncUpdate, syncDelete, pullCollection, parseServerTimestamp } from './pocketbase';
import { groupsStorage, membersStorage, transactionsStorage, splitsStorage, getActiveGroupId } from './storage';
import type { PendingChange, Member, TransactionRecord, Split } from '../types';

const MAX_RETRIES = 3;
const CLEANUP_DAYS = 7;

export class SyncService {
  private isSyncing = false;
  private lastSyncTime: number | null = null;

  async processPendingChanges(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏭️ Sync already in progress');
      return;
    }

    this.isSyncing = true;

    try {
      const changes = getPendingChanges().filter(c => c.status === 'pending' || c.status === 'error');
      
      if (changes.length === 0) {
        console.log('✅ No pending changes to process');
        return;
      }

      console.log(`📝 Processing ${changes.length} pending changes:`, changes.map(c => `${c.operation} ${c.collection}`));

      // Agrupar por batchId
      const batches = this.groupByBatch(changes);
      
      console.log(`📦 Grouped into ${batches.length} batches`);

      // Processar cada batch
      for (const batch of batches) {
        await this.processBatch(batch);
      }

      // Limpar operações concluídas
      clearCompletedChanges();

      this.lastSyncTime = Date.now();
      console.log('✅ Pending changes processed successfully');
    } catch (error) {
      console.error('❌ Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private groupByBatch(changes: PendingChange[]): PendingChange[][] {
    const batches: Map<string, PendingChange[]> = new Map();

    changes.forEach(change => {
      const key = change.batchId || change.id; // Se não tem batchId, trata individualmente

      if (!batches.has(key)) {
        batches.set(key, []);
      }
      batches.get(key)!.push(change);
    });

    return Array.from(batches.values());
  }

  private async processBatch(batch: PendingChange[]): Promise<void> {
    // Processar cada operação do batch individualmente
    // Se uma falhar, as outras ainda podem ser processadas
    for (const change of batch) {
      // Marcar como processing
      updatePendingChange(change.id, {
        status: 'processing',
        lastAttempt: Date.now()
      });

      try {
        await this.processChange(change);
        
        // Se deu certo, marcar como completed
        updatePendingChange(change.id, { status: 'completed' });
      } catch (error) {
        // Se falhou, marcar como error e incrementar retry count
        const retryCount = (change.retryCount || 0) + 1;
        const status = retryCount >= MAX_RETRIES ? 'error' : 'pending';

        updatePendingChange(change.id, {
          status,
          retryCount,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.error(`⚠️ Change failed (retry ${retryCount}/${MAX_RETRIES}):`, change.operation, change.collection, change.data.id);
      }
    }
  }

  private async processChange(change: PendingChange): Promise<void> {
    const { operation, collection, data } = change;

    try {
      switch (operation) {
        case 'create':
          try {
            await syncCreate(collection, data);
          } catch (error: any) {
            // Se já existe (ID duplicado), tentar atualizar em vez de criar
            const isDuplicateId = error?.status === 400 && 
                                 error?.data?.id?.code === 'validation_not_unique';
            
            if (isDuplicateId) {
              console.log(`⚠️ Record already exists, updating instead: ${collection}/${data.id}`);
              await syncUpdate(collection, data.id, data);
            } else {
              throw error;
            }
          }
          break;
        case 'update':
          try {
            await syncUpdate(collection, data.id, data);
          } catch (error: any) {
            // Se registro não existe (404), criar em vez de atualizar
            if (error?.status === 404) {
              console.log(`⚠️ Record not found, creating instead: ${collection}/${data.id}`);
              await syncCreate(collection, data);
            } else {
              throw error;
            }
          }
          break;
        case 'delete':
          // Para members/transactions/splits, fazer soft delete (update com deleted: true)
          // Groups não devem chegar aqui (delete apenas local)
          if (collection === 'members' || collection === 'transactions' || collection === 'splits') {
            try {
              await syncUpdate(collection, data.id, { ...data, deleted: true });
            } catch (error: any) {
              // Se registro não existe (404), não precisa fazer nada - já está "deletado" (nunca existiu)
              if (error?.status === 404) {
                console.log(`ℹ️ Record not found on server, skipping delete: ${collection}/${data.id}`);
                // Não criar registro deletado - se não existe, não precisa criar só para marcar como deletado
              } else {
                throw error;
              }
            }
          } else {
            // Fallback: hard delete (não deve ser usado normalmente)
            try {
              await syncDelete(collection, data.id);
            } catch (error: any) {
              // Se já foi deletado ou não existe, ignorar erro 404
              if (error?.status !== 404) {
                throw error;
              }
            }
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to sync ${operation} on ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Verifica se um grupo existe no servidor, se não existir, cria-o junto com
   * todos os membros, transações e splits locais. Também atualiza os itens locais
   * para incluir o campo deleted quando necessário.
   * @returns 'created' se criou o grupo, 'exists' se já existia, false se falhou
   */
  async ensureGroupExistsOnServer(groupId: string): Promise<'created' | 'exists' | false> {
    try {
      // Verificar se o grupo existe no servidor
      const remoteGroups = await pullCollection<any>('groups', `id="${groupId}"`);
      
      if (remoteGroups.length > 0) {
        // Grupo já existe no servidor
        return 'exists';
      }

      console.log('Group not found on server, creating:', groupId);

      // Buscar grupo local
      const localGroup = groupsStorage.get(groupId);
      if (!localGroup) {
        console.error('Group not found locally:', groupId);
        return false;
      }

      // Criar grupo no servidor
      await syncCreate('groups', {
        id: localGroup.id,
        nome: localGroup.nome,
        lastModified: localGroup.lastModified
      });

      // Buscar e criar todos os membros do grupo
      const localMembers = membersStorage.find((m: Member) => m.group_id === groupId);
      for (const member of localMembers) {
        await syncCreate('members', {
          id: member.id,
          group_id: member.group_id,
          nome: member.nome,
          lastModified: member.lastModified,
          deleted: member.deleted || false
        });
        // Atualizar local para garantir campo deleted existe
        if (member.deleted === undefined) {
          membersStorage.update(member.id, { deleted: false });
        }
      }

      // Buscar e criar todas as transações do grupo
      const localTransactions = transactionsStorage.find((t: TransactionRecord) => t.group_id === groupId);
      for (const transaction of localTransactions) {
        await syncCreate('transactions', {
          id: transaction.id,
          group_id: transaction.group_id,
          tipo: transaction.tipo,
          valor_total: transaction.valor_total,
          descricao: transaction.descricao,
          data: transaction.data,
          pagador_id: transaction.pagador_id,
          lastModified: transaction.lastModified,
          deleted: transaction.deleted || false
        });
        // Atualizar local para garantir campo deleted existe
        if (transaction.deleted === undefined) {
          transactionsStorage.update(transaction.id, { deleted: false });
        }
      }

      // Buscar e criar todos os splits das transações do grupo
      const transactionIds = localTransactions.map(t => t.id);
      const localSplits = splitsStorage.find((s: Split) => transactionIds.includes(s.transaction_id));
      for (const split of localSplits) {
        await syncCreate('splits', {
          id: split.id,
          transaction_id: split.transaction_id,
          devedor_id: split.devedor_id,
          valor_pago: split.valor_pago,
          valor_devido: split.valor_devido,
          lastModified: split.lastModified,
          deleted: split.deleted || false
        });
        // Atualizar local para garantir campo deleted existe
        if (split.deleted === undefined) {
          splitsStorage.update(split.id, { deleted: false });
        }
      }

      console.log('Group and all related data created on server:', groupId);
      return 'created';
    } catch (error) {
      console.error('Failed to ensure group exists on server:', error);
      return false;
    }
  }

  async pullRemoteData(): Promise<void> {
    try {
      const activeGroupId = getActiveGroupId();
      
      if (!activeGroupId) {
        console.log('No active group set, skipping pull');
        return;
      }

      // Pull apenas o grupo ativo
      const remoteGroups = await pullCollection<any>('groups', `id="${activeGroupId}"`);
      await this.mergeCollection('groups', remoteGroups, groupsStorage);

      // Pull apenas membros do grupo ativo (incluindo deletados para sincronizar estado)
      const remoteMembers = await pullCollection<any>('members', `group_id="${activeGroupId}"`);
      await this.mergeCollection('members', remoteMembers, membersStorage);

      // Pull apenas transações do grupo ativo (incluindo deletadas para sincronizar estado)
      const remoteTransactions = await pullCollection<any>('transactions', `group_id="${activeGroupId}"`);
      await this.mergeCollection('transactions', remoteTransactions, transactionsStorage);

      // Pull apenas splits das transações do grupo ativo (incluindo deletados para sincronizar estado)
      const remoteSplits = await pullCollection<any>('splits', `transaction_id.group_id="${activeGroupId}"`);
      await this.mergeCollection('splits', remoteSplits, splitsStorage);

      console.log('Remote data pulled successfully for group:', activeGroupId);
    } catch (error) {
      console.error('Failed to pull remote data:', error);
      throw error;
    }
  }

  private async mergeCollection<T extends { id: string; lastModified: number }>(
    _collectionName: string,
    remoteItems: T[],
    storage: any
  ): Promise<void> {
    const localItems = storage.all();

    remoteItems.forEach(remoteItem => {
      const localItem = localItems.find((item: T) => item.id === remoteItem.id);
      const remoteTimestamp = parseServerTimestamp((remoteItem as any).updated);
      const { updated, created, ...data } = remoteItem as any;

      if (!localItem) {
        // Item não existe localmente, criar (inclui deleted se vier do servidor)
        storage.create({ ...data, lastModified: remoteTimestamp });
      } else if (remoteTimestamp > localItem.lastModified) {
        // Item remoto é mais recente, atualizar local (last-write-wins)
        // Isso inclui aplicar deleted: true se vier do servidor
        storage.update(localItem.id, { ...data, lastModified: remoteTimestamp });
      }
      // Se local é mais recente ou igual, manter local
    });
  }

  async pullSpecificGroup(groupId: string): Promise<void> {
    try {
      console.log('Pulling specific group:', groupId);

      // Pull o grupo específico
      const remoteGroups = await pullCollection<any>('groups', `id="${groupId}"`);
      if (remoteGroups.length === 0) {
        throw new Error('Grupo não encontrado no servidor');
      }
      await this.mergeCollection('groups', remoteGroups, groupsStorage);

      // Pull membros do grupo (incluindo deletados para sincronizar estado)
      const remoteMembers = await pullCollection<any>('members', `group_id="${groupId}"`);
      await this.mergeCollection('members', remoteMembers, membersStorage);

      // Pull transações do grupo (incluindo deletadas para sincronizar estado)
      const remoteTransactions = await pullCollection<any>('transactions', `group_id="${groupId}"`);
      await this.mergeCollection('transactions', remoteTransactions, transactionsStorage);

      // Pull splits das transações (incluindo deletados para sincronizar estado)
      const remoteSplits = await pullCollection<any>('splits', `transaction_id.group_id="${groupId}"`);
      await this.mergeCollection('splits', remoteSplits, splitsStorage);

      console.log('Specific group imported successfully:', groupId);
    } catch (error) {
      console.error('Failed to pull specific group:', error);
      throw error;
    }
  }

  async fullSync(): Promise<void> {
    const activeGroupId = getActiveGroupId();
    
    // Se há grupo ativo, garantir que ele existe no servidor antes de qualquer operação
    if (activeGroupId) {
      try {
        const result = await this.ensureGroupExistsOnServer(activeGroupId);
        // Só limpar pending changes se o grupo foi CRIADO agora
        // Se já existia, não limpar - tem pending changes novas para processar
        if (result === 'created') {
          this.cleanupPendingChangesForGroup(activeGroupId);
        }
      } catch (error) {
        console.warn('Failed to ensure group exists on server:', error);
      }
    }

    // Primeiro pull dados remotos (se houver grupo ativo)
    try {
      await this.pullRemoteData();
    } catch (error) {
      console.warn('Pull skipped or failed:', error);
    }

    // Depois push mudanças locais (sempre tenta)
    await this.processPendingChanges();
  }

  /**
   * Remove pending changes que já foram sincronizadas manualmente
   * quando o grupo foi criado no servidor pela primeira vez
   */
  private cleanupPendingChangesForGroup(groupId: string): void {
    const changes = getPendingChanges();
    const transactionIds = transactionsStorage.find((t: TransactionRecord) => t.group_id === groupId).map(t => t.id);
    
    changes.forEach(change => {
      // Remove creates para o grupo, membros do grupo, transações do grupo e splits dessas transações
      if (change.operation === 'create') {
        if (change.collection === 'groups' && change.data.id === groupId) {
          removePendingChange(change.id);
        } else if (change.collection === 'members' && change.data.group_id === groupId) {
          removePendingChange(change.id);
        } else if (change.collection === 'transactions' && change.data.group_id === groupId) {
          removePendingChange(change.id);
        } else if (change.collection === 'splits' && transactionIds.includes(change.data.transaction_id)) {
          removePendingChange(change.id);
        }
      }
    });
  }

  getStatus() {
    const changes = getPendingChanges();
    const pendingCount = changes.filter(c => c.status === 'pending').length;
    const hasErrors = changes.some(c => c.status === 'error');

    return {
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncTime: this.lastSyncTime,
      hasErrors
    };
  }

  async cleanupOldErrors(): Promise<void> {
    const changes = getPendingChanges();
    const cutoff = Date.now() - CLEANUP_DAYS * 24 * 60 * 60 * 1000;

    changes.forEach(change => {
      if (change.status === 'error' && change.timestamp < cutoff) {
        removePendingChange(change.id);
      }
    });
  }
}

export const syncService = new SyncService();
