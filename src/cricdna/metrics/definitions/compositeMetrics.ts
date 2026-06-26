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
  FieldActivityCalculator,
  FieldImpactCalculator,
  FieldReliabilityCalculator,
} from '../calculators/fielding/FieldingCompositeCalculators'
import {
  MetricCategory,
  MetricLevel,
  type MetricDefinition,
} from './types'

const version = '1.0.0'

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
  {
    id: 'field.impact',
    name: 'Fielding Impact',
    category: MetricCategory.Fielding,
    level: MetricLevel.Composite,
    dependencies: [
      'field.matches',
      'field.dismissals',
      'field.catches',
      'field.stumpings',
      'field.run_outs',
      'field.assisted_run_outs',
    ],
    version,
    calculator: new FieldImpactCalculator(),
  },
  {
    id: 'field.reliability',
    name: 'Fielding Reliability',
    category: MetricCategory.Fielding,
    level: MetricLevel.Composite,
    dependencies: ['field.innings', 'field.dismissals'],
    version,
    calculator: new FieldReliabilityCalculator(),
  },
  {
    id: 'field.activity',
    name: 'Fielding Activity',
    category: MetricCategory.Fielding,
    level: MetricLevel.Composite,
    dependencies: [
      'field.matches',
      'field.innings',
      'field.dismissals',
      'field.catches',
      'field.stumpings',
      'field.run_outs',
      'field.assisted_run_outs',
    ],
    version,
    calculator: new FieldActivityCalculator(),
  },
]
