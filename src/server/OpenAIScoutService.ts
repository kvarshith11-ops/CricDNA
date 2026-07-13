import {
  AI_SCOUT_RESPONSE_SCHEMA,
  type AIScoutPrompt,
} from '../cricdna/ai'

interface OpenAIResponseContent {
  readonly type?: string
  readonly text?: string
}

interface OpenAIResponseOutput {
  readonly type?: string
  readonly content?: readonly OpenAIResponseContent[]
}

interface OpenAIResponsesApiResult {
  readonly output_text?: string
  readonly output?: readonly OpenAIResponseOutput[]
  readonly error?: {
    readonly message?: string
  }
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-4.1-mini'
const REQUEST_TIMEOUT_MS = 60_000

export class OpenAIScoutService {
  async generateScoutReport(prompt: AIScoutPrompt): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content: prompt.system,
            },
            {
              role: 'user',
              content: prompt.user,
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'cricdna_ai_scout_response',
              strict: true,
              schema: AI_SCOUT_RESPONSE_SCHEMA,
            },
          },
        }),
        signal: controller.signal,
      })

      const payload = (await response.json()) as OpenAIResponsesApiResult

      if (!response.ok) {
        throw new Error(payload.error?.message || 'OpenAI Responses API request failed.')
      }

      return extractResponseText(payload)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OpenAI request timed out.', { cause: error })
      }

      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}

const extractResponseText = (payload: OpenAIResponsesApiResult): string => {
  if (payload.output_text?.trim()) {
    return payload.output_text
  }

  for (const output of payload.output ?? []) {
    for (const content of output.content ?? []) {
      if (content.text?.trim()) {
        return content.text
      }
    }
  }

  throw new Error('OpenAI response did not include JSON text.')
}
