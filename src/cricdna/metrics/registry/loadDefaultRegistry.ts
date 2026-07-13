import { compositeMetricDefinitions } from '../definitions/compositeMetrics'
import { primitiveMetricDefinitions } from '../definitions/primitiveMetrics'
import { MetricRegistry } from './MetricRegistry'

export const loadDefaultMetricRegistry = (): MetricRegistry => {
  return MetricRegistry.fromDefinitions([
    ...primitiveMetricDefinitions,
    ...compositeMetricDefinitions,
  ])
}
