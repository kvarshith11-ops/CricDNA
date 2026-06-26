import { useMemo, useState } from 'react'
import rawPlayerInsights from '../mocks/playerInsights.json'
import type { Player } from '../types/player'
import type { PlayerInsightsResponse, RecentMatch } from '../types/playerInsights'
import { ViewState } from '../types/viewState'

export interface RecentMatchViewData extends RecentMatch {
  displayDate: string
}

interface PlayerInsightsViewModel {
  insights: PlayerInsightsResponse
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

export const usePlayerInsightsViewModel = (
  selectedPlayer: Player,
): PlayerInsightsViewModel => {
  const [viewState] = useState<ViewState>(ViewState.Loaded)
  const [errorMessage] = useState<string | null>(null)

  const insights = useMemo<PlayerInsightsResponse>(() => {
    return {
      ...playerInsightsMock,
      identity: {
        ...playerInsightsMock.identity,
        id: selectedPlayer.id,
        name: selectedPlayer.name,
        country: selectedPlayer.country,
      },
    }
  }, [selectedPlayer.country, selectedPlayer.id, selectedPlayer.name])

  const recentMatches = useMemo<RecentMatchViewData[]>(() => {
    return insights.recentMatches.map((match) => ({
      ...match,
      displayDate: formatMatchDate(match.date),
    }))
  }, [insights])

  return {
    insights,
    recentMatches,
    viewState,
    errorMessage,
  }
}
