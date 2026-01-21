<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/solid';
import type { UUID, Member } from '../types';
import { useCurrentUsername } from '../composables/useCurrentUsername';
import { 
  divideEqually, 
  divideByPercentage, 
  divideByAmount, 
  divideByShares,
  type DivisionType,
  type DivisionResult
} from '../composables/useDivisions';
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
  'update:modelValue': [value: boolean];
  'expense-added': [];
}>();

const { currentUsername } = useCurrentUsername();

const divisionLabels: Record<DivisionType, string> = {
  equal: 'Igualmente',
  percentage: 'Percentagem',
  amount: 'Valor',
  shares: 'Partes'
};

const divisionUnits: Record<DivisionType, string> = {
  equal: '',
  percentage: '%',
  amount: 'R$',
  shares: 'partes'
};

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
  divisionDetails: ''
});

watch(() => modelValue, (isOpen) => {
  if (isOpen) resetForm();
});

watch(() => formData.value.divisionType, () => {
  formData.value.divisionDetails.clear();
  errors.value.divisionDetails = '';
});

const remainingPercentage = computed(() => {
  if (formData.value.divisionType !== 'percentage') return 0;
  const total = Array.from(formData.value.divisionDetails.values()).reduce((a, b) => a + b, 0);
  return Math.max(0, 100 - total);
});

const remainingAmount = computed(() => {
  if (formData.value.divisionType !== 'amount') return 0;
  const valorTotal = Number(formData.value.valor) || 0;
  const total = Array.from(formData.value.divisionDetails.values()).reduce((a, b) => a + b, 0);
  return Math.max(0, valorTotal - total);
});

const previewValues = computed(() => {
  const valor = Math.round(Number(formData.value.valor) * 100);
  if (!valor || formData.value.participantes_ids.length === 0) return new Map<UUID, string>();

  try {
    let results;
    
    if (formData.value.divisionType === 'equal') {
      results = divideEqually(valor, formData.value.participantes_ids);
    } else if (formData.value.divisionType === 'percentage') {
      const splits = formData.value.participantes_ids.map(id => ({
        memberId: id,
        percentage: formData.value.divisionDetails.get(id) || 0
      }));
      results = divideByPercentage(valor, splits);
    } else if (formData.value.divisionType === 'amount') {
      const splits = formData.value.participantes_ids.map(id => ({
        memberId: id,
        amount: Math.round((formData.value.divisionDetails.get(id) || 0) * 100)
      }));
      results = divideByAmount(splits);
    } else if (formData.value.divisionType === 'shares') {
      const splits = formData.value.participantes_ids.map(id => ({
        memberId: id,
        shares: formData.value.divisionDetails.get(id) || 1
      }));
      results = divideByShares(valor, splits);
    } else {
      return new Map<UUID, string>();
    }

    const preview = new Map<UUID, string>();
    results.forEach(result => {
      preview.set(result.memberId, (result.amount / 100).toFixed(2));
    });
    return preview;
  } catch {
    return new Map<UUID, string>();
  }
});

