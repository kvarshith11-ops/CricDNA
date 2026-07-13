import { describe, expect, it } from 'vitest'
import { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import {
  PlayerMatchRecord,
  type PlayerMatchRecordProps,
} from '../../domain/models/PlayerMatchRecord'
import {
  MatchFormat,
  MatchResultType,
  PlayerRole,
  type AuditMetadata,
} from '../../domain/types/common'
import {
  EngineeringMetrics,
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricResult,
} from '../../metrics'
import {
  TraitCategory,
  TraitResults,
  TraitStatus,
  type TraitResult,
} from '../../traits'
import { buildPlayerProfile } from '../PlayerProfileBuilder'
import { validatePlayerProfile } from '../PlayerProfileValidator'
import type { PlayerProfile } from '../PlayerProfile'

const metadata: AuditMetadata = {
  schemaVersion: 'profile-test',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
}

const metric = (
  metricId: string,
  level: MetricLevel,
  category: MetricCategory,
  value: number,
): MetricResult => ({
  metricId,
  name: metricId,
  category,
  level,
  value,
  unit: 'unit',
  sampleSize: 3,
  confidence: 1,
  status: MetricStatus.Success,
  version: '1.0.0',
  metadata: {},
})

const trait = (
  traitId: string,
  category: TraitCategory,
  classification: string,
): TraitResult => ({
  traitId,
  traitName: traitId,
  category,
  classification,
  confidence: 1,
  supportingMetrics: [],
  explanation: `${traitId} from deterministic composite metrics.`,
  status: TraitStatus.Success,
  version: '1.0.0',
})

const metrics = (entries: readonly MetricResult[]): EngineeringMetrics => {
  return new EngineeringMetrics(new Map(entries.map((entry) => [entry.metricId, entry])))
}

const traits = (entries: readonly TraitResult[]): TraitResults => {
  return new TraitResults(new Map(entries.map((entry) => [entry.traitId, entry])))
}

type RecordOverrides = Omit<Partial<PlayerMatchRecordProps>, 'identity'> & {
  readonly identity?: Partial<PlayerMatchRecordProps['identity']>
}

const defaultMetrics = (): EngineeringMetrics =>
  metrics([
    metric('context.matches', MetricLevel.Primitive, MetricCategory.Context, 3),
    metric('bat.runs', MetricLevel.Primitive, MetricCategory.Batting, 180),
    metric('bat.average', MetricLevel.Primitive, MetricCategory.Batting, 60),
    metric('bat.strike_rate', MetricLevel.Primitive, MetricCategory.Batting, 125),
    metric('bat.highest_score', MetricLevel.Primitive, MetricCategory.Batting, 90),
    metric('bowl.wickets', MetricLevel.Primitive, MetricCategory.Bowling, 4),
    metric('bowl.economy', MetricLevel.Primitive, MetricCategory.Bowling, 5.5),
    metric('field.catches', MetricLevel.Primitive, MetricCategory.Fielding, 2),
    metric('bat.intent', MetricLevel.Composite, MetricCategory.Batting, 80),
    metric('bowl.control', MetricLevel.Composite, MetricCategory.Bowling, 70),
    metric('field.impact', MetricLevel.Composite, MetricCategory.Fielding, 75),
  ])

const defaultTraits = (): TraitResults =>
  traits([
    trait('trait.batting_style', TraitCategory.Batting, 'Aggressive Stroke Player'),
    trait('trait.bowling_style', TraitCategory.Bowling, 'Balanced Bowler'),
    trait('trait.fielding_style', TraitCategory.Fielding, 'Active Fielder'),
  ])

const makeRecord = (
  matchId: string,
  matchDate: string,
  role: PlayerRole,
  overrides: RecordOverrides = {},
): PlayerMatchRecord => {
  return PlayerMatchRecord.create({
    identity: {
      playerId: 'p1',
      playerName: 'Player One',
      matchId,
      team: { id: 'team-a', name: 'Team A' },
      opponent: { id: 'team-b', name: 'Team B' },
      country: 'India',
      role,
      ...overrides.identity,
    },
    context: {
      format: MatchFormat.ODI,
      matchDate,
      venue: { country: 'India' },
      inningsPlayed: [1],
      matchResult: MatchResultType.Won,
      ...overrides.context,
    },
    batting: {
      innings: [
        {
          inningsNumber: 1,
          didBat: true,
          runs: 40,
          ballsFaced: 30,
          fours: 4,
          sixes: 1,
        },
      ],
      ...overrides.batting,
    },
    bowling: {
      spells: [
        {
          inningsNumber: 1,
          didBowl: true,
          overs: 4,
          balls: 24,
          maidens: 0,
          runsConceded: 22,
          wickets: 2,
          noBalls: 0,
          wides: 1,
        },
      ],
      wickets: [],
      ...overrides.bowling,
    },
    fielding: {
      innings: [
        {
          inningsNumber: 1,
          catches: 1,
          stumpings: 0,
          runOutsDirect: 0,
          runOutsAssisted: 0,
        },
      ],
      ...overrides.fielding,
    },
    behaviour: {
      captain: false,
      wicketKeeper: role === PlayerRole.WicketKeeper,
      substitute: false,
      playerOfMatch: false,
      events: [],
      ...overrides.behaviour,
    },
    progression: {
      battingTimeline: [],
      bowlingTimeline: [],
      ...overrides.progression,
    },
    metadata,
  })
}

const makePkm = (
  role: PlayerRole,
  records: readonly PlayerMatchRecord[] = [
    makeRecord('m1', '2026-01-01', role),
    makeRecord('m2', '2026-01-02', role),
    makeRecord('m3', '2026-01-03', role),
  ],
): PlayerKnowledgeModel => {
  return PlayerKnowledgeModel.create({
    identity: {
      playerId: 'p1',
      playerName: 'Player One',
      primaryTeam: { id: 'team-a', name: 'Team A' },
    },
    history: {
      records,
      index: records.map((record) => ({
        matchId: record.matchId,
        matchDate: record.context.matchDate,
        format: record.context.format,
        team: record.identity.team,
        opponent: record.identity.opponent,
      })),
    },
    metadata,
  })
}

const build = (pkm: PlayerKnowledgeModel = makePkm(PlayerRole.Batter)) =>
  buildPlayerProfile({
    pkm,
    metrics: defaultMetrics(),
    traits: defaultTraits(),
    generatedAt: '2026-06-27T00:00:00.000Z',
    engineVersion: 'test-engine',
  })

describe('PlayerProfileBuilder', () => {
  it('builds a batter profile from deterministic evidence', () => {
    const { profile, validation } = build(makePkm(PlayerRole.Batter))

    expect(validation.valid).toBe(true)
    expect(profile.identity.role).toBe('batter')
    expect(profile.identity.country).toBe('India')
    expect(profile.identity.primaryTeam?.name).toBe('Team A')
    expect(profile.headlineStats).toMatchObject({
      matches: 3,
      runs: 180,
      battingAverage: 60,
      strikeRate: 125,
      bestScore: 90,
      bestBowling: '2/22',
    })
    expect(profile.primitiveMetrics['bat.runs']?.value).toBe(180)
    expect(profile.compositeMetrics['bat.intent']?.value).toBe(80)
    expect(profile.traits['trait.batting_style']?.classification).toBe(
      'Aggressive Stroke Player',
    )
  })

  it('derives age from supported source date formats', () => {
    const ddMmYyyy = makePkm(PlayerRole.Batter, [
      makeRecord('m1', '2026-01-01', PlayerRole.Batter, {
        identity: { dateOfBirth: '28/12/2001' },
      }),
      makeRecord('m2', '2026-01-02', PlayerRole.Batter, {
        identity: { dateOfBirth: '28/12/2001' },
      }),
      makeRecord('m3', '2026-01-03', PlayerRole.Batter, {
        identity: { dateOfBirth: '28/12/2001' },
      }),
    ])
    const iso = makePkm(PlayerRole.Batter, [
      makeRecord('m1', '2026-01-01', PlayerRole.Batter, {
        identity: { dateOfBirth: '1998-07-18' },
      }),
      makeRecord('m2', '2026-01-02', PlayerRole.Batter, {
        identity: { dateOfBirth: '1998-07-18' },
      }),
      makeRecord('m3', '2026-01-03', PlayerRole.Batter, {
        identity: { dateOfBirth: '1998-07-18' },
      }),
    ])

    expect(build(ddMmYyyy).profile.identity.age).toBe(24)
    expect(build(iso).profile.identity.age).toBe(27)
  })

  it('derives country from national team metadata when nationality is blank', () => {
    const records = [
      makeRecord('m1', '2026-01-01', PlayerRole.AllRounder, {
        identity: {
          country: '',
          team: { id: '3', name: 'India Men' },
        },
      }),
      makeRecord('m2', '2026-01-02', PlayerRole.AllRounder, {
        identity: {
          country: '',
          team: { id: '3', name: 'India Men' },
        },
      }),
      makeRecord('m3', '2026-01-03', PlayerRole.AllRounder, {
        identity: {
          country: '',
          team: { id: '3', name: 'India Men' },
        },
      }),
    ]
    const { profile } = build(makePkm(PlayerRole.AllRounder, records))

    expect(profile.identity.country).toBe('India')
  })

  it('builds a bowler profile', () => {
    const { profile } = build(makePkm(PlayerRole.Bowler))

    expect(profile.identity.role).toBe('bowler')
    expect(profile.headlineStats.wickets).toBe(4)
    expect(profile.headlineStats.economy).toBe(5.5)
  })

  it('builds an all-rounder profile with one common schema', () => {
    const { profile } = build(makePkm(PlayerRole.AllRounder))

    expect(profile.identity.role).toBe('all_rounder')
    expect(profile.headlineStats.runs).toBe(180)
    expect(profile.headlineStats.wickets).toBe(4)
  })

  it('builds a wicket keeper profile', () => {
    const { profile } = build(makePkm(PlayerRole.WicketKeeper))

    expect(profile.identity.role).toBe('wicket_keeper')
    expect(profile.headlineStats.catches).toBe(2)
    expect(profile.headlineStats.keeperDismissals).toBeDefined()
    expect(profile.traits['trait.fielding_style']?.classification).toBe(
      'Active Fielder',
    )
  })

  it('marks careers with fewer than three matches as guardrail ineligible', () => {
    const records = [
      makeRecord('m1', '2026-01-01', PlayerRole.Batter),
      makeRecord('m2', '2026-01-02', PlayerRole.Batter),
    ]
    const { profile } = build(makePkm(PlayerRole.Batter, records))

    expect(profile.guardrails).toMatchObject({
      eligible: false,
      sampleSize: 2,
      minimumRequiredMatches: 3,
    })
    expect(profile.guardrails.reasons[0]).toContain('At least 3 match records')
  })

  it('allows careers with exactly three matches through guardrails', () => {
    const { profile } = build(makePkm(PlayerRole.Batter))

    expect(profile.guardrails.eligible).toBe(true)
    expect(profile.guardrails.sampleSize).toBe(3)
  })

  it('detects improving batting trend over the latest three matches', () => {
    const records = [
      makeRecord('m1', '2026-01-01', PlayerRole.Batter, {
        batting: { innings: [{ inningsNumber: 1, didBat: true, runs: 10, ballsFaced: 10, fours: 1, sixes: 0 }] },
      }),
      makeRecord('m2', '2026-01-02', PlayerRole.Batter, {
        batting: { innings: [{ inningsNumber: 1, didBat: true, runs: 20, ballsFaced: 15, fours: 2, sixes: 0 }] },
      }),
      makeRecord('m3', '2026-01-03', PlayerRole.Batter, {
        batting: { innings: [{ inningsNumber: 1, didBat: true, runs: 60, ballsFaced: 40, fours: 6, sixes: 1 }] },
      }),
    ]
    const { profile } = build(makePkm(PlayerRole.Batter, records))

    expect(profile.trend.label).toBe('Improving')
    expect(profile.trend.direction).toBe('up')
    expect(profile.trend.reason).toContain('lifted scoring output')
    expect(profile.trend.reason).not.toContain('(10, 20, 60)')
  })

  it('detects strong batting form from multiple recent fifties', () => {
    const records = [89, 89, 97].map((runs, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.Batter, {
        batting: { innings: [{ inningsNumber: 1, didBat: true, runs, ballsFaced: 50, fours: 8, sixes: 2 }] },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.Batter, records))

    expect(profile.trend.label).toBe('Strong')
    expect(profile.trend.direction).toBe('up')
    expect(profile.trend.reason).toContain('strong batting form')
  })

  it('detects declining batting trend over the latest three matches', () => {
    const records = [
      makeRecord('m1', '2026-01-01', PlayerRole.Batter, {
        batting: { innings: [{ inningsNumber: 1, didBat: true, runs: 60, ballsFaced: 40, fours: 6, sixes: 1 }] },
      }),
      makeRecord('m2', '2026-01-02', PlayerRole.Batter, {
        batting: { innings: [{ inningsNumber: 1, didBat: true, runs: 20, ballsFaced: 15, fours: 2, sixes: 0 }] },
      }),
      makeRecord('m3', '2026-01-03', PlayerRole.Batter, {
        batting: { innings: [{ inningsNumber: 1, didBat: true, runs: 10, ballsFaced: 10, fours: 1, sixes: 0 }] },
      }),
    ]
    const { profile } = build(makePkm(PlayerRole.Batter, records))

    expect(profile.trend.label).toBe('Declining')
    expect(profile.trend.direction).toBe('down')
    expect(profile.trend.reason).toContain('lower scoring returns')
    expect(profile.trend.reason).not.toContain('(60, 20, 10)')
  })

  it('marks mixed batting recovery as stable instead of declining', () => {
    const records = [69, 16, 40].map((runs, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.Batter, {
        batting: { innings: [{ inningsNumber: 1, didBat: true, runs, ballsFaced: 35, fours: 4, sixes: 1 }] },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.Batter, records))

    expect(profile.trend.label).toBe('Stable')
    expect(profile.trend.direction).toBe('flat')
    expect(profile.trend.reason).toContain('after a strong score and a dip')
  })

  it('detects weak batting form from consistently low recent output', () => {
    const records = [5, 12, 8].map((runs, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.Batter, {
        batting: { innings: [{ inningsNumber: 1, didBat: true, runs, ballsFaced: 20, fours: 1, sixes: 0 }] },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.Batter, records))

    expect(profile.trend.label).toBe('Weak')
    expect(profile.trend.direction).toBe('down')
    expect(profile.trend.reason).toContain('not produced enough recent scoring output')
  })

  it('detects improving bowling trend from wickets', () => {
    const records = [0, 1, 3].map((wickets, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.Bowler, {
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: 24,
              wickets,
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.Bowler, records))

    expect(profile.trend.label).toBe('Improving')
    expect(profile.trend.reason).toContain('combined wicket-taking and economy profile')
  })

  it('summarizes bowling trend without dumping raw metric sequences', () => {
    const economies = [9, 8.25, 3.75]
    const records = [2, 1, 4].map((wickets, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.Bowler, {
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: economies[index] * 4,
              wickets,
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.Bowler, records))

    expect(profile.trend.label).toBe('Improving')
    expect(profile.trend.reason).toContain('combined wicket-taking and economy profile')
    expect(profile.trend.reason).not.toContain('(2, 1, 4)')
    expect(profile.trend.reason).not.toContain('(9, 8.25, 3.75)')
  })

  it('marks low-wicket economical bowling as stable rather than weak', () => {
    const records = [3.2, 3.5, 3.1].map((economy, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.Bowler, {
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: economy * 4,
              wickets: 0,
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.Bowler, records))

    expect(profile.trend.label).toBe('Stable')
    expect(profile.trend.reason).toContain('balanced')
  })

  it('detects weak bowling trend from low wickets and expensive economy', () => {
    const records = [0, 0, 0].map((wickets, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.Bowler, {
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: [38, 40, 42][index],
              wickets,
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.Bowler, records))

    expect(profile.trend.label).toBe('Weak')
    expect(profile.trend.reason).toContain('low wicket threat')
  })

  it('detects declining bowling trend when combined impact drops', () => {
    const wickets = [3, 1, 0]
    const economies = [4.5, 7, 9]
    const records = wickets.map((wicketCount, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.Bowler, {
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: economies[index] * 4,
              wickets: wicketCount,
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.Bowler, records))

    expect(profile.trend.label).toBe('Declining')
    expect(profile.trend.reason).toContain('combined wicket-taking and economy profile')
  })

  it('uses batting only for wicketkeeper trend and ignores dismissals', () => {
    const records = [0, 1, 2].map((dismissals, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.WicketKeeper, {
        batting: {
          innings: [
            {
              inningsNumber: 1,
              didBat: true,
              runs: [69, 16, 40][index],
              ballsFaced: 40,
              fours: 4,
              sixes: 1,
            },
          ],
        },
        fielding: {
          innings: [
            {
              inningsNumber: 1,
              catches: dismissals,
              stumpings: 0,
              runOutsDirect: 0,
              runOutsAssisted: 0,
            },
          ],
        },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.WicketKeeper, records))

    expect(profile.trend.label).toBe('Stable')
    expect(profile.trend.reason).toContain('wicketkeeper')
    expect(profile.trend.reason).not.toContain('dismissals')
  })

  it('marks sustained wicketkeeper 50-plus scoring as strong form', () => {
    const runs = [97, 89, 89]
    const dismissals = [2, 1, 0]
    const records = runs.map((score, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.WicketKeeper, {
        batting: {
          innings: [
            {
              inningsNumber: 1,
              didBat: true,
              runs: score,
              ballsFaced: 50,
              fours: 8,
              sixes: 2,
            },
          ],
        },
        fielding: {
          innings: [
            {
              inningsNumber: 1,
              catches: dismissals[index],
              stumpings: 0,
              runOutsDirect: 0,
              runOutsAssisted: 0,
            },
          ],
        },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.WicketKeeper, records))

    expect(profile.trend.label).toBe('Strong')
    expect(profile.trend.direction).toBe('up')
    expect(profile.trend.reason).toContain('strong batting form')
    expect(profile.trend.reason).toContain('sustained scoring output')
  })

  it('marks all-rounder strong batting and weak bowling as stable', () => {
    const runs = [70, 65, 80]
    const records = runs.map((score, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.AllRounder, {
        batting: {
          innings: [
            {
              inningsNumber: 1,
              didBat: true,
              runs: score,
              ballsFaced: 50,
              fours: 7,
              sixes: 1,
            },
          ],
        },
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: [42, 40, 44][index],
              wickets: 0,
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.AllRounder, records))

    expect(profile.trend.label).toBe('Stable')
    expect(profile.trend.reason).toContain('batting and bowling signals')
  })

  it('marks all-rounder strong batting and bowling as strong', () => {
    const records = [70, 65, 80].map((score, index) =>
      makeRecord(`m${index + 1}`, `2026-01-0${index + 1}`, PlayerRole.AllRounder, {
        batting: {
          innings: [
            {
              inningsNumber: 1,
              didBat: true,
              runs: score,
              ballsFaced: 50,
              fours: 7,
              sixes: 1,
            },
          ],
        },
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: [18, 16, 14][index],
              wickets: [2, 3, 3][index],
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
    )
    const { profile } = build(makePkm(PlayerRole.AllRounder, records))

    expect(profile.trend.label).toBe('Strong')
    expect(profile.trend.reason).toContain('both batting and bowling')
  })

  it('selects the best bowling figure by wickets, then lower runs conceded', () => {
    const records = [
      makeRecord('m1', '2026-01-01', PlayerRole.Bowler, {
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: 35,
              wickets: 3,
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
      makeRecord('m2', '2026-01-02', PlayerRole.Bowler, {
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: 24,
              wickets: 4,
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
      makeRecord('m3', '2026-01-03', PlayerRole.Bowler, {
        bowling: {
          wickets: [],
          spells: [
            {
              inningsNumber: 1,
              didBowl: true,
              overs: 4,
              balls: 24,
              maidens: 0,
              runsConceded: 18,
              wickets: 3,
              noBalls: 0,
              wides: 0,
            },
          ],
        },
      }),
    ]
    const { profile } = build(makePkm(PlayerRole.Bowler, records))

    expect(profile.headlineStats.bestBowling).toBe('4/24')
  })

  it('keeps only the latest five recent matches', () => {
    const records = Array.from({ length: 7 }, (_, index) =>
      makeRecord(`m${index + 1}`, `2026-01-${String(index + 1).padStart(2, '0')}`, PlayerRole.Batter),
    )
    const { profile } = build(makePkm(PlayerRole.Batter, records))

    expect(profile.recentMatches.map((match) => match.matchId)).toEqual([
      'm7',
      'm6',
      'm5',
      'm4',
      'm3',
    ])
  })

  it('supports empty careers with null or empty deterministic sections', () => {
    const emptyPkm = PlayerKnowledgeModel.empty(
      { playerId: 'p1', playerName: 'Player One' },
      metadata,
    )
    const { profile } = buildPlayerProfile({
      pkm: emptyPkm,
      metrics: defaultMetrics(),
      traits: defaultTraits(),
      generatedAt: '2026-06-27T00:00:00.000Z',
    })

    expect(profile.identity.role).toBeNull()
    expect(profile.recentMatches).toEqual([])
    expect(profile.metadata.sampleSize).toBe(0)
  })

  it('validates missing metrics', () => {
    const { validation } = buildPlayerProfile({
      pkm: makePkm(PlayerRole.Batter),
      metrics: metrics([]),
      traits: defaultTraits(),
      generatedAt: '2026-06-27T00:00:00.000Z',
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Player profile is missing metrics.')
  })

  it('validates missing traits', () => {
    const { validation } = buildPlayerProfile({
      pkm: makePkm(PlayerRole.Batter),
      metrics: defaultMetrics(),
      traits: traits([]),
      generatedAt: '2026-06-27T00:00:00.000Z',
    })

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Player profile is missing traits.')
  })

  it('validates missing player identity and unsupported role', () => {
    const { profile } = build()
    const invalidProfile: PlayerProfile = {
      ...profile,
      identity: {
        ...profile.identity,
        playerId: '',
        role: 'unknown_role' as PlayerProfile['identity']['role'],
      },
    }
    const validation = validatePlayerProfile(invalidProfile)

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Player profile is missing playerId.')
    expect(validation.errors).toContain("Unsupported player role 'unknown_role'.")
  })

  it('is deterministic when generatedAt is fixed', () => {
    expect(build().profile).toEqual(build().profile)
  })
})
