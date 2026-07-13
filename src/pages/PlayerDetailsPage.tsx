import { Link, useLocation, useParams } from 'react-router-dom'
import { ScoreCircle } from '../components/ScoreCircle'
import { StatCard } from '../components/StatCard'
import { StatusMessage } from '../components/StatusMessage'
import type {
  PlayerProfileBattingPhaseStat,
  PlayerProfileBowlingPhaseStat,
  PlayerProfileRecentMatch,
  PlayerProfileRole,
  PlayerProfileSummary,
} from '../types/aiScout'
import type { Player } from '../types/player'
import { ViewState } from '../types/viewState'
import { visibleDnaObservationGroupsFor } from '../utils/dnaObservations'
import { usePlayerInsightsViewModel } from '../viewmodels/usePlayerInsightsViewModel'

interface PlayerRouteState {
  player?: Player
}

const hasDisplayValue = (value: number | string | null | undefined): boolean => {
  return value !== null && value !== undefined && value !== ''
}

const displayStatValue = (
  label: string,
  value: number | string | null | undefined,
): string => {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (typeof value === 'number' && label.toLowerCase().includes('average')) {
    return value.toFixed(2)
  }

  if (typeof value === 'number' && label.toLowerCase().includes('economy')) {
    return value.toFixed(2)
  }

  return String(value)
}

const formatRole = (role: PlayerProfileRole | null): string => {
  switch (role) {
    case 'all_rounder':
      return 'All-rounder'
    case 'wicket_keeper':
      return 'Wicket keeper'
    case 'batter':
      return 'Batter'
    case 'bowler':
      return 'Bowler'
    default:
      return ''
  }
}

const trendIcon = (trend: PlayerProfileSummary['trend']): string => {
  switch (trend.label) {
    case 'Strong':
      return '▲'
    case 'Weak':
      return '▼'
    case 'Stable':
      return '→'
    case 'Insufficient Data':
      return '•'
    default:
      break
  }

  switch (trend.direction) {
    case 'up':
      return '↗'
    case 'down':
      return '↘'
    case 'flat':
      return '→'
    default:
      return '•'
  }
}

const snapshotStatsFor = (profile: PlayerProfileSummary) => {
  const stats = profile.headlineStats

  switch (profile.identity.role) {
    case 'bowler':
      return [
        { label: 'Matches', value: stats.matches },
        { label: 'Wickets', value: stats.wickets },
        { label: 'Economy', value: stats.economy },
        { label: 'Best Bowling', value: stats.bestBowling },
      ]
    case 'wicket_keeper':
      return [
        { label: 'Matches', value: stats.matches },
        { label: 'Runs', value: stats.runs },
        { label: 'Average', value: stats.battingAverage },
        { label: 'Keeper Dismissals', value: stats.keeperDismissals },
      ]
    case 'all_rounder':
      return [
        { label: 'Matches', value: stats.matches },
        { label: 'Runs', value: stats.runs },
        { label: 'Average', value: stats.battingAverage },
        { label: 'Wickets', value: stats.wickets },
        { label: 'Economy', value: stats.economy },
        { label: 'Best Score', value: stats.bestScore },
        { label: 'Best Bowling', value: stats.bestBowling },
      ]
    case 'batter':
    default:
      return [
        { label: 'Matches', value: stats.matches },
        { label: 'Runs', value: stats.runs },
        { label: 'Average', value: stats.battingAverage },
        { label: 'Best Score', value: stats.bestScore },
      ]
  }
}

const visibleSnapshotStatsFor = (profile: PlayerProfileSummary) => {
  return snapshotStatsFor(profile).filter((stat) => hasDisplayValue(stat.value))
}

const formatNullableNumber = (
  value: number | null,
  digits = 2,
): string => {
  return value === null ? '—' : value.toFixed(digits)
}

