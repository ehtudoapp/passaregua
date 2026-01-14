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
