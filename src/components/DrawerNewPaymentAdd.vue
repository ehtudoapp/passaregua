<script setup lang="ts">
import { ref, watch } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/solid';
import { useActiveGroup } from '../composables/useActiveGroup';
import { useCurrentUsername } from '../composables/useCurrentUsername';
import { getGroupMembers, createPaymentTransaction, createSplit } from '../lib/storage';
import Button from './Button.vue';
import Input from './Input.vue';
import Drawer from './Drawer.vue';

const props = defineProps<{
  modelValue: boolean;
  suggestedPayerId?: string;
  suggestedReceiverId?: string;
  suggestedAmount?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'payment-added': [];
}>();

const { activeGroupId } = useActiveGroup();
const { currentUserId } = useCurrentUsername();

// Form state
const formData = ref({
  data: new Date().toISOString().split('T')[0], // Default to today
  valor: '',
  pagador_id: '',
  recebedor_id: ''
});

// Errors
const errors = ref({
  data: '',
  valor: '',
  pagador_id: '',
  recebedor_id: ''
});

// Members list
const members = ref(activeGroupId.value ? getGroupMembers(activeGroupId.value) : []);

// Update members when group changes
watch(activeGroupId, (newGroupId) => {
  if (newGroupId) {
    members.value = getGroupMembers(newGroupId);
  } else {
    members.value = [];
  }
}, { immediate: true });

// Reset form when modal opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    resetForm();
    // Reload members when modal opens
    if (activeGroupId.value) {
      members.value = getGroupMembers(activeGroupId.value);
    }
    // Pre-fill if suggestion props provided
    if (props.suggestedPayerId) {
      formData.value.pagador_id = props.suggestedPayerId;
    }
    if (props.suggestedReceiverId) {
      formData.value.recebedor_id = props.suggestedReceiverId;
    }
    if (props.suggestedAmount !== undefined) {
      formData.value.valor = (props.suggestedAmount / 100).toFixed(2);
    }
  }
});

function resetForm() {
  formData.value = {
    data: new Date().toISOString().split('T')[0],
    valor: '',
    pagador_id: currentUserId.value || '',
    recebedor_id: ''
  };
  errors.value = {
    data: '',
    valor: '',
    pagador_id: '',
    recebedor_id: ''
  };
}

function validateForm(): boolean {
  errors.value = {
    data: '',
    valor: '',
    pagador_id: '',
    recebedor_id: ''
  };

  let isValid = true;

  if (!formData.value.data) {
    errors.value.data = 'Data é obrigatória';
    isValid = false;
  }

  const valor = Number(formData.value.valor);
  if (!formData.value.valor || valor <= 0) {
    errors.value.valor = 'Valor deve ser maior que 0';
    isValid = false;
  }

  if (!formData.value.pagador_id) {
    errors.value.pagador_id = 'Selecione quem pagou';
    isValid = false;
  }

  if (!formData.value.recebedor_id) {
    errors.value.recebedor_id = 'Selecione quem recebeu';
    isValid = false;
  }

  if (formData.value.pagador_id && formData.value.recebedor_id && 
      formData.value.pagador_id === formData.value.recebedor_id) {
    errors.value.recebedor_id = 'Pagador e recebedor devem ser diferentes';
    isValid = false;
  }

  return isValid;
}

function handleSubmit() {
  if (!validateForm() || !activeGroupId.value) {
    return;
  }

  // Convert valor to cents
  const valorTotal = Math.round(Number(formData.value.valor) * 100);

  // Convert date to ISO 8601 format
  const isoDate = new Date(formData.value.data).toISOString();

  // Get receiver name for description
  const receiver = members.value.find(m => m.id === formData.value.recebedor_id);
  const descricao = receiver ? `Pagamento para ${receiver.nome}` : 'Pagamento';

  // Create payment transaction with the correct type
  const transaction = createPaymentTransaction(
    activeGroupId.value,
    valorTotal,
    isoDate,
    formData.value.pagador_id,
    descricao
  );

  // Create split for the receiver
  createSplit(transaction.id, formData.value.recebedor_id, valorTotal);

  // Emit event to refresh balances
  emit('payment-added');

  // Close modal
  emit('update:modelValue', false);
}
</script>

<template>
  <Drawer :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" position="right" width-class="w-full max-w-xl">
    <template #header="{ close }">
      <div class="flex items-center justify-between px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Novo pagamento</h1>
        <Button variant="icon" @click="close">
          <XMarkIcon class="w-6 h-6" />
        </Button>
      </div>
    </template>

    <div class="px-6 py-4 space-y-6">
      <!-- Section 1: Data e Valor -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Detalhes do pagamento</h3>
        <div class="space-y-4">
          <!-- Data -->
          <Input
            v-model="formData.data"
            label="Data"
            type="date"
            :error="errors.data"
          />

          <!-- Valor -->
          <Input
            v-model="formData.valor"
            label="Valor"
            type="number"
            placeholder="36.50"
            step="0.01"
            min="0"
            :error="errors.valor"
          />
        </div>
      </div>

      <!-- Section 2: Pago por -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Pago por</h3>
        <div>
          <select
            v-model="formData.pagador_id"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            :class="{ 'border-rose-600': errors.pagador_id }"
          >
            <option value="">Selecione...</option>
            <option v-for="member in members" :key="member.id" :value="member.id">
              {{ member.nome }}
            </option>
          </select>
          <p v-if="errors.pagador_id" class="mt-1 text-sm text-rose-600">{{ errors.pagador_id }}</p>
        </div>
      </div>

      <!-- Section 3: Para -->
      <div class="pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Para</h3>
        <div>
          <select
            v-model="formData.recebedor_id"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            :class="{ 'border-rose-600': errors.recebedor_id }"
          >
            <option value="">Selecione...</option>
            <option v-for="member in members" :key="member.id" :value="member.id">
              {{ member.nome }}
            </option>
          </select>
          <p v-if="errors.recebedor_id" class="mt-1 text-sm text-rose-600">{{ errors.recebedor_id }}</p>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
        <Button variant="primary" class="w-full" @click="handleSubmit">
          Registrar pagamento
        </Button>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
:deep(.drawer-content) {
  max-height: 100vh;
  overflow-y: auto;
}
</style>
