# Trait Engine

## Architecture

The Trait Engine is a deterministic interpretation layer that runs after primitive and composite metrics.

```text
Primitive Metrics
  -> Composite Metrics
    -> Traits
```

Traits consume only composite `MetricResult`s already produced by the Metric Engine. They do not read `PlayerKnowledgeModel`, `PlayerMatchRecord`, raw APIs, commentary, or generated text.

## Implemented Traits

- `trait.batting_style`
- `trait.bowling_style`
- `trait.fielding_style`

## Dependency Model

Trait dependencies must be successful composite metrics.

Validation rejects:

- missing dependencies
- primitive metric dependencies
- failed composite metrics
- unsupported result shapes

## Output Model

Each trait returns a `TraitResult` containing:

- trait id
- trait name
- category
- classification
- deterministic confidence
- supporting metrics
- explanation
- version

Confidence is derived from dependency coverage. It is not AI confidence.

## Classification Rules

### trait.batting_style

Dependencies:

- `bat.intent`
- `bat.consistency`

Thresholds:

- High threshold: `70`

Rules:

- `Aggressive Stroke Player`: `bat.intent >= 70` and `bat.intent >= bat.consistency`
- `Reliable Accumulator`: `bat.consistency >= 70` and `bat.consistency > bat.intent`
- `Balanced Batter`: neither signal dominates above the high threshold

### trait.bowling_style

Dependencies:

- `bowl.control`
- `bowl.wicket_threat`
- `bowl.effectiveness`

Thresholds:

- High threshold: `70`

Rules:

- `Strike Bowler`: `bowl.wicket_threat >= 70` and `bowl.wicket_threat >= bowl.control`
- `Control Bowler`: `bowl.control >= 70` and `bowl.control > bowl.wicket_threat`
- `Balanced Bowler`: no single bowling signal dominates above the high threshold

### trait.fielding_style

Dependencies:

- `field.impact`
- `field.reliability`
- `field.activity`

Thresholds:

- High threshold: `70`

Rules:

- `Safe Hands`: `field.reliability >= 70` and reliability is greater than or equal to activity and impact
- `Active Fielder`: `field.activity >= 70` and activity is greater than or equal to impact
- `Reliable Defender`: no dominant high-reliability or high-activity classification is produced

## Interpretation

Trait labels are deterministic summaries of composite metric patterns. They are not personality judgments, scouting opinions, or narrative analysis.

Explanations include the composite metric values that produced the classification so the result is reproducible.

## Limitations

- No AI, LLM, NLP, or subjective reasoning is used.
- Traits inherit the limitations of their composite metric dependencies.
- Traits do not calculate cricket statistics.
- Traits do not access PKM history or raw match data.
- Thresholds are explicit versioned rules and should be changed only through a documented trait model update.
