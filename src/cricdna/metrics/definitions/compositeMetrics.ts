import { PlaceholderCompositeMetricCalculator } from '../calculators/PlaceholderCompositeMetricCalculator'
import {
  BatBoundaryIntentCalculator,
  BatIntentCalculator,
} from '../calculators/batting/BattingIntentCompositeCalculators'
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
  placeholderComposite(
    'bat.consistency',
    'Batting Consistency',
    MetricCategory.Batting,
    ['bat.runs', 'bat.innings', 'bat.average'],
    0,
  ),
  placeholderComposite(
    'bowl.control',
    'Bowling Control',
    MetricCategory.Bowling,
    ['bowl.economy', 'bowl.wides', 'bowl.no_balls'],
    0,
  ),
  placeholderComposite(
    'field.impact',
    'Fielding Impact',
    MetricCategory.Fielding,
    ['field.dismissals', 'field.matches'],
    0,
  ),
]
