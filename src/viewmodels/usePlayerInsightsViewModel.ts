import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPlayerScoutProfile } from '../services/playerService'
import type { CricDnaProfileResponse } from '../types/aiScout'
import { ViewState } from '../types/viewState'

interface PlayerInsightsViewModel {
  report: CricDnaProfileResponse | null
  viewState: ViewState
  errorMessage: string | null
  retry: () => Promise<void>
}

export const usePlayerInsightsViewModel = (): PlayerInsightsViewModel => {
  const { id } = useParams<{ id: string }>()

  const [report, setReport] = useState<CricDnaProfileResponse | null>(null)
  const [viewState, setViewState] = useState<ViewState>(ViewState.Idle)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    if (!id) {
      setViewState(ViewState.Error)
      setErrorMessage('Missing player id.')
      return
    }

    setViewState(ViewState.Loading)
    setErrorMessage(null)

    try {
      const scoutReport = await fetchPlayerScoutProfile(id)

      setReport(scoutReport)
      setViewState(ViewState.Loaded)
    } catch (error) {
      setReport(null)
      setViewState(ViewState.Error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to generate CricDNA scouting report.',
      )
    }
  }, [id])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProfile()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [loadProfile])

  return {
    report,
    viewState,
    errorMessage,
    retry: loadProfile,
  }
}
