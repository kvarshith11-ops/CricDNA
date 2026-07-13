import { describe, expect, it } from 'vitest'
import {
  EngineeringMetrics,
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricResult,
} from '../../metrics'
import {
  TraitCategory,
  TraitRegistry,
  TraitRunner,
  TraitStatus,
  loadDefaultTraitRegistry,
  traitDefinitions,
  type TraitDefinition,
} from '../index'

const composite = (
  metricId: string,
  category: MetricCategory,
  value: number,
): MetricResult => ({
  metricId,
  name: metricId,
  category,
  level: MetricLevel.Composite,
  value,
  unit: 'score',
  sampleSize: 10,
  confidence: 1,
  status: MetricStatus.Success,
  version: '1.0.0',
  metadata: {},
})

const primitive = (metricId: string): MetricResult => ({
  ...composite(metricId, MetricCategory.Batting, 90),
  level: MetricLevel.Primitive,
})

const failedComposite = (metricId: string): MetricResult => ({
  ...composite(metricId, MetricCategory.Batting, 90),
  status: MetricStatus.FailedValidation,
})

const metrics = (results: readonly MetricResult[]): EngineeringMetrics => {
  return new EngineeringMetrics(
    new Map(results.map((result) => [result.metricId, result])),
  )
}

const runTraits = (results: readonly MetricResult[]) => {
  return new TraitRunner(loadDefaultTraitRegistry()).run({
    metrics: metrics(results),
  })
}

