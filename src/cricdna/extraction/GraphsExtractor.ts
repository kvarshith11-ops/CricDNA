import { toId } from './helpers'
import type {
  GraphsEndpoint,
  PlayerScopedExtractionInput,
  ProgressionExtractionResult,
} from './types'

export class GraphsExtractor {
  extract(
    input: PlayerScopedExtractionInput<GraphsEndpoint>,
  ): ProgressionExtractionResult {
    const { endpoint } = input
    const innings = endpoint.fixture.innings ?? []

    return {
      progression: {
        battingTimeline: innings.flatMap(
          (sourceInnings) =>
            sourceInnings.overs?.map((over) => ({
              ballRef: {
                inningsId: toId(sourceInnings.id),
                over: over.overNumber,
                ballInOver: 6,
              },
              teamRuns: over.totalInningRuns,
              wicketsDown: over.totalInningWickets,
            })) ?? [],
        ),
        bowlingTimeline: innings.flatMap(
          (sourceInnings) =>
            sourceInnings.overs?.map((over) => ({
              ballRef: {
                inningsId: toId(sourceInnings.id),
                over: over.overNumber,
                ballInOver: 6,
              },
              runsConcededToDate: over.totalInningRuns,
              wicketsToDate: over.totalInningWickets,
            })) ?? [],
        ),
      },
    }
  }
}
