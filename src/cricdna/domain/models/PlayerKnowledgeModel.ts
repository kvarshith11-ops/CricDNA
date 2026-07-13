import type {
  AuditMetadata,
  ISODateString,
  MatchFormat,
  MatchId,
  PlayerId,
  TeamRef,
} from '../types/common'
import type { Serializable } from '../types/serialization'
import {
  PlayerMatchRecord,
  type PlayerMatchRecordJson,
} from './PlayerMatchRecord'

export interface PlayerKnowledgeIdentity {
  readonly playerId: PlayerId
  readonly playerName?: string
  readonly primaryTeam?: TeamRef
}

export interface PlayerRecordHistoryEntry {
  readonly matchId: MatchId
  readonly matchDate: ISODateString
  readonly format: MatchFormat
  readonly team: TeamRef
  readonly opponent: TeamRef
}

export interface PlayerKnowledgeHistory {
  readonly records: readonly PlayerMatchRecord[]
  readonly index: readonly PlayerRecordHistoryEntry[]
}

export interface PlayerKnowledgeModelProps {
  readonly identity: PlayerKnowledgeIdentity
  readonly history: PlayerKnowledgeHistory
  readonly metadata: AuditMetadata
}

export interface PlayerKnowledgeHistoryJson {
  readonly records: readonly PlayerMatchRecordJson[]
  readonly index: readonly PlayerRecordHistoryEntry[]
}

export interface PlayerKnowledgeModelJson {
  readonly identity: PlayerKnowledgeIdentity
  readonly history: PlayerKnowledgeHistoryJson
  readonly metadata: AuditMetadata
}

const buildHistoryEntry = (
  record: PlayerMatchRecord,
): PlayerRecordHistoryEntry => {
  return {
    matchId: record.matchId,
    matchDate: record.context.matchDate,
    format: record.context.format,
    team: record.identity.team,
    opponent: record.identity.opponent,
  }
}

const sortHistory = (
  records: readonly PlayerMatchRecord[],
): readonly PlayerMatchRecord[] => {
  return [...records].sort((left, right) =>
    left.context.matchDate.localeCompare(right.context.matchDate),
  )
}

export class PlayerKnowledgeModel
  implements Serializable<PlayerKnowledgeModelJson>
{
  private readonly props: PlayerKnowledgeModelProps

  private constructor(props: PlayerKnowledgeModelProps) {
    this.props = props
  }

  static create(props: PlayerKnowledgeModelProps): PlayerKnowledgeModel {
    return new PlayerKnowledgeModel({
      ...props,
      history: {
        records: sortHistory(props.history.records),
        index: props.history.index,
      },
    })
  }

  static empty(
    identity: PlayerKnowledgeIdentity,
    metadata: AuditMetadata,
  ): PlayerKnowledgeModel {
    return new PlayerKnowledgeModel({
      identity,
      history: {
        records: [],
        index: [],
      },
      metadata,
    })
  }

  static fromRecords(
    playerId: PlayerId,
    records: readonly PlayerMatchRecord[],
    metadata: AuditMetadata,
    playerName?: string,
  ): PlayerKnowledgeModel {
    const scopedRecords = records.filter((record) => record.playerId === playerId)
    const sortedRecords = sortHistory(scopedRecords)

    return new PlayerKnowledgeModel({
      identity: {
        playerId,
        playerName,
      },
      history: {
        records: sortedRecords,
        index: sortedRecords.map(buildHistoryEntry),
      },
      metadata,
    })
  }

  static fromJSON(json: PlayerKnowledgeModelJson): PlayerKnowledgeModel {
    const records = json.history.records.map(PlayerMatchRecord.fromJSON)

    return new PlayerKnowledgeModel({
      identity: json.identity,
      history: {
        records,
        index: json.history.index,
      },
      metadata: json.metadata,
    })
  }

  get identity(): PlayerKnowledgeIdentity {
    return this.props.identity
  }

  get history(): PlayerKnowledgeHistory {
    return this.props.history
  }

  get metadata(): AuditMetadata {
    return this.props.metadata
  }

  get playerId(): PlayerId {
    return this.props.identity.playerId
  }

  addRecord(record: PlayerMatchRecord, metadata: AuditMetadata): PlayerKnowledgeModel {
    if (record.playerId !== this.playerId) {
      throw new Error(
        `Cannot add record for player ${record.playerId} to PKM for ${this.playerId}.`,
      )
    }

    const records = sortHistory([...this.history.records, record])

    return new PlayerKnowledgeModel({
      identity: this.identity,
      history: {
        records,
        index: records.map(buildHistoryEntry),
      },
      metadata,
    })
  }

  findRecordByMatchId(matchId: MatchId): PlayerMatchRecord | undefined {
    return this.history.records.find((record) => record.matchId === matchId)
  }

  toJSON(): PlayerKnowledgeModelJson {
    return {
      identity: this.identity,
      history: {
        records: this.history.records.map((record) => record.toJSON()),
        index: this.history.index,
      },
      metadata: this.metadata,
    }
  }
}
