import axios from 'axios'
import rawMockPlayers from '../mocks/players.json'
import type { Player, PlayersApiResponse } from '../types/player'

const CRIC_API_BASE_URL = 'https://api.cricapi.com/v1'
const mockPlayers = rawMockPlayers as Player[]

const getApiKey = (): string | null => {
  return process.env.EXPO_PUBLIC_CRIC_API_KEY?.trim() || null
}

export const fetchPlayers = async (offset = 0): Promise<Player[]> => {
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
