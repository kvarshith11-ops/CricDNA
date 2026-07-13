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
    totalPlayers,
    filteredPlayers,
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
          <p className="eyebrow">CricDNA Player Directory</p>
          <h1>Choose a player from the evidence set</h1>
          <p className="page-copy">
            Search the local PlayCricket evidence set by player, country, or
            role. Every player shown here has local match evidence; AI analysis
            appears when the guardrail sample size is met.
          </p>
          <div className="directory-stats" aria-label="Directory summary">
            <span>
              <strong>{totalPlayers}</strong>
              Available players
            </span>
            <span>
              <strong>{filteredPlayers}</strong>
              Current results
            </span>
          </div>
        </div>
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
      </header>

      {viewState === ViewState.Loaded ? (
        <section className="directory-toolbar" aria-label="Directory tools">
          <div>
            <p className="eyebrow">Available reports</p>
            <h2>{filteredPlayers} players available</h2>
          </div>
          <p>
            Try searches like <span>India</span>, <span>Bowler</span>,{' '}
            <span>Wicket keeper</span>, or a player name.
          </p>
        </section>
      ) : null}

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
              : 'No supported CricDNA players were found in the local dataset.'
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
