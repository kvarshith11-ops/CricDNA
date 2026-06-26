import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricId,
  type MetricResult,
} from '../../definitions/types'

interface BattingConsistencyConfig {
  readonly metricId: MetricId
  readonly name: string
  readonly dependencies: readonly MetricId[]
  readonly calculateScore: (inputs: ReadonlyMap<MetricId, number>) => number
  readonly metadata: Readonly<Record<string, string | number | boolean>>
}

const VERSION = '1.0.0'
const MIN_SCORE = 0
const MAX_SCORE = 100
const AVERAGE_BENCHMARK = 50
const HUNDRED_RATE_BENCHMARK = 0.2
const FIFTY_PLUS_RATE_BENCHMARK = 0.5
const DUCK_RATE_BENCHMARK = 0.2

abstract class BattingConsistencyCompositeCalculator implements MetricCalculator {
  protected constructor(private readonly config: BattingConsistencyConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const inputResult = getPrimitiveInputs(context, this.config.dependencies)

    if (!inputResult.ok) {
      return this.result(null, 0, MetricStatus.FailedValidation, {
        validationError: inputResult.error,
      })
    }

    const innings = requiredInput(inputResult.values, 'bat.innings')

    if (innings <= 0) {
      return this.result(null, inputResult.sampleSize, MetricStatus.MissingData, {
        reason: 'Batting innings is zero.',
      })
    }

    const score = this.config.calculateScore(inputResult.values)

    if (!Number.isFinite(score) || score < MIN_SCORE || score > MAX_SCORE) {
      return this.result(score, inputResult.sampleSize, MetricStatus.FailedValidation, {
        validationError: 'Consistency score must be a finite value between 0 and 100.',
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

export class BatConsistencyCalculator extends BattingConsistencyCompositeCalculator {
  constructor() {
    super({
      metricId: 'bat.consistency',
      name: 'Batting Consistency',
      dependencies: [
        'bat.innings',
        'bat.average',
        'bat.fifties',
        'bat.hundreds',
        'bat.ducks',
      ],
      calculateScore: (inputs) => {
        const innings = requiredInput(inputs, 'bat.innings')
        const averageScore = normalize(requiredInput(inputs, 'bat.average'), AVERAGE_BENCHMARK)
        const hundredRate = requiredInput(inputs, 'bat.hundreds') / innings
        const fiftyPlusRate =
          (requiredInput(inputs, 'bat.fifties') + requiredInput(inputs, 'bat.hundreds')) /
          innings
        const duckRate = requiredInput(inputs, 'bat.ducks') / innings
        const hundredScore = normalize(hundredRate, HUNDRED_RATE_BENCHMARK)
        const fiftyPlusScore = normalize(fiftyPlusRate, FIFTY_PLUS_RATE_BENCHMARK)
        const duckAvoidanceScore =
          MAX_SCORE - normalize(duckRate, DUCK_RATE_BENCHMARK)

        return roundScore(
          averageScore * 0.35 +
            fiftyPlusScore * 0.3 +
            hundredScore * 0.2 +
            duckAvoidanceScore * 0.15,
        )
      },
      metadata: {
        averageWeight: 0.35,
        fiftyPlusRateWeight: 0.3,
        hundredRateWeight: 0.2,
        duckAvoidanceWeight: 0.15,
        averageBenchmark: AVERAGE_BENCHMARK,
        fiftyPlusRateBenchmark: FIFTY_PLUS_RATE_BENCHMARK,
        hundredRateBenchmark: HUNDRED_RATE_BENCHMARK,
        duckRateBenchmark: DUCK_RATE_BENCHMARK,
      },
    })
  }
}

export class BatScoringConsistencyCalculator extends BattingConsistencyCompositeCalculator {
  constructor() {
    super({
      metricId: 'bat.scoring_consistency',
      name: 'Scoring Consistency',
      dependencies: ['bat.innings', 'bat.fifties', 'bat.hundreds', 'bat.ducks'],
      calculateScore: (inputs) => {
        const innings = requiredInput(inputs, 'bat.innings')
        const fiftyPlusRate =
          (requiredInput(inputs, 'bat.fifties') + requiredInput(inputs, 'bat.hundreds')) /
          innings
        const duckRate = requiredInput(inputs, 'bat.ducks') / innings
        const fiftyPlusScore = normalize(fiftyPlusRate, FIFTY_PLUS_RATE_BENCHMARK)
        const duckAvoidanceScore =
          MAX_SCORE - normalize(duckRate, DUCK_RATE_BENCHMARK)

        return roundScore(fiftyPlusScore * 0.75 + duckAvoidanceScore * 0.25)
      },
      metadata: {
        fiftyPlusRateWeight: 0.75,
        duckAvoidanceWeight: 0.25,
        fiftyPlusRateBenchmark: FIFTY_PLUS_RATE_BENCHMARK,
        duckRateBenchmark: DUCK_RATE_BENCHMARK,
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
