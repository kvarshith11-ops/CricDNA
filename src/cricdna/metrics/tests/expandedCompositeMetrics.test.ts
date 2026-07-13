import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import { PlayerMatchRecord, type PlayerMatchRecordProps } from '../../domain/models/PlayerMatchRecord'
import { DismissalKind, MatchFormat, MatchResultType } from '../../domain/types/common'
import {
  BatConversionCalculator,
  BatDismissalResilienceCalculator,
  BatEffectivenessCalculator,
  MetricCategory,
  MetricLevel,
  MetricRegistry,
  MetricRunner,
  MetricStatus,
  StubMetricCalculator,
  compositeMetricDefinitions,
  loadDefaultMetricRegistry,
  resolveExecutionPlan,
  validateMetricRegistry,
  type MetricDefinition,
  type MetricId,
  type MetricResult,
} from '../index'

const metadata = {
  schemaVersion: 'test',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
}

const expandedMetricIds = [
  'bat.effectiveness',
  'bat.conversion',
  'bat.dismissal_resilience',
  'bowl.run_control',
  'bowl.discipline',
  'bowl.wicket_efficiency',
  'field.catching_impact',
  'field.run_out_impact',
  'field.dismissal_involvement',
] as const

const makeRecord = (
  matchId: string,
  runs: number,
  dismissalKind: DismissalKind,
  bowling: PlayerMatchRecordProps['bowling']['spells'][number],
  fielding: PlayerMatchRecordProps['fielding']['innings'][number],
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
      inningsPlayed: [1, 2],
      matchResult: MatchResultType.Won,
    },
    batting: {
      innings: [
        {
          inningsId: `${matchId}-bat`,
          inningsNumber: 1,
          didBat: true,
          runs,
          ballsFaced: Math.max(1, Math.round(runs * 0.8)),
          fours: Math.floor(runs / 20),
          sixes: Math.floor(runs / 50),
          dismissal: { kind: dismissalKind },
        },
      ],
    },
    bowling: {
      spells: [bowling],
      wickets: [],
    },
    fielding: {
      innings: [fielding],
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

const makePkm = (): PlayerKnowledgeModel => {
  const records = [
    makeRecord(
      '1',
      80,
      DismissalKind.Caught,
      {
        inningsId: '1-bowl',
        inningsNumber: 2,
        didBowl: true,
        overs: 10,
        balls: 60,
        maidens: 1,
        runsConceded: 40,
        wickets: 2,
        noBalls: 0,
        wides: 1,
      },
      {
        inningsId: '1-field',
        inningsNumber: 2,
        catches: 1,
        stumpings: 0,
        runOutsDirect: 0,
        runOutsAssisted: 0,
      },
    ),
    makeRecord(
      '2',
      120,
      DismissalKind.NotOut,
      {
        inningsId: '2-bowl',
        inningsNumber: 2,
        didBowl: true,
        overs: 8,
        balls: 48,
        maidens: 0,
        runsConceded: 48,
        wickets: 3,
        noBalls: 0,
        wides: 2,
      },
      {
        inningsId: '2-field',
        inningsNumber: 2,
        catches: 0,
        stumpings: 0,
        runOutsDirect: 1,
        runOutsAssisted: 0,
      },
    ),
    makeRecord(
      '3',
      5,
      DismissalKind.Bowled,
      {
        inningsId: '3-bowl',
        inningsNumber: 2,
        didBowl: true,
        overs: 6,
        balls: 36,
        maidens: 0,
        runsConceded: 30,
        wickets: 1,
        noBalls: 1,
        wides: 1,
      },
      {
        inningsId: '3-field',
        inningsNumber: 2,
        catches: 1,
        stumpings: 0,
        runOutsDirect: 0,
        runOutsAssisted: 1,
      },
    ),
  ]

  return PlayerKnowledgeModel.fromRecords('p1', records, metadata, 'Player One')
}

const metricResult = (
  metricId: MetricId,
  value: number,
  level: MetricLevel,
  status: MetricStatus = MetricStatus.Success,
): MetricResult => ({
  metricId,
  name: metricId,
  category: metricId.startsWith('bowl.')
    ? MetricCategory.Bowling
    : metricId.startsWith('field.')
      ? MetricCategory.Fielding
      : MetricCategory.Batting,
  level,
  value,
  unit: 'score',
  sampleSize: 10,
  confidence: status === MetricStatus.Success ? 1 : 0,
  status,
  version: '1.0.0',
  metadata: {},
})

const stubDefinition = (
  metricId: MetricId,
  value: number,
  level: MetricLevel,
): MetricDefinition => ({
  id: metricId,
  name: metricId,
  category: metricId.startsWith('bowl.')
    ? MetricCategory.Bowling
    : metricId.startsWith('field.')
      ? MetricCategory.Fielding
      : MetricCategory.Batting,
  level,
  dependencies: [],
  version: '1.0.0',
  calculator: new StubMetricCalculator({
    metricId,
    name: metricId,
    category: MetricCategory.Batting,
    level,
    version: '1.0.0',
    value,
  }),
})

describe('Expanded composite metrics', () => {
  it('registers every expanded composite metric', () => {
    const registry = loadDefaultMetricRegistry()
    const registeredCompositeIds = compositeMetricDefinitions.map(
      (definition) => definition.id,
    )

    for (const metricId of expandedMetricIds) {
      expect(registry.has(metricId)).toBe(true)
      expect(registeredCompositeIds).toContain(metricId)
    }
  })

  it('plans composite dependencies before bat.effectiveness', () => {
    const plan = resolveExecutionPlan(loadDefaultMetricRegistry(), ['bat.effectiveness'])
      .orderedMetricIds

    expect(plan.indexOf('bat.intent')).toBeLessThan(plan.indexOf('bat.effectiveness'))
    expect(plan.indexOf('bat.consistency')).toBeLessThan(
      plan.indexOf('bat.effectiveness'),
    )
    expect(plan.indexOf('bat.scoring_consistency')).toBeLessThan(
      plan.indexOf('bat.effectiveness'),
    )
    expect(plan.indexOf('bat.boundary_intent')).toBeLessThan(
      plan.indexOf('bat.effectiveness'),
    )
  })

  it('keeps unsupported composites unregistered', () => {
    const registry = loadDefaultMetricRegistry()

    expect(registry.has('bat.pressure')).toBe(false)
    expect(registry.has('bat.finishing')).toBe(false)
    expect(registry.has('bat.adaptability')).toBe(false)
    expect(registry.has('bowl.consistency')).toBe(false)
  })

  it('scores batting effectiveness from existing batting composites', () => {
    const result = new BatEffectivenessCalculator().calculate({
      pkm: makePkm(),
      results: new Map([
        ['bat.intent', metricResult('bat.intent', 80, MetricLevel.Composite)],
        ['bat.consistency', metricResult('bat.consistency', 70, MetricLevel.Composite)],
        [
          'bat.scoring_consistency',
          metricResult('bat.scoring_consistency', 60, MetricLevel.Composite),
        ],
        [
          'bat.boundary_intent',
          metricResult('bat.boundary_intent', 100, MetricLevel.Composite),
        ],
      ]),
    })

    expect(result.status).toBe(MetricStatus.Success)
    expect(result.value).toBe(75.5)
  })

  it('scores high-conversion batters strongly', () => {
    const metrics = new MetricRunner(
      MetricRegistry.fromDefinitions([
        stubDefinition('bat.innings', 10, MetricLevel.Primitive),
        stubDefinition('bat.fifties', 3, MetricLevel.Primitive),
        stubDefinition('bat.hundreds', 1, MetricLevel.Primitive),
        stubDefinition('bat.double_hundreds', 1, MetricLevel.Primitive),
        loadDefaultMetricRegistry().getRequired('bat.conversion'),
      ]),
    ).run({ pkm: makePkm(), metricIds: ['bat.conversion'] })

    expect(metrics.get('bat.conversion')?.value).toBe(100)
  })

  it('scores duck-heavy dismissal resilience weakly', () => {
    const result = new BatDismissalResilienceCalculator().calculate({
      pkm: makePkm(),
      results: new Map([
        ['bat.innings', metricResult('bat.innings', 5, MetricLevel.Primitive)],
        ['bat.outs', metricResult('bat.outs', 5, MetricLevel.Primitive)],
        ['bat.not_outs', metricResult('bat.not_outs', 0, MetricLevel.Primitive)],
        ['bat.ducks', metricResult('bat.ducks', 3, MetricLevel.Primitive)],
        ['bat.average', metricResult('bat.average', 10, MetricLevel.Primitive)],
      ]),
    })

    expect(result.status).toBe(MetricStatus.Success)
    expect(result.value).toBe(8)
  })

  it('returns validation failures for missing and failed dependencies', () => {
    const missing = new BatConversionCalculator().calculate({
      pkm: makePkm(),
      results: new Map([['bat.innings', metricResult('bat.innings', 5, MetricLevel.Primitive)]]),
    })
    const failed = new BatConversionCalculator().calculate({
      pkm: makePkm(),
      results: new Map([
        ['bat.innings', metricResult('bat.innings', 5, MetricLevel.Primitive)],
        ['bat.fifties', metricResult('bat.fifties', 1, MetricLevel.Primitive)],
        ['bat.hundreds', metricResult('bat.hundreds', 0, MetricLevel.Primitive)],
        [
          'bat.double_hundreds',
          metricResult(
            'bat.double_hundreds',
            0,
            MetricLevel.Primitive,
            MetricStatus.FailedValidation,
          ),
        ],
      ]),
    })
    const wrongLevel = new BatEffectivenessCalculator().calculate({
      pkm: makePkm(),
      results: new Map([
        ['bat.intent', metricResult('bat.intent', 80, MetricLevel.Primitive)],
      ]),
    })

    expect(missing.status).toBe(MetricStatus.FailedValidation)
    expect(failed.status).toBe(MetricStatus.FailedValidation)
    expect(wrongLevel.status).toBe(MetricStatus.FailedValidation)
  })

  it('scores bowling run control, discipline, and wicket efficiency', () => {
    const metrics = new MetricRunner(
      MetricRegistry.fromDefinitions([
        stubDefinition('bowl.economy', 4, MetricLevel.Primitive),
        stubDefinition('bowl.maidens', 2, MetricLevel.Primitive),
        stubDefinition('bowl.overs', 10, MetricLevel.Primitive),
        stubDefinition('bowl.wides', 1, MetricLevel.Primitive),
        stubDefinition('bowl.no_balls', 0, MetricLevel.Primitive),
        stubDefinition('bowl.average', 20, MetricLevel.Primitive),
        stubDefinition('bowl.strike_rate', 30, MetricLevel.Primitive),
        stubDefinition('bowl.wickets', 5, MetricLevel.Primitive),
        stubDefinition('bowl.innings', 2, MetricLevel.Primitive),
        loadDefaultMetricRegistry().getRequired('bowl.run_control'),
        loadDefaultMetricRegistry().getRequired('bowl.discipline'),
        loadDefaultMetricRegistry().getRequired('bowl.wicket_efficiency'),
      ]),
    ).run({
      pkm: makePkm(),
      metricIds: ['bowl.run_control', 'bowl.discipline', 'bowl.wicket_efficiency'],
    })

    expect(metrics.get('bowl.run_control')?.value).toBe(72)
    expect(metrics.get('bowl.discipline')?.value).toBe(90)
    expect(metrics.get('bowl.wicket_efficiency')?.value).toBe(64)
  })

  it('scores fielding specialist composites', () => {
    const metrics = new MetricRunner(
      MetricRegistry.fromDefinitions([
        stubDefinition('field.catches', 3, MetricLevel.Primitive),
        stubDefinition('field.matches', 5, MetricLevel.Primitive),
        stubDefinition('field.run_outs', 1, MetricLevel.Primitive),
        stubDefinition('field.assisted_run_outs', 1, MetricLevel.Primitive),
        stubDefinition('field.dismissals', 4, MetricLevel.Primitive),
        stubDefinition('field.innings', 4, MetricLevel.Primitive),
        loadDefaultMetricRegistry().getRequired('field.catching_impact'),
        loadDefaultMetricRegistry().getRequired('field.run_out_impact'),
        loadDefaultMetricRegistry().getRequired('field.dismissal_involvement'),
      ]),
    ).run({
      pkm: makePkm(),
      metricIds: [
        'field.catching_impact',
        'field.run_out_impact',
        'field.dismissal_involvement',
      ],
    })

    expect(metrics.get('field.catching_impact')?.value).toBe(60)
    expect(metrics.get('field.run_out_impact')?.value).toBe(80)
    expect(metrics.get('field.dismissal_involvement')?.value).toBe(50.67)
  })

  it('integrates all expanded composites with the default registry and runner', () => {
    const metrics = new MetricRunner(loadDefaultMetricRegistry()).run({
      pkm: makePkm(),
      metricIds: expandedMetricIds,
    })

    for (const metricId of expandedMetricIds) {
      expect(metrics.get(metricId)?.status).toBe(MetricStatus.Success)
      expect(metrics.get(metricId)?.level).toBe(MetricLevel.Composite)
    }
  })

  it('executes expanded composites deterministically', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm()

    expect(
      new MetricRunner(registry).run({ pkm, metricIds: expandedMetricIds }).toJSON(),
    ).toEqual(
      new MetricRunner(registry).run({ pkm, metricIds: expandedMetricIds }).toJSON(),
    )
  })

  it('keeps the expanded registry valid', () => {
    expect(() => validateMetricRegistry(loadDefaultMetricRegistry())).not.toThrow()
  })
})
