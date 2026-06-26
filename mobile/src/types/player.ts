export interface Player {
  id: string
  name: string
  country: string
}

export interface PlayersApiResponse {
  status: 'success' | 'failure'
  data?: Player[]
  reason?: string
}
