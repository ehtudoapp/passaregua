<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import {
    PlusIcon,
    MinusIcon,
    UserGroupIcon,
    UserIcon,
    PencilIcon
} from '@heroicons/vue/24/solid';
import Button from '../components/Button.vue';
import Input from '../components/Input.vue';
import AppHeader from '../components/AppHeader.vue';
import AppNavbar from '../components/AppNavbar.vue';
import type { Member } from '../types';
import {
    getGroup,
    getGroupMembers,
    addMemberToGroup,
    removeMember,
    memberHasSplits,
    updateMember
} from '../lib/storage';
import { useActiveGroup } from '../composables/useActiveGroup';
import { useCurrentUsername } from '../composables/useCurrentUsername';
import { useSyncStatus } from '../composables/useSyncStatus';
import { useDataRefresh } from '../composables/useDataRefresh';

// State
const { activeGroupId } = useActiveGroup();
const { currentUsername, setCurrentUsername } = useCurrentUsername();
const { triggerSync } = useSyncStatus();
const { refreshTrigger } = useDataRefresh();
const groupName = ref('');
const members = ref<Member[]>([]);
const newMemberName = ref('');
const newMemberError = ref('');
const showIndicator = ref(true);
const editingUsername = ref(false);
const usernameInput = ref('');
const usernameError = ref('');
const editMemberModalOpen = ref(false);
const editingMember = ref<Member | null>(null);
const editMemberNameInput = ref('');
const editMemberNameError = ref('');

// Load group and members on mount
onMounted(() => {
    loadGroupAndMembers();
});

// Watch for active group changes
watch(
    activeGroupId,
    () => {
        loadGroupAndMembers();
    }
);

// Watch for sync refresh - recarregar dados quando sync terminar
watch(
    refreshTrigger,
    () => {
        loadGroupAndMembers();
    }
);

function loadGroupAndMembers() {
    if (activeGroupId.value) {
        const group = getGroup(activeGroupId.value);
        if (group) {
            groupName.value = group.nome;
            members.value = getGroupMembers(activeGroupId.value);
            showIndicator.value = true;
        }
    }
}

function validateNewMemberName(): boolean {
    const trimmedName = newMemberName.value.trim();

    if (!trimmedName) {
        newMemberError.value = 'Nome do membro não pode ser vazio';
        return false;
    }

    // Check for duplicates (case-insensitive)
    const lowerCaseName = trimmedName.toLowerCase();
    const hasDuplicate = members.value.some((member: Member) => member.nome.toLowerCase() === lowerCaseName);

    if (hasDuplicate) {
        newMemberError.value = 'Este membro já existe no grupo';
        return false;
    }

    newMemberError.value = '';
    return true;
}

async function handleAddMember() {
    if (!validateNewMemberName() || !activeGroupId.value) {
        return;
    }

    try {
        const newMember = addMemberToGroup(activeGroupId.value, newMemberName.value.trim());
        members.value.push(newMember);
        newMemberName.value = '';
        newMemberError.value = '';
        
        // Sincronizar imediatamente após adicionar
        triggerSync();
    } catch (error) {
        newMemberError.value = error instanceof Error ? error.message : 'Erro ao adicionar membro';
    }
}

function handleRemoveMember(memberId: string) {
    if (removeMember(memberId)) {
        members.value = members.value.filter((m: Member) => m.id !== memberId);
        
        // Sincronizar imediatamente após remover
        triggerSync();
    }
}

function startEditUsername() {
    const { currentUserId } = useCurrentUsername();
    usernameInput.value = currentUserId.value || '';
    usernameError.value = '';
    editingUsername.value = true;
}

function cancelEditUsername() {
    editingUsername.value = false;
    usernameInput.value = '';
    usernameError.value = '';
}

function validateUsername(): boolean {
    const trimmedUsername = usernameInput.value.trim();

    if (!trimmedUsername) {
        usernameError.value = 'Selecione um membro';
        return false;
    }

    usernameError.value = '';
    return true;
}

