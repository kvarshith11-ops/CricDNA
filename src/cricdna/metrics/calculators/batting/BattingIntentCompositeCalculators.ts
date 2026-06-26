import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricId,
  type MetricResult,
} from '../../definitions/types'

interface BattingIntentConfig {
  readonly metricId: MetricId
  readonly name: string
  readonly dependencies: readonly MetricId[]
  readonly calculateScore: (inputs: ReadonlyMap<MetricId, number>) => number
  readonly metadata: Readonly<Record<string, string | number | boolean>>
}

const VERSION = '1.0.0'
const MAX_SCORE = 100
const MIN_SCORE = 0
const STRIKE_RATE_BENCHMARK = 200
const RUNS_PER_BALL_BENCHMARK = 2

abstract class BattingIntentCompositeCalculator implements MetricCalculator {
  protected constructor(private readonly config: BattingIntentConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const inputResult = getPrimitiveInputs(context, this.config.dependencies)

    if (!inputResult.ok) {
      return this.result(null, 0, MetricStatus.FailedValidation, {
        validationError: inputResult.error,
      })
    }

    const score = this.config.calculateScore(inputResult.values)

    if (!Number.isFinite(score) || score < MIN_SCORE || score > MAX_SCORE) {
      return this.result(score, inputResult.sampleSize, MetricStatus.FailedValidation, {
        validationError: 'Intent score must be a finite value between 0 and 100.',
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
      category: MetricCategory.Batting,
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

export class BatIntentCalculator extends BattingIntentCompositeCalculator {
  constructor() {
    super({
      metricId: 'bat.intent',
      name: 'Batting Intent',
      dependencies: ['bat.strike_rate', 'bat.boundary_percentage', 'bat.runs_per_ball'],
      calculateScore: (inputs) => {
        const strikeRateScore = normalize(
          requiredInput(inputs, 'bat.strike_rate'),
          STRIKE_RATE_BENCHMARK,
        )
        const boundaryScore = clamp(requiredInput(inputs, 'bat.boundary_percentage'))
        const runsPerBallScore = normalize(
          requiredInput(inputs, 'bat.runs_per_ball'),
          RUNS_PER_BALL_BENCHMARK,
        )

        return roundScore(
          strikeRateScore * 0.4 + boundaryScore * 0.35 + runsPerBallScore * 0.25,
        )
      },
      metadata: {
        strikeRateWeight: 0.4,
        boundaryPercentageWeight: 0.35,
        runsPerBallWeight: 0.25,
        strikeRateBenchmark: STRIKE_RATE_BENCHMARK,
        runsPerBallBenchmark: RUNS_PER_BALL_BENCHMARK,
      },
    })
  }
}

export class BatBoundaryIntentCalculator extends BattingIntentCompositeCalculator {
  constructor() {
    super({
      metricId: 'bat.boundary_intent',
      name: 'Boundary Intent',
      dependencies: ['bat.boundary_percentage'],
      calculateScore: (inputs) => roundScore(clamp(requiredInput(inputs, 'bat.boundary_percentage'))),
      metadata: {
        boundaryPercentageWeight: 1,
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
