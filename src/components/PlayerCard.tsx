import type { Player } from '../types/player'

interface PlayerCardProps {
  player: Player
  onSelect: (player: Player) => void
}

export const PlayerCard = ({ player, onSelect }: PlayerCardProps) => {
  return (
    <button
      type="button"
      className="player-card"
      onClick={() => onSelect(player)}
      aria-label={`View insights for ${player.name}`}
    >
      <span className="player-avatar" aria-hidden="true">
        {player.name.slice(0, 1).toUpperCase()}
      </span>
      <span>
        <strong>{player.name}</strong>
        <small>{player.country || 'Country unavailable'}</small>
      </span>
    </button>
  )
}
