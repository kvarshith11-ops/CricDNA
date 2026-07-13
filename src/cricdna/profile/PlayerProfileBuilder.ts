import { PlayerKnowledgeModel } from '../domain/models/PlayerKnowledgeModel'
import { PlayerMatchRecord } from '../domain/models/PlayerMatchRecord'
import { MatchFormat, PlayerRole } from '../domain/types/common'
import {
  EngineeringMetrics,
  MetricLevel,
  type MetricId,
  type MetricResult,
} from '../metrics'
import { TraitResults, type TraitResult } from '../traits'
import {
  validatePlayerProfile,
  type PlayerProfileValidationResult,
} from './PlayerProfileValidator'
import type {
  PlayerProfile,
  PlayerProfilePhaseAnalysis,
  PlayerProfileGuardrails,
  PlayerProfileHeadlineStats,
  PlayerProfileIdentity,
  PlayerProfileRecentMatch,
  PlayerProfileRole,
  PlayerProfileTrend,
} from './PlayerProfile'

export interface BuildPlayerProfileInput {
  readonly pkm: PlayerKnowledgeModel
  readonly metrics: EngineeringMetrics
  readonly traits: TraitResults
  readonly phaseAnalysis?: PlayerProfilePhaseAnalysis
  readonly generatedAt?: string
  readonly engineVersion?: string
}

export interface BuildPlayerProfileResult {
  readonly profile: PlayerProfile
  readonly validation: PlayerProfileValidationResult
}

const DEFAULT_ENGINE_VERSION = 'cricdna-deterministic-profile-v1'
const MINIMUM_REQUIRED_MATCHES = 3

export const buildPlayerProfile = (
  input: BuildPlayerProfileInput,
): BuildPlayerProfileResult => {
  const primitiveMetrics = metricsByLevel(input.metrics, MetricLevel.Primitive)
  const compositeMetrics = metricsByLevel(input.metrics, MetricLevel.Composite)
  const traits = traitsById(input.traits)
  const recentMatches = buildRecentMatches(input.pkm.history.records)
  const profile: PlayerProfile = {
    identity: buildIdentity(input.pkm, input.generatedAt),
    headlineStats: buildHeadlineStats(primitiveMetrics, input.pkm.history.records),
    recentMatches,
    trend: buildTrend(input.pkm, recentMatches),
    phaseAnalysis: input.phaseAnalysis ?? emptyPhaseAnalysis(),
    guardrails: buildGuardrails(input.pkm.history.records.length),
    primitiveMetrics,
    compositeMetrics,
    traits,
    metadata: {
      engineVersion: input.engineVersion ?? DEFAULT_ENGINE_VERSION,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      sampleSize: input.pkm.history.records.length,
      supportedMetricCount:
        Object.keys(primitiveMetrics).length + Object.keys(compositeMetrics).length,
      supportedCompositeCount: Object.keys(compositeMetrics).length,
      supportedTraitCount: Object.keys(traits).length,
    },
  }

  return {
    profile,
    validation: validatePlayerProfile(profile),
  }
}

const emptyPhaseAnalysis = (): PlayerProfilePhaseAnalysis => ({
  batting: [],
  bowling: [],
  coverage: {
    source: 'comments',
    matchesWithComments: 0,
    hasIncompleteCommentary: false,
  },
})

const metricsByLevel = (
  metrics: EngineeringMetrics,
  level: MetricLevel,
): Readonly<Record<MetricId, MetricResult>> => {
  return Object.fromEntries(
    metrics
      .entries()
      .filter((metric) => metric.level === level)
      .map((metric) => [metric.metricId, metric]),
  )
}

const traitsById = (
  traits: TraitResults,
): Readonly<Record<string, TraitResult>> => {
  return Object.fromEntries(
    traits.entries().map((trait) => [trait.traitId, trait]),
  )
}

const buildIdentity = (
  pkm: PlayerKnowledgeModel,
  generatedAt?: string,
): PlayerProfileIdentity => {
  const latestRecord = latestRecords(pkm.history.records, 1)[0]
  const role = latestRecord ? normalizeRole(latestRecord.identity.role) : null
  const primaryTeam = pkm.identity.primaryTeam ?? latestRecord?.identity.team ?? null
  const country =
    firstNonEmpty(pkm.history.records.map((record) => record.identity.country)) ??
    firstNonEmpty(pkm.history.records.map((record) => teamCountry(record.identity.team.name))) ??
    null

  return {
    playerId: pkm.identity.playerId,
    playerName: pkm.identity.playerName ?? latestRecord?.identity.playerName,
    country,
    role,
    age: calculateAge(latestRecord?.identity.dateOfBirth, generatedAt),
    primaryTeam,
  }
}

