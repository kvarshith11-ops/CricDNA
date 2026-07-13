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
          'Deterministic traits inside playerProfile.traits are the canonical source of truth and must not be replaced or renamed.',
          'dnaObservations are display-only scout interpretations of deterministic traits and metrics.',
          'Return 1 to 3 total dnaObservations across role-relevant groups only.',
          'Never put observations in dnaObservations.overall; it must always be an empty array.',
          'For batter profiles, use dnaObservations.batting only.',
          'For bowler profiles, use dnaObservations.bowling only.',
          'For all_rounder profiles, use dnaObservations.batting and dnaObservations.bowling only.',
          'For wicket_keeper profiles, use dnaObservations.batting and dnaObservations.fielding only; fielding observations should describe keeping where the evidence supports it.',
          'Every dnaObservation must cite supplied trait ids and/or metric ids, and include concise evidence from the supplied profile.',
          'Do not mention recent trend, improving/declining form, or latest-match movement inside dnaObservations; trend is displayed separately.',
          'Do not include internal metric ids such as bat.intent, bowl.control, or field.impact in dnaObservation.title, dnaObservation.summary, or evidence text.',
          'Write dnaObservation.title and dnaObservation.summary in plain cricket language for end users.',
          'Always include dnaObservations.batting, dnaObservations.bowling, dnaObservations.fielding, and dnaObservations.overall arrays; use an empty array for unsupported role groups rather than forcing content.',
          'Every explanation must reference supplied evidence.',
          'dnaScore.explanation must be a concise 35-60 word rationale explaining why the DNA score was assigned.',
          'scoutingReport must remain the broader analyst summary and should not repeat dnaScore.explanation.',
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
