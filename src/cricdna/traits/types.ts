import type { EngineeringMetrics, MetricId } from '../metrics'

export type TraitId = string

export enum TraitCategory {
  Batting = 'Batting',
  Bowling = 'Bowling',
  Fielding = 'Fielding',
}

export enum TraitStatus {
  Success = 'SUCCESS',
  FailedValidation = 'FAILED_VALIDATION',
}

export interface SupportingMetric {
  readonly metricId: MetricId
  readonly value: number
}

export interface TraitResult {
  readonly traitId: TraitId
  readonly traitName: string
  readonly category: TraitCategory
  readonly classification: string | null
  readonly confidence: number
  readonly supportingMetrics: readonly SupportingMetric[]
  readonly explanation: string
  readonly status: TraitStatus
  readonly version: string
}

export interface TraitExecutionContext {
  readonly metrics: EngineeringMetrics
}

export interface TraitCalculator {
  readonly calculate: (context: TraitExecutionContext) => TraitResult
}

export interface TraitDefinition {
  readonly id: TraitId
  readonly name: string
  readonly category: TraitCategory
  readonly dependencies: readonly MetricId[]
  readonly version: string
  readonly calculator: TraitCalculator
}
