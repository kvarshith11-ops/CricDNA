# Context Core Primitive Metrics

This document defines deterministic Context Core metrics for CricDNA.

These metrics:

- Consume only `PlayerKnowledgeModel.history.records` context and identity history
- Do not read raw API payloads
- Do not depend on other metrics
- Do not implement filtering, contextual averages, opponent ratings, venue ratings, composites, ratings, or AI outputs

## Output Encoding

The current `MetricResult.value` contract supports:

- `number`
- `string`
- `boolean`
- `null`

Dictionary-style context metrics therefore return deterministic JSON strings with sorted keys.

Example:

```json
{"ODI":42,"T20":87,"Test":18}
```

## Shared PKM Inputs

Context metrics use:

- `history.records[*].matchId`
- `history.records[*].identity.team.name`
- `history.records[*].identity.opponent.name`
- `history.records[*].context.format`
- `history.records[*].context.matchDate`
- `history.records[*].context.venue`
- `history.records[*].context.homeAwayNeutral`

## Shared Validation

All context metrics fail validation when:

- The PKM career is empty
- Match context is missing
- A match ID is missing
- Duplicate match IDs exist
- Match date is not a valid `YYYY-MM-DD` date
- Match format is missing
- Team or opponent name is missing

## context.matches

Metric ID: `context.matches`

Definition: Total number of unique matches in the PKM career.

Formula: `count(history.records)`

PKM Inputs: `history.records[*].matchId`

Validation: Match IDs must be present and unique.

Edge Cases: Empty careers return `FAILED_VALIDATION`.

## context.formats

Metric ID: `context.formats`

Definition: Distribution of matches by format.

Formula: `countBy(context.format)`

PKM Inputs: `history.records[*].context.format`

Validation: Format must be present.

Edge Cases: Output is a deterministic JSON string.

## context.teams

Metric ID: `context.teams`

Definition: Distribution of matches by player team.

Formula: `countBy(identity.team.name)`

PKM Inputs: `history.records[*].identity.team.name`

Validation: Team name must be present.

Edge Cases: Output is a deterministic JSON string.

## context.opponents

Metric ID: `context.opponents`

Definition: Distribution of matches by opponent.

Formula: `countBy(identity.opponent.name)`

PKM Inputs: `history.records[*].identity.opponent.name`

Validation: Opponent name must be present.

Edge Cases: Output is a deterministic JSON string.

## context.venues

Metric ID: `context.venues`

Definition: Distribution of matches by venue.

Formula: `countBy(venue ground, city, country)`

PKM Inputs: `history.records[*].context.venue`

Validation: Match context and date must be valid.

Edge Cases: Missing venue data is counted as `Unknown`. Output is a deterministic JSON string.

## context.seasons

Metric ID: `context.seasons`

Definition: Distribution of matches by season year.

Formula: `countBy(year extracted from context.matchDate)`

PKM Inputs: `history.records[*].context.matchDate`

Validation: Match date must be a valid `YYYY-MM-DD` date.

Edge Cases: Output is a deterministic JSON string.

## context.home_matches

Metric ID: `context.home_matches`

Definition: Count of matches marked as home matches.

Formula: `count(context.homeAwayNeutral == Home)`

PKM Inputs: `history.records[*].context.homeAwayNeutral`

Validation: Match context and date must be valid.

Edge Cases: Missing or `Unknown` home/away values are not counted as home.

## context.away_matches

Metric ID: `context.away_matches`

Definition: Count of matches marked as away matches.

Formula: `count(context.homeAwayNeutral == Away)`

PKM Inputs: `history.records[*].context.homeAwayNeutral`

Validation: Match context and date must be valid.

Edge Cases: Missing or `Unknown` home/away values are not counted as away.

## context.neutral_matches

Metric ID: `context.neutral_matches`

Definition: Count of matches marked as neutral matches.

Formula: `count(context.homeAwayNeutral == Neutral)`

PKM Inputs: `history.records[*].context.homeAwayNeutral`

Validation: Match context and date must be valid.

Edge Cases: Missing or `Unknown` home/away values are not counted as neutral.
