export interface Player {
  id: string
  name: string
  country: string
  role?: string
  matchCount?: number
}

export interface PlayersApiResponse {
  status: 'success' | 'failure'
  data?: Player[]
  reason?: string
}

export interface PlayerDirectoryResponse {
  status: 'success'
  data: Player[]
  meta: {
    totalPlayers: number
    totalMatches: number
  }
}
