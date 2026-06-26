# CricDNA Extraction Validation Results

Status: Implemented deterministic extraction layer  
Contract: `ENDPOINT_MAPPING_SPEC.md`  
Scope: 20 grouped matches, 80 endpoint files

## Implemented Extractors

```text
src/cricdna/extraction/
  SummaryExtractor.ts
  ScorecardExtractor.ts
  CommentsExtractor.ts
  GraphsExtractor.ts
  helpers.ts
  types.ts
```

Each extractor returns only its assigned partial PMR section:

| Extractor | Populates |
|---|---|
| `SummaryExtractor` | `context` only |
| `ScorecardExtractor` | `batting`, `bowling`, `fielding` only |
| `CommentsExtractor` | `behaviour` only |
| `GraphsExtractor` | `progression` only |

No merge layer, PKM aggregation, AI logic, scoring, or insight generation was implemented.

## Validation Results

Command:

```bash
npm test
```

Result:

```text
Test Files  1 passed
Tests       10 passed
```

Validation coverage:

- All 20 matches are grouped by fixture id across Summary, Scorecard, Comments, and Graphs.
- `SummaryExtractor` validates context extraction for all 20 matches.
- `ScorecardExtractor` validates performance extraction for every player in every match.
- `CommentsExtractor` validates behaviour extraction for all 20 matches.
- `GraphsExtractor` validates progression extraction for all 20 matches.

Additional checks:

```bash
npm run build
npm run lint
```

Both passed.

## Extraction Assumptions

These assumptions come directly from the endpoint mapping specification.

### Cross-Endpoint Matching

- Matches are grouped by canonical fixture id.
- File basename is not used as the join key because `ausVomaT20I` and `ausVomanT20IWC` refer to the same fixture.

### SummaryExtractor

- `fixture.startDateTime` is normalized to `YYYY-MM-DD` for `context.matchDate`.
- `fixture.gameType` is normalized to domain `MatchFormat`.
- Toss decision casing is normalized.
- Player team result is determined mechanically from player team id and match-winner flags.
- No summary fields outside `context` are returned.

### ScorecardExtractor

- Scorecard is the authoritative source for scorecard-level batting, bowling, and fielding data.
- `totalBallsBowled` is used for bowling balls, not `ballsBowled`.
- `oversBowled` is parsed from source string to number.
- Yet-to-bat rows produce `didBat=false`.
- Missing optional batting values are handled gracefully.
- Fielding direct-vs-assisted run-out split is not fully inferable from scorecard alone; scorecard-derived run outs are preserved as assisted when a fielder id is present.

### CommentsExtractor

- Comments are treated as raw observable behaviour events.
- Events are not aggregated.
- If `nextPage` exists, only the locally available page is extracted; no network fetching is performed.
- `sourceCommentaryId` is not populated because no stable comment id was documented.

### GraphsExtractor

- Graphs provide over-level progression only.
- The domain model currently has `battingTimeline` and `bowlingTimeline`; it does not define separate momentum or phase fields.
- Run and wicket progression are preserved through existing progression points:
  - `teamRuns`
  - `wicketsDown`
  - `runsConcededToDate`
  - `wicketsToDate`
- No player-level progression is inferred from graphs because graphs contain no player ids.

## Deliberately Not Implemented

- Extractor merging
- PlayerKnowledgeModel aggregation
- Raw API fetching
- Commentary pagination fetching
- Engineering metrics
- AI features
- Ratings
- Cricket knowledge inference
