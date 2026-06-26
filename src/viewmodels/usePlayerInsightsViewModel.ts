import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPlayerScoutProfile } from '../services/playerService'
import type { AIScoutResponse } from '../types/aiScout'
import { ViewState } from '../types/viewState'

interface PlayerInsightsViewModel {
  profile: AIScoutResponse | null
  viewState: ViewState
  errorMessage: string | null
  retry: () => Promise<void>
}

export const usePlayerInsightsViewModel = (): PlayerInsightsViewModel => {
  const { id } = useParams<{ id: string }>()

  const [profile, setProfile] = useState<AIScoutResponse | null>(null)
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
      const scoutProfile = await fetchPlayerScoutProfile(id)

      setProfile(scoutProfile)
      setViewState(ViewState.Loaded)
    } catch (error) {
      setProfile(null)
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
    profile,
    viewState,
    errorMessage,
    retry: loadProfile,
  }
}
