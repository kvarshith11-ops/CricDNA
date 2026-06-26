import {
  DismissalKind,
  MatchFormat,
  MatchResultType,
  TossDecision,
  type OverBallRef,
  type PlayerId,
  type TeamRef,
} from '../domain/types/common'
import type {
  SourceFixture,
  SourcePlayer,
  SourceTeam,
} from './types'

export const toId = (value: number | string): string => String(value)

export const findPlayer = (
  players: readonly SourcePlayer[],
  playerId: PlayerId,
): SourcePlayer | undefined => {
  return players.find((player) => toId(player.id) === playerId)
}

export const toTeamRef = (team: SourceTeam): TeamRef => ({
  id: toId(team.id),
  name: team.name,
})

export const getPlayerTeam = (
  fixture: SourceFixture,
  players: readonly SourcePlayer[],
  playerId: PlayerId,
): TeamRef | undefined => {
  const player = findPlayer(players, playerId)

  if (player?.teamId === fixture.homeTeam.id) {
    return toTeamRef(fixture.homeTeam)
  }

  if (player?.teamId === fixture.awayTeam.id) {
    return toTeamRef(fixture.awayTeam)
  }

  return undefined
}

export const getOpponentTeam = (
  fixture: SourceFixture,
  players: readonly SourcePlayer[],
  playerId: PlayerId,
): TeamRef | undefined => {
  const team = getPlayerTeam(fixture, players, playerId)

  if (team?.id === toId(fixture.homeTeam.id)) {
    return toTeamRef(fixture.awayTeam)
  }

  if (team?.id === toId(fixture.awayTeam.id)) {
    return toTeamRef(fixture.homeTeam)
  }

  return undefined
}

export const normalizeMatchFormat = (value?: string): MatchFormat => {
  switch (value) {
    case 'ODI':
      return MatchFormat.ODI
    case 'T20 International':
    case 'T20':
      return MatchFormat.T20
    case 'Test':
      return MatchFormat.Test
    default:
      return MatchFormat.Other
  }
}

export const normalizeTossDecision = (
  value?: string,
): TossDecision | undefined => {
  switch (value?.toLowerCase()) {
    case 'bat':
      return TossDecision.Bat
    case 'field':
    case 'bowl':
      return TossDecision.Bowl
    default:
      return undefined
  }
}

export const normalizeResult = (value?: string): MatchResultType => {
  switch (value) {
    case 'HomeWin':
    case 'AwayWin':
      return MatchResultType.Won
    default:
      return MatchResultType.Unknown
  }
}

export const normalizePlayerTeamResult = (
  fixture: SourceFixture,
  players: readonly SourcePlayer[],
  playerId: PlayerId,
): MatchResultType | undefined => {
  const player = findPlayer(players, playerId)

  if (!player?.teamId) {
    return undefined
  }

  const team =
    player.teamId === fixture.homeTeam.id ? fixture.homeTeam : fixture.awayTeam

  return team.isMatchWinner ? MatchResultType.Won : MatchResultType.Lost
}

export const normalizeDismissalKind = (value?: string): DismissalKind => {
  switch (value) {
    case 'Bowled':
      return DismissalKind.Bowled
    case 'Caught':
    case 'CaughtSub':
      return DismissalKind.Caught
    case 'Caught and bowled':
    case 'CaughtAndBowled':
      return DismissalKind.CaughtAndBowled
    case 'Lbw':
      return DismissalKind.LBW
    case 'RunOut':
      return DismissalKind.RunOut
    case 'Stumped':
      return DismissalKind.Stumped
    case 'NotOut':
      return DismissalKind.NotOut
    case 'Retired Not Out':
      return DismissalKind.RetiredHurt
    case 'yet to bat':
    case 'YetToBat':
    default:
      return DismissalKind.Unknown
  }
}

export const parseOverBallDisplay = (
  inningsId: string | undefined,
  overBallDisplay: string | undefined,
): OverBallRef | undefined => {
  if (!overBallDisplay) {
    return undefined
  }

  const [overText, ballText] = overBallDisplay.split('.')
  const over = Number(overText)
  const ballInOver = Number(ballText)

  if (!Number.isFinite(over) || !Number.isFinite(ballInOver)) {
    return undefined
  }

  return {
    inningsId,
    over,
    ballInOver,
  }
}

export const isLegalDelivery = (isWide?: boolean, isNoBall?: boolean): boolean => {
  return !isWide && !isNoBall
}
