# Progression Core Primitive Metrics

This document defines deterministic Progression Core metrics for CricDNA.

These metrics:

- Consume only `PlayerKnowledgeModel.history.records[*].progression`
- Do not read raw API payloads
- Do not depend on other metrics
- Do not infer progression
- Do not estimate momentum
- Do not derive statistics from commentary
- Do not calculate momentum scores, pressure scores, acceleration ratings, composites, ratings, AI outputs, or narrative text

## Supported PKM Progression Surface

The current PKM progression model contains:

- `progression.battingTimeline[*].ballRef`
- `progression.battingTimeline[*].teamRuns`
- `progression.battingTimeline[*].playerRuns`
- `progression.battingTimeline[*].playerBallsFaced`
- `progression.battingTimeline[*].wicketsDown`
- `progression.bowlingTimeline[*].ballRef`
- `progression.bowlingTimeline[*].runsConcededToDate`
- `progression.bowlingTimeline[*].ballsBowledToDate`
- `progression.bowlingTimeline[*].wicketsToDate`

Only these fields are used.

## Output Encoding

The current `MetricResult.value` contract supports:

- `number`
- `string`
- `boolean`
- `null`

Dictionary-style progression metrics therefore return deterministic JSON strings with sorted keys.

## Shared Validation

All progression metrics fail validation when:

- The PKM career is empty
- Progression history is missing
- A progression point has a duplicate match/timeline/innings/over/ball key
- A progression point has negative over or ball values
- A timeline moves backward within the same innings

A non-empty career with empty progression timelines is valid and returns zero counts.

## Implemented Metrics

### progression.innings_progressions

Metric ID: `progression.innings_progressions`

Definition: Distribution of progression points by innings ID across batting and bowling timelines.

Formula: `countBy(battingTimeline.ballRef.inningsId + bowlingTimeline.ballRef.inningsId)`

PKM Inputs:

- `progression.battingTimeline[*].ballRef.inningsId`
- `progression.bowlingTimeline[*].ballRef.inningsId`

Validation: Progression points must not be duplicated and must be ordered within each innings.

Edge Cases: Missing innings IDs are counted as `Unknown`. Empty timelines return `{}` as a JSON string.

### progression.run_progression_points

Metric ID: `progression.run_progression_points`

Definition: Count of batting timeline progression points.

Formula: `count(progression.battingTimeline)`

PKM Inputs:

- `progression.battingTimeline[*]`

Validation: Batting timeline points must not be duplicated and must be ordered within each innings.

Edge Cases: Empty batting timelines return zero.

### progression.wicket_progression_points

Metric ID: `progression.wicket_progression_points`

Definition: Count of bowling timeline progression points.

Formula: `count(progression.bowlingTimeline)`

PKM Inputs:

- `progression.bowlingTimeline[*]`

Validation: Bowling timeline points must not be duplicated and must be ordered within each innings.

Edge Cases: Empty bowling timelines return zero.

### progression.progression_events

Metric ID: `progression.progression_events`

Definition: Total count of supported progression points across batting and bowling timelines.

Formula: `count(progression.battingTimeline) + count(progression.bowlingTimeline)`

PKM Inputs:

- `progression.battingTimeline[*]`
- `progression.bowlingTimeline[*]`

Validation: All progression points must pass duplicate and ordering validation.

Edge Cases: Empty timelines return zero.

## Omitted Planned Metrics

### progression.over_segments

Reason for omission: The PKM has ball references with over numbers, but it does not contain explicit over segment objects.

Missing PKM fields:

- `progression.overSegments`
- explicit segment start/end boundaries

Future implementability: Implementable after PKM evolves to store deterministic over segment records or guaranteed complete over-level progression.

### progression.phase_segments

Reason for omission: The PKM does not contain deterministic phase labels or phase segment records.

Missing PKM fields:

- `progression.phaseSegments`
- phase label
- phase start/end boundaries

Future implementability: Implementable after PKM stores phase-tagged progression segments.

### progression.momentum

Reason for omission: The PKM does not contain a deterministic momentum field, and momentum must not be inferred or estimated here.

Missing PKM fields:

- `progression.momentum`
- deterministic source-provided momentum values

Future implementability: Implementable only if future PKM stores source-observed deterministic momentum values.

### progression.pressure

Reason for omission: The PKM does not contain pressure state labels or required contextual state.

Missing PKM fields:

- `progression.pressureState`
- target context
- required run rate
- wickets/overs state encoded as pressure categories

Future implementability: Implementable only after deterministic pressure-state data is modeled.

### progression.acceleration

Reason for omission: Acceleration is a derived interpretation over time and is outside primitive progression metrics.

Missing PKM fields:

- explicit source-observed acceleration values

Future implementability: Implementable as a future derived or composite metric if allowed by the metric roadmap, not as a primitive supported by current PKM.
