import { computed } from 'vue';
import { useActiveGroup } from './useActiveGroup';
import { getGroup } from '../lib/storage';

export function useActiveGroupName() {
  const { activeGroupId } = useActiveGroup();

  const activeGroupName = computed(() => {
    if (!activeGroupId.value) {
      return 'Passa a régua';
    }
    const group = getGroup(activeGroupId.value);
    return group?.nome || 'Passa a régua';
  });

  return {
    activeGroupName
  };
}
