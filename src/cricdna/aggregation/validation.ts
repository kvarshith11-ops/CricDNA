import type { PlayerKnowledgeModel } from '../domain/models/PlayerKnowledgeModel'
import type { PlayerMatchRecord } from '../domain/models/PlayerMatchRecord'

export interface KnowledgeModelValidationError {
  readonly field: string
  readonly message: string
}

export interface KnowledgeModelValidationResult {
  readonly valid: boolean
  readonly errors: readonly KnowledgeModelValidationError[]
}

export const validatePlayerMatchRecordsForAggregation = (
  records: readonly PlayerMatchRecord[],
): KnowledgeModelValidationResult => {
  const errors: KnowledgeModelValidationError[] = []

  if (records.length === 0) {
    errors.push({
      field: 'records',
      message: 'At least one PlayerMatchRecord is required.',
    })
  }

  const playerIds = new Set<string>()
  const matchIds = new Set<string>()

  for (const [index, record] of records.entries()) {
    if (!record.playerId) {
      errors.push({
        field: `records[${index}].identity.playerId`,
        message: 'Player id is required.',
      })
    } else {
      playerIds.add(record.playerId)
    }

    if (!record.matchId) {
      errors.push({
        field: `records[${index}].identity.matchId`,
        message: 'Match id is required.',
      })
    } else if (matchIds.has(record.matchId)) {
      errors.push({
        field: `records[${index}].identity.matchId`,
        message: `Duplicate match id '${record.matchId}' is not allowed.`,
      })
    } else {
      matchIds.add(record.matchId)
    }

    if (!record.context.matchDate) {
      errors.push({
        field: `records[${index}].context.matchDate`,
        message: 'Match date is required for chronological ordering.',
      })
    }
  }

  if (playerIds.size > 1) {
    errors.push({
      field: 'records.identity.playerId',
      message: 'All PlayerMatchRecords must belong to the same player.',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export const validatePlayerKnowledgeModel = (
  model: PlayerKnowledgeModel,
): KnowledgeModelValidationResult => {
  const errors: KnowledgeModelValidationError[] = []
  const records = model.history.records
  const recordValidation = validatePlayerMatchRecordsForAggregation(records)

  errors.push(...recordValidation.errors)

  if (!model.playerId) {
    errors.push({
      field: 'identity.playerId',
      message: 'PlayerKnowledgeModel player id is required.',
    })
  }

  if (model.history.index.length !== records.length) {
    errors.push({
      field: 'history.index',
      message: 'History index length must match record history length.',
    })
  }

  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1]
    const current = records[index]

    if (previous.context.matchDate > current.context.matchDate) {
      errors.push({
        field: `history.records[${index}].context.matchDate`,
        message: 'Records must be sorted chronologically by match date.',
      })
    }
  }

  for (const [index, entry] of model.history.index.entries()) {
    const record = records[index]

    if (!record) {
      continue
    }

    if (
      entry.matchId !== record.matchId ||
      entry.matchDate !== record.context.matchDate
    ) {
      errors.push({
        field: `history.index[${index}]`,
        message: 'History index entry must correspond to the record at the same position.',
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
