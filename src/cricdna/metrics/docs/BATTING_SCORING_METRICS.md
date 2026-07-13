# Batting Scoring Primitive Metrics

This document defines deterministic Batting Scoring metrics for CricDNA.

These metrics:

- Consume only `PlayerKnowledgeModel.history.records[*].batting.innings`
- Do not read raw API payloads
- Do not read PMRs outside the PKM history surface
- Do not depend on other metrics
- Do not calculate averages, ratings, traits, composites, or AI outputs

## Shared PKM Inputs

Every metric uses batting innings rows from:

`PlayerKnowledgeModel.history.records[*].batting.innings[*]`

Relevant fields:

- `runs`
- `ballsFaced`
- `fours`
- `sixes`
- `inningsNumber`

## Shared Validation

All metrics fail validation when:

- The PKM career is empty
- Any innings has `inningsNumber < 1`
- Any innings has negative `runs`
- Any innings has negative `ballsFaced`
- Any innings has negative `fours`
- Any innings has negative `sixes`
- Boundary runs exceed total runs

Divide-by-zero cases return `MISSING_DATA` with a `null` value.

## bat.strike_rate

Metric ID: `bat.strike_rate`

Definition: Runs scored per 100 balls faced.

Formula: `(total runs / total balls faced) * 100`

PKM Inputs: `runs`, `ballsFaced`

Output: Numeric `MetricResult.value`

Unit: `runs per 100 balls`

Validation: Requires non-negative runs and balls faced. Requires balls faced greater than zero.

Edge Cases: Returns `MISSING_DATA` when balls faced is zero.

## bat.boundary_runs

Metric ID: `bat.boundary_runs`

Definition: Total runs scored from fours and sixes.

Formula: `(4 * total fours) + (6 * total sixes)`

PKM Inputs: `fours`, `sixes`, `runs`

Output: Numeric `MetricResult.value`

Unit: `runs`

Validation: Boundary runs must not exceed total runs.

Edge Cases: Returns zero when no boundaries exist and total runs are valid.

## bat.boundary_percentage

Metric ID: `bat.boundary_percentage`

Definition: Percentage of total runs scored from boundaries.

Formula: `(boundary runs / total runs) * 100`

PKM Inputs: `runs`, `fours`, `sixes`

Output: Numeric `MetricResult.value`

Unit: `percent`

Validation: Result must be between 0 and 100.

Edge Cases: Returns `MISSING_DATA` when total runs is zero.

## bat.boundary_frequency

Metric ID: `bat.boundary_frequency`

Definition: Balls faced per boundary.

Formula: `total balls faced / (total fours + total sixes)`

PKM Inputs: `ballsFaced`, `fours`, `sixes`

Output: Numeric `MetricResult.value`

Unit: `balls per boundary`

Validation: Requires non-negative balls faced, fours, and sixes.

Edge Cases: Returns `MISSING_DATA` when boundary count is zero.

## bat.runs_per_ball

Metric ID: `bat.runs_per_ball`

Definition: Runs scored per ball faced.

Formula: `total runs / total balls faced`

PKM Inputs: `runs`, `ballsFaced`

Output: Numeric `MetricResult.value`

Unit: `runs per ball`

Validation: Requires non-negative runs and balls faced. Requires balls faced greater than zero.

Edge Cases: Returns `MISSING_DATA` when balls faced is zero.

## bat.runs_per_boundary

Metric ID: `bat.runs_per_boundary`

Definition: Runs scored per boundary event.

Formula: `total runs / (total fours + total sixes)`

PKM Inputs: `runs`, `fours`, `sixes`

Output: Numeric `MetricResult.value`

Unit: `runs per boundary`

Validation: Requires non-negative runs, fours, and sixes.

Edge Cases: Returns `MISSING_DATA` when boundary count is zero.

## bat.fours

Metric ID: `bat.fours`

Definition: Total fours hit across batting history.

Formula: `sum(fours)`

PKM Inputs: `fours`

Output: Numeric `MetricResult.value`

Unit: `fours`

Validation: Fours cannot be negative.

Edge Cases: Returns zero when no fours exist and the career is non-empty.

## bat.sixes

Metric ID: `bat.sixes`

Definition: Total sixes hit across batting history.

Formula: `sum(sixes)`

PKM Inputs: `sixes`

Output: Numeric `MetricResult.value`

Unit: `sixes`

Validation: Sixes cannot be negative.

Edge Cases: Returns zero when no sixes exist and the career is non-empty.

## bat.fours_percentage

Metric ID: `bat.fours_percentage`

Definition: Percentage of total runs scored from fours.

Formula: `((total fours * 4) / total runs) * 100`

PKM Inputs: `runs`, `fours`

Output: Numeric `MetricResult.value`

Unit: `percent`

Validation: Result must be between 0 and 100.

Edge Cases: Returns `MISSING_DATA` when total runs is zero.

## bat.sixes_percentage

Metric ID: `bat.sixes_percentage`

Definition: Percentage of total runs scored from sixes.

Formula: `((total sixes * 6) / total runs) * 100`

PKM Inputs: `runs`, `sixes`

Output: Numeric `MetricResult.value`

Unit: `percent`

Validation: Result must be between 0 and 100.

Edge Cases: Returns `MISSING_DATA` when total runs is zero.
