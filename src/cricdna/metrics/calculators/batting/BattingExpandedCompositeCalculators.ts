import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricId,
  type MetricResult,
} from '../../definitions/types'

interface BattingExpandedCompositeConfig {
  readonly metricId: MetricId
  readonly name: string
  readonly dependencies: readonly MetricId[]
  readonly dependencyLevel: MetricLevel.Primitive | MetricLevel.Composite
  readonly calculateScore: (inputs: ReadonlyMap<MetricId, number>) => number
  readonly metadata: Readonly<Record<string, string | number | boolean>>
}

const VERSION = '1.0.0'
const MIN_SCORE = 0
const MAX_SCORE = 100
const AVERAGE_BENCHMARK = 50
const FIFTY_PLUS_RATE_BENCHMARK = 0.5
const HUNDRED_PLUS_RATE_BENCHMARK = 0.2
const DOUBLE_HUNDRED_RATE_BENCHMARK = 0.05
const DUCK_RATE_BENCHMARK = 0.2
const NOT_OUT_RATE_BENCHMARK = 0.3

abstract class BattingExpandedCompositeCalculator implements MetricCalculator {
  protected constructor(private readonly config: BattingExpandedCompositeConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const inputResult = getNumericInputs(
      context,
      this.config.dependencies,
      this.config.dependencyLevel,
    )

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
        validationError:
          error instanceof Error ? error.message : 'Invalid batting composite inputs.',
      })
    }

    if (!Number.isFinite(score) || score < MIN_SCORE || score > MAX_SCORE) {
      return this.result(score, inputResult.sampleSize, MetricStatus.FailedValidation, {
        validationError: 'Batting composite score must be a finite value between 0 and 100.',
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

export class BatEffectivenessCalculator extends BattingExpandedCompositeCalculator {
  constructor() {
    super({
      metricId: 'bat.effectiveness',
      name: 'Batting Effectiveness',
      dependencies: [
        'bat.intent',
        'bat.consistency',
        'bat.scoring_consistency',
        'bat.boundary_intent',
      ],
      dependencyLevel: MetricLevel.Composite,
      calculateScore: (inputs) =>
        roundScore(
          requiredInput(inputs, 'bat.consistency') * 0.35 +
            requiredInput(inputs, 'bat.intent') * 0.3 +
            requiredInput(inputs, 'bat.scoring_consistency') * 0.2 +
            requiredInput(inputs, 'bat.boundary_intent') * 0.15,
        ),
      metadata: {
        consistencyWeight: 0.35,
        intentWeight: 0.3,
        scoringConsistencyWeight: 0.2,
        boundaryIntentWeight: 0.15,
      },
    })
  }
}

export class BatConversionCalculator extends BattingExpandedCompositeCalculator {
  constructor() {
    super({
      metricId: 'bat.conversion',
      name: 'Batting Conversion',
      dependencies: ['bat.innings', 'bat.fifties', 'bat.hundreds', 'bat.double_hundreds'],
      dependencyLevel: MetricLevel.Primitive,
      calculateScore: (inputs) => {
        const innings = requiredPositiveInput(inputs, 'bat.innings')
        const fifties = requiredInput(inputs, 'bat.fifties')
        const hundreds = requiredInput(inputs, 'bat.hundreds')
        const doubleHundreds = requiredInput(inputs, 'bat.double_hundreds')
        const fiftyPlusRate = (fifties + hundreds + doubleHundreds) / innings
        const hundredPlusRate = (hundreds + doubleHundreds) / innings
        const doubleHundredRate = doubleHundreds / innings

        return roundScore(
          normalize(fiftyPlusRate, FIFTY_PLUS_RATE_BENCHMARK) * 0.6 +
            normalize(hundredPlusRate, HUNDRED_PLUS_RATE_BENCHMARK) * 0.35 +
            normalize(doubleHundredRate, DOUBLE_HUNDRED_RATE_BENCHMARK) * 0.05,
        )
      },
      metadata: {
        fiftyPlusRateWeight: 0.6,
        hundredPlusRateWeight: 0.35,
        doubleHundredRateWeight: 0.05,
        fiftyPlusRateBenchmark: FIFTY_PLUS_RATE_BENCHMARK,
        hundredPlusRateBenchmark: HUNDRED_PLUS_RATE_BENCHMARK,
        doubleHundredRateBenchmark: DOUBLE_HUNDRED_RATE_BENCHMARK,
      },
    })
  }
}

export class BatDismissalResilienceCalculator extends BattingExpandedCompositeCalculator {
  constructor() {
    super({
      metricId: 'bat.dismissal_resilience',
      name: 'Dismissal Resilience',
      dependencies: ['bat.innings', 'bat.outs', 'bat.not_outs', 'bat.ducks', 'bat.average'],
      dependencyLevel: MetricLevel.Primitive,
      calculateScore: (inputs) => {
        const innings = requiredPositiveInput(inputs, 'bat.innings')
        const outs = requiredInput(inputs, 'bat.outs')
        const notOuts = requiredInput(inputs, 'bat.not_outs')

        if (outs + notOuts > innings) {
          throw new Error('Dismissals and not-outs cannot exceed batting innings.')
        }

        const averageScore = normalize(requiredInput(inputs, 'bat.average'), AVERAGE_BENCHMARK)
        const duckRate = requiredInput(inputs, 'bat.ducks') / innings
        const duckAvoidanceScore = MAX_SCORE - normalize(duckRate, DUCK_RATE_BENCHMARK)
        const notOutRate = notOuts / innings
        const notOutResilienceScore = normalize(notOutRate, NOT_OUT_RATE_BENCHMARK)

        return roundScore(
          averageScore * 0.4 +
            duckAvoidanceScore * 0.35 +
            notOutResilienceScore * 0.25,
        )
      },
      metadata: {
        averageWeight: 0.4,
        duckAvoidanceWeight: 0.35,
        notOutResilienceWeight: 0.25,
        averageBenchmark: AVERAGE_BENCHMARK,
        duckRateBenchmark: DUCK_RATE_BENCHMARK,
        notOutRateBenchmark: NOT_OUT_RATE_BENCHMARK,
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

const getNumericInputs = (
  context: MetricExecutionContext,
  dependencies: readonly MetricId[],
  dependencyLevel: MetricLevel.Primitive | MetricLevel.Composite,
): InputResult => {
  const values = new Map<MetricId, number>()
  let sampleSize = 0

  for (const dependencyId of dependencies) {
    const result = context.results.get(dependencyId)

    if (!result) {
      return {
        ok: false,
        error: `Missing ${levelName(dependencyLevel)} dependency '${dependencyId}'.`,
      }
    }

    if (result.level !== dependencyLevel) {
      return {
        ok: false,
        error: `Dependency '${dependencyId}' is not a ${levelName(dependencyLevel)} metric.`,
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

const levelName = (level: MetricLevel.Primitive | MetricLevel.Composite): string => {
  return level === MetricLevel.Primitive ? 'primitive' : 'composite'
}
