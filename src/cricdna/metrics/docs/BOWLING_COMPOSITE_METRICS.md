# Bowling Composite Metrics

## Scope

These metrics are deterministic composite metrics.

They consume only existing primitive `MetricResult`s from the Metric Engine result cache. They do not read `PlayerKnowledgeModel`, PMRs, raw APIs, commentary, or generated text.

## Implemented Metrics

- `bowl.control`
- `bowl.wicket_threat`
- `bowl.effectiveness`

## Omitted Metrics

### bowl.consistency

Reason for omission: the current primitive layer exposes career-level bowling totals and rates, but it does not expose per-match or per-innings variance, rolling stability, or split distributions.

Missing primitive metrics:

- economy variance by innings or match
- wicket-taking variance by innings or match
- runs-conceded variance by innings or match
- spell-level consistency distributions

Future implementability: this becomes implementable after deterministic bowling split or variance primitives are added.

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

Economy upper benchmark: `10`

Reasoning: economy at or above 10 maps to the bottom of the economy-control component.

Extras per over benchmark: `1`

Reasoning: one wide/no-ball per over maps to the bottom of the extras-discipline component.

Maiden rate benchmark: `0.20`

Reasoning: one maiden every five overs maps to the top of the maiden-rate component.

Wickets per innings benchmark: `2`

Reasoning: two wickets per bowling innings maps to the top of the wicket-taking component.

Wickets per match benchmark: `3`

Reasoning: three wickets per match maps to the top of match-level wicket threat.

Bowling average upper benchmark: `50`

Reasoning: average at or above 50 maps to the bottom of the average component.

Bowling strike-rate upper benchmark: `60`

Reasoning: one wicket every 60 legal balls maps to the bottom of the strike-rate component.

## bowl.control

Definition: Measures observable control through economy, extras discipline, and maiden rate.

Dependencies:

- `bowl.economy`
- `bowl.wides`
- `bowl.no_balls`
- `bowl.overs`
- `bowl.maidens`

Formula:

```text
economy_score = clamp(100 - bowl.economy / 10 * 100)
extras_per_over = (bowl.wides + bowl.no_balls) / bowl.overs
extras_discipline_score = clamp(100 - extras_per_over / 1 * 100)
maiden_rate = bowl.maidens / bowl.overs
maiden_score = clamp(maiden_rate / 0.20 * 100)

bowl.control =
  economy_score * 0.50
  + extras_discipline_score * 0.30
  + maiden_score * 0.20
```

Weightings:

- Economy score: `50%`
- Extras discipline score: `30%`
- Maiden rate score: `20%`

Interpretation:

- Higher values indicate stronger run control, fewer extras, and more maidens.
- Lower values indicate expensive or less disciplined bowling.

Limitations:

- Does not use dot-ball percentage because dot-ball primitive coverage is not complete.
- Does not use phase context.
- Does not infer bowling quality beyond available primitives.

## bowl.wicket_threat

Definition: Measures observable wicket-taking threat through wicket frequency.

Dependencies:

- `bowl.wickets`
- `bowl.innings`
- `bowl.matches`

Formula:

```text
wickets_per_innings_score = clamp((bowl.wickets / bowl.innings) / 2 * 100)
wickets_per_match_score = clamp((bowl.wickets / bowl.matches) / 3 * 100)

bowl.wicket_threat =
  wickets_per_innings_score * 0.70
  + wickets_per_match_score * 0.30
```

Weightings:

- Wickets per innings: `70%`
- Wickets per match: `30%`

Interpretation:

- Higher values indicate more frequent wicket-taking.
- Zero wickets produces zero wicket threat, not an inferred value.

Limitations:

- Does not include near-wicket events or chance creation.
- Does not include batter quality or phase context.
- Does not use bowling strike rate directly so zero-wicket careers can still produce a deterministic zero score rather than missing data.

## bowl.effectiveness

Definition: Measures overall observable bowling effectiveness from run prevention, wicket cost, wicket frequency, and strike rate.

Dependencies:

- `bowl.economy`
- `bowl.average`
- `bowl.strike_rate`
- `bowl.wickets`
- `bowl.innings`

Formula:

```text
economy_score = clamp(100 - bowl.economy / 10 * 100)
average_score = clamp(100 - bowl.average / 50 * 100)
strike_rate_score = clamp(100 - bowl.strike_rate / 60 * 100)
wickets_per_innings_score = clamp((bowl.wickets / bowl.innings) / 2 * 100)

bowl.effectiveness =
  economy_score * 0.30
  + average_score * 0.30
  + strike_rate_score * 0.25
  + wickets_per_innings_score * 0.15
```

Weightings:

- Economy score: `30%`
- Average score: `30%`
- Strike-rate score: `25%`
- Wickets per innings score: `15%`

Interpretation:

- Higher values indicate stronger combined run prevention and wicket-taking outcomes.
- Lower values indicate expensive, low-wicket, or high-cost bowling.

Limitations:

- Requires successful `bowl.average` and `bowl.strike_rate`; zero-wicket careers return validation failure because those primitives return missing data.
- Does not use phase, pressure, opposition, or venue context.
- Does not infer control from unavailable dot-ball or boundary-conceded primitives.
