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
            <Text style={styles.eyebrow}>Player Insights</Text>
            <Text style={styles.title}>Explore cricket player profiles</Text>
            <Text style={styles.copy}>
              Search player data, then open a reusable insights prototype powered
              by local mock analytics.
            </Text>
            <SearchInput value={searchTerm} onChange={setSearchTerm} />
          </View>
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
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  separator: {
    height: spacing.md,
  },
})
