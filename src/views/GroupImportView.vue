<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { syncService } from '../lib/sync';
import { getGroups, setActiveGroupId } from '../lib/storage';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref<string | null>(null);
const success = ref(false);

onMounted(async () => {
  const groupId = route.params.id as string;
  
  if (!groupId) {
    error.value = 'ID do grupo inválido';
    loading.value = false;
    return;
  }

  try {
    const groupsBeforeImport = getGroups();
    await syncService.pullSpecificGroup(groupId);
    success.value = true;
    
    // Se não havia grupos, ativar o grupo importado como o primeiro
    if (groupsBeforeImport.length === 0) {
      setActiveGroupId(groupId);
    }
    
    // Aguardar 1.5 segundos para mostrar o sucesso, então redirecionar
    setTimeout(() => {
      router.push('/groups');
    }, 1500);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao importar grupo';
    loading.value = false;
  }
});

function goBack() {
  router.push('/groups');
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-lg shadow-lg p-8 text-center">
        <!-- Loading State -->
        <div v-if="loading && !error && !success" class="space-y-4">
          <ArrowPathIcon class="w-16 h-16 mx-auto text-emerald-500 animate-spin" />
          <h2 class="text-2xl font-bold text-gray-900">Importando grupo...</h2>
          <p class="text-gray-600">
            Baixando dados do servidor. Isso pode levar alguns segundos.
          </p>
        </div>

        <!-- Success State -->
        <div v-if="success" class="space-y-4">
          <CheckCircleIcon class="w-16 h-16 mx-auto text-emerald-500" />
          <h2 class="text-2xl font-bold text-gray-900">Grupo importado!</h2>
          <p class="text-gray-600">
            O grupo foi adicionado com sucesso à sua lista.
          </p>
          <p class="text-sm text-gray-500">
            Redirecionando...
          </p>
        </div>

        <!-- Error State -->
        <div v-if="error" class="space-y-4">
          <XCircleIcon class="w-16 h-16 mx-auto text-rose-500" />
          <h2 class="text-2xl font-bold text-gray-900">Erro ao importar</h2>
          <p class="text-gray-600">
            {{ error }}
          </p>
          <button
            @click="goBack"
            class="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
          >
            Voltar para Grupos
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
