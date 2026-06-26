# Player Profile Builder

## Architecture

The Player Profile Builder is the deterministic evidence packaging layer at the end of the analytics pipeline.

```text
Raw PlayCricket APIs
  -> Extractors
    -> PlayerMatchRecord
      -> PlayerKnowledgeModel
        -> Primitive Metrics
          -> Composite Metrics
            -> Trait Engine
              -> PlayerProfile
```

The profile is the single structured object intended for a future AI Cricket Scout. The builder does not call AI, generate narratives, calculate ratings, or infer strengths and weaknesses.

## Responsibilities

The builder gathers:

- player identity from `PlayerKnowledgeModel`
- headline statistics from primitive metric results
- the latest five lightweight match summaries from PMR history inside PKM
- every primitive metric result keyed by metric id
- every composite metric result keyed by metric id
- every generated trait result keyed by trait id
- deterministic metadata about the generated package

Headline statistics are copied from primitive metrics only. They are not recalculated.

## JSON Shape

```json
{
  "identity": {
    "playerId": "player-id",
    "playerName": "Player Name",
    "country": null,
    "role": "batter",
    "primaryTeam": {
      "id": "team-id",
      "name": "Team Name"
    }
  },
  "headlineStats": {
    "matches": 10,
    "runs": 420,
    "wickets": 12,
    "catches": 7,
    "battingAverage": 42,
    "strikeRate": 118.5,
    "economy": 6.2,
    "bestScore": 91,
    "bestBowling": null
  },
  "recentMatches": [],
  "primitiveMetrics": {},
  "compositeMetrics": {},
  "traits": {},
  "metadata": {
    "engineVersion": "cricdna-deterministic-profile-v1",
    "generatedAt": "2026-06-27T00:00:00.000Z",
    "sampleSize": 10,
    "supportedMetricCount": 42,
    "supportedCompositeCount": 10,
    "supportedTraitCount": 3
  }
}
```

## Validation

Validation checks:

- missing player id
- missing metrics
- missing traits
- duplicate metric ids after normalization
- duplicate trait ids after normalization
- primitive metrics are in the primitive section
- composite metrics are in the composite section
- unsupported player role

The profile uses records keyed by metric or trait id, so duplicate JSON keys cannot exist in the final object. The builder normalizes metric and trait collections into keyed records.

## Role Support

Supported roles:

- `batter`
- `bowler`
- `all_rounder`
- `wicket_keeper`

The schema is identical for every role. Missing or not-applicable values remain `null`, empty arrays, or empty records.

## Limitations

- No AI or LLM calls.
- No narratives, recommendations, scouting reports, ratings, strengths, or weaknesses.
- No statistic recalculation from PKM when a primitive metric already owns the value.
- `bestBowling` remains `null` until a deterministic primitive metric exists for it.
