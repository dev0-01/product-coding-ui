import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import Tooltip from 'primevue/tooltip'
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

app.directive('tooltip', Tooltip)

app.use(router)
app.mount('#app')
