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

const fieldingMetricIds = [
  'field.matches',
  'field.innings',
  'field.catches',
  'field.stumpings',
  'field.run_outs',
  'field.assisted_run_outs',
  'field.dismissals',
] as const

const makeRecord = (
  matchId: string,
  matchDate: string,
  innings: PlayerMatchRecordProps['fielding']['innings'],
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
      innings: [],
    },
    bowling: {
      spells: [],
      wickets: [],
    },
    fielding: {
      innings,
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

const runFieldingMetrics = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: fieldingMetricIds,
  })
}

describe('Fielding Core primitive metrics', () => {
  it('calculates normal career fielding metrics', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          catches: 2,
          stumpings: 0,
          runOutsDirect: 1,
          runOutsAssisted: 0,
        },
      ]),
      makeRecord('m2', '2026-01-02', [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          catches: 1,
          stumpings: 1,
          runOutsDirect: 0,
          runOutsAssisted: 2,
        },
      ]),
    ])
    const metrics = runFieldingMetrics(pkm)

    expect(metrics.get('field.matches')?.value).toBe(2)
    expect(metrics.get('field.innings')?.value).toBe(2)
    expect(metrics.get('field.catches')?.value).toBe(3)
    expect(metrics.get('field.stumpings')?.value).toBe(1)
    expect(metrics.get('field.run_outs')?.value).toBe(1)
    expect(metrics.get('field.assisted_run_outs')?.value).toBe(2)
    expect(metrics.get('field.dismissals')?.value).toBe(7)
  })

  it('handles keeper careers', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          catches: 3,
          stumpings: 2,
          runOutsDirect: 0,
          runOutsAssisted: 1,
          byesConceded: 4,
        },
      ]),
    ])
    const metrics = runFieldingMetrics(pkm)

    expect(metrics.get('field.catches')?.value).toBe(3)
    expect(metrics.get('field.stumpings')?.value).toBe(2)
    expect(metrics.get('field.dismissals')?.value).toBe(6)
  })

  it('handles pure catching careers', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          catches: 4,
          stumpings: 0,
          runOutsDirect: 0,
          runOutsAssisted: 0,
        },
      ]),
    ])
    const metrics = runFieldingMetrics(pkm)

    expect(metrics.get('field.catches')?.value).toBe(4)
    expect(metrics.get('field.dismissals')?.value).toBe(4)
  })

  it('handles run-out specialists', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          catches: 0,
          stumpings: 0,
          runOutsDirect: 2,
          runOutsAssisted: 3,
        },
      ]),
    ])
    const metrics = runFieldingMetrics(pkm)

    expect(metrics.get('field.run_outs')?.value).toBe(2)
    expect(metrics.get('field.assisted_run_outs')?.value).toBe(3)
    expect(metrics.get('field.dismissals')?.value).toBe(5)
  })

  it('handles missing fielding history in a non-empty career', () => {
    const pkm = makePkm([makeRecord('m1', '2026-01-01', [])])
    const metrics = runFieldingMetrics(pkm)

    expect(metrics.get('field.matches')?.value).toBe(0)
    expect(metrics.get('field.innings')?.value).toBe(0)
    expect(metrics.get('field.dismissals')?.value).toBe(0)
  })

  it('returns validation failure for empty careers', () => {
    const pkm = PlayerKnowledgeModel.empty(
      { playerId: 'p1', playerName: 'Player One' },
      metadata,
    )
    const metrics = runFieldingMetrics(pkm)

    expect(metrics.get('field.matches')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('field.dismissals')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('returns validation failure for negative counts', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          catches: -1,
          stumpings: 0,
          runOutsDirect: 0,
          runOutsAssisted: 0,
        },
      ]),
    ])
    const metrics = runFieldingMetrics(pkm)

    expect(metrics.get('field.catches')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('field.dismissals')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('is deterministic through runner execution', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          catches: 1,
          stumpings: 0,
          runOutsDirect: 1,
          runOutsAssisted: 1,
        },
      ]),
    ])

    expect(runFieldingMetrics(pkm).toJSON()).toEqual(runFieldingMetrics(pkm).toJSON())
  })

  it('integrates with the default metric registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          catches: 2,
          stumpings: 0,
          runOutsDirect: 0,
          runOutsAssisted: 0,
        },
      ]),
    ])
    const metrics = new MetricRunner(registry).run({
      pkm,
      metricIds: ['field.matches', 'field.catches', 'field.dismissals'],
    })

    for (const metricId of fieldingMetricIds) {
      expect(registry.has(metricId)).toBe(true)
    }

    expect(registry.has('fielding.catches')).toBe(false)
    expect(metrics.get('field.matches')?.value).toBe(1)
    expect(metrics.get('field.catches')?.value).toBe(2)
    expect(metrics.get('field.dismissals')?.value).toBe(2)
  })
})
