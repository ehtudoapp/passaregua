<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { XMarkIcon, TrashIcon } from '@heroicons/vue/24/solid';
import type { UUID, TransactionRecord, Split, Member } from '../types';
import { getTransaction, getTransactionSplits, getMember, removeTransaction } from '../lib/storage';
import { useSyncStatus } from '../composables/useSyncStatus';
import Drawer from './Drawer.vue';
import Button from './Button.vue';

interface Props {
  modelValue: boolean;
  transactionId: UUID | null;
  activeGroupId: UUID | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'transaction-deleted': [];
}>();

const transaction = ref<TransactionRecord | null>(null);
const splits = ref<Split[]>([]);
const payer = ref<Member | null>(null);
const { triggerSync } = useSyncStatus();

// Load transaction details when transactionId or drawer opens
watch(
  () => props.transactionId,
  (newTransactionId) => {
    if (newTransactionId) {
      transaction.value = getTransaction(newTransactionId) || null;
      if (transaction.value) {
        splits.value = getTransactionSplits(newTransactionId);
        payer.value = getMember(transaction.value.pagador_id) || null;
      }
    }
  },
  { immediate: true }
);

const formatCurrency = (cents: number): string => {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

const formatDate = (isoDate: string): string => {
  // Parse only the date part to avoid timezone issues
  // Handle both ISO format (YYYY-MM-DDTHH:MM:SS) and PocketBase format (YYYY-MM-DD HH:MM:SS)
  const datePart = isoDate.split('T')[0].split(' ')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

// Group details: payer first, then debtors sorted by value (descending)
const detailsOrdered = computed(() => {
  const details: Array<{
    member: Member | null;
    value: number;
    isPositive: boolean;
  }> = [];

  // Add payer (positive value)
  if (payer.value && transaction.value) {
    details.push({
      member: payer.value,
      value: transaction.value.valor_total,
      isPositive: true
    });
  }

  // Add debtors (negative values) sorted by amount descending
  const debtors = splits.value
    .map(split => ({
      member: getMember(split.devedor_id) || null,
      value: split.valor_devido,
      isPositive: false
    }))
    .sort((a, b) => b.value - a.value);

  details.push(...debtors);
  return details;
});

function handleClose() {
  emit('update:modelValue', false);
}

function handleDelete() {
  if (props.transactionId) {
    removeTransaction(props.transactionId);
    handleClose();
    triggerSync();
    emit('transaction-deleted');
  }
}
</script>

<template>
  <Drawer
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    position="right"
    width-class="w-full max-w-xl"
  >
    <template #header="{ close }">
      <div class="flex items-center justify-between px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Detalhes da Despesa</h1>
        <Button variant="icon" @click="close">
          <XMarkIcon class="w-6 h-6" />
        </Button>
      </div>
    </template>

    <div v-if="transaction" class="px-6 py-4 space-y-6">
      <!-- Transaction Header -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ transaction.descricao }}</h3>
        <p class="text-sm text-gray-500">{{ formatDate(transaction.data) }}</p>
      </div>

      <!-- Details Section -->
      <div class="border-b border-gray-200 pb-6 space-y-3">
        <div
          v-for="detail in detailsOrdered"
          :key="`${detail.member?.id || 'unknown'}`"
          class="flex items-center justify-between py-2"
        >
          <span class="text-gray-700">{{ detail.member?.nome || 'Desconhecido' }}</span>
          <span
            :class="[
              'font-semibold',
              detail.isPositive ? 'text-emerald-700' : 'text-red-600'
            ]"
          >
            {{ detail.isPositive ? '+' : '-' }}{{ formatCurrency(detail.value) }}
          </span>
        </div>
      </div>

      <!-- Delete Button -->
      <div class="sticky bottom-0 bg-white border-t border-gray-200">
        <Button
          variant="danger"
          class="w-full flex items-center justify-center gap-2 py-2"
          @click="handleDelete"
        >
          <TrashIcon class="w-5 h-5" />
          <span>Excluir Despesa</span>
        </Button>
      </div>
    </div>

    <div v-else class="px-6 py-6 text-center text-gray-500">
      Carregando detalhes da despesa...
    </div>
  </Drawer>
</template>

<style scoped>
:deep(.drawer-content) {
  max-height: 100vh;
  overflow-y: auto;
}
</style>
