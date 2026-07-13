import type {
  PlayerMatchBatting,
  PlayerMatchBehaviour,
  PlayerMatchBowling,
  PlayerMatchContext,
  PlayerMatchFielding,
  PlayerMatchProgression,
} from '../domain/models/PlayerMatchRecord'
import type { PlayerId } from '../domain/types/common'

export interface PlayerScopedExtractionInput<TEndpoint> {
  readonly playerId: PlayerId
  readonly endpoint: TEndpoint
}

export interface ContextExtractionResult {
  readonly context: PlayerMatchContext
}

export interface PerformanceExtractionResult {
  readonly batting: PlayerMatchBatting
  readonly bowling: PlayerMatchBowling
  readonly fielding: PlayerMatchFielding
}

export interface BehaviourExtractionResult {
  readonly behaviour: PlayerMatchBehaviour
}

export interface ProgressionExtractionResult {
  readonly progression: PlayerMatchProgression
}

export type PartialPlayerMatchRecord =
  | ContextExtractionResult
  | PerformanceExtractionResult
  | BehaviourExtractionResult
  | ProgressionExtractionResult

export interface SourceTeam {
  readonly id: number
  readonly name: string
  readonly shortName?: string
  readonly isHomeTeam?: boolean
  readonly isTossWinner?: boolean
  readonly isMatchWinner?: boolean
}

export interface SourceCompetition {
  readonly id?: number
  readonly name?: string
  readonly startDateTime?: string
}

export interface SourceVenue {
  readonly id?: number
  readonly name?: string
  readonly city?: string
  readonly countryName?: string
}

export interface SourcePlayer {
  readonly id: number
  readonly displayName?: string
  readonly teamId?: number
  readonly type?: string
  readonly nationality?: string
  readonly dob?: string
  readonly battingHandId?: string
  readonly bowlingTypeId?: string
  readonly isCaptain?: boolean
  readonly isWicketKeeper?: boolean
  readonly isTwelthMan?: boolean
  readonly isManOfTheMatch?: boolean
}

export interface SourceBatsman {
  readonly playerId: number
  readonly ballsFaced?: number
  readonly bowledByPlayerId?: number
  readonly dismissalTypeId?: string
  readonly dismissedByPlayerId?: number
  readonly dismissalText?: string
  readonly runsScored?: number
  readonly foursScored?: number
  readonly sixesScored?: number
  readonly battingMinutes?: number
  readonly battingOrder?: number
  readonly isOut?: boolean
}

export interface SourceBowler {
  readonly playerId: number
  readonly oversBowled?: string
  readonly maidensBowled?: number
  readonly totalBallsBowled?: number
  readonly dotBalls?: number
  readonly noBalls?: number
  readonly wideBalls?: number
  readonly runsConceded?: number
  readonly wicketsTaken?: number
}

export interface SourceWicket {
  readonly playerId: number
  readonly overBallDisplay?: string
  readonly inningsBallId?: number
  readonly runs?: number
}

export interface SourceScorecardInnings {
  readonly id: number
  readonly inningNumber: number
  readonly battingTeamId: number
  readonly bowlingTeamId: number
  readonly byesRuns?: number
  readonly batsmen?: readonly SourceBatsman[]
  readonly bowlers?: readonly SourceBowler[]
  readonly wickets?: readonly SourceWicket[]
}

export interface SourceFixture {
  readonly id: number
  readonly legacyFixtureId?: number
  readonly gameType?: string
  readonly startDateTime?: string
  readonly resultTypeId?: string
  readonly resultText?: string
  readonly tossDecision?: string
  readonly competition?: SourceCompetition
  readonly homeTeam: SourceTeam
  readonly awayTeam: SourceTeam
  readonly venue?: SourceVenue
  readonly innings?: readonly SourceScorecardInnings[]
}

export interface SummaryEndpoint {
  readonly fixture: SourceFixture
  readonly players: readonly SourcePlayer[]
}

export interface ScorecardEndpoint {
  readonly fixture: SourceFixture
  readonly players: readonly SourcePlayer[]
  readonly dataSupport?: {
    readonly isReliableData?: boolean
  }
  readonly responseError?: boolean
}

export interface SourceComment {
  readonly commentTypeId?: string
  readonly message?: string
  readonly order?: number
  readonly overNumber?: number
}

export interface SourceCommentBall {
  readonly ballNumber: number
  readonly battingPlayerId: number
  readonly nonStrikeBattingPlayerId: number
  readonly bowlerPlayerId: number
  readonly runsScored?: number
  readonly runsConceded?: number
  readonly teamRuns?: number
  readonly isWicket?: boolean
  readonly isWide?: boolean
  readonly isNoBall?: boolean
  readonly dismissalPlayerId?: number
  readonly dismissalTypeId?: string
  readonly comments?: readonly SourceComment[]
}

export interface SourceCommentOver {
  readonly id: number
  readonly overNumber: number
  readonly balls?: readonly SourceCommentBall[]
}

export interface SourceCommentInnings {
  readonly id: number
  readonly fixtureId: number
  readonly inningNumber: number
  readonly battingTeamId: number
  readonly bowlingTeamId: number
  readonly overs?: readonly SourceCommentOver[]
}

export interface CommentsEndpoint {
  readonly innings: readonly SourceCommentInnings[]
  readonly players: readonly SourcePlayer[]
  readonly nextPage?: string
  readonly responseError?: boolean
}

export interface SourceGraphOver {
  readonly id: number
  readonly overNumber: number
  readonly runrate?: number
  readonly runsConceded?: number
  readonly wickets?: number
  readonly totalInningRuns?: number
  readonly totalInningWickets?: number
  readonly totalRuns?: number
}

export interface SourceGraphInnings {
  readonly id: number
  readonly inningNumber: number
  readonly battingTeamId: number
  readonly bowlingTeamId: number
  readonly overs?: readonly SourceGraphOver[]
}

export interface GraphsEndpoint {
  readonly fixture: {
    readonly id: number
    readonly innings?: readonly SourceGraphInnings[]
  }
}
