import { MetricStatus, type MetricId } from '../metrics'
import { TraitStatus, type TraitId } from '../traits'
import type { PlayerProfile, PlayerProfileRole } from './PlayerProfile'

export interface PlayerDnaTier {
  readonly label: string
  readonly band: string
  readonly score: number
}

export interface PlayerRoleArchetype {
  readonly label: string
  readonly role: PlayerProfileRole | null
  readonly reason: string
  readonly sourceTraitIds: readonly TraitId[]
  readonly sourceMetricIds: readonly MetricId[]
}

export interface PlayerProfilePresentation {
  readonly dnaTier: PlayerDnaTier | null
  readonly roleArchetype: PlayerRoleArchetype | null
}

const HIGH = 70
const SOLID = 60
const BALANCED = 50

export const classifyDnaTier = (score: number): PlayerDnaTier => {
  if (score > 90) {
    return { label: 'CricDNA Elite', band: '> 90', score }
  }

  if (score >= 75) {
    return { label: 'Impact Prime', band: '75-90', score }
  }

  if (score >= 60) {
    return { label: 'Role Core', band: '60-74', score }
  }

  if (score >= 50) {
    return { label: 'Developing Spark', band: '50-59', score }
  }

  return { label: 'Emerging Profile', band: '< 50', score }
}

export const classifyRoleArchetype = (
  profile: PlayerProfile,
): PlayerRoleArchetype | null => {
  switch (profile.identity.role) {
    case 'batter':
      return classifyBatter(profile)
    case 'bowler':
      return classifyBowler(profile)
    case 'all_rounder':
      return classifyAllRounder(profile)
    case 'wicket_keeper':
      return classifyWicketKeeper(profile)
    default:
      return null
  }
}

export const buildPlayerProfilePresentation = (
  profile: PlayerProfile,
  dnaScore: number | null,
): PlayerProfilePresentation => ({
  dnaTier: dnaScore === null ? null : classifyDnaTier(dnaScore),
  roleArchetype: classifyRoleArchetype(profile),
})

