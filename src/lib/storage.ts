import { createStorage, type StorageAPI } from './localStorage';
import type { Group, Member, UUID } from '../types';

// Storage instances
export const groupsStorage: StorageAPI<Group> = createStorage<Group>('groups');
export const membersStorage: StorageAPI<Member> = createStorage<Member>('members');

// Group utility functions
export function createGroup(data: { nome: string; members?: string[] }): Group {
  const group = groupsStorage.create({ nome: data.nome });
  
  // Add members if provided
  if (data.members && data.members.length > 0) {
    data.members.forEach(memberName => {
      if (memberName.trim()) {
        addMemberToGroup(group.id, memberName.trim());
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
  
  // Then remove the group
  return groupsStorage.remove(id);
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
