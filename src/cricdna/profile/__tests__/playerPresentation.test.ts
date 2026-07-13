import { describe, expect, it } from 'vitest'
import { MatchFormat, MatchResultType } from '../../domain'
import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricResult,
} from '../../metrics'
import { TraitCategory, TraitStatus, type TraitResult } from '../../traits'
import type { PlayerProfile, PlayerProfileRole } from '../PlayerProfile'
import { classifyDnaTier, classifyRoleArchetype } from '../PlayerPresentation'

const metric = (
  metricId: string,
  value: number,
  category = MetricCategory.Batting,
): MetricResult => ({
  metricId,
  name: metricId,
  category,
  level: MetricLevel.Composite,
  value,
  unit: 'score',
  sampleSize: 3,
  confidence: 1,
  status: MetricStatus.Success,
  version: '1.0.0',
  metadata: {},
})

const trait = (
  traitId: string,
  classification: string,
  category = TraitCategory.Batting,
): TraitResult => ({
  traitId,
  traitName: traitId,
  category,
  classification,
  confidence: 1,
  supportingMetrics: [],
  explanation: `${classification} from deterministic evidence.`,
  status: TraitStatus.Success,
  version: '1.0.0',
})

const profile = (
  role: PlayerProfileRole,
  compositeMetrics: readonly MetricResult[],
  traits: readonly TraitResult[] = [],
): PlayerProfile => ({
  identity: {
    playerId: 'p1',
    playerName: 'Player One',
    country: 'India',
    role,
    age: 28,
    primaryTeam: { id: 'team-a', name: 'Team A' },
  },
  headlineStats: {
    matches: 3,
    runs: null,
    wickets: null,
    catches: null,
    keeperDismissals: null,
    battingAverage: null,
    strikeRate: null,
    economy: null,
    bestScore: null,
    bestBowling: null,
  },
  recentMatches: [
    {
      matchId: 'm1',
      date: '2026-01-01',
      format: MatchFormat.T20,
      team: { id: 'team-a', name: 'Team A' },
      opponent: { id: 'team-b', name: 'Team B' },
      result: MatchResultType.Won,
      runs: null,
      wickets: null,
      bowlingRunsConceded: null,
      catches: null,
      stumpings: null,
      dismissals: null,
      economy: null,
      playerOfMatch: false,
    },
  ],
  trend: {
    label: 'Stable',
    direction: 'flat',
    reason: 'Stable recent evidence.',
    recentMatchCount: 3,
  },
  phaseAnalysis: {
    batting: [],
    bowling: [],
    coverage: {
      source: 'comments',
      matchesWithComments: 0,
      hasIncompleteCommentary: false,
    },
  },
  guardrails: {
    eligible: true,
    sampleSize: 3,
    minimumRequiredMatches: 3,
    reasons: [],
    warnings: [],
  },
  primitiveMetrics: {},
  compositeMetrics: Object.fromEntries(
    compositeMetrics.map((entry) => [entry.metricId, entry]),
  ),
  traits: Object.fromEntries(traits.map((entry) => [entry.traitId, entry])),
  metadata: {
    engineVersion: 'test',
    generatedAt: '2026-01-01T00:00:00.000Z',
    sampleSize: 3,
    supportedMetricCount: compositeMetrics.length,
    supportedCompositeCount: compositeMetrics.length,
    supportedTraitCount: traits.length,
  },
})

describe('PlayerPresentation', () => {
  it('classifies DNA score tier boundaries', () => {
    expect(classifyDnaTier(91).label).toBe('CricDNA Elite')
    expect(classifyDnaTier(90).label).toBe('Impact Prime')
    expect(classifyDnaTier(75).label).toBe('Impact Prime')
    expect(classifyDnaTier(74).label).toBe('Role Core')
    expect(classifyDnaTier(60).label).toBe('Role Core')
    expect(classifyDnaTier(59).label).toBe('Developing Spark')
    expect(classifyDnaTier(49).label).toBe('Emerging Profile')
  })

  it('classifies high intent batters as power hitters', () => {
    const result = classifyRoleArchetype(
      profile('batter', [
        metric('bat.intent', 82),
        metric('bat.boundary_intent', 78),
      ]),
    )

    expect(result?.label).toBe('Power Hitter')
  })

  it('classifies consistent batters as consistency kings', () => {
    const result = classifyRoleArchetype(
      profile('batter', [
        metric('bat.consistency', 81),
        metric('bat.scoring_consistency', 76),
      ]),
    )

    expect(result?.label).toBe('Consistency King')
  })

  it('classifies wicket-taking bowlers as strike weapons', () => {
    const result = classifyRoleArchetype(
      profile('bowler', [
        metric('bowl.wicket_threat', 82, MetricCategory.Bowling),
        metric('bowl.control', 45, MetricCategory.Bowling),
      ]),
    )

    expect(result?.label).toBe('Strike Weapon')
  })

  it('classifies control-led bowlers as control artists', () => {
    const result = classifyRoleArchetype(
      profile('bowler', [
        metric('bowl.control', 77, MetricCategory.Bowling),
        metric('bowl.wicket_threat', 48, MetricCategory.Bowling),
      ]),
    )

    expect(result?.label).toBe('Control Artist')
  })

  it('uses phase traits for death overs specialists', () => {
    const result = classifyRoleArchetype(
      profile(
        'bowler',
        [metric('bowl.control', 55, MetricCategory.Bowling)],
        [
          trait(
            'trait.bowling_phase_usage',
            'Death Overs Specialist',
            TraitCategory.Bowling,
          ),
        ],
      ),
    )

    expect(result?.label).toBe('Death Overs Specialist')
  })

  it('classifies balanced all-round evidence as two-way impact', () => {
    const result = classifyRoleArchetype(
      profile('all_rounder', [
        metric('bat.effectiveness', 66),
        metric('bowl.effectiveness', 64, MetricCategory.Bowling),
      ]),
    )

    expect(result?.label).toBe('Two-Way Impact Player')
  })

  it('classifies wicketkeepers with reliable keeping as safe hands', () => {
    const result = classifyRoleArchetype(
      profile('wicket_keeper', [
        metric('field.reliability', 82, MetricCategory.Fielding),
        metric('field.dismissal_involvement', 76, MetricCategory.Fielding),
      ]),
    )

    expect(result?.label).toBe('Safe Hands')
  })
})
