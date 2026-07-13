import type {
  AIDNAObservation,
  AIDNAObservationCategory,
  PlayerProfileRole,
} from '../types/aiScout'

export interface DnaObservationDisplay {
  readonly title: string
  readonly summary: string
}

export interface DnaObservationGroupDisplay {
  readonly category: AIDNAObservationCategory
  readonly label: string
  readonly observations: readonly DnaObservationDisplay[]
}

export const visibleDnaObservationGroupsFor = (
  role: PlayerProfileRole | null,
  observations: Partial<Record<AIDNAObservationCategory, AIDNAObservation[]>>,
): readonly DnaObservationGroupDisplay[] => {
  return observationCategoriesForRole(role)
    .map((category) => ({
      category,
      label: observationGroupLabel(category),
      observations: (observations[category] ?? [])
        .filter((observation) => observation.category === category)
        .map(({ title, summary }) => ({
          title,
          summary,
        })),
    }))
    .filter((group) => group.observations.length > 0)
}

const observationCategoriesForRole = (
  role: PlayerProfileRole | null,
): readonly AIDNAObservationCategory[] => {
  switch (role) {
    case 'batter':
      return ['batting']
    case 'bowler':
      return ['bowling']
    case 'all_rounder':
      return ['batting', 'bowling']
    case 'wicket_keeper':
      return ['batting', 'fielding']
    default:
      return ['batting', 'bowling', 'fielding']
  }
}

const observationGroupLabel = (category: AIDNAObservationCategory): string => {
  switch (category) {
    case 'batting':
      return 'Batting'
    case 'bowling':
      return 'Bowling'
    case 'fielding':
      return 'Fielding / Keeping'
    case 'overall':
      return 'Overall'
  }
}
