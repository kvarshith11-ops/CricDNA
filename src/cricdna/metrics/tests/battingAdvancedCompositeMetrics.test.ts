import { describe, expect, it } from 'vitest'
import {
  compositeMetricDefinitions,
  loadDefaultMetricRegistry,
  resolveExecutionPlan,
  validateMetricRegistry,
} from '../index'

const omittedAdvancedBattingMetrics = [
  'bat.pressure',
  'bat.finishing',
  'bat.adaptability',
] as const

describe('Batting Advanced composite metrics', () => {
  it('does not register unsupported advanced batting composites', () => {
    const registry = loadDefaultMetricRegistry()

    for (const metricId of omittedAdvancedBattingMetrics) {
      expect(registry.has(metricId)).toBe(false)
    }
  })

  it('keeps omitted metrics out of composite definitions', () => {
    const registeredCompositeIds = compositeMetricDefinitions.map(
      (definition) => definition.id,
    )

    for (const metricId of omittedAdvancedBattingMetrics) {
      expect(registeredCompositeIds).not.toContain(metricId)
    }
  })

  it('fails dependency planning for omitted advanced batting composites', () => {
    const registry = loadDefaultMetricRegistry()

    for (const metricId of omittedAdvancedBattingMetrics) {
      expect(() => resolveExecutionPlan(registry, [metricId])).toThrow(
        `Metric '${metricId}' is not registered.`,
      )
    }
  })

  it('keeps the current registry valid without advanced batting composites', () => {
    expect(() => validateMetricRegistry(loadDefaultMetricRegistry())).not.toThrow()
  })
})
