<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { 
  Bars3Icon, 
  BanknotesIcon, 
  Cog6ToothIcon, 
  UserGroupIcon 
} from '@heroicons/vue/24/solid';

const route = useRoute();

// Compute active nav based on current route
const activeNav = computed(() => {
  const path = route.path;
  if (path === '/groups') return 'groups';
  if (path === '/expenses') return 'transactions';
  if (path === '/balances') return 'totals';
  if (path === '/settings') return 'settings';
  return 'transactions';
});
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
    <div class="flex justify-around max-w-4xl mx-auto">
      <router-link
        to="/expenses"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          activeNav === 'transactions' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <Bars3Icon class="w-6 h-6" />
        <p class="text-xs">Despesas</p>
      </router-link>
      <router-link
        to="/balances"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          activeNav === 'totals' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <BanknotesIcon class="w-6 h-6" />
        <p class="text-xs">Saldos</p>
      </router-link>
      <router-link
        to="/settings"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          activeNav === 'settings' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <Cog6ToothIcon class="w-6 h-6" />
        <p class="text-xs">Config</p>
      </router-link>
      <router-link
        to="/groups"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          activeNav === 'groups' ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <UserGroupIcon class="w-6 h-6" />
        <p class="text-xs">Grupos</p>
      </router-link>
    </div>
  </nav>
</template>
