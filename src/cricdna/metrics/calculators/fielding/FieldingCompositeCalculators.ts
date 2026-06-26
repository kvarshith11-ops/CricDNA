import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricId,
  type MetricResult,
} from '../../definitions/types'

interface FieldingCompositeConfig {
  readonly metricId: MetricId
  readonly name: string
  readonly dependencies: readonly MetricId[]
  readonly calculateScore: (inputs: ReadonlyMap<MetricId, number>) => number
  readonly metadata: Readonly<Record<string, string | number | boolean>>
}

const VERSION = '1.0.0'
const MIN_SCORE = 0
const MAX_SCORE = 100
const DISMISSALS_PER_MATCH_BENCHMARK = 2
const DISMISSALS_PER_INNINGS_BENCHMARK = 1.5
const ACTIVITY_EVENTS_PER_MATCH_BENCHMARK = 2
const CATCHES_PER_MATCH_BENCHMARK = 1
const STUMPINGS_PER_MATCH_BENCHMARK = 0.5
const RUN_OUTS_PER_MATCH_BENCHMARK = 0.5

abstract class FieldingCompositeCalculator implements MetricCalculator {
  protected constructor(private readonly config: FieldingCompositeConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const inputResult = getPrimitiveInputs(context, this.config.dependencies)

    if (!inputResult.ok) {
      return this.result(null, 0, MetricStatus.FailedValidation, {
        validationError: inputResult.error,
      })
    }

    let score: number

    try {
      score = this.config.calculateScore(inputResult.values)
    } catch (error) {
      return this.result(null, inputResult.sampleSize, MetricStatus.FailedValidation, {
        validationError: error instanceof Error ? error.message : 'Invalid fielding inputs.',
      })
    }

    if (!Number.isFinite(score) || score < MIN_SCORE || score > MAX_SCORE) {
      return this.result(score, inputResult.sampleSize, MetricStatus.FailedValidation, {
        validationError: 'Fielding composite score must be a finite value between 0 and 100.',
      })
    }

    return this.result(score, inputResult.sampleSize, MetricStatus.Success, {
      ...this.config.metadata,
    })
  }

  private result(
    value: number | null,
    sampleSize: number,
    status: MetricStatus,
    metadata: Readonly<Record<string, string | number | boolean>> = {},
  ): MetricResult {
    return {
      metricId: this.config.metricId,
      name: this.config.name,
      category: MetricCategory.Fielding,
      level: MetricLevel.Composite,
      value,
      unit: 'score',
      sampleSize,
      confidence: status === MetricStatus.Success ? 1 : 0,
      status,
      version: VERSION,
      metadata,
    }
  }
}

export class FieldImpactCalculator extends FieldingCompositeCalculator {
  constructor() {
    super({
      metricId: 'field.impact',
      name: 'Fielding Impact',
      dependencies: [
        'field.matches',
        'field.dismissals',
        'field.catches',
        'field.stumpings',
        'field.run_outs',
        'field.assisted_run_outs',
      ],
      calculateScore: (inputs) => {
        const matches = requiredPositiveInput(inputs, 'field.matches')
        const dismissalsPerMatchScore = normalize(
          requiredInput(inputs, 'field.dismissals') / matches,
          DISMISSALS_PER_MATCH_BENCHMARK,
        )
        const catchesPerMatchScore = normalize(
          requiredInput(inputs, 'field.catches') / matches,
          CATCHES_PER_MATCH_BENCHMARK,
        )
        const stumpingsPerMatchScore = normalize(
          requiredInput(inputs, 'field.stumpings') / matches,
          STUMPINGS_PER_MATCH_BENCHMARK,
        )
        const runOutsPerMatchScore = normalize(
          (requiredInput(inputs, 'field.run_outs') +
            requiredInput(inputs, 'field.assisted_run_outs')) /
            matches,
          RUN_OUTS_PER_MATCH_BENCHMARK,
        )

        return roundScore(
          dismissalsPerMatchScore * 0.45 +
            catchesPerMatchScore * 0.25 +
            stumpingsPerMatchScore * 0.15 +
            runOutsPerMatchScore * 0.15,
        )
      },
      metadata: {
        dismissalsPerMatchWeight: 0.45,
        catchesPerMatchWeight: 0.25,
        stumpingsPerMatchWeight: 0.15,
        runOutsPerMatchWeight: 0.15,
        dismissalsPerMatchBenchmark: DISMISSALS_PER_MATCH_BENCHMARK,
        catchesPerMatchBenchmark: CATCHES_PER_MATCH_BENCHMARK,
        stumpingsPerMatchBenchmark: STUMPINGS_PER_MATCH_BENCHMARK,
        runOutsPerMatchBenchmark: RUN_OUTS_PER_MATCH_BENCHMARK,
      },
    })
  }
}

