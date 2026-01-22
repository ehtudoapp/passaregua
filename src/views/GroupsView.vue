<script setup lang="ts">
import { ref } from 'vue';
import {
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  UserGroupIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/solid';
import Button from '../components/Button.vue';
import Input from '../components/Input.vue';
import Drawer from '../components/Drawer.vue';
import AppHeader from '../components/AppHeader.vue';
import AppNavbar from '../components/AppNavbar.vue';
import {
  createGroup,
  getGroupsWithMemberCount,
  type GroupWithCount,
  updateGroupName
} from '../lib/storage';
import { useActiveGroup } from '../composables/useActiveGroup';
import { useSyncStatus } from '../composables/useSyncStatus';

// State
const drawerOpen = ref(false);
const groupName = ref('');
const groupNameError = ref('');
const memberInputs = ref<{ id: number; name: string; error?: string }[]>([
  { id: 1, name: '' }
]);
const nextMemberId = ref(2);

const groups = ref<GroupWithCount[]>([]);
const { activeGroupId, setActiveGroupId } = useActiveGroup();
const { triggerSync } = useSyncStatus();

// Edit drawer state
const editDrawerOpen = ref(false);
const editingGroup = ref<GroupWithCount | null>(null);
const editGroupName = ref('');
const editGroupNameError = ref('');

// Load groups on mount
loadGroups();

function loadGroups() {
  groups.value = getGroupsWithMemberCount();
}

function openDrawer() {
  drawerOpen.value = true;
  resetForm();
}

function closeDrawer() {
  drawerOpen.value = false;
  resetForm();
}

function resetForm() {
  groupName.value = '';
  groupNameError.value = '';
  memberInputs.value = [{ id: 1, name: '' }];
  nextMemberId.value = 2;
}

function addMemberInput() {
  memberInputs.value.push({ id: nextMemberId.value++, name: '' });
}

function removeMemberInput(id: number) {
  if (memberInputs.value.length > 1) {
    memberInputs.value = memberInputs.value.filter(input => input.id !== id);
  }
}

function validateGroupName(): boolean {
  if (!groupName.value.trim()) {
    groupNameError.value = 'Nome do grupo não pode ser vazio';
    return false;
  }
  groupNameError.value = '';
  return true;
}

function validateMembers(): boolean {
  let isValid = true;
  const names = new Set<string>();

  memberInputs.value.forEach(input => {
    input.error = '';
    const trimmedName = input.name.trim();
    const lowerCaseName = trimmedName.toLowerCase();

    if (trimmedName && names.has(lowerCaseName)) {
      input.error = 'Nome duplicado';
      isValid = false;
    } else if (trimmedName) {
      names.add(lowerCaseName);
    }
  });

  return isValid;
}

function handleCreateGroup() {
  const nameValid = validateGroupName();
  const membersValid = validateMembers();

  if (!nameValid || !membersValid) {
    return;
  }

  // Get non-empty member names
  const members = memberInputs.value
    .map(input => input.name.trim())
    .filter(name => name !== '');

  // Create group
  createGroup({
    nome: groupName.value.trim(),
    members
  });

  // Reload groups and close drawer
  loadGroups();
  closeDrawer();
  
  // Sincronizar imediatamente
  triggerSync();
}

function openEditDrawer(group: GroupWithCount) {
  editingGroup.value = group;
  editGroupName.value = group.nome;
  editGroupNameError.value = '';
  editDrawerOpen.value = true;
}

function closeEditDrawer() {
  editDrawerOpen.value = false;
  editingGroup.value = null;
  editGroupName.value = '';
  editGroupNameError.value = '';
}

function validateEditGroupName(): boolean {
  if (!editGroupName.value.trim()) {
    editGroupNameError.value = 'Nome do grupo não pode ser vazio';
    return false;
  }
  editGroupNameError.value = '';
  return true;
}

function handleSaveGroupName() {
  if (!validateEditGroupName() || !editingGroup.value) {
    return;
  }

  try {
    updateGroupName(editingGroup.value.id, editGroupName.value.trim());
    loadGroups();
    closeEditDrawer();
  } catch (error) {
    editGroupNameError.value = error instanceof Error ? error.message : 'Erro ao atualizar grupo';
  }
}

function handleActivateGroup() {
  if (editingGroup.value) {
    setActiveGroupId(editingGroup.value.id);
    groups.value = getGroupsWithMemberCount();
    closeEditDrawer();
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- Header -->
    <AppHeader :showActiveGroup="true" title="Passa a régua" />

    <!-- Main Content -->
    <main class="flex-1 px-4 py-6 pb-24">
      <div class="max-w-xl mx-auto">
        <!-- Groups List -->
        <div class="space-y-4">

          <!-- Alert when no active group -->
          <div v-if="groups.length > 0 && activeGroupId === null"
            class="text-center py-8 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg">
            <CheckCircleIcon class="w-12 h-12 mx-auto mb-3 text-amber-400" />
            <p class="text-base font-medium">Nenhum grupo ativo</p>
            <p class="text-sm mt-1">Clique em um grupo abaixo e ative-o para começar</p>
          </div>

          <!-- No groups message -->
          <div v-if="groups.length === 0" class="text-center py-12 text-gray-500">
            <UserGroupIcon class="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p class="text-lg">Nenhum grupo criado ainda</p>
            <p class="text-sm mt-2">Clique em "Criar grupo" para começar</p>
          </div>

          <!-- Groups list -->
          <div v-if="groups.length > 0" class="p-4 space-y-3">
            <div v-for="group in groups" :key="group.id" :class="[
              'bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow',
              activeGroupId === group.id ? 'ring-2 ring-emerald-500' : ''
            ]" @click="openEditDrawer(group)">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-900 mb-1">
                    {{ group.nome }}
                  </h3>
                  <p class="text-sm text-gray-600 flex items-center gap-1">
                    <UserGroupIcon class="w-4 h-4" />
                    <span>{{ group.memberCount }} {{ group.memberCount === 1 ? 'participante' : 'participantes'
                      }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- FAB Button -->
  <div class="fixed bottom-24 left-0 right-0 z-40 flex justify-end pointer-events-none">
    <div class="max-w-4xl mx-auto w-full px-6 pointer-events-auto flex justify-end">
      <Button variant="primary"
        class="rounded-full px-6 py-3 flex items-center justify-center gap-2 shadow-lg text-white font-medium"
        @click="openDrawer">
        <PlusIcon class="w-5 h-5" />
        <span>Criar grupo</span>
      </Button>
    </div>
  </div>

  <!-- Bottom Navigation -->
  <AppNavbar />

  <!-- Drawer for Adding Group -->
  <Drawer v-model="drawerOpen" position="right" width-class="w-full max-w-xl">
    <template #header="{ close }">
      <div class="flex items-center justify-between px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Novo Grupo</h1>
        <Button variant="icon" @click="close">
          <XMarkIcon class="w-6 h-6" />
        </Button>
      </div>
    </template>

    <div class="px-6 py-4 space-y-6">
      <!-- Section 1: Create Group -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Criar Grupo</h3>
        <div class="space-y-4">
          <Input v-model="groupName" label="Nome do Grupo" placeholder="Ex: Viagem à praia" :error="groupNameError"
            @blur="validateGroupName" />
        </div>
      </div>

      <!-- Section 2: Add Users -->
      <div class="pb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Adicionar membros</h3>
          <Button variant="primary" @click="addMemberInput">
            <div class="flex items-center gap-1">
              <PlusIcon class="w-4 h-4" />
              <span class="text-sm">Adicionar</span>
            </div>
          </Button>
        </div>

        <div class="space-y-3">
          <div v-for="input in memberInputs" :key="input.id" class="flex items-start gap-2">
            <div class="flex-1">
              <Input v-model="input.name" placeholder="Nome do membro" :error="input.error" @blur="validateMembers" />
            </div>
            <Button variant="icon" :disabled="memberInputs.length === 1" @click="removeMemberInput(input.id)"
              class="mt-1">
              <MinusIcon class="w-5 h-5 text-rose-500" />
            </Button>
          </div>
        </div>

        <p class="mt-3 text-sm text-gray-500">
          Você pode deixar campos vazios se não quiser adicionar membros agora.
        </p>
      </div>

      <!-- Create Button -->
      <div class="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
        <Button variant="primary" class="w-full" @click="handleCreateGroup">
          Criar Grupo
        </Button>
      </div>
    </div>
  </Drawer>

  <!-- Drawer for Editing Group Name -->
  <Drawer v-model="editDrawerOpen" position="right" width-class="w-full max-w-xl">
    <template #header="{ close }">
      <div class="flex items-center justify-between px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Editar Grupo</h1>
        <Button variant="icon" @click="close">
          <XMarkIcon class="w-6 h-6" />
        </Button>
      </div>
    </template>

    <div class="px-6 py-4 space-y-6">
      <!-- Edit Group Name Section -->
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Editar Nome do Grupo</h3>
        <div class="space-y-4">
          <Input v-model="editGroupName" label="Nome do Grupo" placeholder="Ex: Viagem à praia"
            :error="editGroupNameError" @blur="validateEditGroupName" />
        </div>
      </div>

      <!-- Activate Group Section -->
      <div class="pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Ativar Grupo</h3>
        <p class="text-sm text-gray-600 mb-3">
          {{ activeGroupId === editingGroup?.id ? 'Este é o grupo ativo' : 'Clique abaixo para ativar este grupo' }}
        </p>
        <Button v-if="activeGroupId !== editingGroup?.id" variant="primary" class="w-full" @click="handleActivateGroup">
          Tornar o grupo ativo
        </Button>
        <div v-else
          class="w-full px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm text-center">
          ✓ Grupo ativo
        </div>
      </div>

      <!-- Save Button -->
      <div class="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
        <Button variant="primary" class="w-full" @click="handleSaveGroupName">
          Salvar Alterações
        </Button>
      </div>
    </div>
  </Drawer>
</template>
