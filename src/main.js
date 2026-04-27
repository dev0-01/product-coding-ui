import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { createRouter, createWebHistory } from 'vue-router'
import 'primeicons/primeicons.css'
import './style.css'
import App from './App.vue'
import { routes } from './routes.js'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark-mode',
    },
  },
})

app.use(router)
app.mount('#app')
