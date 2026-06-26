import { PlaceholderCompositeMetricCalculator } from '../calculators/PlaceholderCompositeMetricCalculator'
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
  placeholderComposite(
    'bat.intent',
    'Batting Intent',
    MetricCategory.Batting,
    ['bat.strike_rate', 'bat.boundary_percentage', 'bat.runs_per_ball'],
    0,
  ),
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
