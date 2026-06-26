import { describe, expect, it } from 'vitest'
import { aggregatePlayerCareer } from '../../aggregation'
import { extractMatchRecord } from '../../extraction/MatchExtractionPipeline'
import {
  loadMatchEndpointSets,
  selectRepresentativePlayerId,
} from '../../extraction/__tests__/dataset'
import {
  compositeMetricDefinitions,
  MetricCategory,
  MetricLevel,
  MetricRegistry,
  MetricRunner,
  MetricStatus,
  StubMetricCalculator,
  loadDefaultMetricRegistry,
  resolveExecutionPlan,
  type MetricCalculator,
  type MetricDefinition,
  type MetricExecutionContext,
  type MetricResult,
} from '../index'

const fixedMetadata = {
  schemaVersion: 'metric-test',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
}

const buildPkm = () => {
  const match = loadMatchEndpointSets()[0]
  const record = extractMatchRecord({
    playerId: selectRepresentativePlayerId(match),
    summary: match.summary,
    scorecard: match.scorecard,
    comments: match.comments,
    graphs: match.graphs,
    metadata: fixedMetadata,
  }).record
  const result = aggregatePlayerCareer({
    records: [record],
    metadata: fixedMetadata,
  })

  if (!result.model) {
    throw new Error('Expected PKM test fixture to be valid.')
  }

  return result.model
}

const stubDefinition = (
  id: string,
  dependencies: readonly string[] = [],
  calculator?: MetricCalculator,
): MetricDefinition => ({
  id,
  name: id,
  category: MetricCategory.Context,
  level: dependencies.length === 0 ? MetricLevel.Primitive : MetricLevel.Composite,
  dependencies,
  version: '1.0.0',
  calculator:
    calculator ??
    new StubMetricCalculator({
      metricId: id,
      name: id,
      category: MetricCategory.Context,
      level: dependencies.length === 0 ? MetricLevel.Primitive : MetricLevel.Composite,
      version: '1.0.0',
      value: 0,
    }),
})

class CountingCalculator implements MetricCalculator {
  calls = 0

  constructor(private readonly metricId: string) {}

  calculate(context: MetricExecutionContext): MetricResult {
    this.calls += 1

    return {
      metricId: this.metricId,
      name: this.metricId,
      category: MetricCategory.Context,
      level: MetricLevel.Primitive,
      value: context.pkm.history.records.length,
      sampleSize: context.pkm.history.records.length,
      confidence: 1,
      status: MetricStatus.Success,
      version: '1.0.0',
      metadata: {},
    }
  }
}

describe('Metric Engine infrastructure', () => {
  it('registers metric definitions', () => {
    const registry = new MetricRegistry()

    registry.register(stubDefinition('context.matches'))

    expect(registry.has('context.matches')).toBe(true)
    expect(registry.all()).toHaveLength(1)
  })

  it('loads the default registry with placeholder primitive metrics', () => {
    const registry = loadDefaultMetricRegistry()

    expect(registry.has('bat.runs')).toBe(true)
    expect(registry.has('bowl.wickets')).toBe(true)
    expect(registry.has('field.catches')).toBe(true)
    expect(registry.has('context.matches')).toBe(true)
    expect(registry.has('bat.intent')).toBe(true)
  })

  it('resolves dependency graph execution order', () => {
    const registry = MetricRegistry.fromDefinitions([
      stubDefinition('a'),
      stubDefinition('b', ['a']),
      stubDefinition('c', ['a']),
    ])

    expect(resolveExecutionPlan(registry, ['c']).orderedMetricIds).toEqual([
      'a',
      'c',
    ])
  })

  it('executes metrics in dependency order', () => {
    const executionOrder: string[] = []
    const calculatorFor = (metricId: string): MetricCalculator => ({
      calculate: () => {
        executionOrder.push(metricId)

        return {
          metricId,
          name: metricId,
          category: MetricCategory.Context,
          level: MetricLevel.Primitive,
          value: 0,
          sampleSize: 1,
          confidence: 1,
          status: MetricStatus.Success,
          version: '1.0.0',
          metadata: {},
        }
      },
    })
    const registry = MetricRegistry.fromDefinitions([
      stubDefinition('a', [], calculatorFor('a')),
      stubDefinition('b', ['a'], calculatorFor('b')),
      stubDefinition('c', ['a'], calculatorFor('c')),
    ])

    new MetricRunner(registry).run({
      pkm: buildPkm(),
      metricIds: ['c'],
    })

    expect(executionOrder).toEqual(['a', 'c'])
  })

  it('uses cache so shared dependencies execute once', () => {
    const sharedCalculator = new CountingCalculator('shared')
    const registry = MetricRegistry.fromDefinitions([
      stubDefinition('shared', [], sharedCalculator),
      stubDefinition('left', ['shared']),
      stubDefinition('right', ['shared']),
    ])

    new MetricRunner(registry).run({
      pkm: buildPkm(),
      metricIds: ['left', 'right'],
    })

    expect(sharedCalculator.calls).toBe(1)
  })

  it('detects duplicate registration', () => {
    const registry = new MetricRegistry()

    registry.register(stubDefinition('duplicate'))

    expect(() => registry.register(stubDefinition('duplicate'))).toThrow(
      "Metric 'duplicate' is already registered.",
    )
  })

  it('detects missing dependencies', () => {
    const registry = MetricRegistry.fromDefinitions([
      stubDefinition('dependent', ['missing']),
    ])

    expect(() => resolveExecutionPlan(registry)).toThrow(
      "Metric 'dependent' depends on missing metric 'missing'.",
    )
  })

  it('detects circular dependencies', () => {
    const registry = MetricRegistry.fromDefinitions([
      stubDefinition('a', ['c']),
      stubDefinition('b', ['a']),
      stubDefinition('c', ['b']),
    ])

    expect(() => resolveExecutionPlan(registry)).toThrow(
      'Circular metric dependency detected',
    )
  })

  it('registers placeholder composite metrics', () => {
    expect(compositeMetricDefinitions.map((definition) => definition.id)).toEqual([
      'bat.intent',
      'bat.boundary_intent',
      'bat.consistency',
      'bowl.control',
      'field.impact',
    ])
  })
})
