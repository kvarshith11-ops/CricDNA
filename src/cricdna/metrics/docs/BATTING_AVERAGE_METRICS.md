# Batting Average and Dismissal Primitive Metrics

This document defines deterministic Batting Average and Dismissal metrics for CricDNA.

These metrics:

- Consume only `PlayerKnowledgeModel.history.records[*].batting.innings`
- Do not read raw API payloads
- Do not read PMRs outside the PKM history surface
- Do not depend on other metrics
- Do not calculate rotation, dot-ball, phase, composite, rating, or AI outputs

## Shared PKM Inputs

Every metric uses batting innings rows from:

`PlayerKnowledgeModel.history.records[*].batting.innings[*]`

Relevant fields:

- `didBat`
- `runs`
- `dismissal.kind`
- `inningsNumber`

## Shared Validation

All metrics fail validation when:

- The PKM career is empty
- Any innings has `inningsNumber < 1`
- Any innings has negative `runs`
- Dismissals exceed batting innings

`bat.average` returns `MISSING_DATA` with a `null` value when outs are zero.

## Dismissal Policy

An innings counts as an out only when:

- `didBat` is `true`
- `dismissal` exists
- `dismissal.kind` is not `NotOut`

Missing dismissal data and explicit `NotOut` dismissals are not counted as outs.

## bat.outs

Metric ID: `bat.outs`

Definition: Number of batting innings where the player was dismissed.

Formula: `count(innings where didBat && dismissal exists && dismissal.kind != NotOut)`

PKM Inputs: `didBat`, `dismissal.kind`

Output: Numeric `MetricResult.value`

Unit: `innings`

Validation: Outs cannot exceed batting innings.

Edge Cases: Returns zero when the career is non-empty but the player has no dismissals.

## bat.average

Metric ID: `bat.average`

Definition: Runs scored per dismissal.

Formula: `total runs / outs`

PKM Inputs: `runs`, `didBat`, `dismissal.kind`

Output: Numeric `MetricResult.value`

Unit: `runs per dismissal`

Validation: Average must be finite and non-negative.

Edge Cases: Returns `MISSING_DATA` when outs are zero. It never returns `Infinity`.

## bat.ducks

Metric ID: `bat.ducks`

Definition: Number of dismissed innings where the player scored zero runs.

Formula: `count(innings where didBat && runs == 0 && dismissal exists && dismissal.kind != NotOut)`

PKM Inputs: `runs`, `didBat`, `dismissal.kind`

Output: Numeric `MetricResult.value`

Unit: `innings`

Validation: Ducks cannot exceed outs.

Edge Cases: A zero not-out is not counted as a duck.
