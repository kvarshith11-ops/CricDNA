import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from './theme'

interface StatusMessageProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export const StatusMessage = ({
  title,
  message,
  actionLabel,
  onAction,
}: StatusMessageProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: spacing.lg,
    backgroundColor: colors.card,
  },
  title: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 22,
    fontWeight: '700',
  },
  message: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '400',
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.green,
  },
  buttonText: {
    color: colors.card,
    fontWeight: '800',
  },
})
