<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowLeftIcon, BoltIcon, MinusIcon, PlusIcon } from '@heroicons/vue/24/solid';
import type { Member, UUID } from '../types';
import AppHeader from '../components/AppHeader.vue';
import AppNavbar from '../components/AppNavbar.vue';
import Button from '../components/Button.vue';
import DivisionSelector from '../components/DivisionSelector.vue';
import Input from '../components/Input.vue';
import { generateUUID } from '../lib/uuid';
import {
  divideByAmount,
  divideByPercentage,
  divideByShares,
  divideEqually,
  type DivisionType
} from '../composables/useDivisions';

type QuickStep = 'members' | 'division';

interface MemberInput {
  id: number;
  name: string;
  error?: string;
}

const currentStep = ref<QuickStep>('members');
const memberInputs = ref<MemberInput[]>([{ id: 1, name: '' }]);
const nextMemberId = ref(2);
const simulationMembers = ref<Member[]>([]);

const descricao = ref('');
const valor = ref('');
const valorError = ref('');
const divisionType = ref<DivisionType>('equal');
const divisionDetails = ref(new Map<UUID, number>());
const participantesIds = ref<UUID[]>([]);
const divisionError = ref('');

const selectedMembers = computed(() =>
  simulationMembers.value.filter(member => participantesIds.value.includes(member.id))
);

const divisionSummaryError = computed(() => {
  const totalAmount = Math.round(Number(valor.value) * 100);

  if (!valor.value || totalAmount <= 0) {
    return 'Informe um valor maior que 0 para visualizar a divisão.';
  }

  if (participantesIds.value.length === 0) {
    return 'Selecione pelo menos um participante.';
  }

  if (divisionType.value === 'percentage') {
    const total = Array.from(divisionDetails.value.values()).reduce((sum, item) => sum + item, 0);
    if (Math.abs(total - 100) > 1) {
      return 'A soma dos percentuais deve ser próxima de 100%.';
    }
  }

  if (divisionType.value === 'amount') {
    const total = Math.round(
      Array.from(divisionDetails.value.values()).reduce((sum, item) => sum + (item * 100), 0)
    );
    if (Math.abs(total - totalAmount) > 1) {
      return 'A soma dos valores deve ser próxima do total.';
    }
  }

  if (divisionType.value === 'shares') {
    const total = Array.from(divisionDetails.value.values()).reduce((sum, item) => sum + item, 0);
    if (total <= 0) {
      return 'O total de partes deve ser maior que 0.';
    }
  }

  return '';
});

const divisionSummary = computed(() => {
  const totalAmount = Math.round(Number(valor.value) * 100);

  if (divisionSummaryError.value || totalAmount <= 0 || participantesIds.value.length === 0) {
    return [];
  }

  try {
    if (divisionType.value === 'equal') {
      return divideEqually(totalAmount, participantesIds.value);
    }

    if (divisionType.value === 'percentage') {
      return divideByPercentage(totalAmount, participantesIds.value.map(id => ({
        memberId: id,
        percentage: divisionDetails.value.get(id) || 0
      })));
    }

    if (divisionType.value === 'amount') {
      return divideByAmount(participantesIds.value.map(id => ({
        memberId: id,
        amount: Math.round((divisionDetails.value.get(id) || 0) * 100)
      })));
    }

    return divideByShares(totalAmount, participantesIds.value.map(id => ({
      memberId: id,
      shares: divisionDetails.value.get(id) || 1
    })));
  } catch {
    return [];
  }
});

const divisionSummaryRows = computed(() => {
  const previewMap = new Map(divisionSummary.value.map(item => [item.memberId, item.amount]));

  return selectedMembers.value.map(member => ({
    id: member.id,
    nome: member.nome,
    amount: previewMap.get(member.id) || 0
  }));
});

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function addMemberInput() {
  memberInputs.value.push({ id: nextMemberId.value++, name: '' });
}

function removeMemberInput(id: number) {
  if (memberInputs.value.length === 1) {
    return;
  }

  memberInputs.value = memberInputs.value.filter(input => input.id !== id);
}

function validateMembers(): boolean {
  let isValid = true;
  const names = new Set<string>();
  const filledNames = memberInputs.value
    .map(input => input.name.trim())
    .filter(name => name !== '');

  memberInputs.value.forEach(input => {
    input.error = '';
    const trimmedName = input.name.trim();
    const normalizedName = trimmedName.toLowerCase();

    if (!trimmedName && filledNames.length === 0) {
      input.error = 'Informe pelo menos um participante';
      isValid = false;
      return;
    }

    if (!trimmedName) {
      return;
    }

    if (names.has(normalizedName)) {
      input.error = 'Nome duplicado';
      isValid = false;
      return;
    }

    names.add(normalizedName);
  });

  return isValid && filledNames.length > 0;
}

function resetDivisionState() {
  descricao.value = '';
  valor.value = '';
  valorError.value = '';
  divisionType.value = 'equal';
  divisionDetails.value = new Map();
  divisionError.value = '';
  participantesIds.value = simulationMembers.value.map(member => member.id);
}

