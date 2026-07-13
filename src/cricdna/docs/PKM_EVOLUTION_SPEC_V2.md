# PKM Evolution Specification v2

## Purpose

`PlayerKnowledgeModel` v1 preserves complete deterministic match history and supports the current primitive metric layer plus first-generation composite metrics.

Several planned composites, traits, ratings, and narrative features remain blocked because v1 does not connect performance to deterministic context, phase, opportunity, and event-level facts.

This document designs `PlayerKnowledgeModel` v2. It is a design blueprint only. It does not implement models, extractors, metrics, ratings, or AI.

## Non-Goals

- No AI features.
- No ratings implementation.
- No metric formulas.
- No extractor implementation.
- No mutation of current PMR or PKM code.
- No inferred cricket knowledge.

## Current PKM v1 Summary

PKM v1 preserves:

- Identity and match references
- Match context
- Batting innings scorecard facts
- Bowling spell scorecard facts
- Fielding scorecard facts
- Behaviour flags and raw commentary events
- Batting and bowling progression timelines

PKM v1 does not preserve:

- Ball-by-ball batting outcomes
- Ball-by-ball bowling outcomes
- Phase labels
- Chase/target state
- Required run rate at event time
- Team score context at each player event
- Pressure-state context
- Fielding opportunities
- Venue and competition classification
- Opponent style and bowling type faced
- Performance split by context bucket

## Design Principles

- Store deterministic facts, not scores.
- Keep ratings and AI outside PKM.
- Prefer source-observed values over derived values.
- Allow derived context only when the derivation is deterministic and documented.
- Preserve source provenance for every v2 section.
- Keep v2 additive where possible.
- Avoid storing metric outputs inside PKM.

## Proposed v2 Domains

PKM v2 should retain existing domains and add two new domains:

- `Situation`: deterministic match-state context at innings, over, and ball level.
- `Opportunity`: deterministic opportunity denominators for fielding, batting, and bowling contexts.

Recommended top-level v2 layout:

```text
PlayerKnowledgeModelV2
  identity
  history
    records[]
      identity
      context
      situation
      batting
      bowling
      fielding
      behaviour
      progression
      opportunity
      metadata
```

## Roadmap Support Matrix

| Roadmap Area | Current Status | v2 Requirement |
| --- | --- | --- |
| Pressure | Blocked | Match situation, chase state, required run rate, wickets remaining, phase, score state. |
| Finishing | Blocked | Death-over phase, chase/target, innings role, balls remaining, wickets remaining. |
| Adaptability | Blocked | Performance linked to format, opponent, venue, competition, bowling type faced, home/away. |
| Control | Blocked | Dot balls, singles, twos, threes, false/control shot data if available. |
| Economy Control | Partially supported | Bowling phase splits, dot balls coverage, boundary conceded events. |
| Wicket Threat | Partially supported | Wicket events, near-wicket events if source-supported, phase/opponent context. |
| Fielding Impact | Partially supported | Catches/stumpings/run-outs exist, but opportunities and dropped chances are missing. |
| Traits | Blocked/Partial | Requires stable composite metric families and context-specific deterministic features. |
| Ratings | Blocked/Partial | Requires normalized metric families and comparable sample/context metadata. |
| AI Narrative | Blocked/Partial | Requires deterministic evidence bundles, provenance, and metric explanations. |

## Field Additions

### Context Additions

