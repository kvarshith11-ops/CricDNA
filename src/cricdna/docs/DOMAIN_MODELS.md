# CricDNA Domain Models

This module defines the foundational data contracts for CricDNA.

It intentionally does not implement extraction logic, AI features, ratings, predictions, or cricket insight generation.

## Data Flow

```text
Raw Match APIs
  -> Summary / Scorecard / Comments / Graphs
  -> PlayerMatchRecord
  -> PlayerKnowledgeModel
```

## Folder Structure

```text
src/cricdna/
  docs/
    DOMAIN_MODELS.md
  domain/
    contracts/
      repository.ts
    models/
      PlayerMatchRecord.ts
      PlayerKnowledgeModel.ts
    types/
      common.ts
      serialization.ts
    index.ts
```

## PlayerMatchRecord

`PlayerMatchRecord` is the canonical per-player, per-match domain record.

It is designed to be created after raw match API payloads have already been normalized by a future extraction layer. It does not know how to read CricAPI, scorecards, commentary, or graphs.

### Sections

**Identity**

Defines the player and match relationship:

- `playerId`
- `playerName`
- `matchId`
- player team
- opponent
- optional declared player role, batting hand, and bowling style

**Context**

Captures match-level context needed to understand the record without looking up the raw match again:

- match format
- date
- venue
- competition
- innings played
- toss details
- match result
- player team result
- home/away/neutral marker

**Batting**

Preserves batting innings data without deriving meaning:

- innings number
- batting position
- runs
- balls faced
- fours
- sixes
- minutes
- dismissal metadata

**Bowling**

Preserves bowling spell and wicket data:

- overs
- balls
- maidens
- runs conceded
- wickets
- extras
- optional dot balls
- wicket events

**Fielding**

Captures directly observed fielding record items:

- catches
- stumpings
- direct run outs
- assisted run outs
- optional byes conceded for wicketkeepers

**Behaviour**

Stores observable match participation or event flags only:

- captain
- wicketkeeper
- substitute
- player of match
- externally observed behaviour events from source data

This section is not for sentiment, temperament, leadership scoring, aggression scoring, or inferred behavior.

**Progression**

Stores time-series observations tied to ball references:

- batting score progression
- bowling spell progression

It is a data-preservation layer for future analysis. It does not calculate trends.

### Serialization

`PlayerMatchRecord` implements:

- `toJSON()`
- `fromJSON(json)`

The JSON shape is the same as `PlayerMatchRecordProps`, which keeps persistence and tests straightforward.

## PlayerKnowledgeModel

`PlayerKnowledgeModel` aggregates `PlayerMatchRecord` instances for one player.

It preserves complete history. It does not summarize, rate, rank, predict, or infer.

### Responsibilities

- Enforce that records belong to one `playerId`
- Preserve full historical PMRs
- Maintain a lightweight history index
- Serialize and deserialize complete history

### History

The `history.records` array contains complete `PlayerMatchRecord` objects.

The `history.index` array contains lightweight lookup metadata:

- `matchId`
- `matchDate`
- `format`
- team
- opponent

This index is for navigation and persistence convenience, not analytics.

### Mutation Model

The model uses immutable update methods.

`addRecord(record, metadata)` returns a new `PlayerKnowledgeModel` instead of mutating the existing one. This keeps the model unit-test friendly and easier to reason about in backend pipelines.

## Repository Contracts

`repository.ts` defines ports only:

- `PlayerMatchRecordRepository`
- `PlayerKnowledgeModelRepository`

No database, file system, or API implementation is included. Infrastructure can implement these contracts later.

## Extensibility Rules

- Add new observed source facts as optional fields or nested value objects.
- Keep derived intelligence out of these models.
- Keep extraction code outside the domain models.
- Preserve raw source references through `DataProvenance` when available.
- Version persisted shapes through `AuditMetadata.schemaVersion`.

## Out of Scope

The following are intentionally not implemented:

- raw API extraction
- scorecard parsing
- commentary parsing
- graph parsing
- AI summaries
- player ratings
- form trends
- cricket DNA scoring
- recommendations
- predictions
