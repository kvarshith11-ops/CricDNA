import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchPlayers } from '../services/playerService'
import type { Player } from '../types/player'
import { ViewState } from '../types/viewState'

interface PlayersViewModel {
  players: Player[]
  totalPlayers: number
  filteredPlayers: number
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
    let isActive = true

    const loadInitialPlayers = async () => {
      try {
        const loadedPlayers = await fetchPlayers()

        if (!isActive) {
          return
        }

        setPlayers(loadedPlayers)
        setViewState(
          loadedPlayers.length > 0 ? ViewState.Loaded : ViewState.Empty,
        )
      } catch (error) {
        if (!isActive) {
          return
        }

        setPlayers([])
        setErrorMessage(getErrorMessage(error))
        setViewState(ViewState.Error)
      }
    }

    void loadInitialPlayers()

    return () => {
      isActive = false
    }
  }, [])

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) {
      return players
    }

    return players.filter((player) => {
      const searchableText = [
        player.name,
        player.country,
        player.role,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(normalizedSearch)
    })
  }, [players, searchTerm])

  const resolvedViewState = useMemo(() => {
    if (viewState !== ViewState.Loaded) {
      return viewState
    }

    return filteredPlayers.length > 0 ? ViewState.Loaded : ViewState.Empty
  }, [filteredPlayers.length, viewState])

  return {
    players: filteredPlayers,
    totalPlayers: players.length,
    filteredPlayers: filteredPlayers.length,
    searchTerm,
    viewState: resolvedViewState,
    errorMessage,
    setSearchTerm,
    retry: loadPlayers,
  }
}