function handleContinueToDivision() {
  if (!validateMembers()) {
    return;
  }

  simulationMembers.value = memberInputs.value
    .map(input => input.name.trim())
    .filter(name => name !== '')
    .map(name => ({
      id: generateUUID(),
      group_id: 'quick-launch',
      nome: name,
      lastModified: Date.now()
    }));

  resetDivisionState();
  currentStep.value = 'division';
}

function handleBackToMembers() {
  currentStep.value = 'members';
}

function resetFlow() {
  currentStep.value = 'members';
  memberInputs.value = [{ id: 1, name: '' }];
  nextMemberId.value = 2;
  simulationMembers.value = [];
  resetDivisionState();
}

function handleDivisionTypeUpdate(type: DivisionType) {
  divisionType.value = type;
}

function handleDivisionDetailsUpdate(details: Map<UUID, number>) {
  divisionDetails.value = details;
}

function handleParticipantesUpdate(ids: UUID[]) {
  participantesIds.value = ids;
}

function handleDivisionErrorUpdate(error: string) {
  divisionError.value = error;
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <AppHeader :showActiveGroup="true" />

    <main class="flex-1 px-4 py-6 pb-24">
      <div class="max-w-xl mx-auto space-y-6">
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-start gap-3">
            <div class="p-3 rounded-full bg-amber-100 text-amber-700">
              <BoltIcon class="w-6 h-6" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Lançamento rápido</h2>
              <p class="text-sm text-gray-600 mt-1">
                Monte uma divisão temporária sem salvar dados no grupo ou na sincronização.
              </p>
            </div>
          </div>
        </div>

        <div v-if="currentStep === 'members'" class="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Participantes temporários</h3>
              <p class="text-sm text-gray-500 mt-1">Adicione apenas quem participará desta divisão.</p>
            </div>
            <Button variant="primary" @click="addMemberInput">
              <div class="flex items-center gap-1">
                <PlusIcon class="w-4 h-4" />
                <span>Adicionar</span>
              </div>
            </Button>
          </div>

          <div class="space-y-3">
            <div v-for="input in memberInputs" :key="input.id" class="flex items-start gap-2">
              <div class="flex-1">
                <Input
                  v-model="input.name"
                  placeholder="Nome do participante"
                  :error="input.error"
                />
              </div>
              <Button
                variant="icon"
                class="mt-1"
                :disabled="memberInputs.length === 1"
                @click="removeMemberInput(input.id)"
              >
                <MinusIcon class="w-5 h-5 text-rose-500" />
              </Button>
            </div>
          </div>

          <div class="flex gap-3">
            <Button variant="secondary" class="flex-1" @click="resetFlow">
              Limpar
            </Button>
            <Button variant="primary" class="flex-1" @click="handleContinueToDivision">
              Continuar
            </Button>
          </div>
        </div>

        <div v-else class="space-y-6">
          <div class="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Simulação da despesa</h3>
                <p class="text-sm text-gray-500 mt-1">Os valores abaixo são apenas para conferência.</p>
              </div>
              <Button variant="icon" @click="handleBackToMembers">
                <ArrowLeftIcon class="w-5 h-5" />
              </Button>
            </div>

            <div class="space-y-4 border-b border-gray-200 pb-6">
              <Input
                v-model="descricao"
                label="Descrição"
                placeholder="Descrição da despesa"
              />
              <Input
                v-model="valor"
                label="Valor"
                type="number"
                placeholder="36.00"
                step="0.01"
                min="0"
                :error="valorError"
              />
            </div>

            <DivisionSelector
              :members="simulationMembers"
              :valor="valor"
              :division-type="divisionType"
              :division-details="divisionDetails"
              :participantes-ids="participantesIds"
              :division-error="divisionError"
              @update:division-type="handleDivisionTypeUpdate"
              @update:division-details="handleDivisionDetailsUpdate"
              @update:participantes-ids="handleParticipantesUpdate"
              @update:division-error="handleDivisionErrorUpdate"
            />
          </div>

          <div class="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900">Quanto cada um pagará</h3>
              <Button variant="secondary" @click="resetFlow">
                Nova simulação
              </Button>
            </div>

            <p v-if="divisionSummaryError" class="text-sm text-rose-600">
              {{ divisionSummaryError }}
            </p>

            <div v-else-if="divisionSummaryRows.length > 0" class="space-y-3">
              <div
                v-for="row in divisionSummaryRows"
                :key="row.id"
                class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <span class="font-medium text-gray-900">{{ row.nome }}</span>
                <span class="font-bold text-emerald-700">{{ formatCurrency(row.amount) }}</span>
              </div>
            </div>

            <p v-else class="text-sm text-gray-500">
              Informe os dados acima para visualizar a divisão.
            </p>
          </div>
        </div>
      </div>
    </main>

    <AppNavbar />
  </div>
</template>
