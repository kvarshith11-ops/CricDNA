import { PlaceholderCompositeMetricCalculator } from '../calculators/PlaceholderCompositeMetricCalculator'
import {
  BatConsistencyCalculator,
  BatScoringConsistencyCalculator,
} from '../calculators/batting/BattingConsistencyCompositeCalculators'
import {
  BatBoundaryIntentCalculator,
  BatIntentCalculator,
} from '../calculators/batting/BattingIntentCompositeCalculators'
import {
  BowlControlCalculator,
  BowlEffectivenessCalculator,
  BowlWicketThreatCalculator,
} from '../calculators/bowling/BowlingCompositeCalculators'
import {
  MetricCategory,
  MetricLevel,
  type MetricDefinition,
  type MetricId,
} from './types'

const version = '1.0.0'

const placeholderComposite = (
  id: MetricId,
  name: string,
  category: MetricCategory,
  dependencies: readonly MetricId[],
  value: number,
): MetricDefinition => ({
  id,
  name,
  category,
  level: MetricLevel.Composite,
  dependencies,
  version,
  calculator: new PlaceholderCompositeMetricCalculator({
    metricId: id,
    name,
    category,
    version,
    dependencies,
    value,
    unit: 'stub',
  }),
})

export const compositeMetricDefinitions: readonly MetricDefinition[] = [
  {
    id: 'bat.intent',
    name: 'Batting Intent',
    category: MetricCategory.Batting,
    level: MetricLevel.Composite,
    dependencies: ['bat.strike_rate', 'bat.boundary_percentage', 'bat.runs_per_ball'],
    version,
    calculator: new BatIntentCalculator(),
  },
  {
    id: 'bat.boundary_intent',
    name: 'Boundary Intent',
    category: MetricCategory.Batting,
    level: MetricLevel.Composite,
    dependencies: ['bat.boundary_percentage'],
    version,
    calculator: new BatBoundaryIntentCalculator(),
  },
  {
    id: 'bat.consistency',
    name: 'Batting Consistency',
    category: MetricCategory.Batting,
    level: MetricLevel.Composite,
    dependencies: [
      'bat.innings',
      'bat.average',
      'bat.fifties',
      'bat.hundreds',
      'bat.ducks',
    ],
    version,
    calculator: new BatConsistencyCalculator(),
  },
  {
    id: 'bat.scoring_consistency',
    name: 'Scoring Consistency',
    category: MetricCategory.Batting,
    level: MetricLevel.Composite,
    dependencies: ['bat.innings', 'bat.fifties', 'bat.hundreds', 'bat.ducks'],
    version,
    calculator: new BatScoringConsistencyCalculator(),
  },
  {
    id: 'bowl.control',
    name: 'Bowling Control',
    category: MetricCategory.Bowling,
    level: MetricLevel.Composite,
    dependencies: [
      'bowl.economy',
      'bowl.wides',
      'bowl.no_balls',
      'bowl.overs',
      'bowl.maidens',
    ],
    version,
    calculator: new BowlControlCalculator(),
  },
  {
    id: 'bowl.wicket_threat',
    name: 'Wicket Threat',
    category: MetricCategory.Bowling,
    level: MetricLevel.Composite,
    dependencies: ['bowl.wickets', 'bowl.innings', 'bowl.matches'],
    version,
    calculator: new BowlWicketThreatCalculator(),
  },
  {
    id: 'bowl.effectiveness',
    name: 'Bowling Effectiveness',
    category: MetricCategory.Bowling,
    level: MetricLevel.Composite,
    dependencies: [
      'bowl.economy',
      'bowl.average',
      'bowl.strike_rate',
      'bowl.wickets',
      'bowl.innings',
    ],
    version,
    calculator: new BowlEffectivenessCalculator(),
  },
  placeholderComposite(
    'field.impact',
    'Fielding Impact',
    MetricCategory.Fielding,
    ['field.dismissals', 'field.matches'],
    0,
  ),
]
