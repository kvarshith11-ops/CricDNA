import { StyleSheet, Text, View } from 'react-native'
import { colors } from './theme'

interface ScoreCircleProps {
  score: number
}

export const ScoreCircle = ({ score }: ScoreCircleProps) => {
  const normalizedScore = Math.min(Math.max(score, 0), 100)

  return (
    <View
      style={styles.circle}
      accessibilityLabel={`DNA score ${normalizedScore} out of 100`}
    >
      <Text style={styles.score}>{normalizedScore}</Text>
      <Text style={styles.maxScore}>/100</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  circle: {
    width: 142,
    height: 142,
    borderWidth: 12,
    borderColor: colors.green,
    borderRadius: 71,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  score: {
    color: colors.ink,
    fontFamily: 'Montserrat',
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 44,
  },
  maxScore: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '400',
  },
})