| Field Name | Purpose | Source API | Source Extractor | Domain | Future Metrics | Deterministic | Immutable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `context.venue.id` | Stable venue identity beyond name/city/country. | Summary, Scorecard | SummaryExtractor or ScorecardExtractor | Context | Adaptability, venue splits, ratings context. | Yes, if source provides id. | Yes |
| `context.venue.type` | Classify venue context only when source or internal reference table supports it. | Reference data plus Summary/Scorecard venue | ContextEnrichmentExtractor | Context | Adaptability, ratings normalization. | Yes if table-driven. | Yes |
| `context.competition.id` | Stable competition identity. | Summary, Scorecard | SummaryExtractor or ScorecardExtractor | Context | Competition splits, league/international traits. | Yes | Yes |
| `context.competition.name` | Human-readable competition. | Summary, Scorecard | SummaryExtractor or ScorecardExtractor | Context | Narrative evidence, competition filters. | Yes | Yes |
| `context.competition.level` | International, domestic, league, unknown. | Summary/Scorecard plus reference table | ContextEnrichmentExtractor | Context | Adaptability, ratings cohorts. | Yes if table-driven. | Yes |
| `context.matchStage` | Group, knockout, final, bilateral, unknown. | Summary/Scorecard competition/tour metadata, fixture title when structured | ContextEnrichmentExtractor | Context | Pressure, ratings context. | Partially; only if source/reference structured. | Yes |
| `context.homeAwayNeutral` required | Make existing optional marker explicit and provenance-backed. | Summary, Scorecard | SummaryExtractor or ScorecardExtractor | Context | Adaptability, home/away splits. | Yes when team/venue country reliable. | Yes |
| `context.seriesId` | Stable series/tour grouping. | Summary, Scorecard | SummaryExtractor or ScorecardExtractor | Context | Adaptability, narrative chronology. | Yes if source provides id. | Yes |
| `context.isKnockout` | Binary high-value match marker. | Competition/stage source or reference table | ContextEnrichmentExtractor | Context | Pressure, ratings context. | Yes if stage known. | Yes |

### Situation Additions

| Field Name | Purpose | Source API | Source Extractor | Domain | Future Metrics | Deterministic | Immutable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `situation.innings[].inningsId` | Join key for situation records. | Summary, Scorecard, Comments, Graphs | SummaryExtractor, ScorecardExtractor, GraphsExtractor | Situation | All context-specific metrics. | Yes | Yes |
| `situation.innings[].battingTeam` | Identify batting side for innings. | Summary, Scorecard | SummaryExtractor or ScorecardExtractor | Situation | Chase, target, innings role. | Yes | Yes |
| `situation.innings[].bowlingTeam` | Identify bowling side for innings. | Summary, Scorecard | SummaryExtractor or ScorecardExtractor | Situation | Bowling control, fielding impact. | Yes | Yes |
| `situation.innings[].inningsRole` | Setting, chasing, follow-on/continuation, unknown. | Summary, Scorecard | SituationExtractor | Situation | Pressure, finishing, adaptability. | Yes for limited overs; partial for Tests. | Yes |
| `situation.innings[].target` | Target runs for chasing innings. | Summary optional fields, Comments, Graphs | SituationExtractor | Situation | Pressure, finishing. | Yes when source has enough innings totals. | Yes |
| `situation.innings[].defendingScore` | Score being defended by bowling team. | Summary/Scorecard innings totals | SituationExtractor | Situation | Bowling pressure, economy control. | Yes when previous innings complete. | Yes |
| `situation.innings[].scheduledOvers` | Innings over limit. | Summary/Scorecard fixture metadata | SituationExtractor | Situation | Phase tagging, required rate. | Yes when format/fixture gives it. | Yes |
| `situation.innings[].ballsAvailable` | Total legal balls available. | Summary optional balls fields, format rules | SituationExtractor | Situation | Finishing, required rate. | Yes for limited overs if scheduled overs known. | Yes |
| `situation.snapshots[].ballRef` | Join key for ball/over state. | Comments, Graphs | CommentsExtractor or GraphsExtractor | Situation | Pressure, finishing, phase metrics. | Yes | Yes |
| `situation.snapshots[].teamRuns` | Current innings score. | Comments, Graphs | CommentsExtractor or GraphsExtractor | Situation | Pressure, run progression. | Yes | Yes |
| `situation.snapshots[].wicketsDown` | Current wickets lost. | Comments, Graphs | CommentsExtractor or GraphsExtractor | Situation | Pressure, wickets remaining. | Yes | Yes |
| `situation.snapshots[].ballsElapsed` | Legal balls elapsed. | Comments, Graphs | CommentsExtractor or GraphsExtractor | Situation | Current run rate, phase, finishing. | Yes if legal-ball rules are explicit. | Yes |
| `situation.snapshots[].ballsRemaining` | Legal balls remaining. | Summary optional, Comments derived, Graphs over-level | SituationExtractor | Situation | Finishing, pressure. | Yes if ballsAvailable and ballsElapsed known. | Yes |
| `situation.snapshots[].currentRunRate` | Runs per over at state. | Comments/Graphs plus deterministic calculation | SituationExtractor | Situation | Pressure, acceleration context. | Derived deterministic. | Yes |
| `situation.snapshots[].requiredRunRate` | Required rate in chase. | Summary optional, Comments/Graphs derived | SituationExtractor | Situation | Pressure, finishing. | Derived deterministic when target known. | Yes |
| `situation.snapshots[].wicketsRemaining` | Remaining wickets. | Comments/Graphs plus wicketsDown | SituationExtractor | Situation | Pressure, finishing. | Derived deterministic. | Yes |
| `situation.snapshots[].phase` | Powerplay, middle, death, other. | Comments/Graphs plus format rules | SituationExtractor | Situation | Finishing, economy control, phase metrics. | Derived deterministic if phase rules versioned. | Yes |
| `situation.snapshots[].pressureBand` | Low, medium, high deterministic state band. | Situation snapshot fields | SituationExtractor | Situation | Pressure composites, traits. | Derived deterministic if formula versioned. | Yes |

