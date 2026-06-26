import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import { PlayerMatchRecord } from '../../domain/models/PlayerMatchRecord'
import { DismissalKind, MatchFormat, MatchResultType } from '../../domain/types/common'
import {
  MetricCategory,
  MetricLevel,
  MetricRegistry,
  MetricRunner,
  MetricStatus,
  PlaceholderCompositeMetricCalculator,
  StubMetricCalculator,
  loadDefaultMetricRegistry,
  resolveExecutionPlan,
  validateMetricRegistry,
  type MetricCalculator,
  type MetricDefinition,
  type MetricExecutionContext,
  type MetricResult,
} from '../index'

const metadata = {
  schemaVersion: 'test',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
}

class CountingPrimitiveCalculator implements MetricCalculator {
  calls = 0

  constructor(private readonly metricId: string) {}

  calculate(context: MetricExecutionContext): MetricResult {
    this.calls += 1

    return {
      metricId: this.metricId,
      name: this.metricId,
      category: MetricCategory.Batting,
      level: MetricLevel.Primitive,
      value: context.pkm.history.records.length,
      unit: 'count',
      sampleSize: context.pkm.history.records.length,
      confidence: 1,
      status: MetricStatus.Success,
      version: '1.0.0',
      metadata: {},
    }
  }
}

const makePkm = (): PlayerKnowledgeModel => {
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
      homeAwayNeutral: 'Home',
    },
    batting: {
      innings: [
        {
          inningsId: 'i1',
          inningsNumber: 1,
          didBat: true,
          runs: 80,
          ballsFaced: 64,
          fours: 8,
          sixes: 2,
          dismissal: { kind: DismissalKind.Caught },
        },
      ],
    },
    bowling: {
      spells: [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          didBowl: true,
          overs: 5,
          balls: 30,
          maidens: 0,
          runsConceded: 25,
          wickets: 1,
          noBalls: 0,
          wides: 1,
        },
      ],
      wickets: [],
    },
    fielding: {
      innings: [
        {
          inningsId: 'i2',
          inningsNumber: 1,
          catches: 1,
          stumpings: 0,
          runOutsDirect: 0,
          runOutsAssisted: 0,
        },
      ],
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

const primitiveDefinition = (
  id: string,
  calculator: MetricCalculator = new StubMetricCalculator({
    metricId: id,
    name: id,
    category: MetricCategory.Batting,
    level: MetricLevel.Primitive,
    version: '1.0.0',
    value: 1,
  }),
): MetricDefinition => ({
  id,
  name: id,
  category: MetricCategory.Batting,
  level: MetricLevel.Primitive,
  dependencies: [],
  version: '1.0.0',
  calculator,
})

const compositeDefinition = (
  id: string,
  dependencies: readonly string[],
): MetricDefinition => ({
  id,
  name: id,
  category: MetricCategory.Batting,
  level: MetricLevel.Composite,
  dependencies,
  version: '1.0.0',
  calculator: new PlaceholderCompositeMetricCalculator({
    metricId: id,
    name: id,
    category: MetricCategory.Batting,
    version: '1.0.0',
    dependencies,
    value: 0,
  }),
})

describe('Composite Metric Engine', () => {
  it('plans primitive dependencies before composite metrics', () => {
    const registry = MetricRegistry.fromDefinitions([
      primitiveDefinition('bat.strike_rate'),
      primitiveDefinition('bat.boundary_percentage'),
      compositeDefinition('bat.intent', ['bat.strike_rate', 'bat.boundary_percentage']),
    ])

    expect(resolveExecutionPlan(registry, ['bat.intent']).orderedMetricIds).toEqual([
      'bat.strike_rate',
      'bat.boundary_percentage',
      'bat.intent',
    ])
  })

  it('executes placeholder composites through MetricRunner', () => {
    const metrics = new MetricRunner(loadDefaultMetricRegistry()).run({
      pkm: makePkm(),
      metricIds: ['bat.intent'],
    })

    expect(metrics.has('bat.strike_rate')).toBe(true)
    expect(metrics.has('bat.boundary_percentage')).toBe(true)
    expect(metrics.has('bat.runs_per_ball')).toBe(true)
    expect(metrics.get('bat.intent')?.status).toBe(MetricStatus.Success)
    expect(metrics.get('bat.intent')?.level).toBe(MetricLevel.Composite)
  })

  it('reuses cached primitive dependencies across composites', () => {
    const sharedCalculator = new CountingPrimitiveCalculator('shared.primitive')
    const registry = MetricRegistry.fromDefinitions([
      primitiveDefinition('shared.primitive', sharedCalculator),
      compositeDefinition('left.composite', ['shared.primitive']),
      compositeDefinition('right.composite', ['shared.primitive']),
    ])

    new MetricRunner(registry).run({
      pkm: makePkm(),
      metricIds: ['left.composite', 'right.composite'],
    })

    expect(sharedCalculator.calls).toBe(1)
  })

  it('detects duplicate composite registration', () => {
    const registry = new MetricRegistry()

    registry.register(compositeDefinition('bat.intent', ['bat.strike_rate']))

    expect(() =>
      registry.register(compositeDefinition('bat.intent', ['bat.boundary_percentage'])),
    ).toThrow("Metric 'bat.intent' is already registered.")
  })

  it('detects missing primitive dependencies', () => {
    const registry = MetricRegistry.fromDefinitions([
      compositeDefinition('bat.intent', ['missing.primitive']),
    ])

    expect(() => validateMetricRegistry(registry)).toThrow(
      "Metric 'bat.intent' depends on missing metric 'missing.primitive'.",
    )
  })

  it('rejects composite dependencies on non-primitive metrics', () => {
    const registry = MetricRegistry.fromDefinitions([
      primitiveDefinition('bat.strike_rate'),
      compositeDefinition('bat.intent', ['bat.strike_rate']),
      compositeDefinition('bat.super_intent', ['bat.intent']),
    ])

    expect(() => validateMetricRegistry(registry)).toThrow(
      "Composite metric 'bat.super_intent' can depend only on primitive metric 'bat.intent'.",
    )
  })

  it('detects circular dependency graphs', () => {
    const registry = MetricRegistry.fromDefinitions([
      {
        ...compositeDefinition('a', ['b']),
        level: MetricLevel.Composite,
      },
      {
        ...compositeDefinition('b', ['a']),
        level: MetricLevel.Composite,
      },
    ])

    expect(() => resolveExecutionPlan(registry)).toThrow(
      'Circular metric dependency detected',
    )
  })

  it('is deterministic across repeated executions', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm()

    expect(
      new MetricRunner(registry).run({ pkm, metricIds: ['bat.intent'] }).toJSON(),
    ).toEqual(
      new MetricRunner(registry).run({ pkm, metricIds: ['bat.intent'] }).toJSON(),
    )
  })
})
