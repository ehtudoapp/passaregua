import PocketBase from 'pocketbase';
import type { UUID } from '../types';

const PB_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

console.log('🔌 PocketBase URL:', PB_URL);

export const pb = new PocketBase(PB_URL);

// Disable auto cancellation
pb.autoCancellation(false);

// Helper para sincronizar create
export async function syncCreate<T>(collection: string, data: T): Promise<T> {
  console.log(`🔄 Creating ${collection}:`, data);
  
  // Remover campos que o PocketBase gerencia automaticamente
  const cleanData = { ...data } as any;
  delete cleanData.lastModified; // PocketBase usa 'updated' automaticamente
  delete cleanData.created;
  delete cleanData.updated;
  
  try {
    const result = await pb.collection(collection).create(cleanData);
    console.log(`✅ Created ${collection}:`, result);
    return result as T;
  } catch (error) {
    console.error(`❌ Failed to create ${collection}:`, error);
    throw error;
  }
}

// Helper para sincronizar update
export async function syncUpdate<T>(
  collection: string,
  id: UUID,
  data: Partial<T>
): Promise<T> {
  console.log(`🔄 Updating ${collection}/${id}:`, data);
  
  // Remover campos que o PocketBase gerencia automaticamente
  const cleanData = { ...data } as any;
  delete cleanData.lastModified; // PocketBase usa 'updated' automaticamente
  delete cleanData.created;
  delete cleanData.updated;
  delete cleanData.id; // Não enviar ID no body
  
  try {
    const result = await pb.collection(collection).update(id, cleanData);
    console.log(`✅ Updated ${collection}/${id}:`, result);
    return result as T;
  } catch (error) {
    console.error(`❌ Failed to update ${collection}/${id}:`, error);
    throw error;
  }
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
