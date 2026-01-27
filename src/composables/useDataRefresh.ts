import { ref } from 'vue';

const refreshTrigger = ref(0);

export function useDataRefresh() {
  function triggerRefresh() {
    refreshTrigger.value++;
  }

  return {
    refreshTrigger,
    triggerRefresh
  };
}
