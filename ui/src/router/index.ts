import { createRouter, createWebHistory } from 'vue-router'
import Network from '@/views/Network.vue'

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
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
