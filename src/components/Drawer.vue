<script setup lang="ts">
import { watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  position?: 'left' | 'right';
  widthClass?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Prevent body scroll when drawer is open
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

function closeDrawer() {
  emit('update:modelValue', false);
}
</script>

<template>
  <Teleport to="body">
    <!-- Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black/50 z-40"
        @click="closeDrawer"
      />
    </Transition>

    <!-- Drawer -->
    <Transition
      enter-active-class="transition-transform duration-300"
      :enter-from-class="position === 'left' ? '-translate-x-full' : 'translate-x-full'"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300"
      leave-from-class="translate-x-0"
      :leave-to-class="position === 'left' ? '-translate-x-full' : 'translate-x-full'"
    >
      <div
        v-if="modelValue"
        :class="[
          'fixed top-0 bottom-0 z-50 bg-white shadow-xl overflow-y-auto',
          position === 'left' ? 'left-0' : 'right-0',
          widthClass || 'w-full max-w-xl'
        ]"
      >
        <div class="flex flex-col h-full">
          <!-- Header slot or default header -->
          <div v-if="$slots.header" class="border-b border-gray-200">
            <slot name="header" :close="closeDrawer" />
          </div>
          
          <!-- Content -->
          <div class="flex-1 overflow-y-auto">
            <slot :close="closeDrawer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