export class FieldReliabilityCalculator extends FieldingCompositeCalculator {
  constructor() {
    super({
      metricId: 'field.reliability',
      name: 'Fielding Reliability',
      dependencies: ['field.innings', 'field.dismissals'],
      calculateScore: (inputs) => {
        const innings = requiredPositiveInput(inputs, 'field.innings')

        return roundScore(
          normalize(
            requiredInput(inputs, 'field.dismissals') / innings,
            DISMISSALS_PER_INNINGS_BENCHMARK,
          ),
        )
      },
      metadata: {
        dismissalsPerInningsWeight: 1,
        dismissalsPerInningsBenchmark: DISMISSALS_PER_INNINGS_BENCHMARK,
        limitation: 'Successful-involvement proxy; chance/drop denominators unavailable.',
      },
    })
  }
}

export class FieldActivityCalculator extends FieldingCompositeCalculator {
  constructor() {
    super({
      metricId: 'field.activity',
      name: 'Fielding Activity',
      dependencies: [
        'field.matches',
        'field.innings',
        'field.dismissals',
        'field.catches',
        'field.stumpings',
        'field.run_outs',
        'field.assisted_run_outs',
      ],
      calculateScore: (inputs) => {
        const matches = requiredPositiveInput(inputs, 'field.matches')
        const activityEvents =
          requiredInput(inputs, 'field.catches') +
          requiredInput(inputs, 'field.stumpings') +
          requiredInput(inputs, 'field.run_outs') +
          requiredInput(inputs, 'field.assisted_run_outs')
        const eventActivityScore = normalize(
          activityEvents / matches,
          ACTIVITY_EVENTS_PER_MATCH_BENCHMARK,
        )
        const inningsParticipationScore = normalize(
          requiredInput(inputs, 'field.innings') / matches,
          1,
        )
        const dismissalActivityScore = normalize(
          requiredInput(inputs, 'field.dismissals') / matches,
          DISMISSALS_PER_MATCH_BENCHMARK,
        )

        return roundScore(
          eventActivityScore * 0.45 +
            inningsParticipationScore * 0.3 +
            dismissalActivityScore * 0.25,
        )
      },
      metadata: {
        eventActivityWeight: 0.45,
        inningsParticipationWeight: 0.3,
        dismissalActivityWeight: 0.25,
        activityEventsPerMatchBenchmark: ACTIVITY_EVENTS_PER_MATCH_BENCHMARK,
        dismissalsPerMatchBenchmark: DISMISSALS_PER_MATCH_BENCHMARK,
      },
    })
  }
}

type InputResult =
  | {
      readonly ok: true
      readonly values: ReadonlyMap<MetricId, number>
      readonly sampleSize: number
    }
  | {
      readonly ok: false
      readonly error: string
    }

const getPrimitiveInputs = (
  context: MetricExecutionContext,
  dependencies: readonly MetricId[],
): InputResult => {
  const values = new Map<MetricId, number>()
  let sampleSize = 0

  for (const dependencyId of dependencies) {
    const result = context.results.get(dependencyId)

    if (!result) {
      return {
        ok: false,
        error: `Missing primitive dependency '${dependencyId}'.`,
      }
    }

    if (result.level !== MetricLevel.Primitive) {
      return {
        ok: false,
        error: `Dependency '${dependencyId}' is not a primitive metric.`,
      }
    }

    if (result.status !== MetricStatus.Success) {
      return {
        ok: false,
        error: `Dependency '${dependencyId}' did not complete successfully.`,
      }
    }

    if (typeof result.value !== 'number' || !Number.isFinite(result.value)) {
      return {
        ok: false,
        error: `Dependency '${dependencyId}' does not provide a finite numeric value.`,
      }
    }

    if (result.value < 0) {
      return {
        ok: false,
        error: `Dependency '${dependencyId}' cannot be negative.`,
      }
    }

    values.set(dependencyId, result.value)
    sampleSize = Math.max(sampleSize, result.sampleSize)
  }

  return {
    ok: true,
    values,
    sampleSize,
  }
}

const requiredInput = (
  inputs: ReadonlyMap<MetricId, number>,
  metricId: MetricId,
): number => {
  const value = inputs.get(metricId)

  if (value === undefined) {
    throw new Error(`Missing normalized input '${metricId}'.`)
  }

  return value
}

const requiredPositiveInput = (
  inputs: ReadonlyMap<MetricId, number>,
  metricId: MetricId,
): number => {
  const value = requiredInput(inputs, metricId)

  if (value <= 0) {
    throw new Error(`Dependency '${metricId}' must be greater than zero.`)
  }

  return value
}

const normalize = (value: number, benchmark: number): number => {
  if (benchmark <= 0) {
    return 0
  }

  return clamp((value / benchmark) * MAX_SCORE)
}

const clamp = (value: number): number => {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, value))
}

const roundScore = (value: number): number => {
  return Math.round(value * 100) / 100
}
