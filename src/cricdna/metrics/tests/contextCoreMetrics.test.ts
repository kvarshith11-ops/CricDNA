import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import {
  PlayerMatchRecord,
  type PlayerMatchRecordProps,
} from '../../domain/models/PlayerMatchRecord'
import { MatchFormat, MatchResultType } from '../../domain/types/common'
import {
  MetricRunner,
  MetricStatus,
  loadDefaultMetricRegistry,
} from '../index'

const metadata = {
  schemaVersion: 'test',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
}

const contextMetricIds = [
  'context.matches',
  'context.formats',
  'context.teams',
  'context.opponents',
  'context.venues',
  'context.seasons',
  'context.home_matches',
  'context.away_matches',
  'context.neutral_matches',
] as const

const makeRecord = (
  matchId: string,
  overrides: Partial<PlayerMatchRecordProps['context']> = {},
  teamName = 'India',
  opponentName = 'Australia',
): PlayerMatchRecord => {
  return PlayerMatchRecord.create({
    identity: {
      playerId: 'p1',
      playerName: 'Player One',
      matchId,
      team: { id: teamName.toLowerCase(), name: teamName },
      opponent: { id: opponentName.toLowerCase(), name: opponentName },
    },
    context: {
      format: MatchFormat.ODI,
      matchDate: '2026-01-01',
      inningsPlayed: [1],
      matchResult: MatchResultType.Won,
      ...overrides,
    },
    batting: {
      innings: [],
    },
    bowling: {
      spells: [],
      wickets: [],
    },
    fielding: {
      innings: [],
    },
    behaviour: {
      captain: false,
      wicketKeeper: false,
      substitute: false,
      playerOfMatch: false,
      events: [],
    },
    progression: {
      battingTimeline: [],
      bowlingTimeline: [],
    },
    metadata,
  })
}

const makePkm = (records: readonly PlayerMatchRecord[]): PlayerKnowledgeModel => {
  return PlayerKnowledgeModel.fromRecords('p1', records, metadata, 'Player One')
}

const runContextMetrics = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: contextMetricIds,
  })
}

const parseMetricJson = (
  value: string | number | boolean | null | undefined,
): Record<string, number> => {
  if (typeof value !== 'string') {
    throw new Error('Expected metric value to be a JSON string.')
  }

  return JSON.parse(value) as Record<string, number>
}

