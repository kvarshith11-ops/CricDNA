import type { PlayerProfile } from '../profile'
import { AI_SCOUT_RESPONSE_SCHEMA } from './AIScoutResponseSchema'

export interface AIScoutPromptInput {
  readonly profile: PlayerProfile
}

export interface AIScoutPrompt {
  readonly system: string
  readonly user: string
}

export const buildAIScoutPrompt = (input: AIScoutPromptInput): AIScoutPrompt => {
  return {
    system: [
      'You are an elite professional cricket scout.',
      'You evaluate players only from the deterministic evidence package supplied by CricDNA.',
      'Do not invent statistics.',
      'Do not contradict supplied metrics, traits, or match evidence.',
      'Explain conclusions using only supplied evidence.',
      'Return JSON only. Do not include markdown, prose outside JSON, or code fences.',
    ].join('\n'),
    user: JSON.stringify(
      {
        task: 'Evaluate the player using only the deterministic PlayerProfile evidence.',
        constraints: [
          'All supplied analytics are deterministic.',
          'Do not compute new cricket metrics.',
          'Do not invent missing data.',
          'Do not contradict supplied metric values.',
          'Every explanation must reference supplied evidence.',
          'Return a JSON object matching the expected schema exactly.',
        ],
        expectedResponseSchema: AI_SCOUT_RESPONSE_SCHEMA,
        playerProfile: input.profile,
      },
      null,
      2,
    ),
  }
}
