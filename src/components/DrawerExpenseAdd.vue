<script setup lang="ts">
import { ref, watch } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/solid';
import type { UUID, Member } from '../types';
import { useCurrentUsername } from '../composables/useCurrentUsername';
import { 
  divideEqually, 
  divideByPercentage, 
  divideByAmount, 
  divideByShares,
  type DivisionType
} from '../composables/useDivisions';
import { createTransaction, createSplit } from '../lib/storage';
import Drawer from './Drawer.vue';
import Button from './Button.vue';
import Input from './Input.vue';
import DivisionSelector from './DivisionSelector.vue';

const { modelValue, members, activeGroupId } = defineProps<{
  modelValue: boolean;
  members: Member[];
  activeGroupId?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'expense-added': [];
}>();

const { currentUserId } = useCurrentUsername();

const formData = ref({
  descricao: '',
  valor: '',
  data: '',
  pagador_id: '',
  participantes_ids: [] as UUID[],
  divisionType: 'equal' as DivisionType,
  divisionDetails: new Map<UUID, number>()
});

const errors = ref({
  descricao: '',
  valor: '',
  data: '',
  pagador_id: '',
  participantes_ids: '',
  divisionError: ''
});

const divisionSelectorRef = ref<InstanceType<typeof DivisionSelector>>();

watch(() => modelValue, (isOpen) => {
  if (isOpen) resetForm();
});

function validateForm(): boolean {
  errors.value = {
    descricao: '',
    valor: '',
    data: '',
    pagador_id: '',
    participantes_ids: '',
    divisionError: ''
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

  // Validar divisão
  if (divisionSelectorRef.value && !divisionSelectorRef.value.validateDivision()) {
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

  // Calcular splits baseado no tipo de divisão
  let splits: ReturnType<typeof divideEqually>;
  if (formData.value.divisionType === 'equal') {
    splits = divideEqually(valorTotal, formData.value.participantes_ids);
  } else if (formData.value.divisionType === 'percentage') {
    const percentSplits = formData.value.participantes_ids.map(id => ({
      memberId: id,
      percentage: formData.value.divisionDetails.get(id) || 0
    }));
    splits = divideByPercentage(valorTotal, percentSplits);
  } else if (formData.value.divisionType === 'amount') {
    const amountSplits = formData.value.participantes_ids.map(id => ({
      memberId: id,
      amount: Math.round((formData.value.divisionDetails.get(id) || 0) * 100)
    }));
    splits = divideByAmount(amountSplits);
  } else if (formData.value.divisionType === 'shares') {
    const shareSplits = formData.value.participantes_ids.map(id => ({
      memberId: id,
      shares: formData.value.divisionDetails.get(id) || 1
    }));
    splits = divideByShares(valorTotal, shareSplits);
  } else {
    splits = [];
  }

  splits.forEach(split => {
    createSplit(transaction.id, split.memberId, split.amount);
  });

  emit('expense-added');
  emit('update:modelValue', false);
  resetForm();
}

function handleDivisionTypeUpdate(type: DivisionType) {
  formData.value.divisionType = type;
}

function handleDivisionDetailsUpdate(details: Map<UUID, number>) {
  formData.value.divisionDetails = details;
}

function handleParticipantesUpdate(ids: UUID[]) {
  formData.value.participantes_ids = ids;
  if (ids.length > 0) {
    errors.value.participantes_ids = '';
  }
}

function handleDivisionErrorUpdate(error: string) {
  errors.value.divisionError = error;
}

function resetForm() {
  formData.value = {
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    pagador_id: currentUserId.value || '',
    participantes_ids: [],
    divisionType: 'equal',
    divisionDetails: new Map()
  };

  errors.value = {
    descricao: '',
    valor: '',
    data: '',
    pagador_id: '',
    participantes_ids: '',
    divisionError: ''
  };
}
</script>

<template>
  <Drawer :modelValue="modelValue" position="right" width-class="w-full max-w-xl" @update:modelValue="(v) => emit('update:modelValue', v)">
    <template #header="{ close }">
      <div class="flex items-center justify-between px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Nova despesa</h1>
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

      <p v-if="errors.participantes_ids" class="mb-4 text-sm text-rose-600">{{ errors.participantes_ids }}</p>
      
      <DivisionSelector
        ref="divisionSelectorRef"
        :members="members"
        :valor="formData.valor"
        :division-type="formData.divisionType"
        :division-details="formData.divisionDetails"
        :participantes-ids="formData.participantes_ids"
        :division-error="errors.divisionError"
        @update:division-type="handleDivisionTypeUpdate"
        @update:division-details="handleDivisionDetailsUpdate"
        @update:participantes-ids="handleParticipantesUpdate"
        @update:division-error="handleDivisionErrorUpdate"
      />

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
