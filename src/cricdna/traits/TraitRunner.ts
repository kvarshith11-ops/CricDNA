import { MetricLevel, MetricStatus, type EngineeringMetrics } from '../metrics'
import { TraitRegistry } from './TraitRegistry'
import { TraitResults } from './TraitResults'
import type { TraitId, TraitResult } from './types'

export interface TraitRunnerInput {
  readonly metrics: EngineeringMetrics
  readonly traitIds?: readonly TraitId[]
}

export class TraitRunner {
  constructor(private readonly registry: TraitRegistry) {}

  run(input: TraitRunnerInput): TraitResults {
    const traitIds = input.traitIds ?? this.registry.all().map((definition) => definition.id)
    const results = new Map<TraitId, TraitResult>()

    for (const traitId of traitIds) {
      const definition = this.registry.getRequired(traitId)
      validateDependencies(definition.dependencies, input.metrics)

      const result = definition.calculator.calculate({
        metrics: input.metrics,
      })

      if (result.traitId !== definition.id) {
        throw new Error(
          `Trait '${definition.id}' calculator returned result for '${result.traitId}'.`,
        )
      }

      results.set(traitId, result)
    }

    return new TraitResults(results)
  }
}

const validateDependencies = (
  dependencies: readonly string[],
  metrics: EngineeringMetrics,
): void => {
  for (const dependencyId of dependencies) {
    const result = metrics.get(dependencyId)

    if (!result) {
      throw new Error(`Trait dependency '${dependencyId}' is missing.`)
    }

    if (result.level !== MetricLevel.Composite) {
      throw new Error(`Trait dependency '${dependencyId}' must be a composite metric.`)
    }

    if (result.status !== MetricStatus.Success) {
      throw new Error(`Trait dependency '${dependencyId}' did not complete successfully.`)
    }
  }
}
