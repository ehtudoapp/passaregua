// Tipos existentes (mantidos para compatibilidade com a UI/algoritmo)
export interface Person {
  name: string;
}

export interface Expense {
  payer: string;
  amount: number;
}

export interface Balance {
  name: string;
  balance: number;
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

// Novos tipos de domínio (para armazenar no Local Storage / modelo de dados)
export type UUID = string;
export type ISODateString = string; // ex: 2026-01-14T12:34:56.789Z
export type Cents = number; // valores em centavos
export type ActiveGroupId = UUID | null;

export interface Group {
  id: UUID;
  nome: string;
  lastModified: number;
}

export interface Member {
  id: UUID;
  group_id: UUID;
  nome: string;
  lastModified: number;
  deleted?: boolean;
}

export type TransactionType = 'despesa' | 'pagamento';

export interface TransactionRecord {
  id: UUID;
  group_id: UUID;
  tipo: TransactionType;
  valor_total: Cents;
  descricao?: string;
  data: ISODateString; // ISO 8601 / RFC3339
  pagador_id: UUID;
  lastModified: number;
  deleted?: boolean;
}

export interface Split {
  id: UUID;
  transaction_id: UUID;
  devedor_id: UUID;
  valor_pago: Cents;
  valor_devido: Cents;
  lastModified: number;
  deleted?: boolean;
}

export interface Identifiable {
  id: UUID;
}

// Form data types
export interface ExpenseFormData {
  descricao: string;
  valor: number;
  data: string; // format: YYYY-MM-DD
  pagador_id: UUID;
  participantes_ids: UUID[]; // IDs de membros selecionados para divisão
}

// Sync and pending changes types
export type PendingOperationType = 'create' | 'update' | 'delete';
export type PendingStatus = 'pending' | 'processing' | 'completed' | 'error';
export type CollectionName = 'groups' | 'members' | 'transactions' | 'splits';

export interface PendingChange {
  id: UUID;
  timestamp: number;
  operation: PendingOperationType;
  collection: CollectionName;
  data: any;
  batchId?: UUID; // Para agrupar transaction + splits
  status: PendingStatus;
  retryCount?: number;
  error?: string;
  lastAttempt?: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
  hasErrors: boolean;
}