describe('Trait Engine', () => {
  it('classifies high intent batters', () => {
    const result = runTraits([
      composite('bat.intent', MetricCategory.Batting, 84),
      composite('bat.boundary_intent', MetricCategory.Batting, 76),
      composite('bat.consistency', MetricCategory.Batting, 62),
      composite('bat.scoring_consistency', MetricCategory.Batting, 68),
      composite('bowl.control', MetricCategory.Bowling, 50),
      composite('bowl.wicket_threat', MetricCategory.Bowling, 50),
      composite('bowl.effectiveness', MetricCategory.Bowling, 50),
      composite('field.impact', MetricCategory.Fielding, 50),
      composite('field.reliability', MetricCategory.Fielding, 50),
      composite('field.activity', MetricCategory.Fielding, 50),
    ]).get('trait.batting_style')

    expect(result?.classification).toBe('Aggressive Stroke Player')
    expect(result?.confidence).toBe(1)
    expect(result?.supportingMetrics.map((metric) => metric.metricId)).toEqual([
      'bat.intent',
      'bat.consistency',
    ])
    expect(result?.explanation).toContain('bat.intent 84')
  })

  it('classifies consistent batters', () => {
    const result = new TraitRunner(loadDefaultTraitRegistry()).run({
      metrics: metrics([
        composite('bat.intent', MetricCategory.Batting, 54),
        composite('bat.consistency', MetricCategory.Batting, 82),
      ]),
      traitIds: ['trait.batting_style'],
    }).get('trait.batting_style')

    expect(result?.classification).toBe('Reliable Accumulator')
    expect(result?.status).toBe(TraitStatus.Success)
  })

  it('classifies economical bowlers as control bowlers', () => {
    const result = new TraitRunner(loadDefaultTraitRegistry()).run({
      metrics: metrics([
        composite('bowl.control', MetricCategory.Bowling, 88),
        composite('bowl.wicket_threat', MetricCategory.Bowling, 45),
        composite('bowl.effectiveness', MetricCategory.Bowling, 72),
      ]),
      traitIds: ['trait.bowling_style'],
    }).get('trait.bowling_style')

    expect(result?.classification).toBe('Control Bowler')
    expect(result?.category).toBe(TraitCategory.Bowling)
  })

  it('classifies wicket-taking bowlers as strike bowlers', () => {
    const result = new TraitRunner(loadDefaultTraitRegistry()).run({
      metrics: metrics([
        composite('bowl.control', MetricCategory.Bowling, 65),
        composite('bowl.wicket_threat', MetricCategory.Bowling, 91),
        composite('bowl.effectiveness', MetricCategory.Bowling, 76),
      ]),
      traitIds: ['trait.bowling_style'],
    }).get('trait.bowling_style')

    expect(result?.classification).toBe('Strike Bowler')
  })

  it('classifies strong fielders from reliability and activity', () => {
    const result = new TraitRunner(loadDefaultTraitRegistry()).run({
      metrics: metrics([
        composite('field.impact', MetricCategory.Fielding, 77),
        composite('field.reliability', MetricCategory.Fielding, 90),
        composite('field.activity', MetricCategory.Fielding, 84),
      ]),
      traitIds: ['trait.fielding_style'],
    }).get('trait.fielding_style')

    expect(result?.classification).toBe('Safe Hands')
    expect(result?.explanation).toContain('field.reliability 90')
  })

  it('classifies active fielders when activity is dominant', () => {
    const result = new TraitRunner(loadDefaultTraitRegistry()).run({
      metrics: metrics([
        composite('field.impact', MetricCategory.Fielding, 70),
        composite('field.reliability', MetricCategory.Fielding, 64),
        composite('field.activity', MetricCategory.Fielding, 88),
      ]),
      traitIds: ['trait.fielding_style'],
    }).get('trait.fielding_style')

    expect(result?.classification).toBe('Active Fielder')
  })

  it('rejects missing dependencies', () => {
    expect(() =>
      new TraitRunner(loadDefaultTraitRegistry()).run({
        metrics: metrics([composite('bat.intent', MetricCategory.Batting, 80)]),
        traitIds: ['trait.batting_style'],
      }),
    ).toThrow("Trait dependency 'bat.consistency' is missing.")
  })

  it('rejects unsupported non-composite dependencies', () => {
    expect(() =>
      new TraitRunner(loadDefaultTraitRegistry()).run({
        metrics: metrics([
          primitive('bat.intent'),
          composite('bat.consistency', MetricCategory.Batting, 80),
        ]),
        traitIds: ['trait.batting_style'],
      }),
    ).toThrow("Trait dependency 'bat.intent' must be a composite metric.")
  })

  it('rejects failed composite dependencies', () => {
    expect(() =>
      new TraitRunner(loadDefaultTraitRegistry()).run({
        metrics: metrics([
          failedComposite('bat.intent'),
          composite('bat.consistency', MetricCategory.Batting, 80),
        ]),
        traitIds: ['trait.batting_style'],
      }),
    ).toThrow("Trait dependency 'bat.intent' did not complete successfully.")
  })

  it('integrates with the default registry', () => {
    const registry = loadDefaultTraitRegistry()

    expect(registry.has('trait.batting_style')).toBe(true)
    expect(registry.has('trait.batting_boundary_style')).toBe(true)
    expect(registry.has('trait.bowling_style')).toBe(true)
    expect(registry.has('trait.bowling_control')).toBe(true)
    expect(registry.has('trait.fielding_style')).toBe(true)
    expect(registry.has('trait.fielding_activity')).toBe(true)
    expect(traitDefinitions.map((definition) => definition.id)).toEqual([
      'trait.batting_style',
      'trait.batting_intent',
      'trait.batting_boundary_style',
      'trait.batting_scoring_consistency',
      'trait.bowling_style',
      'trait.bowling_control',
      'trait.bowling_wicket_threat',
      'trait.bowling_effectiveness',
      'trait.fielding_style',
      'trait.fielding_impact',
      'trait.fielding_activity',
      'trait.keeping_dismissal_involvement',
    ])
  })

  it('detects duplicate trait registration', () => {
    const definition: TraitDefinition = traitDefinitions[0]
    const registry = new TraitRegistry()

    registry.register(definition)

    expect(() => registry.register(definition)).toThrow(
      "Trait 'trait.batting_style' is already registered.",
    )
  })

  it('is deterministic across repeated executions', () => {
    const registry = loadDefaultTraitRegistry()
    const inputMetrics = metrics([
      composite('bat.intent', MetricCategory.Batting, 74),
      composite('bat.consistency', MetricCategory.Batting, 73),
    ])

    expect(
      new TraitRunner(registry)
        .run({ metrics: inputMetrics, traitIds: ['trait.batting_style'] })
        .toJSON(),
    ).toEqual(
      new TraitRunner(registry)
        .run({ metrics: inputMetrics, traitIds: ['trait.batting_style'] })
        .toJSON(),
    )
  })
})
