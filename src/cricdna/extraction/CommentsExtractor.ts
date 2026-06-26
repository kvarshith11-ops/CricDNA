import { toId } from './helpers'
import type {
  BehaviourExtractionResult,
  CommentsEndpoint,
  PlayerScopedExtractionInput,
} from './types'

export class CommentsExtractor {
  extract(
    input: PlayerScopedExtractionInput<CommentsEndpoint>,
  ): BehaviourExtractionResult {
    const { endpoint, playerId } = input
    const player = endpoint.players.find((sourcePlayer) => toId(sourcePlayer.id) === playerId)
    const events = endpoint.innings.flatMap((innings) =>
      innings.overs?.flatMap((over) =>
        over.balls?.flatMap((ball) => {
          const involvesPlayer =
            toId(ball.battingPlayerId) === playerId ||
            toId(ball.nonStrikeBattingPlayerId) === playerId ||
            toId(ball.bowlerPlayerId) === playerId ||
            (ball.dismissalPlayerId !== undefined &&
              toId(ball.dismissalPlayerId) === playerId)

          if (!involvesPlayer) {
            return []
          }

          return (
            ball.comments?.map((comment) => ({
              eventType: comment.commentTypeId ?? 'Commentary',
              description: comment.message,
              ballRef: {
                inningsId: toId(innings.id),
                over: over.overNumber,
                ballInOver: ball.ballNumber,
              },
            })) ?? []
          )
        }) ?? [],
      ) ?? [],
    )

    return {
      behaviour: {
        captain: player?.isCaptain ?? false,
        wicketKeeper: player?.isWicketKeeper ?? false,
        substitute: player?.isTwelthMan ?? false,
        playerOfMatch: player?.isManOfTheMatch ?? false,
        events,
      },
    }
  }
}
