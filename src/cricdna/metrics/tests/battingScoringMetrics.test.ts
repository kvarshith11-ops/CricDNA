import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import {
  PlayerMatchRecord,
  type PlayerMatchRecordProps,
} from '../../domain/models/PlayerMatchRecord'
import { DismissalKind, MatchFormat, MatchResultType } from '../../domain/types/common'
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

const scoringMetricIds = [
  'bat.strike_rate',
  'bat.boundary_runs',
  'bat.boundary_percentage',
  'bat.boundary_frequency',
  'bat.runs_per_ball',
  'bat.runs_per_boundary',
  'bat.fours',
  'bat.sixes',
  'bat.fours_percentage',
  'bat.sixes_percentage',
] as const

const makeRecord = (
  matchId: string,
  matchDate: string,
  innings: PlayerMatchRecordProps['batting']['innings'],
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
      matchDate,
      inningsPlayed: innings.map((inning) => inning.inningsNumber),
      matchResult: MatchResultType.Won,
    },
    batting: {
      innings,
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

const runScoringMetrics = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: scoringMetricIds,
  })
}

describe('Batting Scoring primitive metrics', () => {
  it('calculates normal career scoring metrics', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 60,
          ballsFaced: 50,
          fours: 6,
          sixes: 2,
          dismissal: { kind: DismissalKind.Caught },
        },
      ]),
      makeRecord('m2', '2026-01-02', [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          didBat: true,
          runs: 40,
          ballsFaced: 30,
          fours: 4,
          sixes: 1,
          dismissal: { kind: DismissalKind.NotOut },
        },
      ]),
    ])
    const metrics = runScoringMetrics(pkm)

    expect(metrics.get('bat.strike_rate')?.value).toBe(125)
    expect(metrics.get('bat.boundary_runs')?.value).toBe(58)
    expect(metrics.get('bat.boundary_percentage')?.value).toBeCloseTo(58)
    expect(metrics.get('bat.boundary_frequency')?.value).toBeCloseTo(80 / 13)
    expect(metrics.get('bat.runs_per_ball')?.value).toBe(1.25)
    expect(metrics.get('bat.runs_per_boundary')?.value).toBeCloseTo(100 / 13)
    expect(metrics.get('bat.fours')?.value).toBe(10)
    expect(metrics.get('bat.sixes')?.value).toBe(3)
    expect(metrics.get('bat.fours_percentage')?.value).toBe(40)
    expect(metrics.get('bat.sixes_percentage')?.value).toBe(18)
  })

  it('handles boundary-heavy innings', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 80,
          ballsFaced: 40,
          fours: 5,
          sixes: 10,
        },
      ]),
    ])
    const metrics = runScoringMetrics(pkm)

    expect(metrics.get('bat.boundary_runs')?.value).toBe(80)
    expect(metrics.get('bat.boundary_percentage')?.value).toBe(100)
    expect(metrics.get('bat.boundary_frequency')?.value).toBeCloseTo(40 / 15)
  })

  it('handles no boundaries without divide-by-zero errors', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 25,
          ballsFaced: 50,
          fours: 0,
          sixes: 0,
        },
      ]),
    ])
    const metrics = runScoringMetrics(pkm)

    expect(metrics.get('bat.boundary_runs')?.value).toBe(0)
    expect(metrics.get('bat.boundary_percentage')?.value).toBe(0)
    expect(metrics.get('bat.boundary_frequency')?.status).toBe(MetricStatus.MissingData)
    expect(metrics.get('bat.runs_per_boundary')?.status).toBe(MetricStatus.MissingData)
  })

  it('handles zero balls safely', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
        },
      ]),
    ])
    const metrics = runScoringMetrics(pkm)

    expect(metrics.get('bat.strike_rate')?.status).toBe(MetricStatus.MissingData)
    expect(metrics.get('bat.runs_per_ball')?.status).toBe(MetricStatus.MissingData)
  })

  it('handles zero runs safely', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 0,
          ballsFaced: 18,
          fours: 0,
          sixes: 0,
        },
      ]),
    ])
    const metrics = runScoringMetrics(pkm)

    expect(metrics.get('bat.boundary_percentage')?.status).toBe(MetricStatus.MissingData)
    expect(metrics.get('bat.fours_percentage')?.status).toBe(MetricStatus.MissingData)
    expect(metrics.get('bat.sixes_percentage')?.status).toBe(MetricStatus.MissingData)
    expect(metrics.get('bat.strike_rate')?.value).toBe(0)
  })

  it('handles large careers deterministically', () => {
    const records = Array.from({ length: 100 }, (_, index) =>
      makeRecord(`m${index + 1}`, `2026-02-${String((index % 28) + 1).padStart(2, '0')}`, [
        {
          inningsId: `i${index + 1}`,
          inningsNumber: 1,
          didBat: true,
          runs: 30,
          ballsFaced: 24,
          fours: 3,
          sixes: 1,
        },
      ]),
    )
    const metrics = runScoringMetrics(makePkm(records))

    expect(metrics.get('bat.strike_rate')?.value).toBe(125)
    expect(metrics.get('bat.boundary_runs')?.value).toBe(1800)
    expect(metrics.get('bat.fours')?.value).toBe(300)
    expect(metrics.get('bat.sixes')?.value).toBe(100)
  })

  it('returns validation failure for negative scoring values', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 20,
          ballsFaced: 18,
          fours: -1,
          sixes: 0,
        },
      ]),
    ])
    const metrics = runScoringMetrics(pkm)

    expect(metrics.get('bat.fours')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('returns validation failure when boundary runs exceed total runs', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 10,
          ballsFaced: 20,
          fours: 3,
          sixes: 0,
        },
      ]),
    ])
    const metrics = runScoringMetrics(pkm)

    expect(metrics.get('bat.boundary_runs')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('bat.boundary_percentage')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('returns validation failure for empty careers', () => {
    const pkm = PlayerKnowledgeModel.empty(
      { playerId: 'p1', playerName: 'Player One' },
      metadata,
    )
    const metrics = runScoringMetrics(pkm)

    expect(metrics.get('bat.strike_rate')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('bat.strike_rate')?.value).toBeNull()
  })

  it('is deterministic through runner execution', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 72,
          ballsFaced: 48,
          fours: 6,
          sixes: 4,
        },
      ]),
    ])

    expect(runScoringMetrics(pkm).toJSON()).toEqual(runScoringMetrics(pkm).toJSON())
  })

  it('integrates with the default metric registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 48,
          ballsFaced: 40,
          fours: 6,
          sixes: 1,
        },
      ]),
    ])
    const metrics = new MetricRunner(registry).run({
      pkm,
      metricIds: ['bat.strike_rate', 'bat.boundary_runs'],
    })

    for (const metricId of scoringMetricIds) {
      expect(registry.has(metricId)).toBe(true)
    }

    expect(metrics.get('bat.strike_rate')?.status).toBe(MetricStatus.Success)
    expect(metrics.get('bat.boundary_runs')?.value).toBe(30)
  })
})
