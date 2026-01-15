import { createStorage, type StorageAPI } from './localStorage';
import type { Group, Member, UUID, ActiveGroupId } from '../types';

// Storage instances
export const groupsStorage: StorageAPI<Group> = createStorage<Group>('groups');
export const membersStorage: StorageAPI<Member> = createStorage<Member>('members');

// Active group storage
const ACTIVE_GROUP_KEY = 'pr:activeGroupId';

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
  // Remove all members of the group first
  const members = getGroupMembers(id);
  members.forEach(member => membersStorage.remove(member.id));
  
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
  return groupsStorage.remove(id);
}

export function updateGroupName(id: UUID, newName: string): Group | undefined {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw new Error('Nome do grupo não pode ser vazio');
  }
  return updateGroup(id, { nome: trimmedName });
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
  return membersStorage.create({
    group_id: groupId,
    nome: memberName
  });
}

export function getGroupMembers(groupId: UUID): Member[] {
  return membersStorage.find(member => member.group_id === groupId);
}

export function removeMember(memberId: UUID): boolean {
  return membersStorage.remove(memberId);
}

export function getMember(id: UUID): Member | undefined {
  return membersStorage.get(id);
}

export function updateMember(id: UUID, patch: Partial<Member>): Member | undefined {
  return membersStorage.update(id, patch);
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
