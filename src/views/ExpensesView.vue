<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { UserGroupIcon, PlusIcon } from '@heroicons/vue/24/solid';
import type { UUID, TransactionRecord, Member } from '../types';
import { useActiveGroup } from '../composables/useActiveGroup';
import { getGroupMembers, getGroupTransactions, getMember } from '../lib/storage';
import AppHeader from '../components/AppHeader.vue';
import AppNavbar from '../components/AppNavbar.vue';
import Button from '../components/Button.vue';
import DrawerExpenseAdd from '../components/DrawerExpenseAdd.vue';
import DrawerExpenseDetails from '../components/DrawerExpenseDetails.vue';

// Composables
const { activeGroupId } = useActiveGroup();

// Props and emits for navigation
defineProps<{
    activeNav: 'transactions' | 'totals' | 'settings' | 'groups';
}>();

defineEmits<{
    'update:activeNav': [value: 'transactions' | 'totals' | 'settings' | 'groups'];
}>();

// State
const drawerOpen = ref(false);
const detailDrawerOpen = ref(false);
const selectedTransactionId = ref<UUID | null>(null);
const members = ref<Member[]>([]);
const transactions = ref<TransactionRecord[]>([]);

// Load transactions and members when group changes
watch(activeGroupId, (newGroupId) => {
    if (newGroupId) {
        members.value = getGroupMembers(newGroupId);
        transactions.value = getGroupTransactions(newGroupId);
    }
}, { immediate: true });

// Reset form when drawer opens
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

// (Form logic moved to `DrawerExpenseAdd` component)

function reloadTransactions() {
    if (activeGroupId.value) {
        transactions.value = getGroupTransactions(activeGroupId.value);
    }
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
                                class="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                @click="selectedTransactionId = transaction.id; detailDrawerOpen = true">
                                <div class="flex justify-between items-start mb-2">
                                    <div class="flex-1">
                                        <h3 class="font-semibold text-gray-900">{{ transaction.descricao }}</h3>
                                        <p class="text-sm text-gray-500">{{ formatDate(transaction.data) }}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-bold text-emerald-700">{{ formatCurrency(transaction.valor_total)
                                        }}</p>
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
        <div v-if="activeGroupId" class="fixed bottom-24 left-0 right-0 z-40 flex justify-end pointer-events-none">
            <div class="max-w-4xl mx-auto w-full px-6 pointer-events-auto flex justify-end">
                <Button variant="primary"
                    class="rounded-full px-6 py-3 flex items-center justify-center gap-2 shadow-lg text-white font-medium"
                    @click="drawerOpen = true">
                    <PlusIcon class="w-5 h-5" />
                    <span>Adicionar despesa</span>
                </Button>
            </div>
        </div>

        <!-- Drawer for adding expense -->
        <DrawerExpenseAdd
            v-if="activeGroupId"
            v-model="drawerOpen"
            :members="members"
            :activeGroupId="activeGroupId"
            @expense-added="reloadTransactions"
        />

        <!-- Drawer for expense details -->
        <DrawerExpenseDetails
            v-model="detailDrawerOpen"
            :transactionId="selectedTransactionId"
            :activeGroupId="activeGroupId"
            @transaction-deleted="reloadTransactions"
        />
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
