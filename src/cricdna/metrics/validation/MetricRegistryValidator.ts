import type { MetricExecutionPlan, MetricId } from '../definitions/types'
import type { MetricRegistry } from '../registry/MetricRegistry'

enum VisitState {
  Visiting = 'Visiting',
  Visited = 'Visited',
}

export const validateMetricRegistry = (registry: MetricRegistry): void => {
  for (const definition of registry.all()) {
    for (const dependencyId of definition.dependencies) {
      if (!registry.has(dependencyId)) {
        throw new Error(
          `Metric '${definition.id}' depends on missing metric '${dependencyId}'.`,
        )
      }
    }
  }

  resolveExecutionPlan(registry)
}

export const resolveExecutionPlan = (
  registry: MetricRegistry,
  requestedMetricIds?: readonly MetricId[],
): MetricExecutionPlan => {
  const requested = requestedMetricIds ?? registry.all().map((definition) => definition.id)
  const states = new Map<MetricId, VisitState>()
  const orderedMetricIds: MetricId[] = []

  const visit = (metricId: MetricId, path: readonly MetricId[]): void => {
    const state = states.get(metricId)

    if (state === VisitState.Visited) {
      return
    }

    if (state === VisitState.Visiting) {
      throw new Error(
        `Circular metric dependency detected: ${[...path, metricId].join(' -> ')}.`,
      )
    }

    const definition = registry.getRequired(metricId)

    states.set(metricId, VisitState.Visiting)

    for (const dependencyId of definition.dependencies) {
      if (!registry.has(dependencyId)) {
        throw new Error(
          `Metric '${definition.id}' depends on missing metric '${dependencyId}'.`,
        )
      }

      visit(dependencyId, [...path, metricId])
    }

    states.set(metricId, VisitState.Visited)

    if (!orderedMetricIds.includes(metricId)) {
      orderedMetricIds.push(metricId)
    }
  }

  for (const metricId of requested) {
    visit(metricId, [])
  }

  return {
    orderedMetricIds,
  }
}
