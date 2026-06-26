import type {
  BowlingProgressionPoint,
  PlayerMatchRecord,
  ScoreProgressionPoint,
} from '../../../domain/models/PlayerMatchRecord'
import type { OverBallRef } from '../../../domain/types/common'
import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricResult,
} from '../../definitions/types'

interface ProgressionCoreTotals {
  readonly records: readonly PlayerMatchRecord[]
  readonly matches: number
  readonly battingPoints: readonly ScoreProgressionPoint[]
  readonly bowlingPoints: readonly BowlingProgressionPoint[]
  readonly battingPointCount: number
  readonly bowlingPointCount: number
  readonly totalPointCount: number
  readonly inningsProgressions: string
}

interface ProgressionCoreMetricConfig {
  readonly metricId: string
  readonly name: string
  readonly unit: string
  readonly calculateValue: (totals: ProgressionCoreTotals) => number | string
}

const VERSION = '1.0.0'

abstract class ProgressionCoreCalculator implements MetricCalculator {
  protected constructor(private readonly config: ProgressionCoreMetricConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const totals = getProgressionCoreTotals(context)
    const validationError = validateProgressionCoreTotals(totals)

    if (validationError) {
      return this.result(null, totals.records.length, MetricStatus.FailedValidation, {
        validationError,
      })
    }

    return this.result(
      this.config.calculateValue(totals),
      totals.records.length,
      MetricStatus.Success,
    )
  }

  private result(
    value: number | string | null,
    sampleSize: number,
    status: MetricStatus,
    metadata: Readonly<Record<string, string | number | boolean>> = {},
  ): MetricResult {
    return {
      metricId: this.config.metricId,
      name: this.config.name,
      category: MetricCategory.Progression,
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

export class ProgressionInningsProgressionsCalculator extends ProgressionCoreCalculator {
  constructor() {
    super({
      metricId: 'progression.innings_progressions',
      name: 'Innings Progressions',
      unit: 'json',
      calculateValue: ({ inningsProgressions }) => inningsProgressions,
    })
  }
}

export class ProgressionRunProgressionPointsCalculator extends ProgressionCoreCalculator {
  constructor() {
    super({
      metricId: 'progression.run_progression_points',
      name: 'Run Progression Points',
      unit: 'points',
      calculateValue: ({ battingPointCount }) => battingPointCount,
    })
  }
}

export class ProgressionWicketProgressionPointsCalculator extends ProgressionCoreCalculator {
  constructor() {
    super({
      metricId: 'progression.wicket_progression_points',
      name: 'Wicket Progression Points',
      unit: 'points',
      calculateValue: ({ bowlingPointCount }) => bowlingPointCount,
    })
  }
}

export class ProgressionEventsCalculator extends ProgressionCoreCalculator {
  constructor() {
    super({
      metricId: 'progression.progression_events',
      name: 'Progression Events',
      unit: 'points',
      calculateValue: ({ totalPointCount }) => totalPointCount,
    })
  }
}

const getProgressionCoreTotals = (
  context: MetricExecutionContext,
): ProgressionCoreTotals => {
  const records = context.pkm.history.records
  const battingPoints = records.flatMap((record) => record.progression.battingTimeline)
  const bowlingPoints = records.flatMap((record) => record.progression.bowlingTimeline)

  return {
    records,
    matches: records.length,
    battingPoints,
    bowlingPoints,
    battingPointCount: battingPoints.length,
    bowlingPointCount: bowlingPoints.length,
    totalPointCount: battingPoints.length + bowlingPoints.length,
    inningsProgressions: toStableJson(countInningsProgressions(records)),
  }
}

const validateProgressionCoreTotals = (
  totals: ProgressionCoreTotals,
): string | undefined => {
  if (totals.matches === 0) {
    return 'Career is empty.'
  }

  for (const record of totals.records) {
    if (!record.progression) {
      return 'Progression history is missing.'
    }

    const battingValidation = validateTimeline(
      record.matchId,
      'batting',
      record.progression.battingTimeline.map((point) => point.ballRef),
    )

    if (battingValidation) {
      return battingValidation
    }

    const bowlingValidation = validateTimeline(
      record.matchId,
      'bowling',
      record.progression.bowlingTimeline.map((point) => point.ballRef),
    )

    if (bowlingValidation) {
      return bowlingValidation
    }
  }

  return undefined
}

const validateTimeline = (
  matchId: string,
  timelineName: string,
  ballRefs: readonly OverBallRef[],
): string | undefined => {
  const seenKeys = new Set<string>()
  const lastOrderByInnings = new Map<string, number>()

  for (const ballRef of ballRefs) {
    const validation = validateBallRef(ballRef)

    if (validation) {
      return validation
    }

    const inningsKey = ballRef.inningsId ?? 'unknown'
    const pointKey = `${matchId}:${timelineName}:${inningsKey}:${ballRef.over}:${ballRef.ballInOver}`

    if (seenKeys.has(pointKey)) {
      return 'Duplicate progression point.'
    }

    seenKeys.add(pointKey)

    const order = ballRef.over * 100 + ballRef.ballInOver
    const lastOrder = lastOrderByInnings.get(inningsKey)

    if (lastOrder !== undefined && order < lastOrder) {
      return 'Invalid over ordering.'
    }

    lastOrderByInnings.set(inningsKey, order)
  }

  return undefined
}

const validateBallRef = (ballRef: OverBallRef): string | undefined => {
  if (ballRef.over < 0) {
    return 'Progression over cannot be negative.'
  }

  if (ballRef.ballInOver < 0) {
    return 'Progression ball cannot be negative.'
  }

  return undefined
}

const countInningsProgressions = (
  records: readonly PlayerMatchRecord[],
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>()

  for (const record of records) {
    for (const point of record.progression.battingTimeline) {
      increment(counts, getInningsKey(point.ballRef))
    }

    for (const point of record.progression.bowlingTimeline) {
      increment(counts, getInningsKey(point.ballRef))
    }
  }

  return counts
}

const getInningsKey = (ballRef: OverBallRef): string => {
  return ballRef.inningsId?.trim() || 'Unknown'
}

const increment = (counts: Map<string, number>, key: string): void => {
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

const toStableJson = (counts: ReadonlyMap<string, number>): string => {
  const sortedEntries = [...counts.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )

  return JSON.stringify(Object.fromEntries(sortedEntries))
}
