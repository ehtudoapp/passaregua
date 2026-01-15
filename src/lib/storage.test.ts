import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  groupsStorage,
  membersStorage,
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  removeGroup,
  addMemberToGroup,
  getGroupMembers,
  removeMember,
  getGroupsWithMemberCount
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

    it('should remove a group and its members', () => {
      const group = createGroup({
        nome: 'Group to Delete',
        members: ['Alice', 'Bob']
      });
      
      expect(getGroupMembers(group.id)).toHaveLength(2);
      
      const removed = removeGroup(group.id);
      expect(removed).toBe(true);
      expect(getGroup(group.id)).toBeUndefined();
      expect(getGroupMembers(group.id)).toHaveLength(0);
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
});
