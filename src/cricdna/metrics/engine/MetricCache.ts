import type { MetricId, MetricResult } from '../definitions/types'

export class MetricCache {
  private readonly results = new Map<MetricId, MetricResult>()

  get(metricId: MetricId): MetricResult | undefined {
    return this.results.get(metricId)
  }

  set(result: MetricResult): void {
    this.results.set(result.metricId, result)
  }

  has(metricId: MetricId): boolean {
    return this.results.has(metricId)
  }

  snapshot(): ReadonlyMap<MetricId, MetricResult> {
    return new Map(this.results)
  }
}
