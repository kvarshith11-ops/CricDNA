export interface Identity {
  id: string
  name: string
  age: number
  country: string
  role: string
}

export interface HeadlineStats {
  matches: number
  runs: number
  battingAverage: number
  strikeRate: number
  bestFigure: string
}

export interface RecentMatch {
  date: string
  opponent: string
  performance: string
  strikeRate: number
  result: string
  playerOfMatch: boolean
}

export interface DNABreakdownItem {
  metric: string
  contribution: number
}

export interface CricketDNA {
  score: number
  tier: string
  archetype: string
  breakdown: DNABreakdownItem[]
  explanation: string
}

export interface Trend {
  label: string
  confidence: string
  reason: string
}

export interface Summary {
  note: string
  highlights: string[]
}

export interface ProfileInsight {
  metric: string
  reason: string
}

export interface Profile {
  strengths: ProfileInsight[]
  weaknesses: ProfileInsight[]
}

export interface Meta {
  format: string
  sampleSizeFlag: boolean
  timestamp: string
}

export interface PlayerInsightsResponse {
  identity: Identity
  headlineStats: HeadlineStats
  recentMatches: RecentMatch[]
  cricketDNA: CricketDNA
  trend: Trend
  summary: Summary
  profile: Profile
  meta: Meta
}