function handleSaveUsername() {
    if (!validateUsername()) {
        return;
    }

    // usernameInput agora contém o ID do membro
    setCurrentUsername(usernameInput.value.trim());
    editingUsername.value = false;
    usernameInput.value = '';
    usernameError.value = '';
}

// Computed que calcula quais membros podem ser deletados (cacheado, não recalcula a cada keystroke)
const deletableMembers = computed(() => {
    const result = new Set<string>();
    for (const member of members.value) {
        if (!memberHasSplits(member.id)) {
            result.add(member.id);
        }
    }
    return result;
});

function canDeleteMember(memberId: string): boolean {
    return deletableMembers.value.has(memberId);
}

function openEditMemberModal(member: Member) {
    editingMember.value = member;
    editMemberNameInput.value = member.nome;
    editMemberNameError.value = '';
    editMemberModalOpen.value = true;
}

function closeEditMemberModal() {
    editMemberModalOpen.value = false;
    editingMember.value = null;
    editMemberNameInput.value = '';
    editMemberNameError.value = '';
}

function validateEditMemberName(): boolean {
    const trimmedName = editMemberNameInput.value.trim();

    if (!trimmedName) {
        editMemberNameError.value = 'Nome do membro não pode ser vazio';
        return false;
    }

    // Check for duplicates (case-insensitive), excluding the current member
    const lowerCaseName = trimmedName.toLowerCase();
    const hasDuplicate = members.value.some((member: Member) => 
        member.id !== editingMember.value?.id && member.nome.toLowerCase() === lowerCaseName
    );

    if (hasDuplicate) {
        editMemberNameError.value = 'Este nome já existe no grupo';
        return false;
    }

    editMemberNameError.value = '';
    return true;
}

function handleSaveEditMember() {
    if (!validateEditMemberName() || !editingMember.value) {
        return;
    }

    const updatedMember = updateMember(editingMember.value.id, { 
        nome: editMemberNameInput.value.trim() 
    });

    if (updatedMember) {
        // Update the members list
        const index = members.value.findIndex((m: Member) => m.id === editingMember.value!.id);
        if (index !== -1) {
            members.value[index] = updatedMember;
        }

        // Sincronizar imediatamente após editar
        triggerSync();

        // Close the modal
        closeEditMemberModal();
    }
}


</script>

