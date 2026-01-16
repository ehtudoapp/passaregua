<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { UserGroupIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/vue/24/solid';
import type { UUID, TransactionRecord, Member } from '../types';
import { useActiveGroup } from '../composables/useActiveGroup';
import { useCurrentUsername } from '../composables/useCurrentUsername';
import { getGroupMembers, createTransaction, createSplit, getGroupTransactions, getMember, removeTransaction } from '../lib/storage';
import AppHeader from '../components/AppHeader.vue';
import AppNavbar from '../components/AppNavbar.vue';
import Button from '../components/Button.vue';
import Input from '../components/Input.vue';
import Drawer from '../components/Drawer.vue';

// Composables
const { activeGroupId } = useActiveGroup();
const { currentUsername } = useCurrentUsername();

// Props and emits for navigation
defineProps<{
    activeNav: 'transactions' | 'totals' | 'settings' | 'groups';
}>();

defineEmits<{
    'update:activeNav': [value: 'transactions' | 'totals' | 'settings' | 'groups'];
}>();

// State
const drawerOpen = ref(false);
const members = ref<Member[]>([]);
const transactions = ref<TransactionRecord[]>([]);

// Form state
const formData = ref({
    descricao: '',
    valor: '',
    data: '',
    pagador_id: '',
    participantes_ids: [] as UUID[]
});

// Errors
const errors = ref({
    descricao: '',
    valor: '',
    data: '',
    pagador_id: '',
    participantes_ids: ''
});

// Load transactions and members when group changes
watch(activeGroupId, (newGroupId) => {
    if (newGroupId) {
        members.value = getGroupMembers(newGroupId);
        transactions.value = getGroupTransactions(newGroupId);
    }
}, { immediate: true });

// Reset form when drawer opens
watch(drawerOpen, (isOpen) => {
    if (isOpen) {
        resetForm();
    }
});

// Computed properties
const sortedTransactions = computed(() => {
    return [...transactions.value].sort((a, b) => {
        return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
});

const getPayerName = (payerId: UUID): string => {
    const member = getMember(payerId);
    return member?.nome || 'Desconhecido';
};

const formatCurrency = (cents: number): string => {
    return (cents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

const formatDate = (isoDate: string): string => {
    // Parse only the date part to avoid timezone issues
    const datePart = isoDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

// Validation
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

// Submit form
function handleAddExpense() {
    if (!validateForm() || !activeGroupId.value) {
        return;
    }

    // Convert valor from string to cents (number)
    const valorTotal = Math.round(Number(formData.value.valor) * 100);

    // Convert data to ISO 8601 format
    const isoDate = new Date(formData.value.data).toISOString();

    // Create transaction
    const transaction = createTransaction(
        activeGroupId.value,
        formData.value.descricao,
        valorTotal,
        isoDate,
        formData.value.pagador_id
    );

    // Create splits - divide equally among selected participants
    const valorPorPessoa = Math.round(valorTotal / formData.value.participantes_ids.length);

    formData.value.participantes_ids.forEach((participantId) => {
        createSplit(transaction.id, participantId, valorPorPessoa);
    });

    // Reload transactions
    transactions.value = getGroupTransactions(activeGroupId.value);

    // Close drawer and reset form
    drawerOpen.value = false;
    resetForm();
}

function resetForm() {
    // Find the member ID for the current username
    const currentMember = members.value.find(m => m.nome === currentUsername.value);
    
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
    // Clear error when user selects a participant
    if (formData.value.participantes_ids.length > 0) {
        errors.value.participantes_ids = '';
    }
}

function isParticipantSelected(memberId: UUID): boolean {
    return formData.value.participantes_ids.includes(memberId);
}

function handleDeleteTransaction(transactionId: UUID) {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
        removeTransaction(transactionId);
        if (activeGroupId.value) {
            transactions.value = getGroupTransactions(activeGroupId.value);
        }
    }
}
</script>

<template>
    <div class="min-h-screen flex flex-col bg-gray-50">
        <AppHeader title="Passa a régua" />

        <!-- Main Content -->
        <main class="flex-1 px-4 py-6 pb-24">
            <div class="max-w-xl mx-auto">
                <!-- No Active Group Message -->
                <div v-if="!activeGroupId" class="text-center py-12 text-gray-500">
                    <UserGroupIcon class="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p class="text-lg">Nenhum grupo ativo</p>
                    <p class="text-sm mt-2">Acesse a aba "Grupos" para ativar um grupo</p>
                </div>

                <!-- Transactions Content -->
                <template v-else>
                    <!-- Transactions List -->
                    <div class="space-y-3">
                        <div v-if="transactions.length === 0" class="p-6 text-center">
                            <p class="text-gray-500">Nenhuma despesa registrada</p>
                            <p class="text-sm text-gray-400 mt-2">Clique em "Adicionar despesa" para começar</p>
                        </div>

                        <div v-else class="p-4 space-y-3">
                            <div v-for="transaction in sortedTransactions" :key="transaction.id"
                                class="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <div class="flex justify-between items-start mb-2">
                                    <div class="flex-1">
                                        <h3 class="font-semibold text-gray-900">{{ transaction.descricao }}</h3>
                                        <p class="text-sm text-gray-500">{{ formatDate(transaction.data) }}</p>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <div class="text-right">
                                            <p class="font-bold text-emerald-700">{{ formatCurrency(transaction.valor_total)
                                            }}</p>
                                        </div>
                                        <Button variant="danger" @click="handleDeleteTransaction(transaction.id)">
                                            <TrashIcon class="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <p class="text-sm text-gray-600">Pago por: <span class="font-medium">{{
                                    getPayerName(transaction.pagador_id) }}</span></p>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </main>

        <!-- FAB Button -->
        <div v-if="activeGroupId" class="fixed bottom-24 right-6 z-40">
            <Button variant="primary"
                class="rounded-full px-6 py-3 flex items-center justify-center gap-2 shadow-lg text-white font-medium"
                @click="drawerOpen = true">
                <PlusIcon class="w-5 h-5" />
                <span>Adicionar despesa</span>
            </Button>
        </div>

        <!-- Drawer for adding expense -->
        <Drawer v-if="activeGroupId" v-model="drawerOpen" position="right" width-class="w-full max-w-xl">
            <template #header="{ close }">
                <div class="flex items-center justify-between px-6 py-4">
                    <h2 class="text-xl font-semibold text-gray-900">Nova despesa</h2>
                    <Button variant="icon" @click="close">
                        <XMarkIcon class="w-6 h-6" />
                    </Button>
                </div>
            </template>

            <div class="px-6 py-4 space-y-6">
                <!-- Section 1: Descrição e Valor -->
                <div class="border-b border-gray-200 pb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Detalhes da despesa</h3>
                    <div class="space-y-4">
                        <!-- Data -->
                        <Input v-model="formData.data" label="Data" type="date" :error="errors.data" />

                        <!-- Descrição -->
                        <Input v-model="formData.descricao" label="Descrição" placeholder="Descrição da despesa"
                            :error="errors.descricao" />

                        <!-- Valor -->
                        <Input v-model="formData.valor" label="Valor" type="number" placeholder="36.00" step="0.01"
                            min="0" :error="errors.valor" />
                    </div>
                </div>

                <!-- Section 2: Pagador -->
                <div class="border-b border-gray-200 pb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Quem pagou</h3>
                    <div>
                        <select v-model="formData.pagador_id"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            :class="{ 'border-rose-600': errors.pagador_id }">
                            <option value="">Selecione...</option>
                            <option v-for="member in members" :key="member.id" :value="member.id">
                                {{ member.nome }}
                            </option>
                        </select>
                        <p v-if="errors.pagador_id" class="mt-1 text-sm text-rose-600">{{ errors.pagador_id }}</p>
                    </div>
                </div>

                <!-- Section 3: Dividido por -->
                <div class="pb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Dividido por</h3>
                    <p v-if="errors.participantes_ids" class="mb-3 text-sm text-rose-600">{{ errors.participantes_ids }}
                    </p>
                    <div class="space-y-2">
                        <label v-for="member in members" :key="member.id"
                            class="flex items-center p-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition"
                            :class="{ 'border-emerald-500 bg-emerald-50': isParticipantSelected(member.id) }">
                            <input type="checkbox" :checked="isParticipantSelected(member.id)"
                                @change="toggleParticipant(member.id)"
                                class="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500 cursor-pointer" />
                            <span class="ml-2 text-gray-900">{{ member.nome }}</span>
                        </label>
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
                    <Button variant="primary" class="w-full" @click="handleAddExpense">
                        Adicionar despesa
                    </Button>
                </div>
            </div>
        </Drawer>
    </div>

    <!-- Bottom Navigation -->
    <AppNavbar :activeNav="activeNav" @update:activeNav="$emit('update:activeNav', $event)" />
</template>

<style scoped>
/* Ensure drawer doesn't get cut off */
:deep(.drawer-content) {
    max-height: 100vh;
    overflow-y: auto;
}
</style>
