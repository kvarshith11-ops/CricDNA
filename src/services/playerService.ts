import axios from 'axios'
import rawMockPlayers from '../mocks/players.json'
import type { CricDnaProfileResponse } from '../types/aiScout'
import type { Player, PlayerDirectoryResponse, PlayersApiResponse } from '../types/player'

const CRIC_API_BASE_URL = 'https://api.cricapi.com/v1'
const mockPlayers = rawMockPlayers as Player[]

const getApiKey = (): string | null => {
  return import.meta.env.VITE_CRIC_API_KEY?.trim() || null
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
  try {
    const response = await axios.get<PlayerDirectoryResponse>('/api/players')

    return response.data.data ?? []
  } catch {
    return []
  }
}

export const fetchPlayerScoutProfile = async (
  playerId: string,
): Promise<CricDnaProfileResponse> => {
  try {
    const response = await axios.post<CricDnaProfileResponse>(
      `/api/player/${encodeURIComponent(playerId)}/profile`,
      {},
      {
        timeout: 90_000,
      },
    )

    return response.data
  } catch (error) {
    throw new Error(toApiErrorMessage(error), { cause: error })
  }
}

const toApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined

    if (!error.response && error.message === 'Network Error') {
      return 'Unable to reach the local CricDNA API. Make sure npm run dev is running and open the app from http://localhost:5173.'
    }

    return data?.error || error.message
  }

  return error instanceof Error ? error.message : 'Unable to generate report.'
}
