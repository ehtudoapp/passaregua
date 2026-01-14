<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Expense } from './types';
import { calculateBalances, calculateMinimumTransactions } from './algorithm';
import { EPSILON } from './constants';
import { 
  Bars3Icon, 
  BanknotesIcon, 
  Cog6ToothIcon, 
  UserGroupIcon 
} from '@heroicons/vue/24/solid';

// Estado da aplicação
const people = ref<string[]>([]);
const expenses = ref<Expense[]>([]);
const personName = ref('');
const selectedPayer = ref('');
const expenseAmount = ref<number | null>(null);
const showResults = ref(false);
const activeNav = ref<'home' | 'transactions' | 'settings' | 'members'>('home');

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
    if (!confirm(`${personToRemove} tem despesas registradas. Remover esta pessoa também removerá suas despesas. Deseja continuar?`)) {
      return;
    }
    // Remove todas as despesas da pessoa
    expenses.value = expenses.value.filter(exp => exp.payer !== personToRemove);
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
  if (balance > EPSILON) return 'creditor';
  if (balance < -EPSILON) return 'debtor';
  return 'neutral';
}

function formatBalance(balance: number): string {
  if (balance > EPSILON) return `+R$ ${balance.toFixed(2)}`;
  if (balance < -EPSILON) return `R$ ${balance.toFixed(2)}`;
  return 'R$ 0.00';
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- Navbar Top -->
    <nav class="bg-emerald-700 text-white sticky top-0 z-50">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <h1 class="text-2xl font-bold">Passa a régua</h1>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 px-4 py-6 pb-24">
      <div class="max-w-xl mx-auto">
      
      <!-- Adicionar Pessoa -->
      <div class="mb-6 pb-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Adicionar Pessoa</h2>
        <div class="flex gap-2">
          <input
            v-model="personName"
            @keyup.enter="addPerson"
            type="text"
            placeholder="Nome da pessoa"
            class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm"
          />
          <button
            @click="addPerson"
            class="px-4 py-2 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition text-sm"
          >
            Adicionar
          </button>
        </div>
      </div>

      <!-- Lista de Pessoas -->
      <div class="mb-6 pb-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Pessoas</h2>
        <div v-if="people.length === 0" class="text-gray-500 italic text-center py-6">
          Nenhuma pessoa adicionada
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="(person, index) in people"
            :key="index"
            class="flex justify-between items-center bg-white px-4 py-3 rounded-lg border border-gray-200"
          >
            <span class="font-medium text-gray-900 text-sm">{{ person }}</span>
            <button
              @click="removePerson(index)"
              class="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 transition"
            >
              Remover
            </button>
          </li>
        </ul>
      </div>

      <!-- Adicionar Despesa -->
      <div class="mb-6 pb-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Adicionar Despesa</h2>
        <div class="space-y-3">
          <select
            v-model="selectedPayer"
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm"
          >
            <option value="">Quem pagou?</option>
            <option v-for="person in people" :key="person" :value="person">
              {{ person }}
            </option>
          </select>
          <div class="flex gap-2">
            <input
              v-model.number="expenseAmount"
              @keyup.enter="addExpense"
              type="number"
              placeholder="Valor"
              step="0.01"
              min="0"
              class="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm"
            />
            <button
              @click="addExpense"
              class="px-4 py-2 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition text-sm"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de Despesas -->
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Despesas</h2>
        <div v-if="expenses.length === 0" class="text-gray-500 italic text-center py-6">
          Nenhuma despesa adicionada
        </div>
        <div v-else>
          <ul class="space-y-2 mb-4">
            <li
              v-for="(expense, index) in expenses"
              :key="index"
              class="flex justify-between items-center bg-white px-4 py-3 rounded-lg border border-gray-200 text-sm"
            >
              <span class="font-medium text-gray-900">
                {{ expense.payer }} - R$ {{ expense.amount.toFixed(2) }}
              </span>
              <button
                @click="removeExpense(index)"
                class="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 transition"
              >
                Remover
              </button>
            </li>
          </ul>
          <div class="bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-200">
            <p class="text-lg font-bold text-emerald-900">
              Total: R$ {{ totalExpenses.toFixed(2) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Calcular Acerto -->
      <div class="mb-6">
        <button
          @click="calculateSettlement"
          class="w-full px-4 py-3 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 transition"
        >
          Calcular Acerto
        </button>
      </div>

      <!-- Resultados -->
      <div v-if="showResults" class="mb-20">
        <!-- Saldos -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Saldos</h3>
          <div class="space-y-2">
            <div
              v-for="balance in balances"
              :key="balance.name"
              :class="[
                'px-4 py-3 rounded-lg font-medium text-sm',
                getBalanceClass(balance.balance) === 'creditor' && 'bg-emerald-100 text-emerald-900',
                getBalanceClass(balance.balance) === 'debtor' && 'bg-red-100 text-red-900',
                getBalanceClass(balance.balance) === 'neutral' && 'bg-gray-100 text-gray-600'
              ]"
            >
              {{ balance.name }}: {{ formatBalance(balance.balance) }}
            </div>
          </div>
        </div>

        <!-- Transações -->
        <div>
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Transações ({{ transactions.length }})
          </h3>
          <div v-if="transactions.length === 0" class="bg-emerald-100 text-emerald-900 font-medium px-4 py-4 rounded-lg text-center text-sm">
            Nenhuma transação necessária! Todos já estão quites.
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(transaction, index) in transactions"
              :key="index"
              class="bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 text-sm"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="font-bold text-blue-700">{{ index + 1 }}.</span>
                <span class="font-semibold text-gray-900">{{ transaction.from }}</span>
                <span class="text-gray-500">→</span>
                <span class="font-semibold text-gray-900">{{ transaction.to }}</span>
              </div>
              <div class="text-right font-bold text-blue-700">
                R$ {{ transaction.amount.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>

    <!-- Navbar Bottom (Mobile) -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div class="flex justify-around max-w-4xl mx-auto">
        <button
          @click="activeNav = 'home'"
          :class="[
            'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
            activeNav === 'home' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          <Bars3Icon class="w-6 h-6" />
          <p class="text-xs">Despesas</p>
        </button>
        <button
          @click="activeNav = 'transactions'"
          :class="[
            'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
            activeNav === 'transactions' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          <BanknotesIcon class="w-6 h-6" />
          <p class="text-xs">Saldos</p>
        </button>
        <button
          @click="activeNav = 'settings'"
          :class="[
            'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
            activeNav === 'settings' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          <Cog6ToothIcon class="w-6 h-6" />
          <p class="text-xs">Config</p>
        </button>
        <button
          @click="activeNav = 'members'"
          :class="[
            'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
            activeNav === 'members' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          <UserGroupIcon class="w-6 h-6" />
          <p class="text-xs">Grupos</p>
        </button>
      </div>
    </nav>
  </div>
</template>

