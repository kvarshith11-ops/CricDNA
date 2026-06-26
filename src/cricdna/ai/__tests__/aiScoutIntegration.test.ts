import { describe, expect, it } from 'vitest'
import { MatchFormat, MatchResultType } from '../../domain'
import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricResult,
} from '../../metrics'
import type { PlayerProfile } from '../../profile'
import { TraitCategory, TraitStatus, type TraitResult } from '../../traits'
import { buildAIScoutPrompt } from '../AIScoutPromptBuilder'
import type { AIScoutResponse } from '../AIScoutResponseSchema'
import {
  validateAIScoutResponse,
  validateAIScoutResponseJson,
} from '../AIScoutValidator'

const metric = (
  metricId: string,
  level: MetricLevel,
  category: MetricCategory,
  value: number,
): MetricResult => ({
  metricId,
  name: metricId,
  category,
  level,
  value,
  unit: 'score',
  sampleSize: 5,
  confidence: 1,
  status: MetricStatus.Success,
  version: '1.0.0',
  metadata: {},
})

const trait = (): TraitResult => ({
  traitId: 'trait.batting_style',
  traitName: 'Batting Style',
  category: TraitCategory.Batting,
  classification: 'Aggressive Stroke Player',
  confidence: 1,
  supportingMetrics: [{ metricId: 'bat.intent', value: 82 }],
  explanation: 'Classified from deterministic composite metrics.',
  status: TraitStatus.Success,
  version: '1.0.0',
})

const profile: PlayerProfile = {
  identity: {
    playerId: 'p1',
    playerName: 'Player One',
    country: 'India',
    role: 'batter',
    primaryTeam: { id: 'team-a', name: 'Team A' },
  },
  headlineStats: {
    matches: 5,
    runs: 250,
    wickets: 0,
    catches: 3,
    battingAverage: 50,
    strikeRate: 130,
    economy: null,
    bestScore: 91,
    bestBowling: null,
  },
  recentMatches: [
    {
      matchId: 'm1',
      date: '2026-06-01',
      format: MatchFormat.ODI,
      team: { id: 'team-a', name: 'Team A' },
      opponent: { id: 'team-b', name: 'Team B' },
      result: MatchResultType.Won,
      runs: 91,
      wickets: null,
      catches: 1,
    },
  ],
  primitiveMetrics: {
    'bat.runs': metric('bat.runs', MetricLevel.Primitive, MetricCategory.Batting, 250),
  },
  compositeMetrics: {
    'bat.intent': metric('bat.intent', MetricLevel.Composite, MetricCategory.Batting, 82),
  },
  traits: {
    'trait.batting_style': trait(),
  },
  metadata: {
    engineVersion: 'test-engine',
    generatedAt: '2026-06-27T00:00:00.000Z',
    sampleSize: 5,
    supportedMetricCount: 2,
    supportedCompositeCount: 1,
    supportedTraitCount: 1,
  },
}

const validResponse: AIScoutResponse = {
  ratings: {
    batting: {
      score: 84,
      explanation: 'Batting score is based on supplied run volume and intent evidence.',
    },
    bowling: {
      score: 10,
      explanation: 'Bowling score is low because the supplied profile has no bowling evidence.',
    },
    fielding: {
      score: 55,
      explanation: 'Fielding score uses supplied catches and fielding evidence.',
    },
    overall: {
      score: 78,
      explanation: 'Overall score combines the supplied evidence without inventing data.',
    },
  },
  batting: 'Strong batting evidence from supplied deterministic metrics.',
  bowling: 'Limited bowling evidence supplied.',
  fielding: 'Some fielding contribution is visible in supplied evidence.',
  overall: 'Profile indicates a batting-led player based only on supplied data.',
  dnaScore: {
    score: 80,
    explanation: 'DNA score reflects supplied deterministic profile evidence.',
  },
  strengths: ['Uses supplied batting intent evidence well.'],
  developmentAreas: ['Needs more supplied bowling evidence before evaluation.'],
  roleSuitability: [
    {
      role: 'batter',
      suitability: 88,
      explanation: 'Suitability follows supplied batting profile and batting trait.',
    },
  ],
  scoutingReport: 'Deterministic evidence supports a batting-led evaluation.',
  confidence: {
    score: 75,
    explanation: 'Confidence is based on available supplied metrics and traits.',
  },
}

describe('AI Scout integration layer', () => {
  it('builds a structured LLM prompt from PlayerProfile evidence', () => {
    const prompt = buildAIScoutPrompt({ profile })

    expect(prompt.system).toContain('elite professional cricket scout')
    expect(prompt.system).toContain('Do not invent statistics')
    expect(prompt.system).toContain('Return JSON only')
    expect(prompt.user).toContain('"playerProfile"')
    expect(prompt.user).toContain('"expectedResponseSchema"')
    expect(prompt.user).toContain('"playerId": "p1"')
  })

  it('validates a valid AI response', () => {
    const validation = validateAIScoutResponse(validResponse)

    expect(validation.valid).toBe(true)
    expect(validation.errors).toEqual([])
    expect(validation.response?.ratings.batting.score).toBe(84)
  })

  it('validates a valid JSON AI response', () => {
    const validation = validateAIScoutResponseJson(JSON.stringify(validResponse))

    expect(validation.valid).toBe(true)
    expect(validation.response?.scoutingReport).toBe(
      'Deterministic evidence supports a batting-led evaluation.',
    )
  })

  it('rejects invalid JSON', () => {
    const validation = validateAIScoutResponseJson('{not-json')

    expect(validation.valid).toBe(false)
    expect(validation.errors).toEqual(['AI Scout response is not valid JSON.'])
  })

  it('rejects missing fields', () => {
    const validation = validateAIScoutResponse({
      ...validResponse,
      ratings: undefined,
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain("Missing or invalid 'ratings'.")
  })

  it('rejects invalid rating ranges', () => {
    const validation = validateAIScoutResponse({
      ...validResponse,
      ratings: {
        ...validResponse.ratings,
        batting: {
          ...validResponse.ratings.batting,
          score: 101,
        },
      },
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain(
      "'ratings.batting.score' must be a number between 0 and 100.",
    )
  })

  it('rejects missing scouting report and explanations', () => {
    const validation = validateAIScoutResponse({
      ...validResponse,
      scoutingReport: '',
      dnaScore: {
        score: 80,
        explanation: '',
      },
      roleSuitability: [
        {
          role: 'batter',
          suitability: 90,
          explanation: '',
        },
      ],
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain("Missing or empty 'scoutingReport'.")
    expect(validation.errors).toContain("Missing or empty 'dnaScore.explanation'.")
    expect(validation.errors).toContain(
      "Missing or empty 'roleSuitability.0.explanation'.",
    )
  })

  it('rejects invalid schema shapes', () => {
    const validation = validateAIScoutResponse({
      ...validResponse,
      strengths: ['Valid strength', ''],
      confidence: {
        score: -1,
        explanation: 'Invalid score.',
      },
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain("'strengths.1' must be a non-empty string.")
    expect(validation.errors).toContain(
      "'confidence.score' must be a number between 0 and 100.",
    )
  })
})
