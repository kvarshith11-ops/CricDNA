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

const runBattingMetrics = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: [
      'bat.matches',
      'bat.innings',
      'bat.runs',
      'bat.balls_faced',
      'bat.not_outs',
      'bat.highest_score',
      'bat.fifties',
      'bat.hundreds',
      'bat.double_hundreds',
    ],
  })
}

describe('Batting Volume primitive metrics', () => {
  it('calculates normal career batting volume metrics', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 75,
          ballsFaced: 90,
          fours: 8,
          sixes: 1,
          dismissal: { kind: DismissalKind.Caught },
        },
      ]),
      makeRecord('m2', '2026-01-02', [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          didBat: true,
          runs: 110,
          ballsFaced: 130,
          fours: 12,
          sixes: 2,
          dismissal: { kind: DismissalKind.NotOut },
        },
      ]),
    ])
    const metrics = runBattingMetrics(pkm)

    expect(metrics.get('bat.matches')?.value).toBe(2)
    expect(metrics.get('bat.innings')?.value).toBe(2)
    expect(metrics.get('bat.runs')?.value).toBe(185)
    expect(metrics.get('bat.balls_faced')?.value).toBe(220)
    expect(metrics.get('bat.not_outs')?.value).toBe(1)
    expect(metrics.get('bat.highest_score')?.value).toBe(110)
    expect(metrics.get('bat.fifties')?.value).toBe(1)
    expect(metrics.get('bat.hundreds')?.value).toBe(1)
    expect(metrics.get('bat.double_hundreds')?.value).toBe(0)
  })

  it('handles a single match career', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 49,
          ballsFaced: 60,
          fours: 5,
          sixes: 0,
          dismissal: { kind: DismissalKind.Bowled },
        },
      ]),
    ])
    const metrics = runBattingMetrics(pkm)

    expect(metrics.get('bat.matches')?.value).toBe(1)
    expect(metrics.get('bat.innings')?.value).toBe(1)
    expect(metrics.get('bat.highest_score')?.value).toBe(49)
  })

  it('handles multiple centuries and highest score', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 100,
          ballsFaced: 110,
          fours: 10,
          sixes: 1,
        },
      ]),
      makeRecord('m2', '2026-01-02', [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          didBat: true,
          runs: 210,
          ballsFaced: 250,
          fours: 22,
          sixes: 3,
        },
      ]),
      makeRecord('m3', '2026-01-03', [
        {
          inningsId: 'i3',
          inningsNumber: 1,
          didBat: true,
          runs: 145,
          ballsFaced: 170,
          fours: 15,
          sixes: 2,
        },
      ]),
    ])
    const metrics = runBattingMetrics(pkm)

    expect(metrics.get('bat.highest_score')?.value).toBe(210)
    expect(metrics.get('bat.hundreds')?.value).toBe(2)
    expect(metrics.get('bat.double_hundreds')?.value).toBe(1)
  })

  it('handles not outs represented by missing dismissal', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 33,
          ballsFaced: 40,
          fours: 3,
          sixes: 0,
        },
      ]),
    ])
    const metrics = runBattingMetrics(pkm)

    expect(metrics.get('bat.not_outs')?.value).toBe(1)
  })

  it('handles zero batting innings in a non-empty career', () => {
    const pkm = makePkm([makeRecord('m1', '2026-01-01', [])])
    const metrics = runBattingMetrics(pkm)

    expect(metrics.get('bat.matches')?.value).toBe(1)
    expect(metrics.get('bat.innings')?.value).toBe(0)
    expect(metrics.get('bat.runs')?.value).toBe(0)
    expect(metrics.get('bat.highest_score')?.value).toBe(0)
  })

  it('returns validation failure for empty careers', () => {
    const pkm = PlayerKnowledgeModel.empty(
      { playerId: 'p1', playerName: 'Player One' },
      metadata,
    )
    const metrics = runBattingMetrics(pkm)

    expect(metrics.get('bat.runs')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('bat.runs')?.value).toBeNull()
  })

  it('returns validation failure for invalid negative innings values', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: -1,
          ballsFaced: 10,
          fours: 0,
          sixes: 0,
        },
      ]),
    ])
    const metrics = runBattingMetrics(pkm)

    expect(metrics.get('bat.runs')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('is deterministic through runner execution', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 88,
          ballsFaced: 101,
          fours: 9,
          sixes: 1,
        },
      ]),
    ])

    expect(runBattingMetrics(pkm).toJSON()).toEqual(runBattingMetrics(pkm).toJSON())
  })

  it('integrates with the default metric registry', () => {
    const registry = loadDefaultMetricRegistry()

    expect(registry.has('bat.matches')).toBe(true)
    expect(registry.has('bat.innings')).toBe(true)
    expect(registry.has('bat.runs')).toBe(true)
    expect(registry.has('bat.balls_faced')).toBe(true)
    expect(registry.has('bat.not_outs')).toBe(true)
    expect(registry.has('bat.highest_score')).toBe(true)
    expect(registry.has('bat.fifties')).toBe(true)
    expect(registry.has('bat.hundreds')).toBe(true)
    expect(registry.has('bat.double_hundreds')).toBe(true)
  })
})
