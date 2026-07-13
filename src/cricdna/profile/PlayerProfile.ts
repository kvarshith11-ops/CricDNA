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
  readonly age: number | null
  readonly primaryTeam: TeamRef | null
}

export interface PlayerProfileHeadlineStats {
  readonly matches: number | null
  readonly runs: number | null
  readonly wickets: number | null
  readonly catches: number | null
  readonly keeperDismissals: number | null
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
  readonly bowlingRunsConceded: number | null
  readonly catches: number | null
  readonly stumpings: number | null
  readonly dismissals: number | null
  readonly economy: number | null
  readonly playerOfMatch: boolean
}

export interface PlayerProfileTrend {
  readonly label:
    | 'Strong'
    | 'Improving'
    | 'Declining'
    | 'Stable'
    | 'Weak'
    | 'Insufficient Data'
  readonly direction: 'up' | 'down' | 'flat' | 'unknown'
  readonly reason: string
  readonly recentMatchCount: number
}

export type PlayerProfilePhase = 'Powerplay' | 'Middle' | 'Death'

export interface PlayerProfileBattingPhaseStat {
  readonly phase: PlayerProfilePhase
  readonly matches: number
  readonly runs: number
  readonly balls: number
  readonly dotBalls: number
  readonly boundaries: number
  readonly dismissals: number
  readonly strikeRate: number | null
  readonly dotPercentage: number | null
}

export interface PlayerProfileBowlingPhaseStat {
  readonly phase: PlayerProfilePhase
  readonly matches: number
  readonly balls: number
  readonly runsConceded: number
  readonly wickets: number
  readonly dotBalls: number
  readonly economy: number | null
  readonly average: number | null
  readonly dotPercentage: number | null
}

export interface PlayerProfilePhaseAnalysis {
  readonly batting: readonly PlayerProfileBattingPhaseStat[]
  readonly bowling: readonly PlayerProfileBowlingPhaseStat[]
  readonly coverage: {
    readonly source: 'comments'
    readonly matchesWithComments: number
    readonly hasIncompleteCommentary: boolean
  }
}

export interface PlayerProfileGuardrails {
  readonly eligible: boolean
  readonly sampleSize: number
  readonly minimumRequiredMatches: 3
  readonly reasons: readonly string[]
  readonly warnings: readonly string[]
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
  readonly trend: PlayerProfileTrend
  readonly phaseAnalysis: PlayerProfilePhaseAnalysis
  readonly guardrails: PlayerProfileGuardrails
  readonly primitiveMetrics: Readonly<Record<MetricId, MetricResult>>
  readonly compositeMetrics: Readonly<Record<MetricId, MetricResult>>
  readonly traits: Readonly<Record<TraitId, TraitResult>>
  readonly metadata: PlayerProfileMetadata
}
