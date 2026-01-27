<script setup lang="ts">
import Toast from './components/Toast.vue';
import { useToast } from './composables/useToast';

const { toasts, removeToast } = useToast();
</script>

<template>
  <router-view />
  
  <!-- Toast notifications - apenas o último -->
  <Toast
    v-if="toasts.length > 0"
    :message="toasts[toasts.length - 1].message"
    :type="toasts[toasts.length - 1].type"
    :show="true"
    @close="removeToast(toasts[toasts.length - 1].id)"
  />
</template>

