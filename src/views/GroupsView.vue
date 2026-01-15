<script setup lang="ts">
import { ref } from 'vue';
import { 
  XMarkIcon, 
  PlusIcon, 
  MinusIcon,
  UserGroupIcon,
  PlusCircleIcon
} from '@heroicons/vue/24/solid';
import Button from '../components/Button.vue';
import Input from '../components/Input.vue';
import Drawer from '../components/Drawer.vue';
import {
  createGroup,
  getGroupsWithMemberCount,
  type GroupWithCount
} from '../lib/storage';

// State
const drawerOpen = ref(false);
const groupName = ref('');
const groupNameError = ref('');
const memberInputs = ref<{ id: number; name: string; error?: string }[]>([
  { id: 1, name: '' }
]);
let nextMemberId = 2;

const groups = ref<GroupWithCount[]>([]);

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
  nextMemberId = 2;
}

function addMemberInput() {
  memberInputs.value.push({ id: nextMemberId++, name: '' });
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
    
    if (trimmedName && names.has(trimmedName.toLowerCase())) {
      input.error = 'Nome duplicado';
      isValid = false;
    } else if (trimmedName) {
      names.add(trimmedName.toLowerCase());
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
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Grupos</h1>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 py-6">
      <!-- Add Group Button -->
      <div class="mb-6">
        <Button variant="primary" @click="openDrawer">
          <div class="flex items-center gap-2">
            <PlusCircleIcon class="w-5 h-5" />
            <span>Adicionar Grupo</span>
          </div>
        </Button>
      </div>

      <!-- Groups List -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-900">Listar Grupos</h2>
        
        <div v-if="groups.length === 0" class="text-center py-12 text-gray-500">
          <UserGroupIcon class="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p class="text-lg">Nenhum grupo criado ainda</p>
          <p class="text-sm mt-2">Clique em "Adicionar Grupo" para começar</p>
        </div>

        <div v-else class="grid gap-4 sm:grid-cols-2">
          <div
            v-for="group in groups"
            :key="group.id"
            class="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-emerald-500 transition"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 mb-1">
                  {{ group.nome }}
                </h3>
                <p class="text-sm text-gray-600 flex items-center gap-1">
                  <UserGroupIcon class="w-4 h-4" />
                  <span>{{ group.memberCount }} {{ group.memberCount === 1 ? 'membro' : 'membros' }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Drawer for Adding Group -->
    <Drawer v-model="drawerOpen" position="right" width-class="w-full max-w-xl">
      <template #header="{ close }">
        <div class="flex items-center justify-between px-6 py-4">
          <h2 class="text-xl font-semibold text-gray-900">Novo Grupo</h2>
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
            <Input
              v-model="groupName"
              label="Nome do Grupo"
              placeholder="Ex: Viagem à praia"
              :error="groupNameError"
              @blur="validateGroupName"
            />
          </div>
        </div>

        <!-- Section 2: Add Users -->
        <div class="pb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Adicionar Usuários</h3>
            <Button variant="primary" @click="addMemberInput">
              <div class="flex items-center gap-1">
                <PlusIcon class="w-4 h-4" />
                <span class="text-sm">Adicionar</span>
              </div>
            </Button>
          </div>
          
          <div class="space-y-3">
            <div
              v-for="input in memberInputs"
              :key="input.id"
              class="flex items-start gap-2"
            >
              <div class="flex-1">
                <Input
                  v-model="input.name"
                  placeholder="Nome do membro"
                  :error="input.error"
                  @blur="validateMembers"
                />
              </div>
              <Button
                variant="icon"
                :disabled="memberInputs.length === 1"
                @click="removeMemberInput(input.id)"
                class="mt-1"
              >
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
          <Button
            variant="primary"
            class="w-full"
            @click="handleCreateGroup"
          >
            Criar Grupo
          </Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>
