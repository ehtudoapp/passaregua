<script setup lang="ts">
import { useActiveGroupName } from '../composables/useActiveGroupName';

defineProps<{
  title?: string;
  showActiveGroup?: boolean;
}>();

const { activeGroupName } = useActiveGroupName();
</script>

<template>
  <nav class="bg-emerald-700 text-white sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 py-4">
      <h1 v-if="showActiveGroup" class="text-2xl font-bold">{{ title }} - {{ activeGroupName }}</h1>
      <h1 v-else-if="title" class="text-2xl font-bold">{{ title }}</h1>
      <slot v-else />
    </div>
  </nav>
</template>
