import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  groupsStorage,
  membersStorage,
  transactionsStorage,
  splitsStorage,
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  removeGroup,
  addMemberToGroup,
  getGroupMembers,
  removeMember,
  getMember,
  getGroupsWithMemberCount,
  getActiveGroupId,
  setActiveGroupId,
  updateGroupName,
  createTransaction,
  createSplit,
  removeTransaction,
  getTransactionSplits,
  getTransaction
} from './storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('Storage', () => {
  beforeEach(() => {
    // Clear localStorage mock and storage before each test
    localStorageMock.clear();
    groupsStorage.clear();
    membersStorage.clear();
    transactionsStorage.clear();
    splitsStorage.clear();
  });

  describe('Group operations', () => {
    it('should create a group', () => {
      const group = createGroup({ nome: 'Test Group' });
      
      expect(group.id).toBeDefined();
      expect(group.nome).toBe('Test Group');
    });

    it('should create a group with members', () => {
      const group = createGroup({
        nome: 'Team',
        members: ['Alice', 'Bob', 'Carol']
      });
      
      const members = getGroupMembers(group.id);
      expect(members).toHaveLength(3);
      expect(members.map(m => m.nome)).toEqual(['Alice', 'Bob', 'Carol']);
    });

    it('should set the first created group as active', () => {
      expect(getActiveGroupId()).toBeNull();
      
      const group = createGroup({ nome: 'First Group' });
      
      expect(getActiveGroupId()).toBe(group.id);
    });

    it('should not change active group when creating additional groups', () => {
      const group1 = createGroup({ nome: 'First Group' });
      expect(getActiveGroupId()).toBe(group1.id);
      
      createGroup({ nome: 'Second Group' });
      expect(getActiveGroupId()).toBe(group1.id);
    });

    it('should get all groups', () => {
      createGroup({ nome: 'Group 1' });
      createGroup({ nome: 'Group 2' });
      
      const groups = getGroups();
      expect(groups).toHaveLength(2);
    });

    it('should get a specific group by id', () => {
      const group = createGroup({ nome: 'My Group' });
      const retrieved = getGroup(group.id);
      
      expect(retrieved).toEqual(group);
    });

    it('should update a group', () => {
      const group = createGroup({ nome: 'Old Name' });
      const updated = updateGroup(group.id, { nome: 'New Name' });
      
      expect(updated?.nome).toBe('New Name');
      expect(updated?.id).toBe(group.id);
    });

    it('should remove a group locally (hard delete, no sync)', () => {
      const group = createGroup({
        nome: 'Test Group',
        members: ['Alice', 'Bob']
      });
      
      expect(getGroupMembers(group.id)).toHaveLength(2);
      const membersBefore = membersStorage.all().length;
      
      const removed = removeGroup(group.id);
      expect(removed).toBe(true);
      expect(getGroup(group.id)).toBeUndefined();
      
      // Hard delete local: members são removidos em cascata
      expect(membersStorage.all().length).toBe(membersBefore - 2);
    });

    it('should return false when removing non-existent group', () => {
      const removed = removeGroup('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('Member operations', () => {
    it('should add a member to a group', () => {
      const group = createGroup({ nome: 'Team' });
      const member = addMemberToGroup(group.id, 'Alice');
      
      expect(member.id).toBeDefined();
      expect(member.nome).toBe('Alice');
      expect(member.group_id).toBe(group.id);
    });

    it('should get all members of a group', () => {
      const group = createGroup({ nome: 'Team' });
      addMemberToGroup(group.id, 'Alice');
      addMemberToGroup(group.id, 'Bob');
      
      const members = getGroupMembers(group.id);
      expect(members).toHaveLength(2);
    });

    it('should remove a member', () => {
      const group = createGroup({ nome: 'Team' });
      const member = addMemberToGroup(group.id, 'Alice');
      
      const removed = removeMember(member.id);
      expect(removed).toBe(true);
      expect(getGroupMembers(group.id)).toHaveLength(0);
    });

    it('should filter members by group', () => {
      const group1 = createGroup({ nome: 'Group 1' });
      const group2 = createGroup({ nome: 'Group 2' });
      
      addMemberToGroup(group1.id, 'Alice');
      addMemberToGroup(group1.id, 'Bob');
      addMemberToGroup(group2.id, 'Carol');
      
      expect(getGroupMembers(group1.id)).toHaveLength(2);
      expect(getGroupMembers(group2.id)).toHaveLength(1);
    });

    it('should backfill ids for members missing id', () => {
      const group = createGroup({ nome: 'Team' });

      // Simulate legacy records without ids
      localStorage.setItem('pr:members', JSON.stringify([
        { group_id: group.id, nome: 'Alice' }
      ]));

      const members = getGroupMembers(group.id);

      expect(members).toHaveLength(1);
      expect(members[0].id).toBeDefined();

      const persisted = JSON.parse(localStorage.getItem('pr:members') || '[]');
      expect(persisted[0].id).toBe(members[0].id);
    });
  });

  describe('getGroupsWithMemberCount', () => {
    it('should return groups with member counts', () => {
      const group1 = createGroup({
        nome: 'Team A',
        members: ['Alice', 'Bob']
      });
      const group2 = createGroup({
        nome: 'Team B',
        members: ['Carol']
      });
      createGroup({ nome: 'Empty Team' });
      
      const groupsWithCount = getGroupsWithMemberCount();
      
      expect(groupsWithCount).toHaveLength(3);
      expect(groupsWithCount[0]).toMatchObject({
        id: group1.id,
        nome: 'Team A',
        memberCount: 2
      });
      expect(groupsWithCount[1]).toMatchObject({
        id: group2.id,
        nome: 'Team B',
        memberCount: 1
      });
      expect(groupsWithCount[2].memberCount).toBe(0);
    });
  });

  describe('Active group operations', () => {
    it('should get null when no active group is set', () => {
      const activeId = getActiveGroupId();
      expect(activeId).toBeNull();
    });

    it('should set and get active group', () => {
      const group = createGroup({ nome: 'Active Group' });
      setActiveGroupId(group.id);
      
      const activeId = getActiveGroupId();
      expect(activeId).toBe(group.id);
    });

    it('should set active group to null', () => {
      const group = createGroup({ nome: 'Group' });
      setActiveGroupId(group.id);
      setActiveGroupId(null);
      
      const activeId = getActiveGroupId();
      expect(activeId).toBeNull();
    });

    it('should throw error when setting non-existent group as active', () => {
      expect(() => {
        setActiveGroupId('non-existent-id' as any);
      }).toThrow();
    });

    it('should activate next group when removing active group', () => {
      const group1 = createGroup({ nome: 'Group 1' });
      const group2 = createGroup({ nome: 'Group 2' });
      
      setActiveGroupId(group1.id);
      removeGroup(group1.id);
      
      const activeId = getActiveGroupId();
      expect(activeId).toBe(group2.id);
    });

    it('should set active group to null when removing only group', () => {
      const group = createGroup({ nome: 'Only Group' });
      setActiveGroupId(group.id);
      removeGroup(group.id);
      
      const activeId = getActiveGroupId();
      expect(activeId).toBeNull();
    });
  });

  describe('Update group name', () => {
    it('should update group name', () => {
      const group = createGroup({ nome: 'Old Name' });
      const updated = updateGroupName(group.id, 'New Name');
      
      expect(updated?.nome).toBe('New Name');
    });

    it('should trim whitespace from group name', () => {
      const group = createGroup({ nome: 'Original' });
      const updated = updateGroupName(group.id, '  Trimmed Name  ');
      
      expect(updated?.nome).toBe('Trimmed Name');
    });

    it('should throw error when updating to empty name', () => {
      const group = createGroup({ nome: 'Group' });
      
      expect(() => {
        updateGroupName(group.id, '   ');
      }).toThrow('Nome do grupo não pode ser vazio');
    });

    it('should throw error when updating to empty string', () => {
      const group = createGroup({ nome: 'Group' });
      
      expect(() => {
        updateGroupName(group.id, '');
      }).toThrow('Nome do grupo não pode ser vazio');
    });
  });

  describe('Transaction operations', () => {
    it('should soft delete a transaction', () => {
      const group = createGroup({ nome: 'Test Group' });
      const member = addMemberToGroup(group.id, 'Alice');
      const transaction = createTransaction(
        group.id,
        'Test Expense',
        1000,
        '2024-01-01T00:00:00.000Z',
        member.id
      );

      const removed = removeTransaction(transaction.id);
      expect(removed).toBe(true);
      
      // Transação não aparece mais nas queries filtradas
      const groupTransactions = transactionsStorage.find(t => t.group_id === group.id && !t.deleted);
      expect(groupTransactions).toHaveLength(0);
      
      // Mas ainda existe no storage com deleted: true
      const deletedTransaction = transactionsStorage.get(transaction.id);
      expect(deletedTransaction).toBeDefined();
      expect(deletedTransaction?.deleted).toBe(true);
    });

    it('should remove all splits associated with a transaction', () => {
      const group = createGroup({ nome: 'Test Group' });
      const member1 = addMemberToGroup(group.id, 'Alice');
      const member2 = addMemberToGroup(group.id, 'Bob');
      const transaction = createTransaction(
        group.id,
        'Test Expense',
        1000,
        '2024-01-01T00:00:00.000Z',
        member1.id
      );

      // Create splits for the transaction
      createSplit(transaction.id, member1.id, 500);
      createSplit(transaction.id, member2.id, 500);

      // Verify splits exist
      expect(getTransactionSplits(transaction.id)).toHaveLength(2);

      // Remove transaction
      removeTransaction(transaction.id);

      // Verify splits are removed
      expect(getTransactionSplits(transaction.id)).toHaveLength(0);
    });

    it('should return false when removing non-existent transaction', () => {
      const removed = removeTransaction('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('Soft delete operations', () => {
    it('should soft delete member (mark as deleted)', () => {
      const group = createGroup({ nome: 'Test Group', members: [] });
      const member = addMemberToGroup(group.id, 'John');
      
      // Verificar que membro existe
      expect(getGroupMembers(group.id)).toHaveLength(1);
      
      // Deletar membro
      removeMember(member.id);
      
      // Membro não deve aparecer na lista (filtrado)
      expect(getGroupMembers(group.id)).toHaveLength(0);
      
      // Mas deve existir no storage com deleted: true
      const allMembers = membersStorage.all();
      const deletedMember = allMembers.find(m => m.id === member.id);
      expect(deletedMember).toBeDefined();
      expect(deletedMember?.deleted).toBe(true);
      expect(deletedMember?.lastModified).toBeGreaterThanOrEqual(member.lastModified);
    });

    it('should soft delete transaction and its splits', () => {
      const group = createGroup({ nome: 'Test Group', members: ['Alice', 'Bob'] });
      const members = getGroupMembers(group.id);
      const transaction = createTransaction(
        group.id,
        'Pizza',
        2000,
        new Date().toISOString(),
        members[0].id
      );
      createSplit(transaction.id, members[0].id, 1000);
      createSplit(transaction.id, members[1].id, 1000);
      
      // Verificar que transação e splits existem
      expect(getTransaction(transaction.id)).toBeDefined();
      expect(getTransactionSplits(transaction.id)).toHaveLength(2);
      
      // Deletar transação
      removeTransaction(transaction.id);
      
      // Transação e splits não devem aparecer nas consultas
      const groupTransactions = transactionsStorage.find(t => t.group_id === group.id && !t.deleted);
      expect(groupTransactions).toHaveLength(0);
      expect(getTransactionSplits(transaction.id)).toHaveLength(0);
      
      // Mas devem existir no storage com deleted: true
      const allTransactions = transactionsStorage.all();
      const deletedTransaction = allTransactions.find(t => t.id === transaction.id);
      expect(deletedTransaction).toBeDefined();
      expect(deletedTransaction?.deleted).toBe(true);
      
      const allSplits = splitsStorage.all();
      const deletedSplits = allSplits.filter(s => s.transaction_id === transaction.id);
      expect(deletedSplits).toHaveLength(2);
      deletedSplits.forEach(split => {
        expect(split.deleted).toBe(true);
      });
    });

    it('should preserve lastModified from remote when merging', () => {
      const group = createGroup({ nome: 'Test Group', members: [] });
      const member = addMemberToGroup(group.id, 'Alice');
      
      const originalLastModified = member.lastModified;
      
      // Simular update do servidor com timestamp mais recente
      const remoteTimestamp = originalLastModified + 10000;
      membersStorage.update(member.id, {
        nome: 'Alice Updated',
        lastModified: remoteTimestamp
      });
      
      const updated = getMember(member.id);
      expect(updated?.nome).toBe('Alice Updated');
      expect(updated?.lastModified).toBe(remoteTimestamp);
    });

    it('should not filter deleted items in storage.all()', () => {
      const group = createGroup({ nome: 'Test Group', members: ['Alice', 'Bob'] });
      const members = getGroupMembers(group.id);
      
      // Deletar um membro
      removeMember(members[0].id);
      
      // storage.all() deve retornar todos incluindo deletados
      expect(membersStorage.all()).toHaveLength(2);
      
      // getGroupMembers deve filtrar deletados
      expect(getGroupMembers(group.id)).toHaveLength(1);
    });
  });
});