const firstNonEmpty = (values: readonly (string | undefined)[]): string | undefined => {
  return values
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value))
}

const teamCountry = (teamName: string | undefined): string | undefined => {
  const cleaned = teamName?.trim()

  if (!cleaned || !/\s+(Men|Women)$/i.test(cleaned)) {
    return undefined
  }

  return cleaned.replace(/\s+(Men|Women)$/i, '')
}

const buildHeadlineStats = (
  primitiveMetrics: Readonly<Record<MetricId, MetricResult>>,
  records: readonly PlayerMatchRecord[],
): PlayerProfileHeadlineStats => {
  return {
    matches: numericMetricValue(primitiveMetrics, 'context.matches'),
    runs: numericMetricValue(primitiveMetrics, 'bat.runs'),
    wickets: numericMetricValue(primitiveMetrics, 'bowl.wickets'),
    catches: numericMetricValue(primitiveMetrics, 'field.catches'),
    keeperDismissals: numericMetricValue(primitiveMetrics, 'field.dismissals'),
    battingAverage: numericMetricValue(primitiveMetrics, 'bat.average'),
    strikeRate: numericMetricValue(primitiveMetrics, 'bat.strike_rate'),
    economy: numericMetricValue(primitiveMetrics, 'bowl.economy'),
    bestScore: numericMetricValue(primitiveMetrics, 'bat.highest_score'),
    bestBowling: bestBowlingFigure(records),
  }
}

const buildRecentMatches = (
  records: readonly PlayerMatchRecord[],
): readonly PlayerProfileRecentMatch[] => {
  return latestRecords(records, 5).map((record) => {
    const runs = record.batting.innings.reduce(
      (total, innings) => total + innings.runs,
      0,
    )
    const wickets = record.bowling.spells.reduce(
      (total, spell) => total + spell.wickets,
      0,
    )
    const catches = record.fielding.innings.reduce(
      (total, innings) => total + innings.catches,
      0,
    )
    const stumpings = record.fielding.innings.reduce(
      (total, innings) => total + innings.stumpings,
      0,
    )
    const fieldingDismissals = record.fielding.innings.reduce(
      (total, innings) =>
        total +
        innings.catches +
        innings.stumpings +
        innings.runOutsDirect +
        innings.runOutsAssisted,
      0,
    )
    const balls = record.bowling.spells.reduce((total, spell) => total + spell.balls, 0)
    const runsConceded = record.bowling.spells.reduce(
      (total, spell) => total + spell.runsConceded,
      0,
    )
    const economy = balls > 0 ? Math.round((runsConceded / (balls / 6)) * 100) / 100 : null

    return {
      matchId: record.matchId,
      date: record.context.matchDate,
      format: record.context.format,
      team: record.identity.team,
      opponent: record.identity.opponent,
      result: record.context.playerTeamResult ?? record.context.matchResult,
      runs: record.batting.innings.length > 0 ? runs : null,
      wickets: record.bowling.spells.length > 0 ? wickets : null,
      bowlingRunsConceded: record.bowling.spells.length > 0 ? runsConceded : null,
      catches: record.fielding.innings.length > 0 ? catches : null,
      stumpings: record.fielding.innings.length > 0 ? stumpings : null,
      dismissals: record.fielding.innings.length > 0 ? fieldingDismissals : null,
      economy,
      playerOfMatch: record.behaviour.playerOfMatch,
    }
  })
}

const buildGuardrails = (sampleSize: number): PlayerProfileGuardrails => {
  const eligible = sampleSize >= MINIMUM_REQUIRED_MATCHES

  return {
    eligible,
    sampleSize,
    minimumRequiredMatches: MINIMUM_REQUIRED_MATCHES,
    reasons: eligible
      ? []
      : [
          `At least ${MINIMUM_REQUIRED_MATCHES} match records are required before AI insights can be generated.`,
        ],
    warnings: eligible && sampleSize === MINIMUM_REQUIRED_MATCHES
      ? ['AI insights are based on the minimum supported sample size.']
      : [],
  }
}

const buildTrend = (
  pkm: PlayerKnowledgeModel,
  recentMatches: readonly PlayerProfileRecentMatch[],
): PlayerProfileTrend => {
  const latestThree = recentMatches.slice(0, 3)

  if (latestThree.length < 3) {
    return {
      label: 'Insufficient Data',
      direction: 'unknown',
      reason: 'At least 3 recent matches are required to determine form trend.',
      recentMatchCount: latestThree.length,
    }
  }

  const role = buildIdentity(pkm).role
  const classification = classifyTrendForRole(role, latestThree)

  return {
    ...classification,
    recentMatchCount: latestThree.length,
  }
}

