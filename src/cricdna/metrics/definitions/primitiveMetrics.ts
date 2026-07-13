import { battingAverageMetricDefinitions } from './battingAverageMetrics'
import { battingScoringMetricDefinitions } from './battingScoringMetrics'
import { battingVolumeMetricDefinitions } from './battingVolumeMetrics'
import { behaviourCoreMetricDefinitions } from './behaviourCoreMetrics'
import { bowlingCoreMetricDefinitions } from './bowlingCoreMetrics'
import { contextCoreMetricDefinitions } from './contextCoreMetrics'
import { fieldingCoreMetricDefinitions } from './fieldingCoreMetrics'
import { progressionCoreMetricDefinitions } from './progressionCoreMetrics'
import type { MetricDefinition } from './types'

export const primitiveMetricDefinitions: readonly MetricDefinition[] = [
  ...battingVolumeMetricDefinitions,
  ...battingScoringMetricDefinitions,
  ...battingAverageMetricDefinitions,
  ...bowlingCoreMetricDefinitions,
  ...fieldingCoreMetricDefinitions,
  ...contextCoreMetricDefinitions,
  ...behaviourCoreMetricDefinitions,
  ...progressionCoreMetricDefinitions,
]
