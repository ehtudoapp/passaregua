<script setup lang="ts">
import { 
  Bars3Icon, 
  BanknotesIcon, 
  Cog6ToothIcon, 
  UserGroupIcon 
} from '@heroicons/vue/24/solid';

defineProps<{
  activeNav: 'home' | 'transactions' | 'settings' | 'members';
}>();

defineEmits<{
  'update:activeNav': [value: 'home' | 'transactions' | 'settings' | 'members'];
}>();
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
    <div class="flex justify-around max-w-4xl mx-auto">
      <button
        @click="$emit('update:activeNav', 'home')"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          activeNav === 'home' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <Bars3Icon class="w-6 h-6" />
        <p class="text-xs">Despesas</p>
      </button>
      <button
        @click="$emit('update:activeNav', 'transactions')"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          activeNav === 'transactions' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <BanknotesIcon class="w-6 h-6" />
        <p class="text-xs">Saldos</p>
      </button>
      <button
        @click="$emit('update:activeNav', 'settings')"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          activeNav === 'settings' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <Cog6ToothIcon class="w-6 h-6" />
        <p class="text-xs">Config</p>
      </button>
      <button
        @click="$emit('update:activeNav', 'members')"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          activeNav === 'members' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <UserGroupIcon class="w-6 h-6" />
        <p class="text-xs">Grupos</p>
      </button>
    </div>
  </nav>
</template>