function validateForm(): boolean {
  errors.value = {
    descricao: '',
    valor: '',
    data: '',
    pagador_id: '',
    participantes_ids: '',
    divisionDetails: ''
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

  // Validar divisão com tolerância
  if (formData.value.divisionType === 'percentage') {
    const total = Array.from(formData.value.divisionDetails.values()).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 1) { // Tolerância de ±1%
      errors.value.divisionDetails = 'A soma dos percentuais deve ser próxima de 100%';
      isValid = false;
    }
  } else if (formData.value.divisionType === 'amount') {
    const valor = Math.round(Number(formData.value.valor) * 100);
    const total = Math.round(Array.from(formData.value.divisionDetails.values()).reduce((a, b) => a + b * 100, 0));
    if (Math.abs(total - valor) > 1) { // Tolerância de ±1 centavo
      errors.value.divisionDetails = 'A soma dos valores deve ser próxima do total';
      isValid = false;
    }
  } else if (formData.value.divisionType === 'shares') {
    const total = Array.from(formData.value.divisionDetails.values()).reduce((a, b) => a + b, 0);
    if (total <= 0) {
      errors.value.divisionDetails = 'O total de partes deve ser maior que 0';
      isValid = false;
    }
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
  let splits: DivisionResult[];
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

function resetForm() {
  const currentMember = members.find(m => m.nome === currentUsername.value);

  formData.value = {
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    pagador_id: currentMember?.id || '',
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
    divisionDetails: ''
  };
}

function toggleParticipant(memberId: UUID) {
  const index = formData.value.participantes_ids.indexOf(memberId);
  if (index > -1) {
    // Remover participante e seus valores
    formData.value.participantes_ids.splice(index, 1);
    formData.value.divisionDetails.delete(memberId);
  } else {
    // Adicionar participante
    formData.value.participantes_ids.push(memberId);
    
    // Inicializar valor padrão apenas se não existir
    if (!formData.value.divisionDetails.has(memberId)) {
      if (formData.value.divisionType === 'percentage') {
        formData.value.divisionDetails.set(memberId, 0);
      } else if (formData.value.divisionType === 'amount') {
        formData.value.divisionDetails.set(memberId, 0);
      } else if (formData.value.divisionType === 'shares') {
        formData.value.divisionDetails.set(memberId, 1);
      }
    }
  }
  
  if (formData.value.participantes_ids.length > 0) {
    errors.value.participantes_ids = '';
  }
}

function isParticipantSelected(memberId: UUID): boolean {
  return formData.value.participantes_ids.includes(memberId);
}

function getDivisionValue(memberId: UUID): number {
  return formData.value.divisionDetails.get(memberId) || 0;
}

function setDivisionValue(memberId: UUID, value: number) {
  // Validação para percentagem não ultrapassar 100%
  if (formData.value.divisionType === 'percentage') {
    const otherValuesSum = Array.from(formData.value.divisionDetails.entries())
      .filter(([id]) => id !== memberId)
      .reduce((sum, [, val]) => sum + val, 0);
    
    // Limita o valor para não ultrapassar 100%
    const maxAllowed = 100 - otherValuesSum;
    value = Math.min(value, maxAllowed);
  }
  
  // Validação para valor não ultrapassar o total
  if (formData.value.divisionType === 'amount') {
    const valorTotal = Number(formData.value.valor) || 0;
    const otherValuesSum = Array.from(formData.value.divisionDetails.entries())
      .filter(([id]) => id !== memberId)
      .reduce((sum, [, val]) => sum + val, 0);
    
    // Limita o valor para não ultrapassar o total
    const maxAllowed = valorTotal - otherValuesSum;
    value = Math.min(value, maxAllowed);
  }
  
  formData.value.divisionDetails.set(memberId, value);
  errors.value.divisionDetails = '';
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

      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Divisão</h3>
        <div>
          <select v-model="formData.divisionType" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="equal">{{ divisionLabels.equal }}</option>
            <option value="percentage">{{ divisionLabels.percentage }}</option>
            <option value="amount">{{ divisionLabels.amount }}</option>
            <option value="shares">{{ divisionLabels.shares }}</option>
          </select>
        </div>
      </div>

      <div class="pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Dividido por</h3>
        <p v-if="errors.participantes_ids" class="mb-3 text-sm text-rose-600">{{ errors.participantes_ids }}</p>
        <p v-if="errors.divisionDetails" class="mb-3 text-sm text-rose-600">{{ errors.divisionDetails }}</p>
        
        <!-- Indicador de saldo restante -->
        <div v-if="formData.divisionType === 'percentage' && formData.participantes_ids.length > 0" class="mb-3 p-2 bg-sky-50 border border-sky-200 rounded-md">
          <span class="text-sm text-sky-700">
            Restante: <strong>{{ remainingPercentage.toFixed(2) }}%</strong>
          </span>
        </div>
        <div v-if="formData.divisionType === 'amount' && formData.participantes_ids.length > 0" class="mb-3 p-2 bg-sky-50 border border-sky-200 rounded-md">
          <span class="text-sm text-sky-700">
            Restante: <strong>R$ {{ remainingAmount.toFixed(2) }}</strong>
          </span>
        </div>
        
        <div class="space-y-3">
          <div v-for="member in members" :key="member.id" class="border border-gray-300 rounded-md p-3 hover:bg-gray-50 transition" :class="{ 'border-emerald-500 bg-emerald-50': isParticipantSelected(member.id) }">
            <label class="flex items-center cursor-pointer">
              <input type="checkbox" :checked="isParticipantSelected(member.id)" @change="toggleParticipant(member.id)" class="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500 cursor-pointer" />
              <span class="ml-2 text-gray-900 font-medium flex-1">
                {{ member.nome }}
                <span v-if="isParticipantSelected(member.id) && previewValues.has(member.id)" class="text-gray-500 font-normal">
                  ({{ previewValues.get(member.id) }})
                </span>
              </span>
            </label>

            <!-- Inputs contextuais para divisões não-iguais -->
            <div v-if="isParticipantSelected(member.id) && formData.divisionType !== 'equal'" class="mt-2 ml-6 flex items-center gap-2">
              <input 
                v-if="formData.divisionType === 'percentage'"
                type="number"
                :value="getDivisionValue(member.id)"
                @input="setDivisionValue(member.id, Number(($event.target as HTMLInputElement).value))"
                placeholder="0"
                min="0"
                max="100"
                step="0.01"
                class="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input 
                v-else-if="formData.divisionType === 'amount'"
                type="number"
                :value="getDivisionValue(member.id)"
                @input="setDivisionValue(member.id, Number(($event.target as HTMLInputElement).value))"
                placeholder="0.00"
                min="0"
                step="0.01"
                class="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input 
                v-else-if="formData.divisionType === 'shares'"
                type="number"
                :value="getDivisionValue(member.id)"
                @input="setDivisionValue(member.id, Number(($event.target as HTMLInputElement).value))"
                placeholder="1"
                min="0.01"
                step="0.01"
                class="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span class="text-xs text-gray-500">{{ divisionUnits[formData.divisionType] }}</span>
            </div>
          </div>
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
