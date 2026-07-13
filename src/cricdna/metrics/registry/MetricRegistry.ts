import { MetricLevel, type MetricDefinition, type MetricId } from '../definitions/types'

export class MetricRegistry {
  private readonly definitions = new Map<MetricId, MetricDefinition>()

  register(definition: MetricDefinition): void {
    if (this.definitions.has(definition.id)) {
      throw new Error(`Metric '${definition.id}' is already registered.`)
    }

    if (
      definition.level === MetricLevel.Primitive &&
      definition.dependencies.length > 0
    ) {
      throw new Error(`Primitive metric '${definition.id}' cannot have dependencies.`)
    }

    this.definitions.set(definition.id, definition)
  }

  get(metricId: MetricId): MetricDefinition | undefined {
    return this.definitions.get(metricId)
  }

  getRequired(metricId: MetricId): MetricDefinition {
    const definition = this.get(metricId)

    if (!definition) {
      throw new Error(`Metric '${metricId}' is not registered.`)
    }

    return definition
  }

  has(metricId: MetricId): boolean {
    return this.definitions.has(metricId)
  }

  all(): readonly MetricDefinition[] {
    return [...this.definitions.values()]
  }

  static fromDefinitions(
    definitions: readonly MetricDefinition[],
  ): MetricRegistry {
    const registry = new MetricRegistry()

    for (const definition of definitions) {
      registry.register(definition)
    }

    return registry
  }
}
