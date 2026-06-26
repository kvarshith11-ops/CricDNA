import {
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricCategory,
  type MetricExecutionContext,
  type MetricId,
  type MetricResult,
} from '../definitions/types'

interface PlaceholderCompositeMetricCalculatorOptions {
  readonly metricId: MetricId
  readonly name: string
  readonly category: MetricCategory
  readonly version: string
  readonly dependencies: readonly MetricId[]
  readonly value: number
  readonly unit?: string
}

export class PlaceholderCompositeMetricCalculator implements MetricCalculator {
  constructor(private readonly options: PlaceholderCompositeMetricCalculatorOptions) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const missingDependencies = this.options.dependencies.filter(
      (dependencyId) => !context.results.has(dependencyId),
    )

    if (missingDependencies.length > 0) {
      return {
        metricId: this.options.metricId,
        name: this.options.name,
        category: this.options.category,
        level: MetricLevel.Composite,
        value: null,
        unit: this.options.unit,
        sampleSize: context.results.size,
        confidence: 0,
        status: MetricStatus.FailedValidation,
        version: this.options.version,
        metadata: {
          calculator: 'PlaceholderCompositeMetricCalculator',
          missingDependencies: missingDependencies.join(','),
        },
      }
    }

    return {
      metricId: this.options.metricId,
      name: this.options.name,
      category: this.options.category,
      level: MetricLevel.Composite,
      value: this.options.value,
      unit: this.options.unit,
      sampleSize: this.options.dependencies.length,
      confidence: 1,
      status: MetricStatus.Success,
      version: this.options.version,
      metadata: {
        calculator: 'PlaceholderCompositeMetricCalculator',
        dependencyCount: this.options.dependencies.length,
      },
    }
  }
}
