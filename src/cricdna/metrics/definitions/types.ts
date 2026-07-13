import type { PlayerKnowledgeModel } from '../../domain/models/PlayerKnowledgeModel'

export type MetricId = string

export enum MetricCategory {
  Batting = 'Batting',
  Bowling = 'Bowling',
  Fielding = 'Fielding',
  Behaviour = 'Behaviour',
  Progression = 'Progression',
  Context = 'Context',
}

export enum MetricLevel {
  Primitive = 1,
  Composite = 2,
  Trait = 3,
}

export enum MetricStatus {
  Success = 'SUCCESS',
  InsufficientSample = 'INSUFFICIENT_SAMPLE',
  MissingData = 'MISSING_DATA',
  NotApplicable = 'NOT_APPLICABLE',
  FailedValidation = 'FAILED_VALIDATION',
}

export interface MetricResult {
  readonly metricId: MetricId
  readonly name: string
  readonly category: MetricCategory
  readonly level: MetricLevel
  readonly value: number | string | boolean | null
  readonly unit?: string
  readonly sampleSize: number
  readonly confidence: number
  readonly status: MetricStatus
  readonly version: string
  readonly metadata: Readonly<Record<string, string | number | boolean>>
}

export interface MetricExecutionContext {
  readonly pkm: PlayerKnowledgeModel
  readonly results: ReadonlyMap<MetricId, MetricResult>
}

export interface MetricCalculator {
  readonly calculate: (context: MetricExecutionContext) => MetricResult
}

export interface MetricDefinition {
  readonly id: MetricId
  readonly name: string
  readonly category: MetricCategory
  readonly level: MetricLevel
  readonly dependencies: readonly MetricId[]
  readonly version: string
  readonly calculator: MetricCalculator
}

export interface MetricExecutionPlan {
  readonly orderedMetricIds: readonly MetricId[]
}
