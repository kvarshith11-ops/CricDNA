import {
  BattingStyleTraitCalculator,
  BowlingStyleTraitCalculator,
  FieldingStyleTraitCalculator,
} from './calculators/TraitCalculators'
import { TraitCategory, type TraitDefinition } from './types'

const version = '1.0.0'

export const traitDefinitions: readonly TraitDefinition[] = [
  {
    id: 'trait.batting_style',
    name: 'Batting Style',
    category: TraitCategory.Batting,
    dependencies: ['bat.intent', 'bat.consistency'],
    version,
    calculator: new BattingStyleTraitCalculator(),
  },
  {
    id: 'trait.bowling_style',
    name: 'Bowling Style',
    category: TraitCategory.Bowling,
    dependencies: ['bowl.control', 'bowl.wicket_threat', 'bowl.effectiveness'],
    version,
    calculator: new BowlingStyleTraitCalculator(),
  },
  {
    id: 'trait.fielding_style',
    name: 'Fielding Style',
    category: TraitCategory.Fielding,
    dependencies: ['field.impact', 'field.reliability', 'field.activity'],
    version,
    calculator: new FieldingStyleTraitCalculator(),
  },
]
