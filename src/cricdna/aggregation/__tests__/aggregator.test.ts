import { describe, expect, it } from 'vitest'
import { extractMatchRecord } from '../../extraction/MatchExtractionPipeline'
import { PlayerMatchRecord } from '../../domain/models/PlayerMatchRecord'
import {
  aggregatePlayerCareer,
  getBehaviourHistory,
  getCareerBattingHistory,
  getCareerBowlingHistory,
  getCareerContextHistory,
  getCareerFieldingHistory,
  getProgressionHistory,
} from '../PlayerCareerAggregator'
import { validatePlayerKnowledgeModel } from '../validation'
import {
  loadMatchEndpointSets,
  selectRepresentativePlayerId,
} from '../../extraction/__tests__/dataset'

const matches = loadMatchEndpointSets()
const fixedMetadata = {
  schemaVersion: 'test-pkm-schema',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
  provenance: {
    sourceSystem: 'test',
    sourceEntityId: 'career',
  },
}
const careerPlayerId = 'career-player-001'

const buildTwentyCareerRecords = (): readonly PlayerMatchRecord[] => {
  return matches.map((match) => {
    const extracted = extractMatchRecord({
      playerId: selectRepresentativePlayerId(match),
      summary: match.summary,
      scorecard: match.scorecard,
      comments: match.comments,
      graphs: match.graphs,
      metadata: fixedMetadata,
    }).record
    const json = extracted.toJSON()

    return PlayerMatchRecord.fromJSON({
      ...json,
      identity: {
        ...json.identity,
        playerId: careerPlayerId,
        playerName: 'Career Player',
      },
    })
  })
}

describe('Player career aggregation', () => {
  it('aggregates 20 PMRs into one PlayerKnowledgeModel', () => {
    const result = aggregatePlayerCareer({
      records: buildTwentyCareerRecords(),
      metadata: fixedMetadata,
    })

    expect(result.validation.valid).toBe(true)
    expect(result.model).toBeTruthy()
    expect(result.model?.playerId).toBe(careerPlayerId)
    expect(result.model?.history.records).toHaveLength(20)
    expect(result.model?.history.index).toHaveLength(20)
    expect(getCareerContextHistory(result.model!)).toHaveLength(20)
    expect(getCareerBattingHistory(result.model!)).toHaveLength(20)
    expect(getCareerBowlingHistory(result.model!)).toHaveLength(20)
    expect(getCareerFieldingHistory(result.model!)).toHaveLength(20)
    expect(getBehaviourHistory(result.model!)).toHaveLength(20)
    expect(getProgressionHistory(result.model!)).toHaveLength(20)
  })

  it('rejects duplicate match ids', () => {
    const records = buildTwentyCareerRecords()
    const result = aggregatePlayerCareer({
      records: [records[0], records[0]],
      metadata: fixedMetadata,
    })

    expect(result.model).toBeUndefined()
    expect(result.validation.valid).toBe(false)
    expect(result.validation.errors.map((error) => error.field)).toContain(
      'records[1].identity.matchId',
    )
  })

  it('rejects mixed player ids', () => {
    const records = buildTwentyCareerRecords()
    const mixedRecordJson = records[1].toJSON()
    const mixedRecord = PlayerMatchRecord.fromJSON({
      ...mixedRecordJson,
      identity: {
        ...mixedRecordJson.identity,
        playerId: 'another-player',
      },
    })
    const result = aggregatePlayerCareer({
      records: [records[0], mixedRecord],
      metadata: fixedMetadata,
    })

    expect(result.model).toBeUndefined()
    expect(result.validation.valid).toBe(false)
    expect(result.validation.errors.map((error) => error.field)).toContain(
      'records.identity.playerId',
    )
  })

  it('maintains chronological ordering', () => {
    const records = [...buildTwentyCareerRecords()].reverse()
    const result = aggregatePlayerCareer({
      records,
      metadata: fixedMetadata,
    })

    expect(result.validation.valid).toBe(true)

    const dates = result.model!.history.records.map(
      (record) => record.context.matchDate,
    )
    const sortedDates = [...dates].sort((left, right) => left.localeCompare(right))

    expect(dates).toEqual(sortedDates)
    expect(result.model!.history.index.map((entry) => entry.matchDate)).toEqual(
      sortedDates,
    )
  })

  it('produces deterministic aggregation for the same input and metadata', () => {
    const records = buildTwentyCareerRecords()
    const first = aggregatePlayerCareer({
      records,
      metadata: fixedMetadata,
    }).model!.toJSON()
    const second = aggregatePlayerCareer({
      records,
      metadata: fixedMetadata,
    }).model!.toJSON()

    expect(second).toEqual(first)
  })

  it('validates the produced PlayerKnowledgeModel', () => {
    const result = aggregatePlayerCareer({
      records: buildTwentyCareerRecords(),
      metadata: fixedMetadata,
    })

    expect(result.model).toBeTruthy()
    expect(validatePlayerKnowledgeModel(result.model!).valid).toBe(true)
    expect(validatePlayerKnowledgeModel(result.model!).errors).toEqual([])
  })
})
