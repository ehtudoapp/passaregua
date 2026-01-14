<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Expense } from './types';
import { calculateBalances, calculateMinimumTransactions } from './algorithm';

// Estado da aplicação
const people = ref<string[]>([]);
const expenses = ref<Expense[]>([]);
const personName = ref('');
const selectedPayer = ref('');
const expenseAmount = ref<number | null>(null);
const showResults = ref(false);

// Computed
const balances = computed(() => calculateBalances(expenses.value, people.value));
const transactions = computed(() => calculateMinimumTransactions(balances.value));
const totalExpenses = computed(() => 
  expenses.value.reduce((sum, exp) => sum + exp.amount, 0)
);

// Métodos
function addPerson() {
  const name = personName.value.trim();
  
  if (name === '') {
    alert('Por favor, digite um nome');
    return;
  }
  
  if (people.value.includes(name)) {
    alert('Esta pessoa já foi adicionada');
    return;
  }
  
  people.value.push(name);
  personName.value = '';
  showResults.value = false;
}

function removePerson(index: number) {
  const personToRemove = people.value[index];
  
  // Verifica se há despesas dessa pessoa
  const hasExpenses = expenses.value.some(exp => exp.payer === personToRemove);
  if (hasExpenses) {
    if (!confirm(`${personToRemove} tem despesas registradas. Deseja remover mesmo assim? As despesas serão mantidas.`)) {
      return;
    }
  }
  
  people.value.splice(index, 1);
  showResults.value = false;
}

function addExpense() {
  if (selectedPayer.value === '') {
    alert('Por favor, selecione quem pagou');
    return;
  }
  
  if (expenseAmount.value === null || expenseAmount.value <= 0) {
    alert('Por favor, digite um valor válido');
    return;
  }
  
  expenses.value.push({
    payer: selectedPayer.value,
    amount: expenseAmount.value
  });
  
  expenseAmount.value = null;
  showResults.value = false;
}

function removeExpense(index: number) {
  expenses.value.splice(index, 1);
  showResults.value = false;
}

function calculateSettlement() {
  if (people.value.length === 0) {
    alert('Adicione pelo menos uma pessoa');
    return;
  }
  
  if (expenses.value.length === 0) {
    alert('Adicione pelo menos uma despesa');
    return;
  }
  
  showResults.value = true;
}

function getBalanceClass(balance: number): string {
  const EPSILON = 0.01;
  if (balance > EPSILON) return 'creditor';
  if (balance < -EPSILON) return 'debtor';
  return 'neutral';
}

