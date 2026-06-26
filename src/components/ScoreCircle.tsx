import type { CSSProperties } from 'react'

interface ScoreCircleProps {
  score: number
}

export const ScoreCircle = ({ score }: ScoreCircleProps) => {
  const normalizedScore = Math.min(Math.max(score, 0), 100)

  return (
    <div
      className="score-circle"
      style={{ '--score': `${normalizedScore}%` } as CSSProperties}
      aria-label={`DNA score ${normalizedScore} out of 100`}
    >
      <strong>{normalizedScore}</strong>
      <span>/100</span>
    </div>
  )
}
