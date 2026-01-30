<script setup lang="ts">
import { watch, computed } from 'vue';
import type { UUID, Member } from '../types';
import { 
  divideEqually, 
  divideByPercentage, 
  divideByAmount, 
  divideByShares,
  type DivisionType
} from '../composables/useDivisions';

interface Props {
  members: Member[];
  valor: string;
  divisionType: DivisionType;
  divisionDetails: Map<UUID, number>;
  participantesIds: UUID[];
  divisionError: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:divisionType': [value: DivisionType];
  'update:divisionDetails': [value: Map<UUID, number>];
  'update:participantesIds': [value: UUID[]];
  'update:divisionError': [value: string];
}>();

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

watch(() => props.divisionType, (newType) => {
  const newDetails = new Map<UUID, number>();
  
  // Quando mudar o tipo de divisão, distribuir igualmente pelos participantes selecionados
  if (props.participantesIds.length > 0) {
    if (newType === 'percentage') {
      // Dividir 100% igualmente
      const equalPercentage = 100 / props.participantesIds.length;
      props.participantesIds.forEach(id => {
        newDetails.set(id, equalPercentage);
      });
    } else if (newType === 'amount') {
      // Dividir o valor total igualmente, garantindo que a soma seja exata
      const valorTotal = Number(props.valor) || 0;
      const baseAmount = Math.floor((valorTotal * 100) / props.participantesIds.length) / 100;
      let distributed = 0;
      
      props.participantesIds.forEach((id, index) => {
        if (index === props.participantesIds.length - 1) {
          // Último participante recebe o que sobrou para garantir soma exata
          newDetails.set(id, valorTotal - distributed);
        } else {
          newDetails.set(id, baseAmount);
          distributed += baseAmount;
        }
      });
    } else if (newType === 'shares') {
      // Dividir com 1 parte para cada participante
      props.participantesIds.forEach(id => {
        newDetails.set(id, 1);
      });
    }
  }
  
  emit('update:divisionDetails', newDetails);
  emit('update:divisionError', '');
});

const remainingPercentage = computed(() => {
  if (props.divisionType !== 'percentage') return 0;
  const total = Array.from(props.divisionDetails.values()).reduce((a, b) => a + b, 0);
  return Math.max(0, 100 - total);
});

const remainingAmount = computed(() => {
  if (props.divisionType !== 'amount') return 0;
  const valorTotal = Number(props.valor) || 0;
  const total = Array.from(props.divisionDetails.values()).reduce((a, b) => a + b, 0);
  return Math.max(0, valorTotal - total);
});

