import { useCallback, useEffect, useState } from 'react'
import { fetchPlayerScoutProfile } from '../services/playerService'
import type { CricDnaProfileResponse } from '../types/aiScout'
import type { Player } from '../types/player'
import { ViewState } from '../types/viewState'

interface PlayerInsightsViewModel {
  report: CricDnaProfileResponse | null
  viewState: ViewState
  errorMessage: string | null
  retry: () => Promise<void>
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to generate CricDNA scouting report.'
}

export const usePlayerInsightsViewModel = (
  selectedPlayer: Player,
): PlayerInsightsViewModel => {
  const [report, setReport] = useState<CricDnaProfileResponse | null>(null)
  const [viewState, setViewState] = useState<ViewState>(ViewState.Idle)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    setViewState(ViewState.Loading)
    setErrorMessage(null)

    try {
      const scoutReport = await fetchPlayerScoutProfile(selectedPlayer.id)

      setReport(scoutReport)
      setViewState(ViewState.Loaded)
    } catch (error) {
      setReport(null)
      setErrorMessage(getErrorMessage(error))
      setViewState(ViewState.Error)
    }
  }, [selectedPlayer.id])

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadProfile()
    }, 0)

    return () => clearTimeout(timeout)
  }, [loadProfile])

  return {
    report,
    viewState,
    errorMessage,
    retry: loadProfile,
  }
}