type TrendLabel = PlayerProfileTrend['label']
type TrendDirection = PlayerProfileTrend['direction']

interface TrendClassification {
  readonly label: TrendLabel
  readonly direction: TrendDirection
  readonly reason: string
  readonly impactScore: number | null
}

const classifyTrendForRole = (
  role: PlayerProfileRole | null,
  latestThreeDesc: readonly PlayerProfileRecentMatch[],
): TrendClassification => {
  switch (role) {
    case 'bowler':
      return classifyBowlingTrend(latestThreeDesc)
    case 'all_rounder':
      return classifyAllRoundTrend(latestThreeDesc)
    case 'wicket_keeper':
      return classifyBattingTrend(latestThreeDesc, 'wicket_keeper')
    case 'batter':
    default:
      return classifyBattingTrend(latestThreeDesc, 'batter')
  }
}

const classifyBattingTrend = (
  latestThreeDesc: readonly PlayerProfileRecentMatch[],
  role: 'batter' | 'wicket_keeper' | 'all_rounder_batting',
): TrendClassification => {
  const chronological = [...latestThreeDesc].reverse()
  const runs = chronological.map((match) => match.runs)

  if (runs.some((value) => value === null)) {
    return stableTrend(
      'Recent match evidence is available, but batting output is not present for all latest 3 matches.',
      null,
    )
  }

  const runScores = runs as readonly number[]
  const [oldest, middle, newest] = runScores
  const average = averageOf(runScores)
  const highScores = runScores.filter((score) => score >= 50).length
  const maxScore = Math.max(...runScores)
  const impactScore = normalize(average, 75)

  if (highScores >= 2 || average >= 50) {
    return {
      label: 'Strong',
      direction: 'up',
      reason:
        role === 'wicket_keeper'
          ? 'Strong: The wicketkeeper is in strong batting form, with sustained scoring output across the latest three matches.'
          : 'Strong: The player is in strong batting form, with multiple substantial scores across the latest three matches.',
      impactScore,
    }
  }

  if (average < 20 && maxScore < 40) {
    return {
      label: 'Weak',
      direction: 'down',
      reason:
        role === 'wicket_keeper'
          ? 'Weak: The wicketkeeper has not produced enough recent batting output across the latest three matches.'
          : 'Weak: The batter has not produced enough recent scoring output across the latest three matches.',
      impactScore,
    }
  }

  if (isClearBattingImprovement(oldest, middle, newest)) {
    return {
      label: 'Improving',
      direction: 'up',
      reason:
        role === 'wicket_keeper'
          ? 'Improving: The wicketkeeper has lifted batting output in the latest match, pointing to a positive recent movement.'
          : 'Improving: The batter has lifted scoring output across the latest three matches, pointing to a positive recent movement.',
      impactScore,
    }
  }

  if (isClearBattingDecline(oldest, middle, newest)) {
    return {
      label: 'Declining',
      direction: 'down',
      reason:
        role === 'wicket_keeper'
          ? 'Declining: The wicketkeeper has produced lower batting returns across the latest three matches.'
          : 'Declining: The batter has produced lower scoring returns across the latest three matches.',
      impactScore,
    }
  }

  return stableTrend(
    battingStableReason(oldest, middle, newest, role),
    impactScore,
  )
}

const classifyBowlingTrend = (
  latestThreeDesc: readonly PlayerProfileRecentMatch[],
): TrendClassification => {
  const chronological = [...latestThreeDesc].reverse()
  const impacts = chronological.map(bowlingImpactScore)

  if (impacts.some((value) => value === null)) {
    return stableTrend(
      'Recent match evidence is available, but bowling output is not present for all latest 3 matches.',
      null,
    )
  }

  const scores = impacts as readonly number[]
  const [oldest, middle, newest] = scores
  const averageImpact = averageOf(scores)
  const strongMatches = scores.filter((score) => score >= 65).length

  if (averageImpact >= 65 || strongMatches >= 2) {
    return {
      label: 'Strong',
      direction: 'up',
      reason:
        'Strong: The bowler has delivered strong recent impact, balancing wicket threat with run control across the latest three matches.',
      impactScore: averageImpact,
    }
  }

  if (averageImpact < 25) {
    return {
      label: 'Weak',
      direction: 'down',
      reason:
        'Weak: The bowler has had limited recent impact, with low wicket threat and insufficient run control across the latest three matches.',
      impactScore: averageImpact,
    }
  }

  if (isClearImpactImprovement(oldest, middle, newest)) {
    return {
      label: 'Improving',
      direction: 'up',
      reason:
        'Improving: The bowler’s recent impact is improving, with the combined wicket-taking and economy profile moving in the right direction.',
      impactScore: averageImpact,
    }
  }

  if (isClearImpactDecline(oldest, middle, newest)) {
    return {
      label: 'Declining',
      direction: 'down',
      reason:
        'Declining: The bowler’s recent impact has dropped, with the combined wicket-taking and economy profile moving in the wrong direction.',
      impactScore: averageImpact,
    }
  }

  return stableTrend(
    'Stable: Recent bowling form is balanced, with wicket-taking and economy either offsetting each other or showing no clear directional shift.',
    averageImpact,
  )
}

