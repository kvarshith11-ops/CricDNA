import fs from 'node:fs'
import path from 'node:path'
import { aggregatePlayerCareer } from '../cricdna/aggregation'
import { extractMatchRecord } from '../cricdna/extraction'
import type {
  CommentsEndpoint,
  GraphsEndpoint,
  ScorecardEndpoint,
  SummaryEndpoint,
} from '../cricdna/extraction/types'
import {
  MetricRunner,
  TraitRunner,
  buildAIScoutPrompt,
  buildPlayerProfilePresentation,
  buildPlayerPhaseAnalysis,
  buildPlayerProfile,
  loadDefaultMetricRegistry,
  loadDefaultTraitRegistry,
  traitDefinitions,
  validateAIScoutResponseJson,
  type AIScoutResponse,
  type PlayerProfile,
  type PlayerProfilePresentation,
  formatForFixture,
  phaseForOver,
} from '../cricdna'
import {
  TraitCategory,
  TraitResults,
  TraitStatus,
  type TraitResult,
} from '../cricdna/traits'
import { OpenAIScoutService } from './OpenAIScoutService'

export interface PlayerProfileControllerResult {
  readonly status: number
  readonly body: Readonly<Record<string, unknown>> | CricDnaProfileResponse
}

export interface CricDnaProfileResponse {
  readonly profile: PlayerProfile
  readonly scout: AIScoutResponse | null
  readonly presentation: PlayerProfilePresentation
}

export interface MatchEndpointSet {
  readonly fixtureId: string
  readonly summary: SummaryEndpoint
  readonly scorecard: ScorecardEndpoint
  readonly comments: CommentsEndpoint
  readonly graphs: GraphsEndpoint
}

type EndpointName = 'summary' | 'scorecard' | 'comments' | 'graphs'

const datasetRoot = path.resolve(process.cwd(), 'Hackathon Data')

export class PlayerProfileController {
  constructor(private readonly openAIService = new OpenAIScoutService()) {}

  async createProfile(playerId: string): Promise<PlayerProfileControllerResult> {
    try {
      if (!playerId.trim()) {
        return failure(400, 'Missing player id.')
      }

      const endpointSets = loadMatchEndpointSets()
      const playerMatches = endpointSets.filter((match) =>
        match.scorecard.players.some((player) => String(player.id) === playerId),
      )

      if (playerMatches.length === 0) {
        return failure(
          404,
          'No deterministic match evidence is available for this player in the local dataset.',
        )
      }

      const records = playerMatches.map((match) =>
        extractMatchRecord({
          playerId,
          summary: match.summary,
          scorecard: match.scorecard,
          comments: match.comments,
          graphs: match.graphs,
        }).record,
      )
      const aggregation = aggregatePlayerCareer({ records })

      if (!aggregation.model || !aggregation.validation.valid) {
        return failure(
          422,
          'Unable to build deterministic PlayerKnowledgeModel.',
          aggregation.validation.errors,
        )
      }

      const metrics = new MetricRunner(loadDefaultMetricRegistry()).run({
        pkm: aggregation.model,
      })
      const traits = buildAvailableTraits(metrics, playerMatches, playerId)
      const profileResult = buildPlayerProfile({
        pkm: aggregation.model,
        metrics,
        traits,
        phaseAnalysis: buildPlayerPhaseAnalysis(playerMatches, playerId),
      })

      if (!profileResult.validation.valid) {
        return failure(
          422,
          'Deterministic PlayerProfile validation failed.',
          profileResult.validation.errors,
        )
      }

      if (!profileResult.profile.guardrails.eligible) {
        return {
          status: 200,
          body: {
            profile: profileResult.profile,
            scout: null,
            presentation: buildPlayerProfilePresentation(profileResult.profile, null),
          },
        }
      }

      const prompt = buildAIScoutPrompt({ profile: profileResult.profile })
      const rawAIResponse = await this.openAIService.generateScoutReport(prompt)
      const validation = validateAIScoutResponseJson(rawAIResponse)

      if (!validation.valid || !validation.response) {
        return failure(
          502,
          'The AI Scout returned an invalid response.',
          validation.errors,
        )
      }

      return {
        status: 200,
        body: {
          profile: profileResult.profile,
          scout: validation.response,
          presentation: buildPlayerProfilePresentation(
            profileResult.profile,
            validation.response.dnaScore.score,
          ),
        },
      }
    } catch (error) {
      return failure(
        500,
        error instanceof Error ? error.message : 'Unexpected profile generation failure.',
      )
    }
  }
}

