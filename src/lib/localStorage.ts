import type { Identifiable, UUID, PendingChange } from '../types';
import { generateUUID } from './uuid';

function readRaw<T>(key: string): T[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(key);
  const items = raw ? (JSON.parse(raw) as T[]) : [];
  return ensureIds(key, items);
}

function writeRaw<T>(key: string, items: T[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(items));
}

function ensureIds<T>(key: string, items: T[]): T[] {
  let mutated = false;
  const withIds = items.map(item => {
    if ((item as any).id) return item;
    mutated = true;
    return { ...(item as object), id: makeId() } as T;
  });

  if (mutated) {
    writeRaw<T>(key, withIds);
  }

  return withIds;
}

function makeId(): UUID {
  return generateUUID();
}

export interface StorageAPI<T extends Identifiable> {
  all(): T[];
  get(id: UUID): T | undefined;
  create(item: Omit<T, 'id' | 'lastModified'> & Partial<Identifiable>): T;
  update(id: UUID, patch: Partial<T>): T | undefined;
  remove(id: UUID): boolean;
  clear(): void;
  find(fn: (item: T) => boolean): T[];
}

export function createStorage<T extends Identifiable>(namespace: string): StorageAPI<T> {
  const key = `pr:${namespace}`;

  return {
    all(): T[] {
      return readRaw<T>(key);
    },

    get(id: UUID): T | undefined {
      return readRaw<T>(key).find(i => i.id === id);
    },

    create(item: Omit<T, 'id' | 'lastModified'> & Partial<Identifiable>): T {
      const id = (item as any).id ?? makeId();
      const lastModified = Date.now();
      const newItem = { ...(item as any), id, lastModified } as T;
      const items = readRaw<T>(key);
      items.push(newItem);
      writeRaw<T>(key, items);
      return newItem;
    },

    update(id: UUID, patch: Partial<T>): T | undefined {
      const items = readRaw<T>(key);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return undefined;
      const lastModified = Date.now();
      items[idx] = { ...items[idx], ...patch, lastModified } as T;
      writeRaw<T>(key, items);
      return items[idx];
    },

    remove(id: UUID): boolean {
      const items = readRaw<T>(key);
      const filtered = items.filter(i => i.id !== id);
      if (filtered.length === items.length) return false;
      writeRaw<T>(key, filtered);
      return true;
    },

    clear(): void {
      writeRaw<T>(key, []);
    },

    find(fn: (item: T) => boolean): T[] {
      return readRaw<T>(key).filter(fn);
    }
  };
}

export default createStorage;

// Pending Changes Management
const PENDING_CHANGES_KEY = 'pr:pendingChanges';

export function getPendingChanges(): PendingChange[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(PENDING_CHANGES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addPendingChange(
  change: Omit<PendingChange, 'id' | 'timestamp' | 'status'>
): PendingChange {
  const newChange: PendingChange = {
    ...change,
    id: makeId(),
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0
  };

  const changes = getPendingChanges();
  changes.push(newChange);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
  }

  return newChange;
}

export function updatePendingChange(
  id: UUID,
  updates: Partial<PendingChange>
): void {
  const changes = getPendingChanges();
  const idx = changes.findIndex(c => c.id === id);

  if (idx !== -1) {
    changes[idx] = { ...changes[idx], ...updates };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
    }
  }
}

export function removePendingChange(id: UUID): void {
  const changes = getPendingChanges();
  const filtered = changes.filter(c => c.id !== id);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(filtered));
  }
}

export function clearCompletedChanges(): void {
  const changes = getPendingChanges();
  const pending = changes.filter(c => c.status !== 'completed');

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pending));
  }
}
