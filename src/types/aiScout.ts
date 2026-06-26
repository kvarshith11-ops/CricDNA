export interface AIRating {
  score: number
  explanation: string
}

export interface AIRatings {
  batting: AIRating
  bowling: AIRating
  fielding: AIRating
  overall: AIRating
}

export interface AIRoleSuitability {
  role: string
  suitability: number
  explanation: string
}

export interface AIScoutConfidence {
  score: number
  explanation: string
}

export interface AIScoutResponse {
  ratings: AIRatings
  batting: string
  bowling: string
  fielding: string
  overall: string
  dnaScore: AIRating
  strengths: string[]
  developmentAreas: string[]
  roleSuitability: AIRoleSuitability[]
  scoutingReport: string
  confidence: AIScoutConfidence
}
