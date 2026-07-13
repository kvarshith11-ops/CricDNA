import { describe, expect, it } from 'vitest'
import {
  buildBowlingPhaseTrait,
  PlayerProfileController,
  type MatchEndpointSet,
} from '../PlayerProfileController'

const validScoutResponse = {
  ratings: {
    batting: {
      score: 80,
      explanation: 'Based only on supplied deterministic batting evidence.',
    },
    bowling: {
      score: 55,
      explanation: 'Based only on supplied deterministic bowling evidence.',
    },
    fielding: {
      score: 65,
      explanation: 'Based only on supplied deterministic fielding evidence.',
    },
    overall: {
      score: 78,
      explanation: 'Based only on supplied deterministic overall evidence.',
    },
  },
  batting: 'Batting interpretation from deterministic profile evidence.',
  bowling: 'Bowling interpretation from deterministic profile evidence.',
  fielding: 'Fielding interpretation from deterministic profile evidence.',
  overall: 'Overall interpretation from deterministic profile evidence.',
  dnaScore: {
    score: 78,
    explanation:
      'The DNA score reflects the supplied deterministic profile, with role-specific metrics, recent match trend, and canonical traits supporting a balanced evaluation. No unsupported statistics are used, and the score stays within the available evidence.',
  },
  dnaObservations: {
    batting: [
      {
        title: 'Evidence-led profile',
        category: 'batting',
        summary:
          'The profile is interpreted from deterministic metrics and canonical traits only.',
        supportingTraits: ['trait.batting_style'],
        supportingMetricIds: ['context.matches'],
        evidence: ['The deterministic profile includes validated match evidence.'],
      },
    ],
    bowling: [],
    fielding: [],
    overall: [],
  },
  strengths: ['Uses deterministic evidence clearly.'],
  developmentAreas: ['Needs more evidence in unsupported areas.'],
  roleSuitability: [
    {
      role: 'primary role',
      suitability: 80,
      explanation: 'Suitability is based only on supplied deterministic evidence.',
    },
  ],
  scoutingReport: 'The scouting report interprets the deterministic evidence package.',
  confidence: {
    score: 75,
    explanation: 'Confidence follows the supplied evidence coverage.',
  },
}

class FakeOpenAIService {
  callCount = 0

  constructor(private readonly response: unknown = validScoutResponse) {}

  async generateScoutReport(): Promise<string> {
    this.callCount += 1

    return JSON.stringify(this.response)
  }
}

const baseMatch = (
  gameType: string,
  overNumbers: readonly number[],
): MatchEndpointSet => ({
  fixtureId: 'fixture-1',
  summary: {
    fixture: {
      id: 1,
      gameType,
      homeTeam: { id: 1, name: 'Home' },
      awayTeam: { id: 2, name: 'Away' },
    },
    players: [],
  },
  scorecard: {
    fixture: {
      id: 1,
      homeTeam: { id: 1, name: 'Home' },
      awayTeam: { id: 2, name: 'Away' },
    },
    players: [],
  },
  comments: {
    innings: [
      {
        id: 1,
        fixtureId: 1,
        inningNumber: 1,
        battingTeamId: 1,
        bowlingTeamId: 2,
        overs: overNumbers.map((overNumber, index) => ({
          id: index + 1,
          overNumber,
          balls: [
            {
              ballNumber: 1,
              battingPlayerId: 7,
              nonStrikeBattingPlayerId: 8,
              bowlerPlayerId: 42,
            },
          ],
        })),
      },
    ],
    players: [],
  },
  graphs: {
    fixture: { id: 1 },
  },
})

describe('PlayerProfileController phase traits', () => {
  it('classifies a T20 death overs specialist from ball-by-ball comments', () => {
    const trait = buildBowlingPhaseTrait(
      [baseMatch('T20 International', [1, 17, 18, 19])],
      '42',
    )

    expect(trait).toMatchObject({
      traitId: 'trait.bowling_phase_usage',
      classification: 'Death Overs Specialist',
    })
    expect(trait?.explanation).toContain('Death: 3')
    expect(trait?.explanation).toContain('Powerplay: 1')
  })

  it('returns no phase trait when the player has no bowling events', () => {
    const trait = buildBowlingPhaseTrait([baseMatch('ODI', [1, 2, 3])], '99')

    expect(trait).toBeNull()
  })
})

describe('PlayerProfileController AI profile flow', () => {
  it('returns a validated AI response with DNA observations for eligible players', async () => {
    const fakeOpenAI = new FakeOpenAIService()
    const controller = new PlayerProfileController(fakeOpenAI)

    const result = await controller.createProfile('1151')

    expect(result.status).toBe(200)
    expect(fakeOpenAI.callCount).toBe(1)
    expect(result.body).toMatchObject({
      scout: {
        dnaObservations: {
          batting: [
            {
              title: 'Evidence-led profile',
              category: 'batting',
            },
          ],
        },
      },
    })
  })

  it('skips AI generation when guardrails reject insufficient match evidence', async () => {
    const fakeOpenAI = new FakeOpenAIService()
    const controller = new PlayerProfileController(fakeOpenAI)

    const result = await controller.createProfile('2912')

    expect(result.status).toBe(200)
    expect(fakeOpenAI.callCount).toBe(0)
    expect(result.body).toMatchObject({
      profile: {
        guardrails: {
          eligible: false,
          sampleSize: 1,
        },
      },
      scout: null,
    })
  })

  it('returns a validation failure when AI observations are invalid', async () => {
    const fakeOpenAI = new FakeOpenAIService({
      ...validScoutResponse,
      dnaObservations: {
        batting: [
          {
            title: 'Invalid observation',
            category: 'batting',
            summary: 'No evidence is cited.',
            supportingTraits: [],
            supportingMetricIds: [],
            evidence: [],
          },
        ],
        bowling: [],
        fielding: [],
        overall: [],
      },
    })
    const controller = new PlayerProfileController(fakeOpenAI)

    const result = await controller.createProfile('1151')

    expect(result.status).toBe(502)
    expect(result.body).toMatchObject({
      error: 'The AI Scout returned an invalid response.',
    })
  })
})