const previewValues = computed(() => {
  const valor = Math.round(Number(props.valor) * 100);
  if (!valor || props.participantesIds.length === 0) return new Map<UUID, string>();

  try {
    let results;
    
    if (props.divisionType === 'equal') {
      results = divideEqually(valor, props.participantesIds);
    } else if (props.divisionType === 'percentage') {
      const splits = props.participantesIds.map(id => ({
        memberId: id,
        percentage: props.divisionDetails.get(id) || 0
      }));
      results = divideByPercentage(valor, splits);
    } else if (props.divisionType === 'amount') {
      const splits = props.participantesIds.map(id => ({
        memberId: id,
        amount: Math.round((props.divisionDetails.get(id) || 0) * 100)
      }));
      results = divideByAmount(splits);
    } else if (props.divisionType === 'shares') {
      const splits = props.participantesIds.map(id => ({
        memberId: id,
        shares: props.divisionDetails.get(id) || 1
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

function validateDivision(): boolean {
  const valor = Math.round(Number(props.valor) * 100);

  if (props.divisionType === 'percentage') {
    const total = Array.from(props.divisionDetails.values()).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) > 1) {
      emit('update:divisionError', 'A soma dos percentuais deve ser próxima de 100%');
      return false;
    }
  } else if (props.divisionType === 'amount') {
    const total = Math.round(Array.from(props.divisionDetails.values()).reduce((a, b) => a + b * 100, 0));
    if (Math.abs(total - valor) > 1) {
      emit('update:divisionError', 'A soma dos valores deve ser próxima do total');
      return false;
    }
  } else if (props.divisionType === 'shares') {
    const total = Array.from(props.divisionDetails.values()).reduce((a, b) => a + b, 0);
    if (total <= 0) {
      emit('update:divisionError', 'O total de partes deve ser maior que 0');
      return false;
    }
  }

  emit('update:divisionError', '');
  return true;
}

function toggleParticipant(memberId: UUID) {
  const newIds = [...props.participantesIds];
  const index = newIds.indexOf(memberId);
  const newDetails = new Map(props.divisionDetails);

  if (index > -1) {
    // Deselecting participant
    newIds.splice(index, 1);
    newDetails.delete(memberId);
  } else {
    // Selecting participant - distribute equally
    newIds.push(memberId);
    
    // Redistribute equally among all selected participants (including the new one)
    newDetails.clear();
    if (props.divisionType === 'percentage') {
      const equalPercentage = 100 / newIds.length;
      newIds.forEach(id => {
        newDetails.set(id, equalPercentage);
      });
    } else if (props.divisionType === 'amount') {
      // Dividir o valor total igualmente, garantindo que a soma seja exata
      const valorTotal = Number(props.valor) || 0;
      const baseAmount = Math.floor((valorTotal * 100) / newIds.length) / 100;
      let distributed = 0;
      
      newIds.forEach((id, idx) => {
        if (idx === newIds.length - 1) {
          // Último participante recebe o que sobrou para garantir soma exata
          newDetails.set(id, valorTotal - distributed);
        } else {
          newDetails.set(id, baseAmount);
          distributed += baseAmount;
        }
      });
    } else if (props.divisionType === 'shares') {
      newIds.forEach(id => {
        newDetails.set(id, 1);
      });
    }
  }

  emit('update:participantesIds', newIds);
  emit('update:divisionDetails', newDetails);
}

function isParticipantSelected(memberId: UUID): boolean {
  return props.participantesIds.includes(memberId);
}

function getDivisionValue(memberId: UUID): number {
  return props.divisionDetails.get(memberId) || 0;
}

function setDivisionValue(memberId: UUID, value: number) {
  const newDetails = new Map(props.divisionDetails);

  if (props.divisionType === 'percentage') {
    const otherValuesSum = Array.from(newDetails.entries())
      .filter(([id]) => id !== memberId)
      .reduce((sum, [, val]) => sum + val, 0);
    const maxAllowed = 100 - otherValuesSum;
    value = Math.min(value, maxAllowed);
  }

  if (props.divisionType === 'amount') {
    const valorTotal = Number(props.valor) || 0;
    const otherValuesSum = Array.from(newDetails.entries())
      .filter(([id]) => id !== memberId)
      .reduce((sum, [, val]) => sum + val, 0);
    const maxAllowed = valorTotal - otherValuesSum;
    value = Math.min(value, maxAllowed);
  }

  newDetails.set(memberId, value);
  emit('update:divisionDetails', newDetails);
  emit('update:divisionError', '');
}

defineExpose({
  validateDivision
});
</script>

<template>
  <div>
    <div class="border-b border-gray-200 pb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Divisão</h3>
      <div>
        <select 
          :value="divisionType" 
          @change="(e) => emit('update:divisionType', (e.target as HTMLSelectElement).value as DivisionType)"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="equal">{{ divisionLabels.equal }}</option>
          <option value="percentage">{{ divisionLabels.percentage }}</option>
          <option value="amount">{{ divisionLabels.amount }}</option>
          <option value="shares">{{ divisionLabels.shares }}</option>
        </select>
      </div>
    </div>

    <div class="pb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Dividido por</h3>
      <p v-if="divisionError" class="mb-3 text-sm text-rose-600">{{ divisionError }}</p>
      
      <!-- Indicador de saldo restante -->
      <div v-if="divisionType === 'percentage' && participantesIds.length > 0" class="mb-3 p-2 bg-sky-50 border border-sky-200 rounded-md">
        <span class="text-sm text-sky-700">
          Restante: <strong>{{ remainingPercentage.toFixed(2) }}%</strong>
        </span>
      </div>
      <div v-if="divisionType === 'amount' && participantesIds.length > 0" class="mb-3 p-2 bg-sky-50 border border-sky-200 rounded-md">
        <span class="text-sm text-sky-700">
          Restante: <strong>R$ {{ remainingAmount.toFixed(2) }}</strong>
        </span>
      </div>
      
      <div class="space-y-3">
        <div 
          v-for="member in members" 
          :key="member.id" 
          class="border border-gray-300 rounded-md p-3 hover:bg-gray-50 transition" 
          :class="{ 'border-emerald-500 bg-emerald-50': isParticipantSelected(member.id) }"
        >
          <label class="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              :checked="isParticipantSelected(member.id)" 
              @change="toggleParticipant(member.id)" 
              class="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500 cursor-pointer" 
            />
            <span class="ml-2 text-gray-900 font-medium flex-1">
              {{ member.nome }}
              <span v-if="isParticipantSelected(member.id) && previewValues.has(member.id)" class="text-gray-500 font-normal">
                ({{ previewValues.get(member.id) }})
              </span>
            </span>
          </label>

          <!-- Inputs contextuais para divisões não-iguais -->
          <div v-if="isParticipantSelected(member.id) && divisionType !== 'equal'" class="mt-2 ml-6 flex items-center gap-2">
            <input 
              v-if="divisionType === 'percentage'"
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
              v-else-if="divisionType === 'amount'"
              type="number"
              :value="getDivisionValue(member.id)"
              @input="setDivisionValue(member.id, Number(($event.target as HTMLInputElement).value))"
              placeholder="0.00"
              min="0"
              step="0.01"
              class="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input 
              v-else-if="divisionType === 'shares'"
              type="number"
              :value="getDivisionValue(member.id)"
              @input="setDivisionValue(member.id, Number(($event.target as HTMLInputElement).value))"
              placeholder="1"
              min="0.01"
              step="0.01"
              class="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span class="text-xs text-gray-500">{{ divisionUnits[divisionType] }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
