import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index'
import 'bootstrap/dist/css/bootstrap.css'

// createApp(App).mount('#app')
const app = createApp(App)
app.use(router)
app.mount('#app')