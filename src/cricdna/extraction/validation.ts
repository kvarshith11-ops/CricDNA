import type { PlayerMatchRecord } from '../domain/models/PlayerMatchRecord'
import { MatchFormat, MatchResultType } from '../domain/types/common'

export interface ValidationError {
  readonly field: string
  readonly message: string
}

export interface PlayerMatchRecordValidationResult {
  readonly valid: boolean
  readonly errors: readonly ValidationError[]
}

export const validatePlayerMatchRecord = (
  record: PlayerMatchRecord,
): PlayerMatchRecordValidationResult => {
  const errors: ValidationError[] = []

  requireValue(errors, 'identity.matchId', record.identity.matchId)
  requireValue(errors, 'identity.playerId', record.identity.playerId)
  requireValue(errors, 'identity.team.name', record.identity.team.name)
  requireValue(errors, 'identity.opponent.name', record.identity.opponent.name)
  requireValue(errors, 'context.matchDate', record.context.matchDate)

  if (record.context.format === MatchFormat.Other) {
    errors.push({
      field: 'context.format',
      message: 'Match format must be resolved to a supported domain format.',
    })
  }

  if (record.context.matchResult === MatchResultType.Unknown) {
    errors.push({
      field: 'context.matchResult',
      message: 'Match result must be resolved from source data.',
    })
  }

  if (record.context.inningsPlayed.length === 0) {
    errors.push({
      field: 'context.inningsPlayed',
      message: 'At least one relevant innings must be present for the player.',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

const requireValue = (
  errors: ValidationError[],
  field: string,
  value: string | undefined,
): void => {
  if (!value) {
    errors.push({
      field,
      message: `${field} is required.`,
    })
  }
}
