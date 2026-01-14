import { calculateBalances } from './src/algorithm.ts';

const expenses = [
  { payer: 'Alice', amount: 100 },
  { payer: 'Dave', amount: 50 }
];
const people = ['Alice', 'Bob', 'Carol'];

const balances = calculateBalances(expenses, people);
console.log('Balances:', JSON.stringify(balances, null, 2));
