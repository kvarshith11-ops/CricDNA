import { useNavigate } from 'react-router-dom'
import { PlayerCard } from '../components/PlayerCard'
import { SearchInput } from '../components/SearchInput'
import { StatusMessage } from '../components/StatusMessage'
import type { Player } from '../types/player'
import { ViewState } from '../types/viewState'
import { usePlayersViewModel } from '../viewmodels/usePlayersViewModel'

export const PlayersPage = () => {
  const navigate = useNavigate()
  const {
    players,
    searchTerm,
    viewState,
    errorMessage,
    setSearchTerm,
    retry,
  } = usePlayersViewModel()

  const handlePlayerSelect = (player: Player) => {
    navigate(`/player/${player.id}`, {
      state: {
        player,
      },
    })
  }

  const isWaiting =
    viewState === ViewState.Idle || viewState === ViewState.Loading

  return (
    <main className="app-shell">
      <header className="page-header players-header">
        <div>
          <p className="eyebrow">Player Insights</p>
          <h1>Explore cricket player profiles</h1>
          <p className="page-copy">
            Search live CricAPI player data, then open a reusable insights
            prototype powered by local mock analytics.
          </p>
        </div>
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
      </header>

      {isWaiting ? (
        <StatusMessage
          title="Loading players"
          message="Fetching the latest player directory from CricAPI."
        />
      ) : null}

      {viewState === ViewState.Error ? (
        <StatusMessage
          title="Could not load players"
          message={
            errorMessage ||
            'Check the CricAPI key or network connection, then try again.'
          }
          actionLabel="Retry"
          onAction={() => void retry()}
        />
      ) : null}

      {viewState === ViewState.Empty ? (
        <StatusMessage
          title={searchTerm ? 'No matching players' : 'No players found'}
          message={
            searchTerm
              ? 'Try a different player name.'
              : 'CricAPI returned an empty player list.'
          }
        />
      ) : null}

      {viewState === ViewState.Loaded ? (
        <section className="players-grid" aria-label="Players list">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onSelect={handlePlayerSelect}
            />
          ))}
        </section>
      ) : null}
    </main>
  )
}
