<script setup lang="ts">
import { ref, watch } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/solid';
import type { UUID, Member } from '../types';
import { useCurrentUsername } from '../composables/useCurrentUsername';
import { createTransaction, createSplit } from '../lib/storage';
import Drawer from './Drawer.vue';
import Button from './Button.vue';
import Input from './Input.vue';

const { modelValue, members, activeGroupId } = defineProps<{
  modelValue: boolean;
  members: Member[];
  activeGroupId?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': (value: boolean) => void;
  'expense-added': () => void;
}>();

const { currentUsername } = useCurrentUsername();

const formData = ref({
  descricao: '',
  valor: '',
  data: '',
  pagador_id: '',
  participantes_ids: [] as UUID[]
});

const errors = ref({
  descricao: '',
  valor: '',
  data: '',
  pagador_id: '',
  participantes_ids: ''
});

watch(() => modelValue, (isOpen) => {
  if (isOpen) resetForm();
});

function validateForm(): boolean {
  errors.value = {
    descricao: '',
    valor: '',
    data: '',
    pagador_id: '',
    participantes_ids: ''
  };

  let isValid = true;

  if (!formData.value.descricao.trim()) {
    errors.value.descricao = 'Descrição é obrigatória';
    isValid = false;
  }

  if (!formData.value.valor || Number(formData.value.valor) <= 0) {
    errors.value.valor = 'Valor deve ser maior que 0';
    isValid = false;
  }

  if (!formData.value.data) {
    errors.value.data = 'Data é obrigatória';
    isValid = false;
  }

  if (!formData.value.pagador_id) {
    errors.value.pagador_id = 'Selecione quem pagou';
    isValid = false;
  }

  if (formData.value.participantes_ids.length === 0) {
    errors.value.participantes_ids = 'Selecione pelo menos um participante';
    isValid = false;
  }

  return isValid;
}

function handleAddExpense() {
  if (!validateForm() || !activeGroupId) {
    return;
  }

  const valorTotal = Math.round(Number(formData.value.valor) * 100);
  const isoDate = new Date(formData.value.data).toISOString();

  const transaction = createTransaction(
    activeGroupId,
    formData.value.descricao,
    valorTotal,
    isoDate,
    formData.value.pagador_id
  );

  const valorPorPessoa = Math.round(valorTotal / formData.value.participantes_ids.length);

  formData.value.participantes_ids.forEach((participantId) => {
    createSplit(transaction.id, participantId, valorPorPessoa);
  });

  emit('expense-added');
  emit('update:modelValue', false);
  resetForm();
}

function resetForm() {
  const currentMember = members.find(m => m.nome === currentUsername.value);

  formData.value = {
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    pagador_id: currentMember?.id || '',
    participantes_ids: []
  };

  errors.value = {
    descricao: '',
    valor: '',
    data: '',
    pagador_id: '',
    participantes_ids: ''
  };
}

function toggleParticipant(memberId: UUID) {
  const index = formData.value.participantes_ids.indexOf(memberId);
  if (index > -1) {
    formData.value.participantes_ids.splice(index, 1);
  } else {
    formData.value.participantes_ids.push(memberId);
  }
  if (formData.value.participantes_ids.length > 0) {
    errors.value.participantes_ids = '';
  }
}

function isParticipantSelected(memberId: UUID): boolean {
  return formData.value.participantes_ids.includes(memberId);
}
</script>

<template>
  <Drawer :modelValue="modelValue" position="right" width-class="w-full max-w-xl" @update:modelValue="(v) => emit('update:modelValue', v)">
    <template #header="{ close }">
      <div class="flex items-center justify-between px-6 py-4">
        <h2 class="text-xl font-semibold text-gray-900">Nova despesa</h2>
        <Button variant="icon" @click="close">
          <XMarkIcon class="w-6 h-6" />
        </Button>
      </div>
    </template>

    <div class="px-6 py-4 space-y-6">
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Detalhes da despesa</h3>
        <div class="space-y-4">
          <Input v-model="formData.data" label="Data" type="date" :error="errors.data" />
          <Input v-model="formData.descricao" label="Descrição" placeholder="Descrição da despesa" :error="errors.descricao" />
          <Input v-model="formData.valor" label="Valor" type="number" placeholder="36.00" step="0.01" min="0" :error="errors.valor" />
        </div>
      </div>

      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Quem pagou</h3>
        <div>
          <select v-model="formData.pagador_id" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" :class="{ 'border-rose-600': errors.pagador_id }">
            <option value="">Selecione...</option>
            <option v-for="member in members" :key="member.id" :value="member.id">{{ member.nome }}</option>
          </select>
          <p v-if="errors.pagador_id" class="mt-1 text-sm text-rose-600">{{ errors.pagador_id }}</p>
        </div>
      </div>

      <div class="pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Dividido por</h3>
        <p v-if="errors.participantes_ids" class="mb-3 text-sm text-rose-600">{{ errors.participantes_ids }}</p>
        <div class="space-y-2">
          <label v-for="member in members" :key="member.id" class="flex items-center p-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition" :class="{ 'border-emerald-500 bg-emerald-50': isParticipantSelected(member.id) }">
            <input type="checkbox" :checked="isParticipantSelected(member.id)" @change="toggleParticipant(member.id)" class="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500 cursor-pointer" />
            <span class="ml-2 text-gray-900">{{ member.nome }}</span>
          </label>
        </div>
      </div>

      <div class="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
        <Button variant="primary" class="w-full" @click="handleAddExpense">Adicionar despesa</Button>
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
