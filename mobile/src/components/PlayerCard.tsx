import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Player } from '../types/player'
import { colors, spacing } from './theme'

interface PlayerCardProps {
  player: Player
  onSelect: (player: Player) => void
}

export const PlayerCard = ({ player, onSelect }: PlayerCardProps) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.cardPressed : undefined,
      ]}
      onPress={() => onSelect(player)}
      accessibilityRole="button"
      accessibilityLabel={`View insights for ${player.name}`}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{player.name.slice(0, 1)}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.country}>{player.country || 'Country unavailable'}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  cardPressed: {
    borderColor: colors.green,
    transform: [{ scale: 0.99 }],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
  },
  avatarText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  copy: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  country: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 14,
  },
})
