import type {
  MatchFormat,
  MatchId,
  MatchResultType,
  PlayerId,
  TeamRef,
} from '../domain/types/common'
import type { MetricId, MetricResult } from '../metrics'
import type { TraitId, TraitResult } from '../traits'

export type PlayerProfileRole = 'batter' | 'bowler' | 'all_rounder' | 'wicket_keeper'

export interface PlayerProfileIdentity {
  readonly playerId: PlayerId
  readonly playerName?: string
  readonly country: string | null
  readonly role: PlayerProfileRole | null
  readonly primaryTeam: TeamRef | null
}

export interface PlayerProfileHeadlineStats {
  readonly matches: number | null
  readonly runs: number | null
  readonly wickets: number | null
  readonly catches: number | null
  readonly battingAverage: number | null
  readonly strikeRate: number | null
  readonly economy: number | null
  readonly bestScore: number | null
  readonly bestBowling: string | null
}

export interface PlayerProfileRecentMatch {
  readonly matchId: MatchId
  readonly date: string
  readonly format: MatchFormat
  readonly team: TeamRef
  readonly opponent: TeamRef
  readonly result: MatchResultType
  readonly runs: number | null
  readonly wickets: number | null
  readonly catches: number | null
}

export interface PlayerProfileMetadata {
  readonly engineVersion: string
  readonly generatedAt: string
  readonly sampleSize: number
  readonly supportedMetricCount: number
  readonly supportedCompositeCount: number
  readonly supportedTraitCount: number
}

export interface PlayerProfile {
  readonly identity: PlayerProfileIdentity
  readonly headlineStats: PlayerProfileHeadlineStats
  readonly recentMatches: readonly PlayerProfileRecentMatch[]
  readonly primitiveMetrics: Readonly<Record<MetricId, MetricResult>>
  readonly compositeMetrics: Readonly<Record<MetricId, MetricResult>>
  readonly traits: Readonly<Record<TraitId, TraitResult>>
  readonly metadata: PlayerProfileMetadata
}
