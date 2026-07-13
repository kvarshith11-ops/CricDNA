import type {
  AuditMetadata,
  BattingHand,
  BowlingStyle,
  CompetitionRef,
  DismissalKind,
  ISODateString,
  MatchFormat,
  MatchId,
  MatchResultType,
  MatchVenue,
  OverBallRef,
  PlayerId,
  PlayerRole,
  TeamRef,
  TossDecision,
} from '../types/common'
import type { Serializable } from '../types/serialization'

export interface PlayerMatchIdentity {
  readonly playerId: PlayerId
  readonly playerName?: string
  readonly matchId: MatchId
  readonly team: TeamRef
  readonly opponent: TeamRef
  readonly country?: string
  readonly dateOfBirth?: string
  readonly role?: PlayerRole
  readonly battingHand?: BattingHand
  readonly bowlingStyle?: BowlingStyle
}

export interface PlayerMatchContext {
  readonly format: MatchFormat
  readonly matchDate: ISODateString
  readonly venue?: MatchVenue
  readonly competition?: CompetitionRef
  readonly inningsPlayed: readonly number[]
  readonly tossWinner?: TeamRef
  readonly tossDecision?: TossDecision
  readonly matchResult: MatchResultType
  readonly playerTeamResult?: MatchResultType
  readonly homeAwayNeutral?: 'Home' | 'Away' | 'Neutral' | 'Unknown'
}

export interface BattingDismissal {
  readonly kind: DismissalKind
  readonly bowlerId?: PlayerId
  readonly bowlerName?: string
  readonly fielderIds?: readonly PlayerId[]
  readonly fielderNames?: readonly string[]
  readonly ballRef?: OverBallRef
}

export interface BattingInningsRecord {
  readonly inningsId?: string
  readonly inningsNumber: number
  readonly battingPosition?: number
  readonly didBat: boolean
  readonly runs: number
  readonly ballsFaced: number
  readonly fours: number
  readonly sixes: number
  readonly minutes?: number
  readonly dismissal?: BattingDismissal
}

export interface PlayerMatchBatting {
  readonly innings: readonly BattingInningsRecord[]
}

export interface BowlingSpellRecord {
  readonly inningsId?: string
  readonly inningsNumber: number
  readonly didBowl: boolean
  readonly overs: number
  readonly balls: number
  readonly maidens: number
  readonly runsConceded: number
  readonly wickets: number
  readonly noBalls: number
  readonly wides: number
  readonly dotBalls?: number
}

export interface BowlingWicketRecord {
  readonly batterId?: PlayerId
  readonly batterName?: string
  readonly dismissalKind: DismissalKind
  readonly ballRef?: OverBallRef
}

export interface PlayerMatchBowling {
  readonly spells: readonly BowlingSpellRecord[]
  readonly wickets: readonly BowlingWicketRecord[]
}

export interface FieldingInningsRecord {
  readonly inningsId?: string
  readonly inningsNumber: number
  readonly catches: number
  readonly stumpings: number
  readonly runOutsDirect: number
  readonly runOutsAssisted: number
  readonly byesConceded?: number
}

export interface PlayerMatchFielding {
  readonly innings: readonly FieldingInningsRecord[]
}

export interface BehaviourEvent {
  readonly eventType: string
  readonly description?: string
  readonly ballRef?: OverBallRef
  readonly sourceCommentaryId?: string
}

export interface PlayerMatchBehaviour {
  readonly captain: boolean
  readonly wicketKeeper: boolean
  readonly substitute: boolean
  readonly playerOfMatch: boolean
  readonly events: readonly BehaviourEvent[]
}

export interface ScoreProgressionPoint {
  readonly ballRef: OverBallRef
  readonly teamRuns?: number
  readonly playerRuns?: number
  readonly playerBallsFaced?: number
  readonly wicketsDown?: number
}

export interface BowlingProgressionPoint {
  readonly ballRef: OverBallRef
  readonly runsConcededToDate?: number
  readonly ballsBowledToDate?: number
  readonly wicketsToDate?: number
}

export interface PlayerMatchProgression {
  readonly battingTimeline: readonly ScoreProgressionPoint[]
  readonly bowlingTimeline: readonly BowlingProgressionPoint[]
}

export interface PlayerMatchRecordProps {
  readonly identity: PlayerMatchIdentity
  readonly context: PlayerMatchContext
  readonly batting: PlayerMatchBatting
  readonly bowling: PlayerMatchBowling
  readonly fielding: PlayerMatchFielding
  readonly behaviour: PlayerMatchBehaviour
  readonly progression: PlayerMatchProgression
  readonly metadata: AuditMetadata
}

export type PlayerMatchRecordJson = PlayerMatchRecordProps

export class PlayerMatchRecord
  implements Serializable<PlayerMatchRecordJson>
{
  private readonly props: PlayerMatchRecordProps

  private constructor(props: PlayerMatchRecordProps) {
    this.props = props
  }

  static create(props: PlayerMatchRecordProps): PlayerMatchRecord {
    return new PlayerMatchRecord(props)
  }

  static fromJSON(json: PlayerMatchRecordJson): PlayerMatchRecord {
    return new PlayerMatchRecord(json)
  }

  get identity(): PlayerMatchIdentity {
    return this.props.identity
  }

  get context(): PlayerMatchContext {
    return this.props.context
  }

  get batting(): PlayerMatchBatting {
    return this.props.batting
  }

  get bowling(): PlayerMatchBowling {
    return this.props.bowling
  }

  get fielding(): PlayerMatchFielding {
    return this.props.fielding
  }

  get behaviour(): PlayerMatchBehaviour {
    return this.props.behaviour
  }

  get progression(): PlayerMatchProgression {
    return this.props.progression
  }

  get metadata(): AuditMetadata {
    return this.props.metadata
  }

  get playerId(): PlayerId {
    return this.props.identity.playerId
  }

  get matchId(): MatchId {
    return this.props.identity.matchId
  }

  get recordKey(): string {
    return `${this.playerId}:${this.matchId}`
  }

  toJSON(): PlayerMatchRecordJson {
    return this.props
  }
}
