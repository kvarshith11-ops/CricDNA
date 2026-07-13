import { MetricLevel } from '../metrics'
import type { PlayerProfile, PlayerProfileRole } from './PlayerProfile'

export interface PlayerProfileValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

const supportedRoles: readonly PlayerProfileRole[] = [
  'batter',
  'bowler',
  'all_rounder',
  'wicket_keeper',
]

export const validatePlayerProfile = (
  profile: PlayerProfile,
): PlayerProfileValidationResult => {
  const errors: string[] = []

  if (!profile.identity.playerId) {
    errors.push('Player profile is missing playerId.')
  }

  if (
    profile.identity.role !== null &&
    !supportedRoles.includes(profile.identity.role)
  ) {
    errors.push(`Unsupported player role '${profile.identity.role}'.`)
  }

  const primitiveMetrics = Object.values(profile.primitiveMetrics)
  const compositeMetrics = Object.values(profile.compositeMetrics)
  const traits = Object.values(profile.traits)

  if (primitiveMetrics.length + compositeMetrics.length === 0) {
    errors.push('Player profile is missing metrics.')
  }

  if (traits.length === 0) {
    errors.push('Player profile is missing traits.')
  }

  errors.push(...duplicateErrors(primitiveMetrics.map((metric) => metric.metricId), 'metric'))
  errors.push(...duplicateErrors(compositeMetrics.map((metric) => metric.metricId), 'metric'))
  errors.push(...duplicateErrors(traits.map((trait) => trait.traitId), 'trait'))

  for (const metric of primitiveMetrics) {
    if (metric.level !== MetricLevel.Primitive) {
      errors.push(`Metric '${metric.metricId}' is not primitive.`)
    }
  }

  for (const metric of compositeMetrics) {
    if (metric.level !== MetricLevel.Composite) {
      errors.push(`Metric '${metric.metricId}' is not composite.`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

const duplicateErrors = (
  ids: readonly string[],
  label: 'metric' | 'trait',
): readonly string[] => {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id)
    }

    seen.add(id)
  }

  return [...duplicates].map((id) => `Duplicate ${label} '${id}'.`)
}
