import PocketBase from 'pocketbase';
import type { UUID } from '../types';

declare const __VITE_ENV__: any;
const PB_URL = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BACKEND_URL 
  ? (import.meta as any).env.VITE_BACKEND_URL 
  : 'http://localhost:8090';

export const pb = new PocketBase(PB_URL);

// Disable auto cancellation
pb.autoCancellation(false);

// Helper para sincronizar create
export async function syncCreate<T>(collection: string, data: T): Promise<T> {
  return await pb.collection(collection).create(data as any);
}

// Helper para sincronizar update
export async function syncUpdate<T>(
  collection: string,
  id: UUID,
  data: Partial<T>
): Promise<T> {
  return await pb.collection(collection).update(id, data);
}

// Helper para sincronizar delete
export async function syncDelete(collection: string, id: UUID): Promise<boolean> {
  await pb.collection(collection).delete(id);
  return true;
}

// Helper para pull de dados remotos
export async function pullCollection<T>(
  collection: string,
  filter?: string
): Promise<T[]> {
  const records = await pb.collection(collection).getFullList<T>({
    filter: filter || ''
  });
  return records;
}

// Helper para comparar timestamps (converte PocketBase updated para número)
export function parseServerTimestamp(updated: string): number {
  return new Date(updated).getTime();
}
