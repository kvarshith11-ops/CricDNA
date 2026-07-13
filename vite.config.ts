import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cricDnaApiRoutes } from './src/server/routes'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? env.OPENAI_API_KEY
  process.env.OPENAI_MODEL = process.env.OPENAI_MODEL ?? env.OPENAI_MODEL

  return {
    plugins: [react(), cricDnaApiRoutes()],
    server: {
      host: '0.0.0.0',
    },
  }
})
