import type { BattingInningsRecord } from '../../../domain/models/PlayerMatchRecord'
import { DismissalKind } from '../../../domain/types/common'
import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricResult,
} from '../../definitions/types'

interface BattingDismissalTotals {
  readonly matches: number
  readonly innings: readonly BattingInningsRecord[]
  readonly battingInnings: number
  readonly runs: number
  readonly outs: number
}

interface BattingAverageMetricConfig {
  readonly metricId: string
  readonly name: string
  readonly unit: string
  readonly calculateValue: (totals: BattingDismissalTotals) => number | null
  readonly unavailableWhen?: (totals: BattingDismissalTotals) => string | undefined
  readonly validate?: (
    value: number,
    totals: BattingDismissalTotals,
  ) => string | undefined
}

const VERSION = '1.0.0'

abstract class BattingAverageCalculator implements MetricCalculator {
  protected constructor(private readonly config: BattingAverageMetricConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const totals = getBattingDismissalTotals(context)
    const baseValidation = validateBattingDismissalTotals(totals)

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
        reason: 'Metric calculation is not possible from available dismissal data.',
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

export class BatOutsCalculator extends BattingAverageCalculator {
  constructor() {
    super({
      metricId: 'bat.outs',
      name: 'Outs',
      unit: 'innings',
      calculateValue: ({ outs }) => outs,
    })
  }
}

export class BatAverageCalculator extends BattingAverageCalculator {
  constructor() {
    super({
      metricId: 'bat.average',
      name: 'Batting Average',
      unit: 'runs per dismissal',
      unavailableWhen: requireOuts,
      calculateValue: ({ runs, outs }) => runs / outs,
      validate: (value) =>
        value < 0 || !Number.isFinite(value)
          ? 'Batting average must be a finite non-negative number.'
          : undefined,
    })
  }
}

export class BatDucksCalculator extends BattingAverageCalculator {
  constructor() {
    super({
      metricId: 'bat.ducks',
      name: 'Ducks',
      unit: 'innings',
      calculateValue: ({ innings }) =>
        innings.filter((inning) => isDismissed(inning) && inning.runs === 0).length,
      validate: (value, { outs }) =>
        value > outs ? 'Ducks cannot exceed outs.' : undefined,
    })
  }
}

const getBattingDismissalTotals = (
  context: MetricExecutionContext,
): BattingDismissalTotals => {
  const innings = context.pkm.history.records.flatMap((record) => record.batting.innings)
  const battingInnings = innings.filter((inning) => inning.didBat).length
  const runs = innings.reduce((total, inning) => total + inning.runs, 0)
  const outs = innings.filter(isDismissed).length

  return {
    matches: context.pkm.history.records.length,
    innings,
    battingInnings,
    runs,
    outs,
  }
}

const validateBattingDismissalTotals = (
  totals: BattingDismissalTotals,
): string | undefined => {
  if (totals.matches === 0) {
    return 'Career is empty.'
  }

  for (const inning of totals.innings) {
    if (inning.inningsNumber < 1) {
      return 'Invalid innings number.'
    }

    if (inning.runs < 0) {
      return 'Batting dismissal values cannot contain negative runs.'
    }
  }

  if (totals.outs > totals.battingInnings) {
    return 'Dismissals cannot exceed batting innings.'
  }

  return undefined
}

const isDismissed = (inning: BattingInningsRecord): boolean => {
  return Boolean(
    inning.didBat &&
      inning.dismissal &&
      inning.dismissal.kind !== DismissalKind.NotOut,
  )
}

const requireOuts = ({ outs }: BattingDismissalTotals): string | undefined =>
  outs === 0 ? 'Outs is zero.' : undefined