<template>
    <div class="min-h-screen flex flex-col bg-gray-50">
        <!-- Header -->
        <AppHeader :showActiveGroup="true" title="Passa a régua"/>

        <!-- Main Content -->
        <main class="flex-1 px-4 py-6 pb-24">
            <div class="max-w-xl mx-auto space-y-6">
                <!-- No Active Group Message -->
                <div v-if="!activeGroupId" class="text-center py-12 text-gray-500">
                    <UserGroupIcon class="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p class="text-lg">Nenhum grupo ativo</p>
                    <p class="text-sm mt-2">Acesse a aba "Grupos" para ativar um grupo</p>
                </div>

                <!-- Active Group Content -->
                <div v-else class="space-y-6">
                    <!-- Current User Section -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                        <div class="flex items-center gap-3 mb-4">
                            <UserIcon class="w-5 h-5 text-gray-600" />
                            <h3 class="text-lg font-semibold text-gray-900">Usuário do Dispositivo</h3>
                        </div>

                        <!-- Display Mode -->
                        <div v-if="!editingUsername" class="space-y-3">
                            <div class="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p v-if="currentUsername" class="text-gray-900 font-medium">
                                    {{ currentUsername }}
                                </p>
                                <p v-else class="text-gray-500 italic">
                                    Nenhum usuário configurado
                                </p>
                            </div>
                            <Button variant="primary" class="w-full" @click="startEditUsername">
                                {{ currentUsername ? 'Alterar Usuário' : 'Configurar Usuário' }}
                            </Button>
                        </div>

                        <!-- Edit Mode -->
                        <div v-else class="space-y-3">
                            <div class="space-y-2">
                                <label class="block text-sm font-medium text-gray-700">Selecionar membro do grupo</label>
                                <select v-model="usernameInput"
                                    class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm bg-white text-gray-900">
                                    <option value="">-- Escolher membro --</option>
                                    <option v-for="member in members" :key="member.id" :value="member.id">
                                        {{ member.nome }}
                                    </option>
                                </select>
                                <p v-if="usernameError" class="text-sm text-red-600">{{ usernameError }}</p>
                            </div>

                            <div class="flex gap-2">
                                <Button variant="primary" class="flex-1" @click="handleSaveUsername"
                                    :disabled="!usernameInput.trim()">
                                    Salvar
                                </Button>
                                <Button variant="secondary" class="flex-1" @click="cancelEditUsername">
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>

                    <!-- Members Section -->
                    <div class="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Membros</h3>
                            <!-- Add Member Form -->
                            <div class="border-t border-gray-200 pt-6 space-y-4">
                                <h3 class="text-lg font-semibold text-gray-900">Adicionar Membro</h3>
                                <div class="space-y-3">
                                    <Input v-model="newMemberName" label="Nome do Membro" placeholder="Ex: João"
                                        :error="newMemberError"
                                        @blur="() => newMemberName && validateNewMemberName()" />
                                    <Button variant="primary" class="w-full" @click="handleAddMember">
                                        <div class="flex items-center justify-center gap-2">
                                            <PlusIcon class="w-4 h-4" />
                                            <span>Adicionar Membro</span>
                                        </div>
                                    </Button>
                                </div>
                            </div>
                            <!-- Members List -->
                            <div v-if="members.length > 0" class="space-y-2">
                                <div v-for="member in members" :key="member.id"
                                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                                    <div class="flex-1">
                                        <button 
                                            @click="openEditMemberModal(member)"
                                            class="text-left text-gray-900 hover:text-emerald-700 transition flex items-center gap-2"
                                        >
                                            <span>{{ member.nome }}</span>
                                            <PencilIcon class="w-3 h-3 text-gray-400" />
                                        </button>
                                        <p v-if="!canDeleteMember(member.id)" class="text-xs text-gray-500 mt-1">
                                            Possui despesas registradas
                                        </p>
                                    </div>
                                    <Button v-if="canDeleteMember(member.id)" variant="danger" @click="handleRemoveMember(member.id)">
                                        <MinusIcon class="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <!-- Empty Members Message -->
                            <div v-else class="text-center py-8 text-gray-500">
                                <UserGroupIcon class="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p class="text-sm">Nenhum membro adicionado ainda</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Bottom Navigation -->
    <AppNavbar />

    <!-- Edit Member Name Modal -->
    <div v-if="editMemberModalOpen" class="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4">
        <div class="max-w-md w-full">
            <div class="bg-white rounded-lg shadow-lg p-8 text-center space-y-4">
                <PencilIcon class="w-16 h-16 mx-auto text-emerald-500" />
                <h2 class="text-2xl font-bold text-gray-900">Alterar Nome</h2>
                <p class="text-gray-600">
                    Editar o nome de <span class="font-semibold">{{ editingMember?.nome }}</span>
                </p>
                <div class="text-left">
                    <Input 
                        v-model="editMemberNameInput" 
                        label="Novo nome" 
                        placeholder="Digite o novo nome"
                        :error="editMemberNameError"
                        @blur="validateEditMemberName"
                    />
                </div>
                <div class="flex gap-3 pt-4">
                    <Button variant="primary" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900" @click="closeEditMemberModal">
                        Cancelar
                    </Button>
                    <Button variant="primary" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" @click="handleSaveEditMember">
                        Salvar
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>
