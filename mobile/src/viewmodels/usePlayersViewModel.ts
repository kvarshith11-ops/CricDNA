import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchPlayers } from '../services/playerService'
import type { Player } from '../types/player'
import { ViewState } from '../types/viewState'

interface PlayersViewModel {
  players: Player[]
  searchTerm: string
  viewState: ViewState
  errorMessage: string | null
  setSearchTerm: (value: string) => void
  retry: () => Promise<void>
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong while loading players.'
}

export const usePlayersViewModel = (): PlayersViewModel => {
  const [players, setPlayers] = useState<Player[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewState, setViewState] = useState<ViewState>(ViewState.Loading)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadPlayers = useCallback(async () => {
    setViewState(ViewState.Loading)
    setErrorMessage(null)

    try {
      const loadedPlayers = await fetchPlayers()

      setPlayers(loadedPlayers)
      setViewState(loadedPlayers.length > 0 ? ViewState.Loaded : ViewState.Empty)
    } catch (error) {
      setPlayers([])
      setErrorMessage(getErrorMessage(error))
      setViewState(ViewState.Error)
    }
  }, [])

  useEffect(() => {
    void loadPlayers()
  }, [loadPlayers])

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) {
      return players
    }

    return players.filter((player) =>
      player.name.toLowerCase().includes(normalizedSearch),
    )
  }, [players, searchTerm])

  const resolvedViewState = useMemo(() => {
    if (viewState !== ViewState.Loaded) {
      return viewState
    }

    return filteredPlayers.length > 0 ? ViewState.Loaded : ViewState.Empty
  }, [filteredPlayers.length, viewState])

  return {
    players: filteredPlayers,
    searchTerm,
    viewState: resolvedViewState,
    errorMessage,
    setSearchTerm,
    retry: loadPlayers,
  }
}
