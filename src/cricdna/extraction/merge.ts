import type {
  PlayerMatchBatting,
  PlayerMatchBehaviour,
  PlayerMatchBowling,
  PlayerMatchContext,
  PlayerMatchFielding,
  PlayerMatchProgression,
} from '../domain/models/PlayerMatchRecord'

export const mergeContext = (
  current: PlayerMatchContext,
  next: PlayerMatchContext | undefined,
): PlayerMatchContext => {
  if (!next) {
    return current
  }

  return {
    ...current,
    ...definedOnly(next),
    venue: {
      ...current.venue,
      ...definedOnly(next.venue),
    },
    competition: {
      ...current.competition,
      ...definedOnly(next.competition),
    },
    tossWinner: next.tossWinner ?? current.tossWinner,
    inningsPlayed:
      next.inningsPlayed.length > 0
        ? uniqueNumbers([...current.inningsPlayed, ...next.inningsPlayed])
        : current.inningsPlayed,
  }
}

export const mergeBatting = (
  current: PlayerMatchBatting,
  next: PlayerMatchBatting | undefined,
): PlayerMatchBatting => {
  if (!next) {
    return current
  }

  return {
    innings: appendByKey(
      current.innings,
      next.innings,
      (item) => `${item.inningsId ?? ''}:${item.inningsNumber}`,
    ),
  }
}

export const mergeBowling = (
  current: PlayerMatchBowling,
  next: PlayerMatchBowling | undefined,
): PlayerMatchBowling => {
  if (!next) {
    return current
  }

  return {
    spells: appendByKey(
      current.spells,
      next.spells,
      (item) => `${item.inningsId ?? ''}:${item.inningsNumber}`,
    ),
    wickets: [...current.wickets, ...next.wickets],
  }
}

export const mergeFielding = (
  current: PlayerMatchFielding,
  next: PlayerMatchFielding | undefined,
): PlayerMatchFielding => {
  if (!next) {
    return current
  }

  return {
    innings: appendByKey(
      current.innings,
      next.innings,
      (item) => `${item.inningsId ?? ''}:${item.inningsNumber}`,
    ),
  }
}

export const mergeBehaviour = (
  current: PlayerMatchBehaviour,
  next: PlayerMatchBehaviour | undefined,
): PlayerMatchBehaviour => {
  if (!next) {
    return current
  }

  return {
    captain: next.captain || current.captain,
    wicketKeeper: next.wicketKeeper || current.wicketKeeper,
    substitute: next.substitute || current.substitute,
    playerOfMatch: next.playerOfMatch || current.playerOfMatch,
    events: [...current.events, ...next.events],
  }
}

export const mergeProgression = (
  current: PlayerMatchProgression,
  next: PlayerMatchProgression | undefined,
): PlayerMatchProgression => {
  if (!next) {
    return current
  }

  return {
    battingTimeline: appendByKey(
      current.battingTimeline,
      next.battingTimeline,
      (item) =>
        `${item.ballRef.inningsId ?? ''}:${item.ballRef.over}:${item.ballRef.ballInOver}`,
    ),
    bowlingTimeline: appendByKey(
      current.bowlingTimeline,
      next.bowlingTimeline,
      (item) =>
        `${item.ballRef.inningsId ?? ''}:${item.ballRef.over}:${item.ballRef.ballInOver}`,
    ),
  }
}

const definedOnly = <T extends object>(value: T | undefined): Partial<T> => {
  if (!value) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as Partial<T>
}

const appendByKey = <T>(
  current: readonly T[],
  next: readonly T[],
  keyOf: (value: T) => string,
): readonly T[] => {
  const keys = new Set(current.map(keyOf))
  const appended = [...current]

  for (const item of next) {
    const key = keyOf(item)

    if (!keys.has(key)) {
      keys.add(key)
      appended.push(item)
    }
  }

  return appended
}

const uniqueNumbers = (values: readonly number[]): readonly number[] => {
  return [...new Set(values)].sort((left, right) => left - right)
}
