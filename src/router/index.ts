import { createRouter, createWebHistory } from 'vue-router';
import { getActiveGroupId } from '../lib/storage';
import GroupsView from '../views/GroupsView.vue';
import GroupImportView from '../views/GroupImportView.vue';
import ExpensesView from '../views/ExpensesView.vue';
import BalancesView from '../views/BalancesView.vue';
import SettingsView from '../views/SettingsView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => {
        // Redirect to /expenses if there's an active group, otherwise to /groups
        const activeGroupId = getActiveGroupId();
        return activeGroupId ? '/expenses' : '/groups';
      }
    },
    {
      path: '/groups',
      name: 'groups',
      component: GroupsView
    },
    {
      path: '/groups/:id',
      name: 'group-import',
      component: GroupImportView
    },
    {
      path: '/expenses',
      name: 'expenses',
      component: ExpensesView
    },
    {
      path: '/balances',
      name: 'balances',
      component: BalancesView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ]
});

export default router;
