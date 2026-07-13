export interface AIRating {
  score: number
  explanation: string
}

export interface AIRatings {
  batting: AIRating
  bowling: AIRating
  fielding: AIRating
  overall: AIRating
}

export interface AIRoleSuitability {
  role: string
  suitability: number
  explanation: string
}

export interface AIScoutConfidence {
  score: number
  explanation: string
}

export type AIDNAObservationCategory = 'batting' | 'bowling' | 'fielding' | 'overall'

export interface AIDNAObservation {
  title: string
  category: AIDNAObservationCategory
  summary: string
  supportingTraits: string[]
  supportingMetricIds: string[]
  evidence: string[]
}

export type AIDNAObservations = Record<AIDNAObservationCategory, AIDNAObservation[]>

export interface AIScoutResponse {
  ratings: AIRatings
  batting: string
  bowling: string
  fielding: string
  overall: string
  dnaScore: AIRating
  dnaObservations: AIDNAObservations
  strengths: string[]
  developmentAreas: string[]
  roleSuitability: AIRoleSuitability[]
  scoutingReport: string
  confidence: AIScoutConfidence
}

export type PlayerProfileRole = 'batter' | 'bowler' | 'all_rounder' | 'wicket_keeper'

export interface PlayerProfileIdentity {
  playerId: string
  playerName?: string
  country: string | null
  role: PlayerProfileRole | null
  age: number | null
  primaryTeam: { id?: string; name: string } | null
}

export interface PlayerProfileHeadlineStats {
  matches: number | null
  runs: number | null
  wickets: number | null
  catches: number | null
  keeperDismissals: number | null
  battingAverage: number | null
  strikeRate: number | null
  economy: number | null
  bestScore: number | null
  bestBowling: string | null
}

export interface PlayerProfileTrend {
  label:
    | 'Strong'
    | 'Improving'
    | 'Declining'
    | 'Stable'
    | 'Weak'
    | 'Insufficient Data'
  direction: 'up' | 'down' | 'flat' | 'unknown'
  reason: string
  recentMatchCount: number
}

export type PlayerProfilePhase = 'Powerplay' | 'Middle' | 'Death'

export interface PlayerProfileBattingPhaseStat {
  phase: PlayerProfilePhase
  matches: number
  runs: number
  balls: number
  dotBalls: number
  boundaries: number
  dismissals: number
  strikeRate: number | null
  dotPercentage: number | null
}

export interface PlayerProfileBowlingPhaseStat {
  phase: PlayerProfilePhase
  matches: number
  balls: number
  runsConceded: number
  wickets: number
  dotBalls: number
  economy: number | null
  average: number | null
  dotPercentage: number | null
}

export interface PlayerProfilePhaseAnalysis {
  batting: PlayerProfileBattingPhaseStat[]
  bowling: PlayerProfileBowlingPhaseStat[]
  coverage: {
    source: 'comments'
    matchesWithComments: number
    hasIncompleteCommentary: boolean
  }
}

export interface PlayerProfileGuardrails {
  eligible: boolean
  sampleSize: number
  minimumRequiredMatches: 3
  reasons: string[]
  warnings: string[]
}

export interface PlayerProfileRecentMatch {
  matchId: string
  date: string
  opponent: { id?: string; name: string }
  runs: number | null
  wickets: number | null
  bowlingRunsConceded: number | null
  playerOfMatch: boolean
}

export interface PlayerProfileTrait {
  traitId: string
  traitName: string
  category: 'Batting' | 'Bowling' | 'Fielding'
  classification: string | null
  confidence: number
  explanation: string
  status: string
  version: string
}

export interface PlayerDnaTier {
  label: string
  band: string
  score: number
}

export interface PlayerRoleArchetype {
  label: string
  role: PlayerProfileRole | null
  reason: string
  sourceTraitIds: string[]
  sourceMetricIds: string[]
}

export interface PlayerProfilePresentation {
  dnaTier: PlayerDnaTier | null
  roleArchetype: PlayerRoleArchetype | null
}

export interface PlayerProfileSummary {
  identity: PlayerProfileIdentity
  headlineStats: PlayerProfileHeadlineStats
  recentMatches: PlayerProfileRecentMatch[]
  trend: PlayerProfileTrend
  phaseAnalysis: PlayerProfilePhaseAnalysis
  guardrails: PlayerProfileGuardrails
  traits: Record<string, PlayerProfileTrait>
}

export interface CricDnaProfileResponse {
  profile: PlayerProfileSummary
  scout: AIScoutResponse | null
  presentation: PlayerProfilePresentation
}
