<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<template>
  <nav class="bg-emerald-700 text-white sticky top-0 z-50">
    <div class="max-w-4xl mx-auto px-4 py-4">
      <h1 v-if="title" class="text-2xl font-bold">{{ title }}</h1>
      <slot v-else />
    </div>
  </nav>
</template>
