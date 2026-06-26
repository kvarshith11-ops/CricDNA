import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import {
  PlayerMatchRecord,
  type PlayerMatchRecordProps,
} from '../../domain/models/PlayerMatchRecord'
import { MatchFormat, MatchResultType } from '../../domain/types/common'
import {
  BowlControlCalculator,
  BowlWicketThreatCalculator,
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
  spell: PlayerMatchRecordProps['bowling']['spells'][number],
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
      inningsPlayed: [spell.inningsNumber],
      matchResult: MatchResultType.Won,
    },
    batting: {
      innings: [],
    },
    bowling: {
      spells: [spell],
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

const makeSpell = (
  overrides: Partial<PlayerMatchRecordProps['bowling']['spells'][number]>,
): PlayerMatchRecordProps['bowling']['spells'][number] => ({
  inningsId: 'i1',
  inningsNumber: 1,
  didBowl: true,
  overs: 10,
  balls: 60,
  maidens: 0,
  runsConceded: 40,
  wickets: 2,
  noBalls: 0,
  wides: 0,
  ...overrides,
})

const makePkm = (
  spells: readonly PlayerMatchRecordProps['bowling']['spells'][number][],
): PlayerKnowledgeModel => {
  return PlayerKnowledgeModel.fromRecords(
    'p1',
    spells.map((spell, index) => makeRecord(String(index + 1), spell)),
    metadata,
    'Player One',
  )
}

const runBowlingComposites = (pkm: PlayerKnowledgeModel) => {
  return new MetricRunner(loadDefaultMetricRegistry()).run({
    pkm,
    metricIds: ['bowl.control', 'bowl.wicket_threat', 'bowl.effectiveness'],
  })
}

const primitiveResult = (metricId: string, value: number): MetricResult => ({
  metricId,
  name: metricId,
  category: MetricCategory.Bowling,
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
  category: MetricCategory.Bowling,
  level: MetricLevel.Primitive,
  dependencies: [],
  version: '1.0.0',
  calculator: new StubMetricCalculator({
    metricId,
    name: metricId,
    category: MetricCategory.Bowling,
    level: MetricLevel.Primitive,
    version: '1.0.0',
    value,
  }),
})

describe('Bowling composite metrics', () => {
  it('scores attacking wicket-taking bowlers strongly for threat and effectiveness', () => {
    const metrics = runBowlingComposites(
      makePkm([
        makeSpell({ overs: 10, balls: 60, runsConceded: 40, wickets: 4, maidens: 1, wides: 1 }),
        makeSpell({ overs: 8, balls: 48, runsConceded: 32, wickets: 3 }),
      ]),
    )

    expect(metrics.get('bowl.control')?.value).toBe(63.89)
    expect(metrics.get('bowl.wicket_threat')?.value).toBe(100)
    expect(metrics.get('bowl.effectiveness')?.value).toBe(75.4)
  })

  it('scores economical bowlers strongly for control', () => {
    const metrics = runBowlingComposites(
      makePkm([
        makeSpell({
          overs: 10,
          balls: 60,
          runsConceded: 20,
          wickets: 0,
          maidens: 3,
        }),
      ]),
    )

    expect(metrics.get('bowl.control')?.value).toBe(90)
    expect(metrics.get('bowl.wicket_threat')?.value).toBe(0)
    expect(metrics.get('bowl.effectiveness')?.status).toBe(MetricStatus.FailedValidation)
  })

  it('scores defensive low-wicket bowlers without inventing wicket threat', () => {
    const metrics = runBowlingComposites(
      makePkm([
        makeSpell({
          overs: 6,
          balls: 36,
          runsConceded: 18,
          wickets: 0,
          maidens: 1,
        }),
      ]),
    )

    expect(metrics.get('bowl.control')?.value).toBeCloseTo(81.67)
    expect(metrics.get('bowl.wicket_threat')?.value).toBe(0)
  })

  it('scores inconsistent expensive bowling lower', () => {
    const metrics = runBowlingComposites(
      makePkm([
        makeSpell({
          overs: 5,
          balls: 30,
          runsConceded: 60,
          wickets: 1,
          wides: 5,
          noBalls: 2,
        }),
      ]),
    )

    expect(metrics.get('bowl.control')?.value).toBe(0)
    expect(metrics.get('bowl.wicket_threat')?.value).toBe(45)
    expect(metrics.get('bowl.effectiveness')?.value).toBe(20)
  })

  it('handles small sample careers deterministically', () => {
    const metrics = runBowlingComposites(
      makePkm([makeSpell({ overs: 2, balls: 12, runsConceded: 8, wickets: 1 })]),
    )

    expect(metrics.get('bowl.control')?.value).toBe(60)
    expect(metrics.get('bowl.wicket_threat')?.value).toBe(45)
  })

  it('returns validation failure when primitive metric results are missing', () => {
    const result = new BowlControlCalculator().calculate({
      pkm: makePkm([makeSpell({})]),
      results: new Map([
        ['bowl.economy', primitiveResult('bowl.economy', 4)],
        ['bowl.wides', primitiveResult('bowl.wides', 0)],
      ]),
    })

    expect(result.status).toBe(MetricStatus.FailedValidation)
    expect(result.value).toBeNull()
  })

  it('resolves primitive dependencies before bowling composites', () => {
    const registry = loadDefaultMetricRegistry()

    expect(resolveExecutionPlan(registry, ['bowl.control']).orderedMetricIds).toEqual([
      'bowl.economy',
      'bowl.wides',
      'bowl.no_balls',
      'bowl.overs',
      'bowl.maidens',
      'bowl.control',
    ])
  })

  it('integrates with registry and runner', () => {
    const registry = loadDefaultMetricRegistry()
    const metrics = new MetricRunner(registry).run({
      pkm: makePkm([makeSpell({ wickets: 2 })]),
      metricIds: ['bowl.control', 'bowl.wicket_threat', 'bowl.effectiveness'],
    })

    expect(registry.has('bowl.control')).toBe(true)
    expect(registry.has('bowl.wicket_threat')).toBe(true)
    expect(registry.has('bowl.effectiveness')).toBe(true)
    expect(registry.has('bowl.consistency')).toBe(false)
    expect(metrics.get('bowl.control')?.status).toBe(MetricStatus.Success)
  })

  it('is deterministic across repeated executions', () => {
    const registry = loadDefaultMetricRegistry()
    const pkm = makePkm([makeSpell({ wickets: 3, runsConceded: 30 })])

    expect(
      new MetricRunner(registry)
        .run({ pkm, metricIds: ['bowl.control', 'bowl.wicket_threat'] })
        .toJSON(),
    ).toEqual(
      new MetricRunner(registry)
        .run({ pkm, metricIds: ['bowl.control', 'bowl.wicket_threat'] })
        .toJSON(),
    )
  })

  it('can execute from a minimal registry with declared primitive dependencies', () => {
    const registry = MetricRegistry.fromDefinitions([
      primitiveDefinition('bowl.wickets', 4),
      primitiveDefinition('bowl.innings', 2),
      primitiveDefinition('bowl.matches', 2),
      {
        id: 'bowl.wicket_threat',
        name: 'Wicket Threat',
        category: MetricCategory.Bowling,
        level: MetricLevel.Composite,
        dependencies: ['bowl.wickets', 'bowl.innings', 'bowl.matches'],
        version: '1.0.0',
        calculator: new BowlWicketThreatCalculator(),
      },
    ])
    const metrics = new MetricRunner(registry).run({
      pkm: makePkm([makeSpell({})]),
      metricIds: ['bowl.wicket_threat'],
    })

    expect(metrics.get('bowl.wicket_threat')?.value).toBe(90)
  })
})
