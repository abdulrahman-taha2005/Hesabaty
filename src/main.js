import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initStorage } from './storage'

async function startApp() {
  await initStorage()
  createApp(App).mount('#app')
}

startApp()
