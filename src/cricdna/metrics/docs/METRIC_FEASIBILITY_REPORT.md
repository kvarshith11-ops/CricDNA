# Metric Feasibility Report

## Scope

This audit evaluates planned primitive metrics against the current `PlayerKnowledgeModel` only.

The audit does not assume raw API access, additional extraction, derived cricket knowledge, AI inference, ratings, or future fields.

Current PKM surface:

- `identity.playerId`
- `identity.playerName`
- `identity.primaryTeam`
- `history.records[*].identity`
- `history.records[*].context`
- `history.records[*].batting.innings[*]`
- `history.records[*].bowling.spells[*]`
- `history.records[*].bowling.wickets[*]`
- `history.records[*].fielding.innings[*]`
- `history.records[*].behaviour`
- `history.records[*].progression.battingTimeline[*]`
- `history.records[*].progression.bowlingTimeline[*]`
- `history.index[*]`

## Feasibility Statuses

- `FULLY_SUPPORTED`: all required fields exist in current PKM.
- `PARTIALLY_SUPPORTED`: some required fields exist, but the metric would be incomplete or conditional.
- `NOT_SUPPORTED`: required fields do not exist in current PKM.

## Implementation Classification

- Ready to implement
- Blocked by missing aggregate fields
- Blocked by missing event-level data
- Blocked by missing contextual data

## Summary

| Classification | Count | Notes |
| --- | ---: | --- |
| Ready to implement | 43 | Current PKM has enough deterministic fields. |
| Blocked by missing aggregate fields | 5 | Requires totals such as chances, attempts, or team aggregates not currently modeled. |
| Blocked by missing event-level data | 12 | Requires ball-by-ball batting events, shot outcomes, or phase-specific events not currently modeled. |
| Blocked by missing contextual data | 7 | Requires venue class, innings situation, chase target, match phase labels, or pressure context not currently modeled. |

## Ready To Implement

