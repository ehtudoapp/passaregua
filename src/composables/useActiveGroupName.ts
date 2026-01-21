import { computed } from 'vue';
import { useActiveGroup } from './useActiveGroup';
import { getGroup } from '../lib/storage';

export function useActiveGroupName() {
  const { activeGroupId } = useActiveGroup();

  const activeGroupName = computed(() => {
    if (!activeGroupId.value) {
      return null;
    }
    const group = getGroup(activeGroupId.value);
    return group?.nome || null;
  });

  return {
    activeGroupName
  };
}
