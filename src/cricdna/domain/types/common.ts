export type PlayerId = string
export type MatchId = string
export type TeamId = string
export type CompetitionId = string
export type InningsId = string
export type ISODateString = string
export type ISODateTimeString = string

export enum MatchFormat {
  Test = 'Test',
  ODI = 'ODI',
  T20 = 'T20',
  T10 = 'T10',
  TheHundred = 'TheHundred',
  FirstClass = 'FirstClass',
  ListA = 'ListA',
  Other = 'Other',
}

export enum TossDecision {
  Bat = 'Bat',
  Bowl = 'Bowl',
  Unknown = 'Unknown',
}

export enum MatchResultType {
  Won = 'Won',
  Lost = 'Lost',
  Tied = 'Tied',
  Drawn = 'Drawn',
  NoResult = 'NoResult',
  Abandoned = 'Abandoned',
  Unknown = 'Unknown',
}

export enum DismissalKind {
  Bowled = 'Bowled',
  Caught = 'Caught',
  CaughtAndBowled = 'CaughtAndBowled',
  LBW = 'LBW',
  RunOut = 'RunOut',
  Stumped = 'Stumped',
  HitWicket = 'HitWicket',
  RetiredHurt = 'RetiredHurt',
  RetiredOut = 'RetiredOut',
  ObstructingField = 'ObstructingField',
  TimedOut = 'TimedOut',
  HandledBall = 'HandledBall',
  NotOut = 'NotOut',
  Unknown = 'Unknown',
}

export enum BowlingStyle {
  Pace = 'Pace',
  MediumPace = 'MediumPace',
  OffSpin = 'OffSpin',
  LegSpin = 'LegSpin',
  LeftArmOrthodox = 'LeftArmOrthodox',
  LeftArmWristSpin = 'LeftArmWristSpin',
  Unknown = 'Unknown',
}

export enum BattingHand {
  Right = 'Right',
  Left = 'Left',
  Unknown = 'Unknown',
}

export enum PlayerRole {
  Batter = 'Batter',
  Bowler = 'Bowler',
  AllRounder = 'AllRounder',
  WicketKeeper = 'WicketKeeper',
  Unknown = 'Unknown',
}

export interface DataProvenance {
  readonly sourceSystem: string
  readonly sourceEntityId?: string
  readonly ingestionBatchId?: string
  readonly observedAt?: ISODateTimeString
}

export interface AuditMetadata {
  readonly schemaVersion: string
  readonly createdAt: ISODateTimeString
  readonly updatedAt: ISODateTimeString
  readonly provenance?: DataProvenance
}

export interface MatchVenue {
  readonly ground?: string
  readonly city?: string
  readonly country?: string
}

export interface TeamRef {
  readonly id?: TeamId
  readonly name: string
}

export interface CompetitionRef {
  readonly id?: CompetitionId
  readonly name?: string
  readonly season?: string
}

export interface OverBallRef {
  readonly inningsId?: InningsId
  readonly over: number
  readonly ballInOver: number
}
