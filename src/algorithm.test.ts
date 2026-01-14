import { describe, it, expect } from 'vitest';
import { calculateBalances, calculateMinimumTransactions } from './algorithm';
import type { Expense } from './types';

describe('calculateBalances', () => {
  it('deve calcular saldos corretamente com despesas iguais', () => {
    const expenses: Expense[] = [
      { payer: 'Alice', amount: 100 },
      { payer: 'Bob', amount: 100 }
    ];
    const people = ['Alice', 'Bob'];

    const balances = calculateBalances(expenses, people);

    expect(balances).toHaveLength(2);
    expect(balances[0]).toEqual({ name: 'Alice', balance: 0 });
    expect(balances[1]).toEqual({ name: 'Bob', balance: 0 });
  });

  it('deve calcular saldos corretamente com despesas diferentes', () => {
    const expenses: Expense[] = [
      { payer: 'Alice', amount: 150 },
      { payer: 'Bob', amount: 90 }
    ];
    const people = ['Alice', 'Bob', 'Carol'];

    const balances = calculateBalances(expenses, people);

    expect(balances).toHaveLength(3);
    expect(balances[0]).toEqual({ name: 'Alice', balance: 70 }); // 150 - 80 = 70
    expect(balances[1]).toEqual({ name: 'Bob', balance: 10 }); // 90 - 80 = 10
    expect(balances[2]).toEqual({ name: 'Carol', balance: -80 }); // 0 - 80 = -80
  });

  it('deve retornar saldos zerados quando não há despesas', () => {
    const expenses: Expense[] = [];
    const people = ['Alice', 'Bob'];

    const balances = calculateBalances(expenses, people);

    expect(balances).toHaveLength(2);
    expect(balances[0]).toEqual({ name: 'Alice', balance: 0 });
    expect(balances[1]).toEqual({ name: 'Bob', balance: 0 });
  });

  it('deve retornar array vazio quando não há pessoas', () => {
    const expenses: Expense[] = [{ payer: 'Alice', amount: 100 }];
    const people: string[] = [];

    const balances = calculateBalances(expenses, people);

    expect(balances).toHaveLength(0);
  });

  it('deve ignorar despesas de pessoas que não estão na lista', () => {
    const expenses: Expense[] = [
      { payer: 'Alice', amount: 100 },
      { payer: 'Dave', amount: 50 } // Dave não está na lista de pessoas
    ];
    const people = ['Alice', 'Bob', 'Carol'];

    const balances = calculateBalances(expenses, people);

    // Total considerado deve ser apenas 100 (de Alice, Dave é ignorado)
    // Cada pessoa deveria pagar 100/3 = 33.33
    expect(balances).toHaveLength(3);
    expect(Math.abs(balances[0].balance - 66.67)).toBeLessThan(0.01); // 100 - 33.33 ≈ 66.67
    expect(Math.abs(balances[1].balance - (-33.33))).toBeLessThan(0.01); // 0 - 33.33 ≈ -33.33
    expect(Math.abs(balances[2].balance - (-33.33))).toBeLessThan(0.01); // 0 - 33.33 ≈ -33.33
  });
});

describe('calculateMinimumTransactions', () => {
  it('deve retornar transações vazias quando saldos estão zerados', () => {
    const balances = [
      { name: 'Alice', balance: 0 },
      { name: 'Bob', balance: 0 }
    ];

    const transactions = calculateMinimumTransactions(balances);

    expect(transactions).toHaveLength(0);
  });

  it('deve calcular transação única quando há um devedor e um credor', () => {
    const balances = [
      { name: 'Alice', balance: 50 },
      { name: 'Bob', balance: -50 }
    ];

    const transactions = calculateMinimumTransactions(balances);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual({
      from: 'Bob',
      to: 'Alice',
      amount: 50
    });
  });

  it('deve calcular número mínimo de transações para múltiplas pessoas', () => {
    const balances = [
      { name: 'Alice', balance: 70 },
      { name: 'Bob', balance: 10 },
      { name: 'Carol', balance: -80 }
    ];

    const transactions = calculateMinimumTransactions(balances);

    // Deve ter 2 transações (Carol paga para Alice e Bob)
    expect(transactions).toHaveLength(2);
    
    // Verifica se as transações estão corretas
    expect(transactions[0]).toEqual({
      from: 'Carol',
      to: 'Alice',
      amount: 70
    });
    expect(transactions[1]).toEqual({
      from: 'Carol',
      to: 'Bob',
      amount: 10
    });
  });

  it('deve minimizar transações em cenário complexo', () => {
    const balances = [
      { name: 'Alice', balance: 100 },
      { name: 'Bob', balance: -50 },
      { name: 'Carol', balance: -30 },
      { name: 'Dave', balance: -20 }
    ];

    const transactions = calculateMinimumTransactions(balances);

    // Com 1 credor e 3 devedores, devemos ter 3 transações
    expect(transactions).toHaveLength(3);
    
    // Verifica que a soma das transações está correta
    const totalTransferred = transactions.reduce((sum, t) => sum + t.amount, 0);
    expect(totalTransferred).toBe(100);
  });

  it('deve lidar com múltiplos credores e devedores', () => {
    const balances = [
      { name: 'Alice', balance: 50 },
      { name: 'Bob', balance: 30 },
      { name: 'Carol', balance: -40 },
      { name: 'Dave', balance: -40 }
    ];

    const transactions = calculateMinimumTransactions(balances);

    // Com 2 credores e 2 devedores, devemos ter no máximo 3 transações
    // (o algoritmo greedy garante o mínimo)
    expect(transactions.length).toBeLessThanOrEqual(3);
    
    // Verifica que a soma total é zero
    const totalCredits = transactions.reduce((sum, t) => sum + t.amount, 0);
    const expectedTotal = balances
      .filter(b => b.balance > 0)
      .reduce((sum, b) => sum + b.balance, 0);
    expect(totalCredits).toBe(expectedTotal);
  });

  it('deve lidar com valores decimais', () => {
    const balances = [
      { name: 'Alice', balance: 33.33 },
      { name: 'Bob', balance: -16.67 },
      { name: 'Carol', balance: -16.66 }
    ];

    const transactions = calculateMinimumTransactions(balances);

    // Deve ter 2 transações
    expect(transactions).toHaveLength(2);
    
    // Verifica que os valores estão corretos (com tolerância para ponto flutuante)
    const totalTransferred = transactions.reduce((sum, t) => sum + t.amount, 0);
    expect(Math.abs(totalTransferred - 33.33)).toBeLessThan(0.02);
  });
});
