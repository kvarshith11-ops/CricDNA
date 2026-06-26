import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { colors, spacing } from './theme'

interface StatCardProps {
  label: string
  value: string | number
  style?: StyleProp<ViewStyle>
}

export const StatCard = ({ label, value, style }: StatCardProps) => {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    minHeight: 104,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.mutedCard,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
})
