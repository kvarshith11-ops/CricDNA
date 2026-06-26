import type { ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { PlayerProfileController } from './PlayerProfileController'

export const cricDnaApiRoutes = (): Plugin => ({
  name: 'cricdna-local-api',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (!request.url || !request.url.startsWith('/api/player/')) {
        next()
        return
      }

      const routeMatch = request.url.match(/^\/api\/player\/([^/]+)\/profile(?:\?.*)?$/)

      if (!routeMatch) {
        next()
        return
      }

      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'Method not allowed.' })
        return
      }

      try {
        await readRequestBody(request)
        const playerId = decodeURIComponent(routeMatch[1] ?? '')
        const result = await new PlayerProfileController().createProfile(playerId)

        sendJson(response, result.status, result.body)
      } catch (error) {
        sendJson(response, 500, {
          error:
            error instanceof Error
              ? error.message
              : 'Unexpected API route failure.',
        })
      }
    })
  },
})

const readRequestBody = async (request: Connect.IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}

const sendJson = (
  response: ServerResponse,
  status: number,
  body: unknown,
): void => {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}
