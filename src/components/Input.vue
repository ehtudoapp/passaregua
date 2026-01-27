<script setup lang="ts">
defineProps<{
  modelValue?: string | number;
  placeholder?: string;
  type?: string;
  error?: string;
  label?: string;
  disabled?: boolean;
  readonly?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: string | number];
}>();
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
    </label>
    <input
      :value="modelValue"
      :type="type || 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :class="[
        'w-full px-3 py-2 border-2 rounded-lg transition text-sm focus:outline-none',
        error 
          ? 'border-rose-500 focus:border-rose-600' 
          : 'border-gray-300 focus:border-emerald-500',
        disabled && 'bg-gray-100 cursor-not-allowed',
        readonly && 'bg-gray-50 cursor-default'
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="mt-1 text-sm text-rose-600">
      {{ error }}
    </p>
  </div>
</template>
