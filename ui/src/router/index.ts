import { createRouter, createWebHashHistory } from 'vue-router'
import Network from '@/views/Network.vue'
import Settings from '@/views/Settings.vue'

const routes = [
  {
    path: '/',
    redirect: '/network',
  },
  {
    path: '/network',
    name: 'Network',
    component: Network,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
