import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ScoreCircle } from '../components/ScoreCircle'
import { StatCard } from '../components/StatCard'
import { StatusMessage } from '../components/StatusMessage'
import { colors, spacing } from '../components/theme'
import type {
  AIDNAObservation,
  AIDNAObservationCategory,
  PlayerProfileBattingPhaseStat,
  PlayerProfileBowlingPhaseStat,
  PlayerProfileRecentMatch,
  PlayerProfileRole,
  PlayerProfileSummary,
} from '../types/aiScout'
import type { RootStackParamList } from '../types/navigation'
import { ViewState } from '../types/viewState'
import { usePlayerInsightsViewModel } from '../viewmodels/usePlayerInsightsViewModel'

type PlayerDetailsPageProps = NativeStackScreenProps<
  RootStackParamList,
  'PlayerDetails'
>

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

const observationCategoriesForRole = (
  role: PlayerProfileRole | null,
): readonly AIDNAObservationCategory[] => {
  switch (role) {
    case 'batter':
      return ['batting']
    case 'bowler':
      return ['bowling']
    case 'all_rounder':
      return ['batting', 'bowling']
    case 'wicket_keeper':
      return ['batting', 'fielding']
    default:
      return ['batting', 'bowling', 'fielding']
  }
}

const observationGroupLabel = (category: AIDNAObservationCategory): string => {
  switch (category) {
    case 'batting':
      return 'Batting'
    case 'bowling':
      return 'Bowling'
    case 'fielding':
      return 'Fielding / Keeping'
    case 'overall':
      return 'Overall'
  }
}

const observationGroupsFor = (
  role: PlayerProfileRole | null,
  observations: Partial<Record<AIDNAObservationCategory, AIDNAObservation[]>>,
) => {
  return observationCategoriesForRole(role)
    .map((category) => ({
      category,
      label: observationGroupLabel(category),
      observations: observations[category]?.filter(
        (observation) => observation.category === category,
      ) ?? [],
    }))
    .filter((group) => group.observations.length > 0)
}

