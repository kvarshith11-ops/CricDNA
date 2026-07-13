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

export type AIDNAObservationCategory = 'batting' | 'bowling' | 'fielding' | 'overall'

export interface AIDNAObservation {
  readonly title: string
  readonly category: AIDNAObservationCategory
  readonly summary: string
  readonly supportingTraits: readonly string[]
  readonly supportingMetricIds: readonly string[]
  readonly evidence: readonly string[]
}

export type AIDNAObservations = Readonly<
  Record<AIDNAObservationCategory, readonly AIDNAObservation[]>
>

export interface AIScoutResponse {
  readonly ratings: AIRatings
  readonly batting: string
  readonly bowling: string
  readonly fielding: string
  readonly overall: string
  readonly dnaScore: AIRating
  readonly dnaObservations: AIDNAObservations
  readonly strengths: readonly string[]
  readonly developmentAreas: readonly string[]
  readonly roleSuitability: readonly AIRoleSuitability[]
  readonly scoutingReport: string
  readonly confidence: AIScoutConfidence
}

const ratingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'explanation'],
  properties: {
    score: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    explanation: {
      type: 'string',
      minLength: 1,
    },
  },
} as const

const dnaScoreSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['score', 'explanation'],
  properties: {
    score: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    explanation: {
      type: 'string',
      minLength: 1,
      description:
        'A concise 35-60 word rationale explaining why this DNA score was assigned from the supplied deterministic evidence.',
    },
  },
} as const

const dnaObservationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'category',
    'summary',
    'supportingTraits',
    'supportingMetricIds',
    'evidence',
  ],
  properties: {
    title: { type: 'string', minLength: 1 },
    category: {
      type: 'string',
      enum: ['batting', 'bowling', 'fielding', 'overall'],
    },
    summary: { type: 'string', minLength: 1 },
    supportingTraits: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    supportingMetricIds: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    evidence: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
  },
} as const

export const AI_SCOUT_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ratings',
    'batting',
    'bowling',
    'fielding',
    'overall',
    'dnaScore',
    'dnaObservations',
    'strengths',
    'developmentAreas',
    'roleSuitability',
    'scoutingReport',
    'confidence',
  ],
  properties: {
    ratings: {
      type: 'object',
      additionalProperties: false,
      required: ['batting', 'bowling', 'fielding', 'overall'],
      properties: {
        batting: ratingSchema,
        bowling: ratingSchema,
        fielding: ratingSchema,
        overall: ratingSchema,
      },
    },
    batting: { type: 'string', minLength: 1 },
    bowling: { type: 'string', minLength: 1 },
    fielding: { type: 'string', minLength: 1 },
    overall: { type: 'string', minLength: 1 },
    dnaScore: dnaScoreSchema,
    dnaObservations: {
      type: 'object',
      additionalProperties: false,
      required: ['batting', 'bowling', 'fielding', 'overall'],
      properties: {
        batting: {
          type: 'array',
          items: dnaObservationSchema,
        },
        bowling: {
          type: 'array',
          items: dnaObservationSchema,
        },
        fielding: {
          type: 'array',
          items: dnaObservationSchema,
        },
        overall: {
          type: 'array',
          items: dnaObservationSchema,
        },
      },
    },
    strengths: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    developmentAreas: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    roleSuitability: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['role', 'suitability', 'explanation'],
        properties: {
          role: { type: 'string', minLength: 1 },
          suitability: {
            type: 'number',
            minimum: 0,
            maximum: 100,
          },
          explanation: { type: 'string', minLength: 1 },
        },
      },
    },
    scoutingReport: { type: 'string', minLength: 1 },
    confidence: ratingSchema,
  },
} as const
