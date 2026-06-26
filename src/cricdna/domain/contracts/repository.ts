import type { MatchId, PlayerId } from '../types/common'
import type { PlayerKnowledgeModel } from '../models/PlayerKnowledgeModel'
import type { PlayerMatchRecord } from '../models/PlayerMatchRecord'

export interface PlayerMatchRecordRepository {
  save: (record: PlayerMatchRecord) => Promise<void>
  findByPlayerId: (playerId: PlayerId) => Promise<readonly PlayerMatchRecord[]>
  findByMatchId: (matchId: MatchId) => Promise<readonly PlayerMatchRecord[]>
}

export interface PlayerKnowledgeModelRepository {
  save: (model: PlayerKnowledgeModel) => Promise<void>
  findByPlayerId: (playerId: PlayerId) => Promise<PlayerKnowledgeModel | null>
}
