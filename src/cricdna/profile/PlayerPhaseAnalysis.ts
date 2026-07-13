import { MatchFormat, type PlayerId } from '../domain'
import type { CommentsEndpoint, SummaryEndpoint } from '../extraction/types'
import type {
  PlayerProfileBattingPhaseStat,
  PlayerProfileBowlingPhaseStat,
  PlayerProfilePhase,
  PlayerProfilePhaseAnalysis,
} from './PlayerProfile'

interface PhaseAnalysisMatch {
  readonly summary: SummaryEndpoint
  readonly comments: CommentsEndpoint
}

interface PhaseAccumulator {
  matches: Set<string>
  balls: number
  runs: number
  dotBalls: number
  boundaries: number
  dismissals: number
  runsConceded: number
  wickets: number
}

const phases: readonly PlayerProfilePhase[] = ['Powerplay', 'Middle', 'Death']

export const buildPlayerPhaseAnalysis = (
  matches: readonly PhaseAnalysisMatch[],
  playerId: PlayerId,
): PlayerProfilePhaseAnalysis => {
  const batting = emptyAccumulators()
  const bowling = emptyAccumulators()
  const playerIdText = String(playerId)

  for (const match of matches) {
    const matchId = String(match.summary.fixture.id)
    const format = formatForFixture(match.summary.fixture.gameType)

    for (const innings of match.comments.innings) {
      for (const over of innings.overs ?? []) {
        const phase = phaseForOver(format, over.overNumber)

        if (!phase) {
          continue
        }

        for (const ball of over.balls ?? []) {
          const legalBall = !ball.isWide && !ball.isNoBall

          if (String(ball.battingPlayerId) === playerIdText) {
            const accumulator = batting.get(phase) ?? createAccumulator()
            accumulator.matches.add(matchId)
            accumulator.runs += ball.runsScored ?? 0
            accumulator.boundaries += isBoundary(ball.runsScored) ? 1 : 0
            accumulator.dismissals += ball.dismissalPlayerId === Number(playerId) ? 1 : 0

            if (legalBall) {
              accumulator.balls += 1
              accumulator.dotBalls += (ball.runsScored ?? 0) === 0 ? 1 : 0
            }
          }

          if (String(ball.bowlerPlayerId) === playerIdText) {
            const accumulator = bowling.get(phase) ?? createAccumulator()
            accumulator.matches.add(matchId)
            accumulator.runsConceded += ball.runsConceded ?? 0
            accumulator.wickets += isBowlerCreditableWicket(
              ball.isWicket,
              ball.dismissalTypeId,
            )
              ? 1
              : 0

            if (legalBall) {
              accumulator.balls += 1
              accumulator.dotBalls += (ball.runsConceded ?? 0) === 0 ? 1 : 0
            }
          }
        }
      }
    }
  }

  return {
    batting: phases
      .map((phase) => battingPhaseStat(phase, batting.get(phase) ?? createAccumulator()))
      .filter(hasBattingEvidence),
    bowling: phases
      .map((phase) => bowlingPhaseStat(phase, bowling.get(phase) ?? createAccumulator()))
      .filter(hasBowlingEvidence),
    coverage: {
      source: 'comments',
      matchesWithComments: matches.filter((match) => match.comments.innings.length > 0)
        .length,
      hasIncompleteCommentary: matches.some((match) => Boolean(match.comments.nextPage)),
    },
  }
}

export const formatForFixture = (gameType: string | undefined): MatchFormat => {
  switch (gameType) {
    case 'ODI':
      return MatchFormat.ODI
    case 'T20':
    case 'T20 International':
      return MatchFormat.T20
    default:
      return MatchFormat.Other
  }
}

export const phaseForOver = (
  format: MatchFormat,
  over: number,
): PlayerProfilePhase | null => {
  if (format === MatchFormat.T20) {
    if (over <= 6) {
      return 'Powerplay'
    }

    if (over <= 15) {
      return 'Middle'
    }

    return 'Death'
  }

  if (format === MatchFormat.ODI) {
    if (over <= 10) {
      return 'Powerplay'
    }

    if (over <= 40) {
      return 'Middle'
    }

    return 'Death'
  }

  return null
}

const emptyAccumulators = (): Map<PlayerProfilePhase, PhaseAccumulator> => {
  return new Map(phases.map((phase) => [phase, createAccumulator()]))
}

const createAccumulator = (): PhaseAccumulator => ({
  matches: new Set<string>(),
  balls: 0,
  runs: 0,
  dotBalls: 0,
  boundaries: 0,
  dismissals: 0,
  runsConceded: 0,
  wickets: 0,
})

const battingPhaseStat = (
  phase: PlayerProfilePhase,
  accumulator: PhaseAccumulator,
): PlayerProfileBattingPhaseStat => {
  return {
    phase,
    matches: accumulator.matches.size,
    runs: accumulator.runs,
    balls: accumulator.balls,
    dotBalls: accumulator.dotBalls,
    boundaries: accumulator.boundaries,
    dismissals: accumulator.dismissals,
    strikeRate:
      accumulator.balls > 0 ? round((accumulator.runs / accumulator.balls) * 100, 2) : null,
    dotPercentage:
      accumulator.balls > 0
        ? round((accumulator.dotBalls / accumulator.balls) * 100, 1)
        : null,
  }
}

const bowlingPhaseStat = (
  phase: PlayerProfilePhase,
  accumulator: PhaseAccumulator,
): PlayerProfileBowlingPhaseStat => {
  const overs = accumulator.balls / 6

  return {
    phase,
    matches: accumulator.matches.size,
    balls: accumulator.balls,
    runsConceded: accumulator.runsConceded,
    wickets: accumulator.wickets,
    dotBalls: accumulator.dotBalls,
    economy: accumulator.balls > 0 ? round(accumulator.runsConceded / overs, 2) : null,
    average:
      accumulator.wickets > 0
        ? round(accumulator.runsConceded / accumulator.wickets, 2)
        : null,
    dotPercentage:
      accumulator.balls > 0
        ? round((accumulator.dotBalls / accumulator.balls) * 100, 1)
        : null,
  }
}

const hasBattingEvidence = (stat: PlayerProfileBattingPhaseStat): boolean => {
  return stat.balls > 0 || stat.runs > 0 || stat.dismissals > 0
}

const hasBowlingEvidence = (stat: PlayerProfileBowlingPhaseStat): boolean => {
  return stat.balls > 0 || stat.runsConceded > 0 || stat.wickets > 0
}

const isBoundary = (runsScored: number | undefined): boolean => {
  return runsScored === 4 || runsScored === 6
}

const nonBowlerCreditableDismissals = new Set([
  'runout',
  'retiredhurt',
  'retirednotout',
  'retiredout',
  'obstructingthefield',
  'timedout',
  'handledball',
  'notout',
  'yettobat',
])

const isBowlerCreditableWicket = (
  isWicket: boolean | undefined,
  dismissalTypeId: string | undefined,
): boolean => {
  if (!isWicket) {
    return false
  }

  const normalizedDismissal = dismissalTypeId?.replace(/\W/g, '').toLowerCase()

  if (!normalizedDismissal) {
    return true
  }

  return !nonBowlerCreditableDismissals.has(normalizedDismissal)
}

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals

  return Math.round(value * factor) / factor
}
