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
  overrides: Partial<PlayerMatchRecordProps> = {},
): PlayerMatchRecord => {
  return PlayerMatchRecord.create({
    identity: {
      playerId: 'p1',
      playerName: 'Player One',
      matchId,
      team: { id: 'team-a', name: 'Team A' },
      opponent: { id: 'team-b', name: 'Team B' },
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
    })
    expect(profile.primitiveMetrics['bat.runs']?.value).toBe(180)
    expect(profile.compositeMetrics['bat.intent']?.value).toBe(80)
    expect(profile.traits['trait.batting_style']?.classification).toBe(
      'Aggressive Stroke Player',
    )
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
    expect(profile.traits['trait.fielding_style']?.classification).toBe(
      'Active Fielder',
    )
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
