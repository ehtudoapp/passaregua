<script setup lang="ts">
import { ref } from 'vue';
import { UserGroupIcon, BanknotesIcon } from '@heroicons/vue/24/solid';
import { useActiveGroup } from '../composables/useActiveGroup';
import { useBalances } from '../composables/useBalances';
import AppHeader from '../components/AppHeader.vue';
import AppNavbar from '../components/AppNavbar.vue';
import Button from '../components/Button.vue';
import DrawerNewPaymentAdd from '../components/DrawerNewPaymentAdd.vue';

// Composables
const { activeGroupId } = useActiveGroup();
const { balances, suggestedTransactions, totalExpenses, refresh } = useBalances();

// Modal state
const paymentModalOpen = ref(false);

// Format currency from cents to BRL
function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Get balance display with sign
function formatBalance(cents: number): string {
  if (cents > 0) {
    return `+${formatCurrency(cents)}`;
  } else if (cents < 0) {
    return formatCurrency(cents);
  } else {
    return formatCurrency(0);
  }
}

// Get balance color class
function getBalanceClass(cents: number): string {
  if (cents > 1) return 'text-emerald-700 bg-emerald-50'; // creditor
  if (cents < -1) return 'text-rose-700 bg-rose-50'; // debtor
  return 'text-gray-600 bg-gray-100'; // neutral
}

function handlePaymentAdded() {
  refresh();
}

function openPaymentModal() {
  paymentModalOpen.value = true;
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <AppHeader :showActiveGroup="true"/>

    <!-- Main Content -->
    <main class="flex-1 px-4 py-6 pb-24">
      <div class="max-w-xl mx-auto">
        <!-- No Active Group Message -->
        <div v-if="!activeGroupId" class="text-center py-12 text-gray-500">
          <UserGroupIcon class="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p class="text-lg">Nenhum grupo ativo</p>
          <p class="text-sm mt-2">Acesse a aba "Grupos" para ativar um grupo</p>
        </div>

        <!-- Balances Content -->
        <template v-else>
          <!-- Totais Section -->
          <div class="mb-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Totais</h2>
            <div v-if="balances.length === 0" class="text-center py-8 text-gray-500">
              <p>Nenhum membro neste grupo</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="balance in balances" :key="balance.memberId" :class="[
                'px-4 py-3 rounded-lg font-medium text-sm flex justify-between items-center',
                getBalanceClass(balance.balance)
              ]">
                <span>{{ balance.memberName }}</span>
                <span class="font-bold">{{ formatBalance(balance.balance) }}</span>
              </div>
            </div>
          </div>

          <!-- Transações Sugeridas Section -->
          <div class="mb-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Transações sugeridas</h2>
            <div v-if="suggestedTransactions.length === 0"
              class="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-4 rounded-lg text-center text-sm">
              <p class="font-medium">✓ Tudo acertado!</p>
              <p class="text-xs mt-1">Nenhuma transação necessária</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="(transaction, index) in suggestedTransactions" :key="index"
                class="bg-sky-50 border border-sky-200 px-4 py-3 rounded-lg text-sm">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-gray-900">{{ transaction.from }}</span>
                    <span class="text-gray-500">paga</span>
                    <span class="font-bold text-sky-700">{{ formatCurrency(transaction.amount) }}</span>
                    <span class="text-gray-500">para</span>
                    <span class="font-semibold text-gray-900">{{ transaction.to }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Gasto Section -->
          <div class="mb-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Total gasto pelo grupo</h2>
            <div class="bg-emerald-50 border border-emerald-200 px-4 py-4 rounded-lg">
              <p class="text-2xl font-bold text-emerald-900 text-center">
                {{ formatCurrency(totalExpenses) }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </main>

    <!-- FAB Button -->
    <div v-if="activeGroupId" class="fixed bottom-24 left-0 right-0 z-40 flex justify-end pointer-events-none">
      <div class="max-w-4xl mx-auto w-full px-6 pointer-events-auto flex justify-end">
        <Button variant="primary"
          class="rounded-full px-6 py-3 flex items-center justify-center gap-2 shadow-lg text-white font-medium"
          @click="openPaymentModal">
          <BanknotesIcon class="w-5 h-5" />
          <span>Realizar pagamento</span>
        </Button>
      </div>
    </div>

    <!-- Bottom Navigation -->
    <AppNavbar />

    <!-- Payment Drawer -->
    <DrawerNewPaymentAdd v-if="activeGroupId" v-model="paymentModalOpen" @payment-added="handlePaymentAdded" />
  </div>
</template>
