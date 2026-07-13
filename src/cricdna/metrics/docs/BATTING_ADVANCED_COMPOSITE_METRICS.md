# Batting Advanced Composite Metrics

## Scope

These metrics are deterministic composite metrics.

They consume only registered `MetricResult`s produced by the Metric Engine. They do not read `PlayerKnowledgeModel`, `PlayerMatchRecord`, raw APIs, commentary, UI state, or generated text.

## Implemented Metrics

- `bat.effectiveness`
- `bat.conversion`
- `bat.dismissal_resilience`

## Shared Validation

All implemented metrics validate:

- required dependency results exist in `context.results`
- dependencies have the expected primitive or composite level
- dependency status is `SUCCESS`
- dependency values are finite numbers
- dependency values are non-negative
- denominator inputs are greater than zero where required
- final score is finite and between `0` and `100`

## bat.effectiveness

Definition: Measures overall batting value from existing normalized batting composite signals.

Dependencies:

- `bat.intent`
- `bat.consistency`
- `bat.scoring_consistency`
- `bat.boundary_intent`

Formula:

```text
bat.effectiveness =
  bat.consistency * 0.35
  + bat.intent * 0.30
  + bat.scoring_consistency * 0.20
  + bat.boundary_intent * 0.15
```

Weightings:

- Batting consistency: `35%`
- Batting intent: `30%`
- Scoring consistency: `20%`
- Boundary intent: `15%`

Interpretation:

- Higher values indicate stronger combined scoring intent, consistency, and conversion into meaningful scores.
- Lower values indicate weaker combined batting output across the currently supported batting composite surface.

Limitations:

- Does not include pressure, finishing, phase, venue, opponent, or chase context.
- Does not recalculate primitive batting statistics.

## bat.conversion

Definition: Measures how often batting innings become meaningful scores.

Dependencies:

- `bat.innings`
- `bat.fifties`
- `bat.hundreds`
- `bat.double_hundreds`

Normalization constants:

- Fifty-plus rate benchmark: `0.50`
- Hundred-plus rate benchmark: `0.20`
- Double-hundred rate benchmark: `0.05`

Formula:

```text
fifty_plus_rate = (bat.fifties + bat.hundreds + bat.double_hundreds) / bat.innings
hundred_plus_rate = (bat.hundreds + bat.double_hundreds) / bat.innings
double_hundred_rate = bat.double_hundreds / bat.innings

bat.conversion =
  normalize(fifty_plus_rate, 0.50) * 0.60
  + normalize(hundred_plus_rate, 0.20) * 0.35
  + normalize(double_hundred_rate, 0.05) * 0.05
```

Weightings:

- Fifty-plus rate: `60%`
- Hundred-plus rate: `35%`
- Double-hundred bonus: `5%`

Interpretation:

- Higher values indicate more frequent conversion of innings into substantial scores.
- Lower values indicate fewer milestone scores relative to innings.

Limitations:

- Does not distinguish match situation or innings role.
- Depends on career-level milestone counts only.

## bat.dismissal_resilience

Definition: Measures avoidance of low and dismissal-heavy batting outcomes using available dismissal primitives.

Dependencies:

- `bat.innings`
- `bat.outs`
- `bat.not_outs`
- `bat.ducks`
- `bat.average`

Normalization constants:

- Batting average benchmark: `50`
- Duck rate benchmark: `0.20`
- Not-out rate benchmark: `0.30`

Formula:

```text
average_score = normalize(bat.average, 50)
duck_rate = bat.ducks / bat.innings
duck_avoidance_score = 100 - normalize(duck_rate, 0.20)
not_out_rate = bat.not_outs / bat.innings
not_out_resilience_score = normalize(not_out_rate, 0.30)

bat.dismissal_resilience =
  average_score * 0.40
  + duck_avoidance_score * 0.35
  + not_out_resilience_score * 0.25
```

Weightings:

- Batting average: `40%`
- Duck avoidance: `35%`
- Not-out resilience: `25%`

Interpretation:

- Higher values indicate stronger output while avoiding ducks and preserving innings.
- Lower values indicate weaker average, frequent ducks, or low not-out resilience.

Limitations:

- Not-out rate is a deterministic resilience proxy, not a finishing or pressure measure.
- Does not infer dismissal quality, batter intent, or match context.

## Omitted Metrics

### bat.pressure

Status: Omitted.

Missing dependencies:

- pressure-state primitive metrics
- target or chase context metrics
- required-run-rate context metrics
- wickets/overs match-state context metrics
- batting performance split by pressure state

Reason: Existing metrics expose global batting performance and broad context distributions, but they do not expose performance inside pressure states.

### bat.finishing

Status: Omitted.

Missing dependencies:

- death-over batting metrics
- chase/target context metrics
- innings phase metrics
- finishing-situation marker
- batting performance split by finishing situation

Reason: The current primitive layer has no phase, death-over, target, chase, or finishing-situation metrics.

### bat.adaptability

Status: Omitted.

Missing dependencies:

- batting performance split by format
- batting performance split by opponent
- batting performance split by home/away/neutral context
- per-context consistency or intent metrics

Reason: Existing context metrics provide match distributions, but no registered metrics connect batting performance to each context bucket.

## Design Principle

The batting composite layer must not fill missing context with assumptions. Unsupported concepts remain unregistered until their deterministic dependencies exist.
