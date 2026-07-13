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

const averageMetricIds = ['bat.outs', 'bat.average', 'bat.ducks'] as const

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

const runAverageMetrics = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: averageMetricIds,
  })
}

describe('Batting Average and Dismissal primitive metrics', () => {
  it('calculates normal career dismissal metrics', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 50,
          ballsFaced: 60,
          fours: 5,
          sixes: 1,
          dismissal: { kind: DismissalKind.Caught },
        },
      ]),
      makeRecord('m2', '2026-01-02', [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          didBat: true,
          runs: 30,
          ballsFaced: 44,
          fours: 3,
          sixes: 0,
          dismissal: { kind: DismissalKind.NotOut },
        },
      ]),
      makeRecord('m3', '2026-01-03', [
        {
          inningsId: 'i3',
          inningsNumber: 1,
          didBat: true,
          runs: 20,
          ballsFaced: 28,
          fours: 2,
          sixes: 0,
          dismissal: { kind: DismissalKind.Bowled },
        },
      ]),
    ])
    const metrics = runAverageMetrics(pkm)

    expect(metrics.get('bat.outs')?.value).toBe(2)
    expect(metrics.get('bat.average')?.value).toBe(50)
    expect(metrics.get('bat.ducks')?.value).toBe(0)
  })

  it('returns missing data for undismissed careers', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 70,
          ballsFaced: 80,
          fours: 7,
          sixes: 1,
          dismissal: { kind: DismissalKind.NotOut },
        },
      ]),
      makeRecord('m2', '2026-01-02', [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          didBat: true,
          runs: 25,
          ballsFaced: 32,
          fours: 2,
          sixes: 0,
        },
      ]),
    ])
    const metrics = runAverageMetrics(pkm)

    expect(metrics.get('bat.outs')?.value).toBe(0)
    expect(metrics.get('bat.average')?.status).toBe(MetricStatus.MissingData)
    expect(metrics.get('bat.average')?.value).toBeNull()
  })

  it('counts multiple ducks only when dismissed for zero', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 0,
          ballsFaced: 2,
          fours: 0,
          sixes: 0,
          dismissal: { kind: DismissalKind.Caught },
        },
      ]),
      makeRecord('m2', '2026-01-02', [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          didBat: true,
          runs: 0,
          ballsFaced: 1,
          fours: 0,
          sixes: 0,
          dismissal: { kind: DismissalKind.LBW },
        },
      ]),
      makeRecord('m3', '2026-01-03', [
        {
          inningsId: 'i3',
          inningsNumber: 1,
          didBat: true,
          runs: 0,
          ballsFaced: 4,
          fours: 0,
          sixes: 0,
          dismissal: { kind: DismissalKind.NotOut },
        },
      ]),
    ])
    const metrics = runAverageMetrics(pkm)

    expect(metrics.get('bat.outs')?.value).toBe(2)
    expect(metrics.get('bat.ducks')?.value).toBe(2)
    expect(metrics.get('bat.average')?.value).toBe(0)
  })

  it('handles zero batting innings in a non-empty career', () => {
    const pkm = makePkm([makeRecord('m1', '2026-01-01', [])])
    const metrics = runAverageMetrics(pkm)

    expect(metrics.get('bat.outs')?.value).toBe(0)
    expect(metrics.get('bat.ducks')?.value).toBe(0)
    expect(metrics.get('bat.average')?.status).toBe(MetricStatus.MissingData)
  })

  it('returns missing data for zero dismissals', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 10,
          ballsFaced: 12,
          fours: 1,
          sixes: 0,
        },
      ]),
    ])
    const metrics = runAverageMetrics(pkm)

    expect(metrics.get('bat.outs')?.value).toBe(0)
    expect(metrics.get('bat.average')?.status).toBe(MetricStatus.MissingData)
  })

  it('returns validation failure for negative runs', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: -1,
          ballsFaced: 12,
          fours: 0,
          sixes: 0,
          dismissal: { kind: DismissalKind.Bowled },
        },
      ]),
    ])
    const metrics = runAverageMetrics(pkm)

    expect(metrics.get('bat.outs')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('bat.average')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('bat.ducks')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('returns validation failure for empty careers', () => {
    const pkm = PlayerKnowledgeModel.empty(
      { playerId: 'p1', playerName: 'Player One' },
      metadata,
    )
    const metrics = runAverageMetrics(pkm)

    expect(metrics.get('bat.outs')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('bat.average')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('bat.ducks')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('is deterministic through runner execution', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 42,
          ballsFaced: 50,
          fours: 4,
          sixes: 1,
          dismissal: { kind: DismissalKind.Stumped },
        },
      ]),
    ])

    expect(runAverageMetrics(pkm).toJSON()).toEqual(runAverageMetrics(pkm).toJSON())
  })

  it('integrates with the default metric registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 18,
          ballsFaced: 25,
          fours: 2,
          sixes: 0,
          dismissal: { kind: DismissalKind.RunOut },
        },
      ]),
    ])
    const metrics = new MetricRunner(registry).run({
      pkm,
      metricIds: ['bat.outs', 'bat.average', 'bat.ducks'],
    })

    for (const metricId of averageMetricIds) {
      expect(registry.has(metricId)).toBe(true)
    }

    expect(metrics.get('bat.outs')?.status).toBe(MetricStatus.Success)
    expect(metrics.get('bat.average')?.value).toBe(18)
  })
})