### Batting Additions

| Field Name | Purpose | Source API | Source Extractor | Domain | Future Metrics | Deterministic | Immutable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `batting.events[].ballRef` | Join batting event to situation and progression. | Comments | CommentsExtractor | Batting | Pressure, finishing, phase batting. | Yes | Yes |
| `batting.events[].bowlerId` | Identify bowler faced. | Comments | CommentsExtractor | Batting | Adaptability, bowling type faced. | Yes when source has bowler id. | Yes |
| `batting.events[].runsOffBat` | Ball-level batter runs. | Comments | CommentsExtractor | Batting | Rotation, dot %, phase scoring. | Yes | Yes |
| `batting.events[].isLegalDelivery` | Exclude wides/no-balls where appropriate. | Comments | CommentsExtractor | Batting | Balls faced, strike rate by phase. | Derived deterministic with rules. | Yes |
| `batting.events[].isDotBall` | Dot-ball event. | Comments | CommentsExtractor | Batting | Control, pressure, finishing. | Derived deterministic. | Yes |
| `batting.events[].scoringShotType` | Dot, single, two, three, four, six. | Comments | CommentsExtractor | Batting | Rotation, boundary dependency. | Derived deterministic from runsOffBat. | Yes |
| `batting.events[].phase` | Phase at batting event. | Situation snapshot | SituationExtractor | Batting | Finishing, phase strike rate. | Derived deterministic. | Yes |
| `batting.events[].pressureBand` | Pressure context for batting event. | Situation snapshot | SituationExtractor | Batting | Pressure metrics. | Derived deterministic. | Yes |
| `batting.events[].inningsRole` | Setting/chasing context. | Situation innings | SituationExtractor | Batting | Finishing, chase metrics. | Derived deterministic. | Yes |
| `batting.events[].bowlingStyleFaced` | Pace/spin and arm type faced. | Scorecard players, Summary players | ScorecardExtractor or PlayerEnrichmentExtractor | Batting | Adaptability, traits. | Yes when bowler metadata exists. | Yes |
| `batting.splits.byPhase[]` | Aggregated batting facts by phase. | Batting events plus Situation | BattingSplitExtractor | Batting | Finishing, pressure, traits. | Derived deterministic. | Yes |
| `batting.splits.byPressure[]` | Aggregated batting facts by pressure band. | Batting events plus Situation | BattingSplitExtractor | Batting | Pressure. | Derived deterministic. | Yes |
| `batting.splits.byBowlingType[]` | Aggregated batting facts vs pace/spin/arm. | Batting events plus player metadata | BattingSplitExtractor | Batting | Adaptability. | Derived deterministic. | Yes |
| `batting.splits.byContext[]` | Aggregated batting facts by format/opponent/home-away. | Context plus batting innings/events | BattingSplitExtractor | Batting | Adaptability, ratings cohorts. | Derived deterministic. | Yes |

