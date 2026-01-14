import type { Identifiable, UUID } from '../types';

function readRaw<T>(key: string): T[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

function writeRaw<T>(key: string, items: T[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(items));
}

function makeId(): UUID {
  try {
    // navigator/modern browsers
    // @ts-ignore
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch (e) {
    // ignore
  }
  // fallback simple UUID-like string
  return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export interface StorageAPI<T extends Identifiable> {
  all(): T[];
  get(id: UUID): T | undefined;
  create(item: Omit<T, 'id'> & Partial<Identifiable>): T;
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

    create(item: Omit<T, 'id'> & Partial<Identifiable>): T {
      const id = (item as any).id ?? makeId();
      const newItem = { ...(item as object), id } as T;
      const items = readRaw<T>(key);
      items.push(newItem);
      writeRaw<T>(key, items);
      return newItem;
    },

    update(id: UUID, patch: Partial<T>): T | undefined {
      const items = readRaw<T>(key);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) return undefined;
      items[idx] = { ...items[idx], ...patch } as T;
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
