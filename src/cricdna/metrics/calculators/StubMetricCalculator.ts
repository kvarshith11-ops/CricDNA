import type {
  MetricCalculator,
  MetricCategory,
  MetricExecutionContext,
  MetricLevel,
  MetricResult,
} from '../definitions/types'
import { MetricStatus } from '../definitions/types'

interface StubMetricCalculatorOptions {
  readonly metricId: string
  readonly name: string
  readonly category: MetricCategory
  readonly level: MetricLevel
  readonly version: string
  readonly value: number
  readonly unit?: string
}

export class StubMetricCalculator implements MetricCalculator {
  constructor(private readonly options: StubMetricCalculatorOptions) {}

  calculate(context: MetricExecutionContext): MetricResult {
    return {
      metricId: this.options.metricId,
      name: this.options.name,
      category: this.options.category,
      level: this.options.level,
      value: this.options.value,
      unit: this.options.unit,
      sampleSize: context.pkm.history.records.length,
      confidence: 1,
      status: MetricStatus.Success,
      version: this.options.version,
      metadata: {
        calculator: 'StubMetricCalculator',
      },
    }
  }
}