| Metric ID | Required PKM fields | Current PKM support | Missing fields | Recommended action |
| --- | --- | --- | --- | --- |
| `bat.matches` | `history.records[*]` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.innings` | `history.records[*].batting.innings[*].didBat` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.runs` | `history.records[*].batting.innings[*].runs` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.balls_faced` | `history.records[*].batting.innings[*].ballsFaced` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.not_outs` | `history.records[*].batting.innings[*].didBat`, `dismissal.kind` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.highest_score` | `history.records[*].batting.innings[*].runs`, `didBat` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.fifties` | `history.records[*].batting.innings[*].runs`, `didBat` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.hundreds` | `history.records[*].batting.innings[*].runs`, `didBat` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.double_hundreds` | `history.records[*].batting.innings[*].runs`, `didBat` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.strike_rate` | `history.records[*].batting.innings[*].runs`, `ballsFaced` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.boundary_runs` | `history.records[*].batting.innings[*].fours`, `sixes` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.boundary_percentage` | `history.records[*].batting.innings[*].runs`, `fours`, `sixes` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.boundary_frequency` | `history.records[*].batting.innings[*].ballsFaced`, `fours`, `sixes` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.runs_per_ball` | `history.records[*].batting.innings[*].runs`, `ballsFaced` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.runs_per_boundary` | `history.records[*].batting.innings[*].runs`, `fours`, `sixes` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.fours` | `history.records[*].batting.innings[*].fours` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.sixes` | `history.records[*].batting.innings[*].sixes` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.fours_percentage` | `history.records[*].batting.innings[*].runs`, `fours` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.sixes_percentage` | `history.records[*].batting.innings[*].runs`, `sixes` | `FULLY_SUPPORTED` | None | Already implemented. |
| `bat.outs` | `history.records[*].batting.innings[*].dismissal.kind` | `FULLY_SUPPORTED` | None | Implement as primitive dismissal metric. |
| `bat.average` | `history.records[*].batting.innings[*].runs`, `dismissal.kind` | `FULLY_SUPPORTED` | None | Implement only if batting average enters primitive scope. |
| `bat.ducks` | `history.records[*].batting.innings[*].runs`, `didBat` | `FULLY_SUPPORTED` | None | Implement as primitive dismissal/score milestone metric. |
| `bat.batting_position_average` | `history.records[*].batting.innings[*].battingPosition` | `PARTIALLY_SUPPORTED` | `battingPosition` is optional. | Implement only with missing-data handling. |
| `bat.minutes` | `history.records[*].batting.innings[*].minutes` | `PARTIALLY_SUPPORTED` | `minutes` is optional. | Implement only with sample-size metadata. |
| `bowl.matches` | `history.records[*].bowling.spells[*].didBowl` | `FULLY_SUPPORTED` | None | Ready. |
| `bowl.innings` | `history.records[*].bowling.spells[*].didBowl` | `FULLY_SUPPORTED` | None | Ready. |
| `bowl.overs` | `history.records[*].bowling.spells[*].overs` | `FULLY_SUPPORTED` | None | Ready. |
| `bowl.balls` | `history.records[*].bowling.spells[*].balls` | `FULLY_SUPPORTED` | None | Ready. |
| `bowl.maidens` | `history.records[*].bowling.spells[*].maidens` | `FULLY_SUPPORTED` | None | Ready. |
| `bowl.runs_conceded` | `history.records[*].bowling.spells[*].runsConceded` | `FULLY_SUPPORTED` | None | Ready. |
| `bowl.wickets` | `history.records[*].bowling.spells[*].wickets`, `bowling.wickets[*]` | `FULLY_SUPPORTED` | None | Replace existing placeholder with real calculator. |
| `bowl.no_balls` | `history.records[*].bowling.spells[*].noBalls` | `FULLY_SUPPORTED` | None | Ready. |
| `bowl.wides` | `history.records[*].bowling.spells[*].wides` | `FULLY_SUPPORTED` | None | Ready. |
| `bowl.economy` | `history.records[*].bowling.spells[*].runsConceded`, `balls` | `FULLY_SUPPORTED` | None | Ready. |
| `bowl.average` | `history.records[*].bowling.spells[*].runsConceded`, `wickets` | `FULLY_SUPPORTED` | None | Ready with zero-wicket handling. |
| `bowl.strike_rate` | `history.records[*].bowling.spells[*].balls`, `wickets` | `FULLY_SUPPORTED` | None | Ready with zero-wicket handling. |
| `bowl.dot_balls` | `history.records[*].bowling.spells[*].dotBalls` | `PARTIALLY_SUPPORTED` | `dotBalls` is optional. | Implement only with coverage metadata or keep blocked until extraction coverage is proven. |
| `bowl.dot_percentage` | `history.records[*].bowling.spells[*].dotBalls`, `balls` | `PARTIALLY_SUPPORTED` | `dotBalls` is optional. | Implement only with sample-size and missing-data handling. |
| `field.catches` | `history.records[*].fielding.innings[*].catches` | `FULLY_SUPPORTED` | None | Replace existing placeholder with real calculator. |
| `field.stumpings` | `history.records[*].fielding.innings[*].stumpings` | `FULLY_SUPPORTED` | None | Ready. |
| `field.run_outs_direct` | `history.records[*].fielding.innings[*].runOutsDirect` | `FULLY_SUPPORTED` | None | Ready. |
| `field.run_outs_assisted` | `history.records[*].fielding.innings[*].runOutsAssisted` | `FULLY_SUPPORTED` | None | Ready. |
| `field.byes_conceded` | `history.records[*].fielding.innings[*].byesConceded` | `PARTIALLY_SUPPORTED` | `byesConceded` is optional and only applies to wicketkeepers. | Implement only with role/applicability metadata. |
| `context.matches` | `history.records[*]` | `FULLY_SUPPORTED` | None | Replace existing placeholder with real calculator. |
| `context.formats_played` | `history.index[*].format` or `history.records[*].context.format` | `FULLY_SUPPORTED` | None | Ready. |
| `context.teams_played_for` | `history.index[*].team` or `history.records[*].identity.team` | `FULLY_SUPPORTED` | None | Ready. |
| `context.opponents_played` | `history.index[*].opponent` or `history.records[*].identity.opponent` | `FULLY_SUPPORTED` | None | Ready. |

## Blocked By Missing Aggregate Fields

| Metric ID | Required PKM fields | Current PKM support | Missing fields | Recommended action |
| --- | --- | --- | --- | --- |
| `field.catch_success_percentage` | Catches taken, catch chances | `NOT_SUPPORTED` | Catch chances, dropped catches, catch opportunity denominator. | Add explicit fielding chance aggregates before implementation. |
| `field.dismissal_involvement_percentage` | Team wickets, player fielding dismissals | `PARTIALLY_SUPPORTED` | Team wicket totals for each innings are not modeled as fielding aggregates. | Add team dismissal totals or a match innings aggregate model. |
| `bat.team_run_share` | Player runs, team innings runs while player batted | `PARTIALLY_SUPPORTED` | Team innings total as aggregate is not consistently modeled for batting innings. | Add team innings aggregate totals to PKM or PMR context before implementation. |
| `bowl.wicket_share` | Player wickets, team bowling wickets in innings | `PARTIALLY_SUPPORTED` | Team bowling wicket totals per innings are not modeled as aggregates. | Add team bowling innings aggregate totals. |
| `bowl.extra_percentage` | Wides, no-balls, total team extras or total runs conceded policy | `PARTIALLY_SUPPORTED` | Metric denominator must be explicitly modeled and standardized. | Define denominator and add aggregate field if team extras are required. |

