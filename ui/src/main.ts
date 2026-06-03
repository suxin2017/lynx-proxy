import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore, useWsConnectionStore } from '@/stores'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const authStore = useAuthStore(pinia)
const wsConnectionStore = useWsConnectionStore(pinia)

void authStore.bootstrap().then(() => {
  if (!authStore.needsLogin) {
    wsConnectionStore.bootstrap()
  }
})

app.mount('#app')

