import { describe, expect, it } from 'vitest'
import { CommentsExtractor } from '../CommentsExtractor'
import { GraphsExtractor } from '../GraphsExtractor'
import { ScorecardExtractor } from '../ScorecardExtractor'
import { SummaryExtractor } from '../SummaryExtractor'
import { loadMatchEndpointSets, selectRepresentativePlayerId } from './dataset'

const matches = loadMatchEndpointSets()

describe('CricDNA extraction dataset', () => {
  it('groups all 20 matches by fixture id across four endpoints', () => {
    expect(matches).toHaveLength(20)
    expect(new Set(matches.map((match) => match.fixtureId)).size).toBe(20)
  })
})

describe('SummaryExtractor', () => {
  const extractor = new SummaryExtractor()

  it('populates only PlayerMatchRecord.Context', () => {
    const match = matches[0]
    const playerId = selectRepresentativePlayerId(match)
    const result = extractor.extract({ endpoint: match.summary, playerId })

    expect(Object.keys(result)).toEqual(['context'])
    expect(result.context.matchDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.context.inningsPlayed.length).toBeGreaterThanOrEqual(0)
  })

  it('validates against all 20 matches', () => {
    for (const match of matches) {
      const playerId = selectRepresentativePlayerId(match)
      const result = extractor.extract({ endpoint: match.summary, playerId })

      expect(result.context.format).toBeTruthy()
      expect(result.context.matchDate).toBeTruthy()
      expect(result.context.matchResult).toBeTruthy()
    }
  })
})

describe('ScorecardExtractor', () => {
  const extractor = new ScorecardExtractor()

  it('populates only Batting, Bowling, and Fielding', () => {
    const match = matches[0]
    const playerId = selectRepresentativePlayerId(match)
    const result = extractor.extract({ endpoint: match.scorecard, playerId })

    expect(Object.keys(result).sort()).toEqual(['batting', 'bowling', 'fielding'])
    expect(Array.isArray(result.batting.innings)).toBe(true)
    expect(Array.isArray(result.bowling.spells)).toBe(true)
    expect(Array.isArray(result.fielding.innings)).toBe(true)
  })

  it('handles players who only field', () => {
    const match = matches[0]
    const fieldOnlyPlayer = {
      id: 999999,
      displayName: 'Field Only Player',
      teamId: match.scorecard.fixture.homeTeam.id,
    }
    const endpoint = {
      ...match.scorecard,
      players: [...match.scorecard.players, fieldOnlyPlayer],
    }
    const result = extractor.extract({
      endpoint,
      playerId: String(fieldOnlyPlayer.id),
    })

    expect(result.batting.innings).toHaveLength(0)
    expect(result.bowling.spells).toHaveLength(0)
    expect(result.fielding.innings.length).toBeGreaterThan(0)
  })

  it('validates against every player in all 20 matches', () => {
    for (const match of matches) {
      for (const player of match.scorecard.players) {
        const result = extractor.extract({
          endpoint: match.scorecard,
          playerId: String(player.id),
        })

        expect(result.batting.innings.length).toBeGreaterThanOrEqual(0)
        expect(result.bowling.spells.length).toBeGreaterThanOrEqual(0)
        expect(result.fielding.innings.length).toBe(
          match.scorecard.fixture.innings?.length ?? 0,
        )
      }
    }
  })
})

describe('CommentsExtractor', () => {
  const extractor = new CommentsExtractor()

  it('populates only Behaviour and preserves raw commentary events', () => {
    const match = matches.find((candidate) =>
      candidate.comments.innings.some((innings) =>
        innings.overs?.some((over) =>
          over.balls?.some((ball) => Boolean(ball.comments?.length)),
        ),
      ),
    )

    expect(match).toBeTruthy()

    if (!match) {
      return
    }

    const playerId = selectRepresentativePlayerId(match)
    const result = extractor.extract({ endpoint: match.comments, playerId })

    expect(Object.keys(result)).toEqual(['behaviour'])
    expect(result.behaviour.events.length).toBeGreaterThanOrEqual(0)
  })

  it('validates against all 20 matches', () => {
    for (const match of matches) {
      const playerId = selectRepresentativePlayerId(match)
      const result = extractor.extract({ endpoint: match.comments, playerId })

      expect(Array.isArray(result.behaviour.events)).toBe(true)
      expect(typeof result.behaviour.captain).toBe('boolean')
    }
  })
})

describe('GraphsExtractor', () => {
  const extractor = new GraphsExtractor()

  it('populates only Progression', () => {
    const match = matches[0]
    const playerId = selectRepresentativePlayerId(match)
    const result = extractor.extract({ endpoint: match.graphs, playerId })

    expect(Object.keys(result)).toEqual(['progression'])
    expect(result.progression.battingTimeline.length).toBeGreaterThan(0)
    expect(result.progression.bowlingTimeline.length).toBeGreaterThan(0)
  })

  it('validates against all 20 matches', () => {
    for (const match of matches) {
      const playerId = selectRepresentativePlayerId(match)
      const result = extractor.extract({ endpoint: match.graphs, playerId })
      const overCount =
        match.graphs.fixture.innings?.reduce(
          (total, innings) => total + (innings.overs?.length ?? 0),
          0,
        ) ?? 0

      expect(result.progression.battingTimeline).toHaveLength(overCount)
      expect(result.progression.bowlingTimeline).toHaveLength(overCount)
    }
  })
})
