import { StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, spacing } from './theme'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

export const SearchInput = ({ value, onChange }: SearchInputProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Search players</Text>
      <TextInput
        value={value}
        placeholder="Search by player name"
        placeholderTextColor={colors.muted}
        onChangeText={onChange}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    color: colors.greenDark,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    backgroundColor: colors.card,
    fontSize: 16,
  },
})
