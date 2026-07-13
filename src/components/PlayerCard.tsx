import type { Player } from '../types/player'

interface PlayerCardProps {
  player: Player
  onSelect: (player: Player) => void
}

export const PlayerCard = ({ player, onSelect }: PlayerCardProps) => {
  const meta = [player.country, player.role].filter(Boolean).join(' • ')

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
        {meta ? <small>{meta}</small> : null}
        {player.matchCount ? (
          <em>{player.matchCount} match evidence</em>
        ) : null}
      </span>
    </button>
  )
}
