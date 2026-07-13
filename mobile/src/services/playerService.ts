import axios from 'axios'
import rawMockPlayers from '../mocks/players.json'
import type { CricDnaProfileResponse } from '../types/aiScout'
import type { Player, PlayerDirectoryResponse, PlayersApiResponse } from '../types/player'

const CRIC_API_BASE_URL = 'https://api.cricapi.com/v1'
const DEFAULT_CRICDNA_API_BASE_URL = 'http://10.0.2.2:5173'
const mockPlayers = rawMockPlayers as Player[]

const getApiKey = (): string | null => {
  return process.env.EXPO_PUBLIC_CRIC_API_KEY?.trim() || null
}

export const fetchPlayers = async (offset = 0): Promise<Player[]> => {
  const localPlayers = await fetchLocalCricDnaPlayers()

  if (localPlayers.length > 0) {
    return localPlayers
  }

  const apiKey = getApiKey()

  if (!apiKey) {
    return mockPlayers
  }

  const response = await axios.get<PlayersApiResponse>(
    `${CRIC_API_BASE_URL}/players`,
    {
      params: {
        apikey: apiKey,
        offset,
      },
    },
  )

  if (response.data.status !== 'success') {
    throw new Error(response.data.reason || 'Unable to load players from CricAPI.')
  }

  return response.data.data ?? []
}

const fetchLocalCricDnaPlayers = async (): Promise<Player[]> => {
  for (const baseUrl of getCricDnaApiBaseUrls()) {
    try {
      const response = await axios.get<PlayerDirectoryResponse>(
        `${baseUrl}/api/players`,
        {
          timeout: 5_000,
        },
      )

      return response.data.data ?? []
    } catch {
      // Try the next local API candidate before falling back to static data.
    }
  }

  return []
}

const getCricDnaApiBaseUrls = (): readonly string[] => {
  const configuredUrls =
    process.env.EXPO_PUBLIC_CRICDNA_API_BASE_URL?.split(',')
      .map((url) => url.trim())
      .filter(Boolean) ?? []

  return [...new Set([...configuredUrls, DEFAULT_CRICDNA_API_BASE_URL])]
}

export const fetchPlayerScoutProfile = async (
  playerId: string,
): Promise<CricDnaProfileResponse> => {
  let networkFailure: unknown = null

  for (const baseUrl of getCricDnaApiBaseUrls()) {
    try {
      const response = await axios.post<CricDnaProfileResponse>(
        `${baseUrl}/api/player/${encodeURIComponent(playerId)}/profile`,
        {},
        {
          timeout: 90_000,
        },
      )

      return response.data
    } catch (error) {
      if (isNetworkError(error)) {
        networkFailure = error
        continue
      }

      throw new Error(toApiErrorMessage(error), { cause: error })
    }
  }

  throw new Error(toApiErrorMessage(networkFailure), { cause: networkFailure })
}

const isNetworkError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && !error.response
}

const toApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined

    if (!error.response && error.message === 'Network Error') {
      return 'Unable to reach the local CricDNA API. Keep npm run dev running in the project root. Android emulator uses http://10.0.2.2:5173; a physical phone should start mobile with npm run mobile:android:phone.'
    }

    return data?.error || error.message
  }

  return error instanceof Error ? error.message : 'Unable to generate report.'
}
