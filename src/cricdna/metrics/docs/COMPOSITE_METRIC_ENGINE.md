# Composite Metric Engine

## Purpose

The Composite Metric Engine enables deterministic composite metrics to consume existing primitive metric results.

Composite metrics do not read `PlayerKnowledgeModel` directly and do not calculate primitive statistics themselves.

## Architecture

```text
PlayerKnowledgeModel
  -> Primitive Metrics
  -> Composite Metrics
  -> EngineeringMetrics
```

The same `MetricRunner`, `MetricRegistry`, dependency planner, and cache are used for primitive and composite execution.

## Dependency Model

Composite metrics declare dependencies by metric ID.

Rules:

- Primitive metrics have no dependencies.
- Composite metrics may depend only on registered primitive metrics.
- Composite metrics must not depend on other composite metrics.
- Composite metrics must not depend on trait metrics.
- Missing dependencies fail registry validation.
- Circular dependency graphs fail execution-plan resolution.

Example:

```text
bat.intent
  depends on bat.strike_rate
  depends on bat.boundary_percentage
  depends on bat.runs_per_ball
```

`bat.intent` must consume those primitive `MetricResult`s from the engine result cache. It must not recompute strike rate, boundary percentage, or runs per ball from PKM.

## Execution Order

`resolveExecutionPlan()` performs dependency-first ordering.

When a composite metric is requested, all primitive dependencies are inserted into the plan before the composite metric.

Example:

```text
Requested:
  bat.intent

Execution plan:
  bat.strike_rate
  bat.boundary_percentage
  bat.runs_per_ball
  bat.intent
```

## Registration Model

Composite metrics are registered as normal `MetricDefinition` objects with:

- `level = MetricLevel.Composite`
- `dependencies = [primitive metric ids]`
- a calculator implementing `MetricCalculator`

Default registry loading registers:

1. Primitive metric definitions
2. Composite metric definitions

Current placeholder composites:

- `bat.intent`
- `bat.consistency`
- `bowl.control`
- `field.impact`

These placeholders validate architecture only. They do not implement cricket formulas.

## Caching

`MetricRunner` uses `MetricCache` for one execution.

If multiple composites depend on the same primitive metric, that primitive metric executes once and subsequent composites consume the cached `MetricResult`.

Composite results are also cached by metric ID during the run.

## Validation

Validation covers:

- duplicate metric registrations
- primitive metrics with dependencies
- missing dependencies
- composite dependencies on non-primitive metrics
- circular dependency graphs
- calculators returning a result for the wrong metric ID

## Design Principles

- Composite metrics are deterministic.
- Composite metrics consume `MetricResult`s, not raw PKM fields.
- Composite metrics do not implement primitive formulas.
- Composite metrics do not perform ratings.
- Composite metrics do not perform AI or narrative generation.
- Composite metrics remain independently testable through declared dependencies.

## Placeholder Calculator

`PlaceholderCompositeMetricCalculator` exists only to verify the composite architecture.

It checks that declared primitive dependencies are present in `context.results`, then returns a deterministic stub value.

It is not a cricket formula implementation.
