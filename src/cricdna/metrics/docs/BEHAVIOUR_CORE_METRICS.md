# Behaviour Core Primitive Metrics

This document defines deterministic Behaviour Core metrics for CricDNA.

These metrics:

- Consume only `PlayerKnowledgeModel.history.records[*].behaviour`
- Do not read raw API payloads
- Do not depend on other metrics
- Do not infer behaviour
- Do not classify events
- Do not use NLP or keywords
- Do not calculate sentiment, temperament, aggression, leadership ratings, composites, ratings, or AI outputs

## Supported PKM Behaviour Surface

The current PKM behaviour model contains:

- `captain`
- `wicketKeeper`
- `substitute`
- `playerOfMatch`
- `events[*].eventType`
- `events[*].description`
- `events[*].ballRef`
- `events[*].sourceCommentaryId`

Only these fields are used.

## Output Encoding

The current `MetricResult.value` contract supports:

- `number`
- `string`
- `boolean`
- `null`

Dictionary-style behaviour metrics therefore return deterministic JSON strings with sorted keys.

## Shared Validation

All behaviour metrics fail validation when:

- The PKM career is empty
- Behaviour history is missing
- A behaviour event has an empty `eventType`
- Duplicate behaviour events are present

Duplicate detection is deterministic and uses:

- match ID
- source commentary ID
- event type
- description
- ball reference

## behaviour.captain_matches

Metric ID: `behaviour.captain_matches`

Definition: Number of matches where the player was marked as captain.

Formula: `count(records where behaviour.captain == true)`

PKM Inputs: `behaviour.captain`

Validation: Behaviour history must be present.

Edge Cases: Returns zero when the player was never marked as captain.

## behaviour.wicket_keeper_matches

Metric ID: `behaviour.wicket_keeper_matches`

Definition: Number of matches where the player was marked as wicketkeeper.

Formula: `count(records where behaviour.wicketKeeper == true)`

PKM Inputs: `behaviour.wicketKeeper`

Validation: Behaviour history must be present.

Edge Cases: Returns zero when the player was never marked as wicketkeeper.

## behaviour.substitute_matches

Metric ID: `behaviour.substitute_matches`

Definition: Number of matches where the player was marked as substitute.

Formula: `count(records where behaviour.substitute == true)`

PKM Inputs: `behaviour.substitute`

Validation: Behaviour history must be present.

Edge Cases: Returns zero when the player was never marked as substitute.

## behaviour.player_of_match_awards

Metric ID: `behaviour.player_of_match_awards`

Definition: Number of matches where the player was marked as player of the match.

Formula: `count(records where behaviour.playerOfMatch == true)`

PKM Inputs: `behaviour.playerOfMatch`

Validation: Behaviour history must be present.

Edge Cases: Returns zero when the player was never marked as player of the match.

## behaviour.events

Metric ID: `behaviour.events`

Definition: Total number of raw behaviour events preserved in PKM.

Formula: `count(behaviour.events)`

PKM Inputs: `behaviour.events[*]`

Validation: Events must not be duplicated. Event type must be present.

Edge Cases: Returns zero for a non-empty career with no behaviour events.

## behaviour.event_types

Metric ID: `behaviour.event_types`

Definition: Distribution of raw behaviour events by existing `eventType`.

Formula: `countBy(behaviour.events[*].eventType)`

PKM Inputs: `behaviour.events[*].eventType`

Validation: Event type must be present.

Edge Cases: Returns `{}` as a JSON string for a non-empty career with no behaviour events.

## Omitted Planned Examples

The following examples were not implemented because the current PKM does not contain dedicated deterministic fields for them:

- `behaviour.appeals`
- `behaviour.reviews`
- `behaviour.captaincy_events`
- `behaviour.celebrations`
- `behaviour.on_field_interactions`

These could appear as raw `eventType` values inside `behaviour.event_types`, but this metric family does not infer or classify raw commentary into those categories.