### Bowling Additions

| Field Name | Purpose | Source API | Source Extractor | Domain | Future Metrics | Deterministic | Immutable |
| --- | --- | --- | --- | --- | --- | --- |
| `bowling.events[].ballRef` | Join bowling event to situation. | Comments | CommentsExtractor | Bowling | Economy control, wicket threat, phase bowling. | Yes | Yes |
| `bowling.events[].batterId` | Batter faced. | Comments | CommentsExtractor | Bowling | Matchup, adaptability, wicket threat. | Yes when source has batter id. | Yes |
| `bowling.events[].runsConceded` | Ball-level runs conceded. | Comments | CommentsExtractor | Bowling | Economy control, phase economy. | Yes | Yes |
| `bowling.events[].runsOffBat` | Separate batter runs from extras. | Comments | CommentsExtractor | Bowling | Boundary conceded, control. | Yes | Yes |
| `bowling.events[].extras` | Wides/no-balls/byes/leg-byes when available. | Comments | CommentsExtractor | Bowling | Control, economy quality. | Yes when source exposes type. | Yes |
| `bowling.events[].isLegalDelivery` | Legal-delivery denominator. | Comments | CommentsExtractor | Bowling | Economy, strike rate by phase. | Derived deterministic. | Yes |
| `bowling.events[].isDotBall` | Ball-level dot. | Comments, Scorecard dotBalls fallback | CommentsExtractor | Bowling | Control, economy control. | Yes | Yes |
| `bowling.events[].isBoundary` | Boundary conceded. | Comments | CommentsExtractor | Bowling | Control, pressure, economy control. | Derived deterministic. | Yes |
| `bowling.events[].isWicket` | Wicket event. | Comments, Scorecard wickets | CommentsExtractor or ScorecardExtractor | Bowling | Wicket threat. | Yes | Yes |
| `bowling.events[].phase` | Phase at delivery. | Situation snapshot | SituationExtractor | Bowling | Economy control, death bowling traits. | Derived deterministic. | Yes |
| `bowling.events[].pressureBand` | Pressure context for delivery. | Situation snapshot | SituationExtractor | Bowling | Pressure bowling, control. | Derived deterministic. | Yes |
| `bowling.splits.byPhase[]` | Aggregated bowling facts by phase. | Bowling events plus Situation | BowlingSplitExtractor | Bowling | Economy control, death specialist traits. | Derived deterministic. | Yes |
| `bowling.splits.byPressure[]` | Aggregated bowling facts by pressure. | Bowling events plus Situation | BowlingSplitExtractor | Bowling | Pressure control. | Derived deterministic. | Yes |
| `bowling.splits.byBatterType[]` | Bowling against batter handedness/role. | Events plus player metadata | BowlingSplitExtractor | Bowling | Adaptability, wicket threat. | Derived deterministic. | Yes |

### Fielding Additions

| Field Name | Purpose | Source API | Source Extractor | Domain | Future Metrics | Deterministic | Immutable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `fielding.events[].ballRef` | Join fielding event to ball context. | Comments, Scorecard wickets | CommentsExtractor or ScorecardExtractor | Fielding | Fielding impact, pressure fielding. | Yes | Yes |
| `fielding.events[].eventType` | Catch, stumping, run-out direct, run-out assisted, drop if source has it. | Comments, Scorecard | FieldingEventExtractor | Fielding | Fielding impact. | Yes if source indicates event. | Yes |
| `fielding.events[].dismissalKind` | Dismissal type linked to fielding action. | Scorecard wickets, Comments | ScorecardExtractor or CommentsExtractor | Fielding | Fielding impact. | Yes | Yes |
| `fielding.events[].opportunityType` | Catch chance, run-out chance, stumping chance when source supports it. | Comments only if explicit | FieldingOpportunityExtractor | Opportunity | Catch success, fielding impact. | Yes only if explicit. | Yes |
| `fielding.events[].wasSuccessful` | Whether opportunity became dismissal/save. | Comments/Scorecard | FieldingOpportunityExtractor | Opportunity | Catch success, drop rate. | Yes only if source has chance outcome. | Yes |
| `fielding.splits.byPhase[]` | Fielding events by phase. | Fielding events plus Situation | FieldingSplitExtractor | Fielding | Pressure fielding, impact. | Derived deterministic. | Yes |
| `opportunity.fielding.chances[]` | Explicit opportunity denominator. | Comments if explicit | FieldingOpportunityExtractor | Opportunity | Fielding impact, catch success. | Yes if explicit. | Yes |