const buildAvailableTraits = (
  metrics: ReturnType<MetricRunner['run']>,
  matches: readonly MatchEndpointSet[],
  playerId: string,
): TraitResults => {
  const registry = loadDefaultTraitRegistry()
  const entries: TraitResult[] = []

  for (const definition of traitDefinitions) {
    try {
      const result = new TraitRunner(registry).run({
        metrics,
        traitIds: [definition.id],
      }).get(definition.id)

      if (result) {
        entries.push(result)
      }
    } catch {
      continue
    }
  }

  const bowlingPhaseTrait = buildBowlingPhaseTrait(matches, playerId)

  if (bowlingPhaseTrait) {
    entries.push(bowlingPhaseTrait)
  }

  return new TraitResults(new Map(entries.map((trait) => [trait.traitId, trait])))
}

export const buildBowlingPhaseTrait = (
  matches: readonly MatchEndpointSet[],
  playerId: string,
): TraitResult | null => {
  const counts = new Map<string, number>()

  for (const match of matches) {
    const format = formatForFixture(match.summary.fixture.gameType)

    for (const innings of match.comments.innings) {
      for (const over of innings.overs ?? []) {
        for (const ball of over.balls ?? []) {
          if (String(ball.bowlerPlayerId) !== playerId) {
            continue
          }

          const phase = phaseForOver(format, over.overNumber)

          if (phase) {
            counts.set(phase, (counts.get(phase) ?? 0) + 1)
          }
        }
      }
    }
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)

  if (total === 0) {
    return null
  }

  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1])
  const [dominantPhase, dominantCount] = sorted[0] ?? ['Unknown', 0]

  return {
    traitId: 'trait.bowling_phase_usage',
    traitName: 'Bowling Phase Usage',
    category: TraitCategory.Bowling,
    classification: labelForPhase(dominantPhase),
    confidence: Math.round((dominantCount / total) * 100) / 100,
    supportingMetrics: [],
    explanation: `Classified from ${total} ball-by-ball bowling events: ${stablePhaseBreakdown(counts)}.`,
    status: TraitStatus.Success,
    version: '1.0.0',
  }
}

const labelForPhase = (phase: string): string => {
  switch (phase) {
    case 'Powerplay':
      return 'Powerplay Specialist'
    case 'Middle':
      return 'Middle Overs Controller'
    case 'Death':
      return 'Death Overs Specialist'
    default:
      return 'Multi-Phase Bowler'
  }
}

const stablePhaseBreakdown = (counts: ReadonlyMap<string, number>): string => {
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([phase, count]) => `${phase}: ${count}`)
    .join(', ')
}

const failure = (
  status: number,
  message: string,
  details?: unknown,
): PlayerProfileControllerResult => ({
  status,
  body: {
    error: message,
    details,
  },
})

const loadMatchEndpointSets = (): readonly MatchEndpointSet[] => {
  const byFixtureId = new Map<string, Partial<MatchEndpointSet>>()

  for (const filePath of walkJsonFiles(datasetRoot)) {
    const endpoint = endpointName(filePath)

    if (!endpoint) {
      continue
    }

    const value = readJson<
      SummaryEndpoint | ScorecardEndpoint | CommentsEndpoint | GraphsEndpoint
    >(filePath)
    const fixtureId = fixtureIdForEndpoint(endpoint, value)
    const existing = byFixtureId.get(fixtureId) ?? { fixtureId }

    byFixtureId.set(fixtureId, {
      ...existing,
      [endpoint]: value,
    })
  }

  return [...byFixtureId.values()].flatMap((entry) => {
    if (!entry.summary || !entry.scorecard || !entry.comments || !entry.graphs) {
      return []
    }

    return [entry as MatchEndpointSet]
  })
}

const walkJsonFiles = (directory: string): readonly string[] => {
  if (!fs.existsSync(directory)) {
    return []
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      return walkJsonFiles(entryPath)
    }

    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : []
  })
}

const endpointName = (filePath: string): EndpointName | null => {
  const normalizedPath = filePath.toLowerCase()

  if (normalizedPath.includes('summary')) {
    return 'summary'
  }

  if (normalizedPath.includes('scorecard')) {
    return 'scorecard'
  }

  if (normalizedPath.includes('comments')) {
    return 'comments'
  }

  if (normalizedPath.includes('graphs')) {
    return 'graphs'
  }

  return null
}

const readJson = <T>(filePath: string): T => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

const fixtureIdForEndpoint = (
  endpoint: EndpointName,
  value: SummaryEndpoint | ScorecardEndpoint | CommentsEndpoint | GraphsEndpoint,
): string => {
  if (endpoint === 'comments') {
    return String((value as CommentsEndpoint).innings[0]?.fixtureId)
  }

  return String((value as SummaryEndpoint | ScorecardEndpoint | GraphsEndpoint).fixture.id)
}
