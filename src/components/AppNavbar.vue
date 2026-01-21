<script setup lang="ts">
import { useRoute } from 'vue-router';
import { 
  Bars3Icon, 
  BanknotesIcon, 
  Cog6ToothIcon, 
  UserGroupIcon 
} from '@heroicons/vue/24/solid';

const route = useRoute();

// Helper function to check if a route is active
function isActiveRoute(path: string): boolean {
  return route.path === path;
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
    <div class="flex justify-around max-w-4xl mx-auto">
      <router-link
        to="/expenses"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          isActiveRoute('/expenses') ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <Bars3Icon class="w-6 h-6" />
        <p class="text-xs">Despesas</p>
      </router-link>
      <router-link
        to="/balances"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          isActiveRoute('/balances') ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <BanknotesIcon class="w-6 h-6" />
        <p class="text-xs">Saldos</p>
      </router-link>
      <router-link
        to="/settings"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          isActiveRoute('/settings') ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <Cog6ToothIcon class="w-6 h-6" />
        <p class="text-xs">Config</p>
      </router-link>
      <router-link
        to="/groups"
        :class="[
          'flex-1 py-3 px-3 flex flex-col items-center gap-1 border-t-2 transition',
          isActiveRoute('/groups') ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        <UserGroupIcon class="w-6 h-6" />
        <p class="text-xs">Grupos</p>
      </router-link>
    </div>
  </nav>
</template>
