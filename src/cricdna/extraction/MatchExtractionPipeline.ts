import {
  PlayerMatchRecord,
  type PlayerMatchRecordProps,
} from '../domain/models/PlayerMatchRecord'
import {
  MatchFormat,
  MatchResultType,
  type AuditMetadata,
  type PlayerId,
} from '../domain/types/common'
import { CommentsExtractor } from './CommentsExtractor'
import { GraphsExtractor } from './GraphsExtractor'
import { ScorecardExtractor } from './ScorecardExtractor'
import { SummaryExtractor } from './SummaryExtractor'
import {
  findPlayer,
  getOpponentTeam,
  getPlayerTeam,
  normalizePlayerRole,
  toId,
} from './helpers'
import {
  mergeBatting,
  mergeBehaviour,
  mergeBowling,
  mergeContext,
  mergeFielding,
  mergeProgression,
} from './merge'
import type {
  CommentsEndpoint,
  GraphsEndpoint,
  ScorecardEndpoint,
  SummaryEndpoint,
} from './types'
import {
  validatePlayerMatchRecord,
  type PlayerMatchRecordValidationResult,
} from './validation'

export interface ExtractMatchRecordInput {
  readonly playerId: PlayerId
  readonly summary?: SummaryEndpoint
  readonly scorecard: ScorecardEndpoint
  readonly comments?: CommentsEndpoint
  readonly graphs?: GraphsEndpoint
  readonly metadata?: Partial<AuditMetadata>
}

export interface ExtractMatchRecordResult {
  readonly record: PlayerMatchRecord
  readonly validation: PlayerMatchRecordValidationResult
}

const SCHEMA_VERSION = 'cricdna-pmr-extraction-v1'

export class MatchExtractionPipeline {
  constructor(
    private readonly summaryExtractor = new SummaryExtractor(),
    private readonly scorecardExtractor = new ScorecardExtractor(),
    private readonly commentsExtractor = new CommentsExtractor(),
    private readonly graphsExtractor = new GraphsExtractor(),
  ) {}

  extractMatchRecord(input: ExtractMatchRecordInput): ExtractMatchRecordResult {
    let props = createEmptyRecordProps(input)

    if (input.summary) {
      const summaryResult = this.summaryExtractor.extract({
        endpoint: input.summary,
        playerId: input.playerId,
      })

      props = {
        ...props,
        context: mergeContext(props.context, summaryResult.context),
      }
    }

    const scorecardResult = this.scorecardExtractor.extract({
      endpoint: input.scorecard,
      playerId: input.playerId,
    })

    props = {
      ...props,
      batting: mergeBatting(props.batting, scorecardResult.batting),
      bowling: mergeBowling(props.bowling, scorecardResult.bowling),
      fielding: mergeFielding(props.fielding, scorecardResult.fielding),
    }

    if (input.comments) {
      const commentsResult = this.commentsExtractor.extract({
        endpoint: input.comments,
        playerId: input.playerId,
      })

      props = {
        ...props,
        behaviour: mergeBehaviour(props.behaviour, commentsResult.behaviour),
      }
    }

    if (input.graphs) {
      const graphsResult = this.graphsExtractor.extract({
        endpoint: input.graphs,
        playerId: input.playerId,
      })

      props = {
        ...props,
        progression: mergeProgression(props.progression, graphsResult.progression),
      }
    }

    const record = PlayerMatchRecord.create(props)

    return {
      record,
      validation: validatePlayerMatchRecord(record),
    }
  }
}

export const extractMatchRecord = (
  input: ExtractMatchRecordInput,
): ExtractMatchRecordResult => {
  return new MatchExtractionPipeline().extractMatchRecord(input)
}

const createEmptyRecordProps = (
  input: ExtractMatchRecordInput,
): PlayerMatchRecordProps => {
  const { scorecard, playerId } = input
  const player = findPlayer(scorecard.players, playerId)
  const team = getPlayerTeam(scorecard.fixture, scorecard.players, playerId)
  const opponent = getOpponentTeam(scorecard.fixture, scorecard.players, playerId)
  const now = new Date().toISOString()
  const metadata: AuditMetadata = {
    schemaVersion: input.metadata?.schemaVersion ?? SCHEMA_VERSION,
    createdAt: input.metadata?.createdAt ?? now,
    updatedAt: input.metadata?.updatedAt ?? now,
    provenance: input.metadata?.provenance ?? {
      sourceSystem: 'Hackathon Data',
      sourceEntityId: toId(scorecard.fixture.id),
    },
  }

  return {
    identity: {
      playerId,
      playerName: player?.displayName,
      matchId: toId(scorecard.fixture.id),
      team: team ?? {
        name: '',
      },
      opponent: opponent ?? {
        name: '',
      },
      country: cleanOptionalText(player?.nationality) ?? countryFromTeamName(team?.name),
      dateOfBirth: player?.dob,
      role: normalizePlayerRole(player?.type),
    },
    context: {
      format: MatchFormat.Other,
      matchDate: '',
      inningsPlayed: [],
      matchResult: MatchResultType.Unknown,
    },
    batting: {
      innings: [],
    },
    bowling: {
      spells: [],
      wickets: [],
    },
    fielding: {
      innings: [],
    },
    behaviour: {
      captain: false,
      wicketKeeper: false,
      substitute: false,
      playerOfMatch: false,
      events: [],
    },
    progression: {
      battingTimeline: [],
      bowlingTimeline: [],
    },
    metadata,
  }
}

const cleanOptionalText = (value: string | undefined): string | undefined => {
  const cleaned = value?.trim()

  return cleaned ? cleaned : undefined
}

const countryFromTeamName = (teamName: string | undefined): string | undefined => {
  const cleaned = cleanOptionalText(teamName)

  if (!cleaned || !/\s+(Men|Women)$/i.test(cleaned)) {
    return undefined
  }

  return cleaned.replace(/\s+(Men|Women)$/i, '')
}
