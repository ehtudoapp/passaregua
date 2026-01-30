<script setup lang="ts">
import { ref } from 'vue';
import { PlusIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/vue/24/solid';
import Button from '../components/Button.vue';
import AppHeader from '../components/AppHeader.vue';
import AppNavbar from '../components/AppNavbar.vue';
import DrawerGroupCreate from '../components/DrawerGroupCreate.vue';
import DrawerGroupDetails from '../components/DrawerGroupDetails.vue';
import {
  createGroup,
  getGroups,
  getGroupsWithMemberCount,
  type GroupWithCount,
  updateGroupName,
  removeGroup
} from '../lib/storage';
import { useActiveGroup } from '../composables/useActiveGroup';
import { useSyncStatus } from '../composables/useSyncStatus';

// State
const drawerOpen = ref(false);
const groups = ref<GroupWithCount[]>([]);
const { activeGroupId, setActiveGroupId } = useActiveGroup();
const { triggerSync } = useSyncStatus();

// Edit drawer state
const editDrawerOpen = ref(false);
const editingGroup = ref<GroupWithCount | null>(null);

// Load groups on mount
loadGroups();

function loadGroups() {
  groups.value = getGroupsWithMemberCount();
}

function handleGroupCardClick(group: GroupWithCount) {
  if (activeGroupId.value === group.id) {
    // Se o grupo já está ativo, abre o drawer de edição
    openEditDrawer(group);
  } else {
    // Se não está ativo, ativa o grupo e redireciona para despesas
    setActiveGroupId(group.id);
    groups.value = getGroupsWithMemberCount();
    // Redirecionar para aba de despesas
    setTimeout(() => {
      window.location.href = '/expenses';
    }, 100);
  }
}

function openDrawer() {
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
}

function openEditDrawer(group: GroupWithCount) {
  editingGroup.value = group;
  editDrawerOpen.value = true;
}

function closeEditDrawer() {
  editDrawerOpen.value = false;
  editingGroup.value = null;
}

// Event handlers from child components
function onCreateGroup(payload: { nome: string; members: string[] }) {
  const wasFirstGroup = getGroups().length === 0;

  createGroup({ nome: payload.nome, members: payload.members });
  closeDrawer();

  // Sincronizar imediatamente
  triggerSync();

  if (wasFirstGroup) {
    setTimeout(() => {
      window.location.href = '/expenses';
    }, 100);
  } else {
    loadGroups();
  }
}

function onSaveGroup(payload: { id: string | number; nome: string }) {
  try {
    updateGroupName(payload.id as any, payload.nome);
    loadGroups();
    closeEditDrawer();
  } catch (error) {
    console.error(error);
  }
}

function onActivateGroup(id: string | number) {
  setActiveGroupId(id as any);
  groups.value = getGroupsWithMemberCount();
  closeEditDrawer();
}

function onDeleteGroup(id: string | number) {
  removeGroup(id as any);
  loadGroups();
  closeEditDrawer();
  triggerSync();
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
            ]" @click="handleGroupCardClick(group)">
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

  <!-- Drawers components -->
  <DrawerGroupCreate v-model="drawerOpen" @create="onCreateGroup" />

  <DrawerGroupDetails
    v-model="editDrawerOpen"
    :group="editingGroup"
    :activeGroupId="activeGroupId"
    @save="onSaveGroup"
    @activate="onActivateGroup"
    @delete="onDeleteGroup"
  />
</template>
