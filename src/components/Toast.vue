<script setup lang="ts">
import { computed } from 'vue';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/vue/24/solid';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  show: boolean;
}

const props = withDefaults(defineProps<ToastProps>(), {
  type: 'info'
});

const emit = defineEmits<{
  close: [];
}>();

const icon = computed(() => {
  switch (props.type) {
    case 'success':
      return CheckCircleIcon;
    case 'error':
      return XCircleIcon;
    default:
      return InformationCircleIcon;
  }
});

const bgColor = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-emerald-200 text-emerald-800';
    case 'error':
      return 'bg-rose-400 text-rose-900';
    default:
      return 'bg-sky-500 text-sky-950';
  }
});
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="show"
      :class="[
        'fixed bottom-20 left-4 right-4 z-50 rounded-lg shadow-lg p-4 flex items-center gap-3',
        bgColor
      ]"
    >
      <component :is="icon" class="w-6 h-6 flex-shrink-0" />
      <p class="flex-1 font-medium">{{ message }}</p>
      <button
        @click="emit('close')"
        class="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
        aria-label="Fechar"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>
