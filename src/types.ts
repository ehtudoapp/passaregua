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
}

export interface Member {
  id: UUID;
  group_id: UUID;
  nome: string;
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
}

export interface Split {
  id: UUID;
  transaction_id: UUID;
  devedor_id: UUID;
  valor_pago: Cents;
  valor_devido: Cents;
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
