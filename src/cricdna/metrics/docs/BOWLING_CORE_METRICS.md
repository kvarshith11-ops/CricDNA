# Bowling Core Primitive Metrics

This document defines deterministic Bowling Core metrics for CricDNA.

These metrics:

- Consume only `PlayerKnowledgeModel.history.records[*].bowling.spells`
- Do not read raw API payloads
- Do not read PMRs outside the PKM history surface
- Do not depend on other metrics
- Do not calculate dot-ball, phase, boundary-conceded, composite, rating, or AI outputs

## Shared PKM Inputs

Every metric uses bowling spell rows from:

`PlayerKnowledgeModel.history.records[*].bowling.spells[*]`

Relevant fields:

- `didBowl`
- `inningsNumber`
- `overs`
- `balls`
- `maidens`
- `runsConceded`
- `wickets`
- `noBalls`
- `wides`

## Shared Validation

All metrics fail validation when:

- The PKM career is empty
- Any spell has `inningsNumber < 1`
- Any spell has negative `overs`
- Any spell has negative `balls`
- Any spell has negative `maidens`
- Any spell has negative `runsConceded`
- Any spell has negative `wickets`
- Any spell has negative `noBalls`
- Any spell has negative `wides`
- Legal balls exceed `overs * 6`
- Maidens exceed overs

Rate metrics return `MISSING_DATA` with a `null` value when the denominator is zero.

## Bowling Spell Policy

Career totals include only spells where `didBowl` is `true`.

Rows where `didBowl` is `false` are still validated structurally, but they are excluded from bowling totals.

## bowl.matches

Metric ID: `bowl.matches`

Definition: Number of matches where the player bowled.

Formula: `count(records where any bowling.spells[*].didBowl == true)`

PKM Inputs: `history.records[*].bowling.spells[*].didBowl`

Validation: Career must be non-empty.

Edge Cases: Returns zero for a non-empty career where the player never bowled.

## bowl.innings

Metric ID: `bowl.innings`

Definition: Number of bowling innings.

Formula: `count(spells where didBowl == true)`

PKM Inputs: `didBowl`

Validation: Career must be non-empty.

Edge Cases: Returns zero when no bowling spells exist.

## bowl.overs

Metric ID: `bowl.overs`

Definition: Total overs bowled.

Formula: `sum(overs for spells where didBowl == true)`

PKM Inputs: `didBowl`, `overs`

Validation: Overs cannot be negative. Legal balls cannot exceed `overs * 6`.

Edge Cases: Returns zero when no overs were bowled.

## bowl.balls

Metric ID: `bowl.balls`

Definition: Total legal deliveries bowled.

Formula: `sum(balls for spells where didBowl == true)`

PKM Inputs: `didBowl`, `balls`

Validation: Balls cannot be negative. Legal balls cannot exceed `overs * 6`.

Edge Cases: Returns zero when no legal deliveries were bowled.

## bowl.maidens

Metric ID: `bowl.maidens`

Definition: Total maiden overs bowled.

Formula: `sum(maidens for spells where didBowl == true)`

PKM Inputs: `didBowl`, `maidens`

Validation: Maidens cannot be negative. Maidens cannot exceed overs.

Edge Cases: Returns zero when no maidens were bowled.

## bowl.runs_conceded

Metric ID: `bowl.runs_conceded`

Definition: Total runs conceded while bowling.

Formula: `sum(runsConceded for spells where didBowl == true)`

PKM Inputs: `didBowl`, `runsConceded`

Validation: Runs conceded cannot be negative.

Edge Cases: Returns zero when the player bowled and conceded no runs.

## bowl.wickets

Metric ID: `bowl.wickets`

Definition: Total wickets credited to the bowler.

Formula: `sum(wickets for spells where didBowl == true)`

PKM Inputs: `didBowl`, `wickets`

Validation: Wickets cannot be negative.

Edge Cases: Returns zero when the player took no wickets.

## bowl.no_balls

Metric ID: `bowl.no_balls`

Definition: Total no-balls bowled.

Formula: `sum(noBalls for spells where didBowl == true)`

PKM Inputs: `didBowl`, `noBalls`

Validation: No-balls cannot be negative.

Edge Cases: Returns zero when no no-balls were bowled.

## bowl.wides

Metric ID: `bowl.wides`

Definition: Total wides bowled.

Formula: `sum(wides for spells where didBowl == true)`

PKM Inputs: `didBowl`, `wides`

Validation: Wides cannot be negative.

Edge Cases: Returns zero when no wides were bowled.

## bowl.economy

Metric ID: `bowl.economy`

Definition: Runs conceded per over.

Formula: `runsConceded / (balls / 6)`

PKM Inputs: `runsConceded`, `balls`

Validation: Economy must be finite and non-negative.

Edge Cases: Returns `MISSING_DATA` when balls are zero. It never returns `Infinity`.

## bowl.average

Metric ID: `bowl.average`

Definition: Runs conceded per wicket.

Formula: `runsConceded / wickets`

PKM Inputs: `runsConceded`, `wickets`

Validation: Average must be finite and non-negative.

Edge Cases: Returns `MISSING_DATA` when wickets are zero. It never returns `Infinity`.

## bowl.strike_rate

Metric ID: `bowl.strike_rate`

Definition: Legal deliveries bowled per wicket.

Formula: `balls / wickets`

PKM Inputs: `balls`, `wickets`

Validation: Strike rate must be finite and non-negative.

Edge Cases: Returns `MISSING_DATA` when wickets are zero. It never returns `Infinity`.
