# Fielding Core Primitive Metrics

This document defines deterministic Fielding Core metrics for CricDNA.

These metrics:

- Consume only `PlayerKnowledgeModel.history.records[*].fielding.innings`
- Do not read raw API payloads
- Do not read PMRs outside the PKM history surface
- Do not depend on other metrics
- Do not infer fielding events
- Do not calculate catch success, drop rate, difficulty ratings, composites, ratings, or AI outputs

## Shared PKM Inputs

Every metric uses fielding innings rows from:

`PlayerKnowledgeModel.history.records[*].fielding.innings[*]`

Relevant fields:

- `inningsNumber`
- `catches`
- `stumpings`
- `runOutsDirect`
- `runOutsAssisted`

## Shared Validation

All metrics fail validation when:

- The PKM career is empty
- Any fielding innings has `inningsNumber < 1`
- Any fielding innings has negative `catches`
- Any fielding innings has negative `stumpings`
- Any fielding innings has negative `runOutsDirect`
- Any fielding innings has negative `runOutsAssisted`
- Dismissal totals are invalid

A non-empty career with no fielding innings is treated as valid zero fielding participation.

## field.matches

Metric ID: `field.matches`

Definition: Number of matches with fielding participation.

Formula: `count(records where fielding.innings.length > 0)`

PKM Inputs: `history.records[*].fielding.innings`

Validation: Career must be non-empty.

Edge Cases: Returns zero when the player has no fielding innings in a non-empty career.

## field.innings

Metric ID: `field.innings`

Definition: Number of fielding innings.

Formula: `count(fielding.innings)`

PKM Inputs: `history.records[*].fielding.innings[*]`

Validation: Fielding innings numbers must be valid.

Edge Cases: Returns zero when no fielding innings are present.

## field.catches

Metric ID: `field.catches`

Definition: Total catches taken.

Formula: `sum(catches)`

PKM Inputs: `catches`

Validation: Catches cannot be negative.

Edge Cases: Returns zero when no catches are recorded.

## field.stumpings

Metric ID: `field.stumpings`

Definition: Total stumpings completed.

Formula: `sum(stumpings)`

PKM Inputs: `stumpings`

Validation: Stumpings cannot be negative.

Edge Cases: Returns zero when no stumpings are recorded.

## field.run_outs

Metric ID: `field.run_outs`

Definition: Total direct run outs.

Formula: `sum(runOutsDirect)`

PKM Inputs: `runOutsDirect`

Validation: Direct run outs cannot be negative.

Edge Cases: Returns zero when no direct run outs are recorded.

## field.assisted_run_outs

Metric ID: `field.assisted_run_outs`

Definition: Total assisted run outs.

Formula: `sum(runOutsAssisted)`

PKM Inputs: `runOutsAssisted`

Validation: Assisted run outs cannot be negative.

Edge Cases: Returns zero when no assisted run outs are recorded.

## field.dismissals

Metric ID: `field.dismissals`

Definition: Total fielding dismissals credited to the player.

Formula: `catches + stumpings + runOutsDirect + runOutsAssisted`

PKM Inputs: `catches`, `stumpings`, `runOutsDirect`, `runOutsAssisted`

Validation: Dismissals must equal the sum of all supported fielding dismissal event counts.

Edge Cases: Returns zero when no fielding dismissal events are recorded.
