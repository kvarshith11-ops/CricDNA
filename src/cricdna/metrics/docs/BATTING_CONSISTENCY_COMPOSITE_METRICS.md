# Batting Consistency Composite Metrics

## Scope

These metrics are deterministic composite metrics.

They consume only existing primitive `MetricResult`s from the Metric Engine result cache. They do not read `PlayerKnowledgeModel`, PMRs, raw APIs, commentary, or generated text.

## Implemented Metrics

- `bat.consistency`
- `bat.scoring_consistency`

## Dependencies

`bat.consistency` depends on:

- `bat.innings`
- `bat.average`
- `bat.fifties`
- `bat.hundreds`
- `bat.ducks`

`bat.scoring_consistency` depends on:

- `bat.innings`
- `bat.fifties`
- `bat.hundreds`
- `bat.ducks`

## Shared Validation

All implemented metrics validate:

- required primitive results exist in `context.results`
- dependencies are primitive metrics
- dependency status is `SUCCESS`
- dependency values are finite numbers
- dependency values are non-negative
- batting innings is greater than zero
- final score is finite and between 0 and 100

## Normalization Constants

Average benchmark: `50`

Reasoning: an average of 50 maps to the top of the average consistency component.

Fifty-plus rate benchmark: `0.50`

Reasoning: reaching 50 or more in half of innings maps to the top of the repeat-score component.

Hundred rate benchmark: `0.20`

Reasoning: reaching 100 in one out of five innings maps to the top of the hundred-rate component.

Duck rate benchmark: `0.20`

Reasoning: ducks in one out of five innings maps to the bottom of the duck-avoidance component.

## bat.consistency

Metric ID: `bat.consistency`

Definition: Composite score representing observable batting consistency from repeat scoring, average, hundreds, and duck avoidance.

Formula:

```text
average_score = clamp(bat.average / 50 * 100)
fifty_plus_rate = (bat.fifties + bat.hundreds) / bat.innings
fifty_plus_score = clamp(fifty_plus_rate / 0.50 * 100)
hundred_rate = bat.hundreds / bat.innings
hundred_score = clamp(hundred_rate / 0.20 * 100)
duck_rate = bat.ducks / bat.innings
duck_avoidance_score = 100 - clamp(duck_rate / 0.20 * 100)

bat.consistency =
  average_score * 0.35
  + fifty_plus_score * 0.30
  + hundred_score * 0.20
  + duck_avoidance_score * 0.15
```

Weightings:

- Average score: `35%`
- Fifty-plus rate score: `30%`
- Hundred rate score: `20%`
- Duck avoidance score: `15%`

Output:

- numeric score
- unit: `score`
- range: `0..100`

Interpretation:

- Higher values indicate more repeat scoring and fewer low-score dismissals.
- Lower values indicate less repeat scoring and/or more ducks.

Limitations:

- It does not measure match pressure.
- It does not measure opposition quality.
- It does not measure innings difficulty.
- It does not use score-by-score variance because the primitive layer does not expose per-innings score distributions as metric results.

## bat.scoring_consistency

Metric ID: `bat.scoring_consistency`

Definition: Composite score focused on repeat 50-plus scoring and duck avoidance.

Formula:

```text
fifty_plus_rate = (bat.fifties + bat.hundreds) / bat.innings
fifty_plus_score = clamp(fifty_plus_rate / 0.50 * 100)
duck_rate = bat.ducks / bat.innings
duck_avoidance_score = 100 - clamp(duck_rate / 0.20 * 100)

bat.scoring_consistency =
  fifty_plus_score * 0.75
  + duck_avoidance_score * 0.25
```

Weightings:

- Fifty-plus rate score: `75%`
- Duck avoidance score: `25%`

Output:

- numeric score
- unit: `score`
- range: `0..100`

Interpretation:

- Higher values indicate frequent 50-plus innings and few ducks.
- Lower values indicate fewer repeat scores and/or more ducks.

Limitations:

- It does not include batting average.
- It does not include strike rate or scoring speed.
- It does not distinguish 50s from 100s beyond the shared 50-plus count.

## Omitted Metrics

No additional consistency metrics were implemented because the current primitive layer does not expose per-innings score variance, median score, consecutive score streaks, or innings-by-innings score distributions.

Future implementability: additional consistency metrics become implementable after those deterministic primitive results are registered.
