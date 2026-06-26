import fs from 'node:fs'
import path from 'node:path'
import type {
  CommentsEndpoint,
  GraphsEndpoint,
  ScorecardEndpoint,
  SummaryEndpoint,
} from '../types'

const datasetRoot = path.resolve(process.cwd(), 'Hackathon Data')

export interface MatchEndpointSet {
  readonly fixtureId: string
  readonly summary: SummaryEndpoint
  readonly scorecard: ScorecardEndpoint
  readonly comments: CommentsEndpoint
  readonly graphs: GraphsEndpoint
}

type EndpointName = 'summary' | 'scorecard' | 'comments' | 'graphs'

const endpointName = (filePath: string): EndpointName | 'matches' => {
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

  return 'matches'
}

const walkJsonFiles = (directory: string): string[] => {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      return walkJsonFiles(entryPath)
    }

    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : []
  })
}

const readJson = <T>(filePath: string): T => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}

const fixtureIdForEndpoint = (
  endpoint: EndpointName,
  value: SummaryEndpoint | ScorecardEndpoint | CommentsEndpoint | GraphsEndpoint,
): string => {
  if (endpoint === 'comments') {
    const comments = value as CommentsEndpoint

    return String(comments.innings[0]?.fixtureId)
  }

  const fixtureEndpoint = value as SummaryEndpoint | ScorecardEndpoint | GraphsEndpoint

  return String(fixtureEndpoint.fixture.id)
}

export const loadMatchEndpointSets = (): MatchEndpointSet[] => {
  const byFixtureId = new Map<string, Partial<MatchEndpointSet>>()

  for (const filePath of walkJsonFiles(datasetRoot)) {
    const endpoint = endpointName(filePath)

    if (endpoint === 'matches') {
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

  return [...byFixtureId.values()].map((entry) => {
    if (!entry.summary || !entry.scorecard || !entry.comments || !entry.graphs) {
      throw new Error(`Incomplete endpoint set for fixture ${entry.fixtureId}`)
    }

    return entry as MatchEndpointSet
  })
}

export const selectRepresentativePlayerId = (
  match: MatchEndpointSet,
): string => {
  return String(match.scorecard.players[0]?.id)
}