function formatBalance(balance: number): string {
  const EPSILON = 0.01;
  if (balance > EPSILON) return `+R$ ${balance.toFixed(2)}`;
  if (balance < -EPSILON) return `R$ ${balance.toFixed(2)}`;
  return 'R$ 0.00';
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 py-8 px-4">
    <div class="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-2">Passaregua</h1>
      <p class="text-lg text-gray-600 mb-8">Divisão inteligente de despesas entre amigos</p>
      
      <!-- Adicionar Pessoa -->
      <div class="mb-8 pb-6 border-b border-gray-200">
        <h2 class="text-2xl font-semibold text-gray-700 mb-4">Adicionar Pessoa</h2>
        <div class="flex gap-3">
          <input
            v-model="personName"
            @keyup.enter="addPerson"
            type="text"
            placeholder="Nome da pessoa"
            class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition"
          />
          <button
            @click="addPerson"
            class="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition"
          >
            Adicionar
          </button>
        </div>
      </div>

      <!-- Lista de Pessoas -->
      <div class="mb-8 pb-6 border-b border-gray-200">
        <h2 class="text-2xl font-semibold text-gray-700 mb-4">Pessoas</h2>
        <div v-if="people.length === 0" class="text-gray-500 italic text-center py-8">
          Nenhuma pessoa adicionada ainda
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="(person, index) in people"
            :key="index"
            class="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg"
          >
            <span class="font-medium text-gray-800">{{ person }}</span>
            <button
              @click="removePerson(index)"
              class="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 transition"
            >
              Remover
            </button>
          </li>
        </ul>
      </div>

      <!-- Adicionar Despesa -->
      <div class="mb-8 pb-6 border-b border-gray-200">
        <h2 class="text-2xl font-semibold text-gray-700 mb-4">Adicionar Despesa</h2>
        <div class="flex gap-3">
          <select
            v-model="selectedPayer"
            class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition"
          >
            <option value="">Quem pagou?</option>
            <option v-for="person in people" :key="person" :value="person">
              {{ person }}
            </option>
          </select>
          <input
            v-model.number="expenseAmount"
            @keyup.enter="addExpense"
            type="number"
            placeholder="Valor"
            step="0.01"
            min="0"
            class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 transition"
          />
          <button
            @click="addExpense"
            class="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition"
          >
            Adicionar Despesa
          </button>
        </div>
      </div>

      <!-- Lista de Despesas -->
      <div class="mb-8 pb-6 border-b border-gray-200">
        <h2 class="text-2xl font-semibold text-gray-700 mb-4">Despesas</h2>
        <div v-if="expenses.length === 0" class="text-gray-500 italic text-center py-8">
          Nenhuma despesa adicionada ainda
        </div>
        <div v-else>
          <ul class="space-y-2 mb-4">
            <li
              v-for="(expense, index) in expenses"
              :key="index"
              class="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg"
            >
              <span class="font-medium text-gray-800">
                {{ expense.payer }} pagou R$ {{ expense.amount.toFixed(2) }}
              </span>
              <button
                @click="removeExpense(index)"
                class="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 transition"
              >
                Remover
              </button>
            </li>
          </ul>
          <p class="text-xl font-bold text-gray-800">
            Total: R$ {{ totalExpenses.toFixed(2) }}
          </p>
        </div>
      </div>

      <!-- Calcular Acerto -->
      <div class="mb-8">
        <button
          @click="calculateSettlement"
          class="w-full px-6 py-4 bg-purple-800 text-white text-lg font-bold rounded-lg hover:bg-purple-900 transition"
        >
          Calcular Acerto
        </button>
      </div>

      <!-- Resultados -->
      <div v-if="showResults">
        <!-- Saldos -->
        <div class="mb-6">
          <h3 class="text-xl font-semibold text-gray-700 mb-4">Saldos</h3>
          <div class="space-y-2">
            <div
              v-for="balance in balances"
              :key="balance.name"
              :class="[
                'px-4 py-3 rounded-lg font-medium',
                getBalanceClass(balance.balance) === 'creditor' && 'bg-green-100 text-green-800',
                getBalanceClass(balance.balance) === 'debtor' && 'bg-red-100 text-red-800',
                getBalanceClass(balance.balance) === 'neutral' && 'bg-gray-100 text-gray-600'
              ]"
            >
              {{ balance.name }}: {{ formatBalance(balance.balance) }}
            </div>
          </div>
        </div>

        <!-- Transações -->
        <div>
          <h3 class="text-xl font-semibold text-gray-700 mb-4">
            Transações ({{ transactions.length }})
          </h3>
          <div v-if="transactions.length === 0" class="bg-green-100 text-green-800 font-medium px-6 py-4 rounded-lg text-center">
            Nenhuma transação necessária! Todos já estão quites.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="(transaction, index) in transactions"
              :key="index"
              class="bg-blue-50 px-5 py-4 rounded-lg flex items-center gap-3"
            >
              <span class="font-bold text-blue-600 min-w-[30px]">{{ index + 1 }}.</span>
              <span class="font-medium text-red-600">{{ transaction.from }}</span>
              <span class="text-gray-600 text-xl">→</span>
              <span class="font-medium text-green-600">{{ transaction.to }}</span>
              <span class="ml-auto font-bold text-blue-600 bg-white px-3 py-1 rounded">
                R$ {{ transaction.amount.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

