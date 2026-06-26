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
  buildPlayerProfile,
  loadDefaultMetricRegistry,
  loadDefaultTraitRegistry,
  traitDefinitions,
  validateAIScoutResponseJson,
  type AIScoutResponse,
} from '../cricdna'
import { TraitResults, type TraitResult } from '../cricdna/traits'
import { OpenAIScoutService } from './OpenAIScoutService'

export interface PlayerProfileControllerResult {
  readonly status: number
  readonly body: Readonly<Record<string, unknown>> | AIScoutResponse
}

interface MatchEndpointSet {
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
      const traits = buildAvailableTraits(metrics)
      const profileResult = buildPlayerProfile({
        pkm: aggregation.model,
        metrics,
        traits,
      })

      if (!profileResult.validation.valid) {
        return failure(
          422,
          'Deterministic PlayerProfile validation failed.',
          profileResult.validation.errors,
        )
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
        body: validation.response,
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

  return new TraitResults(new Map(entries.map((trait) => [trait.traitId, trait])))
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