const PhaseAnalysis = ({ profile }: { profile: PlayerProfileSummary }) => {
  const groups = visiblePhaseGroupsFor(profile)

  if (groups.length === 0) {
    return null
  }

  return (
    <View style={styles.phaseAnalysis}>
      <View>
        <Text style={styles.phaseTitle}>Match Phase Analysis</Text>
        <Text style={styles.bodyText}>Performance split by match phase</Text>
      </View>
      {groups.map((group) => (
        <View style={styles.phaseGroup} key={group.kind}>
          <Text style={styles.eyebrow}>{group.label}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.phaseRow}>
              {group.phases.map((phase) => (
                <View style={styles.phaseCard} key={`${group.kind}-${phase.phase}`}>
                  <Text
                    style={[
                      styles.phaseName,
                      phase.phase === 'Middle' ? styles.phaseMiddle : null,
                      phase.phase === 'Death' ? styles.phaseDeath : null,
                    ]}
                  >
                    {phase.phase}
                  </Text>
                  {group.kind === 'bowling' ? (
                    (() => {
                      const bowlingPhase = phase as PlayerProfileBowlingPhaseStat

                      return (
                        <>
                          <Text style={styles.phasePrimary}>{bowlingPhase.wickets}</Text>
                          <Text style={styles.bodyText}>wickets</Text>
                          <View style={styles.phaseStatGrid}>
                            <Text style={styles.phaseStat}>Economy{'\n'}<Text style={styles.phaseStatValue}>{formatNullableNumber(bowlingPhase.economy)}</Text></Text>
                            <Text style={styles.phaseStat}>Dot %{'\n'}<Text style={styles.phaseStatValue}>{formatNullablePercentage(bowlingPhase.dotPercentage)}</Text></Text>
                            <Text style={styles.phaseStat}>Overs{'\n'}<Text style={styles.phaseStatValue}>{formatOversFromBalls(bowlingPhase.balls)}</Text></Text>
                            <Text style={styles.phaseStat}>Average{'\n'}<Text style={styles.phaseStatValue}>{formatNullableNumber(bowlingPhase.average)}</Text></Text>
                          </View>
                        </>
                      )
                    })()
                  ) : (
                    (() => {
                      const battingPhase = phase as PlayerProfileBattingPhaseStat

                      return (
                        <>
                          <Text style={styles.phasePrimary}>{battingPhase.runs}</Text>
                          <Text style={styles.bodyText}>runs</Text>
                          <View style={styles.phaseStatGrid}>
                            <Text style={styles.phaseStat}>Strike Rate{'\n'}<Text style={styles.phaseStatValue}>{formatNullableNumber(battingPhase.strikeRate)}</Text></Text>
                            <Text style={styles.phaseStat}>Dot %{'\n'}<Text style={styles.phaseStatValue}>{formatNullablePercentage(battingPhase.dotPercentage)}</Text></Text>
                            <Text style={styles.phaseStat}>Balls{'\n'}<Text style={styles.phaseStatValue}>{battingPhase.balls}</Text></Text>
                            <Text style={styles.phaseStat}>Dismissals{'\n'}<Text style={styles.phaseStatValue}>{battingPhase.dismissals}</Text></Text>
                          </View>
                        </>
                      )
                    })()
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}
      {profile.phaseAnalysis.coverage.hasIncompleteCommentary ? (
        <Text style={styles.bodyText}>
          Phase splits use available commentary data; some matches indicate additional commentary pages.
        </Text>
      ) : null}
    </View>
  )
}

export const PlayerDetailsPage = ({ route }: PlayerDetailsPageProps) => {
  const selectedPlayer = route.params.player
  const { report, viewState, errorMessage, retry } =
    usePlayerInsightsViewModel(selectedPlayer)

  if (viewState === ViewState.Idle || viewState === ViewState.Loading) {
    return (
      <View style={styles.centeredScreen}>
        <StatusMessage
          title="Generating CricDNA report"
          message="Building deterministic evidence, applying guardrails, and validating the AI Scout response."
        />
      </View>
    )
  }

  if (viewState === ViewState.Error || !report) {
    return (
      <View style={styles.centeredScreen}>
        <StatusMessage
          title="Could not generate CricDNA report"
          message={
            errorMessage ||
            'The AI Scout response could not be generated or validated.'
          }
          actionLabel="Retry"
          onAction={() => void retry()}
        />
      </View>
    )
  }

  const { profile, scout, presentation } = report
  const profileDetailPills = profileDetailPillsFor(profile)
  const dnaObservationGroups = scout
    ? observationGroupsFor(profile.identity.role, scout.dnaObservations)
    : []

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {profileDetailPills.length > 0 ? (
        <View style={styles.playerHeader}>
          <View style={styles.metaRow}>
            {profileDetailPills.map((pill) => (
              <Text style={styles.metaPill} key={pill}>
                {pill}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {scout ? (
        <View style={styles.dnaHeroCard}>
          <View style={styles.dnaScorePanel}>
            <Text style={styles.eyebrow}>DNA Score</Text>
            <ScoreCircle score={scout.dnaScore.score} />
          </View>
          <View style={styles.cardCopy}>
            <View style={styles.dnaPresentationLabels}>
              {presentation.dnaTier ? (
                <Text style={styles.dnaTierLabel}>
                  {presentation.dnaTier.label}
                </Text>
              ) : null}
              {presentation.roleArchetype ? (
                <Text style={styles.archetypeLabel}>
                  {presentation.roleArchetype.label}
                </Text>
              ) : null}
            </View>
            <Text style={styles.bodyText}>{scout.dnaScore.explanation}</Text>
            {presentation.roleArchetype ? (
              <Text style={styles.archetypeReason}>
                {presentation.roleArchetype.reason}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {dnaObservationGroups.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DNA Observations</Text>
          <View style={styles.observationGroups}>
            {dnaObservationGroups.map((group) => (
              <View style={styles.observationGroup} key={group.category}>
                <Text style={styles.eyebrow}>{group.label}</Text>
                {group.observations.map((observation) => (
                  <View
                    style={styles.observationCard}
                    key={`${group.category}-${observation.title}`}
                  >
                    <Text style={styles.observationTitle}>
                      {observation.title}
                    </Text>
                    <Text style={styles.bodyText}>{observation.summary}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
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

      <View style={[styles.section, styles.trendCard]}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.eyebrow}>Recent Trend</Text>
            <Text style={styles.sectionTitle}>
              {trendIcon(profile.trend)} {profile.trend.label}
            </Text>
          </View>
          <Text style={styles.metaPill}>Last {profile.trend.recentMatchCount}</Text>
        </View>
        <Text style={styles.bodyText}>{profile.trend.reason}</Text>
        <Text style={styles.tableTitle}>Recent Matches & Performance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.recentTable}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeadCell}>Date</Text>
              <Text style={styles.tableHeadCell}>Opponent</Text>
              <Text style={styles.tableHeadCell}>Performance</Text>
              <Text style={styles.tableHeadCell}>POTM</Text>
            </View>
            {profile.recentMatches.slice(0, 3).map((match) => (
              <View style={styles.tableRow} key={match.matchId}>
                <Text style={styles.tableCell}>{formatMatchDate(match.date)}</Text>
                <Text style={styles.tableCell}>{match.opponent.name}</Text>
                <Text style={styles.tableCell}>
                  {recentPerformanceFor(profile.identity.role, match)}
                </Text>
                <Text style={styles.tableCell}>
                  {match.playerOfMatch ? 'Yes' : 'No'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Career Snapshot</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.statsRow}>
            {visibleSnapshotStatsFor(profile).map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={displayStatValue(stat.label, stat.value)}
                style={styles.statCardFixed}
              />
            ))}
          </View>
        </ScrollView>
        <PhaseAnalysis profile={profile} />
      </View>

      {scout ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Strengths</Text>
            <View style={styles.highlightList}>
              {scout.strengths.map((strength) => (
                <View style={styles.highlightItem} key={strength}>
                  <View style={styles.bullet} />
                  <Text style={styles.highlightText}>{strength}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Development Areas</Text>
            <View style={styles.highlightList}>
              {scout.developmentAreas.map((area) => (
                <View style={styles.highlightItem} key={area}>
                  <View style={styles.bullet} />
                  <Text style={styles.highlightText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analyst Summary</Text>
            <Text style={styles.bodyText}>{scout.scoutingReport}</Text>
          </View>

        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredScreen: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  playerHeader: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: spacing.lg,
    backgroundColor: colors.card,
  },
  dnaHeroCard: {
    gap: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: spacing.lg,
    backgroundColor: colors.card,
  },
  dnaScorePanel: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: spacing.lg,
    backgroundColor: colors.card,
  },
  trendCard: {
    borderLeftWidth: 5,
    borderLeftColor: colors.amber,
  },
  eyebrow: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 38,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
    textDecorationLine: 'underline',
  },
  bodyText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  cardCopy: {
    width: '100%',
    gap: spacing.sm,
  },
  dnaPresentationLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dnaTierLabel: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.card,
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: colors.green,
  },
  archetypeLabel: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.greenDark,
    fontFamily: 'Montserrat',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: '#E8F3EA',
  },
  archetypeReason: {
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    paddingLeft: spacing.sm,
    color: colors.muted,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaPill: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C9DDCF',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.greenDark,
    fontSize: 13,
    fontWeight: '400',
    backgroundColor: '#E8F3EA',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCardFixed: {
    width: 130,
    minHeight: 90,
  },
  profileItem: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  profileMetric: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: '700',
  },
  highlightList: {
    gap: spacing.sm,
  },
  observationGroups: {
    gap: spacing.md,
  },
  observationGroup: {
    gap: spacing.sm,
  },
  observationCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.mutedCard,
  },
  observationTitle: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 18,
    fontWeight: '700',
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  highlightText: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  tableTitle: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  recentTable: {
    minWidth: 620,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableHeader: {
    backgroundColor: colors.mutedCard,
  },
  tableHeadCell: {
    width: 155,
    padding: spacing.sm,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  tableCell: {
    width: 155,
    padding: spacing.sm,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '400',
  },
  phaseAnalysis: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  phaseTitle: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 18,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  phaseGroup: {
    gap: spacing.sm,
  },
  phaseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  phaseCard: {
    width: 245,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  phaseName: {
    color: colors.blue,
    fontFamily: 'Montserrat',
    fontSize: 18,
    fontWeight: '700',
  },
  phaseMiddle: {
    color: colors.green,
  },
  phaseDeath: {
    color: '#E43F45',
  },
  phasePrimary: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
  phaseStatGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  phaseStat: {
    width: '48%',
    overflow: 'hidden',
    borderRadius: 6,
    padding: spacing.sm,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    backgroundColor: colors.mutedCard,
  },
  phaseStatValue: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontWeight: '700',
  },
  breakdownList: {
    gap: spacing.md,
  },
  breakdownRow: {
    gap: spacing.sm,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  breakdownMetric: {
    flex: 1,
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 15,
    fontWeight: '700',
  },
  breakdownValue: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  progressTrack: {
    height: 12,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#DDE6DF',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.green,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
})
