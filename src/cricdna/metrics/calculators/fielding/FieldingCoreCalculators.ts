import type { FieldingInningsRecord } from '../../../domain/models/PlayerMatchRecord'
import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricResult,
} from '../../definitions/types'

interface FieldingCoreTotals {
  readonly matches: number
  readonly innings: readonly FieldingInningsRecord[]
  readonly fieldingMatches: number
  readonly fieldingInnings: number
  readonly catches: number
  readonly stumpings: number
  readonly runOuts: number
  readonly assistedRunOuts: number
  readonly dismissals: number
}

interface FieldingCoreMetricConfig {
  readonly metricId: string
  readonly name: string
  readonly unit: string
  readonly calculateValue: (totals: FieldingCoreTotals) => number
  readonly validate?: (
    value: number,
    totals: FieldingCoreTotals,
  ) => string | undefined
}

const VERSION = '1.0.0'

abstract class FieldingCoreCalculator implements MetricCalculator {
  protected constructor(private readonly config: FieldingCoreMetricConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const totals = getFieldingCoreTotals(context)
    const baseValidation = validateFieldingCoreTotals(totals)

    if (baseValidation) {
      return this.result(null, totals.innings.length, MetricStatus.FailedValidation, {
        validationError: baseValidation,
      })
    }

    const value = this.config.calculateValue(totals)
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
      category: MetricCategory.Fielding,
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

export class FieldMatchesCalculator extends FieldingCoreCalculator {
  constructor() {
    super({
      metricId: 'field.matches',
      name: 'Fielding Matches',
      unit: 'matches',
      calculateValue: ({ fieldingMatches }) => fieldingMatches,
    })
  }
}

export class FieldInningsCalculator extends FieldingCoreCalculator {
  constructor() {
    super({
      metricId: 'field.innings',
      name: 'Fielding Innings',
      unit: 'innings',
      calculateValue: ({ fieldingInnings }) => fieldingInnings,
    })
  }
}

export class FieldCatchesCalculator extends FieldingCoreCalculator {
  constructor() {
    super({
      metricId: 'field.catches',
      name: 'Catches',
      unit: 'catches',
      calculateValue: ({ catches }) => catches,
    })
  }
}

export class FieldStumpingsCalculator extends FieldingCoreCalculator {
  constructor() {
    super({
      metricId: 'field.stumpings',
      name: 'Stumpings',
      unit: 'stumpings',
      calculateValue: ({ stumpings }) => stumpings,
    })
  }
}

export class FieldRunOutsCalculator extends FieldingCoreCalculator {
  constructor() {
    super({
      metricId: 'field.run_outs',
      name: 'Run Outs',
      unit: 'run outs',
      calculateValue: ({ runOuts }) => runOuts,
    })
  }
}

export class FieldAssistedRunOutsCalculator extends FieldingCoreCalculator {
  constructor() {
    super({
      metricId: 'field.assisted_run_outs',
      name: 'Assisted Run Outs',
      unit: 'run outs',
      calculateValue: ({ assistedRunOuts }) => assistedRunOuts,
    })
  }
}

export class FieldDismissalsCalculator extends FieldingCoreCalculator {
  constructor() {
    super({
      metricId: 'field.dismissals',
      name: 'Fielding Dismissals',
      unit: 'dismissals',
      calculateValue: ({ dismissals }) => dismissals,
      validate: (value, totals) =>
        value !==
        totals.catches + totals.stumpings + totals.runOuts + totals.assistedRunOuts
          ? 'Dismissals must equal catches, stumpings, run outs, and assisted run outs.'
          : undefined,
    })
  }
}

const getFieldingCoreTotals = (
  context: MetricExecutionContext,
): FieldingCoreTotals => {
  const records = context.pkm.history.records
  const innings = records.flatMap((record) => record.fielding.innings)
  const catches = innings.reduce((total, inning) => total + inning.catches, 0)
  const stumpings = innings.reduce((total, inning) => total + inning.stumpings, 0)
  const runOuts = innings.reduce((total, inning) => total + inning.runOutsDirect, 0)
  const assistedRunOuts = innings.reduce(
    (total, inning) => total + inning.runOutsAssisted,
    0,
  )

  return {
    matches: records.length,
    innings,
    fieldingMatches: records.filter((record) => record.fielding.innings.length > 0)
      .length,
    fieldingInnings: innings.length,
    catches,
    stumpings,
    runOuts,
    assistedRunOuts,
    dismissals: catches + stumpings + runOuts + assistedRunOuts,
  }
}

const validateFieldingCoreTotals = (
  totals: FieldingCoreTotals,
): string | undefined => {
  if (totals.matches === 0) {
    return 'Career is empty.'
  }

  for (const inning of totals.innings) {
    if (inning.inningsNumber < 1) {
      return 'Invalid innings number.'
    }

    if (
      inning.catches < 0 ||
      inning.stumpings < 0 ||
      inning.runOutsDirect < 0 ||
      inning.runOutsAssisted < 0
    ) {
      return 'Fielding core values cannot be negative.'
    }
  }

  if (totals.dismissals < 0) {
    return 'Dismissal totals cannot be negative.'
  }

  return undefined
}
