import type { MetricId, MetricResult } from '../definitions/types'

export class EngineeringMetrics {
  private readonly results: ReadonlyMap<MetricId, MetricResult>

  constructor(results: ReadonlyMap<MetricId, MetricResult>) {
    this.results = new Map(results)
  }

  get(metricId: MetricId): MetricResult | undefined {
    return this.results.get(metricId)
  }

  has(metricId: MetricId): boolean {
    return this.results.has(metricId)
  }

  entries(): readonly MetricResult[] {
    return [...this.results.values()]
  }

  toJSON(): Readonly<Record<MetricId, MetricResult>> {
    return Object.fromEntries(this.results.entries())
  }
}
