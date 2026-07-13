# Batting Intent Composite Metrics

## Scope

These metrics are deterministic composite metrics.

They consume only existing primitive `MetricResult`s from the Metric Engine result cache. They do not read `PlayerKnowledgeModel`, PMRs, raw APIs, commentary, or generated text.

## Implemented Metrics

- `bat.intent`
- `bat.boundary_intent`

## Omitted Metrics

### bat.rotation_intent

Reason for omission: the primitive layer does not currently expose rotation-specific metrics.

Missing primitive metrics:

- singles
- twos
- threes
- non-boundary runs
- rotation percentage

Future implementability: this becomes implementable after deterministic rotation primitives are added.

## Shared Validation

All implemented metrics validate:

- required primitive results exist in `context.results`
- dependencies are primitive metrics
- dependency status is `SUCCESS`
- dependency values are finite numbers
- final score is finite and between 0 and 100

## Normalization

Scores are normalized to a 0-100 range.

Strike rate normalization:

```text
min(100, max(0, bat.strike_rate / 200 * 100))
```

Runs-per-ball normalization:

```text
min(100, max(0, bat.runs_per_ball / 2 * 100))
```

Boundary percentage is already a percentage and is clamped:

```text
min(100, max(0, bat.boundary_percentage))
```

Benchmarks:

- Strike rate benchmark: `200`
- Runs per ball benchmark: `2`

These benchmarks map very fast scoring to the top of the 0-100 intent scale while keeping the formula deterministic and bounded.

## bat.intent

Metric ID: `bat.intent`

Definition: Composite score representing observable batting scoring intent from primitive scoring metrics.

Dependencies:

- `bat.strike_rate`
- `bat.boundary_percentage`
- `bat.runs_per_ball`

Formula:

```text
bat.intent =
  normalized_strike_rate * 0.40
  + boundary_percentage_score * 0.35
  + normalized_runs_per_ball * 0.25
```

Weightings:

- Strike rate: `40%`
- Boundary percentage: `35%`
- Runs per ball: `25%`

Output:

- numeric score
- unit: `score`
- range: `0..100`

Interpretation:

- Higher values indicate more observable scoring intent.
- Lower values indicate less observable scoring intent.

Limitations:

- This is not psychology, temperament, aggression, or personality.
- It does not know match situation, target, pressure, or phase.
- It does not use rotation because rotation primitives are not available.

## bat.boundary_intent

Metric ID: `bat.boundary_intent`

Definition: Composite score representing boundary-driven scoring intent.

Dependencies:

- `bat.boundary_percentage`

Formula:

```text
bat.boundary_intent = min(100, max(0, bat.boundary_percentage))
```

Weightings:

- Boundary percentage: `100%`

Output:

- numeric score
- unit: `score`
- range: `0..100`

Interpretation:

- Higher values indicate a larger share of runs came from boundaries.
- Lower values indicate a smaller share of runs came from boundaries.

Limitations:

- It does not distinguish fours from sixes beyond what the primitive boundary percentage already encodes.
- It does not evaluate shot quality, risk, pressure, or match phase.
