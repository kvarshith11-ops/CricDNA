import { StubMetricCalculator } from '../calculators/StubMetricCalculator'
import { battingAverageMetricDefinitions } from './battingAverageMetrics'
import { battingScoringMetricDefinitions } from './battingScoringMetrics'
import { battingVolumeMetricDefinitions } from './battingVolumeMetrics'
import { bowlingCoreMetricDefinitions } from './bowlingCoreMetrics'
import { fieldingCoreMetricDefinitions } from './fieldingCoreMetrics'
import {
  MetricCategory,
  MetricLevel,
  type MetricDefinition,
} from './types'

export const primitiveMetricDefinitions: readonly MetricDefinition[] = [
  ...battingVolumeMetricDefinitions,
  ...battingScoringMetricDefinitions,
  ...battingAverageMetricDefinitions,
  ...bowlingCoreMetricDefinitions,
  ...fieldingCoreMetricDefinitions,
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