const classifyAllRoundTrend = (
  latestThreeDesc: readonly PlayerProfileRecentMatch[],
): TrendClassification => {
  const batting = classifyBattingTrend(latestThreeDesc, 'all_rounder_batting')
  const bowling = classifyBowlingTrend(latestThreeDesc)
  const available = [batting, bowling].filter((trend) => trend.impactScore !== null)

  if (available.length === 0) {
    return stableTrend(
      'Recent match evidence is available, but all-round batting or bowling output is incomplete across the latest three matches.',
      null,
    )
  }

  if (available.length === 1) {
    return {
      ...available[0],
      reason: `${available[0].label}: All-round trend is based on limited role evidence from the latest three matches.`,
    }
  }

  const [battingTrend, bowlingTrend] = available
  const impactScore = averageOf(available.map((trend) => trend.impactScore ?? 0))

  if (battingTrend.label === 'Strong' && bowlingTrend.label === 'Strong') {
    return {
      label: 'Strong',
      direction: 'up',
      reason:
        'Strong: The all-round profile is strong, with both batting and bowling making clear recent contributions.',
      impactScore,
    }
  }

  if (battingTrend.label === 'Weak' && bowlingTrend.label === 'Weak') {
    return {
      label: 'Weak',
      direction: 'down',
      reason:
        'Weak: The all-round profile has limited recent impact, with neither batting nor bowling providing enough support.',
      impactScore,
    }
  }

  if (battingTrend.label === 'Improving' && bowlingTrend.label === 'Improving') {
    return {
      label: 'Improving',
      direction: 'up',
      reason:
        'Improving: The all-round profile is moving upward, with batting and bowling both trending positively.',
      impactScore,
    }
  }

  if (battingTrend.label === 'Declining' && bowlingTrend.label === 'Declining') {
    return {
      label: 'Declining',
      direction: 'down',
      reason:
        'Declining: The all-round profile has moved downward, with both batting and bowling impact dropping recently.',
      impactScore,
    }
  }

  return stableTrend(
    'Stable: The all-round trend is balanced, with batting and bowling signals either offsetting each other or not moving clearly in the same direction.',
    impactScore,
  )
}

const bowlingImpactScore = (match: PlayerProfileRecentMatch): number | null => {
  const wicketScore =
    match.wickets === null ? null : normalize(match.wickets, 3)
  const economyScore =
    match.economy === null ? null : economyImpactScore(match.economy, match.format)

  if (wicketScore === null && economyScore === null) {
    return null
  }

  if (wicketScore === null) {
    return economyScore
  }

  if (economyScore === null) {
    return wicketScore
  }

  return roundScore(wicketScore * 0.55 + economyScore * 0.45)
}

const economyImpactScore = (economy: number, format: MatchFormat): number => {
  const { elite, poor } = economyRange(format)

  if (economy <= elite) {
    return 100
  }

  if (economy >= poor) {
    return 0
  }

  return roundScore(((poor - economy) / (poor - elite)) * 100)
}

const economyRange = (format: MatchFormat): { readonly elite: number; readonly poor: number } => {
  switch (format) {
    case MatchFormat.T20:
    case MatchFormat.T10:
    case MatchFormat.TheHundred:
      return { elite: 6, poor: 11 }
    case MatchFormat.Test:
    case MatchFormat.FirstClass:
      return { elite: 2.5, poor: 5.5 }
    case MatchFormat.ODI:
    case MatchFormat.ListA:
      return { elite: 4.5, poor: 8.5 }
    default:
      return { elite: 5, poor: 9 }
  }
}

const isClearBattingImprovement = (
  oldest: number,
  middle: number,
  newest: number,
): boolean => {
  return (
    (oldest < middle && middle < newest) ||
    (newest > oldest && newest > middle && newest >= 40)
  )
}

