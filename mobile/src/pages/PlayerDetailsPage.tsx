import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ScoreCircle } from '../components/ScoreCircle'
import { StatCard } from '../components/StatCard'
import { StatusMessage } from '../components/StatusMessage'
import { colors, spacing } from '../components/theme'
import type { RootStackParamList } from '../types/navigation'
import { ViewState } from '../types/viewState'
import { usePlayerInsightsViewModel } from '../viewmodels/usePlayerInsightsViewModel'

type PlayerDetailsPageProps = NativeStackScreenProps<
  RootStackParamList,
  'PlayerDetails'
>

export const PlayerDetailsPage = ({ route }: PlayerDetailsPageProps) => {
  const { insights, recentMatches, viewState, errorMessage } =
    usePlayerInsightsViewModel(route.params.player)

  if (viewState === ViewState.Error) {
    return (
      <View style={styles.centeredScreen}>
        <StatusMessage
          title="Could not load insights"
          message={errorMessage || 'The local insights mock is unavailable.'}
        />
      </View>
    )
  }

  const headlineStats = [
    { label: 'Matches', value: insights.headlineStats.matches.toLocaleString() },
    { label: 'Runs', value: insights.headlineStats.runs.toLocaleString() },
    { label: 'Average', value: insights.headlineStats.battingAverage.toFixed(2) },
    { label: 'Strike Rate', value: insights.headlineStats.strikeRate.toFixed(2) },
    { label: 'Best Figures', value: insights.headlineStats.bestFigure },
  ]

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.playerHeader}>
        <View>
          <Text style={styles.title}>{insights.identity.name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaPill}>{insights.identity.country}</Text>
          <Text style={styles.metaPill}>{insights.identity.role}</Text>
          <Text style={styles.metaPill}>{insights.identity.age} years</Text>
          <Text style={styles.metaPill}>{insights.meta.format}</Text>
        </View>
      </View>

      <View style={styles.dnaHeroCard}>
        <ScoreCircle score={insights.cricketDNA.score} />
        <View style={styles.cardCopy}>
          <Text style={styles.sectionTitle}>DNA Score</Text>
          <View style={styles.tagRow}>
            <Text style={[styles.tag, styles.blueTag]}>
              {insights.cricketDNA.tier}
            </Text>
            <Text style={styles.tag}>{insights.cricketDNA.archetype}</Text>
          </View>
          <Text style={styles.bodyText}>{insights.cricketDNA.explanation}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Career Snapshot</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.statsRow}>
            {headlineStats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                style={styles.statCardFixed}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.eyebrow}>DNA Breakdown</Text>
        <View style={styles.breakdownList}>
          {insights.cricketDNA.breakdown.map((item) => (
            <View style={styles.breakdownRow} key={item.metric}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownMetric}>{item.metric}</Text>
                <Text style={styles.breakdownValue}>
                  {item.contribution}% contribution
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${item.contribution}%` },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.section, styles.trendCard]}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.eyebrow}>Trend Card</Text>
            <Text style={styles.sectionTitle}>{insights.trend.label}</Text>
          </View>
          <Text style={styles.metaPill}>{insights.trend.confidence}</Text>
        </View>
        <Text style={styles.bodyText}>{insights.trend.reason}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analyst Summary</Text>
        <Text style={styles.bodyText}>{insights.summary.note}</Text>
        <View style={styles.highlightList}>
          {insights.summary.highlights.map((highlight) => (
            <View style={styles.highlightItem} key={highlight}>
              <View style={styles.bullet} />
              <Text style={styles.highlightText}>{highlight}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strengths</Text>
        {insights.profile.strengths.map((strength) => (
          <View style={styles.profileItem} key={strength.metric}>
            <Text style={styles.profileMetric}>{strength.metric}</Text>
            <Text style={styles.bodyText}>{strength.reason}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weaknesses</Text>
        {insights.profile.weaknesses.map((weakness) => (
          <View style={styles.profileItem} key={weakness.metric}>
            <Text style={styles.profileMetric}>{weakness.metric}</Text>
            <Text style={styles.bodyText}>{weakness.reason}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Form</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableHeadCell}>Date</Text>
              <Text style={styles.tableHeadCell}>Opponent</Text>
              <Text style={styles.tableHeadCell}>Figures</Text>
              <Text style={styles.tableHeadCell}>SR</Text>
              <Text style={styles.tableHeadCell}>Result</Text>
              <Text style={styles.tableHeadCell}>POM</Text>
            </View>
            {recentMatches.map((match) => (
              <View style={styles.tableRow} key={`${match.date}-${match.opponent}`}>
                <Text style={styles.tableCell}>{match.displayDate}</Text>
                <Text style={styles.tableCell}>{match.opponent}</Text>
                <Text style={styles.tableCell}>{match.performance}</Text>
                <Text style={styles.tableCell}>{match.strikeRate.toFixed(1)}</Text>
                <Text style={styles.tableCell}>{match.result}</Text>
                <Text style={styles.tableCell}>
                  {match.playerOfMatch ? 'Yes' : 'No'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
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
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
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
    fontWeight: '800',
    backgroundColor: '#E8F3EA',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCardFixed: {
    width: 120,
    minHeight: 90,
  },
  tag: {
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.card,
    fontSize: 13,
    fontWeight: '900',
    backgroundColor: colors.green,
  },
  blueTag: {
    backgroundColor: colors.blue,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
    fontSize: 15,
    fontWeight: '900',
  },
  breakdownValue: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
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
  highlightList: {
    gap: spacing.sm,
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
    fontWeight: '800',
  },
  profileItem: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  profileMetric: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  table: {
    minWidth: 690,
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
    width: 115,
    padding: spacing.sm,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tableCell: {
    width: 115,
    padding: spacing.sm,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
})
