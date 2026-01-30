<script setup lang="ts">
import { ref, computed } from 'vue';
import { PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/vue/24/solid';
import Button from './Button.vue';
import Input from './Input.vue';
import Drawer from './Drawer.vue';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'create', payload: { nome: string; members: string[] }): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const groupName = ref('');
const groupNameError = ref('');
const memberInputs = ref<{ id: number; name: string; error?: string }[]>([{ id: 1, name: '' }]);
const nextMemberId = ref(2);

function resetForm() {
  groupName.value = '';
  groupNameError.value = '';
  memberInputs.value = [{ id: 1, name: '' }];
  nextMemberId.value = 2;
}

// note: Drawer header provides `close` via slot props; parent controls v-model

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

function handleCreate() {
  const nameValid = validateGroupName();
  const membersValid = validateMembers();

  if (!nameValid || !membersValid) return;

  const members = memberInputs.value.map(i => i.name.trim()).filter(n => n !== '');

  emit('create', { nome: groupName.value.trim(), members });
  emit('update:modelValue', false);
  resetForm();
}
</script>

<template>
  <Drawer v-model="open" position="right" width-class="w-full max-w-xl">
    <template #header="{ close }">
      <div class="flex items-center justify-between px-4 py-4">
        <h1 class="text-2xl font-bold text-gray-900">Novo Grupo</h1>
        <Button variant="icon" @click="close()">
          <XMarkIcon class="w-6 h-6" />
        </Button>
      </div>
    </template>

    <div class="px-6 py-4 space-y-6">
      <div class="border-b border-gray-200 pb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Criar Grupo</h3>
        <div class="space-y-4">
          <Input v-model="groupName" label="Nome do Grupo" placeholder="Ex: Viagem à praia" :error="groupNameError"
            @blur="validateGroupName" />
        </div>
      </div>

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

      <div class="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
        <Button variant="primary" class="w-full" @click="handleCreate">
          Criar Grupo
        </Button>
      </div>
    </div>
  </Drawer>
</template>