const isClearBattingDecline = (
  oldest: number,
  middle: number,
  newest: number,
): boolean => {
  return (
    (oldest > middle && middle > newest) ||
    (newest < oldest && newest < middle && oldest - newest >= 20)
  )
}

const isClearImpactImprovement = (
  oldest: number,
  middle: number,
  newest: number,
): boolean => {
  return (
    (oldest < middle && middle < newest) ||
    (newest >= oldest + 15 && newest >= middle)
  )
}

const isClearImpactDecline = (
  oldest: number,
  middle: number,
  newest: number,
): boolean => {
  return (
    (oldest > middle && middle > newest) ||
    (newest <= oldest - 15 && newest <= middle)
  )
}

const battingStableReason = (
  oldest: number,
  middle: number,
  newest: number,
  role: 'batter' | 'wicket_keeper' | 'all_rounder_batting',
): string => {
  const subject =
    role === 'wicket_keeper'
      ? "The wicketkeeper's batting form"
      : role === 'all_rounder_batting'
        ? "The all-rounder's batting form"
        : 'Recent batting form'

  if (oldest > middle && newest > middle && newest < oldest) {
    return `Stable: ${subject} is mixed: after a strong score and a dip, the player recovered in the latest match without showing a clear upward trend.`
  }

  return `Stable: ${subject} is broadly steady or mixed across the latest three matches, with no clear strong, weak, improving, or declining pattern.`
}

const stableTrend = (
  reason: string,
  impactScore: number | null,
): TrendClassification => {
  return {
    label: 'Stable',
    direction: 'flat',
    reason,
    impactScore,
  }
}

const averageOf = (values: readonly number[]): number => {
  return values.reduce((total, value) => total + value, 0) / values.length
}

const normalize = (value: number, benchmark: number): number => {
  if (benchmark <= 0) {
    return 0
  }

  return clamp((value / benchmark) * 100)
}

const clamp = (value: number): number => {
  return Math.min(100, Math.max(0, value))
}

const roundScore = (value: number): number => {
  return Math.round(value * 100) / 100
}

const bestBowlingFigure = (records: readonly PlayerMatchRecord[]): string | null => {
  const spells = records
    .flatMap((record) => record.bowling.spells)
    .filter((spell) => spell.didBowl)

  if (spells.length === 0) {
    return null
  }

  const bestSpell = [...spells].sort((left, right) => {
    if (right.wickets !== left.wickets) {
      return right.wickets - left.wickets
    }

    if (left.runsConceded !== right.runsConceded) {
      return left.runsConceded - right.runsConceded
    }

    return left.balls - right.balls
  })[0]

  return bestSpell ? `${bestSpell.wickets}/${bestSpell.runsConceded}` : null
}

const latestRecords = (
  records: readonly PlayerMatchRecord[],
  count: number,
): readonly PlayerMatchRecord[] => {
  return [...records]
    .sort((left, right) => {
      const dateComparison = right.context.matchDate.localeCompare(left.context.matchDate)

      if (dateComparison !== 0) {
        return dateComparison
      }

      return right.matchId.localeCompare(left.matchId)
    })
    .slice(0, count)
}

const numericMetricValue = (
  metrics: Readonly<Record<MetricId, MetricResult>>,
  metricId: MetricId,
): number | null => {
  const value = metrics[metricId]?.value

  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const normalizeRole = (role: PlayerRole | undefined): PlayerProfileRole | null => {
  switch (role) {
    case PlayerRole.Batter:
      return 'batter'
    case PlayerRole.Bowler:
      return 'bowler'
    case PlayerRole.AllRounder:
      return 'all_rounder'
    case PlayerRole.WicketKeeper:
      return 'wicket_keeper'
    default:
      return null
  }
}

const calculateAge = (
  dateOfBirth: string | undefined,
  generatedAt: string | undefined,
): number | null => {
  if (!dateOfBirth) {
    return null
  }

  const birthDate = parseDateOfBirth(dateOfBirth)
  const referenceDate = generatedAt ? new Date(generatedAt) : new Date()

  if (!birthDate || Number.isNaN(referenceDate.getTime())) {
    return null
  }

  let age = referenceDate.getFullYear() - birthDate.getFullYear()
  const monthDelta = referenceDate.getMonth() - birthDate.getMonth()

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && referenceDate.getDate() < birthDate.getDate())
  ) {
    age -= 1
  }

  return age >= 0 ? age : null
}

const parseDateOfBirth = (value: string): Date | null => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`)

    return Number.isNaN(date.getTime()) ? null : date
  }

  const [dayText, monthText, yearText] = value.split('/')
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null
  }

  return new Date(year, month - 1, day)
}
