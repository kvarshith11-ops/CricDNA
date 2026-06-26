import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cricDnaApiRoutes } from './src/server/routes'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cricDnaApiRoutes()],
})