## Blocked By Missing Event-Level Data

| Metric ID | Required PKM fields | Current PKM support | Missing fields | Recommended action |
| --- | --- | --- | --- | --- |
| `bat.dot_balls` | Ball-by-ball batting outcomes | `NOT_SUPPORTED` | Per-ball batter outcome or dot-ball count. | Add batting event rows or aggregate `dotBalls` to batting innings. |
| `bat.dot_percentage` | Dot balls, balls faced | `NOT_SUPPORTED` | Per-ball batter outcome or dot-ball count. | Add batting dot-ball support before implementation. |
| `bat.ones` | Ball-by-ball batting runs | `NOT_SUPPORTED` | Count of singles. | Add scoring-shot aggregates or per-ball batting events. |
| `bat.twos` | Ball-by-ball batting runs | `NOT_SUPPORTED` | Count of twos. | Add scoring-shot aggregates or per-ball batting events. |
| `bat.threes` | Ball-by-ball batting runs | `NOT_SUPPORTED` | Count of threes. | Add scoring-shot aggregates or per-ball batting events. |
| `bat.rotation_percentage` | Singles, twos, threes, balls faced | `NOT_SUPPORTED` | Non-boundary scoring-shot counts. | Add batting event-level or shot-type aggregate fields. |
| `bat.false_shot_percentage` | Ball-by-ball shot quality labels | `NOT_SUPPORTED` | False-shot events and denominator. | Do not implement until source extraction preserves shot-quality events. |
| `bat.control_percentage` | Ball-by-ball control labels | `NOT_SUPPORTED` | Controlled/uncontrolled shot events. | Do not implement until source extraction preserves shot-control events. |
| `bat.phase_strike_rate` | Runs and balls by phase | `PARTIALLY_SUPPORTED` | Phase labels are not modeled; progression points do not guarantee every ball or phase boundaries. | Add deterministic phase tagging to progression or store phase aggregates. |
| `bowl.phase_economy` | Runs and balls by bowling phase | `PARTIALLY_SUPPORTED` | Phase labels are not modeled; bowling progression may be sparse. | Add deterministic phase tagging or phase aggregates. |
| `bowl.boundaries_conceded` | Ball-by-ball bowling outcomes | `NOT_SUPPORTED` | Fours/sixes conceded by bowler. | Add bowling event outcomes or aggregate boundaries conceded. |
| `bowl.boundary_percentage_conceded` | Boundaries conceded, balls bowled | `NOT_SUPPORTED` | Boundary events conceded by bowler. | Add bowling event outcomes or aggregate boundaries conceded. |

## Blocked By Missing Contextual Data

| Metric ID | Required PKM fields | Current PKM support | Missing fields | Recommended action |
| --- | --- | --- | --- | --- |
| `bat.chase_runs` | Player runs, innings target or chase flag | `PARTIALLY_SUPPORTED` | Target, innings chase context, batting innings team role. | Add innings-level chase context before implementation. |
| `bat.first_innings_runs` | Player runs, innings batting order context | `PARTIALLY_SUPPORTED` | Current `inningsNumber` exists, but team innings role and match format-specific innings semantics are not fully encoded. | Add explicit batting innings role: setting/chasing/unknown. |
| `bat.pressure_runs` | Player runs, pressure-state definition | `NOT_SUPPORTED` | Required run rate, target, wickets, match state at ball level. | Define and store deterministic pressure context before implementation. |
| `bat.death_overs_runs` | Runs by over phase | `PARTIALLY_SUPPORTED` | Batting innings aggregate lacks over-by-over scoring by player; progression may be sparse. | Add ball-level batting progression or phase aggregates. |
| `bowl.death_overs_economy` | Bowling runs and balls in death overs | `PARTIALLY_SUPPORTED` | Bowling phase labels and complete over-level spell segmentation. | Add phase-tagged bowling events or phase aggregates. |
| `context.home_away_split` | `history.records[*].context.homeAwayNeutral` | `PARTIALLY_SUPPORTED` | Field is optional and may be `Unknown`. | Implement only if missing/unknown handling is acceptable. |
| `context.venue_type_split` | Venue classification | `NOT_SUPPORTED` | Venue type, ground dimensions, country grouping, or neutral classification policy. | Add explicit venue classification fields before implementation. |

## Notes

- Current PKM preserves full PMR history, so many career totals can be computed deterministically without adding stored aggregate fields.
- Optional PKM fields are classified as `PARTIALLY_SUPPORTED` when the metric can be computed only for rows where the field exists.
- Progression timelines are useful, but they should not be treated as complete ball-by-ball feeds unless the model contract guarantees completeness.
- Metrics that require opportunity denominators, phase tags, pressure states, or shot-level events should remain blocked until those facts are explicitly modeled.
