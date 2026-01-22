import { createStorage, type StorageAPI, addPendingChange } from './localStorage';
import type { Group, Member, UUID, ActiveGroupId, TransactionRecord, Split, Cents } from '../types';
import { generateUUID } from './uuid';

// Storage instances
export const groupsStorage: StorageAPI<Group> = createStorage<Group>('groups');
export const membersStorage: StorageAPI<Member> = createStorage<Member>('members');
export const transactionsStorage: StorageAPI<TransactionRecord> = createStorage<TransactionRecord>('transactions');
export const splitsStorage: StorageAPI<Split> = createStorage<Split>('splits');

// Active group storage
const ACTIVE_GROUP_KEY = 'pr:activeGroupId';
const CURRENT_USERNAME_KEY = 'pr:currentUsername';

function getStorage(): Storage | null {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return (globalThis as any).localStorage;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

function getActiveGroupStorage(): string | null {
  try {
    const storage = getStorage();
    if (storage) {
      return storage.getItem(ACTIVE_GROUP_KEY);
    }
  } catch (e) {
    // Handle cases where localStorage might not be available
  }
  return null;
}

function setActiveGroupStorage(groupId: ActiveGroupId): void {
  try {
    const storage = getStorage();
    if (storage) {
      if (groupId === null) {
        storage.removeItem(ACTIVE_GROUP_KEY);
      } else {
        storage.setItem(ACTIVE_GROUP_KEY, groupId);
      }
    }
  } catch (e) {
    // Handle cases where localStorage might not be available
  }
}

// Group utility functions
export function createGroup(data: { nome: string; members?: string[] }): Group {
  const group = groupsStorage.create({ nome: data.nome });
  
  // Enfileira operação de criação do grupo
  addPendingChange({
    operation: 'create',
    collection: 'groups',
    data: group
  });
  
  // Add members if provided
  if (data.members && data.members.length > 0) {
    data.members.forEach(memberName => {
      const trimmedName = memberName.trim();
      if (trimmedName) {
        addMemberToGroup(group.id, trimmedName);
      }
    });
  }
  
  return group;
}

export function getGroups(): Group[] {
  return groupsStorage.all();
}

export function getGroup(id: UUID): Group | undefined {
  return groupsStorage.get(id);
}

export function updateGroup(id: UUID, patch: Partial<Group>): Group | undefined {
  return groupsStorage.update(id, patch);
}

export function removeGroup(id: UUID): boolean {
  // Get group before removing
  const group = getGroup(id);
  
  // Remove all members of the group first
  const members = getGroupMembers(id);
  members.forEach(member => {
    membersStorage.remove(member.id);
    // Enfileira deleção de cada membro
    addPendingChange({
      operation: 'delete',
      collection: 'members',
      data: member
    });
  });
  
  // If this is the active group, update active group reference
  const activeGroupId = getActiveGroupStorage();
  if (activeGroupId === id) {
    const remainingGroups = getGroups().filter(g => g.id !== id);
    if (remainingGroups.length > 0) {
      setActiveGroupStorage(remainingGroups[0].id);
    } else {
      setActiveGroupStorage(null);
    }
  }
  
  // Then remove the group
  const removed = groupsStorage.remove(id);
  
  // Enfileira deleção do grupo
  if (removed && group) {
    addPendingChange({
      operation: 'delete',
      collection: 'groups',
      data: group
    });
  }
  
  return removed;
}

export function updateGroupName(id: UUID, newName: string): Group | undefined {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw new Error('Nome do grupo não pode ser vazio');
  }
  const updated = updateGroup(id, { nome: trimmedName });
  
  // Enfileira operação de atualização
  if (updated) {
    addPendingChange({
      operation: 'update',
      collection: 'groups',
      data: updated
    });
  }
  
  return updated;
}

export function getActiveGroupId(): ActiveGroupId {
  return getActiveGroupStorage();
}

export function setActiveGroupId(groupId: ActiveGroupId): void {
  if (groupId !== null) {
    // Verify group exists
    const group = getGroup(groupId);
    if (!group) {
      throw new Error(`Grupo com ID ${groupId} não encontrado`);
    }
  }
  setActiveGroupStorage(groupId);
}

// Member utility functions
export function addMemberToGroup(groupId: UUID, memberName: string): Member {
  const member = membersStorage.create({
    group_id: groupId,
    nome: memberName
  });
  
  // Enfileira operação de criação do membro
  addPendingChange({
    operation: 'create',
    collection: 'members',
    data: member
  });
  
  return member;
}

export function getGroupMembers(groupId: UUID): Member[] {
  return membersStorage.find(member => member.group_id === groupId);
}

export function removeMember(memberId: UUID): boolean {
  const member = getMember(memberId);
  const removed = membersStorage.remove(memberId);
  
  // Enfileira operação de deleção
  if (removed && member) {
    addPendingChange({
      operation: 'delete',
      collection: 'members',
      data: member
    });
  }
  
  return removed;
}

export function getMember(id: UUID): Member | undefined {
  return membersStorage.get(id);
}

export function updateMember(id: UUID, patch: Partial<Member>): Member | undefined {
  const updated = membersStorage.update(id, patch);
  
  // Enfileira operação de atualização
  if (updated) {
    addPendingChange({
      operation: 'update',
      collection: 'members',
      data: updated
    });
  }
  
  return updated;
}

// Helper to get group with member count
export interface GroupWithCount extends Group {
  memberCount: number;
}

export function getGroupsWithMemberCount(): GroupWithCount[] {
  const groups = getGroups();
  return groups.map(group => ({
    ...group,
    memberCount: getGroupMembers(group.id).length
  }));
}

