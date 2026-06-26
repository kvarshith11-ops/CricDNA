import { PlayerKnowledgeModel } from '../domain/models/PlayerKnowledgeModel'
import { PlayerMatchRecord } from '../domain/models/PlayerMatchRecord'
import { PlayerRole } from '../domain/types/common'
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
  PlayerProfileHeadlineStats,
  PlayerProfileIdentity,
  PlayerProfileRecentMatch,
  PlayerProfileRole,
} from './PlayerProfile'

export interface BuildPlayerProfileInput {
  readonly pkm: PlayerKnowledgeModel
  readonly metrics: EngineeringMetrics
  readonly traits: TraitResults
  readonly generatedAt?: string
  readonly engineVersion?: string
}

export interface BuildPlayerProfileResult {
  readonly profile: PlayerProfile
  readonly validation: PlayerProfileValidationResult
}

const DEFAULT_ENGINE_VERSION = 'cricdna-deterministic-profile-v1'

export const buildPlayerProfile = (
  input: BuildPlayerProfileInput,
): BuildPlayerProfileResult => {
  const primitiveMetrics = metricsByLevel(input.metrics, MetricLevel.Primitive)
  const compositeMetrics = metricsByLevel(input.metrics, MetricLevel.Composite)
  const traits = traitsById(input.traits)
  const profile: PlayerProfile = {
    identity: buildIdentity(input.pkm),
    headlineStats: buildHeadlineStats(primitiveMetrics),
    recentMatches: buildRecentMatches(input.pkm.history.records),
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

const buildIdentity = (pkm: PlayerKnowledgeModel): PlayerProfileIdentity => {
  const latestRecord = latestRecords(pkm.history.records, 1)[0]
  const role = latestRecord ? normalizeRole(latestRecord.identity.role) : null
  const primaryTeam = pkm.identity.primaryTeam ?? latestRecord?.identity.team ?? null
  const country = latestRecord?.context.venue?.country ?? null

  return {
    playerId: pkm.identity.playerId,
    playerName: pkm.identity.playerName ?? latestRecord?.identity.playerName,
    country,
    role,
    primaryTeam,
  }
}

const buildHeadlineStats = (
  primitiveMetrics: Readonly<Record<MetricId, MetricResult>>,
): PlayerProfileHeadlineStats => {
  return {
    matches: numericMetricValue(primitiveMetrics, 'context.matches'),
    runs: numericMetricValue(primitiveMetrics, 'bat.runs'),
    wickets: numericMetricValue(primitiveMetrics, 'bowl.wickets'),
    catches: numericMetricValue(primitiveMetrics, 'field.catches'),
    battingAverage: numericMetricValue(primitiveMetrics, 'bat.average'),
    strikeRate: numericMetricValue(primitiveMetrics, 'bat.strike_rate'),
    economy: numericMetricValue(primitiveMetrics, 'bowl.economy'),
    bestScore: numericMetricValue(primitiveMetrics, 'bat.highest_score'),
    bestBowling: null,
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

    return {
      matchId: record.matchId,
      date: record.context.matchDate,
      format: record.context.format,
      team: record.identity.team,
      opponent: record.identity.opponent,
      result: record.context.playerTeamResult ?? record.context.matchResult,
      runs: record.batting.innings.length > 0 ? runs : null,
      wickets: record.bowling.spells.length > 0 ? wickets : null,
      catches: record.fielding.innings.length > 0 ? catches : null,
    }
  })
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
