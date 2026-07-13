import type {
  BehaviourEvent,
  PlayerMatchRecord,
} from '../../../domain/models/PlayerMatchRecord'
import {
  MetricCategory,
  MetricLevel,
  MetricStatus,
  type MetricCalculator,
  type MetricExecutionContext,
  type MetricResult,
} from '../../definitions/types'

interface BehaviourCoreTotals {
  readonly records: readonly PlayerMatchRecord[]
  readonly matches: number
  readonly captainMatches: number
  readonly wicketKeeperMatches: number
  readonly substituteMatches: number
  readonly playerOfMatchAwards: number
  readonly events: readonly BehaviourEvent[]
  readonly eventCount: number
  readonly eventTypes: string
}

interface BehaviourCoreMetricConfig {
  readonly metricId: string
  readonly name: string
  readonly unit: string
  readonly calculateValue: (totals: BehaviourCoreTotals) => number | string
}

const VERSION = '1.0.0'

abstract class BehaviourCoreCalculator implements MetricCalculator {
  protected constructor(private readonly config: BehaviourCoreMetricConfig) {}

  calculate(context: MetricExecutionContext): MetricResult {
    const totals = getBehaviourCoreTotals(context)
    const validationError = validateBehaviourCoreTotals(totals)

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
      category: MetricCategory.Behaviour,
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

export class BehaviourCaptainMatchesCalculator extends BehaviourCoreCalculator {
  constructor() {
    super({
      metricId: 'behaviour.captain_matches',
      name: 'Captain Matches',
      unit: 'matches',
      calculateValue: ({ captainMatches }) => captainMatches,
    })
  }
}

export class BehaviourWicketKeeperMatchesCalculator extends BehaviourCoreCalculator {
  constructor() {
    super({
      metricId: 'behaviour.wicket_keeper_matches',
      name: 'Wicket Keeper Matches',
      unit: 'matches',
      calculateValue: ({ wicketKeeperMatches }) => wicketKeeperMatches,
    })
  }
}

export class BehaviourSubstituteMatchesCalculator extends BehaviourCoreCalculator {
  constructor() {
    super({
      metricId: 'behaviour.substitute_matches',
      name: 'Substitute Matches',
      unit: 'matches',
      calculateValue: ({ substituteMatches }) => substituteMatches,
    })
  }
}

export class BehaviourPlayerOfMatchAwardsCalculator extends BehaviourCoreCalculator {
  constructor() {
    super({
      metricId: 'behaviour.player_of_match_awards',
      name: 'Player Of Match Awards',
      unit: 'awards',
      calculateValue: ({ playerOfMatchAwards }) => playerOfMatchAwards,
    })
  }
}

export class BehaviourEventsCalculator extends BehaviourCoreCalculator {
  constructor() {
    super({
      metricId: 'behaviour.events',
      name: 'Behaviour Events',
      unit: 'events',
      calculateValue: ({ eventCount }) => eventCount,
    })
  }
}

export class BehaviourEventTypesCalculator extends BehaviourCoreCalculator {
  constructor() {
    super({
      metricId: 'behaviour.event_types',
      name: 'Behaviour Event Types',
      unit: 'json',
      calculateValue: ({ eventTypes }) => eventTypes,
    })
  }
}

const getBehaviourCoreTotals = (
  context: MetricExecutionContext,
): BehaviourCoreTotals => {
  const records = context.pkm.history.records
  const events = records.flatMap((record) => record.behaviour.events)

  return {
    records,
    matches: records.length,
    captainMatches: records.filter((record) => record.behaviour.captain).length,
    wicketKeeperMatches: records.filter((record) => record.behaviour.wicketKeeper)
      .length,
    substituteMatches: records.filter((record) => record.behaviour.substitute)
      .length,
    playerOfMatchAwards: records.filter((record) => record.behaviour.playerOfMatch)
      .length,
    events,
    eventCount: events.length,
    eventTypes: toStableJson(countBy(events.map((event) => event.eventType))),
  }
}

const validateBehaviourCoreTotals = (
  totals: BehaviourCoreTotals,
): string | undefined => {
  if (totals.matches === 0) {
    return 'Career is empty.'
  }

  const eventKeys = new Set<string>()

  for (const record of totals.records) {
    if (!record.behaviour) {
      return 'Behaviour history is missing.'
    }

    for (const event of record.behaviour.events) {
      if (!event.eventType.trim()) {
        return 'Behaviour event type is missing.'
      }

      const eventKey = getEventKey(record.matchId, event)

      if (eventKeys.has(eventKey)) {
        return 'Duplicate behaviour event.'
      }

      eventKeys.add(eventKey)
    }
  }

  if (totals.eventCount < 0) {
    return 'Behaviour event count cannot be negative.'
  }

  return undefined
}

const getEventKey = (matchId: string, event: BehaviourEvent): string => {
  const ballRef = event.ballRef
    ? `${event.ballRef.inningsId ?? ''}:${event.ballRef.over}:${event.ballRef.ballInOver}`
    : ''

  return [
    matchId,
    event.sourceCommentaryId ?? '',
    event.eventType,
    event.description ?? '',
    ballRef,
  ].join('|')
}

const countBy = (values: readonly string[]): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>()

  for (const rawValue of values) {
    const value = rawValue.trim()
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return counts
}

const toStableJson = (counts: ReadonlyMap<string, number>): string => {
  const sortedEntries = [...counts.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )

  return JSON.stringify(Object.fromEntries(sortedEntries))
}
