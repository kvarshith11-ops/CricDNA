import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricId,
  type MetricResult,
} from '../../definitions/types'

interface BowlingCompositeConfig {
  readonly metricId: MetricId
  readonly name: string
  readonly dependencies: readonly MetricId[]
  readonly calculateScore: (inputs: ReadonlyMap<MetricId, number>) => number
  readonly metadata: Readonly<Record<string, string | number | boolean>>
}

const VERSION = '1.0.0'
const MIN_SCORE = 0
const MAX_SCORE = 100
const ECONOMY_UPPER_BENCHMARK = 10
const EXTRAS_PER_OVER_BENCHMARK = 1
const MAIDEN_RATE_BENCHMARK = 0.2
const WICKETS_PER_INNINGS_BENCHMARK = 2
const WICKETS_PER_MATCH_BENCHMARK = 3
const AVERAGE_UPPER_BENCHMARK = 50
const STRIKE_RATE_UPPER_BENCHMARK = 60

abstract class BowlingCompositeCalculator implements MetricCalculator {
  protected constructor(private readonly config: BowlingCompositeConfig) {}

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
        validationError: error instanceof Error ? error.message : 'Invalid bowling inputs.',
      })
    }

    if (!Number.isFinite(score) || score < MIN_SCORE || score > MAX_SCORE) {
      return this.result(score, inputResult.sampleSize, MetricStatus.FailedValidation, {
        validationError: 'Bowling composite score must be a finite value between 0 and 100.',
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
      category: MetricCategory.Bowling,
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

export class BowlControlCalculator extends BowlingCompositeCalculator {
  constructor() {
    super({
      metricId: 'bowl.control',
      name: 'Bowling Control',
      dependencies: [
        'bowl.economy',
        'bowl.wides',
        'bowl.no_balls',
        'bowl.overs',
        'bowl.maidens',
      ],
      calculateScore: (inputs) => {
        const overs = requiredPositiveInput(inputs, 'bowl.overs')
        const economyScore = inverseNormalize(
          requiredInput(inputs, 'bowl.economy'),
          ECONOMY_UPPER_BENCHMARK,
        )
        const extrasPerOver =
          (requiredInput(inputs, 'bowl.wides') + requiredInput(inputs, 'bowl.no_balls')) /
          overs
        const extrasDisciplineScore = inverseNormalize(
          extrasPerOver,
          EXTRAS_PER_OVER_BENCHMARK,
        )
        const maidenRate = requiredInput(inputs, 'bowl.maidens') / overs
        const maidenScore = normalize(maidenRate, MAIDEN_RATE_BENCHMARK)

        return roundScore(
          economyScore * 0.5 + extrasDisciplineScore * 0.3 + maidenScore * 0.2,
        )
      },
      metadata: {
        economyWeight: 0.5,
        extrasDisciplineWeight: 0.3,
        maidenRateWeight: 0.2,
        economyUpperBenchmark: ECONOMY_UPPER_BENCHMARK,
        extrasPerOverBenchmark: EXTRAS_PER_OVER_BENCHMARK,
        maidenRateBenchmark: MAIDEN_RATE_BENCHMARK,
      },
    })
  }
}

export class BowlWicketThreatCalculator extends BowlingCompositeCalculator {
  constructor() {
    super({
      metricId: 'bowl.wicket_threat',
      name: 'Wicket Threat',
      dependencies: ['bowl.wickets', 'bowl.innings', 'bowl.matches'],
      calculateScore: (inputs) => {
        const wickets = requiredInput(inputs, 'bowl.wickets')
        const innings = requiredPositiveInput(inputs, 'bowl.innings')
        const matches = requiredPositiveInput(inputs, 'bowl.matches')
        const wicketsPerInningsScore = normalize(
          wickets / innings,
          WICKETS_PER_INNINGS_BENCHMARK,
        )
        const wicketsPerMatchScore = normalize(
          wickets / matches,
          WICKETS_PER_MATCH_BENCHMARK,
        )

        return roundScore(wicketsPerInningsScore * 0.7 + wicketsPerMatchScore * 0.3)
      },
      metadata: {
        wicketsPerInningsWeight: 0.7,
        wicketsPerMatchWeight: 0.3,
        wicketsPerInningsBenchmark: WICKETS_PER_INNINGS_BENCHMARK,
        wicketsPerMatchBenchmark: WICKETS_PER_MATCH_BENCHMARK,
      },
    })
  }
}

export class BowlEffectivenessCalculator extends BowlingCompositeCalculator {
  constructor() {
    super({
      metricId: 'bowl.effectiveness',
      name: 'Bowling Effectiveness',
      dependencies: [
        'bowl.economy',
        'bowl.average',
        'bowl.strike_rate',
        'bowl.wickets',
        'bowl.innings',
      ],
      calculateScore: (inputs) => {
        const wicketsPerInningsScore = normalize(
          requiredInput(inputs, 'bowl.wickets') /
            requiredPositiveInput(inputs, 'bowl.innings'),
          WICKETS_PER_INNINGS_BENCHMARK,
        )
        const economyScore = inverseNormalize(
          requiredInput(inputs, 'bowl.economy'),
          ECONOMY_UPPER_BENCHMARK,
        )
        const averageScore = inverseNormalize(
          requiredInput(inputs, 'bowl.average'),
          AVERAGE_UPPER_BENCHMARK,
        )
        const strikeRateScore = inverseNormalize(
          requiredInput(inputs, 'bowl.strike_rate'),
          STRIKE_RATE_UPPER_BENCHMARK,
        )

        return roundScore(
          economyScore * 0.3 +
            averageScore * 0.3 +
            strikeRateScore * 0.25 +
            wicketsPerInningsScore * 0.15,
        )
      },
      metadata: {
        economyWeight: 0.3,
        averageWeight: 0.3,
        strikeRateWeight: 0.25,
        wicketsPerInningsWeight: 0.15,
        economyUpperBenchmark: ECONOMY_UPPER_BENCHMARK,
        averageUpperBenchmark: AVERAGE_UPPER_BENCHMARK,
        strikeRateUpperBenchmark: STRIKE_RATE_UPPER_BENCHMARK,
        wicketsPerInningsBenchmark: WICKETS_PER_INNINGS_BENCHMARK,
      },
    })
  }
}

export class BowlRunControlCalculator extends BowlingCompositeCalculator {
  constructor() {
    super({
      metricId: 'bowl.run_control',
      name: 'Bowling Run Control',
      dependencies: ['bowl.economy', 'bowl.maidens', 'bowl.overs'],
      calculateScore: (inputs) => {
        const overs = requiredPositiveInput(inputs, 'bowl.overs')
        const economyScore = inverseNormalize(
          requiredInput(inputs, 'bowl.economy'),
          ECONOMY_UPPER_BENCHMARK,
        )
        const maidenRate = requiredInput(inputs, 'bowl.maidens') / overs
        const maidenScore = normalize(maidenRate, MAIDEN_RATE_BENCHMARK)

        return roundScore(economyScore * 0.7 + maidenScore * 0.3)
      },
      metadata: {
        economyWeight: 0.7,
        maidenRateWeight: 0.3,
        economyUpperBenchmark: ECONOMY_UPPER_BENCHMARK,
        maidenRateBenchmark: MAIDEN_RATE_BENCHMARK,
      },
    })
  }
}

export class BowlDisciplineCalculator extends BowlingCompositeCalculator {
  constructor() {
    super({
      metricId: 'bowl.discipline',
      name: 'Bowling Discipline',
      dependencies: ['bowl.wides', 'bowl.no_balls', 'bowl.overs'],
      calculateScore: (inputs) => {
        const overs = requiredPositiveInput(inputs, 'bowl.overs')
        const extrasPerOver =
          (requiredInput(inputs, 'bowl.wides') + requiredInput(inputs, 'bowl.no_balls')) /
          overs

        return roundScore(inverseNormalize(extrasPerOver, EXTRAS_PER_OVER_BENCHMARK))
      },
      metadata: {
        extrasPerOverWeight: 1,
        extrasPerOverBenchmark: EXTRAS_PER_OVER_BENCHMARK,
      },
    })
  }
}

export class BowlWicketEfficiencyCalculator extends BowlingCompositeCalculator {
  constructor() {
    super({
      metricId: 'bowl.wicket_efficiency',
      name: 'Bowling Wicket Efficiency',
      dependencies: ['bowl.average', 'bowl.strike_rate', 'bowl.wickets', 'bowl.innings'],
      calculateScore: (inputs) => {
        const averageScore = inverseNormalize(
          requiredInput(inputs, 'bowl.average'),
          AVERAGE_UPPER_BENCHMARK,
        )
        const strikeRateScore = inverseNormalize(
          requiredInput(inputs, 'bowl.strike_rate'),
          STRIKE_RATE_UPPER_BENCHMARK,
        )
        const wicketsPerInningsScore = normalize(
          requiredInput(inputs, 'bowl.wickets') /
            requiredPositiveInput(inputs, 'bowl.innings'),
          WICKETS_PER_INNINGS_BENCHMARK,
        )

        return roundScore(
          averageScore * 0.4 + strikeRateScore * 0.4 + wicketsPerInningsScore * 0.2,
        )
      },
      metadata: {
        averageWeight: 0.4,
        strikeRateWeight: 0.4,
        wicketsPerInningsWeight: 0.2,
        averageUpperBenchmark: AVERAGE_UPPER_BENCHMARK,
        strikeRateUpperBenchmark: STRIKE_RATE_UPPER_BENCHMARK,
        wicketsPerInningsBenchmark: WICKETS_PER_INNINGS_BENCHMARK,
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

const inverseNormalize = (value: number, upperBenchmark: number): number => {
  if (upperBenchmark <= 0) {
    return 0
  }

  return clamp(MAX_SCORE - (value / upperBenchmark) * MAX_SCORE)
}

const clamp = (value: number): number => {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, value))
}

const roundScore = (value: number): number => {
  return Math.round(value * 100) / 100
}
