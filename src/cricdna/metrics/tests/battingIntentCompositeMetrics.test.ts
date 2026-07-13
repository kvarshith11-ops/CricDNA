import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import { PlayerMatchRecord } from '../../domain/models/PlayerMatchRecord'
import { DismissalKind, MatchFormat, MatchResultType } from '../../domain/types/common'
import {
  BatIntentCalculator,
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

const makePkm = (
  runs: number,
  ballsFaced: number,
  fours: number,
  sixes: number,
): PlayerKnowledgeModel => {
  const record = PlayerMatchRecord.create({
    identity: {
      playerId: 'p1',
      playerName: 'Player One',
      matchId: 'm1',
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
      innings: [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs,
          ballsFaced,
          fours,
          sixes,
          dismissal: { kind: DismissalKind.Caught },
        },
      ],
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

  return PlayerKnowledgeModel.fromRecords('p1', [record], metadata, 'Player One')
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

describe('Batting Intent composite metrics', () => {
  it('scores aggressive batting profiles higher', () => {
    const metrics = new MetricRunner(loadDefaultMetricRegistry()).run({
      pkm: makePkm(120, 60, 12, 6),
      metricIds: ['bat.intent'],
    })

    expect(metrics.get('bat.intent')?.value).toBe(89.5)
    expect(metrics.get('bat.intent')?.level).toBe(MetricLevel.Composite)
  })

  it('scores anchor batting profiles lower', () => {
    const metrics = new MetricRunner(loadDefaultMetricRegistry()).run({
      pkm: makePkm(50, 100, 2, 0),
      metricIds: ['bat.intent'],
    })

    expect(metrics.get('bat.intent')?.value).toBe(21.85)
  })

  it('captures boundary-heavy innings through boundary intent', () => {
    const metrics = new MetricRunner(loadDefaultMetricRegistry()).run({
      pkm: makePkm(80, 50, 8, 8),
      metricIds: ['bat.boundary_intent'],
    })

    expect(metrics.get('bat.boundary_intent')?.value).toBe(100)
  })

  it('keeps low strike-rate innings in range', () => {
    const metrics = new MetricRunner(loadDefaultMetricRegistry()).run({
      pkm: makePkm(20, 80, 1, 0),
      metricIds: ['bat.intent'],
    })

    expect(metrics.get('bat.intent')?.value).toBe(15.13)
  })

  it('returns validation failure when primitive metric results are missing', () => {
    const result = new BatIntentCalculator().calculate({
      pkm: makePkm(10, 10, 1, 0),
      results: new Map([
        ['bat.strike_rate', primitiveResult('bat.strike_rate', 100)],
        ['bat.boundary_percentage', primitiveResult('bat.boundary_percentage', 40)],
      ]),
    })

    expect(result.status).toBe(MetricStatus.FailedValidation)
    expect(result.value).toBeNull()
  })

  it('resolves primitive dependencies before batting intent composites', () => {
    const registry = loadDefaultMetricRegistry()

    expect(resolveExecutionPlan(registry, ['bat.intent']).orderedMetricIds).toEqual([
      'bat.strike_rate',
      'bat.boundary_percentage',
      'bat.runs_per_ball',
      'bat.intent',
    ])
  })

  it('integrates with registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const metrics = new MetricRunner(registry).run({
      pkm: makePkm(60, 40, 6, 2),
      metricIds: ['bat.intent', 'bat.boundary_intent'],
    })

    expect(registry.has('bat.intent')).toBe(true)
    expect(registry.has('bat.boundary_intent')).toBe(true)
    expect(registry.has('bat.rotation_intent')).toBe(false)
    expect(metrics.get('bat.intent')?.status).toBe(MetricStatus.Success)
    expect(metrics.get('bat.boundary_intent')?.status).toBe(MetricStatus.Success)
  })

  it('is deterministic across repeated executions', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm(72, 48, 6, 4)

    expect(
      new MetricRunner(registry)
        .run({ pkm, metricIds: ['bat.intent', 'bat.boundary_intent'] })
        .toJSON(),
    ).toEqual(
      new MetricRunner(registry)
        .run({ pkm, metricIds: ['bat.intent', 'bat.boundary_intent'] })
        .toJSON(),
    )
  })

  it('rejects invalid primitive values through direct calculator validation', () => {
    const result = new BatIntentCalculator().calculate({
      pkm: makePkm(10, 10, 1, 0),
      results: new Map([
        ['bat.strike_rate', primitiveResult('bat.strike_rate', Number.NaN)],
        ['bat.boundary_percentage', primitiveResult('bat.boundary_percentage', 40)],
        ['bat.runs_per_ball', primitiveResult('bat.runs_per_ball', 1)],
      ]),
    })

    expect(result.status).toBe(MetricStatus.FailedValidation)
  })

  it('can execute from a minimal registry with declared primitive dependencies', () => {
    const registry = MetricRegistry.fromDefinitions([
      primitiveDefinition('bat.strike_rate', 100),
      primitiveDefinition('bat.boundary_percentage', 40),
      primitiveDefinition('bat.runs_per_ball', 1),
      {
        id: 'bat.intent',
        name: 'Batting Intent',
        category: MetricCategory.Batting,
        level: MetricLevel.Composite,
        dependencies: ['bat.strike_rate', 'bat.boundary_percentage', 'bat.runs_per_ball'],
        version: '1.0.0',
        calculator: new BatIntentCalculator(),
      },
    ])
    const metrics = new MetricRunner(registry).run({
      pkm: makePkm(1, 1, 0, 0),
      metricIds: ['bat.intent'],
    })

    expect(metrics.get('bat.intent')?.value).toBe(46.5)
  })
})
