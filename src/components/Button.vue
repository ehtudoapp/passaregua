<script setup lang="ts">
defineProps<{
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'icon' | 'danger';
  disabled?: boolean;
}>();

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <button
    :type="type || 'button'"
    :disabled="disabled"
    :class="[
      'font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2',
      variant === 'primary' && 'px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-500',
      variant === 'secondary' && 'px-4 py-2 bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      variant === 'danger' && 'px-3 py-1 bg-rose-400 text-white hover:bg-rose-600 focus:ring-rose-500 text-sm',
      variant === 'icon' && 'p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
      !variant && 'px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-500',
      disabled && 'opacity-50 cursor-not-allowed'
    ]"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
