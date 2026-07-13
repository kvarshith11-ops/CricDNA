import { describe, expect, it } from 'vitest'
import { MatchFormat } from '../../domain'
import type { CommentsEndpoint, SummaryEndpoint } from '../../extraction/types'
import { buildPlayerPhaseAnalysis, phaseForOver } from '../PlayerPhaseAnalysis'

const summary = (
  fixtureId: number,
  gameType: string,
): SummaryEndpoint => ({
  fixture: {
    id: fixtureId,
    gameType,
    homeTeam: { id: 1, name: 'India Men' },
    awayTeam: { id: 2, name: 'Australia Men' },
  },
  players: [],
})

const comments = (nextPage?: string): CommentsEndpoint => ({
  innings: [
    {
      id: 1,
      fixtureId: 100,
      inningNumber: 1,
      battingTeamId: 1,
      bowlingTeamId: 2,
      overs: [
        {
          id: 1,
          overNumber: 2,
          balls: [
            {
              ballNumber: 1,
              battingPlayerId: 42,
              nonStrikeBattingPlayerId: 99,
              bowlerPlayerId: 8,
              runsScored: 4,
              runsConceded: 4,
            },
            {
              ballNumber: 2,
              battingPlayerId: 42,
              nonStrikeBattingPlayerId: 99,
              bowlerPlayerId: 8,
              runsScored: 0,
              runsConceded: 0,
              dismissalPlayerId: 42,
              isWicket: true,
            },
          ],
        },
        {
          id: 2,
          overNumber: 45,
          balls: [
            {
              ballNumber: 1,
              battingPlayerId: 7,
              nonStrikeBattingPlayerId: 9,
              bowlerPlayerId: 42,
              runsScored: 0,
              runsConceded: 0,
              dismissalTypeId: 'Bowled',
              isWicket: true,
            },
            {
              ballNumber: 2,
              battingPlayerId: 7,
              nonStrikeBattingPlayerId: 9,
              bowlerPlayerId: 42,
              runsScored: 0,
              runsConceded: 1,
              isWide: true,
            },
            {
              ballNumber: 3,
              battingPlayerId: 7,
              nonStrikeBattingPlayerId: 9,
              bowlerPlayerId: 42,
              runsScored: 0,
              runsConceded: 0,
              dismissalTypeId: 'RunOut',
              isWicket: true,
            },
          ],
        },
      ],
    },
  ],
  players: [],
  nextPage,
})

describe('PlayerPhaseAnalysis', () => {
  it('maps ODI and T20 overs into cricket phases', () => {
    expect(phaseForOver(MatchFormat.ODI, 10)).toBe('Powerplay')
    expect(phaseForOver(MatchFormat.ODI, 40)).toBe('Middle')
    expect(phaseForOver(MatchFormat.ODI, 41)).toBe('Death')
    expect(phaseForOver(MatchFormat.T20, 6)).toBe('Powerplay')
    expect(phaseForOver(MatchFormat.T20, 15)).toBe('Middle')
    expect(phaseForOver(MatchFormat.T20, 16)).toBe('Death')
    expect(phaseForOver(MatchFormat.Test, 16)).toBeNull()
  })

  it('builds batting and bowling phase splits from commentary balls', () => {
    const analysis = buildPlayerPhaseAnalysis(
      [
        {
          summary: summary(100, 'ODI'),
          comments: comments('next-commentary-page'),
        },
      ],
      '42',
    )

    expect(analysis.batting).toEqual([
      {
        phase: 'Powerplay',
        matches: 1,
        runs: 4,
        balls: 2,
        dotBalls: 1,
        boundaries: 1,
        dismissals: 1,
        strikeRate: 200,
        dotPercentage: 50,
      },
    ])
    expect(analysis.bowling).toEqual([
      {
        phase: 'Death',
        matches: 1,
        balls: 2,
        runsConceded: 1,
        wickets: 1,
        dotBalls: 2,
        economy: 3,
        average: 1,
        dotPercentage: 100,
      },
    ])
    expect(analysis.coverage).toEqual({
      source: 'comments',
      matchesWithComments: 1,
      hasIncompleteCommentary: true,
    })
  })

  it('returns empty phase sections when commentary has no player evidence', () => {
    const analysis = buildPlayerPhaseAnalysis(
      [
        {
          summary: summary(101, 'ODI'),
          comments: comments(),
        },
      ],
      '404',
    )

    expect(analysis.batting).toEqual([])
    expect(analysis.bowling).toEqual([])
    expect(analysis.coverage.matchesWithComments).toBe(1)
  })
})
