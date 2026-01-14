import type { Balance, Expense, Transaction } from './types';
import { EPSILON } from './constants';

/**
 * Algoritmo de simplificação de dívidas
 * 
 * O algoritmo foca no saldo líquido: o total pago menos o total devido por cada um.
 * Primeiro, define-se quem é credor (+) e quem é devedor (-).
 * A simplificação ocorre ao cruzar o maior devedor com o maior credor,
 * realizando a maior transferência possível entre eles.
 * O ciclo se repete até zerar os saldos.
 * Isso garante o número mínimo de transações, evitando voltas desnecessárias
 * do dinheiro e facilitando o acerto entre amigos de forma inteligente e direta.
 */

/**
 * Calcula os saldos líquidos a partir das despesas
 * @param expenses - Array de despesas
 * @param people - Array de nomes das pessoas
 * @returns Array de saldos por pessoa
 */
export function calculateBalances(expenses: Expense[], people: string[]): Balance[] {
  // Inicializa os saldos
  const balances: Balance[] = people.map(name => ({
    name,
    balance: 0
  }));

  if (expenses.length === 0 || people.length === 0) {
    return balances;
  }

  // Filtra despesas de pessoas que não estão mais na lista
  const validExpenses = expenses.filter(exp => people.includes(exp.payer));

  // Calcula o total de despesas válidas
  const totalExpenses = validExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Calcula quanto cada pessoa deveria pagar (divisão igual)
  const perPersonShare = totalExpenses / people.length;

  // Calcula quanto cada pessoa pagou
  const paidByPerson: Record<string, number> = {};
  people.forEach(name => {
    paidByPerson[name] = 0;
  });

  validExpenses.forEach(exp => {
    paidByPerson[exp.payer] = (paidByPerson[exp.payer] || 0) + exp.amount;
  });

  // Calcula o saldo líquido de cada pessoa
  // Saldo = Quanto pagou - Quanto deveria pagar
  // Positivo = credor (pagou mais que deveria)
  // Negativo = devedor (pagou menos que deveria)
  balances.forEach(b => {
    b.balance = paidByPerson[b.name] - perPersonShare;
  });

  return balances;
}

/**
 * Calcula o acerto de contas com o mínimo de transações
 * @param balances - Array de saldos por pessoa
 * @returns Array de transações necessárias
 */
export function calculateMinimumTransactions(balances: Balance[]): Transaction[] {
  // Cria uma cópia dos saldos para manipulação
  const balancesCopy = balances.map(b => ({ ...b }));

  // Array para armazenar as transações
  const transactions: Transaction[] = [];

  // Continua até que todos os saldos sejam zero (ou muito próximos de zero)
  while (true) {
    // Encontra o maior devedor (saldo mais negativo)
    let maxDebtor: Balance | null = null;
    let maxDebtorIndex = -1;
    for (let i = 0; i < balancesCopy.length; i++) {
      if (balancesCopy[i].balance < -EPSILON) {
        if (maxDebtor === null || balancesCopy[i].balance < maxDebtor.balance) {
          maxDebtor = balancesCopy[i];
          maxDebtorIndex = i;
        }
      }
    }

    // Encontra o maior credor (saldo mais positivo)
    let maxCreditor: Balance | null = null;
    let maxCreditorIndex = -1;
    for (let i = 0; i < balancesCopy.length; i++) {
      if (balancesCopy[i].balance > EPSILON) {
        if (maxCreditor === null || balancesCopy[i].balance > maxCreditor.balance) {
          maxCreditor = balancesCopy[i];
          maxCreditorIndex = i;
        }
      }
    }

    // Se não há mais devedores ou credores, terminamos
    if (maxDebtor === null || maxCreditor === null) {
      break;
    }

    // Calcula a maior transferência possível entre eles
    const transferAmount = Math.min(
      Math.abs(maxDebtor.balance),
      maxCreditor.balance
    );

    // Registra a transação
    transactions.push({
      from: maxDebtor.name,
      to: maxCreditor.name,
      amount: transferAmount
    });

    // Atualiza os saldos
    balancesCopy[maxDebtorIndex].balance += transferAmount;
    balancesCopy[maxCreditorIndex].balance -= transferAmount;
  }

  return transactions;
}
