<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { XMarkIcon, ClipboardDocumentIcon, TrashIcon } from '@heroicons/vue/24/solid';
import Button from './Button.vue';
import Input from './Input.vue';
import Drawer from './Drawer.vue';

import type { GroupWithCount } from '../lib/storage';

const props = defineProps<{ modelValue: boolean; group: GroupWithCount | null; activeGroupId: string | null | number }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', payload: { id: string | number; nome: string }): void;
  (e: 'activate', id: string | number): void;
  (e: 'delete', id: string | number): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const editGroupName = ref('');
const editGroupNameError = ref('');
const copySuccess = ref(false);
const deleteConfirmOpen = ref(false);

watch(() => props.group, (g) => {
  editGroupName.value = g ? g.nome : '';
  editGroupNameError.value = '';
  copySuccess.value = false;
});

const groupUrl = computed(() => {
  if (!props.group) return '';
  return `${window.location.origin}/groups/${props.group.id}`;
});

function validateEditGroupName(): boolean {
  if (!editGroupName.value.trim()) {
    editGroupNameError.value = 'Nome do grupo não pode ser vazio';
    return false;
  }
  editGroupNameError.value = '';
  return true;
}

function handleSave() {
  if (!props.group) return;
  if (!validateEditGroupName()) return;
  emit('save', { id: props.group.id, nome: editGroupName.value.trim() });
}

function handleActivate() {
  if (!props.group) return;
  emit('activate', props.group.id);
}

function copyGroupUrl() {
  if (!props.group) return;
  navigator.clipboard.writeText(groupUrl.value).then(() => {
    copySuccess.value = true;
    setTimeout(() => (copySuccess.value = false), 2000);
  });
}

function openDeleteConfirm() {
  deleteConfirmOpen.value = true;
}

function closeDeleteConfirm() {
  deleteConfirmOpen.value = false;
}

function handleDeleteConfirm() {
  if (!props.group) return;
  emit('delete', props.group.id);
  deleteConfirmOpen.value = false;
}
</script>

<template>
  <Drawer v-model="open" position="right" width-class="w-full max-w-xl">
    <template #header="{ close }">
      <div class="flex items-center justify-between px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Editar Grupo</h1>
        <Button variant="icon" @click="close()">
          <XMarkIcon class="w-6 h-6" />
        </Button>
      </div>
    </template>

    <div class="px-6 py-4 space-y-6">
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Editar Nome do Grupo</h3>
        <div class="space-y-4">
          <Input v-model="editGroupName" label="Nome do Grupo" placeholder="Ex: Viagem à praia"
            :error="editGroupNameError" @blur="validateEditGroupName" />
        </div>
      </div>

      <div class="pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Ativar Grupo</h3>
        <p class="text-sm text-gray-600 mb-3">
          {{ props.activeGroupId === props.group?.id ? 'Este é o grupo ativo' : 'Clique abaixo para ativar este grupo' }}
        </p>
        <Button v-if="props.activeGroupId !== props.group?.id" variant="primary" class="w-full" @click="handleActivate">
          Tornar o grupo ativo
        </Button>
        <div v-else
          class="w-full px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm text-center">
          ✓ Grupo ativo
        </div>
      </div>

      <div class="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
        <Button variant="primary" class="w-full" @click="handleSave">
          Salvar Alterações
        </Button>
      </div>

      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Endereço do Grupo</h3>
        <p class="text-sm text-gray-600 mb-3">Compartilhe este endereço para acessar diretamente este grupo</p>
        <div class="flex gap-2">
          <div class="flex-1">
            <Input :model-value="groupUrl" label="" :readonly="true" class="font-mono text-sm" />
          </div>
          <Button variant="primary" @click="copyGroupUrl" class="mt-0 px-4 py-2 flex items-center gap-2"
            :class="copySuccess ? 'bg-emerald-600 hover:bg-emerald-700' : ''">
            <ClipboardDocumentIcon class="w-5 h-5" />
            <span>{{ copySuccess ? 'Copiado!' : 'Copiar' }}</span>
          </Button>
        </div>
      </div>

      <div class="border-t border-gray-200 pt-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Deletar Grupo</h3>
        <p class="text-sm text-gray-600 mb-3">Remova este grupo do seu dispositivo. Você pode reimportá-lo usando o link de compartilhamento.</p>
        <Button
          variant="primary"
          class="w-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2"
          @click="openDeleteConfirm"
        >
          <TrashIcon class="w-5 h-5" />
          <span>Deletar Grupo</span>
        </Button>
      </div>

      <div v-if="deleteConfirmOpen" class="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4">
        <div class="max-w-md w-full">
          <div class="bg-white rounded-lg shadow-lg p-8 text-center space-y-4">
            <TrashIcon class="w-16 h-16 mx-auto text-rose-500" />
            <h2 class="text-2xl font-bold text-gray-900">Deletar Grupo?</h2>
            <p class="text-gray-600">
              Tem certeza que deseja deletar <span class="font-semibold">{{ props.group?.nome }}</span>?
            </p>
            <p class="text-sm text-gray-500">Esta ação é irreversível localmente, mas você pode reimportar o grupo usando o link de compartilhamento.</p>
            <div class="flex gap-3 pt-4">
              <Button variant="primary" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900" @click="closeDeleteConfirm">
                Não, cancelar
              </Button>
              <Button variant="primary" class="flex-1 bg-rose-600 hover:bg-rose-700 text-white" @click="handleDeleteConfirm">
                Sim, deletar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Drawer>
</template>
