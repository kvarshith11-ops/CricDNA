import fs from 'node:fs'
import path from 'node:path'
import type { Player } from '../types/player'
import type { ScorecardEndpoint } from '../cricdna/extraction/types'

export interface PlayerDirectoryEntry extends Player {
  readonly role?: string
  readonly matchCount: number
}

export interface PlayerDirectoryResponse {
  readonly status: 'success'
  readonly data: readonly PlayerDirectoryEntry[]
  readonly meta: {
    readonly totalPlayers: number
    readonly totalMatches: number
  }
}

interface PlayerAccumulator {
  readonly id: string
  name: string
  country: string
  role?: string
  readonly matchIds: Set<string>
}

const datasetRoot = path.resolve(process.cwd(), 'Hackathon Data')

export class PlayerDirectoryController {
  listPlayers(): PlayerDirectoryResponse {
    const scorecards = walkJsonFiles(datasetRoot).filter((filePath) =>
      filePath.toLowerCase().includes('scorecards'),
    )
    const players = new Map<string, PlayerAccumulator>()
    const matchIds = new Set<string>()

    for (const filePath of scorecards) {
      const scorecard = readJson<ScorecardEndpoint>(filePath)
      const fixtureId = String(scorecard.fixture.id)
      const teams = [scorecard.fixture.homeTeam, scorecard.fixture.awayTeam]
      const playersSeenInMatch = new Set<string>()

      matchIds.add(fixtureId)

      for (const player of scorecard.players) {
        const id = String(player.id)

        if (playersSeenInMatch.has(id)) {
          continue
        }

        playersSeenInMatch.add(id)

        const existing = players.get(id) ?? {
          id,
          name: player.displayName || `Player ${id}`,
          country: '',
          role: normalizeRole(player.type),
          matchIds: new Set<string>(),
        }

        existing.name = existing.name || player.displayName || `Player ${id}`
        existing.role = existing.role || normalizeRole(player.type)
        existing.country =
          existing.country ||
          cleanText(player.nationality) ||
          countryFromTeamName(
            teams.find((team) => String(team.id) === String(player.teamId))?.name,
          ) ||
          ''
        existing.matchIds.add(fixtureId)
        players.set(id, existing)
      }
    }

    return {
      status: 'success',
      data: [...players.values()]
        .map((player) => ({
          id: player.id,
          name: player.name,
          country: player.country,
          role: player.role,
          matchCount: player.matchIds.size,
        }))
        .sort((left, right) => {
          if (right.matchCount !== left.matchCount) {
            return right.matchCount - left.matchCount
          }

          return left.name.localeCompare(right.name)
        }),
      meta: {
        totalPlayers: players.size,
        totalMatches: matchIds.size,
      },
    }
  }
}

const normalizeRole = (role: string | undefined): string | undefined => {
  const cleaned = cleanText(role)

  if (!cleaned) {
    return undefined
  }

  switch (cleaned.toLowerCase()) {
    case 'allrounder':
    case 'all-rounder':
      return 'All-rounder'
    case 'wicket keeper':
    case 'wicketkeeper':
      return 'Wicket keeper'
    default:
      return cleaned
  }
}

const cleanText = (value: string | undefined): string | undefined => {
  const cleaned = value?.trim()

  return cleaned ? cleaned : undefined
}

const countryFromTeamName = (teamName: string | undefined): string | undefined => {
  const cleaned = cleanText(teamName)

  if (!cleaned || !/\s+(Men|Women)$/i.test(cleaned)) {
    return undefined
  }

  return cleaned.replace(/\s+(Men|Women)$/i, '')
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

const readJson = <T>(filePath: string): T => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
}
