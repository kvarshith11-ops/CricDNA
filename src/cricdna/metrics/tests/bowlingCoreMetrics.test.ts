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

const bowlingMetricIds = [
  'bowl.matches',
  'bowl.innings',
  'bowl.overs',
  'bowl.balls',
  'bowl.maidens',
  'bowl.runs_conceded',
  'bowl.wickets',
  'bowl.no_balls',
  'bowl.wides',
  'bowl.economy',
  'bowl.average',
  'bowl.strike_rate',
] as const

const makeRecord = (
  matchId: string,
  matchDate: string,
  spells: PlayerMatchRecordProps['bowling']['spells'],
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
      inningsPlayed: spells.map((spell) => spell.inningsNumber),
      matchResult: MatchResultType.Won,
    },
    batting: {
      innings: [],
    },
    bowling: {
      spells,
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

const runBowlingMetrics = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: bowlingMetricIds,
  })
}

describe('Bowling Core primitive metrics', () => {
  it('calculates normal career bowling metrics', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBowl: true,
          overs: 10,
          balls: 60,
          maidens: 1,
          runsConceded: 45,
          wickets: 2,
          noBalls: 1,
          wides: 2,
        },
      ]),
      makeRecord('m2', '2026-01-02', [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          didBowl: true,
          overs: 8,
          balls: 48,
          maidens: 0,
          runsConceded: 40,
          wickets: 1,
          noBalls: 0,
          wides: 1,
        },
      ]),
    ])
    const metrics = runBowlingMetrics(pkm)

    expect(metrics.get('bowl.matches')?.value).toBe(2)
    expect(metrics.get('bowl.innings')?.value).toBe(2)
    expect(metrics.get('bowl.overs')?.value).toBe(18)
    expect(metrics.get('bowl.balls')?.value).toBe(108)
    expect(metrics.get('bowl.maidens')?.value).toBe(1)
    expect(metrics.get('bowl.runs_conceded')?.value).toBe(85)
    expect(metrics.get('bowl.wickets')?.value).toBe(3)
    expect(metrics.get('bowl.no_balls')?.value).toBe(1)
    expect(metrics.get('bowl.wides')?.value).toBe(3)
    expect(metrics.get('bowl.economy')?.value).toBeCloseTo(85 / 18)
    expect(metrics.get('bowl.average')?.value).toBeCloseTo(85 / 3)
    expect(metrics.get('bowl.strike_rate')?.value).toBe(36)
  })

  it('handles a single spell', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBowl: true,
          overs: 4,
          balls: 24,
          maidens: 1,
          runsConceded: 12,
          wickets: 2,
          noBalls: 0,
          wides: 0,
        },
      ]),
    ])
    const metrics = runBowlingMetrics(pkm)

    expect(metrics.get('bowl.matches')?.value).toBe(1)
    expect(metrics.get('bowl.innings')?.value).toBe(1)
    expect(metrics.get('bowl.economy')?.value).toBe(3)
    expect(metrics.get('bowl.average')?.value).toBe(6)
    expect(metrics.get('bowl.strike_rate')?.value).toBe(12)
  })

  it('handles multiple spells and ignores didBowl false rows for totals', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBowl: true,
          overs: 5,
          balls: 30,
          maidens: 0,
          runsConceded: 20,
          wickets: 1,
          noBalls: 0,
          wides: 1,
        },
        {
          inningsId: 'i2',
          inningsNumber: 2,
          didBowl: true,
          overs: 3,
          balls: 18,
          maidens: 1,
          runsConceded: 9,
          wickets: 2,
          noBalls: 0,
          wides: 0,
        },
      ]),
      makeRecord('m2', '2026-01-02', [
        {
          inningsId: 'i3',
          inningsNumber: 1,
          didBowl: false,
          overs: 0,
          balls: 0,
          maidens: 0,
          runsConceded: 0,
          wickets: 0,
          noBalls: 0,
          wides: 0,
        },
      ]),
    ])
    const metrics = runBowlingMetrics(pkm)

    expect(metrics.get('bowl.matches')?.value).toBe(1)
    expect(metrics.get('bowl.innings')?.value).toBe(2)
    expect(metrics.get('bowl.overs')?.value).toBe(8)
    expect(metrics.get('bowl.balls')?.value).toBe(48)
    expect(metrics.get('bowl.runs_conceded')?.value).toBe(29)
    expect(metrics.get('bowl.wickets')?.value).toBe(3)
  })

  it('returns missing data for average and strike rate when wickets are zero', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBowl: true,
          overs: 6,
          balls: 36,
          maidens: 0,
          runsConceded: 30,
          wickets: 0,
          noBalls: 0,
          wides: 2,
        },
      ]),
    ])
    const metrics = runBowlingMetrics(pkm)

    expect(metrics.get('bowl.wickets')?.value).toBe(0)
    expect(metrics.get('bowl.economy')?.value).toBe(5)
    expect(metrics.get('bowl.average')?.status).toBe(MetricStatus.MissingData)
    expect(metrics.get('bowl.average')?.value).toBeNull()
    expect(metrics.get('bowl.strike_rate')?.status).toBe(MetricStatus.MissingData)
  })

  it('returns validation failure for empty careers', () => {
    const pkm = PlayerKnowledgeModel.empty(
      { playerId: 'p1', playerName: 'Player One' },
      metadata,
    )
    const metrics = runBowlingMetrics(pkm)

    expect(metrics.get('bowl.matches')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('bowl.economy')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('returns missing data for economy when no balls were bowled', () => {
    const pkm = makePkm([makeRecord('m1', '2026-01-01', [])])
    const metrics = runBowlingMetrics(pkm)

    expect(metrics.get('bowl.matches')?.value).toBe(0)
    expect(metrics.get('bowl.innings')?.value).toBe(0)
    expect(metrics.get('bowl.economy')?.status).toBe(MetricStatus.MissingData)
  })

  it('returns validation failure for negative values', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBowl: true,
          overs: 5,
          balls: 30,
          maidens: 0,
          runsConceded: -1,
          wickets: 1,
          noBalls: 0,
          wides: 0,
        },
      ]),
    ])
    const metrics = runBowlingMetrics(pkm)

    expect(metrics.get('bowl.runs_conceded')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('bowl.average')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('returns validation failure for overs and balls inconsistency', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBowl: true,
          overs: 4,
          balls: 25,
          maidens: 0,
          runsConceded: 20,
          wickets: 1,
          noBalls: 0,
          wides: 0,
        },
      ]),
    ])
    const metrics = runBowlingMetrics(pkm)

    expect(metrics.get('bowl.balls')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('is deterministic through runner execution', () => {
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBowl: true,
          overs: 10,
          balls: 60,
          maidens: 2,
          runsConceded: 33,
          wickets: 3,
          noBalls: 1,
          wides: 1,
        },
      ]),
    ])

    expect(runBowlingMetrics(pkm).toJSON()).toEqual(runBowlingMetrics(pkm).toJSON())
  })

  it('integrates with the default metric registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([
      makeRecord('m1', '2026-01-01', [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBowl: true,
          overs: 2,
          balls: 12,
          maidens: 0,
          runsConceded: 10,
          wickets: 1,
          noBalls: 0,
          wides: 0,
        },
      ]),
    ])
    const metrics = new MetricRunner(registry).run({
      pkm,
      metricIds: ['bowl.matches', 'bowl.wickets', 'bowl.economy'],
    })

    for (const metricId of bowlingMetricIds) {
      expect(registry.has(metricId)).toBe(true)
    }

    expect(registry.has('bowling.wickets')).toBe(false)
    expect(metrics.get('bowl.matches')?.value).toBe(1)
    expect(metrics.get('bowl.wickets')?.value).toBe(1)
    expect(metrics.get('bowl.economy')?.value).toBe(5)
  })
})
