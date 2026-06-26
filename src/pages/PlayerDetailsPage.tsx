import { Link } from 'react-router-dom'
import { ScoreCircle } from '../components/ScoreCircle'
import { StatCard } from '../components/StatCard'
import { StatusMessage } from '../components/StatusMessage'
import { ViewState } from '../types/viewState'
import { usePlayerInsightsViewModel } from '../viewmodels/usePlayerInsightsViewModel'

export const PlayerDetailsPage = () => {
  const { insights, recentMatches, viewState, errorMessage } =
    usePlayerInsightsViewModel()

  if (viewState === ViewState.Idle || viewState === ViewState.Loading) {
    return (
      <main className="app-shell">
        <StatusMessage
          title="Loading insights"
          message="Preparing the player analytics profile."
        />
      </main>
    )
  }

  if (viewState === ViewState.Error || !insights) {
    return (
      <main className="app-shell">
        <StatusMessage
          title="Could not load insights"
          message={errorMessage || 'The local player insights mock is unavailable.'}
        />
      </main>
    )
  }

  const headlineStats = [
    { label: 'Matches', value: insights.headlineStats.matches.toLocaleString() },
    { label: 'Runs', value: insights.headlineStats.runs.toLocaleString() },
    {
      label: 'Batting Average',
      value: insights.headlineStats.battingAverage.toFixed(2),
    },
    {
      label: 'Strike Rate',
      value: insights.headlineStats.strikeRate.toFixed(2),
    },
    { label: 'Best Figure', value: insights.headlineStats.bestFigure },
  ]

  return (
    <main className="app-shell details-page">
      <Link className="back-link" to="/">
        <span aria-hidden="true">&lt;</span>
        Back to players
      </Link>

      <header className="player-hero">
        <div>
          <p className="eyebrow">Player Header</p>
          <h1>{insights.identity.name}</h1>
          <div className="meta-row" aria-label="Player details">
            <span>{insights.identity.country}</span>
            <span>{insights.identity.role}</span>
            <span>{insights.identity.age} years</span>
          </div>
        </div>
        <div className="format-pill">{insights.meta.format}</div>
      </header>

      <section className="dna-hero-card">
        <ScoreCircle score={insights.cricketDNA.score} />
        <div>
          <p className="eyebrow">Cricket DNA Hero Card</p>
          <h2>DNA Score</h2>
          <div className="dna-labels">
            <span>{insights.cricketDNA.tier}</span>
            <strong>{insights.cricketDNA.archetype}</strong>
          </div>
          <p>{insights.cricketDNA.explanation}</p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-title">
          <p className="eyebrow">Headline Stats Cards</p>
          <h2>Career Snapshot</h2>
        </div>
        <div className="stats-grid">
          {headlineStats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </section>

      <section className="content-section two-column">
        <div className="section-title">
          <p className="eyebrow">DNA Breakdown</p>
          <h2>Score Contributors</h2>
        </div>
        <div className="breakdown-list">
          {insights.cricketDNA.breakdown.map((item) => (
            <div className="breakdown-row" key={item.metric}>
              <div>
                <strong>{item.metric}</strong>
                <span>{item.contribution}% contribution</span>
              </div>
              <div className="progress-track" aria-hidden="true">
                <span
                  className="progress-fill"
                  style={{ width: `${item.contribution}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="trend-card">
        <div>
          <p className="eyebrow">Trend Card</p>
          <h2>{insights.trend.label}</h2>
        </div>
        <span className="confidence-pill">{insights.trend.confidence}</span>
        <p>{insights.trend.reason}</p>
      </section>

      <section className="summary-card">
        <p className="eyebrow">AI Summary Card</p>
        <h2>Analyst Summary</h2>
        <p>{insights.summary.note}</p>
        <ul className="highlight-list">
          {insights.summary.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      </section>

      <section className="profile-grid">
        <article className="insight-card">
          <p className="eyebrow">Strengths Section</p>
          <h2>Strengths</h2>
          {insights.profile.strengths.map((strength) => (
            <div className="profile-item" key={strength.metric}>
              <strong>{strength.metric}</strong>
              <p>{strength.reason}</p>
            </div>
          ))}
        </article>

        <article className="insight-card">
          <p className="eyebrow">Weaknesses Section</p>
          <h2>Weaknesses</h2>
          {insights.profile.weaknesses.map((weakness) => (
            <div className="profile-item" key={weakness.metric}>
              <strong>{weakness.metric}</strong>
              <p>{weakness.reason}</p>
            </div>
          ))}
        </article>
      </section>

      <section className="content-section">
        <div className="section-title">
          <p className="eyebrow">Recent Matches Table</p>
          <h2>Recent Matches</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Performance</th>
                <th>Strike Rate</th>
                <th>Result</th>
                <th>Player of Match</th>
              </tr>
            </thead>
            <tbody>
              {recentMatches.map((match) => (
                <tr key={`${match.date}-${match.opponent}`}>
                  <td>{match.displayDate}</td>
                  <td>{match.opponent}</td>
                  <td>{match.performance}</td>
                  <td>{match.strikeRate.toFixed(1)}</td>
                  <td>
                    <span className="result-pill">{match.result}</span>
                  </td>
                  <td>{match.playerOfMatch ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
