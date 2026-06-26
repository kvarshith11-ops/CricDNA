import { useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import rawPlayerInsights from '../mocks/playerInsights.json'
import type { Player } from '../types/player'
import type { PlayerInsightsResponse, RecentMatch } from '../types/playerInsights'
import { ViewState } from '../types/viewState'

interface PlayerRouteState {
  player?: Player
}

export interface RecentMatchViewData extends RecentMatch {
  displayDate: string
}

interface PlayerInsightsViewModel {
  insights: PlayerInsightsResponse | null
  recentMatches: RecentMatchViewData[]
  viewState: ViewState
  errorMessage: string | null
}

const playerInsightsMock = rawPlayerInsights as PlayerInsightsResponse

const formatMatchDate = (date: string): string => {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export const usePlayerInsightsViewModel = (): PlayerInsightsViewModel => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const routeState = location.state as PlayerRouteState | null
  const selectedPlayer = routeState?.player

  const [viewState] = useState<ViewState>(ViewState.Loaded)
  const [errorMessage] = useState<string | null>(null)

  const insights = useMemo<PlayerInsightsResponse>(() => {
    return {
      ...playerInsightsMock,
      identity: {
        ...playerInsightsMock.identity,
        id: selectedPlayer?.id || id || playerInsightsMock.identity.id,
        name: selectedPlayer?.name || playerInsightsMock.identity.name,
        country: selectedPlayer?.country || playerInsightsMock.identity.country,
      },
    }
  }, [id, selectedPlayer?.country, selectedPlayer?.id, selectedPlayer?.name])

  const recentMatches = useMemo<RecentMatchViewData[]>(() => {
    return (
      insights?.recentMatches.map((match) => ({
        ...match,
        displayDate: formatMatchDate(match.date),
      })) ?? []
    )
  }, [insights])

  return {
    insights,
    recentMatches,
    viewState,
    errorMessage,
  }
}