// Current user storage
export function getCurrentUsername(): string | null {
  try {
    const storage = getStorage();
    if (storage) {
      return storage.getItem(CURRENT_USERNAME_KEY);
    }
  } catch (e) {
    // Handle cases where localStorage might not be available
  }
  return null;
}

export function setCurrentUsername(username: string | null): void {
  try {
    const storage = getStorage();
    if (storage) {
      if (username === null || username.trim() === '') {
        storage.removeItem(CURRENT_USERNAME_KEY);
      } else {
        storage.setItem(CURRENT_USERNAME_KEY, username.trim());
      }
    }
  } catch (e) {
    // Handle cases where localStorage might not be available
  }
}

export function getCurrentUserId(): string | null {
  try {
    const storage = getStorage();
    if (storage) {
      return storage.getItem('pr:currentUserId');
    }
  } catch (e) {
    // Handle cases where localStorage might not be available
  }
  return null;
}

export function setCurrentUserId(userId: string | null): void {
  try {
    const storage = getStorage();
    if (storage) {
      if (userId === null || userId.trim() === '') {
        storage.removeItem('pr:currentUserId');
      } else {
        storage.setItem('pr:currentUserId', userId.trim());
      }
    }
  } catch (e) {
    // Handle cases where localStorage might not be available
  }
}

// Transaction utility functions
export function createTransaction(
  groupId: UUID,
  descricao: string,
  valorTotal: Cents,
  data: string, // ISO 8601 format
  pagadorId: UUID,
  batchId?: UUID
): TransactionRecord {
  const transaction = transactionsStorage.create({
    group_id: groupId,
    tipo: 'despesa',
    descricao,
    valor_total: valorTotal,
    data,
    pagador_id: pagadorId
  });

  // Adicionar à fila de pending changes
  addPendingChange({
    operation: 'create',
    collection: 'transactions',
    data: transaction,
    batchId
  });

  return transaction;
}

export function createPaymentTransaction(
  groupId: UUID,
  valorTotal: Cents,
  data: string, // ISO 8601 format
  pagadorId: UUID,
  descricao: string = 'Pagamento',
  batchId?: UUID
): TransactionRecord {
  const transaction = transactionsStorage.create({
    group_id: groupId,
    tipo: 'pagamento',
    descricao,
    valor_total: valorTotal,
    data,
    pagador_id: pagadorId
  });

  // Adicionar à fila de pending changes
  addPendingChange({
    operation: 'create',
    collection: 'transactions',
    data: transaction,
    batchId
  });

  return transaction;
}

export function getGroupTransactions(groupId: UUID): TransactionRecord[] {
  return transactionsStorage.find(transaction => transaction.group_id === groupId);
}

export function getTransaction(id: UUID): TransactionRecord | undefined {
  return transactionsStorage.get(id);
}

export function removeTransaction(id: UUID): boolean {
  // Get transaction before removing
  const transaction = getTransaction(id);
  
  // Remove all splits associated with this transaction
  const splits = getTransactionSplits(id);
  splits.forEach(split => {
    splitsStorage.remove(split.id);
    // Enfileira deleção de cada split
    addPendingChange({
      operation: 'delete',
      collection: 'splits',
      data: split
    });
  });
  
  const removed = transactionsStorage.remove(id);
  
  // Enfileira deleção da transaction
  if (removed && transaction) {
    addPendingChange({
      operation: 'delete',
      collection: 'transactions',
      data: transaction
    });
  }
  
  return removed;
}

// Split utility functions
export function createSplit(
  transactionId: UUID,
  devedorId: UUID,
  valorDue: Cents,
  batchId?: UUID
): Split {
  const split = splitsStorage.create({
    transaction_id: transactionId,
    devedor_id: devedorId,
    valor_pago: 0,
    valor_devido: valorDue
  });

  // Adicionar à fila de pending changes
  addPendingChange({
    operation: 'create',
    collection: 'splits',
    data: split,
    batchId
  });

  return split;
}

export function getTransactionSplits(transactionId: UUID): Split[] {
  return splitsStorage.find(split => split.transaction_id === transactionId);
}

export function getSplit(id: UUID): Split | undefined {
  return splitsStorage.get(id);
}

export function updateSplit(id: UUID, patch: Partial<Split>): Split | undefined {
  const updated = splitsStorage.update(id, patch);
  
  // Enfileira operação de atualização
  if (updated) {
    addPendingChange({
      operation: 'update',
      collection: 'splits',
      data: updated
    });
  }
  
  return updated;
}

export function removeSplit(id: UUID): boolean {
  const split = getSplit(id);
  const removed = splitsStorage.remove(id);
  
  // Enfileira operação de deleção
  if (removed && split) {
    addPendingChange({
      operation: 'delete',
      collection: 'splits',
      data: split
    });
  }
  
  return removed;
}

// Batch atomic operations for transaction + splits
export interface SplitAmount {
  memberId: UUID;
  amount: Cents;
}

export function createTransactionWithSplits(
  groupId: UUID,
  descricao: string,
  valorTotal: Cents,
  data: string,
  pagadorId: UUID,
  splits: SplitAmount[]
): { transaction: TransactionRecord; splits: Split[] } {
  const batchId = generateUUID(); // ID único para o batch

  const transaction = createTransaction(groupId, descricao, valorTotal, data, pagadorId, batchId);

  const createdSplits = splits.map(split =>
    createSplit(transaction.id, split.memberId, split.amount, batchId)
  );

  return { transaction, splits: createdSplits };
}
