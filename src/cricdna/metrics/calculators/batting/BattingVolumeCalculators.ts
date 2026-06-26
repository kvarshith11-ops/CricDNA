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

interface BattingVolumeMetricConfig {
  readonly metricId: string
  readonly name: string
  readonly unit: string
  readonly calculateValue: (innings: readonly BattingInningsRecord[], matches: number) => number
  readonly validate?: (
    value: number,
    innings: readonly BattingInningsRecord[],
    matches: number,
  ) => string | undefined
}

const VERSION = '1.0.0'

abstract class BattingVolumeCalculator implements MetricCalculator {
  protected constructor(private readonly config: BattingVolumeMetricConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const innings = getBattingInnings(context)
    const matches = context.pkm.history.records.length
    const baseValidation = validateBattingHistory(innings, matches)

    if (baseValidation) {
      return this.result(null, innings.length, MetricStatus.FailedValidation, {
        validationError: baseValidation,
      })
    }

    const value = this.config.calculateValue(innings, matches)
    const valueValidation = this.config.validate?.(value, innings, matches)

    if (valueValidation) {
      return this.result(value, innings.length, MetricStatus.FailedValidation, {
        validationError: valueValidation,
      })
    }

    return this.result(value, innings.length, MetricStatus.Success)
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

export class BatMatchesCalculator extends BattingVolumeCalculator {
  constructor() {
    super({
      metricId: 'bat.matches',
      name: 'Batting Matches',
      unit: 'matches',
      calculateValue: (_innings, matches) => matches,
      validate: (value) =>
        value < 0 ? 'Batting matches cannot be negative.' : undefined,
    })
  }
}

export class BatInningsCalculator extends BattingVolumeCalculator {
  constructor() {
    super({
      metricId: 'bat.innings',
      name: 'Batting Innings',
      unit: 'innings',
      calculateValue: (innings) => innings.filter((inning) => inning.didBat).length,
      validate: (value, innings) =>
        value > innings.length
          ? 'Batting innings cannot exceed batting history rows.'
          : undefined,
    })
  }
}

export class BatRunsCalculator extends BattingVolumeCalculator {
  constructor() {
    super({
      metricId: 'bat.runs',
      name: 'Batting Runs',
      unit: 'runs',
      calculateValue: (innings) =>
        innings.reduce((total, inning) => total + inning.runs, 0),
    })
  }
}

export class BatBallsFacedCalculator extends BattingVolumeCalculator {
  constructor() {
    super({
      metricId: 'bat.balls_faced',
      name: 'Balls Faced',
      unit: 'balls',
      calculateValue: (innings) =>
        innings.reduce((total, inning) => total + inning.ballsFaced, 0),
    })
  }
}

export class BatNotOutsCalculator extends BattingVolumeCalculator {
  constructor() {
    super({
      metricId: 'bat.not_outs',
      name: 'Not Outs',
      unit: 'innings',
      calculateValue: (innings) =>
        innings.filter((inning) => inning.didBat && !inning.dismissal).length +
        innings.filter(
          (inning) => inning.didBat && inning.dismissal?.kind === DismissalKind.NotOut,
        ).length,
      validate: (value, innings) =>
        value > innings.filter((inning) => inning.didBat).length
          ? 'Not outs cannot exceed batting innings.'
          : undefined,
    })
  }
}

export class BatHighestScoreCalculator extends BattingVolumeCalculator {
  constructor() {
    super({
      metricId: 'bat.highest_score',
      name: 'Highest Score',
      unit: 'runs',
      calculateValue: (innings) =>
        innings.length === 0
          ? 0
          : Math.max(...innings.filter((inning) => inning.didBat).map((inning) => inning.runs), 0),
      validate: (value, innings) => {
        const totalRuns = innings.reduce((total, inning) => total + inning.runs, 0)

        return value > totalRuns
          ? 'Highest score cannot exceed total career runs.'
          : undefined
      },
    })
  }
}

export class BatFiftiesCalculator extends BattingVolumeCalculator {
  constructor() {
    super({
      metricId: 'bat.fifties',
      name: 'Fifties',
      unit: 'innings',
      calculateValue: (innings) =>
        innings.filter((inning) => inning.didBat && inning.runs >= 50 && inning.runs < 100)
          .length,
      validate: (value, innings) =>
        value > innings.filter((inning) => inning.didBat).length
          ? 'Fifties cannot exceed batting innings.'
          : undefined,
    })
  }
}

export class BatHundredsCalculator extends BattingVolumeCalculator {
  constructor() {
    super({
      metricId: 'bat.hundreds',
      name: 'Hundreds',
      unit: 'innings',
      calculateValue: (innings) =>
        innings.filter((inning) => inning.didBat && inning.runs >= 100 && inning.runs < 200)
          .length,
      validate: (value, innings) =>
        value > innings.filter((inning) => inning.didBat).length
          ? 'Hundreds cannot exceed batting innings.'
          : undefined,
    })
  }
}

export class BatDoubleHundredsCalculator extends BattingVolumeCalculator {
  constructor() {
    super({
      metricId: 'bat.double_hundreds',
      name: 'Double Hundreds',
      unit: 'innings',
      calculateValue: (innings) =>
        innings.filter((inning) => inning.didBat && inning.runs >= 200).length,
      validate: (value, innings) => {
        const hundreds = innings.filter(
          (inning) => inning.didBat && inning.runs >= 100,
        ).length

        return value > hundreds
          ? 'Double hundreds cannot exceed hundreds.'
          : undefined
      },
    })
  }
}

const getBattingInnings = (
  context: MetricExecutionContext,
): readonly BattingInningsRecord[] => {
  return context.pkm.history.records.flatMap((record) => record.batting.innings)
}

const validateBattingHistory = (
  innings: readonly BattingInningsRecord[],
  matches: number,
): string | undefined => {
  if (matches === 0) {
    return 'Career is empty.'
  }

  for (const inning of innings) {
    if (inning.inningsNumber < 1) {
      return 'Invalid innings number.'
    }

    if (
      inning.runs < 0 ||
      inning.ballsFaced < 0 ||
      inning.fours < 0 ||
      inning.sixes < 0
    ) {
      return 'Batting volume values cannot be negative.'
    }
  }

  return undefined
}
