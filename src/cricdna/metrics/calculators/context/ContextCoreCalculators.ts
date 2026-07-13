import type { PlayerMatchRecord } from '../../../domain/models/PlayerMatchRecord'
import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricResult,
} from '../../definitions/types'

interface ContextCoreTotals {
  readonly records: readonly PlayerMatchRecord[]
  readonly matches: number
  readonly formats: string
  readonly teams: string
  readonly opponents: string
  readonly venues: string
  readonly seasons: string
  readonly homeMatches: number
  readonly awayMatches: number
  readonly neutralMatches: number
}

interface ContextCoreMetricConfig {
  readonly metricId: string
  readonly name: string
  readonly unit: string
  readonly calculateValue: (totals: ContextCoreTotals) => number | string
}

const VERSION = '1.0.0'

abstract class ContextCoreCalculator implements MetricCalculator {
  protected constructor(private readonly config: ContextCoreMetricConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const totals = getContextCoreTotals(context)
    const validationError = validateContextCoreTotals(totals)

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
      category: MetricCategory.Context,
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

export class ContextMatchesCalculator extends ContextCoreCalculator {
  constructor() {
    super({
      metricId: 'context.matches',
      name: 'Context Matches',
      unit: 'matches',
      calculateValue: ({ matches }) => matches,
    })
  }
}

export class ContextFormatsCalculator extends ContextCoreCalculator {
  constructor() {
    super({
      metricId: 'context.formats',
      name: 'Formats',
      unit: 'json',
      calculateValue: ({ formats }) => formats,
    })
  }
}

export class ContextTeamsCalculator extends ContextCoreCalculator {
  constructor() {
    super({
      metricId: 'context.teams',
      name: 'Teams',
      unit: 'json',
      calculateValue: ({ teams }) => teams,
    })
  }
}

export class ContextOpponentsCalculator extends ContextCoreCalculator {
  constructor() {
    super({
      metricId: 'context.opponents',
      name: 'Opponents',
      unit: 'json',
      calculateValue: ({ opponents }) => opponents,
    })
  }
}

export class ContextVenuesCalculator extends ContextCoreCalculator {
  constructor() {
    super({
      metricId: 'context.venues',
      name: 'Venues',
      unit: 'json',
      calculateValue: ({ venues }) => venues,
    })
  }
}

export class ContextSeasonsCalculator extends ContextCoreCalculator {
  constructor() {
    super({
      metricId: 'context.seasons',
      name: 'Seasons',
      unit: 'json',
      calculateValue: ({ seasons }) => seasons,
    })
  }
}

export class ContextHomeMatchesCalculator extends ContextCoreCalculator {
  constructor() {
    super({
      metricId: 'context.home_matches',
      name: 'Home Matches',
      unit: 'matches',
      calculateValue: ({ homeMatches }) => homeMatches,
    })
  }
}

export class ContextAwayMatchesCalculator extends ContextCoreCalculator {
  constructor() {
    super({
      metricId: 'context.away_matches',
      name: 'Away Matches',
      unit: 'matches',
      calculateValue: ({ awayMatches }) => awayMatches,
    })
  }
}

export class ContextNeutralMatchesCalculator extends ContextCoreCalculator {
  constructor() {
    super({
      metricId: 'context.neutral_matches',
      name: 'Neutral Matches',
      unit: 'matches',
      calculateValue: ({ neutralMatches }) => neutralMatches,
    })
  }
}

const getContextCoreTotals = (context: MetricExecutionContext): ContextCoreTotals => {
  const records = context.pkm.history.records

  return {
    records,
    matches: records.length,
    formats: toStableJson(countBy(records.map((record) => record.context.format))),
    teams: toStableJson(countBy(records.map((record) => record.identity.team.name))),
    opponents: toStableJson(
      countBy(records.map((record) => record.identity.opponent.name)),
    ),
    venues: toStableJson(records.reduce(countVenue, new Map<string, number>())),
    seasons: toStableJson(countBy(records.map((record) => record.context.matchDate.slice(0, 4)))),
    homeMatches: records.filter(
      (record) => record.context.homeAwayNeutral === 'Home',
    ).length,
    awayMatches: records.filter(
      (record) => record.context.homeAwayNeutral === 'Away',
    ).length,
    neutralMatches: records.filter(
      (record) => record.context.homeAwayNeutral === 'Neutral',
    ).length,
  }
}

const validateContextCoreTotals = (
  totals: ContextCoreTotals,
): string | undefined => {
  if (totals.matches === 0) {
    return 'Career is empty.'
  }

  const matchIds = new Set<string>()

  for (const record of totals.records) {
    if (!record.context) {
      return 'Match context is missing.'
    }

    if (!record.matchId || matchIds.has(record.matchId)) {
      return 'Duplicate or missing match id.'
    }

    matchIds.add(record.matchId)

    if (!isValidIsoDate(record.context.matchDate)) {
      return 'Invalid match date.'
    }

    if (!record.context.format) {
      return 'Match format is missing.'
    }

    if (!record.identity.team.name || !record.identity.opponent.name) {
      return 'Team or opponent is missing.'
    }
  }

  return undefined
}

const countBy = (values: readonly string[]): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>()

  for (const rawValue of values) {
    const value = rawValue.trim()
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return counts
}

const countVenue = (
  counts: Map<string, number>,
  record: PlayerMatchRecord,
): Map<string, number> => {
  const venue = record.context.venue
  const parts = [venue?.ground, venue?.city, venue?.country]
    .filter((part): part is string => Boolean(part?.trim()))
    .map((part) => part.trim())
  const key = parts.length > 0 ? parts.join(', ') : 'Unknown'

  counts.set(key, (counts.get(key) ?? 0) + 1)

  return counts
}

const toStableJson = (counts: ReadonlyMap<string, number>): string => {
  const sortedEntries = [...counts.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )

  return JSON.stringify(Object.fromEntries(sortedEntries))
}

const isValidIsoDate = (date: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false
  }

  const parsed = new Date(`${date}T00:00:00.000Z`)

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date)
}
