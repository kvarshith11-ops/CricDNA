import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import {
  PlayerMatchRecord,
  type PlayerMatchRecordProps,
} from '../../domain/models/PlayerMatchRecord'
import { MatchFormat, MatchResultType } from '../../domain/types/common'
import {
  FieldImpactCalculator,
  FieldReliabilityCalculator,
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
  innings: PlayerMatchRecordProps['fielding']['innings'][number],
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
      matchDate: `2026-01-${matchId.padStart(2, '0')}`,
      inningsPlayed: [innings.inningsNumber],
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
      innings: [innings],
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

const makeInnings = (
  overrides: Partial<PlayerMatchRecordProps['fielding']['innings'][number]>,
): PlayerMatchRecordProps['fielding']['innings'][number] => ({
  inningsId: 'i1',
  inningsNumber: 1,
  catches: 0,
  stumpings: 0,
  runOutsDirect: 0,
  runOutsAssisted: 0,
  ...overrides,
})

const makePkm = (
  innings: readonly PlayerMatchRecordProps['fielding']['innings'][number][],
): PlayerKnowledgeModel => {
  return PlayerKnowledgeModel.fromRecords(
    'p1',
    innings.map((inning, index) => makeRecord(String(index + 1), inning)),
    metadata,
    'Player One',
  )
}

const runFieldingComposites = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: ['field.impact', 'field.reliability', 'field.activity'],
  })
}

const primitiveResult = (metricId: string, value: number): MetricResult => ({
  metricId,
  name: metricId,
  category: MetricCategory.Fielding,
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
  category: MetricCategory.Fielding,
  level: MetricLevel.Primitive,
  dependencies: [],
  version: '1.0.0',
  calculator: new StubMetricCalculator({
    metricId,
    name: metricId,
    category: MetricCategory.Fielding,
    level: MetricLevel.Primitive,
    version: '1.0.0',
    value,
  }),
})

describe('Fielding composite metrics', () => {
  it('scores specialist wicket keepers through catches and stumpings', () => {
    const metrics = runFieldingComposites(
      makePkm([
        makeInnings({ catches: 3, stumpings: 2 }),
        makeInnings({ catches: 2, stumpings: 1 }),
      ]),
    )

    expect(metrics.get('field.impact')?.value).toBe(85)
    expect(metrics.get('field.reliability')?.value).toBe(100)
    expect(metrics.get('field.activity')?.value).toBe(100)
  })

  it('scores catching specialists', () => {
    const metrics = runFieldingComposites(
      makePkm([
        makeInnings({ catches: 2 }),
        makeInnings({ catches: 1 }),
        makeInnings({ catches: 1 }),
      ]),
    )

    expect(metrics.get('field.impact')?.value).toBe(55)
    expect(metrics.get('field.reliability')?.value).toBe(88.89)
    expect(metrics.get('field.activity')?.value).toBe(76.67)
  })

  it('scores run-out specialists', () => {
    const metrics = runFieldingComposites(
      makePkm([
        makeInnings({ runOutsDirect: 1, runOutsAssisted: 1 }),
        makeInnings({ runOutsDirect: 1 }),
      ]),
    )

    expect(metrics.get('field.impact')?.value).toBe(48.75)
    expect(metrics.get('field.activity')?.value).toBe(82.5)
  })

  it('scores all-round fielders', () => {
    const metrics = runFieldingComposites(
      makePkm([
        makeInnings({ catches: 1, stumpings: 1 }),
        makeInnings({ catches: 1, runOutsDirect: 1 }),
      ]),
    )

    expect(metrics.get('field.impact')?.value).toBe(100)
    expect(metrics.get('field.reliability')?.value).toBe(100)
    expect(metrics.get('field.activity')?.value).toBe(100)
  })

  it('scores low involvement fielders lower', () => {
    const metrics = runFieldingComposites(
      makePkm([
        makeInnings({}),
        makeInnings({ catches: 1 }),
        makeInnings({}),
        makeInnings({}),
      ]),
    )

    expect(metrics.get('field.impact')?.value).toBe(11.88)
    expect(metrics.get('field.reliability')?.value).toBe(16.67)
    expect(metrics.get('field.activity')?.value).toBe(38.75)
  })

  it('handles small sample careers deterministically', () => {
    const metrics = runFieldingComposites(makePkm([makeInnings({ catches: 1 })]))

    expect(metrics.get('field.impact')?.value).toBe(47.5)
    expect(metrics.get('field.reliability')?.value).toBe(66.67)
    expect(metrics.get('field.activity')?.value).toBe(65)
  })

  it('returns validation failure when primitive metric results are missing', () => {
    const result = new FieldImpactCalculator().calculate({
      pkm: makePkm([makeInnings({ catches: 1 })]),
      results: new Map([
        ['field.matches', primitiveResult('field.matches', 1)],
        ['field.dismissals', primitiveResult('field.dismissals', 1)],
      ]),
    })

    expect(result.status).toBe(MetricStatus.FailedValidation)
    expect(result.value).toBeNull()
  })

  it('resolves primitive dependencies before fielding composites', () => {
    const registry = loadDefaultMetricRegistry()

    expect(resolveExecutionPlan(registry, ['field.impact']).orderedMetricIds).toEqual([
      'field.matches',
      'field.dismissals',
      'field.catches',
      'field.stumpings',
      'field.run_outs',
      'field.assisted_run_outs',
      'field.impact',
    ])
  })

  it('integrates with registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const metrics = new MetricRunner(registry).run({
      pkm: makePkm([makeInnings({ catches: 1 })]),
      metricIds: ['field.impact', 'field.reliability', 'field.activity'],
    })

    expect(registry.has('field.impact')).toBe(true)
    expect(registry.has('field.reliability')).toBe(true)
    expect(registry.has('field.activity')).toBe(true)
    expect(metrics.get('field.impact')?.status).toBe(MetricStatus.Success)
  })

  it('is deterministic across repeated executions', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([makeInnings({ catches: 1, runOutsDirect: 1 })])

    expect(
      new MetricRunner(registry)
        .run({ pkm, metricIds: ['field.impact', 'field.activity'] })
        .toJSON(),
    ).toEqual(
      new MetricRunner(registry)
        .run({ pkm, metricIds: ['field.impact', 'field.activity'] })
        .toJSON(),
    )
  })

  it('can execute from a minimal registry with declared primitive dependencies', () => {
    const registry = MetricRegistry.fromDefinitions([
      primitiveDefinition('field.innings', 2),
      primitiveDefinition('field.dismissals', 3),
      {
        id: 'field.reliability',
        name: 'Fielding Reliability',
        category: MetricCategory.Fielding,
        level: MetricLevel.Composite,
        dependencies: ['field.innings', 'field.dismissals'],
        version: '1.0.0',
        calculator: new FieldReliabilityCalculator(),
      },
    ])
    const metrics = new MetricRunner(registry).run({
      pkm: makePkm([makeInnings({})]),
      metricIds: ['field.reliability'],
    })

    expect(metrics.get('field.reliability')?.value).toBe(100)
  })
})
