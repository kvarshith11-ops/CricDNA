# Fielding Composite Metrics

## Scope

These metrics are deterministic composite metrics.

They consume only existing primitive `MetricResult`s from the Metric Engine result cache. They do not read `PlayerKnowledgeModel`, PMRs, raw APIs, commentary, or generated text.

## Implemented Metrics

- `field.impact`
- `field.reliability`
- `field.activity`

## Omitted Metrics

No requested fielding composite metric was omitted.

Important limitation: the current primitive surface contains successful fielding outcomes only. It does not contain fielding chances, dropped catches, missed stumpings, missed run-out attempts, difficulty, fielding position, or opportunity denominators. Future reliability or impact models can become stronger when those primitives exist.

## Shared Validation

All implemented metrics validate:

- required primitive results exist in `context.results`
- dependencies are primitive metrics
- dependency status is `SUCCESS`
- dependency values are finite numbers
- dependency values are non-negative
- denominator inputs are greater than zero where required
- final score is finite and between 0 and 100

## Normalization Constants

Dismissals per match benchmark: `2`

Reasoning: two successful dismissals per match maps to the top of the fielding impact and activity dismissal components.

Dismissals per innings benchmark: `1.5`

Reasoning: one and a half successful dismissals per fielding innings maps to the top of the current reliability proxy.

Activity events per match benchmark: `2`

Reasoning: two successful fielding events per match maps to the top of the event activity component.

Catches per match benchmark: `1`

Reasoning: one catch per match maps to the top of the catch contribution component.

Stumpings per match benchmark: `0.5`

Reasoning: one stumping every two matches maps to the top of the specialist keeping contribution component.

Run outs per match benchmark: `0.5`

Reasoning: one direct or assisted run out every two matches maps to the top of the run-out contribution component.

## field.impact

Definition: Measures overall successful fielding contribution through dismissals, catches, stumpings, and run outs.

Dependencies:

- `field.matches`
- `field.dismissals`
- `field.catches`
- `field.stumpings`
- `field.run_outs`
- `field.assisted_run_outs`

Formula:

```text
dismissals_per_match_score = clamp((field.dismissals / field.matches) / 2 * 100)
catches_per_match_score = clamp((field.catches / field.matches) / 1 * 100)
stumpings_per_match_score = clamp((field.stumpings / field.matches) / 0.5 * 100)
run_outs_per_match_score =
  clamp(((field.run_outs + field.assisted_run_outs) / field.matches) / 0.5 * 100)

field.impact =
  dismissals_per_match_score * 0.45
  + catches_per_match_score * 0.25
  + stumpings_per_match_score * 0.15
  + run_outs_per_match_score * 0.15
```

Weightings:

- Dismissals per match: `45%`
- Catches per match: `25%`
- Stumpings per match: `15%`
- Run outs per match: `15%`

Interpretation:

- Higher values indicate more frequent successful involvement in dismissals.
- Keeper-specific stumpings and run-out contributions are included without inferring unseen chances.

Limitations:

- Does not include dropped catches, missed stumpings, or chance conversion.
- Does not include fielding position, difficulty, or match context.
- Measures successful outcomes only.

## field.reliability

Definition: Measures successful fielding involvement per fielding innings using the currently available primitive metrics.

Dependencies:

- `field.innings`
- `field.dismissals`

Formula:

```text
dismissals_per_innings_score = clamp((field.dismissals / field.innings) / 1.5 * 100)

field.reliability = dismissals_per_innings_score
```

Weightings:

- Dismissals per innings: `100%`

Interpretation:

- Higher values indicate more frequent successful fielding involvement per fielding innings.
- This is a deterministic successful-involvement proxy, not true opportunity-based reliability.

Limitations:

- Does not know chances offered to the player.
- Does not know drops, misses, fielding positions, or keeper opportunities.
- A future true reliability metric should depend on chance and error primitives.

## field.activity

Definition: Measures overall fielding participation and successful involvement.

Dependencies:

- `field.matches`
- `field.innings`
- `field.dismissals`
- `field.catches`
- `field.stumpings`
- `field.run_outs`
- `field.assisted_run_outs`

Formula:

```text
activity_events = field.catches
  + field.stumpings
  + field.run_outs
  + field.assisted_run_outs

event_activity_score = clamp((activity_events / field.matches) / 2 * 100)
innings_participation_score = clamp((field.innings / field.matches) / 1 * 100)
dismissal_activity_score = clamp((field.dismissals / field.matches) / 2 * 100)

field.activity =
  event_activity_score * 0.45
  + innings_participation_score * 0.30
  + dismissal_activity_score * 0.25
```

Weightings:

- Successful event activity: `45%`
- Fielding innings participation: `30%`
- Dismissal activity: `25%`

Interpretation:

- Higher values indicate active fielding participation plus more successful fielding events.
- Lower values indicate fewer recorded successful fielding events or lower participation.

Limitations:

- Does not include non-dismissal fielding actions such as saves, stops, throws, or pressure fielding.
- Does not include opportunity or difficulty.
- Does not infer involvement from commentary.