const classifyBatter = (profile: PlayerProfile): PlayerRoleArchetype => {
  const intent = metricValue(profile, 'bat.intent')
  const boundaryIntent = metricValue(profile, 'bat.boundary_intent')
  const consistency = metricValue(profile, 'bat.consistency')
  const scoringConsistency = metricValue(profile, 'bat.scoring_consistency')
  const conversion = metricValue(profile, 'bat.conversion')
  const effectiveness = metricValue(profile, 'bat.effectiveness')
  const dismissalResilience = metricValue(profile, 'bat.dismissal_resilience')
  const sourceMetricIds = presentMetricIds(profile, [
    'bat.intent',
    'bat.boundary_intent',
    'bat.consistency',
    'bat.scoring_consistency',
    'bat.conversion',
    'bat.effectiveness',
    'bat.dismissal_resilience',
  ])
  const sourceTraitIds = presentTraitIds(profile, [
    'trait.batting_style',
    'trait.batting_intent',
    'trait.batting_boundary_style',
    'trait.batting_scoring_consistency',
  ])

  if (atLeast(intent, HIGH) && atLeast(boundaryIntent, HIGH)) {
    return archetype(
      'Power Hitter',
      profile.identity.role,
      'High scoring intent and boundary pressure point to a batter who can change the tempo quickly.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (atLeast(consistency, HIGH) && atLeast(scoringConsistency, HIGH)) {
    return archetype(
      'Consistency King',
      profile.identity.role,
      'Strong consistency and scoring-repeatability signals show a batter who regularly contributes across innings.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (atLeast(consistency, HIGH) && below(intent, SOLID)) {
    return archetype(
      'Anchor',
      profile.identity.role,
      'The batting profile leans toward stability and innings control rather than high-risk scoring intent.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (atLeast(effectiveness, BALANCED) || atLeast(conversion, BALANCED) || atLeast(dismissalResilience, BALANCED)) {
    return archetype(
      'Balanced Run Builder',
      profile.identity.role,
      'The available batting signals show a rounded contributor without one extreme scoring pattern dominating.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  return archetype(
    'Emerging Batter',
    profile.identity.role,
    'The batting evidence is still developing, so the profile is best treated as an emerging batting role.',
    sourceTraitIds,
    sourceMetricIds,
  )
}

const classifyBowler = (profile: PlayerProfile): PlayerRoleArchetype => {
  const control = metricValue(profile, 'bowl.control')
  const wicketThreat = metricValue(profile, 'bowl.wicket_threat')
  const effectiveness = metricValue(profile, 'bowl.effectiveness')
  const runControl = metricValue(profile, 'bowl.run_control')
  const discipline = metricValue(profile, 'bowl.discipline')
  const wicketEfficiency = metricValue(profile, 'bowl.wicket_efficiency')
  const phaseTrait = traitLabel(profile, 'trait.bowling_phase_usage')
  const sourceMetricIds = presentMetricIds(profile, [
    'bowl.control',
    'bowl.wicket_threat',
    'bowl.effectiveness',
    'bowl.run_control',
    'bowl.discipline',
    'bowl.wicket_efficiency',
  ])
  const sourceTraitIds = presentTraitIds(profile, [
    'trait.bowling_style',
    'trait.bowling_control',
    'trait.bowling_wicket_threat',
    'trait.bowling_effectiveness',
    'trait.bowling_phase_usage',
  ])

  if (atLeast(control, HIGH) && atLeast(wicketThreat, HIGH) && atLeast(effectiveness, HIGH)) {
    return archetype(
      'Complete Bowler',
      profile.identity.role,
      'Control, wicket threat, and effectiveness are all strong, giving this bowler a complete role profile.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (phaseTrait === 'Death Overs Specialist') {
    return archetype(
      'Death Overs Specialist',
      profile.identity.role,
      'Ball-by-ball phase evidence shows this bowler is used heavily in the closing overs.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (phaseTrait === 'Powerplay Specialist') {
    return archetype(
      'Powerplay Enforcer',
      profile.identity.role,
      'Ball-by-ball phase evidence shows a strong new-ball usage pattern in the powerplay.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (atLeast(wicketThreat, HIGH) || atLeast(wicketEfficiency, HIGH)) {
    return archetype(
      'Strike Weapon',
      profile.identity.role,
      'The bowling profile is led by wicket-taking threat and efficiency rather than containment alone.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (atLeast(control, HIGH) || atLeast(runControl, HIGH) || atLeast(discipline, HIGH)) {
    return archetype(
      'Control Artist',
      profile.identity.role,
      'Run control and discipline are the strongest bowling signals in the current profile.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  return archetype(
    'Emerging Bowler',
    profile.identity.role,
    'The bowling evidence is still developing, with no dominant control or wicket-taking signal yet.',
    sourceTraitIds,
    sourceMetricIds,
  )
}

const classifyAllRounder = (profile: PlayerProfile): PlayerRoleArchetype => {
  const battingEffectiveness = metricValue(profile, 'bat.effectiveness')
  const bowlingEffectiveness = metricValue(profile, 'bowl.effectiveness')
  const sourceMetricIds = presentMetricIds(profile, [
    'bat.effectiveness',
    'bat.conversion',
    'bat.dismissal_resilience',
    'bowl.effectiveness',
    'bowl.wicket_efficiency',
    'bowl.run_control',
    'bowl.discipline',
  ])
  const sourceTraitIds = presentTraitIds(profile, [
    'trait.batting_style',
    'trait.bowling_style',
    'trait.batting_intent',
    'trait.bowling_wicket_threat',
    'trait.bowling_control',
  ])

  if (atLeast(battingEffectiveness, SOLID) && atLeast(bowlingEffectiveness, SOLID)) {
    return archetype(
      'Two-Way Impact Player',
      profile.identity.role,
      'Both batting and bowling effectiveness are strong enough to support a genuine two-discipline role.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (dominates(battingEffectiveness, bowlingEffectiveness, SOLID)) {
    return archetype(
      'Batting All-Rounder',
      profile.identity.role,
      'The all-round profile is currently led by batting value, with bowling as the secondary contribution.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (dominates(bowlingEffectiveness, battingEffectiveness, SOLID)) {
    return archetype(
      'Bowling All-Rounder',
      profile.identity.role,
      'The all-round profile is currently led by bowling value, with batting as the secondary contribution.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  return archetype(
    'Utility All-Rounder',
    profile.identity.role,
    'The available evidence shows multi-skill involvement without one discipline clearly separating yet.',
    sourceTraitIds,
    sourceMetricIds,
  )
}

const classifyWicketKeeper = (profile: PlayerProfile): PlayerRoleArchetype => {
  const battingEffectiveness = metricValue(profile, 'bat.effectiveness')
  const fieldImpact = metricValue(profile, 'field.impact')
  const reliability = metricValue(profile, 'field.reliability')
  const dismissalInvolvement = metricValue(profile, 'field.dismissal_involvement')
  const keepingTrait = traitLabel(profile, 'trait.keeping_dismissal_involvement')
  const fieldingStyle = traitLabel(profile, 'trait.fielding_style')
  const sourceMetricIds = presentMetricIds(profile, [
    'bat.effectiveness',
    'bat.conversion',
    'field.impact',
    'field.reliability',
    'field.activity',
    'field.dismissal_involvement',
  ])
  const sourceTraitIds = presentTraitIds(profile, [
    'trait.batting_style',
    'trait.fielding_style',
    'trait.keeping_dismissal_involvement',
  ])

  if (atLeast(battingEffectiveness, SOLID) && (atLeast(fieldImpact, BALANCED) || atLeast(reliability, BALANCED))) {
    return archetype(
      'Keeper-Batter',
      profile.identity.role,
      'The profile combines batting value with enough keeping involvement to support a dual keeper-batter role.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (
    atLeast(reliability, HIGH) ||
    atLeast(dismissalInvolvement, HIGH) ||
    fieldingStyle === 'Safe Hands' ||
    keepingTrait === 'High Dismissal Involvement Keeper'
  ) {
    return archetype(
      'Safe Hands',
      profile.identity.role,
      'Keeping and fielding reliability are the clearest signals in this wicketkeeper profile.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  if (atLeast(battingEffectiveness, SOLID)) {
    return archetype(
      'Batting Keeper',
      profile.identity.role,
      'Batting contribution is currently the strongest part of the wicketkeeper profile.',
      sourceTraitIds,
      sourceMetricIds,
    )
  }

  return archetype(
    'Developing Keeper',
    profile.identity.role,
    'The keeping and batting evidence is still developing, so the role profile remains early-stage.',
    sourceTraitIds,
    sourceMetricIds,
  )
}

const metricValue = (profile: PlayerProfile, metricId: MetricId): number | null => {
  const metric = profile.compositeMetrics[metricId] ?? profile.primitiveMetrics[metricId]

  return metric?.status === MetricStatus.Success && typeof metric.value === 'number'
    ? metric.value
    : null
}

const traitLabel = (profile: PlayerProfile, traitId: TraitId): string | null => {
  const trait = profile.traits[traitId]

  return trait?.status === TraitStatus.Success ? trait.classification : null
}

const presentMetricIds = (
  profile: PlayerProfile,
  metricIds: readonly MetricId[],
): readonly MetricId[] => {
  return metricIds.filter((metricId) => metricValue(profile, metricId) !== null)
}

const presentTraitIds = (
  profile: PlayerProfile,
  traitIds: readonly TraitId[],
): readonly TraitId[] => {
  return traitIds.filter((traitId) => traitLabel(profile, traitId) !== null)
}

const archetype = (
  label: string,
  role: PlayerProfileRole | null,
  reason: string,
  sourceTraitIds: readonly TraitId[],
  sourceMetricIds: readonly MetricId[],
): PlayerRoleArchetype => ({
  label,
  role,
  reason,
  sourceTraitIds,
  sourceMetricIds,
})

const atLeast = (value: number | null, threshold: number): boolean => {
  return value !== null && value >= threshold
}

const below = (value: number | null, threshold: number): boolean => {
  return value !== null && value < threshold
}

const dominates = (
  primary: number | null,
  secondary: number | null,
  minimum: number,
): boolean => {
  return primary !== null && primary >= minimum && (secondary === null || primary >= secondary + 10)
}