### Behaviour Additions

| Field Name | Purpose | Source API | Source Extractor | Domain | Future Metrics | Deterministic | Immutable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `behaviour.events[].sourceType` | Distinguish commentary, scorecard flag, official award. | Comments, Scorecard | CommentsExtractor, ScorecardExtractor | Behaviour | Narrative provenance. | Yes | Yes |
| `behaviour.events[].eventCategory` | Store source-provided category only, not inferred category. | Comments | CommentsExtractor | Behaviour | Behaviour primitives if source categories stabilize. | Yes if source field exists. | Yes |
| `behaviour.roles[].roleType` | Captain, wicketkeeper, substitute as role events with dates/matches. | Scorecard players | ScorecardExtractor | Behaviour | Leadership context, role splits. | Yes | Yes |

### Progression Additions

| Field Name | Purpose | Source API | Source Extractor | Domain | Future Metrics | Deterministic | Immutable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `progression.overSegments[]` | Explicit over-level progression objects. | Graphs, Comments | GraphsExtractor | Progression | Phase metrics, economy control. | Yes | Yes |
| `progression.phaseSegments[]` | Explicit phase records with boundaries. | Derived from format and over | SituationExtractor | Progression | Phase traits, finishing. | Derived deterministic. | Yes |
| `progression.battingTimeline[].situationRef` | Join existing timeline point to situation snapshot. | Situation snapshots | SituationExtractor | Progression | Pressure, finishing. | Derived deterministic. | Yes |
| `progression.bowlingTimeline[].situationRef` | Join bowling progression to situation snapshot. | Situation snapshots | SituationExtractor | Progression | Economy control, wicket threat. | Derived deterministic. | Yes |

### Opponent and Player Metadata Additions

| Field Name | Purpose | Source API | Source Extractor | Domain | Future Metrics | Deterministic | Immutable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `opponent.players[].playerId` | Stable opponent player identity. | Summary, Scorecard, Comments | PlayerMetadataExtractor | New domain: OpponentContext | Adaptability, matchup traits. | Yes | Yes |
| `opponent.players[].battingHand` | Batter handedness context. | Summary players | PlayerMetadataExtractor | OpponentContext | Bowling adaptability, matchup. | Yes when source provides. | Yes |
| `opponent.players[].bowlingStyle` | Bowler style context. | Summary players | PlayerMetadataExtractor | OpponentContext | Batting adaptability. | Yes when source provides. | Yes |
| `opponent.players[].role` | Batter/bowler/allrounder/wicketkeeper. | Summary players | PlayerMetadataExtractor | OpponentContext | Ratings cohort, matchup. | Yes when source provides. | Yes |

## New Extractor Responsibilities

| Extractor | Responsibility |
| --- | --- |
| `SituationExtractor` | Build innings and ball/over situation snapshots from Summary, Comments, and Graphs. |
| `BattingEventExtractor` | Preserve ball-level batting events from Comments. |
| `BowlingEventExtractor` | Preserve ball-level bowling events from Comments. |
| `FieldingEventExtractor` | Preserve observed fielding events from Comments and Scorecard wickets. |
| `FieldingOpportunityExtractor` | Preserve fielding chances only when explicitly represented by source data. |
| `PlayerMetadataExtractor` | Normalize batting hand, bowling style, role, and player identities. |
| `ContextEnrichmentExtractor` | Add deterministic reference-table context such as venue type and competition level. |
| `SplitExtractor` | Build deterministic aggregate splits from v2 event records and context. |

## Future Metric Enablement

### Pressure

Requires:

- `situation.snapshots[].pressureBand`
- `batting.splits.byPressure[]`
- `bowling.splits.byPressure[]`
- `fielding.splits.byPhase[]` or pressure-linked fielding events

Enabled metrics:

- `bat.pressure`
- pressure batting traits
- pressure bowling control
- pressure-adjusted ratings

### Finishing

Requires:

- `situation.snapshots[].phase`
- `situation.innings[].target`
- `situation.snapshots[].ballsRemaining`
- `situation.snapshots[].requiredRunRate`
- `batting.splits.byPhase[]`

Enabled metrics:

- `bat.finishing`
- death-over batting
- chase finishing
- finisher traits

### Adaptability

Requires:

- `batting.splits.byContext[]`
- `batting.splits.byBowlingType[]`
- `context.competition.level`
- `context.homeAwayNeutral`
- `opponent.players[].bowlingStyle`

Enabled metrics:

- `bat.adaptability`
- format adaptability
- opponent adaptability
- pace/spin adaptability
- ratings context normalization

### Control and Economy Control

Requires:

- batting and bowling event-level dots
- legal deliveries
- boundary conceded events
- phase splits
- pressure splits

Enabled metrics:

- batting control
- bowling control
- economy control
- dot-ball control traits

### Wicket Threat

Requires:

- ball-level wicket events
- phase and pressure context
- batter context
- optional near-wicket/chance events only when source-observed

Enabled metrics:

- wicket threat
- phase wicket threat
- pressure wicket threat
- bowler trait candidates

### Fielding Impact

Requires:

- fielding events
- explicit fielding opportunities
- phase and pressure context
- dismissal involvement

Enabled metrics:

- fielding impact
- catch success
- pressure fielding
- wicketkeeper impact

### Traits

Traits should consume stable composite metrics and v2 context-specific composites. PKM v2 should not store trait labels as source facts.

Enabled trait families:

- Aggressor
- Anchor
- Finisher
- Pressure Performer
- Death Specialist
- Economy Controller
- Wicket Threat
- Fielding Impact Player
- Adaptable Batter

### Ratings

Ratings require:

- deterministic metric families
- sample-size metadata
- context buckets
- cohort definitions
- provenance and versioning

PKM v2 should provide facts and context. Rating formulas should remain outside PKM.

### AI Narrative

AI narrative should consume:

- metric results
- evidence bundles
- deterministic event references
- provenance

PKM v2 should support narrative grounding but should not generate narrative content.

## Versioning Requirements

PKM v2 should include:

- `schemaVersion`
- extractor versions
- phase rules version
- pressure rules version
- reference data version
- source endpoint provenance

Derived deterministic fields must record:

- source fields used
- derivation rule version
- extraction timestamp

## Migration Strategy

1. Keep v1 PMR/PKM readable.
2. Add v2 fields as optional during transition.
3. Backfill only fields that can be deterministically extracted from existing endpoints.
4. Mark unavailable fields as absent, not inferred.
5. Add metric feasibility checks before enabling new v2 composites.

## Implementation Order Recommendation

1. Situation domain.
2. Ball-level batting and bowling events.
3. Phase context.
4. Chase/target and required-rate context.
5. Context enrichment.
6. Fielding event/opportunity model.
7. Split aggregates.
8. New primitive metrics.
9. Advanced composites.
10. Traits and ratings.

## Open Decisions

- Whether pressure bands should be stored in PKM or generated by a versioned metric preprocessor.
- Whether split aggregates should be stored in PKM or generated as primitive metrics from event records.
- Whether venue and competition classification belongs in PKM or a separate reference-data service.
- How to represent Test-match phases and chase context differently from limited-overs matches.

## Final Recommendation

PKM v2 should evolve from match-history storage into deterministic event-and-context storage.

The most important additions are:

- situation snapshots
- phase context
- chase/target context
- ball-level batting and bowling events
- fielding opportunities
- opponent/player metadata
- context enrichment
- deterministic split aggregates

These additions unlock pressure, finishing, adaptability, control, economy control, wicket threat, fielding impact, traits, ratings, and grounded AI narrative without violating CricDNA's deterministic architecture.
