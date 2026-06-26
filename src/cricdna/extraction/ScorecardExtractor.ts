import type {
  BattingDismissal,
  BowlingWicketRecord,
  FieldingInningsRecord,
} from '../domain/models/PlayerMatchRecord'
import { DismissalKind } from '../domain/types/common'
import {
  findPlayer,
  normalizeDismissalKind,
  parseOverBallDisplay,
  toId,
} from './helpers'
import type {
  PerformanceExtractionResult,
  PlayerScopedExtractionInput,
  ScorecardEndpoint,
  SourceBatsman,
  SourceScorecardInnings,
} from './types'

const didBat = (batter: SourceBatsman): boolean => {
  const dismissal = batter.dismissalTypeId

  return dismissal !== 'yet to bat' && dismissal !== 'YetToBat'
}

const isCatchingDismissal = (kind: DismissalKind): boolean => {
  return kind === DismissalKind.Caught || kind === DismissalKind.CaughtAndBowled
}

const buildDismissal = (
  endpoint: ScorecardEndpoint,
  innings: SourceScorecardInnings,
  batter: SourceBatsman,
): BattingDismissal | undefined => {
  const kind = normalizeDismissalKind(batter.dismissalTypeId)

  if (kind === DismissalKind.Unknown && !batter.dismissalText) {
    return undefined
  }

  const bowlerId =
    batter.bowledByPlayerId !== undefined ? toId(batter.bowledByPlayerId) : undefined
  const fielderIds =
    batter.dismissedByPlayerId !== undefined
      ? [toId(batter.dismissedByPlayerId)]
      : undefined
  const wicket = innings.wickets?.find(
    (sourceWicket) => sourceWicket.playerId === batter.playerId,
  )

  return {
    kind,
    bowlerId,
    bowlerName: bowlerId
      ? findPlayer(endpoint.players, bowlerId)?.displayName
      : undefined,
    fielderIds,
    fielderNames: fielderIds
      ?.map((fielderId) => findPlayer(endpoint.players, fielderId)?.displayName)
      .filter((name): name is string => Boolean(name)),
    ballRef: parseOverBallDisplay(toId(innings.id), wicket?.overBallDisplay),
  }
}

export class ScorecardExtractor {
  extract(
    input: PlayerScopedExtractionInput<ScorecardEndpoint>,
  ): PerformanceExtractionResult {
    const { endpoint, playerId } = input
    const innings = endpoint.fixture.innings ?? []

    const battingInnings = innings
      .map((sourceInnings) => {
        const batter = sourceInnings.batsmen?.find(
          (sourceBatter) => toId(sourceBatter.playerId) === playerId,
        )

        if (!batter) {
          return undefined
        }

        return {
          inningsId: toId(sourceInnings.id),
          inningsNumber: sourceInnings.inningNumber,
          battingPosition: batter.battingOrder,
          didBat: didBat(batter),
          runs: batter.runsScored ?? 0,
          ballsFaced: batter.ballsFaced ?? 0,
          fours: batter.foursScored ?? 0,
          sixes: batter.sixesScored ?? 0,
          minutes: batter.battingMinutes,
          dismissal: buildDismissal(endpoint, sourceInnings, batter),
        }
      })
      .filter((record): record is NonNullable<typeof record> => Boolean(record))

    const bowlingSpells = innings
      .map((sourceInnings) => {
        const bowler = sourceInnings.bowlers?.find(
          (sourceBowler) => toId(sourceBowler.playerId) === playerId,
        )

        if (!bowler) {
          return undefined
        }

        return {
          inningsId: toId(sourceInnings.id),
          inningsNumber: sourceInnings.inningNumber,
          didBowl: true,
          overs: Number(bowler.oversBowled ?? 0),
          balls: bowler.totalBallsBowled ?? 0,
          maidens: bowler.maidensBowled ?? 0,
          runsConceded: bowler.runsConceded ?? 0,
          wickets: bowler.wicketsTaken ?? 0,
          noBalls: bowler.noBalls ?? 0,
          wides: bowler.wideBalls ?? 0,
          dotBalls: bowler.dotBalls,
        }
      })
      .filter((record): record is NonNullable<typeof record> => Boolean(record))

    const bowlingWickets: BowlingWicketRecord[] = innings.flatMap(
      (sourceInnings) =>
        sourceInnings.batsmen
          ?.filter(
            (batter) =>
              batter.bowledByPlayerId !== undefined &&
              toId(batter.bowledByPlayerId) === playerId,
          )
          .map((batter) => ({
            batterId: toId(batter.playerId),
            batterName: findPlayer(endpoint.players, toId(batter.playerId))
              ?.displayName,
            dismissalKind: normalizeDismissalKind(batter.dismissalTypeId),
            ballRef: parseOverBallDisplay(
              toId(sourceInnings.id),
              sourceInnings.wickets?.find(
                (sourceWicket) => sourceWicket.playerId === batter.playerId,
              )?.overBallDisplay,
            ),
          })) ?? [],
    )

    const fieldingInnings: FieldingInningsRecord[] = innings.map((sourceInnings) => {
      let catches = 0
      let stumpings = 0
      let runOutsAssisted = 0

      for (const batter of sourceInnings.batsmen ?? []) {
        if (batter.dismissedByPlayerId === undefined) {
          continue
        }

        if (toId(batter.dismissedByPlayerId) !== playerId) {
          continue
        }

        const dismissalKind = normalizeDismissalKind(batter.dismissalTypeId)

        if (isCatchingDismissal(dismissalKind)) {
          catches += 1
        }

        if (dismissalKind === DismissalKind.Stumped) {
          stumpings += 1
        }

        if (dismissalKind === DismissalKind.RunOut) {
          runOutsAssisted += 1
        }
      }

      return {
        inningsId: toId(sourceInnings.id),
        inningsNumber: sourceInnings.inningNumber,
        catches,
        stumpings,
        runOutsDirect: 0,
        runOutsAssisted,
      }
    })

    return {
      batting: {
        innings: battingInnings,
      },
      bowling: {
        spells: bowlingSpells,
        wickets: bowlingWickets,
      },
      fielding: {
        innings: fieldingInnings,
      },
    }
  }
}
