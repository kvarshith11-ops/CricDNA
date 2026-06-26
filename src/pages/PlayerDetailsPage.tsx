import { Link, useLocation, useParams } from 'react-router-dom'
import { ScoreCircle } from '../components/ScoreCircle'
import { StatCard } from '../components/StatCard'
import { StatusMessage } from '../components/StatusMessage'
import type { AIRating } from '../types/aiScout'
import type { Player } from '../types/player'
import { ViewState } from '../types/viewState'
import { usePlayerInsightsViewModel } from '../viewmodels/usePlayerInsightsViewModel'

interface PlayerRouteState {
  player?: Player
}

const formatScore = (rating: AIRating): string => `${rating.score}/100`

export const PlayerDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const selectedPlayer = (location.state as PlayerRouteState | null)?.player
  const { profile, viewState, errorMessage, retry } = usePlayerInsightsViewModel()

  if (viewState === ViewState.Idle || viewState === ViewState.Loading) {
    return (
      <main className="app-shell">
        <StatusMessage
          title="Generating CricDNA report"
          message="Building deterministic evidence, asking the AI Scout to evaluate it, and validating the JSON response."
        />
      </main>
    )
  }

  if (viewState === ViewState.Error || !profile) {
    return (
      <main className="app-shell">
        <Link className="back-link" to="/">
          <span aria-hidden="true">&lt;</span>
          Back to players
        </Link>
        <StatusMessage
          title="Could not generate CricDNA report"
          message={
            errorMessage ||
            'The AI Scout response could not be generated or validated.'
          }
          actionLabel="Retry"
          onAction={() => void retry()}
        />
      </main>
    )
  }

  const ratings = [
    { label: 'Batting', rating: profile.ratings.batting },
    { label: 'Bowling', rating: profile.ratings.bowling },
    { label: 'Fielding', rating: profile.ratings.fielding },
    { label: 'Overall', rating: profile.ratings.overall },
  ]
  const traitCards = [
    { label: 'Batting', value: profile.batting },
    { label: 'Bowling', value: profile.bowling },
    { label: 'Fielding', value: profile.fielding },
    { label: 'Overall', value: profile.overall },
  ]

  return (
    <main className="app-shell details-page">
      <Link className="back-link" to="/">
        <span aria-hidden="true">&lt;</span>
        Back to players
      </Link>

      <header className="player-hero">
        <div>
          <p className="eyebrow">CricDNA AI Scout</p>
          <h1>{selectedPlayer?.name ?? `Player ${id ?? ''}`}</h1>
          <div className="meta-row" aria-label="Player details">
            <span>ID {selectedPlayer?.id ?? id}</span>
            {selectedPlayer?.country ? <span>{selectedPlayer.country}</span> : null}
          </div>
        </div>
        <div className="format-pill">Validated AI JSON</div>
      </header>

      <section className="dna-hero-card">
        <ScoreCircle score={profile.dnaScore.score} />
        <div>
          <p className="eyebrow">DNA Score</p>
          <h2>{formatScore(profile.dnaScore)}</h2>
          <p>{profile.dnaScore.explanation}</p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-title">
          <p className="eyebrow">Ratings</p>
          <h2>Scout Evaluation</h2>
        </div>
        <div className="stats-grid ratings-grid">
          {ratings.map(({ label, rating }) => (
            <StatCard key={label} label={label} value={formatScore(rating)} />
          ))}
        </div>
      </section>

      <section className="profile-grid">
        {ratings.map(({ label, rating }) => (
          <article className="insight-card" key={label}>
            <p className="eyebrow">{label} Rating</p>
            <h2>{formatScore(rating)}</h2>
            <p>{rating.explanation}</p>
          </article>
        ))}
      </section>

      <section className="content-section">
        <div className="section-title">
          <p className="eyebrow">Traits</p>
          <h2>Role Evidence</h2>
        </div>
        <div className="profile-grid">
          {traitCards.map((trait) => (
            <article className="insight-card" key={trait.label}>
              <strong>{trait.label}</strong>
              <p>{trait.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-grid">
        <article className="insight-card">
          <p className="eyebrow">Strengths</p>
          <h2>What Stands Out</h2>
          <ul className="highlight-list">
            {profile.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </article>

        <article className="insight-card">
          <p className="eyebrow">Development Areas</p>
          <h2>Growth Focus</h2>
          <ul className="highlight-list">
            {profile.developmentAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="content-section">
        <div className="section-title">
          <p className="eyebrow">Role Suitability</p>
          <h2>Best Fits</h2>
        </div>
        <div className="breakdown-list">
          {profile.roleSuitability.map((role) => (
            <div className="breakdown-row" key={role.role}>
              <div>
                <strong>{role.role}</strong>
                <span>{role.suitability}/100 suitability</span>
              </div>
              <div>
                <div className="progress-track" aria-hidden="true">
                  <span
                    className="progress-fill"
                    style={{ width: `${Math.min(Math.max(role.suitability, 0), 100)}%` }}
                  />
                </div>
                <p className="role-explanation">{role.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="summary-card">
        <p className="eyebrow">Scouting Report</p>
        <h2>AI Scout Readout</h2>
        <p>{profile.scoutingReport}</p>
      </section>

      <section className="trend-card">
        <div>
          <p className="eyebrow">Confidence</p>
          <h2>{profile.confidence.score}/100</h2>
        </div>
        <span className="confidence-pill">Validated</span>
        <p>{profile.confidence.explanation}</p>
      </section>
    </main>
  )
}
