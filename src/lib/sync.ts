import {
  getPendingChanges,
  updatePendingChange,
  removePendingChange,
  clearCompletedChanges
} from './localStorage';
import { syncCreate, syncUpdate, syncDelete, pullCollection, parseServerTimestamp } from './pocketbase';
import { groupsStorage, membersStorage, transactionsStorage, splitsStorage } from './storage';
import type { PendingChange } from '../types';

const MAX_RETRIES = 3;
const CLEANUP_DAYS = 7;

export class SyncService {
  private isSyncing = false;
  private lastSyncTime: number | null = null;

  async processPendingChanges(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    this.isSyncing = true;

    try {
      const changes = getPendingChanges().filter(c => c.status === 'pending' || c.status === 'error');

      // Agrupar por batchId
      const batches = this.groupByBatch(changes);

      // Processar cada batch
      for (const batch of batches) {
        await this.processBatch(batch);
      }

      // Limpar operações concluídas
      clearCompletedChanges();

      this.lastSyncTime = Date.now();
      console.log('Pending changes processed successfully');
    } catch (error) {
      console.error('Sync error:', error);
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
    // Marcar todos como processing
    batch.forEach(change => {
      updatePendingChange(change.id, {
        status: 'processing',
        lastAttempt: Date.now()
      });
    });

    try {
      // Processar cada operação do batch em sequência
      for (const change of batch) {
        await this.processChange(change);
      }

      // Se tudo deu certo, marcar todos como completed
      batch.forEach(change => {
        updatePendingChange(change.id, { status: 'completed' });
      });
    } catch (error) {
      // Se falhou, marcar todos como error e incrementar retry count
      batch.forEach(change => {
        const retryCount = (change.retryCount || 0) + 1;
        const status = retryCount >= MAX_RETRIES ? 'error' : 'pending';

        updatePendingChange(change.id, {
          status,
          retryCount,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });

      // Re-throw para que o batch seja considerado falho
      throw error;
    }
  }

  private async processChange(change: PendingChange): Promise<void> {
    const { operation, collection, data } = change;

    try {
      switch (operation) {
        case 'create':
          await syncCreate(collection, data);
          break;
        case 'update':
          await syncUpdate(collection, data.id, data);
          break;
        case 'delete':
          await syncDelete(collection, data.id);
          break;
      }
    } catch (error) {
      console.error(`Failed to sync ${operation} on ${collection}:`, error);
      throw error;
    }
  }

  async pullRemoteData(): Promise<void> {
    try {
      // Pull groups
      const remoteGroups = await pullCollection<any>('groups');
      await this.mergeCollection('groups', remoteGroups, groupsStorage);

      // Pull members
      const remoteMembers = await pullCollection<any>('members');
      await this.mergeCollection('members', remoteMembers, membersStorage);

      // Pull transactions
      const remoteTransactions = await pullCollection<any>('transactions');
      await this.mergeCollection('transactions', remoteTransactions, transactionsStorage);

      // Pull splits
      const remoteSplits = await pullCollection<any>('splits');
      await this.mergeCollection('splits', remoteSplits, splitsStorage);

      console.log('Remote data pulled successfully');
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

      if (!localItem) {
        // Item não existe localmente, criar
        const { updated, created, ...data } = remoteItem as any;
        storage.create({ ...data, lastModified: remoteTimestamp });
      } else if (remoteTimestamp > localItem.lastModified) {
        // Item remoto é mais recente, atualizar local (last-write-wins)
        const { updated, created, ...data } = remoteItem as any;
        storage.update(localItem.id, { ...data, lastModified: remoteTimestamp });
      }
      // Se local é mais recente ou igual, manter local
    });
  }

  async fullSync(): Promise<void> {
    // Primeiro pull dados remotos
    await this.pullRemoteData();

    // Depois push mudanças locais
    await this.processPendingChanges();
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
