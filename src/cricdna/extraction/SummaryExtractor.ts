import {
  getOpponentTeam,
  getPlayerTeam,
  normalizeMatchFormat,
  normalizePlayerTeamResult,
  normalizeResult,
  normalizeTossDecision,
  toId,
  toTeamRef,
} from './helpers'
import type {
  ContextExtractionResult,
  PlayerScopedExtractionInput,
  SummaryEndpoint,
} from './types'

export class SummaryExtractor {
  extract(
    input: PlayerScopedExtractionInput<SummaryEndpoint>,
  ): ContextExtractionResult {
    const { endpoint, playerId } = input
    const { fixture } = endpoint
    const playerTeam = getPlayerTeam(fixture, endpoint.players, playerId)
    const opponent = getOpponentTeam(fixture, endpoint.players, playerId)
    const tossWinner = fixture.homeTeam.isTossWinner
      ? fixture.homeTeam
      : fixture.awayTeam.isTossWinner
        ? fixture.awayTeam
        : undefined

    return {
      context: {
        format: normalizeMatchFormat(fixture.gameType),
        matchDate: fixture.startDateTime?.slice(0, 10) ?? '',
        venue: fixture.venue
          ? {
              ground: fixture.venue.name,
              city: fixture.venue.city,
              country: fixture.venue.countryName,
            }
          : undefined,
        competition: fixture.competition
          ? {
              id:
                fixture.competition.id !== undefined
                  ? toId(fixture.competition.id)
                  : undefined,
              name: fixture.competition.name,
            }
          : undefined,
        inningsPlayed:
          fixture.innings
            ?.filter((innings) => {
              const batted = innings.batsmen?.some(
                (batter) => toId(batter.playerId) === playerId,
              )
              const bowled = innings.bowlers?.some(
                (bowler) => toId(bowler.playerId) === playerId,
              )

              return batted || bowled
            })
            .map((innings) => innings.inningNumber) ?? [],
        tossWinner: tossWinner ? toTeamRef(tossWinner) : undefined,
        tossDecision: normalizeTossDecision(fixture.tossDecision),
        matchResult: normalizeResult(fixture.resultTypeId),
        playerTeamResult: normalizePlayerTeamResult(
          fixture,
          endpoint.players,
          playerId,
        ),
        homeAwayNeutral:
          playerTeam?.id === toId(fixture.homeTeam.id)
            ? 'Home'
            : opponent
              ? 'Away'
              : 'Unknown',
      },
    }
  }
}
