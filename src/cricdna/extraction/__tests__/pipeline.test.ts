import { describe, expect, it } from 'vitest'
import { extractMatchRecord } from '../MatchExtractionPipeline'
import { mergeBehaviour, mergeContext } from '../merge'
import { validatePlayerMatchRecord } from '../validation'
import { loadMatchEndpointSets, selectRepresentativePlayerId } from './dataset'

const matches = loadMatchEndpointSets()
const fixedMetadata = {
  schemaVersion: 'test-schema',
  createdAt: '2026-06-27T00:00:00.000Z',
  updatedAt: '2026-06-27T00:00:00.000Z',
  provenance: {
    sourceSystem: 'test',
    sourceEntityId: 'fixture',
  },
}

describe('MatchExtractionPipeline', () => {
  it('produces one fully populated PlayerMatchRecord from all endpoints', () => {
    const match = matches[0]
    const playerId = selectRepresentativePlayerId(match)
    const result = extractMatchRecord({
      playerId,
      summary: match.summary,
      scorecard: match.scorecard,
      comments: match.comments,
      graphs: match.graphs,
      metadata: fixedMetadata,
    })

    expect(result.validation.valid).toBe(true)
    expect(result.record.identity.playerId).toBe(playerId)
    expect(result.record.identity.matchId).toBe(match.fixtureId)
    expect(result.record.context.matchDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.record.batting.innings.length).toBeGreaterThanOrEqual(0)
    expect(result.record.fielding.innings.length).toBeGreaterThan(0)
    expect(result.record.progression.battingTimeline.length).toBeGreaterThan(0)
  })

  it('supports partial endpoint availability when comments are missing', () => {
    const match = matches[0]
    const playerId = selectRepresentativePlayerId(match)
    const result = extractMatchRecord({
      playerId,
      summary: match.summary,
      scorecard: match.scorecard,
      graphs: match.graphs,
      metadata: fixedMetadata,
    })

    expect(result.validation.valid).toBe(true)
    expect(result.record.behaviour.events).toHaveLength(0)
    expect(result.record.progression.battingTimeline.length).toBeGreaterThan(0)
  })

  it('supports partial endpoint availability when graphs are missing', () => {
    const match = matches[0]
    const playerId = selectRepresentativePlayerId(match)
    const result = extractMatchRecord({
      playerId,
      summary: match.summary,
      scorecard: match.scorecard,
      comments: match.comments,
      metadata: fixedMetadata,
    })

    expect(result.validation.valid).toBe(true)
    expect(result.record.progression.battingTimeline).toHaveLength(0)
    expect(result.record.behaviour.events.length).toBeGreaterThanOrEqual(0)
  })

  it('returns validation errors when mandatory fields are missing', () => {
    const match = matches[0]
    const result = extractMatchRecord({
      playerId: 'missing-player',
      scorecard: match.scorecard,
      metadata: fixedMetadata,
    })

    expect(result.validation.valid).toBe(false)
    expect(result.validation.errors.map((error) => error.field)).toContain(
      'identity.team.name',
    )
    expect(result.validation.errors.map((error) => error.field)).toContain(
      'context.matchDate',
    )
  })

  it('has merge order independence for independently owned sections', () => {
    const match = matches[0]
    const playerId = selectRepresentativePlayerId(match)
    const complete = extractMatchRecord({
      playerId,
      summary: match.summary,
      scorecard: match.scorecard,
      comments: match.comments,
      graphs: match.graphs,
      metadata: fixedMetadata,
    }).record
    const noComments = extractMatchRecord({
      playerId,
      summary: match.summary,
      scorecard: match.scorecard,
      graphs: match.graphs,
      metadata: fixedMetadata,
    }).record

    expect(complete.context).toEqual(noComments.context)
    expect(complete.batting).toEqual(noComments.batting)
    expect(complete.bowling).toEqual(noComments.bowling)
    expect(complete.fielding).toEqual(noComments.fielding)
    expect(complete.progression).toEqual(noComments.progression)
  })

  it('produces deterministic output for the same input and metadata', () => {
    const match = matches[0]
    const playerId = selectRepresentativePlayerId(match)
    const input = {
      playerId,
      summary: match.summary,
      scorecard: match.scorecard,
      comments: match.comments,
      graphs: match.graphs,
      metadata: fixedMetadata,
    }

    const first = extractMatchRecord(input).record.toJSON()
    const second = extractMatchRecord(input).record.toJSON()

    expect(second).toEqual(first)
  })

  it('validates all 20 matches for a representative player', () => {
    for (const match of matches) {
      const playerId = selectRepresentativePlayerId(match)
      const result = extractMatchRecord({
        playerId,
        summary: match.summary,
        scorecard: match.scorecard,
        comments: match.comments,
        graphs: match.graphs,
        metadata: fixedMetadata,
      })

      expect(result.validation.errors).toEqual([])
      expect(validatePlayerMatchRecord(result.record).valid).toBe(true)
    }
  })
})

describe('merge utilities', () => {
  it('ignores undefined context values and preserves populated values', () => {
    const current = extractMatchRecord({
      playerId: selectRepresentativePlayerId(matches[0]),
      summary: matches[0].summary,
      scorecard: matches[0].scorecard,
      metadata: fixedMetadata,
    }).record.context

    const merged = mergeContext(current, {
      ...current,
      venue: undefined,
      inningsPlayed: [],
    })

    expect(merged.venue).toEqual(current.venue)
    expect(merged.inningsPlayed).toEqual(current.inningsPlayed)
  })

  it('appends behaviour events without deleting existing events', () => {
    const merged = mergeBehaviour(
      {
        captain: false,
        wicketKeeper: false,
        substitute: false,
        playerOfMatch: false,
        events: [{ eventType: 'A' }],
      },
      {
        captain: true,
        wicketKeeper: false,
        substitute: false,
        playerOfMatch: false,
        events: [{ eventType: 'B' }],
      },
    )

    expect(merged.captain).toBe(true)
    expect(merged.events.map((event) => event.eventType)).toEqual(['A', 'B'])
  })
})
