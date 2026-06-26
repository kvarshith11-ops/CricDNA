import type { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'
import type { MetricId } from '../definitions/types'
import { MetricRegistry } from '../registry/MetricRegistry'
import {
  resolveExecutionPlan,
  validateMetricRegistry,
} from '../validation/MetricRegistryValidator'
import { EngineeringMetrics } from './EngineeringMetrics'
import { MetricCache } from './MetricCache'

export interface MetricRunnerInput {
  readonly pkm: PlayerKnowledgeModel
  readonly metricIds?: readonly MetricId[]
}

export class MetricRunner {
  constructor(private readonly registry: MetricRegistry) {}

  run(input: MetricRunnerInput): EngineeringMetrics {
    validateMetricRegistry(this.registry)

    const executionPlan = resolveExecutionPlan(this.registry, input.metricIds)
    const cache = new MetricCache()

    for (const metricId of executionPlan.orderedMetricIds) {
      if (cache.has(metricId)) {
        continue
      }

      const definition = this.registry.getRequired(metricId)
      const result = definition.calculator.calculate({
        pkm: input.pkm,
        results: cache.snapshot(),
      })

      if (result.metricId !== definition.id) {
        throw new Error(
          `Metric '${definition.id}' calculator returned result for '${result.metricId}'.`,
        )
      }

      cache.set(result)
    }

    return new EngineeringMetrics(cache.snapshot())
  }

  static fromDefinitions(registryDefinitions: Parameters<typeof MetricRegistry.fromDefinitions>[0]): MetricRunner {
    return new MetricRunner(MetricRegistry.fromDefinitions(registryDefinitions))
  }
}
