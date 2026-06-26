export interface AIRating {
  readonly score: number
  readonly explanation: string
}

export interface AIRatings {
  readonly batting: AIRating
  readonly bowling: AIRating
  readonly fielding: AIRating
  readonly overall: AIRating
}

export interface AIRoleSuitability {
  readonly role: string
  readonly suitability: number
  readonly explanation: string
}

export interface AIScoutConfidence {
  readonly score: number
  readonly explanation: string
}

export interface AIScoutResponse {
  readonly ratings: AIRatings
  readonly batting: string
  readonly bowling: string
  readonly fielding: string
  readonly overall: string
  readonly dnaScore: AIRating
  readonly strengths: readonly string[]
  readonly developmentAreas: readonly string[]
  readonly roleSuitability: readonly AIRoleSuitability[]
  readonly scoutingReport: string
  readonly confidence: AIScoutConfidence
}

export const AI_SCOUT_RESPONSE_SCHEMA = {
  type: 'object',
  required: [
    'ratings',
    'batting',
    'bowling',
    'fielding',
    'overall',
    'dnaScore',
    'strengths',
    'developmentAreas',
    'roleSuitability',
    'scoutingReport',
    'confidence',
  ],
  properties: {
    ratings: {
      type: 'object',
      required: ['batting', 'bowling', 'fielding', 'overall'],
    },
    batting: { type: 'string' },
    bowling: { type: 'string' },
    fielding: { type: 'string' },
    overall: { type: 'string' },
    dnaScore: { type: 'rating' },
    strengths: { type: 'array', items: { type: 'string' } },
    developmentAreas: { type: 'array', items: { type: 'string' } },
    roleSuitability: { type: 'array', items: { type: 'roleSuitability' } },
    scoutingReport: { type: 'string' },
    confidence: { type: 'confidence' },
  },
} as const
