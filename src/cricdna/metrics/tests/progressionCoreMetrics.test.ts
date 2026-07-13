import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import {
  PlayerMatchRecord,
  type PlayerMatchProgression,
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

const progressionMetricIds = [
  'progression.innings_progressions',
  'progression.run_progression_points',
  'progression.wicket_progression_points',
  'progression.progression_events',
] as const

const makeRecord = (
  matchId: string,
  progression: PlayerMatchProgression,
): PlayerMatchRecord => {
  return PlayerMatchRecord.create({
    identity: {
      playerId: 'p1',
      playerName: 'Player One',
      matchId,
      team: { id: 'team-a', name: 'Team A' },
      opponent: { id: 'team-b', name: 'Team B' },
    },
    context: {
      format: MatchFormat.ODI,
      matchDate: '2026-01-01',
      inningsPlayed: [1],
      matchResult: MatchResultType.Won,
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
    progression,
    metadata,
  })
}

const makePkm = (records: readonly PlayerMatchRecord[]): PlayerKnowledgeModel => {
  return PlayerKnowledgeModel.fromRecords('p1', records, metadata, 'Player One')
}

const runProgressionMetrics = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: progressionMetricIds,
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

describe('Progression Core primitive metrics', () => {
  it('calculates normal career progression metrics', () => {
    const pkm = makePkm([
      makeRecord('m1', {
        battingTimeline: [
          {
            ballRef: { inningsId: 'i1', over: 0, ballInOver: 1 },
            teamRuns: 1,
            playerRuns: 1,
          },
          {
            ballRef: { inningsId: 'i1', over: 0, ballInOver: 2 },
            teamRuns: 4,
            playerRuns: 4,
          },
        ],
        bowlingTimeline: [
          {
            ballRef: { inningsId: 'i2', over: 1, ballInOver: 1 },
            runsConcededToDate: 1,
            wicketsToDate: 0,
          },
        ],
      }),
    ])
    const metrics = runProgressionMetrics(pkm)

    expect(metrics.get('progression.run_progression_points')?.value).toBe(2)
    expect(metrics.get('progression.wicket_progression_points')?.value).toBe(1)
    expect(metrics.get('progression.progression_events')?.value).toBe(3)
    expect(
      parseMetricJson(metrics.get('progression.innings_progressions')?.value),
    ).toEqual({ i1: 2, i2: 1 })
  })

  it('handles empty progression history in a non-empty career', () => {
    const pkm = makePkm([
      makeRecord('m1', {
        battingTimeline: [],
        bowlingTimeline: [],
      }),
    ])
    const metrics = runProgressionMetrics(pkm)

    expect(metrics.get('progression.run_progression_points')?.value).toBe(0)
    expect(metrics.get('progression.wicket_progression_points')?.value).toBe(0)
    expect(metrics.get('progression.progression_events')?.value).toBe(0)
    expect(
      parseMetricJson(metrics.get('progression.innings_progressions')?.value),
    ).toEqual({})
  })

  it('handles multiple innings across batting and bowling timelines', () => {
    const pkm = makePkm([
      makeRecord('m1', {
        battingTimeline: [
          { ballRef: { inningsId: 'i1', over: 0, ballInOver: 1 } },
          { ballRef: { inningsId: 'i2', over: 0, ballInOver: 1 } },
        ],
        bowlingTimeline: [
          { ballRef: { inningsId: 'i2', over: 0, ballInOver: 2 } },
          { ballRef: { inningsId: 'i3', over: 0, ballInOver: 1 } },
        ],
      }),
    ])
    const metrics = runProgressionMetrics(pkm)

    expect(
      parseMetricJson(metrics.get('progression.innings_progressions')?.value),
    ).toEqual({ i1: 1, i2: 2, i3: 1 })
  })

  it('returns validation failure for duplicate progression points', () => {
    const pkm = makePkm([
      makeRecord('m1', {
        battingTimeline: [
          { ballRef: { inningsId: 'i1', over: 0, ballInOver: 1 } },
          { ballRef: { inningsId: 'i1', over: 0, ballInOver: 1 } },
        ],
        bowlingTimeline: [],
      }),
    ])
    const metrics = runProgressionMetrics(pkm)

    expect(metrics.get('progression.progression_events')?.status).toBe(
      MetricStatus.FailedValidation,
    )
  })

  it('returns validation failure for invalid over ordering', () => {
    const pkm = makePkm([
      makeRecord('m1', {
        battingTimeline: [
          { ballRef: { inningsId: 'i1', over: 1, ballInOver: 1 } },
          { ballRef: { inningsId: 'i1', over: 0, ballInOver: 6 } },
        ],
        bowlingTimeline: [],
      }),
    ])
    const metrics = runProgressionMetrics(pkm)

    expect(metrics.get('progression.run_progression_points')?.status).toBe(
      MetricStatus.FailedValidation,
    )
  })

  it('returns validation failure for empty careers', () => {
    const pkm = PlayerKnowledgeModel.empty(
      { playerId: 'p1', playerName: 'Player One' },
      metadata,
    )
    const metrics = runProgressionMetrics(pkm)

    expect(metrics.get('progression.progression_events')?.status).toBe(
      MetricStatus.FailedValidation,
    )
  })

  it('is deterministic through runner execution', () => {
    const pkm = makePkm([
      makeRecord('m1', {
        battingTimeline: [
          { ballRef: { inningsId: 'b', over: 0, ballInOver: 1 } },
          { ballRef: { inningsId: 'a', over: 0, ballInOver: 1 } },
        ],
        bowlingTimeline: [],
      }),
    ])

    expect(runProgressionMetrics(pkm).toJSON()).toEqual(
      runProgressionMetrics(pkm).toJSON(),
    )
  })

  it('integrates with the default metric registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([
      makeRecord('m1', {
        battingTimeline: [
          { ballRef: { inningsId: 'i1', over: 0, ballInOver: 1 } },
        ],
        bowlingTimeline: [],
      }),
    ])
    const metrics = new MetricRunner(registry).run({
      pkm,
      metricIds: [
        'progression.run_progression_points',
        'progression.progression_events',
      ],
    })

    for (const metricId of progressionMetricIds) {
      expect(registry.has(metricId)).toBe(true)
    }

    expect(metrics.get('progression.run_progression_points')?.value).toBe(1)
    expect(metrics.get('progression.progression_events')?.value).toBe(1)
  })
})
