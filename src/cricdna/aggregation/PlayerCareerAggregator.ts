import { PlayerKnowledgeModel } from '../domain/models/PlayerKnowledgeModel'
import type { PlayerMatchRecord } from '../domain/models/PlayerMatchRecord'
import type { AuditMetadata } from '../domain/types/common'
import {
  validatePlayerKnowledgeModel,
  validatePlayerMatchRecordsForAggregation,
  type KnowledgeModelValidationResult,
} from './validation'

export interface AggregatePlayerCareerInput {
  readonly records: readonly PlayerMatchRecord[]
  readonly metadata?: Partial<AuditMetadata>
}

export interface AggregatePlayerCareerResult {
  readonly model?: PlayerKnowledgeModel
  readonly validation: KnowledgeModelValidationResult
}

const SCHEMA_VERSION = 'cricdna-pkm-aggregation-v1'

export const aggregatePlayerCareer = (
  input: AggregatePlayerCareerInput,
): AggregatePlayerCareerResult => {
  const inputValidation = validatePlayerMatchRecordsForAggregation(input.records)

  if (!inputValidation.valid) {
    return {
      validation: inputValidation,
    }
  }

  const sortedRecords = sortRecords(input.records)
  const firstRecord = sortedRecords[0]
  const now = new Date().toISOString()
  const metadata: AuditMetadata = {
    schemaVersion: input.metadata?.schemaVersion ?? SCHEMA_VERSION,
    createdAt: input.metadata?.createdAt ?? now,
    updatedAt: input.metadata?.updatedAt ?? now,
    provenance: input.metadata?.provenance,
  }
  const model = PlayerKnowledgeModel.fromRecords(
    firstRecord.playerId,
    sortedRecords,
    metadata,
    firstRecord.identity.playerName,
  )
  const validation = validatePlayerKnowledgeModel(model)

  return {
    model,
    validation,
  }
}

export const buildCareerProfile = (
  model: PlayerKnowledgeModel,
): PlayerKnowledgeModel['identity'] => {
  return model.identity
}

export const getCareerContextHistory = (
  model: PlayerKnowledgeModel,
): readonly PlayerMatchRecord['context'][] => {
  return model.history.records.map((record) => record.context)
}

export const getCareerBattingHistory = (
  model: PlayerKnowledgeModel,
): readonly PlayerMatchRecord['batting'][] => {
  return model.history.records.map((record) => record.batting)
}

export const getCareerBowlingHistory = (
  model: PlayerKnowledgeModel,
): readonly PlayerMatchRecord['bowling'][] => {
  return model.history.records.map((record) => record.bowling)
}

export const getCareerFieldingHistory = (
  model: PlayerKnowledgeModel,
): readonly PlayerMatchRecord['fielding'][] => {
  return model.history.records.map((record) => record.fielding)
}

export const getBehaviourHistory = (
  model: PlayerKnowledgeModel,
): readonly PlayerMatchRecord['behaviour'][] => {
  return model.history.records.map((record) => record.behaviour)
}

export const getProgressionHistory = (
  model: PlayerKnowledgeModel,
): readonly PlayerMatchRecord['progression'][] => {
  return model.history.records.map((record) => record.progression)
}

const sortRecords = (
  records: readonly PlayerMatchRecord[],
): readonly PlayerMatchRecord[] => {
  return [...records].sort((left, right) => {
    const dateComparison = left.context.matchDate.localeCompare(
      right.context.matchDate,
    )

    if (dateComparison !== 0) {
      return dateComparison
    }

    return left.matchId.localeCompare(right.matchId)
  })
}
