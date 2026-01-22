<script setup lang="ts">
import { useSyncStatus } from '../composables/useSyncStatus';
import { useActiveGroupName } from '../composables/useActiveGroupName';
import { ArrowPathIcon } from '@heroicons/vue/24/solid';

defineProps<{
  title?: string;
  showActiveGroup?: boolean;
}>();

const { activeGroupName } = useActiveGroupName();
const { triggerSync, isSyncing } = useSyncStatus();
</script>

<template>
  <nav class="bg-emerald-700 text-white sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
      <div class="flex-1">
        <h1 v-if="showActiveGroup && activeGroupName" class="text-2xl font-bold">Passa a régua - {{ activeGroupName }}</h1>
        <h1 v-else-if="showActiveGroup || title" class="text-2xl font-bold">Passa a régua</h1>
        <slot v-else />
      </div>
      <button 
        @click="triggerSync"
        :disabled="isSyncing"
        class="ml-4 p-2 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        :title="isSyncing ? 'Sincronizando...' : 'Sincronizar agora'"
      >
        <ArrowPathIcon 
          :class="[
            'w-6 h-6',
            isSyncing && 'animate-spin'
          ]" 
        />
      </button>
    </div>
  </nav>
</template>
