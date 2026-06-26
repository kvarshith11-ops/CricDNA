import type { BattingInningsRecord } from '../../../domain/models/PlayerMatchRecord'
import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricResult,
} from '../../definitions/types'

interface BattingScoringTotals {
  readonly matches: number
  readonly innings: readonly BattingInningsRecord[]
  readonly runs: number
  readonly ballsFaced: number
  readonly fours: number
  readonly sixes: number
  readonly boundaries: number
  readonly boundaryRuns: number
}

interface BattingScoringMetricConfig {
  readonly metricId: string
  readonly name: string
  readonly unit: string
  readonly calculateValue: (totals: BattingScoringTotals) => number | null
  readonly unavailableWhen?: (totals: BattingScoringTotals) => string | undefined
  readonly validate?: (
    value: number,
    totals: BattingScoringTotals,
  ) => string | undefined
}

const VERSION = '1.0.0'

abstract class BattingScoringCalculator implements MetricCalculator {
  protected constructor(private readonly config: BattingScoringMetricConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const totals = getBattingScoringTotals(context)
    const baseValidation = validateBattingScoringTotals(totals)

    if (baseValidation) {
      return this.result(null, totals.innings.length, MetricStatus.FailedValidation, {
        validationError: baseValidation,
      })
    }

    const unavailableReason = this.config.unavailableWhen?.(totals)

    if (unavailableReason) {
      return this.result(null, totals.innings.length, MetricStatus.MissingData, {
        reason: unavailableReason,
      })
    }

    const value = this.config.calculateValue(totals)

    if (value === null || !Number.isFinite(value)) {
      return this.result(null, totals.innings.length, MetricStatus.MissingData, {
        reason: 'Metric calculation is not possible from available batting data.',
      })
    }

    const valueValidation = this.config.validate?.(value, totals)

    if (valueValidation) {
      return this.result(value, totals.innings.length, MetricStatus.FailedValidation, {
        validationError: valueValidation,
      })
    }

    return this.result(value, totals.innings.length, MetricStatus.Success)
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
      level: MetricLevel.Primitive,
      value,
      unit: this.config.unit,
      sampleSize,
      confidence: status === MetricStatus.Success ? 1 : 0,
      status,
      version: VERSION,
      metadata,
    }
  }
}

export class BatStrikeRateCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.strike_rate',
      name: 'Strike Rate',
      unit: 'runs per 100 balls',
      unavailableWhen: requireBallsFaced,
      calculateValue: ({ runs, ballsFaced }) => (runs / ballsFaced) * 100,
    })
  }
}

export class BatBoundaryRunsCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.boundary_runs',
      name: 'Boundary Runs',
      unit: 'runs',
      calculateValue: ({ boundaryRuns }) => boundaryRuns,
      validate: (value, { runs }) =>
        value > runs ? 'Boundary runs cannot exceed total runs.' : undefined,
    })
  }
}

export class BatBoundaryPercentageCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.boundary_percentage',
      name: 'Boundary Percentage',
      unit: 'percent',
      unavailableWhen: requireRuns,
      calculateValue: ({ boundaryRuns, runs }) => (boundaryRuns / runs) * 100,
      validate: validatePercentage,
    })
  }
}

export class BatBoundaryFrequencyCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.boundary_frequency',
      name: 'Boundary Frequency',
      unit: 'balls per boundary',
      unavailableWhen: requireBoundaries,
      calculateValue: ({ ballsFaced, boundaries }) => ballsFaced / boundaries,
    })
  }
}

export class BatRunsPerBallCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.runs_per_ball',
      name: 'Runs Per Ball',
      unit: 'runs per ball',
      unavailableWhen: requireBallsFaced,
      calculateValue: ({ runs, ballsFaced }) => runs / ballsFaced,
    })
  }
}

export class BatRunsPerBoundaryCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.runs_per_boundary',
      name: 'Runs Per Boundary',
      unit: 'runs per boundary',
      unavailableWhen: requireBoundaries,
      calculateValue: ({ runs, boundaries }) => runs / boundaries,
    })
  }
}

export class BatFoursCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.fours',
      name: 'Fours',
      unit: 'fours',
      calculateValue: ({ fours }) => fours,
    })
  }
}

export class BatSixesCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.sixes',
      name: 'Sixes',
      unit: 'sixes',
      calculateValue: ({ sixes }) => sixes,
    })
  }
}

export class BatFoursPercentageCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.fours_percentage',
      name: 'Fours Percentage',
      unit: 'percent',
      unavailableWhen: requireRuns,
      calculateValue: ({ fours, runs }) => ((fours * 4) / runs) * 100,
      validate: validatePercentage,
    })
  }
}

export class BatSixesPercentageCalculator extends BattingScoringCalculator {
  constructor() {
    super({
      metricId: 'bat.sixes_percentage',
      name: 'Sixes Percentage',
      unit: 'percent',
      unavailableWhen: requireRuns,
      calculateValue: ({ sixes, runs }) => ((sixes * 6) / runs) * 100,
      validate: validatePercentage,
    })
  }
}

const getBattingScoringTotals = (
  context: MetricExecutionContext,
): BattingScoringTotals => {
  const innings = context.pkm.history.records.flatMap((record) => record.batting.innings)
  const runs = innings.reduce((total, inning) => total + inning.runs, 0)
  const ballsFaced = innings.reduce((total, inning) => total + inning.ballsFaced, 0)
  const fours = innings.reduce((total, inning) => total + inning.fours, 0)
  const sixes = innings.reduce((total, inning) => total + inning.sixes, 0)
  const boundaries = fours + sixes

  return {
    matches: context.pkm.history.records.length,
    innings,
    runs,
    ballsFaced,
    fours,
    sixes,
    boundaries,
    boundaryRuns: fours * 4 + sixes * 6,
  }
}

const validateBattingScoringTotals = (
  totals: BattingScoringTotals,
): string | undefined => {
  if (totals.matches === 0) {
    return 'Career is empty.'
  }

  for (const inning of totals.innings) {
    if (inning.inningsNumber < 1) {
      return 'Invalid innings number.'
    }

    if (
      inning.runs < 0 ||
      inning.ballsFaced < 0 ||
      inning.fours < 0 ||
      inning.sixes < 0
    ) {
      return 'Batting scoring values cannot be negative.'
    }
  }

  if (totals.boundaryRuns > totals.runs) {
    return 'Boundary runs cannot exceed total runs.'
  }

  return undefined
}

const requireBallsFaced = ({ ballsFaced }: BattingScoringTotals): string | undefined =>
  ballsFaced === 0 ? 'Balls faced is zero.' : undefined

const requireRuns = ({ runs }: BattingScoringTotals): string | undefined =>
  runs === 0 ? 'Runs is zero.' : undefined

const requireBoundaries = ({
  boundaries,
}: BattingScoringTotals): string | undefined =>
  boundaries === 0 ? 'Boundary count is zero.' : undefined

const validatePercentage = (value: number): string | undefined =>
  value < 0 || value > 100 ? 'Percentage must be between 0 and 100.' : undefined
