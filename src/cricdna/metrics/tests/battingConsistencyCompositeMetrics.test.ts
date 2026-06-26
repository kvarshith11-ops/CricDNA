import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import {
  PlayerMatchRecord,
  type PlayerMatchRecordProps,
} from '../../domain/models/PlayerMatchRecord'
import { DismissalKind, MatchFormat, MatchResultType } from '../../domain/types/common'
import {
  BatConsistencyCalculator,
  MetricCategory,
  MetricLevel,
  MetricRegistry,
  MetricRunner,
  MetricStatus,
  StubMetricCalculator,
  loadDefaultMetricRegistry,
  resolveExecutionPlan,
  type MetricDefinition,
  type MetricResult,
} from '../index'

const metadata = {
  schemaVersion: 'test',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
}

const makeRecord = (
  matchId: string,
  runs: number,
  dismissalKind: DismissalKind = DismissalKind.Caught,
): PlayerMatchRecord => {
  const innings: PlayerMatchRecordProps['batting']['innings'] = [
    {
      inningsId: matchId,
      inningsNumber: 1,
      didBat: true,
      runs,
      ballsFaced: Math.max(1, runs),
      fours: 0,
      sixes: 0,
      dismissal: { kind: dismissalKind },
    },
  ]

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
      matchDate: `2026-01-${matchId.padStart(2, '0')}`,
      inningsPlayed: [1],
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

const makePkm = (scores: readonly number[]): PlayerKnowledgeModel => {
  return PlayerKnowledgeModel.fromRecords(
    'p1',
    scores.map((score, index) => makeRecord(String(index + 1), score)),
    metadata,
    'Player One',
  )
}

const runConsistencyMetrics = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: ['bat.consistency', 'bat.scoring_consistency'],
  })
}

const primitiveResult = (metricId: string, value: number): MetricResult => ({
  metricId,
  name: metricId,
  category: MetricCategory.Batting,
  level: MetricLevel.Primitive,
  value,
  unit: 'unit',
  sampleSize: 1,
  confidence: 1,
  status: MetricStatus.Success,
  version: '1.0.0',
  metadata: {},
})

const primitiveDefinition = (metricId: string, value: number): MetricDefinition => ({
  id: metricId,
  name: metricId,
  category: MetricCategory.Batting,
  level: MetricLevel.Primitive,
  dependencies: [],
  version: '1.0.0',
  calculator: new StubMetricCalculator({
    metricId,
    name: metricId,
    category: MetricCategory.Batting,
    level: MetricLevel.Primitive,
    version: '1.0.0',
    value,
  }),
})

describe('Batting Consistency composite metrics', () => {
  it('scores highly consistent players strongly', () => {
    const metrics = runConsistencyMetrics(makePkm([80, 75, 90, 65, 70]))

    expect(metrics.get('bat.consistency')?.value).toBe(80)
    expect(metrics.get('bat.scoring_consistency')?.value).toBe(100)
  })

  it('scores boom-or-bust players lower than consistent scorers', () => {
    const metrics = runConsistencyMetrics(makePkm([150, 0, 5, 120, 0]))

    expect(metrics.get('bat.consistency')?.value).toBe(79)
    expect(metrics.get('bat.scoring_consistency')?.value).toBe(60)
  })

  it('penalizes many ducks', () => {
    const metrics = runConsistencyMetrics(makePkm([0, 0, 10, 0, 20]))

    expect(metrics.get('bat.consistency')?.value).toBe(4.2)
    expect(metrics.get('bat.scoring_consistency')?.value).toBe(0)
  })

  it('rewards many fifties', () => {
    const metrics = runConsistencyMetrics(makePkm([55, 60, 52, 48, 62]))

    expect(metrics.get('bat.consistency')?.value).toBe(80)
    expect(metrics.get('bat.scoring_consistency')?.value).toBe(100)
  })

  it('rewards many hundreds', () => {
    const metrics = runConsistencyMetrics(makePkm([100, 110, 120, 30, 40]))

    expect(metrics.get('bat.consistency')?.value).toBe(100)
    expect(metrics.get('bat.scoring_consistency')?.value).toBe(100)
  })

  it('handles small sample careers deterministically', () => {
    const metrics = runConsistencyMetrics(makePkm([75]))

    expect(metrics.get('bat.consistency')?.value).toBe(80)
    expect(metrics.get('bat.scoring_consistency')?.value).toBe(100)
  })

  it('resolves primitive dependencies before consistency composites', () => {
    const registry = loadDefaultMetricRegistry()

    expect(resolveExecutionPlan(registry, ['bat.consistency']).orderedMetricIds).toEqual([
      'bat.innings',
      'bat.average',
      'bat.fifties',
      'bat.hundreds',
      'bat.ducks',
      'bat.consistency',
    ])
  })

  it('integrates with registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const metrics = new MetricRunner(registry).run({
      pkm: makePkm([50, 60, 70]),
      metricIds: ['bat.consistency', 'bat.scoring_consistency'],
    })

    expect(registry.has('bat.consistency')).toBe(true)
    expect(registry.has('bat.scoring_consistency')).toBe(true)
    expect(metrics.get('bat.consistency')?.status).toBe(MetricStatus.Success)
    expect(metrics.get('bat.scoring_consistency')?.status).toBe(MetricStatus.Success)
  })

  it('returns validation failure when primitive metric results are missing', () => {
    const result = new BatConsistencyCalculator().calculate({
      pkm: makePkm([50]),
      results: new Map([
        ['bat.innings', primitiveResult('bat.innings', 1)],
        ['bat.average', primitiveResult('bat.average', 50)],
      ]),
    })

    expect(result.status).toBe(MetricStatus.FailedValidation)
    expect(result.value).toBeNull()
  })

  it('is deterministic across repeated executions', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([50, 0, 100, 70])

    expect(
      new MetricRunner(registry)
        .run({ pkm, metricIds: ['bat.consistency', 'bat.scoring_consistency'] })
        .toJSON(),
    ).toEqual(
      new MetricRunner(registry)
        .run({ pkm, metricIds: ['bat.consistency', 'bat.scoring_consistency'] })
        .toJSON(),
    )
  })

  it('can execute from a minimal registry with declared primitive dependencies', () => {
    const registry = MetricRegistry.fromDefinitions([
      primitiveDefinition('bat.innings', 5),
      primitiveDefinition('bat.average', 50),
      primitiveDefinition('bat.fifties', 3),
      primitiveDefinition('bat.hundreds', 1),
      primitiveDefinition('bat.ducks', 0),
      {
        id: 'bat.consistency',
        name: 'Batting Consistency',
        category: MetricCategory.Batting,
        level: MetricLevel.Composite,
        dependencies: [
          'bat.innings',
          'bat.average',
          'bat.fifties',
          'bat.hundreds',
          'bat.ducks',
        ],
        version: '1.0.0',
        calculator: new BatConsistencyCalculator(),
      },
    ])
    const metrics = new MetricRunner(registry).run({
      pkm: makePkm([1]),
      metricIds: ['bat.consistency'],
    })

    expect(metrics.get('bat.consistency')?.value).toBe(100)
  })
})
