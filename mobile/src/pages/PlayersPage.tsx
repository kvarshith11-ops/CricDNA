import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { PlayerCard } from '../components/PlayerCard'
import { SearchInput } from '../components/SearchInput'
import { StatusMessage } from '../components/StatusMessage'
import { colors, spacing } from '../components/theme'
import type { RootStackParamList } from '../types/navigation'
import type { Player } from '../types/player'
import { ViewState } from '../types/viewState'
import { usePlayersViewModel } from '../viewmodels/usePlayersViewModel'

type PlayersPageProps = NativeStackScreenProps<RootStackParamList, 'Players'>

export const PlayersPage = ({ navigation }: PlayersPageProps) => {
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
    navigation.navigate('PlayerDetails', { player })
  }

  const renderContent = () => {
    if (viewState === ViewState.Idle || viewState === ViewState.Loading) {
      return (
        <StatusMessage
          title="Loading players"
          message="Preparing the player directory."
        />
      )
    }

    if (viewState === ViewState.Error) {
      return (
        <StatusMessage
          title="Could not load players"
          message={errorMessage || 'Check your connection, then try again.'}
          actionLabel="Retry"
          onAction={() => void retry()}
        />
      )
    }

    if (viewState === ViewState.Empty) {
      return (
        <StatusMessage
          title={searchTerm ? 'No matching players' : 'No players found'}
          message={
            searchTerm
              ? 'Try a different player name.'
              : 'The player directory is empty.'
          }
        />
      )
    }

    return (
      <FlatList
        data={players}
        keyExtractor={(player) => player.id}
        renderItem={({ item }) => (
          <PlayerCard player={item} onSelect={handlePlayerSelect} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        scrollEnabled={false}
      />
    )
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={[{ key: 'content' }]}
      renderItem={() => (
        <>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>CricDNA Player Directory</Text>
            <Text style={styles.title}>Choose a player from the evidence set</Text>
            <Text style={styles.copy}>
              Search the local PlayCricket evidence set by player, country, or
              role. Every player shown has local match evidence; AI analysis
              appears when the guardrail sample size is met.
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{totalPlayers}</Text>
                <Text style={styles.statLabel}>Available players</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{filteredPlayers}</Text>
                <Text style={styles.statLabel}>Current results</Text>
              </View>
            </View>
            <SearchInput value={searchTerm} onChange={setSearchTerm} />
          </View>
          {viewState === ViewState.Loaded ? (
            <View style={styles.toolbar}>
              <Text style={styles.toolbarTitle}>{filteredPlayers} players available</Text>
              <Text style={styles.toolbarCopy}>
                Try India, Australia, Bowler, Wicket keeper, or a player name.
              </Text>
            </View>
          ) : null}
          {renderContent()}
        </>
      )}
    />
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: spacing.lg,
    backgroundColor: colors.card,
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
  copy: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statPill: {
    minWidth: 130,
    gap: 2,
    borderWidth: 1,
    borderColor: '#C9DDCF',
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: '#E8F3EA',
  },
  statValue: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '400',
  },
  toolbar: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#C9DDCF',
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: '#E8F3EA',
  },
  toolbarTitle: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 18,
    fontWeight: '700',
  },
  toolbarCopy: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  separator: {
    height: spacing.md,
  },
})
