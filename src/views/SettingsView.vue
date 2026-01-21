<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import {
    PlusIcon,
    MinusIcon,
    UserGroupIcon,
    UserIcon
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
    removeMember
} from '../lib/storage';
import { useActiveGroup } from '../composables/useActiveGroup';
import { useCurrentUsername } from '../composables/useCurrentUsername';

// Props and emits for navigation
defineProps<{
    activeNav: 'transactions' | 'totals' | 'settings' | 'groups';
}>();

defineEmits<{
    'update:activeNav': [value: 'transactions' | 'totals' | 'settings' | 'groups'];
}>();

// State
const { activeGroupId } = useActiveGroup();
const { currentUsername, setCurrentUsername } = useCurrentUsername();
const groupName = ref('');
const members = ref<Member[]>([]);
const newMemberName = ref('');
const newMemberError = ref('');
const showIndicator = ref(true);
const editingUsername = ref(false);
const usernameInput = ref('');
const usernameError = ref('');

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

function handleAddMember() {
    if (!validateNewMemberName() || !activeGroupId.value) {
        return;
    }

    try {
        const newMember = addMemberToGroup(activeGroupId.value, newMemberName.value.trim());
        members.value.push(newMember);
        newMemberName.value = '';
        newMemberError.value = '';
    } catch (error) {
        newMemberError.value = error instanceof Error ? error.message : 'Erro ao adicionar membro';
    }
}

function handleRemoveMember(memberId: string) {
    if (removeMember(memberId)) {
        members.value = members.value.filter((m: Member) => m.id !== memberId);
    }
}

function startEditUsername() {
    usernameInput.value = currentUsername.value || '';
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

    setCurrentUsername(usernameInput.value.trim());
    editingUsername.value = false;
    usernameInput.value = '';
    usernameError.value = '';
}

</script>

<template>
    <div class="min-h-screen flex flex-col bg-gray-50">
        <!-- Header -->
        <AppHeader :showActiveGroup="true" title="Passa a régua"/>

        <!-- Main Content -->
        <main class="flex-1 px-4 py-6 pb-24">
            <div class="max-w-xl mx-auto space-y-6">
                <!-- Active Group Name Header -->
                <div v-if="activeGroupId">
                    <h2 class="text-2xl font-semibold text-gray-900">{{ groupName }}</h2>
                    <Transition
                        enter-active-class="transition-all duration-300 ease-out"
                        enter-from-class="opacity-0 scale-95"
                        enter-to-class="opacity-100 scale-100"
                        leave-active-class="transition-all duration-200 ease-in"
                        leave-from-class="opacity-100 scale-100"
                        leave-to-class="opacity-0 scale-95"
                    >
                        <div
                            v-if="showIndicator"
                            class="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full"
                        >
                            <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span class="text-emerald-700 text-xs font-medium">Grupo ativo</span>
                        </div>
                    </Transition>
                </div>

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
                        <!-- Show member list if group is active -->
                        <div v-if="activeGroupId && members.length > 0" class="space-y-2">
                            <label class="block text-sm font-medium text-gray-700">Selecionar membro do grupo</label>
                            <select v-model="usernameInput"
                                class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm bg-white text-gray-900">
                                <option value="">-- Escolher membro --</option>
                                <option v-for="member in members" :key="member.id" :value="member.nome">
                                    {{ member.nome }}
                                </option>
                            </select>
                            <p v-if="usernameError" class="text-sm text-red-600">{{ usernameError }}</p>
                        </div>

                        <!-- No group active -->
                        <div v-else class="text-center py-6 text-gray-500">
                            <p class="text-sm">Nenhum grupo ativo com membros</p>
                            <p class="text-xs mt-1">Acesse a aba "Grupos" para ativar um grupo</p>
                        </div>

                        <div class="flex gap-2">
                            <Button variant="primary" class="flex-1" @click="handleSaveUsername"
                                :disabled="!usernameInput.trim() || !activeGroupId">
                                Salvar
                            </Button>
                            <Button variant="secondary" class="flex-1" @click="cancelEditUsername">
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>

                <!-- No Active Group Message -->
                <div v-if="!activeGroupId" class="text-center py-12 text-gray-500">
                    <UserGroupIcon class="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p class="text-lg">Nenhum grupo ativo</p>
                    <p class="text-sm mt-2">Acesse a aba "Grupos" para ativar um grupo</p>
                </div>

                <!-- Active Group Content -->
                <div v-else class="space-y-6">
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
                                    <span class="text-gray-900">{{ member.nome }}</span>
                                    <Button variant="danger" @click="handleRemoveMember(member.id)">
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
    <AppNavbar :activeNav="activeNav" @update:activeNav="$emit('update:activeNav', $event)" />
</template>