describe('Context Core primitive metrics', () => {
  it('calculates single-format career context', () => {
    const pkm = makePkm([
      makeRecord('m1', {
        format: MatchFormat.ODI,
        matchDate: '2026-01-01',
        homeAwayNeutral: 'Home',
      }),
      makeRecord('m2', {
        format: MatchFormat.ODI,
        matchDate: '2026-02-01',
        homeAwayNeutral: 'Away',
      }),
    ])
    const metrics = runContextMetrics(pkm)

    expect(metrics.get('context.matches')?.value).toBe(2)
    expect(parseMetricJson(metrics.get('context.formats')?.value)).toEqual({ ODI: 2 })
    expect(metrics.get('context.home_matches')?.value).toBe(1)
    expect(metrics.get('context.away_matches')?.value).toBe(1)
  })

  it('calculates multi-format careers', () => {
    const pkm = makePkm([
      makeRecord('m1', { format: MatchFormat.ODI, matchDate: '2026-01-01' }),
      makeRecord('m2', { format: MatchFormat.T20, matchDate: '2026-01-02' }),
      makeRecord('m3', { format: MatchFormat.Test, matchDate: '2026-01-03' }),
      makeRecord('m4', { format: MatchFormat.T20, matchDate: '2026-01-04' }),
    ])
    const metrics = runContextMetrics(pkm)

    expect(parseMetricJson(metrics.get('context.formats')?.value)).toEqual({
      ODI: 1,
      T20: 2,
      Test: 1,
    })
  })

  it('calculates multiple opponents and teams', () => {
    const pkm = makePkm([
      makeRecord('m1', { matchDate: '2026-01-01' }, 'India', 'Australia'),
      makeRecord('m2', { matchDate: '2026-01-02' }, 'India', 'England'),
      makeRecord('m3', { matchDate: '2026-01-03' }, 'CSK', 'Australia'),
    ])
    const metrics = runContextMetrics(pkm)

    expect(parseMetricJson(metrics.get('context.teams')?.value)).toEqual({
      CSK: 1,
      India: 2,
    })
    expect(parseMetricJson(metrics.get('context.opponents')?.value)).toEqual({
      Australia: 2,
      England: 1,
    })
  })

  it('calculates venue distribution with unknown venues', () => {
    const pkm = makePkm([
      makeRecord('m1', {
        matchDate: '2026-01-01',
        venue: { ground: 'MCG', city: 'Melbourne', country: 'Australia' },
      }),
      makeRecord('m2', {
        matchDate: '2026-01-02',
        venue: { ground: 'MCG', city: 'Melbourne', country: 'Australia' },
      }),
      makeRecord('m3', {
        matchDate: '2026-01-03',
      }),
    ])
    const metrics = runContextMetrics(pkm)

    expect(parseMetricJson(metrics.get('context.venues')?.value)).toEqual({
      'MCG, Melbourne, Australia': 2,
      Unknown: 1,
    })
  })

  it('extracts seasons from match dates', () => {
    const pkm = makePkm([
      makeRecord('m1', { matchDate: '2025-12-31' }),
      makeRecord('m2', { matchDate: '2026-01-01' }),
      makeRecord('m3', { matchDate: '2026-06-01' }),
    ])
    const metrics = runContextMetrics(pkm)

    expect(parseMetricJson(metrics.get('context.seasons')?.value)).toEqual({
      '2025': 1,
      '2026': 2,
    })
  })

  it('calculates home away and neutral counts', () => {
    const pkm = makePkm([
      makeRecord('m1', { homeAwayNeutral: 'Home' }),
      makeRecord('m2', { homeAwayNeutral: 'Away', matchDate: '2026-01-02' }),
      makeRecord('m3', { homeAwayNeutral: 'Neutral', matchDate: '2026-01-03' }),
      makeRecord('m4', { homeAwayNeutral: 'Unknown', matchDate: '2026-01-04' }),
    ])
    const metrics = runContextMetrics(pkm)

    expect(metrics.get('context.home_matches')?.value).toBe(1)
    expect(metrics.get('context.away_matches')?.value).toBe(1)
    expect(metrics.get('context.neutral_matches')?.value).toBe(1)
  })

  it('returns validation failure for empty careers', () => {
    const pkm = PlayerKnowledgeModel.empty(
      { playerId: 'p1', playerName: 'Player One' },
      metadata,
    )
    const metrics = runContextMetrics(pkm)

    expect(metrics.get('context.matches')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('context.formats')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('returns validation failure for invalid dates', () => {
    const pkm = makePkm([makeRecord('m1', { matchDate: '2026-99-99' })])
    const metrics = runContextMetrics(pkm)

    expect(metrics.get('context.matches')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('context.seasons')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('returns validation failure for duplicate matches', () => {
    const pkm = makePkm([
      makeRecord('m1', { matchDate: '2026-01-01' }),
      makeRecord('m1', { matchDate: '2026-01-02' }),
    ])
    const metrics = runContextMetrics(pkm)

    expect(metrics.get('context.matches')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('is deterministic through runner execution', () => {
    const pkm = makePkm([
      makeRecord('m2', { format: MatchFormat.T20, matchDate: '2026-01-02' }),
      makeRecord('m1', { format: MatchFormat.ODI, matchDate: '2026-01-01' }),
    ])

    expect(runContextMetrics(pkm).toJSON()).toEqual(runContextMetrics(pkm).toJSON())
  })

  it('integrates with the default metric registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([
      makeRecord('m1', {
        format: MatchFormat.ODI,
        matchDate: '2026-01-01',
        homeAwayNeutral: 'Home',
      }),
    ])
    const metrics = new MetricRunner(registry).run({
      pkm,
      metricIds: ['context.matches', 'context.formats', 'context.home_matches'],
    })

    for (const metricId of contextMetricIds) {
      expect(registry.has(metricId)).toBe(true)
    }

    expect(metrics.get('context.matches')?.value).toBe(1)
    expect(parseMetricJson(metrics.get('context.formats')?.value)).toEqual({ ODI: 1 })
    expect(metrics.get('context.home_matches')?.value).toBe(1)
  })
})