const formatNullablePercentage = (value: number | null): string => {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

const formatOversFromBalls = (balls: number): string => {
  const overs = Math.floor(balls / 6)
  const remainingBalls = balls % 6

  return remainingBalls === 0 ? String(overs) : `${overs}.${remainingBalls}`
}

const visiblePhaseGroupsFor = (profile: PlayerProfileSummary) => {
  const groups: Array<
    | {
        kind: 'batting'
        label: string
        phases: PlayerProfileBattingPhaseStat[]
      }
    | {
        kind: 'bowling'
        label: string
        phases: PlayerProfileBowlingPhaseStat[]
      }
  > = []

  if (
    ['batter', 'wicket_keeper', 'all_rounder'].includes(profile.identity.role ?? '') &&
    profile.phaseAnalysis.batting.length > 0
  ) {
    groups.push({
      kind: 'batting',
      label: 'Batting phases',
      phases: profile.phaseAnalysis.batting,
    })
  }

  if (
    ['bowler', 'all_rounder'].includes(profile.identity.role ?? '') &&
    profile.phaseAnalysis.bowling.length > 0
  ) {
    groups.push({
      kind: 'bowling',
      label: 'Bowling phases',
      phases: profile.phaseAnalysis.bowling,
    })
  }

  return groups
}

const profileDetailPillsFor = (profile: PlayerProfileSummary): string[] => {
  return [
    profile.identity.country,
    profile.identity.role ? formatRole(profile.identity.role) : null,
    profile.identity.age === null ? null : `${profile.identity.age} years`,
  ].filter((value): value is string => hasDisplayValue(value))
}

const recentPerformanceFor = (
  role: PlayerProfileRole | null,
  match: PlayerProfileRecentMatch,
): string => {
  const batting = match.runs === null ? '' : `${match.runs} runs`
  const bowling =
    match.wickets === null || match.bowlingRunsConceded === null
      ? ''
      : `${match.wickets}/${match.bowlingRunsConceded}`

  if (role === 'bowler') {
    return bowling
  }

  if (role === 'all_rounder') {
    return [batting, bowling].filter(Boolean).join(', ')
  }

  return match.runs === null ? '' : String(match.runs)
}

const formatMatchDate = (date: string): string => {
  const parsed = new Date(date)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

const PhaseAnalysis = ({ profile }: { profile: PlayerProfileSummary }) => {
  const groups = visiblePhaseGroupsFor(profile)

  if (groups.length === 0) {
    return null
  }

  return (
    <div className="phase-analysis">
      <div>
        <h3>Match Phase Analysis</h3>
        <p>Performance split by match phase</p>
      </div>
      {groups.map((group) => (
        <div className="phase-group" key={group.kind}>
          <p className="eyebrow">{group.label}</p>
          <div className="phase-grid">
            {group.phases.map((phase) => (
              <article
                className={`phase-card phase-${phase.phase.toLowerCase()}`}
                key={`${group.kind}-${phase.phase}`}
              >
                <h4>{phase.phase}</h4>
                {group.kind === 'bowling' ? (
                  (() => {
                    const bowlingPhase = phase as PlayerProfileBowlingPhaseStat

                    return (
                      <>
                        <strong>{bowlingPhase.wickets}</strong>
                        <span>wickets</span>
                        <div className="phase-stat-grid">
                          <span>Economy <b>{formatNullableNumber(bowlingPhase.economy)}</b></span>
                          <span>Dot % <b>{formatNullablePercentage(bowlingPhase.dotPercentage)}</b></span>
                          <span>Overs <b>{formatOversFromBalls(bowlingPhase.balls)}</b></span>
                          <span>Average <b>{formatNullableNumber(bowlingPhase.average)}</b></span>
                        </div>
                      </>
                    )
                  })()
                ) : (
                  (() => {
                    const battingPhase = phase as PlayerProfileBattingPhaseStat

                    return (
                      <>
                        <strong>{battingPhase.runs}</strong>
                        <span>runs</span>
                        <div className="phase-stat-grid">
                          <span>Strike Rate <b>{formatNullableNumber(battingPhase.strikeRate)}</b></span>
                          <span>Dot % <b>{formatNullablePercentage(battingPhase.dotPercentage)}</b></span>
                          <span>Balls <b>{battingPhase.balls}</b></span>
                          <span>Dismissals <b>{battingPhase.dismissals}</b></span>
                        </div>
                      </>
                    )
                  })()
                )}
              </article>
            ))}
          </div>
        </div>
      ))}
      {profile.phaseAnalysis.coverage.hasIncompleteCommentary ? (
        <p className="phase-note">
          Phase splits use available commentary data; some matches indicate additional commentary pages.
        </p>
      ) : null}
    </div>
  )
}

export const PlayerDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const selectedPlayer = (location.state as PlayerRouteState | null)?.player
  const { report, viewState, errorMessage, retry } = usePlayerInsightsViewModel()

  if (viewState === ViewState.Idle || viewState === ViewState.Loading) {
    return (
      <main className="app-shell">
        <StatusMessage
          title="Generating CricDNA report"
          message="Building deterministic evidence, applying guardrails, and validating the AI Scout response."
        />
      </main>
    )
  }

  if (viewState === ViewState.Error || !report) {
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

  const { profile, scout, presentation } = report
  const profileDetailPills = profileDetailPillsFor(profile)
  const dnaObservationGroups = scout
    ? visibleDnaObservationGroupsFor(profile.identity.role, scout.dnaObservations)
    : []

  return (
    <main className="app-shell details-page">
      <Link className="back-link" to="/">
        <span aria-hidden="true">&lt;</span>
        Back to players
      </Link>

      <header className="player-hero">
        <div>
          <h1>{selectedPlayer?.name ?? profile.identity.playerName ?? `Player ${id ?? ''}`}</h1>
          {profileDetailPills.length > 0 ? (
            <div className="meta-row" aria-label="Player details">
              {profileDetailPills.map((pill) => (
                <span key={pill}>{pill}</span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {scout ? (
        <section className="dna-hero-card">
          <div className="dna-score-panel">
            <p className="eyebrow">DNA Score</p>
            <ScoreCircle score={scout.dnaScore.score} />
          </div>
          <div>
            <div className="dna-presentation-labels" aria-label="DNA classification">
              {presentation.dnaTier ? (
                <span>{presentation.dnaTier.label}</span>
              ) : null}
              {presentation.roleArchetype ? (
                <strong>{presentation.roleArchetype.label}</strong>
              ) : null}
            </div>
            <p>{scout.dnaScore.explanation}</p>
            {presentation.roleArchetype ? (
              <p className="archetype-reason">
                {presentation.roleArchetype.reason}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {dnaObservationGroups.length > 0 ? (
        <section className="content-section dna-observations-section">
          <div className="section-title">
            <h2>DNA Observations</h2>
          </div>
          <div className="dna-observation-groups">
            {dnaObservationGroups.map((group) => (
              <article className="dna-observation-group" key={group.category}>
                <p className="eyebrow">{group.label}</p>
                <div className="dna-observation-list">
                  {group.observations.map((observation) => (
                    <div
                      className="dna-observation-card"
                      key={`${group.category}-${observation.title}`}
                    >
                      <h3>{observation.title}</h3>
                      <p>{observation.summary}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!profile.guardrails.eligible ? (
        <StatusMessage
          title="Insufficient match evidence"
          message={
            profile.guardrails.reasons[0] ||
            `At least ${profile.guardrails.minimumRequiredMatches} matches are required.`
          }
        />
      ) : null}

      <section className="trend-card">
        <div>
          <p className="eyebrow">Recent Trend</p>
          <h2>
            <span aria-hidden="true">{trendIcon(profile.trend)} </span>
            {profile.trend.label}
          </h2>
        </div>
        <span className="confidence-pill">
          Last {profile.trend.recentMatchCount}
        </span>
        <p>{profile.trend.reason}</p>
        <div className="recent-performance-table">
          <h3>Recent Matches &amp; Performance</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Performance</th>
                  <th>POTM</th>
                </tr>
              </thead>
              <tbody>
                {profile.recentMatches.slice(0, 3).map((match) => (
                  <tr key={match.matchId}>
                    <td>{formatMatchDate(match.date)}</td>
                    <td>{match.opponent.name}</td>
                    <td>{recentPerformanceFor(profile.identity.role, match)}</td>
                    <td>{match.playerOfMatch ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-title">
          <h2>Career Snapshot</h2>
        </div>
        <div className="stats-grid ratings-grid">
          {visibleSnapshotStatsFor(profile).map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={displayStatValue(stat.label, stat.value)}
            />
          ))}
        </div>
        <PhaseAnalysis profile={profile} />
      </section>

      {scout ? (
        <>
          <section className="profile-grid">
            <article className="insight-card">
              <p className="eyebrow">Strengths</p>
              <h2>What Stands Out</h2>
              <ul className="highlight-list">
                {scout.strengths.map((strength) => (
                  <li key={strength}>{strength}</li>
                ))}
              </ul>
            </article>

            <article className="insight-card">
              <p className="eyebrow">Development Areas</p>
              <h2>Growth Focus</h2>
              <ul className="highlight-list">
                {scout.developmentAreas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            </article>
          </section>

          <section className="summary-card">
            <h2>Analyst Summary</h2>
            <p>{scout.scoutingReport}</p>
          </section>

        </>
      ) : null}
    </main>
  )
}
