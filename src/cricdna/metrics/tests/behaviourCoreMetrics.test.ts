import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import {
  PlayerMatchRecord,
  type PlayerMatchBehaviour,
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

const behaviourMetricIds = [
  'behaviour.captain_matches',
  'behaviour.wicket_keeper_matches',
  'behaviour.substitute_matches',
  'behaviour.player_of_match_awards',
  'behaviour.events',
  'behaviour.event_types',
] as const

const makeRecord = (
  matchId: string,
  behaviour: PlayerMatchBehaviour,
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
    behaviour,
    progression: {
      battingTimeline: [],
      bowlingTimeline: [],
    },
    metadata,
  })
}

const makeBehaviour = (
  overrides: Partial<PlayerMatchBehaviour> = {},
): PlayerMatchBehaviour => {
  return {
    captain: false,
    wicketKeeper: false,
    substitute: false,
    playerOfMatch: false,
    events: [],
    ...overrides,
  }
}

const makePkm = (records: readonly PlayerMatchRecord[]): PlayerKnowledgeModel => {
  return PlayerKnowledgeModel.fromRecords('p1', records, metadata, 'Player One')
}

const runBehaviourMetrics = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: behaviourMetricIds,
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

describe('Behaviour Core primitive metrics', () => {
  it('calculates normal career behaviour metrics from supported fields', () => {
    const pkm = makePkm([
      makeRecord(
        'm1',
        makeBehaviour({
          captain: true,
          playerOfMatch: true,
          events: [
            {
              eventType: 'Commentary',
              description: 'Observed source event',
              ballRef: { inningsId: 'i1', over: 4, ballInOver: 2 },
            },
          ],
        }),
      ),
      makeRecord(
        'm2',
        makeBehaviour({
          wicketKeeper: true,
          substitute: true,
          events: [
            {
              eventType: 'Milestone',
              description: 'Observed source event',
              ballRef: { inningsId: 'i2', over: 10, ballInOver: 1 },
            },
            {
              eventType: 'Commentary',
              description: 'Another observed source event',
              ballRef: { inningsId: 'i2', over: 10, ballInOver: 2 },
            },
          ],
        }),
      ),
    ])
    const metrics = runBehaviourMetrics(pkm)

    expect(metrics.get('behaviour.captain_matches')?.value).toBe(1)
    expect(metrics.get('behaviour.wicket_keeper_matches')?.value).toBe(1)
    expect(metrics.get('behaviour.substitute_matches')?.value).toBe(1)
    expect(metrics.get('behaviour.player_of_match_awards')?.value).toBe(1)
    expect(metrics.get('behaviour.events')?.value).toBe(3)
    expect(parseMetricJson(metrics.get('behaviour.event_types')?.value)).toEqual({
      Commentary: 2,
      Milestone: 1,
    })
  })

  it('handles empty behaviour event history in a non-empty career', () => {
    const pkm = makePkm([
      makeRecord('m1', makeBehaviour()),
      makeRecord('m2', makeBehaviour()),
    ])
    const metrics = runBehaviourMetrics(pkm)

    expect(metrics.get('behaviour.events')?.value).toBe(0)
    expect(parseMetricJson(metrics.get('behaviour.event_types')?.value)).toEqual({})
  })

  it('returns validation failure for duplicate behaviour events', () => {
    const duplicateEvent = {
      eventType: 'Commentary',
      description: 'Duplicate source event',
      ballRef: { inningsId: 'i1', over: 1, ballInOver: 1 },
    }
    const pkm = makePkm([
      makeRecord(
        'm1',
        makeBehaviour({
          events: [duplicateEvent, duplicateEvent],
        }),
      ),
    ])
    const metrics = runBehaviourMetrics(pkm)

    expect(metrics.get('behaviour.events')?.status).toBe(MetricStatus.FailedValidation)
    expect(metrics.get('behaviour.event_types')?.status).toBe(
      MetricStatus.FailedValidation,
    )
  })

  it('returns validation failure for empty careers', () => {
    const pkm = PlayerKnowledgeModel.empty(
      { playerId: 'p1', playerName: 'Player One' },
      metadata,
    )
    const metrics = runBehaviourMetrics(pkm)

    expect(metrics.get('behaviour.events')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('is deterministic through runner execution', () => {
    const pkm = makePkm([
      makeRecord(
        'm1',
        makeBehaviour({
          events: [
            { eventType: 'B', description: 'Second' },
            { eventType: 'A', description: 'First' },
          ],
        }),
      ),
    ])

    expect(runBehaviourMetrics(pkm).toJSON()).toEqual(runBehaviourMetrics(pkm).toJSON())
  })

  it('integrates with the default metric registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([
      makeRecord(
        'm1',
        makeBehaviour({
          captain: true,
          events: [{ eventType: 'Commentary' }],
        }),
      ),
    ])
    const metrics = new MetricRunner(registry).run({
      pkm,
      metricIds: ['behaviour.captain_matches', 'behaviour.events'],
    })

    for (const metricId of behaviourMetricIds) {
      expect(registry.has(metricId)).toBe(true)
    }

    expect(metrics.get('behaviour.captain_matches')?.value).toBe(1)
    expect(metrics.get('behaviour.events')?.value).toBe(1)
  })
})
