import { StubMetricCalculator } from '../calculators/StubMetricCalculator'
import { battingVolumeMetricDefinitions } from './battingVolumeMetrics'
import {
  MetricCategory,
  MetricLevel,
  type MetricDefinition,
} from './types'

export const primitiveMetricDefinitions: readonly MetricDefinition[] = [
  ...battingVolumeMetricDefinitions,
  {
    id: 'bowling.wickets',
    name: 'Wickets',
    category: MetricCategory.Bowling,
    level: MetricLevel.Primitive,
    dependencies: [],
    version: '1.0.0',
    calculator: new StubMetricCalculator({
      metricId: 'bowling.wickets',
      name: 'Wickets',
      category: MetricCategory.Bowling,
      level: MetricLevel.Primitive,
      version: '1.0.0',
      value: 0,
      unit: 'wickets',
    }),
  },
  {
    id: 'fielding.catches',
    name: 'Catches',
    category: MetricCategory.Fielding,
    level: MetricLevel.Primitive,
    dependencies: [],
    version: '1.0.0',
    calculator: new StubMetricCalculator({
      metricId: 'fielding.catches',
      name: 'Catches',
      category: MetricCategory.Fielding,
      level: MetricLevel.Primitive,
      version: '1.0.0',
      value: 0,
      unit: 'catches',
    }),
  },
  {
    id: 'context.matches',
    name: 'Matches',
    category: MetricCategory.Context,
    level: MetricLevel.Primitive,
    dependencies: [],
    version: '1.0.0',
    calculator: new StubMetricCalculator({
      metricId: 'context.matches',
      name: 'Matches',
      category: MetricCategory.Context,
      level: MetricLevel.Primitive,
      version: '1.0.0',
      value: 0,
      unit: 'matches',
    }),
  },
]
