# Batting Advanced Composite Metrics

## Scope

This document covers the planned advanced batting composite metrics:

- `bat.pressure`
- `bat.finishing`
- `bat.adaptability`

Composite metrics must consume only registered `MetricResult`s produced by the Metric Engine. They must not read `PlayerKnowledgeModel`, `PlayerMatchRecord`, raw APIs, commentary, or generated text.

## Implementation Decision

No advanced batting composite metrics were implemented in this pass.

Each planned metric requires context-specific performance inputs that are not currently available as registered primitive or composite `MetricResult`s. Implementing them now would require hidden heuristics, inferred context, or recalculation from PKM/PMRs, which is explicitly disallowed.

## Omitted Metrics

### bat.pressure

Definition: Intended to measure deterministic batting performance in higher-value match contexts.

Status: Omitted.

Missing dependencies:

- pressure-state primitive metrics
- target or chase context metrics
- required-run-rate context metrics
- wickets/overs match-state context metrics
- batting performance split by pressure state

Reason: Existing metrics expose global batting performance and broad context distributions, but they do not expose performance inside pressure states. Context metrics such as `context.home_matches` or `context.opponents` are match distributions, not pressure-performance inputs.

Future implementation requirements:

- deterministic `context.pressure_states` or equivalent
- primitive batting metrics split by pressure state
- registered primitive or composite results for those split metrics

### bat.finishing

Definition: Intended to measure deterministic batting effectiveness in finishing situations.

Status: Omitted.

Missing dependencies:

- death-over batting metrics
- chase/target context metrics
- innings phase metrics
- finishing-situation marker
- batting performance split by finishing situation

Reason: The current primitive layer has no phase, death-over, target, chase, or finishing-situation metrics. Using global strike rate, average, or intent would not specifically measure finishing.

Future implementation requirements:

- deterministic phase or innings-situation primitives
- death-over or finishing-window batting primitives
- target/chase context primitives if finishing is defined by chase state

### bat.adaptability

Definition: Intended to measure whether batting performance is maintained across formats, opponents, and contexts.

Status: Omitted.

Missing dependencies:

- batting performance split by format
- batting performance split by opponent
- batting performance split by home/away/neutral context
- per-context consistency or intent metrics

Reason: Existing context metrics provide distributions such as `context.formats` and `context.opponents`, while batting composites provide global values such as `bat.intent` and `bat.consistency`. There is no registered metric that connects batting performance to each context bucket.

Future implementation requirements:

- format-specific batting primitive/composite results
- opponent-specific batting primitive/composite results
- home/away/neutral batting primitive/composite results
- deterministic aggregation rules for comparing those context-specific results

## Validation Principle

These metrics remain unregistered until their required dependencies exist. This prevents consumers from receiving scores that imply unsupported pressure, finishing, or adaptability analysis.

## Design Principle

The batting composite layer must not fill missing context with assumptions. A metric is preferable to omit rather than implement with hidden heuristics.
