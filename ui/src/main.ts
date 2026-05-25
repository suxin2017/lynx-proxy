import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useWsConnectionStore } from '@/stores'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const wsConnectionStore = useWsConnectionStore(pinia)
wsConnectionStore.bootstrap()

app.mount('#app')

