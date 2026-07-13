import type { BowlingSpellRecord } from '../../../domain/models/PlayerMatchRecord'
import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricResult,
} from '../../definitions/types'

interface BowlingCoreTotals {
  readonly matches: number
  readonly spells: readonly BowlingSpellRecord[]
  readonly bowlingMatches: number
  readonly bowlingInnings: number
  readonly overs: number
  readonly balls: number
  readonly maidens: number
  readonly runsConceded: number
  readonly wickets: number
  readonly noBalls: number
  readonly wides: number
}

interface BowlingCoreMetricConfig {
  readonly metricId: string
  readonly name: string
  readonly unit: string
  readonly calculateValue: (totals: BowlingCoreTotals) => number | null
  readonly unavailableWhen?: (totals: BowlingCoreTotals) => string | undefined
  readonly validate?: (
    value: number,
    totals: BowlingCoreTotals,
  ) => string | undefined
}

const VERSION = '1.0.0'
const BALLS_PER_OVER = 6

abstract class BowlingCoreCalculator implements MetricCalculator {
  protected constructor(private readonly config: BowlingCoreMetricConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const totals = getBowlingCoreTotals(context)
    const baseValidation = validateBowlingCoreTotals(totals)

    if (baseValidation) {
      return this.result(null, totals.spells.length, MetricStatus.FailedValidation, {
        validationError: baseValidation,
      })
    }

    const unavailableReason = this.config.unavailableWhen?.(totals)

    if (unavailableReason) {
      return this.result(null, totals.spells.length, MetricStatus.MissingData, {
        reason: unavailableReason,
      })
    }

    const value = this.config.calculateValue(totals)

    if (value === null || !Number.isFinite(value)) {
      return this.result(null, totals.spells.length, MetricStatus.MissingData, {
        reason: 'Metric calculation is not possible from available bowling data.',
      })
    }

    const valueValidation = this.config.validate?.(value, totals)

    if (valueValidation) {
      return this.result(value, totals.spells.length, MetricStatus.FailedValidation, {
        validationError: valueValidation,
      })
    }

    return this.result(value, totals.spells.length, MetricStatus.Success)
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

export class BowlMatchesCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.matches',
      name: 'Bowling Matches',
      unit: 'matches',
      calculateValue: ({ bowlingMatches }) => bowlingMatches,
    })
  }
}

export class BowlInningsCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.innings',
      name: 'Bowling Innings',
      unit: 'innings',
      calculateValue: ({ bowlingInnings }) => bowlingInnings,
    })
  }
}

export class BowlOversCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.overs',
      name: 'Overs',
      unit: 'overs',
      calculateValue: ({ overs }) => overs,
    })
  }
}

export class BowlBallsCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.balls',
      name: 'Balls',
      unit: 'balls',
      calculateValue: ({ balls }) => balls,
    })
  }
}

export class BowlMaidensCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.maidens',
      name: 'Maidens',
      unit: 'overs',
      calculateValue: ({ maidens }) => maidens,
    })
  }
}

export class BowlRunsConcededCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.runs_conceded',
      name: 'Runs Conceded',
      unit: 'runs',
      calculateValue: ({ runsConceded }) => runsConceded,
    })
  }
}

export class BowlWicketsCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.wickets',
      name: 'Wickets',
      unit: 'wickets',
      calculateValue: ({ wickets }) => wickets,
    })
  }
}

export class BowlNoBallsCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.no_balls',
      name: 'No Balls',
      unit: 'balls',
      calculateValue: ({ noBalls }) => noBalls,
    })
  }
}

export class BowlWidesCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.wides',
      name: 'Wides',
      unit: 'balls',
      calculateValue: ({ wides }) => wides,
    })
  }
}

export class BowlEconomyCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.economy',
      name: 'Economy',
      unit: 'runs per over',
      unavailableWhen: requireBalls,
      calculateValue: ({ runsConceded, balls }) =>
        runsConceded / (balls / BALLS_PER_OVER),
      validate: (value) =>
        value < 0 || !Number.isFinite(value)
          ? 'Economy must be a finite non-negative number.'
          : undefined,
    })
  }
}

export class BowlAverageCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.average',
      name: 'Bowling Average',
      unit: 'runs per wicket',
      unavailableWhen: requireWickets,
      calculateValue: ({ runsConceded, wickets }) => runsConceded / wickets,
      validate: (value) =>
        value < 0 || !Number.isFinite(value)
          ? 'Bowling average must be a finite non-negative number.'
          : undefined,
    })
  }
}

export class BowlStrikeRateCalculator extends BowlingCoreCalculator {
  constructor() {
    super({
      metricId: 'bowl.strike_rate',
      name: 'Bowling Strike Rate',
      unit: 'balls per wicket',
      unavailableWhen: requireWickets,
      calculateValue: ({ balls, wickets }) => balls / wickets,
      validate: (value) =>
        value < 0 || !Number.isFinite(value)
          ? 'Bowling strike rate must be a finite non-negative number.'
          : undefined,
    })
  }
}

const getBowlingCoreTotals = (context: MetricExecutionContext): BowlingCoreTotals => {
  const records = context.pkm.history.records
  const spells = records.flatMap((record) => record.bowling.spells)
  const bowledSpells = spells.filter((spell) => spell.didBowl)

  return {
    matches: records.length,
    spells,
    bowlingMatches: records.filter((record) =>
      record.bowling.spells.some((spell) => spell.didBowl),
    ).length,
    bowlingInnings: bowledSpells.length,
    overs: bowledSpells.reduce((total, spell) => total + spell.overs, 0),
    balls: bowledSpells.reduce((total, spell) => total + spell.balls, 0),
    maidens: bowledSpells.reduce((total, spell) => total + spell.maidens, 0),
    runsConceded: bowledSpells.reduce(
      (total, spell) => total + spell.runsConceded,
      0,
    ),
    wickets: bowledSpells.reduce((total, spell) => total + spell.wickets, 0),
    noBalls: bowledSpells.reduce((total, spell) => total + spell.noBalls, 0),
    wides: bowledSpells.reduce((total, spell) => total + spell.wides, 0),
  }
}

const validateBowlingCoreTotals = (
  totals: BowlingCoreTotals,
): string | undefined => {
  if (totals.matches === 0) {
    return 'Career is empty.'
  }

  for (const spell of totals.spells) {
    if (spell.inningsNumber < 1) {
      return 'Invalid innings number.'
    }

    if (
      spell.overs < 0 ||
      spell.balls < 0 ||
      spell.maidens < 0 ||
      spell.runsConceded < 0 ||
      spell.wickets < 0 ||
      spell.noBalls < 0 ||
      spell.wides < 0
    ) {
      return 'Bowling core values cannot be negative.'
    }

    if (spell.balls > spell.overs * BALLS_PER_OVER) {
      return 'Legal balls cannot exceed overs converted to balls.'
    }

    if (spell.maidens > spell.overs) {
      return 'Maidens cannot exceed overs.'
    }
  }

  return undefined
}

const requireBalls = ({ balls }: BowlingCoreTotals): string | undefined =>
  balls === 0 ? 'Balls is zero.' : undefined

const requireWickets = ({ wickets }: BowlingCoreTotals): string | undefined =>
  wickets === 0 ? 'Wickets is zero.' : undefined
